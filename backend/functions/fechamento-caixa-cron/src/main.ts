import { Client, Databases, ID, Query } from 'node-appwrite';
import { CONFIG } from '../../../src/core/config.js';
import {
  Comanda,
  Pagamento,
  FechamentoCaixa,
  FormaPagamento,
  TipoNotificacao,
  UserRole,
  ComandaStatus,
} from '../../../../shared/types.js';
import {
  FechamentoCaixaOutput,
  ErrorCode,
  ApiResponse,
} from '../../../../shared/ports.js';

export interface AppwriteContext {
  req: {
    bodyRaw?: string;
    bodyJson?: Record<string, any>;
    bodyText?: string;
    body?: any;
    headers?: Record<string, string>;
  };
  res: {
    json: (data: any, statusCode?: number) => any;
    text: (text: string, statusCode?: number) => any;
    empty: () => any;
  };
  log: (message: any) => void;
  error: (message: any) => void;
}

export async function handleFechamentoCaixaCron(
  databases: Databases,
  inputRaw: any = {},
  logger?: { log: (msg: any) => void; error: (msg: any) => void }
): Promise<FechamentoCaixaOutput> {
  const dataReferencia = inputRaw.dataReferencia || inputRaw.data_referencia || new Date().toISOString().split('T')[0];
  const fechadoPor = inputRaw.fechadoPor || inputRaw.fechado_por || 'SYSTEM_CRON';

  logger?.log(`[CRON] Processando fechamento de caixa para a data: ${dataReferencia}`);

  // 1. Buscar todas as comandas pagas da data de referência
  const comandasQuery = await databases.listDocuments(
    CONFIG.DATABASE_ID,
    CONFIG.COLLECTIONS.COMANDAS,
    [
      Query.equal('status', ComandaStatus.PAGA),
      Query.startsWith('fechada_em', dataReferencia),
      Query.limit(5000),
    ]
  );

  const comandas = comandasQuery.documents as unknown as Comanda[];

  // 2. Buscar todos os pagamentos da data
  const pagamentosQuery = await databases.listDocuments(
    CONFIG.DATABASE_ID,
    CONFIG.COLLECTIONS.PAGAMENTOS,
    [
      Query.startsWith('criado_em', dataReferencia),
      Query.limit(5000),
    ]
  );

  const pagamentos = pagamentosQuery.documents as unknown as Pagamento[];

  // 3. Agregar valores
  let totalVendasCentavos = 0;
  let totalDescontosCentavos = 0;
  let totalDinheiroCentavos = 0;
  let totalPixCentavos = 0;
  let totalCartaoCentavos = 0;
  let totalOutrosCentavos = 0;

  for (const c of comandas) {
    totalVendasCentavos += c.total_centavos || 0;
    totalDescontosCentavos += c.desconto_centavos || 0;
  }

  for (const p of pagamentos) {
    const valor = p.valor_pago_centavos - (p.troco_centavos || 0);
    switch (p.forma_pagamento) {
      case FormaPagamento.DINHEIRO:
        totalDinheiroCentavos += valor;
        break;
      case FormaPagamento.PIX:
        totalPixCentavos += valor;
        break;
      case FormaPagamento.CARTAO_CREDITO:
      case FormaPagamento.CARTAO_DEBITO:
        totalCartaoCentavos += valor;
        break;
      default:
        totalOutrosCentavos += valor;
        break;
    }
  }

  const agoraIso = new Date().toISOString();

  // 4. Verificar se já existe fechamento da data (idempotência)
  const existingClosing = await databases.listDocuments(
    CONFIG.DATABASE_ID,
    CONFIG.COLLECTIONS.FECHAMENTOS_CAIXA,
    [Query.equal('data_referencia', dataReferencia)]
  );

  let fechamentoId: string;

  const fechamentoData = {
    data_referencia: dataReferencia,
    total_vendas_centavos: totalVendasCentavos,
    total_dinheiro_centavos: totalDinheiroCentavos,
    total_pix_centavos: totalPixCentavos,
    total_cartao_centavos: totalCartaoCentavos,
    total_outros_centavos: totalOutrosCentavos,
    total_descontos_centavos: totalDescontosCentavos,
    quantidade_comandas: comandas.length,
    fechado_automatico: fechadoPor === 'SYSTEM_CRON',
    fechado_por: fechadoPor,
    gerado_em: agoraIso,
  };

  if (existingClosing.total > 0) {
    fechamentoId = existingClosing.documents[0].$id;
    await databases.updateDocument(
      CONFIG.DATABASE_ID,
      CONFIG.COLLECTIONS.FECHAMENTOS_CAIXA,
      fechamentoId,
      fechamentoData
    );
    logger?.log(`[CRON] Fechamento ${fechamentoId} atualizado para ${dataReferencia}.`);
  } else {
    fechamentoId = ID.unique();
    await databases.createDocument(
      CONFIG.DATABASE_ID,
      CONFIG.COLLECTIONS.FECHAMENTOS_CAIXA,
      fechamentoId,
      fechamentoData
    );
    logger?.log(`[CRON] Novo fechamento ${fechamentoId} registrado para ${dataReferencia}.`);
  }

  // 5. Criar notificação para o Admin
  try {
    await databases.createDocument(
      CONFIG.DATABASE_ID,
      CONFIG.COLLECTIONS.NOTIFICACOES,
      ID.unique(),
      {
        tipo: TipoNotificacao.FECHAMENTO_CAIXA,
        titulo: 'Fechamento Diário Consolidado',
        mensagem: `Fechamento do dia ${dataReferencia}: R$ ${(totalVendasCentavos / 100).toFixed(2)} em ${comandas.length} comandas pagas.`,
        destinatario_role: UserRole.ADMIN,
        lida: false,
        criada_em: agoraIso,
      }
    );
  } catch (notifErr: any) {
    logger?.error(`Falha ao registrar notificação de fechamento de caixa: ${notifErr.message}`);
  }

  return {
    sucesso: true,
    fechamentoId,
    totalVendasCentavos,
  };
}

export default async function main(context: AppwriteContext) {
  const { req, res, log, error } = context;

  try {
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT || CONFIG.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || CONFIG.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY || CONFIG.APPWRITE_API_KEY);

    const databases = new Databases(client);

    let parsedBody = req.bodyJson;
    if (!parsedBody && req.bodyRaw) {
      try {
        parsedBody = JSON.parse(req.bodyRaw);
      } catch {
        parsedBody = {};
      }
    } else if (!parsedBody && typeof req.body === 'object') {
      parsedBody = req.body;
    }

    const output = await handleFechamentoCaixaCron(databases, parsedBody, { log, error });
    const response: ApiResponse<FechamentoCaixaOutput> = {
      sucesso: true,
      data: output,
    };
    return res.json(response, 200);
  } catch (err: any) {
    error(`[ERRO fechamento-caixa-cron] ${err.message}`);
    const statusCode = err.statusCode || 500;
    const response: ApiResponse<null> = {
      sucesso: false,
      erro: {
        codigo: err.code || ErrorCode.ERRO_INTERNO,
        mensagem: err.message || 'Erro no fechamento de caixa.',
        detalhes: err.details,
      },
    };
    return res.json(response, statusCode);
  }
}

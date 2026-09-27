import { Client, Databases, ID, Query } from 'node-appwrite';
import { CONFIG } from '../../../src/core/config.js';
import {
  Comanda,
  ItemComanda,
  Mesa,
  MesaStatus,
  ComandaStatus,
  FormaPagamento,
  TipoNotificacao,
  UserRole,
  Pagamento,
} from '../../../../shared/types.js';
import {
  FecharComandaInput,
  FecharComandaOutput,
  CupomImpressao,
  ErrorCode,
  ApiResponse,
} from '../../../../shared/ports.js';
import { DomainError, EmptyComandaClosingError } from '../../../src/core/errors.js';

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

export async function handleFecharComanda(
  databases: Databases,
  inputRaw: any,
  logger?: { log: (msg: any) => void; error: (msg: any) => void }
): Promise<FecharComandaOutput> {
  const comandaId = inputRaw.comandaId || inputRaw.comanda_id;
  const formaPagamento: FormaPagamento = inputRaw.formaPagamento || inputRaw.forma_pagamento || FormaPagamento.DINHEIRO;
  const descontoCentavos = Math.max(0, Number(inputRaw.descontoCentavos || inputRaw.desconto_centavos || 0));
  const valorEntregueCentavos = inputRaw.valorEntregueCentavos !== undefined 
    ? Number(inputRaw.valorEntregueCentavos) 
    : (inputRaw.valor_pago_centavos !== undefined ? Number(inputRaw.valor_pago_centavos) : undefined);
  const caixaId = inputRaw.caixaId || inputRaw.caixa_id || 'sys_caixa';
  const caixaNome = inputRaw.caixaNome || inputRaw.caixa_nome || 'Operador de Caixa';

  if (!comandaId) {
    throw new DomainError('comandaId é obrigatório.', ErrorCode.COMANDA_NAO_ENCONTRADA, 400);
  }

  // 1. Buscar Comanda
  let comanda: Comanda;
  try {
    comanda = (await databases.getDocument(
      CONFIG.DATABASE_ID,
      CONFIG.COLLECTIONS.COMANDAS,
      comandaId
    )) as unknown as Comanda;
  } catch {
    throw new DomainError(`Comanda '${comandaId}' não encontrada.`, ErrorCode.COMANDA_NAO_ENCONTRADA, 404);
  }

  // 2. Verificar se já está fechada
  if (comanda.status === ComandaStatus.PAGA || comanda.status === ComandaStatus.CANCELADA) {
    throw new DomainError(`A comanda já está no estado '${comanda.status}'.`, ErrorCode.COMANDA_FECHADA, 400);
  }

  // 3. Buscar Itens da Comanda
  const itensQuery = await databases.listDocuments(
    CONFIG.DATABASE_ID,
    CONFIG.COLLECTIONS.ITENS_COMANDA,
    [Query.equal('comanda_id', comandaId)]
  );

  const itens = itensQuery.documents as unknown as ItemComanda[];
  if (itens.length === 0) {
    throw new EmptyComandaClosingError(comandaId);
  }

  // 4. Calcular Subtotal e Total
  const subtotalCentavos = itens.reduce((acc, item) => acc + item.subtotal_centavos, 0);

  if (descontoCentavos > subtotalCentavos) {
    throw new DomainError('O desconto não pode ser superior ao subtotal.', ErrorCode.DESCONTO_INVALIDO, 400);
  }

  const totalCentavos = Math.max(0, subtotalCentavos - descontoCentavos);

  // 5. Alerta de desconto alto se > 10%
  const limiteDescontoAlerta = Math.round(subtotalCentavos * 0.10);
  if (descontoCentavos > limiteDescontoAlerta) {
    try {
      await databases.createDocument(
        CONFIG.DATABASE_ID,
        CONFIG.COLLECTIONS.NOTIFICACOES,
        ID.unique(),
        {
          tipo: TipoNotificacao.DESCONTO_ALTO,
          titulo: 'Alerta: Desconto Elevado Aplicado',
          mensagem: `Desconto de R$ ${(descontoCentavos / 100).toFixed(2)} (${Math.round((descontoCentavos / subtotalCentavos) * 100)}%) aplicado na Comanda ${comanda.codigo || comanda.$id} pelo caixa ${caixaNome}.`,
          destinatario_role: UserRole.ADMIN,
          comanda_id: comandaId,
          lida: false,
          criada_em: new Date().toISOString(),
        }
      );
    } catch (notifErr: any) {
      logger?.error(`Falha ao registrar alerta de desconto alto: ${notifErr.message}`);
    }
  }

  // 6. Validar Pagamento e Troco
  let valorPagoCentavos = valorEntregueCentavos ?? totalCentavos;
  let trocoCentavos = 0;

  if (formaPagamento === FormaPagamento.DINHEIRO) {
    if (valorPagoCentavos < totalCentavos) {
      throw new DomainError(
        `Valor entregue (R$ ${(valorPagoCentavos / 100).toFixed(2)}) é inferior ao total (R$ ${(totalCentavos / 100).toFixed(2)}).`,
        ErrorCode.VALOR_INSUFICIENTE,
        400
      );
    }
    trocoCentavos = Math.max(0, valorPagoCentavos - totalCentavos);
  } else {
    // Pagamentos digitais não geram troco
    valorPagoCentavos = totalCentavos;
    trocoCentavos = 0;
  }

  const agoraIso = new Date().toISOString();

  // 7. Registrar Pagamento
  const pagamentoCriado = (await databases.createDocument(
    CONFIG.DATABASE_ID,
    CONFIG.COLLECTIONS.PAGAMENTOS,
    ID.unique(),
    {
      comanda_id: comandaId,
      caixa_id: caixaId,
      caixa_nome: caixaNome,
      forma_pagamento: formaPagamento,
      valor_pago_centavos: valorPagoCentavos,
      troco_centavos: trocoCentavos,
      criado_em: agoraIso,
    }
  )) as unknown as Pagamento;

  // 8. Atualizar Comanda para status 'paga'
  await databases.updateDocument(
    CONFIG.DATABASE_ID,
    CONFIG.COLLECTIONS.COMANDAS,
    comandaId,
    {
      status: ComandaStatus.PAGA,
      subtotal_centavos: subtotalCentavos,
      desconto_centavos: descontoCentavos,
      total_centavos: totalCentavos,
      fechada_em: agoraIso,
    }
  );

  // 9. Liberar Mesa
  if (comanda.mesa_id) {
    try {
      await databases.updateDocument(
        CONFIG.DATABASE_ID,
        CONFIG.COLLECTIONS.MESAS,
        comanda.mesa_id,
        {
          status: MesaStatus.LIVRE,
          comanda_ativa_id: null,
        }
      );
    } catch (mesaErr: any) {
      logger?.error(`Falha ao liberar mesa: ${mesaErr.message}`);
    }
  }

  // 10. Montar Cupom de Impressão (PrintPort)
  const cupomPayload: CupomImpressao = {
    empresa: {
      nome: CONFIG.EMPRESA.NOME,
      cnpj: CONFIG.EMPRESA.CNPJ,
      endereco: CONFIG.EMPRESA.ENDERECO,
      telefone: CONFIG.EMPRESA.TELEFONE,
    },
    comanda: {
      codigo: comanda.codigo || comanda.$id,
      mesa: comanda.mesa_numero,
      atendente: comanda.atendente_nome,
      abertaEm: comanda.aberta_em,
      fechadaEm: agoraIso,
    },
    itens: itens.map((item) => ({
      nome: item.produto_nome,
      quantidade: item.quantidade,
      precoUnitarioCentavos: item.preco_unitario_centavos,
      subtotalCentavos: item.subtotal_centavos,
    })),
    subtotalCentavos,
    descontoCentavos,
    totalCentavos,
    formaPagamento,
    valorPagoCentavos,
    trocoCentavos,
  };

  return {
    sucesso: true,
    pagamentoId: pagamentoCriado.$id,
    cupomPayload,
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

    const output = await handleFecharComanda(databases, parsedBody, { log, error });
    const response: ApiResponse<FecharComandaOutput> = {
      sucesso: true,
      data: output,
    };
    return res.json(response, 200);
  } catch (err: any) {
    error(`[ERRO fechar-comanda] ${err.message}`);
    const statusCode = err.statusCode || 500;
    const response: ApiResponse<null> = {
      sucesso: false,
      erro: {
        codigo: err.code || ErrorCode.ERRO_INTERNO,
        mensagem: err.message || 'Erro ao fechar comanda.',
        detalhes: err.details,
      },
    };
    return res.json(response, statusCode);
  }
}

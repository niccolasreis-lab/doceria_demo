import { Client, Databases, ID, Query } from 'node-appwrite';
import { CONFIG } from '../../../src/core/config.js';
import {
  Comanda,
  ItemComanda,
  MesaStatus,
  ComandaStatus,
  TipoNotificacao,
  UserRole,
} from '../../../../shared/types.js';
import {
  SolicitarContaInput,
  SolicitarContaOutput,
  ErrorCode,
  ApiResponse,
} from '../../../../shared/ports.js';
import { DomainError, EmptyComandaBillRequestError } from '../../../src/core/errors.js';

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

export async function handleSolicitarConta(
  databases: Databases,
  inputRaw: any,
  logger?: { log: (msg: any) => void; error: (msg: any) => void }
): Promise<SolicitarContaOutput> {
  const comandaId = inputRaw.comandaId || inputRaw.comanda_id;

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

  // 2. Buscar itens da comanda
  const itensQuery = await databases.listDocuments(
    CONFIG.DATABASE_ID,
    CONFIG.COLLECTIONS.ITENS_COMANDA,
    [Query.equal('comanda_id', comandaId)]
  );

  if (itensQuery.total === 0) {
    throw new EmptyComandaBillRequestError(comandaId);
  }

  // 3. Atualizar status da comanda para 'pedindo_conta'
  await databases.updateDocument(
    CONFIG.DATABASE_ID,
    CONFIG.COLLECTIONS.COMANDAS,
    comandaId,
    {
      status: ComandaStatus.PEDINDO_CONTA,
    }
  );

  // 4. Atualizar status da mesa para 'pedindo_conta'
  if (comanda.mesa_id) {
    try {
      await databases.updateDocument(
        CONFIG.DATABASE_ID,
        CONFIG.COLLECTIONS.MESAS,
        comanda.mesa_id,
        {
          status: MesaStatus.PEDINDO_CONTA,
        }
      );
    } catch (mesaErr: any) {
      logger?.error(`Falha ao atualizar mesa para pedindo_conta: ${mesaErr.message}`);
    }
  }

  // 5. Criar notificação para o Caixa
  try {
    await databases.createDocument(
      CONFIG.DATABASE_ID,
      CONFIG.COLLECTIONS.NOTIFICACOES,
      ID.unique(),
      {
        tipo: TipoNotificacao.PEDIR_CONTA,
        titulo: 'Conta Solicitada',
        mensagem: `A Mesa ${comanda.mesa_numero} solicitou a conta (Comanda ${comanda.codigo || comanda.$id}).`,
        destinatario_role: UserRole.CAIXA,
        comanda_id: comandaId,
        lida: false,
        criada_em: new Date().toISOString(),
      }
    );
  } catch (notifErr: any) {
    logger?.error(`Falha ao registrar notificação de conta: ${notifErr.message}`);
  }

  return {
    sucesso: true,
    status: 'pedindo_conta',
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

    const output = await handleSolicitarConta(databases, parsedBody, { log, error });
    const response: ApiResponse<SolicitarContaOutput> = {
      sucesso: true,
      data: output,
    };
    return res.json(response, 200);
  } catch (err: any) {
    error(`[ERRO solicitar-conta] ${err.message}`);
    const statusCode = err.statusCode || 500;
    const response: ApiResponse<null> = {
      sucesso: false,
      erro: {
        codigo: err.code || ErrorCode.ERRO_INTERNO,
        mensagem: err.message || 'Erro ao solicitar conta.',
        detalhes: err.details,
      },
    };
    return res.json(response, statusCode);
  }
}

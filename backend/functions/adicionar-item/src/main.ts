import { Client, Databases, ID, Query } from 'node-appwrite';
import { CONFIG } from '../../../src/core/config.js';
import {
  Comanda,
  ItemComanda,
  Produto,
  Mesa,
  MesaStatus,
  ComandaStatus,
} from '../../../../shared/types.js';
import {
  AdicionarItemInput,
  AdicionarItemOutput,
  ErrorCode,
  ApiResponse,
} from '../../../../shared/ports.js';
import { DomainError, NotFoundError, ProductUnavailableError, InvalidStateTransitionError } from '../../../src/core/errors.js';

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

export async function handleAdicionarItem(
  databases: Databases,
  inputRaw: any,
  logger?: { log: (msg: any) => void; error: (msg: any) => void }
): Promise<AdicionarItemOutput> {
  const comandaId = inputRaw.comandaId || inputRaw.comanda_id;
  const produtoId = inputRaw.produtoId || inputRaw.produto_id;
  const quantidade = Number(inputRaw.quantidade || 1);
  const observacao = inputRaw.observacao || '';
  const usuarioId = inputRaw.usuarioId || inputRaw.lancado_por_id || 'sys_user';
  const usuarioNome = inputRaw.usuarioNome || inputRaw.lancado_por_nome || 'Atendente';

  if (!comandaId || !produtoId) {
    throw new DomainError('comandaId e produtoId são obrigatórios.', ErrorCode.COMANDA_NAO_ENCONTRADA, 400);
  }

  if (quantidade < 1) {
    throw new DomainError('A quantidade deve ser de pelo menos 1 item.', ErrorCode.ERRO_INTERNO, 400);
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

  // 2. Validar se comanda está aberta
  const statusNormalizado = String(comanda.status || '').toLowerCase();
  if (statusNormalizado !== 'aberta') {
    throw new InvalidStateTransitionError(
      comanda.status,
      'aberta',
      `Não é permitido adicionar itens em comanda com status '${comanda.status}'.`
    );
  }

  // 3. Buscar Produto
  let produto: Produto;
  try {
    produto = (await databases.getDocument(
      CONFIG.DATABASE_ID,
      CONFIG.COLLECTIONS.PRODUTOS,
      produtoId
    )) as unknown as Produto;
  } catch {
    throw new DomainError(`Produto '${produtoId}' não encontrado.`, ErrorCode.PRODUTO_NAO_ENCONTRADO, 404);
  }

  if (!produto.disponivel) {
    throw new ProductUnavailableError(produto.$id, produto.nome);
  }

  // 4. Inserir Item em itens_comanda
  const precoUnitarioCentavos = produto.preco_centavos;
  const subtotalItemCentavos = quantidade * precoUnitarioCentavos;

  const itemCriado = (await databases.createDocument(
    CONFIG.DATABASE_ID,
    CONFIG.COLLECTIONS.ITENS_COMANDA,
    ID.unique(),
    {
      comanda_id: comandaId,
      produto_id: produto.$id,
      produto_nome: produto.nome,
      quantidade,
      preco_unitario_centavos: precoUnitarioCentavos,
      subtotal_centavos: subtotalItemCentavos,
      observacao,
      lancado_por_id: usuarioId,
      lancado_por_nome: usuarioNome,
      criado_em: new Date().toISOString(),
    }
  )) as unknown as ItemComanda;

  // 5. Recalcular totais da comanda
  const todosItensQuery = await databases.listDocuments(
    CONFIG.DATABASE_ID,
    CONFIG.COLLECTIONS.ITENS_COMANDA,
    [Query.equal('comanda_id', comandaId)]
  );

  const todosItens = todosItensQuery.documents as unknown as ItemComanda[];
  const novoSubtotal = todosItens.reduce((acc, item) => acc + item.subtotal_centavos, 0);
  const descontoAtual = comanda.desconto_centavos || 0;
  const novoTotal = Math.max(0, novoSubtotal - descontoAtual);

  // 6. Atualizar Comanda
  await databases.updateDocument(
    CONFIG.DATABASE_ID,
    CONFIG.COLLECTIONS.COMANDAS,
    comandaId,
    {
      subtotal_centavos: novoSubtotal,
      total_centavos: novoTotal,
    }
  );

  // 7. Atualizar Mesa para 'ocupada'
  if (comanda.mesa_id) {
    try {
      await databases.updateDocument(
        CONFIG.DATABASE_ID,
        CONFIG.COLLECTIONS.MESAS,
        comanda.mesa_id,
        {
          status: MesaStatus.OCUPADA,
          comanda_ativa_id: comandaId,
        }
      );
    } catch (mesaErr: any) {
      logger?.error(`Falha ao atualizar status da mesa: ${mesaErr.message}`);
    }
  }

  return {
    sucesso: true,
    item: itemCriado,
    novoTotalCentavos: novoTotal,
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

    const output = await handleAdicionarItem(databases, parsedBody, { log, error });
    const response: ApiResponse<AdicionarItemOutput> = {
      sucesso: true,
      data: output,
    };
    return res.json(response, 200);
  } catch (err: any) {
    error(`[ERRO adicionar-item] ${err.message}`);
    const statusCode = err.statusCode || 500;
    const response: ApiResponse<null> = {
      sucesso: false,
      erro: {
        codigo: err.code || ErrorCode.ERRO_INTERNO,
        mensagem: err.message || 'Erro ao adicionar item na comanda.',
        detalhes: err.details,
      },
    };
    return res.json(response, statusCode);
  }
}

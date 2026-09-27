import { Comanda, ItemComanda, FormaPagamento, TipoNotificacao, UserRole } from './types';

export interface CupomImpressao {
  empresa: {
    nome: string;
    cnpj: string;
    endereco: string;
    telefone: string;
  };
  comanda: {
    codigo: string;
    mesa: number;
    atendente: string;
    abertaEm: string;
    fechadaEm: string;
  };
  itens: Array<{
    nome: string;
    quantidade: number;
    precoUnitarioCentavos: number;
    subtotalCentavos: number;
  }>;
  subtotalCentavos: number;
  descontoCentavos: number;
  totalCentavos: number;
  formaPagamento: FormaPagamento;
  valorPagoCentavos: number;
  trocoCentavos: number;
}

export interface PrintResult {
  sucesso: boolean;
  mensagem?: string;
  timestamp: string;
}

export interface PrintPort {
  imprimirCupom(cupom: CupomImpressao): Promise<PrintResult>;
}

export interface NotificationPayload {
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  destinatarioRole: UserRole;
  comandaId?: string;
}

export interface NotificationPort {
  enviarNotificacao(payload: NotificationPayload): Promise<{ sucesso: boolean; id?: string }>;
}

export interface AdicionarItemInput {
  comandaId: string;
  produtoId: string;
  quantidade: number;
  observacao?: string;
  usuarioId: string;
  usuarioNome: string;
}

export interface AdicionarItemOutput {
  sucesso: boolean;
  item: ItemComanda;
  novoTotalCentavos: number;
}

export interface SolicitarContaInput {
  comandaId: string;
  usuarioId: string;
}

export interface SolicitarContaOutput {
  sucesso: boolean;
  status: 'pedindo_conta';
}

export interface FecharComandaInput {
  comandaId: string;
  formaPagamento: FormaPagamento;
  descontoCentavos?: number;
  valorEntregueCentavos?: number;
  caixaId: string;
  caixaNome: string;
}

export interface FecharComandaOutput {
  sucesso: boolean;
  pagamentoId: string;
  cupomPayload: CupomImpressao;
}

export interface FechamentoCaixaOutput {
  sucesso: boolean;
  fechamentoId: string;
  totalVendasCentavos: number;
}

export enum ErrorCode {
  COMANDA_NAO_ENCONTRADA = 'COMANDA_NAO_ENCONTRADA',
  COMANDA_FECHADA = 'COMANDA_FECHADA',
  COMANDA_SEM_ITENS = 'COMANDA_SEM_ITENS',
  PRODUTO_NAO_ENCONTRADO = 'PRODUTO_NAO_ENCONTRADO',
  PRODUTO_INDISPONIVEL = 'PRODUTO_INDISPONIVEL',
  DESCONTO_INVALIDO = 'DESCONTO_INVALIDO',
  VALOR_INSUFICIENTE = 'VALOR_INSUFICIENTE',
  NAO_AUTORIZADO = 'NAO_AUTORIZADO',
  ERRO_INTERNO = 'ERRO_INTERNO'
}

export interface ApiResponse<T> {
  sucesso: boolean;
  data?: T;
  erro?: {
    codigo: ErrorCode | string;
    mensagem: string;
    detalhes?: unknown;
  };
}

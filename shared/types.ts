export enum UserRole {
  ADMIN = 'admin',
  CAIXA = 'caixa',
  ATENDENTE = 'atendente'
}

export enum MesaStatus {
  LIVRE = 'livre',
  OCUPADA = 'ocupada',
  PEDINDO_CONTA = 'pedindo_conta'
}

export enum ComandaStatus {
  ABERTA = 'aberta',
  PEDINDO_CONTA = 'pedindo_conta',
  PAGA = 'paga',
  CANCELADA = 'cancelada'
}

export enum FormaPagamento {
  DINHEIRO = 'dinheiro',
  PIX = 'pix',
  CARTAO_DEBITO = 'cartao_debito',
  CARTAO_CREDITO = 'cartao_credito',
  VALE_REFEICAO = 'vale_refeicao'
}

export enum TipoNotificacao {
  PEDIR_CONTA = 'pedir_conta',
  DESCONTO_ALTO = 'desconto_alto',
  FECHAMENTO_CAIXA = 'fechamento_caixa'
}

export interface UserProfile {
  $id: string;
  nome: string;
  email: string;
  role: UserRole;
  ativo: boolean;
  $createdAt?: string;
  $updatedAt?: string;
}

export interface Produto {
  $id: string;
  nome: string;
  descricao?: string;
  preco_centavos: number;
  categoria: 'Bolos' | 'Doces Finos' | 'Bebidas' | 'Salgados' | 'Cafeteria';
  disponivel: boolean;
  imagem_url?: string;
}

export interface Mesa {
  $id: string;
  numero: number;
  capacidade: number;
  status: MesaStatus;
  comanda_ativa_id?: string | null;
}

export interface Comanda {
  $id: string;
  codigo: string;
  mesa_id: string;
  mesa_numero: number;
  atendente_id: string;
  atendente_nome: string;
  status: ComandaStatus;
  subtotal_centavos: number;
  desconto_centavos: number;
  total_centavos: number;
  observacoes?: string;
  aberta_em: string;
  fechada_em?: string;
}

export interface ItemComanda {
  $id: string;
  comanda_id: string;
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  preco_unitario_centavos: number;
  subtotal_centavos: number;
  observacao?: string;
  lancado_por_id: string;
  lancado_por_nome: string;
  criado_em: string;
}

export interface Pagamento {
  $id: string;
  comanda_id: string;
  caixa_id: string;
  caixa_nome: string;
  forma_pagamento: FormaPagamento;
  valor_pago_centavos: number;
  troco_centavos: number;
  criado_em: string;
}

export interface FechamentoCaixa {
  $id: string;
  data_referencia: string;
  total_vendas_centavos: number;
  total_dinheiro_centavos: number;
  total_pix_centavos: number;
  total_cartao_centavos: number;
  total_outros_centavos: number;
  total_descontos_centavos: number;
  quantidade_comandas: number;
  fechado_automatico: boolean;
  fechado_por: string;
  gerado_em: string;
}

export interface Notificacao {
  $id: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  destinatario_role: UserRole;
  comanda_id?: string;
  lida: boolean;
  criada_em: string;
}

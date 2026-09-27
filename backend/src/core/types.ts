/**
 * Domain types for Doceria do Sr. Gilmar backend
 */

export type TableStatus = 'LIVRE' | 'OCUPADA' | 'RESERVADA';

export type ProductCategory =
  | 'BOLOS'
  | 'TORTAS'
  | 'DOCES_FINOS'
  | 'CAFES'
  | 'SALGADOS'
  | 'BEBIDAS';

export type ComandaStatus = 'ABERTA' | 'CONTA_SOLICITADA' | 'FECHADA' | 'CANCELADA';

export type ItemStatus = 'SOLICITADO' | 'EM_PREPARO' | 'ENTREGUE' | 'CANCELADO';

export type PaymentMethod =
  | 'DINHEIRO'
  | 'PIX'
  | 'CARTAO_CREDITO'
  | 'CARTAO_DEBITO';

export type UserRole = 'ADMIN' | 'CAIXA' | 'GARCOM' | 'CLIENTE';

export type CashClosingStatus = 'CONCLUIDO' | 'PARCIAL' | 'SEM_MOVIMENTO';

export interface TableDocument {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;
  numero: number;
  capacidade: number;
  status: TableStatus;
  comanda_ativa_id?: string | null;
  descricao?: string;
}

export interface ProductDocument {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;
  nome: string;
  categoria: ProductCategory;
  preco_centavos: number;
  descricao: string;
  disponivel: boolean;
  codigo_sku: string;
}

export interface ComandaItemDocument {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;
  comanda_id: string;
  produto_id: string;
  produto_nome: string;
  preco_unitario_centavos: number;
  quantidade: number;
  total_item_centavos: number;
  observacao?: string;
  status: ItemStatus;
  criado_em: string;
}

export interface ComandaDocument {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;
  mesa_id: string;
  mesa_numero: number;
  cliente_nome?: string;
  cliente_id?: string;
  garcom_id?: string;
  status: ComandaStatus;
  subtotal_centavos: number;
  desconto_centavos: number;
  total_centavos: number;
  itens_count: number;
  data_abertura: string;
  data_fechamento?: string | null;
  metodo_pagamento?: PaymentMethod | null;
  valor_pago_centavos?: number | null;
  troco_centavos?: number | null;
  observacoes?: string;
}

export interface UserProfileDocument {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;
  user_id: string;
  nome: string;
  email: string;
  role: UserRole;
  ativo: boolean;
}

export interface CashClosingDocument {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;
  data_referencia: string; // YYYY-MM-DD
  total_faturado_centavos: number;
  total_descontos_centavos: number;
  total_liquido_centavos: number;
  total_dinheiro_centavos: number;
  total_pix_centavos: number;
  total_cartao_credito_centavos: number;
  total_cartao_debito_centavos: number;
  total_comandas_fechadas: number;
  total_comandas_canceladas: number;
  comandas_abandonadas_processadas: number;
  executado_em: string;
  status: CashClosingStatus;
  detalhes?: string;
}

export interface DiscountPolicy {
  tipo: 'PERCENTUAL' | 'VALOR_FIXO';
  valor: number; // Porcentagem (0-100) ou Centavos
  motivo?: string;
  cupom?: string;
}

export interface CalculationResult {
  subtotal_centavos: number;
  desconto_centavos: number;
  total_centavos: number;
  itens_count: number;
}

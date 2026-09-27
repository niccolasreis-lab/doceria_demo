import {
  UserProfile,
  UserRole,
  MesaStatus,
  ComandaStatus,
  FormaPagamento,
  TipoNotificacao,
  Produto as SharedProduto,
  Mesa as SharedMesa,
  Comanda as SharedComanda,
  ItemComanda as SharedItemComanda,
} from '../../../shared/types';

export {
  UserRole,
  MesaStatus,
  ComandaStatus,
  FormaPagamento,
  TipoNotificacao,
};

export type {
  UserProfile,
  SharedProduto,
  SharedMesa,
  SharedComanda,
  SharedItemComanda,
};

export type ProductCategory =
  | 'TODOS'
  | 'BOLOS'
  | 'TORTAS'
  | 'DOCES_FINOS'
  | 'CAFES'
  | 'BEBIDAS'
  | 'SALGADOS'
  | 'SOBREMESAS_ESPECIAIS';

export interface MobileProduct {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  priceCentavos: number;
  description: string;
  available: boolean;
  imageUrl?: string;
  allergens?: string[];
}

export interface MobileTable {
  id: string;
  number: number;
  seats: number;
  sector: 'SALAO_PRINCIPAL' | 'VARANDA' | 'DECK' | 'BALCAO';
  status: MesaStatus;
  currentOrderId?: string;
  occupiedAt?: string;
  billRequestedAt?: string;
  description?: string;
}

export interface MobileOrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCentavos: number;
  subtotalCentavos: number;
  notes?: string;
  addedById: string;
  addedByName: string;
  createdAt: string;
}

export interface MobileOrder {
  id: string;
  code: string; // e.g. 'CMD-101'
  tableId: string;
  tableNumber: number;
  waiterId: string;
  waiterName: string;
  customerName?: string;
  partySize?: number;
  status: ComandaStatus;
  items: MobileOrderItem[];
  subtotalCentavos: number;
  serviceFeePercentage: number;
  serviceFeeCentavos: number;
  discountCentavos: number;
  totalCentavos: number;
  notes?: string;
  openedAt: string;
  billRequestedAt?: string;
  closedAt?: string;
}

export interface CartDraftItem {
  product: MobileProduct;
  quantity: number;
  notes?: string;
}

export interface NewOrderPayload {
  tableId: string;
  tableNumber: number;
  customerName?: string;
  partySize?: number;
  notes?: string;
}

export type UserRole = "CAIXA" | "ADMIN" | "GARCOM";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  pin?: string;
}

export type TableStatus = "LIVRE" | "OCUPADA" | "PEDINDO_CONTA" | "RESERVADA" | "MANUTENCAO";

export type TableSector = "SALAO_PRINCIPAL" | "VARANDA" | "DECK" | "BALCAO";

export interface Table {
  id: string;
  number: number;
  name: string;
  seats: number;
  sector: TableSector;
  status: TableStatus;
  currentOrderId?: string;
  billRequestedAt?: string; // ISO string
  occupiedAt?: string;
}

export type ProductCategory =
  | "DOCES_FINOS"
  | "BOLOS_TORTAS"
  | "CAFES_BEBIDAS"
  | "SALGADOS"
  | "SOBREMESAS_ESPECIAIS";

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  costPrice: number;
  sku: string;
  description: string;
  stock: number;
  minStock: number;
  unit: "UN" | "FATIA" | "KG" | "PORCAO";
  isActive: boolean;
  image?: string;
  allergens?: string[];
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  notes?: string;
  addedAt: string;
  status: "CONFIRMADO" | "EM_PREPARO" | "ENTREGUE" | "CANCELADO";
  cancelledReason?: string;
}

export type PaymentMethod = "DINHEIRO" | "CARTAO_CREDITO" | "CARTAO_DEBITO" | "PIX" | "VALE_REFEICAO";

export interface PaymentEntry {
  id: string;
  method: PaymentMethod;
  amount: number;
  receivedAmount?: number; // Para dinheiro (calculo de troco)
  changeAmount?: number;
  referenceCode?: string;
  createdAt: string;
}

export type DiscountType = "PERCENTUAL" | "VALOR_FIXO";

export interface DiscountInfo {
  type: DiscountType;
  value: number; // Ex: 10 para 10% ou 15.00 para R$15
  calculatedAmount: number;
  reason: string;
  authorizedBy?: string; // Nome do gerente se passar do limite de caixa
}

export type OrderStatus = "ABERTO" | "PEDINDO_CONTA" | "CONFERENCIA" | "PAGO" | "CANCELADO";

export interface Order {
  id: string;
  orderNumber: number;
  tableId?: string;
  tableNumber?: number;
  customerName?: string;
  customerDocument?: string; // CPF na nota opcional
  waiterName?: string;
  items: OrderItem[];
  subtotal: number;
  serviceFeePercentage: number; // Geralmente 0 ou 10
  serviceFeeAmount: number;
  discount?: DiscountInfo;
  total: number;
  payments: PaymentEntry[];
  status: OrderStatus;
  createdAt: string;
  billRequestedAt?: string;
  closedAt?: string;
  cashierName?: string;
}

export interface ReceiptData {
  receiptId: string;
  orderId: string;
  orderNumber: number;
  tableNumber?: number;
  customerName?: string;
  customerDocument?: string;
  companyName: string;
  tradeName: string;
  cnpj: string;
  address: string;
  city: string;
  phone: string;
  cashierName: string;
  waiterName?: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  subtotal: number;
  serviceFeeAmount: number;
  discountAmount: number;
  discountReason?: string;
  total: number;
  payments: {
    method: string;
    amount: number;
    change?: number;
  }[];
  trocoTotal: number;
  issuedAt: string;
}

export type CashRegisterStatus = "ABERTO" | "FECHADO";

export interface CashMovement {
  id: string;
  type: "SUPRIMENTO" | "SANGRIA" | "VENDA" | "ESTORNO";
  amount: number;
  paymentMethod: PaymentMethod;
  reason: string;
  operatorName: string;
  createdAt: string;
  orderId?: string;
}

export interface CashRegisterSession {
  id: string;
  openedAt: string;
  closedAt?: string;
  operatorId: string;
  operatorName: string;
  initialCash: number;
  status: CashRegisterStatus;
  movements: CashMovement[];
  salesByMethod: Record<PaymentMethod, number>;
  totalSales: number;
  totalSangrias: number;
  totalSuprimentos: number;
  expectedInCash: number;
  declaredAmounts?: Record<PaymentMethod, number>;
  differenceInCash?: number;
  notes?: string;
}

export interface SalesReportFilter {
  startDate: string;
  endDate: string;
  category?: ProductCategory | "TODAS";
  paymentMethod?: PaymentMethod | "TODAS";
  waiterName?: string;
}

export interface DailySummaryMetric {
  totalRevenue: number;
  ordersCount: number;
  averageTicket: number;
  itemsSoldCount: number;
  occupiedTables: number;
  waitingBillTables: number;
  totalTables: number;
  topSellingProducts: {
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }[];
  revenueByHour: {
    hour: string;
    revenue: number;
    orders: number;
  }[];
  revenueByPaymentMethod: {
    method: PaymentMethod;
    label: string;
    amount: number;
    percentage: number;
  }[];
}

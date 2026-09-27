"use client";

import {
  Product,
  Table,
  Order,
  CashRegisterSession,
  ReceiptData,
  PaymentEntry,
  DiscountInfo,
  TableStatus,
  CashMovement,
  DailySummaryMetric,
  PaymentMethod,
} from "@/types";
import {
  INITIAL_PRODUCTS,
  INITIAL_TABLES,
  INITIAL_ORDERS,
  INITIAL_PAID_ORDERS_HISTORY,
  INITIAL_CASH_SESSIONS,
} from "./mock-data";

const STORAGE_KEYS = {
  PRODUCTS: "srgilmar_products_v1",
  TABLES: "srgilmar_tables_v1",
  ORDERS: "srgilmar_orders_v1",
  ORDER_HISTORY: "srgilmar_order_history_v1",
  CASH_SESSIONS: "srgilmar_cash_sessions_v1",
  RECEIPTS: "srgilmar_receipts_v1",
};

// Store singleton with listeners
type Listener = () => void;

class AppStore {
  private products: Product[] = [];
  private tables: Table[] = [];
  private activeOrders: Order[] = [];
  private paidOrders: Order[] = [];
  private cashSessions: CashRegisterSession[] = [];
  private receipts: ReceiptData[] = [];
  private listeners: Set<Listener> = new Set();
  private initialized = false;

  constructor() {
    // Lazy initialize on first client read
  }

  public init() {
    if (this.initialized || typeof window === "undefined") return;

    try {
      const storedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      this.products = storedProducts ? JSON.parse(storedProducts) : INITIAL_PRODUCTS;

      const storedTables = localStorage.getItem(STORAGE_KEYS.TABLES);
      this.tables = storedTables ? JSON.parse(storedTables) : INITIAL_TABLES;

      const storedOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
      this.activeOrders = storedOrders ? JSON.parse(storedOrders) : INITIAL_ORDERS;

      const storedHistory = localStorage.getItem(STORAGE_KEYS.ORDER_HISTORY);
      this.paidOrders = storedHistory ? JSON.parse(storedHistory) : INITIAL_PAID_ORDERS_HISTORY;

      const storedSessions = localStorage.getItem(STORAGE_KEYS.CASH_SESSIONS);
      this.cashSessions = storedSessions ? JSON.parse(storedSessions) : INITIAL_CASH_SESSIONS;

      const storedReceipts = localStorage.getItem(STORAGE_KEYS.RECEIPTS);
      this.receipts = storedReceipts ? JSON.parse(storedReceipts) : this.generateInitialReceipts();

      this.initialized = true;
    } catch {
      this.products = INITIAL_PRODUCTS;
      this.tables = INITIAL_TABLES;
      this.activeOrders = INITIAL_ORDERS;
      this.paidOrders = INITIAL_PAID_ORDERS_HISTORY;
      this.cashSessions = INITIAL_CASH_SESSIONS;
      this.receipts = this.generateInitialReceipts();
      this.initialized = true;
    }
  }

  private persist() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(this.products));
      localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(this.tables));
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(this.activeOrders));
      localStorage.setItem(STORAGE_KEYS.ORDER_HISTORY, JSON.stringify(this.paidOrders));
      localStorage.setItem(STORAGE_KEYS.CASH_SESSIONS, JSON.stringify(this.cashSessions));
      localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(this.receipts));
    } catch {
      // Ignored
    }
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error("Listener error:", err);
      }
    });
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private generateInitialReceipts(): ReceiptData[] {
    return this.paidOrders.map((ord) => this.buildReceiptData(ord, "Mariana Silva"));
  }

  public buildReceiptData(order: Order, cashierName: string): ReceiptData {
    const totalTroco = order.payments.reduce((acc, p) => acc + (p.changeAmount || 0), 0);

    return {
      receiptId: `REC-${order.orderNumber}-${Date.now().toString().slice(-4)}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      tableNumber: order.tableNumber,
      customerName: order.customerName || "Consumidor Final",
      customerDocument: order.customerDocument || "Não informado",
      companyName: "DOCERIA DO SR GILMAR LTDA",
      tradeName: "Doceria & Café do Sr. Gilmar",
      cnpj: "12.345.678/0001-90",
      address: "Rua dos Doces Artesanais, 150 - Centro Gastronômico",
      city: "São Paulo - SP",
      phone: "(11) 3456-7890",
      cashierName: cashierName || order.cashierName || "Operador",
      waiterName: order.waiterName || "Atendimento",
      items: order.items
        .filter((i) => i.status !== "CANCELADO")
        .map((i) => ({
          name: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.unitPrice * i.quantity,
        })),
      subtotal: order.subtotal,
      serviceFeeAmount: order.serviceFeeAmount || 0,
      discountAmount: order.discount?.calculatedAmount || 0,
      discountReason: order.discount?.reason,
      total: order.total,
      payments: order.payments.map((p) => ({
        method: p.method,
        amount: p.amount,
        change: p.changeAmount,
      })),
      trocoTotal: totalTroco,
      issuedAt: order.closedAt || new Date().toISOString(),
    };
  }

  // PRODUCTS API
  public getProducts(): Product[] {
    this.init();
    return [...this.products];
  }

  public getProductById(id: string): Product | undefined {
    this.init();
    return this.products.find((p) => p.id === id);
  }

  public saveProduct(product: Omit<Product, "id"> & { id?: string }): Product {
    this.init();
    if (product.id) {
      const idx = this.products.findIndex((p) => p.id === product.id);
      if (idx !== -1) {
        this.products[idx] = { ...this.products[idx], ...product } as Product;
        this.persist();
        return this.products[idx];
      }
    }
    const newProduct: Product = {
      ...product,
      id: `prod-${Date.now()}`,
    };
    this.products.unshift(newProduct);
    this.persist();
    return newProduct;
  }

  public deleteProduct(id: string): boolean {
    this.init();
    const idx = this.products.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.products.splice(idx, 1);
      this.persist();
      return true;
    }
    return false;
  }

  public toggleProductStatus(id: string): Product | null {
    this.init();
    const prod = this.products.find((p) => p.id === id);
    if (prod) {
      prod.isActive = !prod.isActive;
      this.persist();
      return prod;
    }
    return null;
  }

  // TABLES API
  public getTables(): Table[] {
    this.init();
    return [...this.tables];
  }

  public getTableById(id: string): Table | undefined {
    this.init();
    return this.tables.find((t) => t.id === id);
  }

  public saveTable(table: Omit<Table, "id"> & { id?: string }): Table {
    this.init();
    if (table.id) {
      const idx = this.tables.findIndex((t) => t.id === table.id);
      if (idx !== -1) {
        this.tables[idx] = { ...this.tables[idx], ...table } as Table;
        this.persist();
        return this.tables[idx];
      }
    }
    const newTable: Table = {
      ...table,
      id: `table-${Date.now()}`,
      status: table.status || "LIVRE",
    };
    this.tables.push(newTable);
    this.persist();
    return newTable;
  }

  public deleteTable(id: string): boolean {
    this.init();
    const idx = this.tables.findIndex((t) => t.id === id);
    if (idx !== -1) {
      this.tables.splice(idx, 1);
      this.persist();
      return true;
    }
    return false;
  }

  public updateTableStatus(tableId: string, status: TableStatus): Table | null {
    this.init();
    const table = this.tables.find((t) => t.id === tableId);
    if (table) {
      table.status = status;
      if (status === "PEDINDO_CONTA" && !table.billRequestedAt) {
        table.billRequestedAt = new Date().toISOString();
      } else if (status === "LIVRE") {
        table.currentOrderId = undefined;
        table.billRequestedAt = undefined;
        table.occupiedAt = undefined;
      }
      this.persist();
      return table;
    }
    return null;
  }

  // ORDERS & BILL REQUESTS API
  public getActiveOrders(): Order[] {
    this.init();
    return [...this.activeOrders];
  }

  public getBillRequests(): Order[] {
    this.init();
    return this.activeOrders.filter((o) => o.status === "PEDINDO_CONTA" || o.status === "CONFERENCIA");
  }

  public getOrderById(id: string): Order | undefined {
    this.init();
    return this.activeOrders.find((o) => o.id === id) || this.paidOrders.find((o) => o.id === id);
  }

  public getOrderByTableId(tableId: string): Order | undefined {
    this.init();
    const table = this.tables.find((t) => t.id === tableId);
    if (!table || !table.currentOrderId) return undefined;
    return this.activeOrders.find((o) => o.id === table.currentOrderId);
  }

  public requestTableBill(tableId: string): Order | null {
    this.init();
    const table = this.tables.find((t) => t.id === tableId);
    if (!table) return null;

    let order = this.activeOrders.find((o) => o.id === table.currentOrderId);
    if (!order) {
      // Criar pedido caso não exista ainda
      order = {
        id: `ord-${Date.now()}`,
        orderNumber: Math.floor(1000 + Math.random() * 9000),
        tableId: table.id,
        tableNumber: table.number,
        customerName: `Mesa ${table.number}`,
        waiterName: "Carlos Eduardo",
        items: [],
        subtotal: 0,
        serviceFeePercentage: 10,
        serviceFeeAmount: 0,
        total: 0,
        payments: [],
        status: "PEDINDO_CONTA",
        createdAt: new Date().toISOString(),
        billRequestedAt: new Date().toISOString(),
      };
      this.activeOrders.push(order);
      table.currentOrderId = order.id;
    } else {
      order.status = "PEDINDO_CONTA";
      order.billRequestedAt = new Date().toISOString();
    }

    table.status = "PEDINDO_CONTA";
    table.billRequestedAt = new Date().toISOString();
    this.persist();
    return order;
  }

  public startOrderConference(orderId: string): Order | null {
    this.init();
    const order = this.activeOrders.find((o) => o.id === orderId);
    if (order) {
      order.status = "CONFERENCIA";
      this.persist();
      return order;
    }
    return null;
  }

  public updateOrderCalculations(order: Order): Order {
    const validItems = order.items.filter((i) => i.status !== "CANCELADO");
    const subtotal = validItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);

    let discountAmount = 0;
    if (order.discount) {
      if (order.discount.type === "PERCENTUAL") {
        discountAmount = (subtotal * order.discount.value) / 100;
      } else {
        discountAmount = Math.min(order.discount.value, subtotal);
      }
      order.discount.calculatedAmount = discountAmount;
    }

    const baseForService = Math.max(0, subtotal - discountAmount);
    const serviceFeeAmount =
      order.serviceFeePercentage > 0 ? (baseForService * order.serviceFeePercentage) / 100 : 0;

    order.subtotal = subtotal;
    order.serviceFeeAmount = serviceFeeAmount;
    order.total = Math.max(0, subtotal - discountAmount + serviceFeeAmount);

    return order;
  }

  public applyDiscount(orderId: string, discount: DiscountInfo): Order | null {
    this.init();
    const order = this.activeOrders.find((o) => o.id === orderId);
    if (order) {
      order.discount = discount;
      this.updateOrderCalculations(order);
      this.persist();
      return order;
    }
    return null;
  }

  public removeDiscount(orderId: string): Order | null {
    this.init();
    const order = this.activeOrders.find((o) => o.id === orderId);
    if (order) {
      order.discount = undefined;
      this.updateOrderCalculations(order);
      this.persist();
      return order;
    }
    return null;
  }

  public toggleServiceFee(orderId: string, enabled: boolean): Order | null {
    this.init();
    const order = this.activeOrders.find((o) => o.id === orderId);
    if (order) {
      order.serviceFeePercentage = enabled ? 10 : 0;
      this.updateOrderCalculations(order);
      this.persist();
      return order;
    }
    return null;
  }

  public addItemToOrder(orderId: string, productId: string, quantity: number, notes?: string): Order | null {
    this.init();
    const order = this.activeOrders.find((o) => o.id === orderId);
    const product = this.products.find((p) => p.id === productId);
    if (!order || !product) return null;

    const existingItem = order.items.find((i) => i.productId === productId && i.status !== "CANCELADO");
    if (existingItem && !notes) {
      existingItem.quantity += quantity;
    } else {
      order.items.push({
        id: `item-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity,
        notes,
        addedAt: new Date().toISOString(),
        status: "ENTREGUE",
      });
    }

    // Deduz estoque
    product.stock = Math.max(0, product.stock - quantity);

    this.updateOrderCalculations(order);
    this.persist();
    return order;
  }

  public cancelOrderItem(orderId: string, itemId: string, reason: string): Order | null {
    this.init();
    const order = this.activeOrders.find((o) => o.id === orderId);
    if (!order) return null;

    const item = order.items.find((i) => i.id === itemId);
    if (!item) return null;

    item.status = "CANCELADO";
    item.cancelledReason = reason;

    // Devolve estoque
    const prod = this.products.find((p) => p.id === item.productId);
    if (prod) {
      prod.stock += item.quantity;
    }

    this.updateOrderCalculations(order);
    this.persist();
    return order;
  }

  public updateCustomerInfo(orderId: string, customerName?: string, customerDocument?: string): Order | null {
    this.init();
    const order = this.activeOrders.find((o) => o.id === orderId);
    if (order) {
      if (customerName !== undefined) order.customerName = customerName;
      if (customerDocument !== undefined) order.customerDocument = customerDocument;
      this.persist();
      return order;
    }
    return null;
  }

  // SETTLE ORDER & PAYMENT
  public settleOrderPayment(
    orderId: string,
    payments: PaymentEntry[],
    cashierName: string
  ): { order: Order; receipt: ReceiptData } | null {
    this.init();
    const orderIdx = this.activeOrders.findIndex((o) => o.id === orderId);
    if (orderIdx === -1) return null;

    const order = this.activeOrders[orderIdx];
    this.updateOrderCalculations(order);

    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
    if (totalPaid < order.total - 0.01) {
      throw new Error(`Valor total pago (${totalPaid.toFixed(2)}) é inferior ao total do pedido (${order.total.toFixed(2)}).`);
    }

    order.payments = payments;
    order.status = "PAGO";
    order.closedAt = new Date().toISOString();
    order.cashierName = cashierName;

    // Registra movimentação no caixa ativo
    const activeSession = this.cashSessions.find((s) => s.status === "ABERTO");
    if (activeSession) {
      payments.forEach((p) => {
        activeSession.salesByMethod[p.method] = (activeSession.salesByMethod[p.method] || 0) + p.amount;
        if (p.method === "DINHEIRO") {
          activeSession.expectedInCash += p.amount;
        }
      });
      activeSession.totalSales += order.total;
    }

    // Libera a mesa associada
    if (order.tableId) {
      const table = this.tables.find((t) => t.id === order.tableId);
      if (table) {
        table.status = "LIVRE";
        table.currentOrderId = undefined;
        table.billRequestedAt = undefined;
        table.occupiedAt = undefined;
      }
    }

    // Move de activeOrders para paidOrders
    this.activeOrders.splice(orderIdx, 1);
    this.paidOrders.unshift(order);

    // Gera recibo
    const receipt = this.buildReceiptData(order, cashierName);
    this.receipts.unshift(receipt);

    this.persist();
    return { order, receipt };
  }

  // RECEIPTS API
  public getReceipts(): ReceiptData[] {
    this.init();
    return [...this.receipts];
  }

  public getReceiptById(receiptId: string): ReceiptData | undefined {
    this.init();
    return this.receipts.find((r) => r.receiptId === receiptId);
  }

  // CASH REGISTER SESSIONS
  public getActiveSession(): CashRegisterSession | undefined {
    this.init();
    return this.cashSessions.find((s) => s.status === "ABERTO");
  }

  public getAllCashSessions(): CashRegisterSession[] {
    this.init();
    return [...this.cashSessions];
  }

  public openCashSession(operatorId: string, operatorName: string, initialCash: number): CashRegisterSession {
    this.init();
    const existing = this.getActiveSession();
    if (existing) {
      return existing;
    }

    const newSession: CashRegisterSession = {
      id: `session-${Date.now()}`,
      openedAt: new Date().toISOString(),
      operatorId,
      operatorName,
      initialCash,
      status: "ABERTO",
      movements: [
        {
          id: `mov-${Date.now()}`,
          type: "SUPRIMENTO",
          amount: initialCash,
          paymentMethod: "DINHEIRO",
          reason: "Fundo de troco de abertura",
          operatorName,
          createdAt: new Date().toISOString(),
        },
      ],
      salesByMethod: {
        DINHEIRO: 0,
        CARTAO_CREDITO: 0,
        CARTAO_DEBITO: 0,
        PIX: 0,
        VALE_REFEICAO: 0,
      },
      totalSales: 0,
      totalSangrias: 0,
      totalSuprimentos: initialCash,
      expectedInCash: initialCash,
    };

    this.cashSessions.unshift(newSession);
    this.persist();
    return newSession;
  }

  public addCashMovement(
    type: "SUPRIMENTO" | "SANGRIA",
    amount: number,
    reason: string,
    operatorName: string
  ): CashMovement | null {
    this.init();
    const session = this.getActiveSession();
    if (!session) return null;

    const movement: CashMovement = {
      id: `mov-${Date.now()}`,
      type,
      amount,
      paymentMethod: "DINHEIRO",
      reason,
      operatorName,
      createdAt: new Date().toISOString(),
    };

    session.movements.unshift(movement);

    if (type === "SANGRIA") {
      session.totalSangrias += amount;
      session.expectedInCash -= amount;
    } else {
      session.totalSuprimentos += amount;
      session.expectedInCash += amount;
    }

    this.persist();
    return movement;
  }

  public closeCashSession(
    sessionId: string,
    declaredAmounts: Record<PaymentMethod, number>,
    notes?: string
  ): CashRegisterSession | null {
    this.init();
    const session = this.cashSessions.find((s) => s.id === sessionId);
    if (!session || session.status === "FECHADO") return null;

    session.status = "FECHADO";
    session.closedAt = new Date().toISOString();
    session.declaredAmounts = declaredAmounts;
    session.differenceInCash = (declaredAmounts.DINHEIRO || 0) - session.expectedInCash;
    session.notes = notes;

    this.persist();
    return session;
  }

  // REPORTS & DASHBOARD METRICS
  public getPaidOrdersHistory(): Order[] {
    this.init();
    return [...this.paidOrders];
  }

  public getDailySummaryMetrics(): DailySummaryMetric {
    this.init();

    const allPaid = this.paidOrders;
    const totalRevenue = allPaid.reduce((acc, o) => acc + o.total, 0);
    const ordersCount = allPaid.length;
    const averageTicket = ordersCount > 0 ? totalRevenue / ordersCount : 0;

    let itemsSoldCount = 0;
    const productStats: Record<string, { name: string; quantity: number; revenue: number }> = {};

    allPaid.forEach((ord) => {
      ord.items.forEach((item) => {
        if (item.status !== "CANCELADO") {
          itemsSoldCount += item.quantity;
          if (!productStats[item.productId]) {
            productStats[item.productId] = {
              name: item.productName,
              quantity: 0,
              revenue: 0,
            };
          }
          productStats[item.productId].quantity += item.quantity;
          productStats[item.productId].revenue += item.unitPrice * item.quantity;
        }
      });
    });

    const topSellingProducts = Object.entries(productStats)
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        quantity: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Revenue by hour mock aggregator
    const hours = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
    const revenueByHour = hours.map((hour, idx) => ({
      hour,
      revenue: Math.round(totalRevenue * (0.08 + (idx % 3) * 0.09) * 100) / 100,
      orders: Math.max(1, Math.floor(ordersCount * (0.1 + (idx % 3) * 0.05))),
    }));

    // Revenue by payment method
    const methodTotals: Record<PaymentMethod, number> = {
      DINHEIRO: 0,
      CARTAO_CREDITO: 0,
      CARTAO_DEBITO: 0,
      PIX: 0,
      VALE_REFEICAO: 0,
    };

    allPaid.forEach((ord) => {
      ord.payments.forEach((p) => {
        methodTotals[p.method] = (methodTotals[p.method] || 0) + p.amount;
      });
    });

    const methodLabels: Record<PaymentMethod, string> = {
      DINHEIRO: "Dinheiro",
      CARTAO_CREDITO: "Cartão de Crédito",
      CARTAO_DEBITO: "Cartão de Débito",
      PIX: "PIX",
      VALE_REFEICAO: "Vale Refeição",
    };

    const revenueByPaymentMethod = (Object.keys(methodTotals) as PaymentMethod[]).map((m) => {
      const amount = methodTotals[m];
      return {
        method: m,
        label: methodLabels[m],
        amount,
        percentage: totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0,
      };
    });

    const occupiedTables = this.tables.filter((t) => t.status === "OCUPADA").length;
    const waitingBillTables = this.tables.filter((t) => t.status === "PEDINDO_CONTA").length;

    return {
      totalRevenue,
      ordersCount,
      averageTicket,
      itemsSoldCount,
      occupiedTables,
      waitingBillTables,
      totalTables: this.tables.length,
      topSellingProducts,
      revenueByHour,
      revenueByPaymentMethod,
    };
  }

  // QUICK RESET FOR DEMO
  public resetToDefault() {
    if (typeof window !== "undefined") {
      Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    }
    this.products = [...INITIAL_PRODUCTS];
    this.tables = [...INITIAL_TABLES];
    this.activeOrders = [...INITIAL_ORDERS];
    this.paidOrders = [...INITIAL_PAID_ORDERS_HISTORY];
    this.cashSessions = [...INITIAL_CASH_SESSIONS];
    this.receipts = this.generateInitialReceipts();
    this.persist();
  }
}

export const store = new AppStore();

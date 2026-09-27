import {
  MobileProduct,
  MobileTable,
  MobileOrder,
  MobileOrderItem,
  MesaStatus,
  ComandaStatus,
  UserProfile,
  CartDraftItem,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_TABLES,
  INITIAL_ORDERS,
  INITIAL_ATTENDANTS,
} from '../constants/mockData';

type Listener = () => void;

class MobileDataStore {
  private products: MobileProduct[] = [...INITIAL_PRODUCTS];
  private tables: MobileTable[] = [...INITIAL_TABLES];
  private orders: MobileOrder[] = [...INITIAL_ORDERS];
  private attendants: UserProfile[] = [...INITIAL_ATTENDANTS];
  private listeners: Set<Listener> = new Set();
  private nextOrderNumber = 105;

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.warn('Listener error:', err);
      }
    });
  }

  // --- GETTERS ---
  public getTables(): MobileTable[] {
    return [...this.tables];
  }

  public getTableById(id: string): MobileTable | undefined {
    return this.tables.find((t) => t.id === id);
  }

  public getTableByNumber(num: number): MobileTable | undefined {
    return this.tables.find((t) => t.number === num);
  }

  public getProducts(): MobileProduct[] {
    return [...this.products];
  }

  public getProductById(id: string): MobileProduct | undefined {
    return this.products.find((p) => p.id === id);
  }

  public getOrders(): MobileOrder[] {
    return [...this.orders];
  }

  public getOrderById(id: string): MobileOrder | undefined {
    return this.orders.find((o) => o.id === id);
  }

  public getOrderByTableId(tableId: string): MobileOrder | undefined {
    const table = this.getTableById(tableId);
    if (!table || !table.currentOrderId) return undefined;
    return this.getOrderById(table.currentOrderId);
  }

  public getAttendants(): UserProfile[] {
    return [...this.attendants];
  }

  // --- CALCULATIONS ---
  private recalculateOrder(order: MobileOrder): MobileOrder {
    const subtotalCentavos = order.items.reduce((acc, item) => acc + item.subtotalCentavos, 0);
    const serviceFeePercentage = order.serviceFeePercentage ?? 10;
    const serviceFeeCentavos =
      serviceFeePercentage > 0 ? Math.round((subtotalCentavos * serviceFeePercentage) / 100) : 0;
    const discountCentavos = order.discountCentavos || 0;
    const totalCentavos = Math.max(0, subtotalCentavos + serviceFeeCentavos - discountCentavos);

    order.subtotalCentavos = subtotalCentavos;
    order.serviceFeePercentage = serviceFeePercentage;
    order.serviceFeeCentavos = serviceFeeCentavos;
    order.totalCentavos = totalCentavos;

    return order;
  }

  // --- ACTIONS ---

  /**
   * Abrir uma nova comanda vinculada à mesa
   */
  public openOrder(
    tableId: string,
    tableNumber: number,
    waiter: UserProfile,
    options?: { customerName?: string; partySize?: number; notes?: string }
  ): MobileOrder {
    const table = this.tables.find((t) => t.id === tableId);
    if (!table) {
      throw new Error(`Mesa com ID '${tableId}' não encontrada.`);
    }

    if (table.status !== MesaStatus.LIVRE && table.currentOrderId) {
      const existing = this.getOrderById(table.currentOrderId);
      if (existing && (existing.status === ComandaStatus.ABERTA || existing.status === ComandaStatus.PEDINDO_CONTA)) {
        return existing;
      }
    }

    const orderId = `cmd-${Date.now()}`;
    const code = `CMD-${this.nextOrderNumber++}`;

    const newOrder: MobileOrder = {
      id: orderId,
      code,
      tableId: table.id,
      tableNumber: table.number,
      waiterId: waiter.$id,
      waiterName: waiter.nome,
      customerName: options?.customerName || `Mesa ${table.number}`,
      partySize: options?.partySize || table.seats,
      status: ComandaStatus.ABERTA,
      items: [],
      subtotalCentavos: 0,
      serviceFeePercentage: 10,
      serviceFeeCentavos: 0,
      discountCentavos: 0,
      totalCentavos: 0,
      notes: options?.notes,
      openedAt: new Date().toISOString(),
    };

    // Atualiza mesa
    table.status = MesaStatus.OCUPADA;
    table.currentOrderId = newOrder.id;
    table.occupiedAt = newOrder.openedAt;
    table.billRequestedAt = undefined;

    this.orders.unshift(newOrder);
    this.notify();
    return newOrder;
  }

  /**
   * Lançar um único item na comanda
   */
  public addItemToOrder(
    orderId: string,
    product: MobileProduct,
    quantity: number,
    notes?: string,
    user?: UserProfile
  ): MobileOrder {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) {
      throw new Error(`Comanda '${orderId}' não encontrada.`);
    }

    if (order.status === ComandaStatus.PAGA || order.status === ComandaStatus.CANCELADA) {
      throw new Error(`Não é possível lançar itens em comanda finalizada (${order.status}).`);
    }

    // Se estava pedindo conta e lançou novo item, reabre a comanda automaticamente
    if (order.status === ComandaStatus.PEDINDO_CONTA) {
      order.status = ComandaStatus.ABERTA;
      const table = this.tables.find((t) => t.id === order.tableId);
      if (table) {
        table.status = MesaStatus.OCUPADA;
        table.billRequestedAt = undefined;
      }
    }

    const subtotalCentavos = product.priceCentavos * quantity;
    const newItem: MobileOrderItem = {
      id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderId: order.id,
      productId: product.id,
      productName: product.name,
      quantity,
      unitPriceCentavos: product.priceCentavos,
      subtotalCentavos,
      notes: notes?.trim() || undefined,
      addedById: user?.$id || order.waiterId,
      addedByName: user?.nome || order.waiterName,
      createdAt: new Date().toISOString(),
    };

    order.items.push(newItem);
    this.recalculateOrder(order);
    this.notify();
    return order;
  }

  /**
   * Lançar múltiplos itens (Carrinho do Atendente)
   */
  public addBatchItemsToOrder(
    orderId: string,
    items: CartDraftItem[],
    user?: UserProfile
  ): MobileOrder {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) {
      throw new Error(`Comanda '${orderId}' não encontrada.`);
    }

    if (items.length === 0) return order;

    items.forEach((draft) => {
      this.addItemToOrder(orderId, draft.product, draft.quantity, draft.notes, user);
    });

    return order;
  }

  /**
   * Solicitar Fechamento da Conta (Alerta Caixa)
   */
  public requestBill(orderId: string, _user?: UserProfile): MobileOrder {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) {
      throw new Error(`Comanda '${orderId}' não encontrada.`);
    }

    if (order.items.length === 0 || order.subtotalCentavos <= 0) {
      throw new Error('Não é possível pedir a conta de uma comanda sem itens ou com valor zerado.');
    }

    if (order.status === ComandaStatus.PAGA) {
      throw new Error('Esta comanda já está paga.');
    }

    const timestamp = new Date().toISOString();
    order.status = ComandaStatus.PEDINDO_CONTA;
    order.billRequestedAt = timestamp;

    const table = this.tables.find((t) => t.id === order.tableId);
    if (table) {
      table.status = MesaStatus.PEDINDO_CONTA;
      table.billRequestedAt = timestamp;
    }

    this.notify();
    return order;
  }

  /**
   * Reabrir comanda caso o cliente resolva continuar consumindo
   */
  public reopenOrder(orderId: string): MobileOrder {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) {
      throw new Error(`Comanda '${orderId}' não encontrada.`);
    }

    order.status = ComandaStatus.ABERTA;
    order.billRequestedAt = undefined;

    const table = this.tables.find((t) => t.id === order.tableId);
    if (table) {
      table.status = MesaStatus.OCUPADA;
      table.billRequestedAt = undefined;
    }

    this.notify();
    return order;
  }

  /**
   * Cancelar item específico da comanda
   */
  public removeOrderItem(orderId: string, itemId: string): MobileOrder {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) {
      throw new Error(`Comanda '${orderId}' não encontrada.`);
    }

    const itemIdx = order.items.findIndex((i) => i.id === itemId);
    if (itemIdx !== -1) {
      order.items.splice(itemIdx, 1);
      this.recalculateOrder(order);
      this.notify();
    }
    return order;
  }

  /**
   * Resetar dados para o estado inicial
   */
  public resetToDefault() {
    this.products = [...INITIAL_PRODUCTS];
    this.tables = [...INITIAL_TABLES];
    this.orders = [...INITIAL_ORDERS];
    this.attendants = [...INITIAL_ATTENDANTS];
    this.notify();
  }
}

export const mobileStore = new MobileDataStore();

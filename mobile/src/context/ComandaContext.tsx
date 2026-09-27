import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  MobileProduct,
  MobileTable,
  MobileOrder,
  MesaStatus,
  ProductCategory,
  CartDraftItem,
} from '../types';
import { mobileStore } from '../services/store';
import { useAuth } from './AuthContext';
import { triggerHaptic } from '../services/haptics';

interface ComandaContextType {
  tables: MobileTable[];
  products: MobileProduct[];
  orders: MobileOrder[];
  selectedTable: MobileTable | null;
  selectedOrder: MobileOrder | null;
  cartDraft: CartDraftItem[];
  cartCount: number;
  cartTotalCentavos: number;
  categoryFilter: ProductCategory;
  searchQuery: string;
  filterStatus: MesaStatus | 'TODAS';
  filteredTables: MobileTable[];
  filteredProducts: MobileProduct[];

  // Actions
  selectMesa: (tableId: string | null) => void;
  abrirComanda: (
    tableId: string,
    customerName?: string,
    partySize?: number,
    notes?: string
  ) => Promise<MobileOrder>;
  adicionarItemDireto: (
    orderId: string,
    product: MobileProduct,
    quantity: number,
    notes?: string
  ) => Promise<void>;
  adicionarAoCarrinho: (product: MobileProduct, quantity?: number, notes?: string) => void;
  removerDoCarrinho: (productId: string) => void;
  atualizarQtdCarrinho: (productId: string, quantity: number) => void;
  limparCarrinho: () => void;
  lancarCarrinhoNaComanda: (orderId: string) => Promise<MobileOrder>;
  solicitarConta: (orderId: string) => Promise<MobileOrder>;
  reabrirComanda: (orderId: string) => Promise<MobileOrder>;
  removerItemComanda: (orderId: string, itemId: string) => Promise<void>;
  setCategoryFilter: (cat: ProductCategory) => void;
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: MesaStatus | 'TODAS') => void;
  refreshData: () => void;
}

const ComandaContext = createContext<ComandaContextType | undefined>(undefined);

export const ComandaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [tables, setTables] = useState<MobileTable[]>(mobileStore.getTables());
  const [products, setProducts] = useState<MobileProduct[]>(mobileStore.getProducts());
  const [orders, setOrders] = useState<MobileOrder[]>(mobileStore.getOrders());

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [cartDraft, setCartDraft] = useState<CartDraftItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<MesaStatus | 'TODAS'>('TODAS');

  // Atualiza estado local quando store mutar
  const syncWithStore = useCallback(() => {
    setTables(mobileStore.getTables());
    setProducts(mobileStore.getProducts());
    setOrders(mobileStore.getOrders());
  }, []);

  useEffect(() => {
    const unsubscribe = mobileStore.subscribe(syncWithStore);
    return () => unsubscribe();
  }, [syncWithStore]);

  // Objeto da mesa selecionada
  const selectedTable = useMemo(() => {
    if (!selectedTableId) return null;
    return tables.find((t) => t.id === selectedTableId) || null;
  }, [tables, selectedTableId]);

  // Objeto da comanda ativa vinculada à mesa selecionada
  const selectedOrder = useMemo(() => {
    if (!selectedTable || !selectedTable.currentOrderId) return null;
    return orders.find((o) => o.id === selectedTable.currentOrderId) || null;
  }, [orders, selectedTable]);

  // Filtro de mesas por status
  const filteredTables = useMemo(() => {
    if (filterStatus === 'TODAS') return tables;
    return tables.filter((t) => t.status === filterStatus);
  }, [tables, filterStatus]);

  // Filtro de produtos por categoria e busca
  const filteredProducts = useMemo(() => {
    let result = products;

    if (categoryFilter !== 'TODOS') {
      result = result.filter((p) => p.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      );
    }

    return result;
  }, [products, categoryFilter, searchQuery]);

  // Totais do carrinho temporário
  const cartCount = useMemo(() => {
    return cartDraft.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartDraft]);

  const cartTotalCentavos = useMemo(() => {
    return cartDraft.reduce((acc, item) => acc + item.product.priceCentavos * item.quantity, 0);
  }, [cartDraft]);

  // --- ACTIONS ---

  const selectMesa = (tableId: string | null) => {
    setSelectedTableId(tableId);
  };

  const abrirComanda = async (
    tableId: string,
    customerName?: string,
    partySize?: number,
    notes?: string
  ): Promise<MobileOrder> => {
    if (!user) throw new Error('Atendente não autenticado.');

    const table = mobileStore.getTableById(tableId);
    if (!table) throw new Error('Mesa não encontrada.');

    const newOrder = mobileStore.openOrder(tableId, table.number, user, {
      customerName,
      partySize,
      notes,
    });

    setSelectedTableId(tableId);
    await triggerHaptic('success');
    return newOrder;
  };

  const adicionarItemDireto = async (
    orderId: string,
    product: MobileProduct,
    quantity: number,
    notes?: string
  ) => {
    if (!user) throw new Error('Atendente não autenticado.');
    mobileStore.addItemToOrder(orderId, product, quantity, notes, user);
    await triggerHaptic('light');
  };

  const adicionarAoCarrinho = (product: MobileProduct, quantity: number = 1, notes?: string) => {
    setCartDraft((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.product.id === product.id && item.notes === (notes?.trim() || undefined)
      );

      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantity;
        return updated;
      }

      return [...prev, { product, quantity, notes: notes?.trim() || undefined }];
    });
    triggerHaptic('light');
  };

  const removerDoCarrinho = (productId: string) => {
    setCartDraft((prev) => prev.filter((item) => item.product.id !== productId));
    triggerHaptic('light');
  };

  const atualizarQtdCarrinho = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removerDoCarrinho(productId);
      return;
    }
    setCartDraft((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity } : item))
    );
  };

  const limparCarrinho = () => {
    setCartDraft([]);
  };

  const lancarCarrinhoNaComanda = async (orderId: string): Promise<MobileOrder> => {
    if (!user) throw new Error('Atendente não autenticado.');
    if (cartDraft.length === 0) {
      throw new Error('Carrinho de lançamento vazio.');
    }

    const order = mobileStore.addBatchItemsToOrder(orderId, cartDraft, user);
    setCartDraft([]);
    await triggerHaptic('success');
    return order;
  };

  const solicitarConta = async (orderId: string): Promise<MobileOrder> => {
    if (!user) throw new Error('Atendente não autenticado.');
    const updated = mobileStore.requestBill(orderId, user);
    await triggerHaptic('warning');
    return updated;
  };

  const reabrirComanda = async (orderId: string): Promise<MobileOrder> => {
    const updated = mobileStore.reopenOrder(orderId);
    await triggerHaptic('light');
    return updated;
  };

  const removerItemComanda = async (orderId: string, itemId: string) => {
    mobileStore.removeOrderItem(orderId, itemId);
    await triggerHaptic('medium');
  };

  const refreshData = () => {
    syncWithStore();
  };

  const value = useMemo(
    () => ({
      tables,
      products,
      orders,
      selectedTable,
      selectedOrder,
      cartDraft,
      cartCount,
      cartTotalCentavos,
      categoryFilter,
      searchQuery,
      filterStatus,
      filteredTables,
      filteredProducts,

      selectMesa,
      abrirComanda,
      adicionarItemDireto,
      adicionarAoCarrinho,
      removerDoCarrinho,
      atualizarQtdCarrinho,
      limparCarrinho,
      lancarCarrinhoNaComanda,
      solicitarConta,
      reabrirComanda,
      removerItemComanda,
      setCategoryFilter,
      setSearchQuery,
      setFilterStatus,
      refreshData,
    }),
    [
      tables,
      products,
      orders,
      selectedTable,
      selectedOrder,
      cartDraft,
      cartCount,
      cartTotalCentavos,
      categoryFilter,
      searchQuery,
      filterStatus,
      filteredTables,
      filteredProducts,
      syncWithStore,
    ]
  );

  return <ComandaContext.Provider value={value}>{children}</ComandaContext.Provider>;
};

export function useComanda() {
  const context = useContext(ComandaContext);
  if (!context) {
    throw new Error('useComanda deve ser utilizado dentro de um ComandaProvider');
  }
  return context;
}

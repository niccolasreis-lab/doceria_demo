import { MesaStatus, ComandaStatus, ProductCategory, UserRole, UserProfile } from '../types';
import { mobileStore } from './store';
import { Produto, Mesa, Comanda, ItemComanda } from '../../../shared/types';

/**
 * Formata valor em centavos para Real brasileiro (R$ 0,00)
 */
export function formatCurrency(centavos: number = 0): string {
  const reais = centavos / 100;
  return reais.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Calcula o tempo decorrido amigável (ex: "15 min", "1h 20m")
 */
export function formatElapsedTime(isoDate?: string): string {
  if (!isoDate) return '-';

  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Agora';
  if (diffMinutes < 60) return `${diffMinutes} min`;

  const hours = Math.floor(diffMinutes / 60);
  const remainingMins = diffMinutes % 60;
  if (remainingMins === 0) return `${hours}h`;
  return `${hours}h ${remainingMins}m`;
}

/**
 * Formata apenas a hora e minutos (ex: "14:35")
 */
export function formatTime(isoDate?: string): string {
  if (!isoDate) return '-';
  const date = new Date(isoDate);
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Rótulos para categorias de produtos
 */
export function getCategoryLabel(cat: ProductCategory): string {
  switch (cat) {
    case 'TODOS':
      return 'Todos os Itens';
    case 'BOLOS':
      return 'Bolos Recheados';
    case 'TORTAS':
      return 'Tortas Doces';
    case 'DOCES_FINOS':
      return 'Doces Finos';
    case 'CAFES':
      return 'Cafeteria Especial';
    case 'BEBIDAS':
      return 'Sucos & Bebidas';
    case 'SALGADOS':
      return 'Salgados Artesanais';
    case 'SOBREMESAS_ESPECIAIS':
      return 'Sobremesas da Casa';
    default:
      return cat;
  }
}

/**
 * Rótulo descritivo do status da mesa
 */
export function getMesaStatusLabel(status: MesaStatus): string {
  switch (status) {
    case MesaStatus.LIVRE:
      return 'LIVRE';
    case MesaStatus.OCUPADA:
      return 'OCUPADA';
    case MesaStatus.PEDINDO_CONTA:
      return 'PEDINDO CONTA';
    default:
      return String(status).toUpperCase();
  }
}

/**
 * Rótulo descritivo do status da comanda
 */
export function getComandaStatusLabel(status: ComandaStatus): string {
  switch (status) {
    case ComandaStatus.ABERTA:
      return 'Em Consumo';
    case ComandaStatus.PEDINDO_CONTA:
      return 'Conta Solicitada';
    case ComandaStatus.PAGA:
      return 'Paga / Finalizada';
    case ComandaStatus.CANCELADA:
      return 'Cancelada';
    default:
      return status;
  }
}

/**
 * API client compatível com contratos do shared para chamadas diretas
 */
export const mobileApi = {
  async getMesas(): Promise<Mesa[]> {
    return mobileStore.getTables().map((t) => ({
      $id: t.id,
      numero: t.number,
      capacidade: t.seats,
      status: t.status,
      comanda_ativa_id: t.currentOrderId || null,
    }));
  },

  async getProdutos(): Promise<Produto[]> {
    return mobileStore.getProducts().map((p) => ({
      $id: p.id,
      nome: p.name,
      descricao: p.description,
      preco_centavos: p.priceCentavos,
      categoria:
        p.category === 'BOLOS' || p.category === 'TORTAS'
          ? 'Bolos'
          : p.category === 'DOCES_FINOS'
          ? 'Doces Finos'
          : p.category === 'CAFES'
          ? 'Cafeteria'
          : p.category === 'BEBIDAS'
          ? 'Bebidas'
          : 'Salgados',
      disponivel: p.available,
    }));
  },

  async getComanda(comandaId: string): Promise<{ comanda: Comanda; itens: ItemComanda[] } | null> {
    const order = mobileStore.getOrderById(comandaId);
    if (!order) return null;

    const comanda: Comanda = {
      $id: order.id,
      codigo: order.code,
      mesa_id: order.tableId,
      mesa_numero: order.tableNumber,
      atendente_id: order.waiterId,
      atendente_nome: order.waiterName,
      status: order.status,
      subtotal_centavos: order.subtotalCentavos,
      desconto_centavos: order.discountCentavos,
      total_centavos: order.totalCentavos,
      observacoes: order.notes,
      aberta_em: order.openedAt,
      fechada_em: order.closedAt,
    };

    const itens: ItemComanda[] = order.items.map((i) => ({
      $id: i.id,
      comanda_id: i.orderId,
      produto_id: i.productId,
      produto_nome: i.productName,
      quantidade: i.quantity,
      preco_unitario_centavos: i.unitPriceCentavos,
      subtotal_centavos: i.subtotalCentavos,
      observacao: i.notes,
      lancado_por_id: i.addedById,
      lancado_por_nome: i.addedByName,
      criado_em: i.createdAt,
    }));

    return { comanda, itens };
  },

  async adicionarItem(
    comandaId: string,
    produtoId: string,
    quantidade: number,
    observacao?: string,
    usuarioId?: string,
    usuarioNome?: string
  ): Promise<ItemComanda> {
    const prod = mobileStore.getProductById(produtoId);
    if (!prod) throw new Error('Produto não encontrado');

    const mockUser: UserProfile = {
      $id: usuarioId || 'at-1',
      nome: usuarioNome || 'Atendente',
      email: 'atendente@doceriagilmar.com.br',
      role: UserRole.ATENDENTE,
      ativo: true,
    };

    const order = mobileStore.addItemToOrder(comandaId, prod, quantidade, observacao, mockUser);
    const lastItem = order.items[order.items.length - 1];

    return {
      $id: lastItem.id,
      comanda_id: lastItem.orderId,
      produto_id: lastItem.productId,
      produto_nome: lastItem.productName,
      quantidade: lastItem.quantity,
      preco_unitario_centavos: lastItem.unitPriceCentavos,
      subtotal_centavos: lastItem.subtotalCentavos,
      observacao: lastItem.notes,
      lancado_por_id: lastItem.addedById,
      lancado_por_nome: lastItem.addedByName,
      criado_em: lastItem.createdAt,
    };
  },

  async solicitarConta(comandaId: string): Promise<{ sucesso: boolean; status: 'pedindo_conta' }> {
    mobileStore.requestBill(comandaId);
    return { sucesso: true, status: 'pedindo_conta' };
  },
};

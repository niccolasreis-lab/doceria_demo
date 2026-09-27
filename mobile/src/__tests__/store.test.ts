import { describe, it, expect, beforeEach } from 'vitest';
import { mobileStore } from '../services/store';
import { MesaStatus, ComandaStatus, UserProfile, UserRole } from '../types';

describe('MobileDataStore — Lógica de Salão & Comandas', () => {
  const mockWaiter: UserProfile = {
    $id: 'user_atendente_test',
    nome: 'Lucas Oliveira',
    email: 'lucas@doceria.com.br',
    role: UserRole.ATENDENTE,
    ativo: true,
  };

  beforeEach(() => {
    mobileStore.resetToDefault();
  });

  it('deve listar mesas iniciais com status consistentes', () => {
    const tables = mobileStore.getTables();
    expect(tables.length).toBeGreaterThanOrEqual(10);

    const mesa1 = tables.find((t) => t.number === 1);
    expect(mesa1).toBeDefined();
    expect(mesa1?.status).toBe(MesaStatus.LIVRE);
  });

  it('deve abrir uma nova comanda para uma mesa livre e atualizar o status para OCUPADA', () => {
    const mesa1 = mobileStore.getTableByNumber(1)!;
    expect(mesa1.status).toBe(MesaStatus.LIVRE);

    const order = mobileStore.openOrder(mesa1.id, mesa1.number, mockWaiter, {
      customerName: 'Família Silva',
      partySize: 2,
      notes: 'Mesa perto da janela',
    });

    expect(order).toBeDefined();
    expect(order.tableNumber).toBe(1);
    expect(order.waiterName).toBe('Lucas Oliveira');
    expect(order.status).toBe(ComandaStatus.ABERTA);
    expect(order.customerName).toBe('Família Silva');
    expect(order.items.length).toBe(0);
    expect(order.totalCentavos).toBe(0);

    const updatedMesa1 = mobileStore.getTableByNumber(1)!;
    expect(updatedMesa1.status).toBe(MesaStatus.OCUPADA);
    expect(updatedMesa1.currentOrderId).toBe(order.id);
  });

  it('deve lançar itens na comanda e recalcular subtotal, taxa de serviço de 10% e total em centavos', () => {
    const mesa1 = mobileStore.getTableByNumber(1)!;
    const order = mobileStore.openOrder(mesa1.id, mesa1.number, mockWaiter);

    const boloCenoura = mobileStore.getProducts().find((p) => p.sku === 'BOLO-CEN-01')!; // 1850 centavos (R$ 18,50)
    const cafeEspresso = mobileStore.getProducts().find((p) => p.sku === 'CAFE-ESP-01')!; // 950 centavos (R$ 9,50)

    // Lança 2 fatias de bolo com observação
    mobileStore.addItemToOrder(order.id, boloCenoura, 2, 'Servir com guardanapo extra', mockWaiter);
    // Lança 1 café espresso
    mobileStore.addItemToOrder(order.id, cafeEspresso, 1, 'Sem açúcar', mockWaiter);

    const updatedOrder = mobileStore.getOrderById(order.id)!;
    expect(updatedOrder.items.length).toBe(2);

    // 2 * 1850 = 3700; 1 * 950 = 950. Subtotal = 4650 centavos (R$ 46,50)
    expect(updatedOrder.subtotalCentavos).toBe(4650);
    // Serviço 10% de 4650 = 465 centavos (R$ 4,65)
    expect(updatedOrder.serviceFeeCentavos).toBe(465);
    // Total = 4650 + 465 = 5115 centavos (R$ 51,15)
    expect(updatedOrder.totalCentavos).toBe(5115);

    // Verifica observações no item
    expect(updatedOrder.items[0].notes).toBe('Servir com guardanapo extra');
    expect(updatedOrder.items[1].notes).toBe('Sem açúcar');
  });

  it('deve bloquear solicitação de conta em comanda vazia sem itens', () => {
    const mesa1 = mobileStore.getTableByNumber(1)!;
    const order = mobileStore.openOrder(mesa1.id, mesa1.number, mockWaiter);

    expect(() => {
      mobileStore.requestBill(order.id, mockWaiter);
    }).toThrow(/não é possível pedir a conta de uma comanda sem itens/i);
  });

  it('deve permitir solicitar conta em comanda com itens e transicionar status para PEDINDO_CONTA', () => {
    const mesa1 = mobileStore.getTableByNumber(1)!;
    const order = mobileStore.openOrder(mesa1.id, mesa1.number, mockWaiter);

    const bolo = mobileStore.getProducts()[0];
    mobileStore.addItemToOrder(order.id, bolo, 1, undefined, mockWaiter);

    const billOrder = mobileStore.requestBill(order.id, mockWaiter);
    expect(billOrder.status).toBe(ComandaStatus.PEDINDO_CONTA);
    expect(billOrder.billRequestedAt).toBeDefined();

    const updatedMesa = mobileStore.getTableByNumber(1)!;
    expect(updatedMesa.status).toBe(MesaStatus.PEDINDO_CONTA);
  });

  it('deve permitir reabrir comanda quando cliente pedir itens adicionais', () => {
    const mesa1 = mobileStore.getTableByNumber(1)!;
    const order = mobileStore.openOrder(mesa1.id, mesa1.number, mockWaiter);
    const bolo = mobileStore.getProducts()[0];
    mobileStore.addItemToOrder(order.id, bolo, 1, undefined, mockWaiter);

    mobileStore.requestBill(order.id, mockWaiter);
    expect(mobileStore.getOrderById(order.id)!.status).toBe(ComandaStatus.PEDINDO_CONTA);

    // Reabre comanda
    mobileStore.reopenOrder(order.id);
    expect(mobileStore.getOrderById(order.id)!.status).toBe(ComandaStatus.ABERTA);
    expect(mobileStore.getTableByNumber(1)!.status).toBe(MesaStatus.OCUPADA);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { mobileStore } from '../services/store';
import { mobileApi, formatCurrency, formatElapsedTime, formatTime, getCategoryLabel } from '../services/api';
import { MesaStatus, ComandaStatus, UserProfile, UserRole, MobileProduct, CartDraftItem } from '../types';
import { MobileNotificacaoService } from '../integrations/notifications/MobileNotificacaoService';
import { MobileExpoPrintAdapter } from '../integrations/print/MobileExpoPrintAdapter';
import { TipoNotificacao, FormaPagamento } from '../../../shared/types';
import { CupomImpressao } from '../../../shared/ports';

describe('Atendente Mobile Flows — Validação Completa do Salão', () => {
  const mockWaiter: UserProfile = {
    $id: 'user_atendente_01',
    nome: 'Lucas Oliveira',
    email: 'lucas.atendimento@doceriadosrgilmar.com.br',
    role: UserRole.ATENDENTE,
    ativo: true,
  };

  const mockWaiter2: UserProfile = {
    $id: 'user_atendente_02',
    nome: 'Carlos Eduardo',
    email: 'carlos.salao@doceriadosrgilmar.com.br',
    role: UserRole.ATENDENTE,
    ativo: true,
  };

  beforeEach(() => {
    mobileStore.resetToDefault();
  });

  describe('1. Mapa de Mesas e Gestão de Status', () => {
    it('deve listar todas as 12 mesas com setores configurados', () => {
      const tables = mobileStore.getTables();
      expect(tables).toHaveLength(12);

      const setores = new Set(tables.map((t) => t.sector));
      expect(setores.has('SALAO_PRINCIPAL')).toBe(true);
      expect(setores.has('VARANDA')).toBe(true);
      expect(setores.has('DECK')).toBe(true);
      expect(setores.has('BALCAO')).toBe(true);
    });

    it('deve permitir abrir uma nova comanda vinculada à mesa livre', () => {
      const mesa1 = mobileStore.getTableByNumber(1)!;
      expect(mesa1.status).toBe(MesaStatus.LIVRE);
      expect(mesa1.currentOrderId).toBeUndefined();

      const order = mobileStore.openOrder(mesa1.id, mesa1.number, mockWaiter, {
        customerName: 'Cliente VIP',
        partySize: 2,
        notes: 'Perto da janela',
      });

      expect(order.id).toBeDefined();
      expect(order.tableId).toBe(mesa1.id);
      expect(order.tableNumber).toBe(1);
      expect(order.waiterId).toBe(mockWaiter.$id);
      expect(order.waiterName).toBe('Lucas Oliveira');
      expect(order.status).toBe(ComandaStatus.ABERTA);
      expect(order.customerName).toBe('Cliente VIP');
      expect(order.partySize).toBe(2);
      expect(order.notes).toBe('Perto da janela');
      expect(order.items).toEqual([]);
      expect(order.subtotalCentavos).toBe(0);
      expect(order.totalCentavos).toBe(0);

      const updatedMesa = mobileStore.getTableById(mesa1.id)!;
      expect(updatedMesa.status).toBe(MesaStatus.OCUPADA);
      expect(updatedMesa.currentOrderId).toBe(order.id);
      expect(updatedMesa.occupiedAt).toBeDefined();
    });

    it('deve retornar a comanda existente caso a mesa já esteja ocupada', () => {
      const mesa2 = mobileStore.getTableByNumber(2)!;
      expect(mesa2.status).toBe(MesaStatus.OCUPADA);
      const existingOrderId = mesa2.currentOrderId;

      const order = mobileStore.openOrder(mesa2.id, mesa2.number, mockWaiter);
      expect(order.id).toBe(existingOrderId);
    });

    it('deve lançar erro ao tentar abrir comanda para ID de mesa inexistente', () => {
      expect(() => {
        mobileStore.openOrder('mesa-inexistente-999', 999, mockWaiter);
      }).toThrow(/não encontrada/i);
    });
  });

  describe('2. Lançamento de Itens e Cálculos Financeiros', () => {
    it('deve lançar item individual com quantidade e observação e atualizar totais com taxa de 10%', () => {
      const mesa1 = mobileStore.getTableByNumber(1)!;
      const order = mobileStore.openOrder(mesa1.id, mesa1.number, mockWaiter);

      const produtoBolo = mobileStore.getProducts().find((p) => p.sku === 'BOLO-CEN-01')!; // 1850 centavos
      expect(produtoBolo).toBeDefined();

      const updatedOrder = mobileStore.addItemToOrder(
        order.id,
        produtoBolo,
        3,
        'Servir com pratinhos extras',
        mockWaiter
      );

      expect(updatedOrder.items).toHaveLength(1);
      const item = updatedOrder.items[0];
      expect(item.productId).toBe(produtoBolo.id);
      expect(item.productName).toBe(produtoBolo.name);
      expect(item.quantity).toBe(3);
      expect(item.unitPriceCentavos).toBe(1850);
      expect(item.subtotalCentavos).toBe(5550); // 3 * 1850 = 5550 centavos (R$ 55,50)
      expect(item.notes).toBe('Servir com pratinhos extras');
      expect(item.addedById).toBe(mockWaiter.$id);
      expect(item.addedByName).toBe(mockWaiter.nome);

      // Subtotal = 5550; Taxa 10% = 555; Total = 6105 centavos (R$ 61,05)
      expect(updatedOrder.subtotalCentavos).toBe(5550);
      expect(updatedOrder.serviceFeeCentavos).toBe(555);
      expect(updatedOrder.totalCentavos).toBe(6105);
    });

    it('deve permitir lançamento em lote via carrinho do atendente', () => {
      const mesa1 = mobileStore.getTableByNumber(1)!;
      const order = mobileStore.openOrder(mesa1.id, mesa1.number, mockWaiter);

      const prodCafe = mobileStore.getProducts().find((p) => p.sku === 'CAFE-ESP-01')!; // 950 centavos
      const prodPaoQueijo = mobileStore.getProducts().find((p) => p.sku === 'SALG-PAO-04')!; // 1700 centavos
      const prodQuindim = mobileStore.getProducts().find((p) => p.sku === 'DOCE-QUIN-03')!; // 900 centavos

      const batchDraft: CartDraftItem[] = [
        { product: prodCafe, quantity: 2, notes: 'Sem açúcar' },
        { product: prodPaoQueijo, quantity: 1, notes: 'Bem quentinho' },
        { product: prodQuindim, quantity: 4 },
      ];

      const resultOrder = mobileStore.addBatchItemsToOrder(order.id, batchDraft, mockWaiter);
      expect(resultOrder.items).toHaveLength(3);

      // Cálculos:
      // Cafe: 2 * 950 = 1900
      // Pao de Queijo: 1 * 1700 = 1700
      // Quindim: 4 * 900 = 3600
      // Subtotal = 1900 + 1700 + 3600 = 7200 centavos (R$ 72,00)
      // Taxa 10% = 720 centavos
      // Total = 7920 centavos (R$ 79,20)
      expect(resultOrder.subtotalCentavos).toBe(7200);
      expect(resultOrder.serviceFeeCentavos).toBe(720);
      expect(resultOrder.totalCentavos).toBe(7920);
    });

    it('deve remover item da comanda e recalcular os totais corretamente', () => {
      const mesa1 = mobileStore.getTableByNumber(1)!;
      const order = mobileStore.openOrder(mesa1.id, mesa1.number, mockWaiter);

      const prodBolo = mobileStore.getProducts().find((p) => p.sku === 'BOLO-CEN-01')!; // 1850
      const prodCafe = mobileStore.getProducts().find((p) => p.sku === 'CAFE-ESP-01')!; // 950

      mobileStore.addItemToOrder(order.id, prodBolo, 1, undefined, mockWaiter);
      mobileStore.addItemToOrder(order.id, prodCafe, 2, undefined, mockWaiter);

      expect(order.items).toHaveLength(2);
      // Subtotal = 1850 + 1900 = 3750, Total = 3750 + 375 = 4125
      expect(order.subtotalCentavos).toBe(3750);
      expect(order.totalCentavos).toBe(4125);

      const itemIdToRemove = order.items[1].id;
      const updatedOrder = mobileStore.removeOrderItem(order.id, itemIdToRemove);

      expect(updatedOrder.items).toHaveLength(1);
      expect(updatedOrder.items[0].productId).toBe(prodBolo.id);
      expect(updatedOrder.subtotalCentavos).toBe(1850);
      expect(updatedOrder.serviceFeeCentavos).toBe(185);
      expect(updatedOrder.totalCentavos).toBe(2035);
    });

    it('deve bloquear lançamento de itens se a comanda estiver PAGA ou CANCELADA', () => {
      const mesa1 = mobileStore.getTableByNumber(1)!;
      const order = mobileStore.openOrder(mesa1.id, mesa1.number, mockWaiter);
      const prod = mobileStore.getProducts()[0];

      order.status = ComandaStatus.PAGA;
      expect(() => {
        mobileStore.addItemToOrder(order.id, prod, 1, undefined, mockWaiter);
      }).toThrow(/não é possível lançar itens em comanda finalizada/i);

      order.status = ComandaStatus.CANCELADA;
      expect(() => {
        mobileStore.addItemToOrder(order.id, prod, 1, undefined, mockWaiter);
      }).toThrow(/não é possível lançar itens em comanda finalizada/i);
    });
  });

  describe('3. Categorias de Produtos e Catálogo', () => {
    it('deve listar todos os produtos com catálogo variado', () => {
      const products = mobileStore.getProducts();
      expect(products.length).toBeGreaterThanOrEqual(20);

      const categories = new Set(products.map((p) => p.category));
      expect(categories.has('BOLOS')).toBe(true);
      expect(categories.has('TORTAS')).toBe(true);
      expect(categories.has('DOCES_FINOS')).toBe(true);
      expect(categories.has('CAFES')).toBe(true);
      expect(categories.has('BEBIDAS')).toBe(true);
      expect(categories.has('SALGADOS')).toBe(true);
      expect(categories.has('SOBREMESAS_ESPECIAIS')).toBe(true);
    });

    it('deve mapear rótulos amigáveis para todas as categorias', () => {
      expect(getCategoryLabel('TODOS')).toBe('Todos os Itens');
      expect(getCategoryLabel('BOLOS')).toBe('Bolos Recheados');
      expect(getCategoryLabel('TORTAS')).toBe('Tortas Doces');
      expect(getCategoryLabel('DOCES_FINOS')).toBe('Doces Finos');
      expect(getCategoryLabel('CAFES')).toBe('Cafeteria Especial');
      expect(getCategoryLabel('BEBIDAS')).toBe('Sucos & Bebidas');
      expect(getCategoryLabel('SALGADOS')).toBe('Salgados Artesanais');
      expect(getCategoryLabel('SOBREMESAS_ESPECIAIS')).toBe('Sobremesas da Casa');
    });

    it('deve buscar produtos por nome, descrição ou SKU', () => {
      const products = mobileStore.getProducts();
      const query = 'pistache';
      const filtered = products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query)
      );

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.some((p) => p.name.includes('Pistache'))).toBe(true);
    });
  });

  describe('4. Bloqueio de Pedir Conta Sem Itens e Ciclo de Fechamento', () => {
    it('deve lançar exceção explícita ao pedir conta de comanda vazia', () => {
      const mesa1 = mobileStore.getTableByNumber(1)!;
      const order = mobileStore.openOrder(mesa1.id, mesa1.number, mockWaiter);

      expect(order.items.length).toBe(0);
      expect(order.subtotalCentavos).toBe(0);

      expect(() => {
        mobileStore.requestBill(order.id, mockWaiter);
      }).toThrow(/não é possível pedir a conta de uma comanda sem itens/i);
    });

    it('deve permitir pedir conta quando houver itens e atualizar mesa e comanda para PEDINDO_CONTA', () => {
      const mesa1 = mobileStore.getTableByNumber(1)!;
      const order = mobileStore.openOrder(mesa1.id, mesa1.number, mockWaiter);
      const prod = mobileStore.getProducts()[0];
      mobileStore.addItemToOrder(order.id, prod, 2, undefined, mockWaiter);

      const billOrder = mobileStore.requestBill(order.id, mockWaiter);
      expect(billOrder.status).toBe(ComandaStatus.PEDINDO_CONTA);
      expect(billOrder.billRequestedAt).toBeDefined();

      const table = mobileStore.getTableById(mesa1.id)!;
      expect(table.status).toBe(MesaStatus.PEDINDO_CONTA);
      expect(table.billRequestedAt).toBe(billOrder.billRequestedAt);
    });

    it('deve permitir reabrir comanda em PEDINDO_CONTA voltando status para ABERTA e mesa para OCUPADA', () => {
      const mesa1 = mobileStore.getTableByNumber(1)!;
      const order = mobileStore.openOrder(mesa1.id, mesa1.number, mockWaiter);
      const prod = mobileStore.getProducts()[0];
      mobileStore.addItemToOrder(order.id, prod, 1, undefined, mockWaiter);

      mobileStore.requestBill(order.id, mockWaiter);
      expect(mobileStore.getOrderById(order.id)!.status).toBe(ComandaStatus.PEDINDO_CONTA);
      expect(mobileStore.getTableById(mesa1.id)!.status).toBe(MesaStatus.PEDINDO_CONTA);

      const reopenedOrder = mobileStore.reopenOrder(order.id);
      expect(reopenedOrder.status).toBe(ComandaStatus.ABERTA);
      expect(reopenedOrder.billRequestedAt).toBeUndefined();

      const table = mobileStore.getTableById(mesa1.id)!;
      expect(table.status).toBe(MesaStatus.OCUPADA);
      expect(table.billRequestedAt).toBeUndefined();
    });

    it('deve reabrir comanda automaticamente se atendente lançar novo item enquanto em PEDINDO_CONTA', () => {
      const mesa1 = mobileStore.getTableByNumber(1)!;
      const order = mobileStore.openOrder(mesa1.id, mesa1.number, mockWaiter);
      const prod1 = mobileStore.getProducts()[0];
      const prod2 = mobileStore.getProducts()[1];

      mobileStore.addItemToOrder(order.id, prod1, 1, undefined, mockWaiter);
      mobileStore.requestBill(order.id, mockWaiter);
      expect(mobileStore.getOrderById(order.id)!.status).toBe(ComandaStatus.PEDINDO_CONTA);

      // Atendente lança café adicional
      const updatedOrder = mobileStore.addItemToOrder(order.id, prod2, 1, undefined, mockWaiter);
      expect(updatedOrder.status).toBe(ComandaStatus.ABERTA);

      const table = mobileStore.getTableById(mesa1.id)!;
      expect(table.status).toBe(MesaStatus.OCUPADA);
    });
  });

  describe('5. Shared Contracts e API Layer', () => {
    it('deve retornar DTOs de Mesas com tipagem correspondente ao Shared Contract', async () => {
      const mesas = await mobileApi.getMesas();
      expect(mesas.length).toBe(12);

      const m = mesas[0];
      expect(m).toHaveProperty('$id');
      expect(m).toHaveProperty('numero');
      expect(m).toHaveProperty('capacidade');
      expect(m).toHaveProperty('status');
      expect([MesaStatus.LIVRE, MesaStatus.OCUPADA, MesaStatus.PEDINDO_CONTA]).toContain(m.status);
    });

    it('deve retornar DTOs de Produtos compatíveis com a collection Appwrite', async () => {
      const produtos = await mobileApi.getProdutos();
      expect(produtos.length).toBeGreaterThanOrEqual(20);

      const p = produtos[0];
      expect(p).toHaveProperty('$id');
      expect(p).toHaveProperty('nome');
      expect(p).toHaveProperty('preco_centavos');
      expect(p).toHaveProperty('categoria');
      expect(p).toHaveProperty('disponivel');
      expect(typeof p.preco_centavos).toBe('number');
    });

    it('deve retornar detalhes de Comanda e Itens via mobileApi.getComanda', async () => {
      const mesa4 = mobileStore.getTableByNumber(4)!;
      expect(mesa4.currentOrderId).toBe('cmd-101');

      const result = await mobileApi.getComanda('cmd-101');
      expect(result).not.toBeNull();
      expect(result!.comanda.$id).toBe('cmd-101');
      expect(result!.comanda.codigo).toBe('CMD-101');
      expect(result!.comanda.mesa_numero).toBe(4);
      expect(result!.itens.length).toBe(4);
      expect(result!.itens[0]).toHaveProperty('produto_nome');
      expect(result!.itens[0]).toHaveProperty('quantidade');
      expect(result!.itens[0]).toHaveProperty('preco_unitario_centavos');
      expect(result!.itens[0]).toHaveProperty('subtotal_centavos');
    });

    it('deve lançar item via mobileApi.adicionarItem e solicitar conta via mobileApi.solicitarConta', async () => {
      const mesa1 = mobileStore.getTableByNumber(1)!;
      const order = mobileStore.openOrder(mesa1.id, mesa1.number, mockWaiter);
      const prod = mobileStore.getProducts()[0];

      const itemComanda = await mobileApi.adicionarItem(
        order.id,
        prod.id,
        2,
        'Observacao API',
        mockWaiter.$id,
        mockWaiter.nome
      );

      expect(itemComanda.comanda_id).toBe(order.id);
      expect(itemComanda.produto_id).toBe(prod.id);
      expect(itemComanda.quantidade).toBe(2);
      expect(itemComanda.observacao).toBe('Observacao API');

      const billResult = await mobileApi.solicitarConta(order.id);
      expect(billResult.sucesso).toBe(true);
      expect(billResult.status).toBe('pedindo_conta');
    });
  });

  describe('6. Integrações Mobile (Notificações e Impressão Térmica)', () => {
    it('deve inicializar MobileNotificacaoService e acionar vibração em notificações para ATENDENTE', async () => {
      let vibrationTriggered = false;
      const mockVibration = {
        vibrate: (pattern?: number | number[]) => {
          vibrationTriggered = true;
        },
      };

      const notifService = new MobileNotificacaoService({
        habilitarVibracao: true,
        vibrationModule: mockVibration,
      });

      let receivedNotification: any = null;
      const sub = notifService.monitorarParaRole(UserRole.ATENDENTE, (notif) => {
        receivedNotification = notif;
      });

      await notifService.emitir({
        id: 'notif-test-1',
        tipo: TipoNotificacao.PEDIR_CONTA,
        titulo: 'Mesa 4 Pedindo Conta',
        mensagem: 'O cliente da Mesa 4 solicitou o fechamento.',
        destinatarioRole: UserRole.ATENDENTE,
        comandaId: 'cmd-101',
        mesaNumero: 4,
        lida: false,
        timestamp: new Date().toISOString(),
      });

      expect(receivedNotification).not.toBeNull();
      expect(receivedNotification.titulo).toBe('Mesa 4 Pedindo Conta');
      expect(vibrationTriggered).toBe(true);

      sub.unsubscribe();
    });

    it('deve inicializar MobileExpoPrintAdapter e imprimir cupom via simulador de fallback', async () => {
      const printAdapter = new MobileExpoPrintAdapter({
        fallbackSimulatorSeSemNativo: true,
      });

      const cupomMock: CupomImpressao = {
        empresa: {
          nome: 'Doceria do Sr Gilmar',
          cnpj: '12.345.678/0001-90',
          endereco: 'Rua das Delícias, 123 - Jardins, SP',
          telefone: '(11) 3456-7890',
        },
        comanda: {
          codigo: 'CMD-101',
          mesa: 4,
          atendente: 'Lucas Oliveira',
          abertaEm: new Date().toISOString(),
          fechadaEm: new Date().toISOString(),
        },
        itens: [
          {
            nome: 'Bolo de Cenoura com Brigadeiro',
            quantidade: 2,
            precoUnitarioCentavos: 1850,
            subtotalCentavos: 3700,
          },
          {
            nome: 'Café Espresso Especial',
            quantidade: 2,
            precoUnitarioCentavos: 950,
            subtotalCentavos: 1900,
          },
        ],
        subtotalCentavos: 5600,
        descontoCentavos: 0,
        totalCentavos: 6160,
        formaPagamento: FormaPagamento.PIX,
        valorPagoCentavos: 6160,
        trocoCentavos: 0,
      };

      const result = await printAdapter.imprimirCupom(cupomMock);
      expect(result.sucesso).toBe(true);
      expect(result.cupomFormatadoTexto).toBeDefined();
      expect(result.cupomFormatadoTexto).toContain('DOCERIA DO SR GILMAR');
      expect(result.cupomFormatadoTexto).toContain('CMD-101');
      expect(result.cupomFormatadoTexto).toContain('MESA: 4');
    });

    it('deve simular impressão com módulo nativo expo-print injetado', async () => {
      let printedHtml = '';
      const mockExpoPrint = {
        printAsync: async ({ html }: { html: string }) => {
          printedHtml = html;
        },
      };

      const printAdapter = new MobileExpoPrintAdapter({
        expoPrintModule: mockExpoPrint,
      });

      const cupomMock: CupomImpressao = {
        empresa: {
          nome: 'Doceria do Sr Gilmar',
          cnpj: '12.345.678/0001-90',
          endereco: 'Rua das Delícias, 123',
          telefone: '(11) 3456-7890',
        },
        comanda: {
          codigo: 'CMD-102',
          mesa: 8,
          atendente: 'Lucas Oliveira',
          abertaEm: new Date().toISOString(),
          fechadaEm: new Date().toISOString(),
        },
        itens: [
          {
            nome: 'Taça Suprema do Sr Gilmar',
            quantidade: 1,
            precoUnitarioCentavos: 3400,
            subtotalCentavos: 3400,
          },
        ],
        subtotalCentavos: 3400,
        descontoCentavos: 0,
        totalCentavos: 3740,
        formaPagamento: FormaPagamento.CARTAO_CREDITO,
        valorPagoCentavos: 3740,
        trocoCentavos: 0,
      };

      const result = await printAdapter.imprimirCupom(cupomMock);
      expect(result.sucesso).toBe(true);
      expect(result.adaptadorUtilizado).toContain('expo-print');
      expect(printedHtml).toContain('Doceria do Sr Gilmar');
      expect(printedHtml).toContain('CMD-102');
    });
  });
});

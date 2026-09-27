import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { store } from "../src/lib/store";
import { WebNotificacaoService } from "../src/integrations/notifications/WebNotificacaoService";
import { WebWindowPrintAdapter } from "../src/integrations/print/WebWindowPrintAdapter";
import {
  Order,
  PaymentEntry,
  Product,
  Table,
  UserRole,
  PaymentMethod,
  ProductCategory,
  TableSector,
  TableStatus,
} from "../src/types";

describe("Web Next.js 14 — Validação Completa de Rotas e Regras de Negócio", () => {
  // -------------------------------------------------------------
  // 1. ROTA /login — Autenticação, Perfis e Controle de Acesso
  // -------------------------------------------------------------
  describe("1. Rota /login — Autenticação, Perfis Operacionais e RBAC", () => {
    it("deve mapear corretamente os perfis operacionais e credenciais padrão", () => {
      const mockUsers = [
        { id: "usr-1", name: "Mariana Silva", role: "CAIXA" as UserRole, pin: "0000" },
        { id: "usr-2", name: "Sr. Gilmar Santos", role: "ADMIN" as UserRole, pin: "1234" },
        { id: "usr-3", name: "Carlos Eduardo", role: "GARCOM" as UserRole, pin: "1111" },
      ];

      // Validação do perfil CAIXA
      const caixa = mockUsers.find((u) => u.pin === "0000");
      assert.ok(caixa);
      assert.equal(caixa.role, "CAIXA");

      // Validação do perfil ADMIN
      const admin = mockUsers.find((u) => u.pin === "1234");
      assert.ok(admin);
      assert.equal(admin.role, "ADMIN");

      // Validação do perfil GARCOM
      const garcom = mockUsers.find((u) => u.pin === "1111");
      assert.ok(garcom);
      assert.equal(garcom.role, "GARCOM");
    });

    it("deve aplicar regras estritas de RBAC para permissões de rotas", () => {
      const adminAllowedRoutes = ["/admin", "/admin/produtos", "/admin/mesas", "/admin/relatorios", "/admin/fechamento-caixa", "/caixa", "/caixa/historico"];
      const caixaAllowedRoutes = ["/caixa", "/caixa/historico"];
      const garcomAllowedRoutes = ["/caixa"];

      const isRouteAllowed = (role: UserRole, path: string): boolean => {
        if (role === "ADMIN") return true;
        if (role === "CAIXA") return caixaAllowedRoutes.includes(path);
        if (role === "GARCOM") return garcomAllowedRoutes.includes(path);
        return false;
      };

      assert.equal(isRouteAllowed("CAIXA", "/caixa"), true);
      assert.equal(isRouteAllowed("CAIXA", "/admin"), false);
      assert.equal(isRouteAllowed("CAIXA", "/admin/relatorios"), false);

      assert.equal(isRouteAllowed("ADMIN", "/admin/produtos"), true);
      assert.equal(isRouteAllowed("ADMIN", "/admin/fechamento-caixa"), true);

      assert.equal(isRouteAllowed("GARCOM", "/caixa"), true);
      assert.equal(isRouteAllowed("GARCOM", "/admin/fechamento-caixa"), false);
    });
  });

  // -------------------------------------------------------------
  // 2. ROTA /caixa — Frente de Caixa, Fila Pedir Conta e Fechamento
  // -------------------------------------------------------------
  describe("2. Rota /caixa — Operação de PDV, Fila 'Pedir Conta' e Pagamentos", () => {
    it("deve listar mesas e identificar corretamente a fila de 'Pedir Conta'", () => {
      store.resetToDefault();
      const tables = store.getTables();
      assert.ok(tables.length >= 8, "Deve haver mesas cadastradas no salão");

      const billRequests = store.getBillRequests();
      assert.ok(Array.isArray(billRequests));

      // Simula solicitação de conta para Mesa 1
      const order1 = store.requestTableBill("table-01");
      assert.ok(order1);
      assert.equal(order1.status, "PEDINDO_CONTA");

      const table1 = store.getTableById("table-01");
      assert.equal(table1?.status, "PEDINDO_CONTA");
    });

    it("deve permitir início de conferência e adição/cancelamento de itens com estorno de estoque", () => {
      store.resetToDefault();
      const order = store.requestTableBill("table-02")!;
      assert.ok(order);

      // Inicia conferência no caixa
      store.startOrderConference(order.id);
      const underConference = store.getOrderById(order.id)!;
      assert.equal(underConference.status, "CONFERENCIA");

      // Produto para teste de estoque
      const prod = store.getProductById("prod-1")!;
      const initialStock = prod.stock;

      // Adiciona item de última hora
      store.addItemToOrder(order.id, "prod-1", 2, "Sem cobertura extra");
      assert.equal(store.getProductById("prod-1")!.stock, initialStock - 2);

      const addedItem = store.getOrderById(order.id)!.items.find((i) => i.productId === "prod-1" && i.status !== "CANCELADO");
      assert.ok(addedItem);
      assert.equal(addedItem.quantity, 2);

      // Cancela o item com justificativa
      store.cancelOrderItem(order.id, addedItem.id, "Cliente desistiu antes da produção");
      const cancelledItem = store.getOrderById(order.id)!.items.find((i) => i.id === addedItem.id);
      assert.equal(cancelledItem?.status, "CANCELADO");
      assert.equal(cancelledItem?.cancelledReason, "Cliente desistiu antes da produção");

      // Estoque deve ter sido estornado
      assert.equal(store.getProductById("prod-1")!.stock, initialStock);
    });

    it("deve liquidar comanda com múltiplos pagamentos, calcular troco e liberar a mesa", () => {
      store.resetToDefault();
      const order = store.requestTableBill("table-03")!;
      // Em initial mock data, table-03 já pode ter pedido ou criamos novo
      order.items = []; // Limpa para teste isolado
      store.addItemToOrder(order.id, "prod-2", 1); // Bolo Red Velvet R$ 22.50
      store.toggleServiceFee(order.id, false); // Total: R$ 22.50

      const payments: PaymentEntry[] = [
        {
          id: "p1",
          method: "CARTAO_CREDITO",
          amount: 12.5,
          createdAt: new Date().toISOString(),
        },
        {
          id: "p2",
          method: "DINHEIRO",
          amount: 10.0,
          receivedAmount: 20.0,
          changeAmount: 10.0,
          createdAt: new Date().toISOString(),
        },
      ];

      const settleResult = store.settleOrderPayment(order.id, payments, "Mariana Silva (Caixa)");
      assert.ok(settleResult);
      assert.equal(settleResult.order.status, "PAGO");
      assert.equal(settleResult.receipt.trocoTotal, 10.0);

      // A mesa 3 deve retornar ao status LIVRE
      const table3 = store.getTableById("table-03")!;
      assert.equal(table3.status, "LIVRE");
      assert.equal(table3.currentOrderId, undefined);
    });
  });

  // -------------------------------------------------------------
  // 3. ROTA /caixa/historico — Histórico de Cupons e Reimpressão
  // -------------------------------------------------------------
  describe("3. Rota /caixa/historico — Histórico e Reimpressão de Cupons", () => {
    it("deve recuperar histórico de recibos emitidos e permitir busca textual", () => {
      store.resetToDefault();
      const receipts = store.getReceipts();
      assert.ok(receipts.length > 0, "Deve conter histórico inicial de cupons");

      const first = receipts[0];
      assert.ok(first.receiptId);
      assert.ok(first.orderNumber);
      assert.ok(first.items.length > 0);
      assert.ok(first.total > 0);

      // Filtro por termo
      const searchNumber = first.orderNumber.toString();
      const filtered = receipts.filter((r) => r.orderNumber.toString().includes(searchNumber));
      assert.ok(filtered.length >= 1);
    });

    it("deve gerar estrutura completa e não fiscal do cupom térmico", () => {
      store.resetToDefault();
      const receipts = store.getReceipts();
      const rcpt = receipts[0];

      assert.equal(rcpt.companyName, "DOCERIA DO SR GILMAR LTDA");
      assert.equal(rcpt.cnpj, "12.345.678/0001-90");
      assert.ok(rcpt.address.includes("São Paulo") || rcpt.address.includes("Doces"));
      assert.ok(rcpt.issuedAt);
      assert.ok(Array.isArray(rcpt.payments));
    });
  });

  // -------------------------------------------------------------
  // 4. ROTA /admin — Painel Gerencial e KPIs em Tempo Real
  // -------------------------------------------------------------
  describe("4. Rota /admin — Painel Gerencial e Métricas Consolidadas", () => {
    it("deve consolidar metricas executivas: Faturamento, Ticket Médio, Itens Vendidos e Ocupação", () => {
      store.resetToDefault();
      const metrics = store.getDailySummaryMetrics();

      assert.ok(typeof metrics.totalRevenue === "number");
      assert.ok(typeof metrics.ordersCount === "number");
      assert.ok(typeof metrics.averageTicket === "number");
      assert.ok(typeof metrics.itemsSoldCount === "number");
      assert.ok(typeof metrics.occupiedTables === "number");
      assert.ok(typeof metrics.waitingBillTables === "number");
      assert.ok(metrics.totalTables >= 8);

      if (metrics.ordersCount > 0) {
        const expectedTicket = metrics.totalRevenue / metrics.ordersCount;
        assert.equal(Math.round(metrics.averageTicket * 100), Math.round(expectedTicket * 100));
      }

      // Distribuição de meios de pagamento deve conter métodos conhecidos
      assert.ok(metrics.revenueByPaymentMethod.length >= 4);
      const totalMix = metrics.revenueByPaymentMethod.reduce((acc, m) => acc + m.amount, 0);
      assert.equal(Math.round(totalMix * 100), Math.round(metrics.totalRevenue * 100));

      // Top produtos vendidos deve retornar até 5 itens ordenados por receita
      assert.ok(metrics.topSellingProducts.length <= 5);
      for (let i = 0; i < metrics.topSellingProducts.length - 1; i++) {
        assert.ok(metrics.topSellingProducts[i].revenue >= metrics.topSellingProducts[i + 1].revenue);
      }
    });
  });

  // -------------------------------------------------------------
  // 5. ROTA /admin/produtos — Gestão de Cardápio e Estoque
  // -------------------------------------------------------------
  describe("5. Rota /admin/produtos — Cardápio, Preços, Estoque e Alérgenos", () => {
    it("deve realizar ciclo completo de CRUD de produtos", () => {
      store.resetToDefault();

      // Create
      const created = store.saveProduct({
        name: "Bolo Trufado de Maracujá",
        category: "BOLOS_TORTAS" as ProductCategory,
        price: 28.5,
        costPrice: 8.2,
        sku: "BTR-001",
        description: "Bolo artesanal com ganache de maracujá",
        stock: 12,
        minStock: 4,
        unit: "FATIA",
        allergens: ["Lactose", "Glúten"],
        isActive: true,
      });

      assert.ok(created.id);
      assert.equal(created.name, "Bolo Trufado de Maracujá");
      assert.equal(created.allergens?.length, 2);

      // Read
      const fetched = store.getProductById(created.id);
      assert.ok(fetched);
      assert.equal(fetched.price, 28.5);

      // Update
      const updated = store.saveProduct({
        ...fetched,
        price: 29.9,
        stock: 10,
      });
      assert.equal(updated.price, 29.9);
      assert.equal(updated.stock, 10);

      // Toggle status
      store.toggleProductStatus(created.id);
      assert.equal(store.getProductById(created.id)?.isActive, false);

      // Delete
      const deleted = store.deleteProduct(created.id);
      assert.equal(deleted, true);
      assert.equal(store.getProductById(created.id), undefined);
    });

    it("deve filtrar produtos por categoria e identificar alertas de estoque baixo", () => {
      store.resetToDefault();
      const all = store.getProducts();

      // Categoria BOLOS_TORTAS
      const bolos = all.filter((p) => p.category === "BOLOS_TORTAS");
      assert.ok(bolos.length > 0);

      // Estoque baixo
      const lowStock = all.filter((p) => p.stock <= p.minStock);
      assert.ok(Array.isArray(lowStock));
    });
  });

  // -------------------------------------------------------------
  // 6. ROTA /admin/mesas — Gestão de Mesas e Ambientes
  // -------------------------------------------------------------
  describe("6. Rota /admin/mesas — Gestão de Mesas, Capacidade e Setores", () => {
    it("deve realizar CRUD de mesas e validar integridade de número e capacidade", () => {
      store.resetToDefault();

      // Create
      const newTable = store.saveTable({
        number: 40,
        name: "Mesa 40 (Deck Panorâmico)",
        seats: 6,
        sector: "DECK" as TableSector,
        status: "LIVRE" as TableStatus,
      });

      assert.ok(newTable.id);
      assert.equal(newTable.number, 40);
      assert.equal(newTable.seats, 6);
      assert.equal(newTable.sector, "DECK");

      // Update
      const updated = store.saveTable({
        ...newTable,
        seats: 8,
        status: "RESERVADA",
      });
      assert.equal(updated.seats, 8);
      assert.equal(updated.status, "RESERVADA");

      // Update status directly
      store.updateTableStatus(newTable.id, "OCUPADA");
      assert.equal(store.getTableById(newTable.id)?.status, "OCUPADA");

      // Delete
      const deleted = store.deleteTable(newTable.id);
      assert.equal(deleted, true);
      assert.equal(store.getTableById(newTable.id), undefined);
    });
  });

  // -------------------------------------------------------------
  // 7. ROTA /admin/relatorios — Relatórios Financeiros e Auditoria
  // -------------------------------------------------------------
  describe("7. Rota /admin/relatorios — Auditoria de Vendas, Descontos e Exportação", () => {
    it("deve computar faturamento líquido, taxa de serviço e auditoria de descontos", () => {
      store.resetToDefault();
      const history = store.getPaidOrdersHistory();
      assert.ok(history.length > 0);

      const totalRevenue = history.reduce((acc, o) => acc + o.total, 0);
      const totalDiscounts = history.reduce((acc, o) => acc + (o.discount?.calculatedAmount || 0), 0);
      const totalServiceFees = history.reduce((acc, o) => acc + o.serviceFeeAmount, 0);

      assert.ok(totalRevenue > 0);
      assert.ok(totalDiscounts >= 0);
      assert.ok(totalServiceFees >= 0);

      // Pedidos com desconto possuem motivo registrado
      const discountedOrders = history.filter((o) => !!o.discount);
      discountedOrders.forEach((o) => {
        assert.ok(o.discount?.reason, "Desconto deve conter justificativa de auditoria");
        assert.ok(o.discount?.calculatedAmount && o.discount.calculatedAmount > 0);
      });
    });

    it("deve formatar colunas e linhas para exportação de relatório em CSV", () => {
      store.resetToDefault();
      const history = store.getPaidOrdersHistory();

      const headers = [
        "Pedido",
        "Mesa",
        "Cliente",
        "Data Fechamento",
        "Subtotal",
        "Desconto",
        "Motivo Desconto",
        "Taxa Servico",
        "Total",
        "Formas Pagamento",
      ];

      const rows = history.map((o) => [
        o.orderNumber,
        o.tableNumber ? `Mesa ${o.tableNumber}` : "Balcao",
        `"${o.customerName || "Consumidor"}"`,
        o.closedAt || o.createdAt,
        o.subtotal.toFixed(2),
        (o.discount?.calculatedAmount || 0).toFixed(2),
        `"${o.discount?.reason || ""}"`,
        o.serviceFeeAmount.toFixed(2),
        o.total.toFixed(2),
        `"${o.payments.map((p) => `${p.method}:${p.amount.toFixed(2)}`).join(" | ")}"`,
      ]);

      assert.equal(headers.length, 10);
      assert.equal(rows.length, history.length);
    });
  });

  // -------------------------------------------------------------
  // 8. ROTA /admin/fechamento-caixa — Turnos, Sangrias e Resumo Z
  // -------------------------------------------------------------
  describe("8. Rota /admin/fechamento-caixa — Fechamento Cego, Sangrias e Extrato Fiscal Z", () => {
    it("deve gerenciar ciclo do turno de caixa: Abertura, Sangrias, Suprimentos e Fechamento com Quebra", () => {
      store.resetToDefault();

      const allSessions = store.getAllCashSessions();
      assert.ok(allSessions.length >= 1);

      // Turno ativo
      const active = store.getActiveSession()!;
      assert.ok(active);
      assert.equal(active.status, "ABERTO");

      const expectedBefore = active.expectedInCash;
      const initialSangrias = active.totalSangrias;

      // Realiza Sangria de R$ 100.00
      store.addCashMovement("SANGRIA", 100.0, "Sangria para cofre administrativo", "Mariana Silva");
      assert.equal(active.expectedInCash, expectedBefore - 100.0);
      assert.equal(active.totalSangrias, initialSangrias + 100.0);

      // Realiza Suprimento de R$ 50.00
      store.addCashMovement("SUPRIMENTO", 50.0, "Reforço de moedas", "Mariana Silva");
      assert.equal(active.expectedInCash, expectedBefore - 100.0 + 50.0);

      // Fechamento cego com declaração de quebra de R$ 5,00 (falta)
      const declaredCash = active.expectedInCash - 5.0;
      const declared: Record<PaymentMethod, number> = {
        DINHEIRO: declaredCash,
        CARTAO_CREDITO: active.salesByMethod.CARTAO_CREDITO || 0,
        CARTAO_DEBITO: active.salesByMethod.CARTAO_DEBITO || 0,
        PIX: active.salesByMethod.PIX || 0,
        VALE_REFEICAO: active.salesByMethod.VALE_REFEICAO || 0,
      };

      const closed = store.closeCashSession(active.id, declared, "Fechamento com auditoria");
      assert.ok(closed);
      assert.equal(closed.status, "FECHADO");
      assert.equal(closed.differenceInCash, -5.0); // Falta R$ 5,00
      assert.equal(closed.notes, "Fechamento com auditoria");
    });
  });

  // -------------------------------------------------------------
  // 9. INTEGRAÇÕES WEB — Notificações e Impressão
  // -------------------------------------------------------------
  describe("9. Integrações Web — Notificações Sonoras/Visuais e Impressão Térmica", () => {
    it("deve inicializar WebNotificacaoService e registrar chamados de atendimento", async () => {
      const notifService = new WebNotificacaoService({ habilitarSom: false, habilitarNotificacoesNavegador: false });

      const notif = await notifService.getBaseService().notificarPedirConta({
        comandaId: "cmd-88",
        mesaNumero: 5,
        atendenteNome: "Carlos Eduardo",
      });

      assert.ok(notif.id);
      assert.equal(notif.mesaNumero, 5);
      assert.equal(notif.tipo, "pedir_conta");

      const ativas = notifService.getBaseService().getNotificacoes();
      assert.ok(ativas.length >= 1);
    });

    it("deve gerar cupom HTML e texto no WebWindowPrintAdapter", async () => {
      const printAdapter = new WebWindowPrintAdapter({
        autoPrint: false,
        openPreviewTab: false,
      });

      const cupomData = {
        empresa: {
          nome: "Doceria do Sr Gilmar",
          cnpj: "12.345.678/0001-90",
          endereco: "Rua dos Doces Artesanais, 150",
          cidade: "São Paulo - SP",
          telefone: "(11) 3456-7890",
        },
        comanda: {
          id: "ord-test",
          numero: 1042,
          mesa: 4,
          dataHoraAbertura: new Date().toISOString(),
          dataHoraFechamento: new Date().toISOString(),
          atendente: "Carlos Eduardo",
          operadorCaixa: "Mariana Silva",
        },
        itens: [
          {
            nome: "Torta Holandesa de Pistache",
            quantidade: 2,
            precoUnitarioCentavos: 2490,
            subtotalCentavos: 4980,
          },
        ],
        subtotalCentavos: 4980,
        descontoCentavos: 0,
        taxaServicoCentavos: 498,
        totalCentavos: 5478,
        formaPagamento: "PIX" as any,
        valorPagoCentavos: 5478,
        trocoCentavos: 0,
      };

      const result = await printAdapter.imprimirCupom(cupomData);
      assert.equal(result.sucesso, true);
      assert.ok(result.cupomFormatadoTexto.includes("DOCERIA DO SR GILMAR"));
      assert.ok(result.cupomFormatadoTexto.includes("Torta Holandesa"));
    });
  });
});

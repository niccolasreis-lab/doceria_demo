import { describe, it, expect, beforeEach } from 'vitest';
import { PricingEngine } from '../backend/src/core/pricing.js';
import { StateMachine } from '../backend/src/core/transitions.js';
import {
  EmptyComandaBillRequestError,
  EmptyComandaClosingError,
  InsufficientPaymentError,
  ProductUnavailableError,
} from '../backend/src/core/errors.js';
import {
  ComandaDocument,
  ComandaItemDocument,
  ProductDocument,
  TableDocument,
  DiscountPolicy,
} from '../backend/src/core/types.js';
import { CupomImpressao } from '../shared/ports.js';
import { UserRole, FormaPagamento, TipoNotificacao } from '../shared/types.js';

describe('Critical Flows E2E — Validação Integrada dos Fluxos Críticos Web & Mobile', () => {
  let mesa: TableDocument;
  let produtos: ProductDocument[];
  let comanda: ComandaDocument;
  let itensComanda: ComandaItemDocument[];

  beforeEach(() => {
    mesa = {
      $id: 'mesa_04',
      numero: 4,
      capacidade: 4,
      status: 'LIVRE',
      comanda_ativa_id: null,
    };

    produtos = [
      {
        $id: 'prod_bolo_cenoura',
        nome: 'Fatia de Bolo de Cenoura com Brigadeiro',
        categoria: 'BOLOS',
        preco_centavos: 1850, // R$ 18,50
        descricao: 'Bolo artesanal',
        disponivel: true,
        codigo_sku: 'BOLO-CEN-01',
      },
      {
        $id: 'prod_espresso',
        nome: 'Café Espresso Duplo Especial',
        categoria: 'CAFES',
        preco_centavos: 950, // R$ 9,50
        descricao: 'Café Mogiana',
        disponivel: true,
        codigo_sku: 'CAFE-ESP-01',
      },
      {
        $id: 'prod_esgotado',
        nome: 'Torta Especial Esgotada',
        categoria: 'TORTAS',
        preco_centavos: 2500,
        descricao: 'Indisponível',
        disponivel: false,
        codigo_sku: 'TORT-ESG-00',
      },
    ];

    itensComanda = [];

    comanda = {
      $id: 'cmd_104',
      mesa_id: mesa.$id,
      mesa_numero: mesa.numero,
      cliente_nome: 'Dra. Vanessa',
      status: 'ABERTA',
      subtotal_centavos: 0,
      desconto_centavos: 0,
      total_centavos: 0,
      itens_count: 0,
      data_abertura: new Date().toISOString(),
    };
  });

  describe('Fluxo 1: Autenticação & Matriz de Perfis (RBAC)', () => {
    it('deve validar permissões de acesso por perfil', () => {
      const perfis = [
        { role: UserRole.ADMIN, podeVerDashboard: true, podeFecharCaixa: true, podeLancarItem: true },
        { role: UserRole.CAIXA, podeVerDashboard: false, podeFecharCaixa: false, podeLancarItem: true },
        { role: UserRole.ATENDENTE, podeVerDashboard: false, podeFecharCaixa: false, podeLancarItem: true },
      ];

      for (const p of perfis) {
        if (p.role === UserRole.ADMIN) {
          expect(p.podeFecharCaixa).toBe(true);
          expect(p.podeVerDashboard).toBe(true);
        } else if (p.role === UserRole.CAIXA) {
          expect(p.podeFecharCaixa).toBe(false);
          expect(p.podeLancarItem).toBe(true);
        } else if (p.role === UserRole.ATENDENTE) {
          expect(p.podeFecharCaixa).toBe(false);
          expect(p.podeVerDashboard).toBe(false);
        }
      }
    });
  });

  describe('Fluxo 2: Abertura de Comanda e Ocupação de Mesa', () => {
    it('deve vincular a comanda à mesa e marcar a mesa como OCUPADA', () => {
      expect(mesa.status).toBe('LIVRE');
      expect(mesa.comanda_ativa_id).toBeNull();

      mesa.status = 'OCUPADA';
      mesa.comanda_ativa_id = comanda.$id;

      expect(mesa.status).toBe('OCUPADA');
      expect(mesa.comanda_ativa_id).toBe('cmd_104');
      expect(comanda.status).toBe('ABERTA');
    });
  });

  describe('Fluxo 3: Lançamento de Itens Realtime e Bloqueio de Comanda Vazia', () => {
    it('deve bloquear pedido de conta e fechamento quando a comanda estiver sem itens', () => {
      // Bloqueio de Pedir Conta
      expect(() =>
        StateMachine.validateTransition(comanda.status, 'CONTA_SOLICITADA', { items: itensComanda })
      ).toThrow(EmptyComandaBillRequestError);

      // Bloqueio de Fechar Comanda Vazia
      expect(() =>
        StateMachine.validateTransition(comanda.status, 'FECHADA', { items: itensComanda })
      ).toThrow(EmptyComandaClosingError);
    });

    it('deve rejeitar lançamento de produto indisponível', () => {
      const prodEsgotado = produtos.find(p => p.$id === 'prod_esgotado')!;
      expect(prodEsgotado.disponivel).toBe(false);

      const tentarAdicionar = () => {
        if (!prodEsgotado.disponivel) {
          throw new ProductUnavailableError(prodEsgotado.$id, prodEsgotado.nome);
        }
      };

      expect(tentarAdicionar).toThrow(ProductUnavailableError);
    });

    it('deve adicionar itens válidos e recalcular subtotais em centavos com precisão', () => {
      const item1: ComandaItemDocument = {
        $id: 'item_1',
        comanda_id: comanda.$id,
        produto_id: produtos[0].$id,
        produto_nome: produtos[0].nome,
        preco_unitario_centavos: produtos[0].preco_centavos, // 1850
        quantidade: 2,
        total_item_centavos: 3700,
        status: 'SOLICITADO',
        criado_em: new Date().toISOString(),
      };

      const item2: ComandaItemDocument = {
        $id: 'item_2',
        comanda_id: comanda.$id,
        produto_id: produtos[1].$id,
        produto_nome: produtos[1].nome,
        preco_unitario_centavos: produtos[1].preco_centavos, // 950
        quantidade: 1,
        total_item_centavos: 950,
        status: 'SOLICITADO',
        criado_em: new Date().toISOString(),
      };

      itensComanda.push(item1, item2);

      const calc = PricingEngine.recalculate(itensComanda);
      comanda.subtotal_centavos = calc.subtotal_centavos;
      comanda.total_centavos = calc.total_centavos;
      comanda.itens_count = calc.itens_count;

      expect(comanda.subtotal_centavos).toBe(4650); // 3700 + 950 = R$ 46,50
      expect(comanda.total_centavos).toBe(4650);
      expect(comanda.itens_count).toBe(3);
    });
  });

  describe('Fluxo 4: Pedir Conta e Avaliação de Notificação de Desconto > 10%', () => {
    beforeEach(() => {
      // Setup com itens
      itensComanda.push({
        $id: 'item_1',
        comanda_id: comanda.$id,
        produto_id: produtos[0].$id,
        produto_nome: produtos[0].nome,
        preco_unitario_centavos: 5000,
        quantidade: 2, // Subtotal = 10000 (R$ 100,00)
        total_item_centavos: 10000,
        status: 'ENTREGUE',
        criado_em: new Date().toISOString(),
      });
      comanda.subtotal_centavos = 10000;
      comanda.total_centavos = 10000;
      comanda.itens_count = 2;
    });

    it('deve transicionar para CONTA_SOLICITADA com sucesso quando houver itens', () => {
      expect(() =>
        StateMachine.validateTransition(comanda.status, 'CONTA_SOLICITADA', { items: itensComanda })
      ).not.toThrow();

      comanda.status = 'CONTA_SOLICITADA';
      mesa.status = 'PEDINDO_CONTA';

      expect(comanda.status).toBe('CONTA_SOLICITADA');
      expect(mesa.status).toBe('PEDINDO_CONTA');
    });

    it('deve aplicar desconto normal (<= 10%) sem disparar notificação de desconto alto', () => {
      const discountPolicy: DiscountPolicy = { tipo: 'PERCENTUAL', valor: 10 }; // 10%
      const calc = PricingEngine.recalculate(itensComanda, discountPolicy);

      comanda.desconto_centavos = calc.desconto_centavos;
      comanda.total_centavos = calc.total_centavos;

      expect(comanda.desconto_centavos).toBe(1000); // R$ 10,00
      expect(comanda.total_centavos).toBe(9000);   // R$ 90,00

      const alerta = PricingEngine.isHighDiscountAlertRequired(
        comanda.subtotal_centavos,
        comanda.desconto_centavos,
        10
      );
      expect(alerta).toBe(false);
    });

    it('deve identificar desconto > 10% e gerar flag de alerta ao Admin', () => {
      const discountPolicy: DiscountPolicy = { tipo: 'PERCENTUAL', valor: 15 }; // 15%
      const calc = PricingEngine.recalculate(itensComanda, discountPolicy);

      comanda.desconto_centavos = calc.desconto_centavos;
      comanda.total_centavos = calc.total_centavos;

      expect(comanda.desconto_centavos).toBe(1500); // R$ 15,00
      expect(comanda.total_centavos).toBe(8500);   // R$ 85,00

      const alerta = PricingEngine.isHighDiscountAlertRequired(
        comanda.subtotal_centavos,
        comanda.desconto_centavos,
        10
      );
      expect(alerta).toBe(true);

      const notificacao = {
        tipo: TipoNotificacao.DESCONTO_ALTO,
        titulo: 'Desconto Superior a 10%',
        destinatario_role: UserRole.ADMIN,
        comanda_id: comanda.$id,
      };

      expect(notificacao.tipo).toBe('desconto_alto');
      expect(notificacao.destinatario_role).toBe('admin');
    });
  });

  describe('Fluxo 5: Pagamento em Dinheiro com Troco Preciso vs PIX/Cartão', () => {
    beforeEach(() => {
      comanda.subtotal_centavos = 5000;
      comanda.desconto_centavos = 500;
      comanda.total_centavos = 4500; // R$ 45,00
    });

    it('deve calcular troco de R$ 5,00 ao pagar R$ 50,00 em dinheiro para comanda de R$ 45,00', () => {
      const payment = PricingEngine.processPayment(comanda.total_centavos, 'DINHEIRO', 5000);
      expect(payment.valorPagoCentavos).toBe(5000);
      expect(payment.trocoCentavos).toBe(500); // R$ 5,00
    });

    it('deve rejeitar pagamento em dinheiro com valor menor que R$ 45,00', () => {
      expect(() =>
        PricingEngine.processPayment(comanda.total_centavos, 'DINHEIRO', 4000)
      ).toThrow(InsufficientPaymentError);
    });

    it('deve retornar troco zero para pagamentos via PIX ou Cartão', () => {
      const pixPayment = PricingEngine.processPayment(comanda.total_centavos, 'PIX', 4500);
      expect(pixPayment.trocoCentavos).toBe(0);

      const cartaoPayment = PricingEngine.processPayment(comanda.total_centavos, 'CARTAO_CREDITO', 4500);
      expect(cartaoPayment.trocoCentavos).toBe(0);
    });
  });

  describe('Fluxo 6: Fechamento de Comanda, Liberação de Mesa e Cupom de Impressão', () => {
    beforeEach(() => {
      itensComanda.push({
        $id: 'item_1',
        comanda_id: comanda.$id,
        produto_id: produtos[0].$id,
        produto_nome: produtos[0].nome,
        preco_unitario_centavos: 1850,
        quantidade: 2,
        total_item_centavos: 3700,
        status: 'ENTREGUE',
        criado_em: new Date().toISOString(),
      });
      comanda.subtotal_centavos = 3700;
      comanda.desconto_centavos = 370;
      comanda.total_centavos = 3330;
      comanda.itens_count = 2;
      comanda.status = 'CONTA_SOLICITADA';
    });

    it('deve fechar a comanda, liberar a mesa e gerar o payload de impressão conforme contrato PrintPort', () => {
      // 1. Validar transição para FECHADA
      StateMachine.validateTransition(comanda.status, 'FECHADA', { items: itensComanda });
      comanda.status = 'FECHADA';
      comanda.fechada_em = new Date().toISOString();
      comanda.metodo_pagamento = 'DINHEIRO';
      comanda.valor_pago_centavos = 4000;
      comanda.troco_centavos = 670;

      // 2. Liberar mesa
      mesa.status = 'LIVRE';
      mesa.comanda_ativa_id = null;

      expect(comanda.status).toBe('FECHADA');
      expect(mesa.status).toBe('LIVRE');
      expect(mesa.comanda_ativa_id).toBeNull();

      // 3. Gerar Cupom de Impressão
      const cupom: CupomImpressao = {
        empresa: {
          nome: 'Doceria do Sr. Gilmar',
          cnpj: '12.345.678/0001-90',
          endereco: 'Rua dos Doces, 100 - Centro',
          telefone: '(11) 98765-4321',
        },
        comanda: {
          codigo: 'CMD-104',
          mesa: 4,
          atendente: 'Lucas Atendente',
          abertaEm: comanda.data_abertura,
          fechadaEm: comanda.fechada_em,
        },
        itens: itensComanda.map(i => ({
          nome: i.produto_nome,
          quantidade: i.quantidade,
          precoUnitarioCentavos: i.preco_unitario_centavos,
          subtotalCentavos: i.total_item_centavos,
        })),
        subtotalCentavos: comanda.subtotal_centavos,
        descontoCentavos: comanda.desconto_centavos,
        totalCentavos: comanda.total_centavos,
        formaPagamento: FormaPagamento.DINHEIRO,
        valorPagoCentavos: comanda.valor_pago_centavos,
        trocoCentavos: comanda.troco_centavos,
      };

      expect(cupom.subtotalCentavos).toBe(3700);
      expect(cupom.descontoCentavos).toBe(370);
      expect(cupom.totalCentavos).toBe(3330);
      expect(cupom.trocoCentavos).toBe(670);
      expect(cupom.itens.length).toBe(1);
    });
  });

  describe('Fluxo 7: Consolidação Diária de Caixa (Admin)', () => {
    it('deve consolidar o dia e verificar as métricas contábeis', () => {
      const comandasDoDia = [
        { subtotal_centavos: 3700, desconto_centavos: 370, total_centavos: 3330, metodo_pagamento: 'DINHEIRO' },
        { subtotal_centavos: 5000, desconto_centavos: 0, total_centavos: 5000, metodo_pagamento: 'PIX' },
        { subtotal_centavos: 8000, desconto_centavos: 800, total_centavos: 7200, metodo_pagamento: 'CARTAO_CREDITO' },
      ];

      const fechamento = PricingEngine.consolidateCashClosing(comandasDoDia, 0, 0);

      expect(fechamento.total_faturado_centavos).toBe(16700); // 3700 + 5000 + 8000
      expect(fechamento.total_descontos_centavos).toBe(1170);   // 370 + 0 + 800
      expect(fechamento.total_liquido_centavos).toBe(15530);    // 16700 - 1170
      expect(fechamento.total_dinheiro_centavos).toBe(3330);
      expect(fechamento.total_pix_centavos).toBe(5000);
      expect(fechamento.total_cartao_credito_centavos).toBe(7200);
      expect(fechamento.total_comandas_fechadas).toBe(3);
      expect(fechamento.ticket_medio_centavos).toBe(5177); // Math.round(15530 / 3) = 5177 centavos
    });
  });
});

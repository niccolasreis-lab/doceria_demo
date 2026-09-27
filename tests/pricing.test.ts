import { describe, it, expect } from 'vitest';
import { PricingEngine } from '../backend/src/core/pricing.js';
import { InvalidDiscountError, InsufficientPaymentError } from '../backend/src/core/errors.js';
import { ComandaItemDocument, DiscountPolicy } from '../backend/src/core/types.js';

describe('PricingEngine — Cálculo de Totais em Centavos e Regras Financeiras', () => {
  describe('1. Cálculo de Totais e Subtotais em Centavos Inteiros', () => {
    it('deve calcular o subtotal somando produtos com suas quantidades em centavos', () => {
      const items: Pick<ComandaItemDocument, 'quantidade' | 'preco_unitario_centavos' | 'status'>[] = [
        { quantidade: 2, preco_unitario_centavos: 1850, status: 'SOLICITADO' }, // 3700 (2x Bolo Cenoura)
        { quantidade: 3, preco_unitario_centavos: 650, status: 'ENTREGUE' },   // 1950 (3x Brigadeiro)
        { quantidade: 1, preco_unitario_centavos: 950, status: 'EM_PREPARO' }, // 950 (1x Espresso)
      ];

      const subtotal = PricingEngine.calculateSubtotal(items);
      expect(subtotal).toBe(6600); // R$ 66,00 em centavos inteiros
      expect(Number.isInteger(subtotal)).toBe(true);
    });

    it('deve ignorar itens com status CANCELADO no cálculo do subtotal', () => {
      const items: Pick<ComandaItemDocument, 'quantidade' | 'preco_unitario_centavos' | 'status'>[] = [
        { quantidade: 1, preco_unitario_centavos: 2400, status: 'SOLICITADO' }, // 2400
        { quantidade: 2, preco_unitario_centavos: 2100, status: 'CANCELADO' },  // 4200 (deve ignorar)
        { quantidade: 1, preco_unitario_centavos: 700, status: 'ENTREGUE' },    // 700
      ];

      const subtotal = PricingEngine.calculateSubtotal(items);
      expect(subtotal).toBe(3100); // 2400 + 700
    });

    it('deve retornar 0 quando a lista de itens estiver vazia ou todos cancelados', () => {
      expect(PricingEngine.calculateSubtotal([])).toBe(0);

      const canceledOnly: Pick<ComandaItemDocument, 'quantidade' | 'preco_unitario_centavos' | 'status'>[] = [
        { quantidade: 5, preco_unitario_centavos: 1500, status: 'CANCELADO' },
      ];
      expect(PricingEngine.calculateSubtotal(canceledOnly)).toBe(0);
    });

    it('deve evitar imprecisões de ponto flutuante acumulando estritamente em inteiros', () => {
      // 3 x R$ 19,99 = 5997 centavos (R$ 59,97)
      const items: Pick<ComandaItemDocument, 'quantidade' | 'preco_unitario_centavos' | 'status'>[] = [
        { quantidade: 3, preco_unitario_centavos: 1999, status: 'SOLICITADO' },
      ];

      const subtotal = PricingEngine.calculateSubtotal(items);
      expect(subtotal).toBe(5997);
    });

    it('deve contar corretamente apenas a quantidade de itens ativos', () => {
      const items: Pick<ComandaItemDocument, 'quantidade' | 'status'>[] = [
        { quantidade: 2, status: 'SOLICITADO' },
        { quantidade: 3, status: 'CANCELADO' },
        { quantidade: 4, status: 'ENTREGUE' },
      ];

      expect(PricingEngine.countActiveItems(items)).toBe(6);
    });

    it('deve recalcular comanda completa retornando subtotal, desconto, total e itens_count', () => {
      const items: Pick<ComandaItemDocument, 'quantidade' | 'preco_unitario_centavos' | 'status'>[] = [
        { quantidade: 2, preco_unitario_centavos: 2000, status: 'SOLICITADO' }, // 4000
        { quantidade: 1, preco_unitario_centavos: 1000, status: 'ENTREGUE' },   // 1000
      ];

      const result = PricingEngine.recalculate(items, null);
      expect(result).toEqual({
        subtotal_centavos: 5000,
        desconto_centavos: 0,
        total_centavos: 5000,
        itens_count: 3,
      });
    });
  });

  describe('2. Cálculo de Descontos e Limites', () => {
    it('deve calcular desconto percentual arredondando para o centavo mais próximo', () => {
      const subtotal = 10000; // R$ 100,00
      const policy: DiscountPolicy = { tipo: 'PERCENTUAL', valor: 15 }; // 15%

      const desconto = PricingEngine.calculateDiscount(subtotal, policy);
      expect(desconto).toBe(1500); // R$ 15,00
    });

    it('deve arredondar centavos fracionários em desconto percentual com precisão', () => {
      const subtotal = 1999; // R$ 19,99
      const policy: DiscountPolicy = { tipo: 'PERCENTUAL', valor: 10 }; // 10% = 199.9 -> 200

      const desconto = PricingEngine.calculateDiscount(subtotal, policy);
      expect(desconto).toBe(200);
    });

    it('deve calcular desconto de valor fixo em centavos', () => {
      const subtotal = 5000; // R$ 50,00
      const policy: DiscountPolicy = { tipo: 'VALOR_FIXO', valor: 850 }; // R$ 8,50

      const desconto = PricingEngine.calculateDiscount(subtotal, policy);
      expect(desconto).toBe(850);
    });

    it('deve limitar o desconto ao valor do subtotal se o desconto for superior', () => {
      const subtotal = 3000; // R$ 30,00
      const policy: DiscountPolicy = { tipo: 'VALOR_FIXO', valor: 5000 }; // R$ 50,00

      const desconto = PricingEngine.calculateDiscount(subtotal, policy);
      expect(desconto).toBe(3000); // Limitado a R$ 30,00, nunca negativo
    });

    it('deve lançar InvalidDiscountError se o percentual for superior a 100%', () => {
      const subtotal = 5000;
      const policy: DiscountPolicy = { tipo: 'PERCENTUAL', valor: 101 };

      expect(() => PricingEngine.calculateDiscount(subtotal, policy)).toThrow(InvalidDiscountError);
    });

    it('deve lançar InvalidDiscountError se o valor do desconto for negativo', () => {
      const subtotal = 5000;
      const policyPercentual: DiscountPolicy = { tipo: 'PERCENTUAL', valor: -5 };
      const policyFixo: DiscountPolicy = { tipo: 'VALOR_FIXO', valor: -100 };

      expect(() => PricingEngine.calculateDiscount(subtotal, policyPercentual)).toThrow(InvalidDiscountError);
      expect(() => PricingEngine.calculateDiscount(subtotal, policyFixo)).toThrow(InvalidDiscountError);
    });

    it('deve retornar 0 quando a política for nula/indefinida ou subtotal for 0', () => {
      expect(PricingEngine.calculateDiscount(5000, null)).toBe(0);
      expect(PricingEngine.calculateDiscount(5000, undefined)).toBe(0);
      expect(PricingEngine.calculateDiscount(0, { tipo: 'PERCENTUAL', valor: 10 })).toBe(0);
    });
  });

  describe('3. Validação de Pagamento e Cálculo de Troco', () => {
    it('deve calcular troco corretamente para pagamento em DINHEIRO', () => {
      const totalDevido = 3550; // R$ 35,50
      const valorPago = 5000;   // R$ 50,00

      const result = PricingEngine.processPayment(totalDevido, 'DINHEIRO', valorPago);
      expect(result.valorPagoCentavos).toBe(5000);
      expect(result.trocoCentavos).toBe(1450); // R$ 14,50 de troco
    });

    it('deve retornar troco zero para pagamento em DINHEIRO com valor exato', () => {
      const totalDevido = 2500;
      const valorPago = 2500;

      const result = PricingEngine.processPayment(totalDevido, 'DINHEIRO', valorPago);
      expect(result.trocoCentavos).toBe(0);
      expect(result.valorPagoCentavos).toBe(2500);
    });

    it('deve lançar InsufficientPaymentError quando o valor pago for inferior ao total devido', () => {
      const totalDevido = 5000;
      const valorPago = 4500;

      expect(() => PricingEngine.processPayment(totalDevido, 'DINHEIRO', valorPago)).toThrow(
        InsufficientPaymentError
      );
    });

    it('não deve gerar troco para pagamentos em PIX, CARTAO_CREDITO ou CARTAO_DEBITO', () => {
      const totalDevido = 4200;

      const pixResult = PricingEngine.processPayment(totalDevido, 'PIX', 5000);
      expect(pixResult.trocoCentavos).toBe(0);

      const debitoResult = PricingEngine.processPayment(totalDevido, 'CARTAO_DEBITO', 5000);
      expect(debitoResult.trocoCentavos).toBe(0);

      const creditoResult = PricingEngine.processPayment(totalDevido, 'CARTAO_CREDITO', 5000);
      expect(creditoResult.trocoCentavos).toBe(0);
    });

    it('deve assumir o valor exato quando o valorPagoCentavos for omitido', () => {
      const totalDevido = 2800;
      const result = PricingEngine.processPayment(totalDevido, 'PIX');

      expect(result.valorPagoCentavos).toBe(2800);
      expect(result.trocoCentavos).toBe(0);
    });

    it('deve lidar com total zero sem lançar erro', () => {
      const result = PricingEngine.processPayment(0, 'DINHEIRO', 0);
      expect(result.valorPagoCentavos).toBe(0);
      expect(result.trocoCentavos).toBe(0);
    });
  });

  describe('4. Notificação de Desconto > 10% (Regra Crítica)', () => {
    it('NÃO deve exigir alerta quando o desconto for exatamente 10% do subtotal', () => {
      const subtotal = 10000; // R$ 100,00
      const desconto10Porcento = 1000; // R$ 10,00 (exatamente 10%)

      const alerta = PricingEngine.isHighDiscountAlertRequired(subtotal, desconto10Porcento);
      expect(alerta).toBe(false);
    });

    it('NÃO deve exigir alerta quando o desconto for inferior a 10%', () => {
      const subtotal = 10000;
      const desconto5Porcento = 500;

      expect(PricingEngine.isHighDiscountAlertRequired(subtotal, desconto5Porcento)).toBe(false);
      expect(PricingEngine.isHighDiscountAlertRequired(subtotal, 999)).toBe(false);
    });

    it('DEVE exigir alerta quando o desconto for estritamente maior que 10%', () => {
      const subtotal = 10000; // R$ 100,00
      const desconto1001 = 1001; // R$ 10,01 (> 10%)
      const desconto15Porcento = 1500; // 15%
      const desconto50Porcento = 5000; // 50%

      expect(PricingEngine.isHighDiscountAlertRequired(subtotal, desconto1001)).toBe(true);
      expect(PricingEngine.isHighDiscountAlertRequired(subtotal, desconto15Porcento)).toBe(true);
      expect(PricingEngine.isHighDiscountAlertRequired(subtotal, desconto50Porcento)).toBe(true);
    });

    it('NÃO deve exigir alerta quando o desconto ou subtotal for zero', () => {
      expect(PricingEngine.isHighDiscountAlertRequired(10000, 0)).toBe(false);
      expect(PricingEngine.isHighDiscountAlertRequired(0, 500)).toBe(false);
      expect(PricingEngine.isHighDiscountAlertRequired(0, 0)).toBe(false);
    });
  });

  describe('5. Formatação Monetária BRL', () => {
    it('deve formatar centavos corretamente para o padrão monetário BRL', () => {
      const formatted = PricingEngine.formatBRL(1850);
      expect(formatted).toContain('18,50');
      expect(formatted).toContain('R$');
    });
  });
});

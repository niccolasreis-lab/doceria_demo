import { describe, it, expect } from 'vitest';
import { PricingEngine } from '../src/core/pricing.js';
import { InvalidDiscountError, InsufficientPaymentError } from '../src/core/errors.js';
import { ComandaItemDocument } from '../src/core/types.js';

describe('PricingEngine - Regras de Cálculo e Descontos', () => {
  it('deve calcular o subtotal somando os itens ativos corretamente em centavos', () => {
    const items: Pick<ComandaItemDocument, 'quantidade' | 'preco_unitario_centavos' | 'status'>[] = [
      { quantidade: 2, preco_unitario_centavos: 1850, status: 'SOLICITADO' }, // 3700 (R$ 37,00)
      { quantidade: 1, preco_unitario_centavos: 950, status: 'ENTREGUE' },   // 950 (R$ 9,50)
      { quantidade: 3, preco_unitario_centavos: 650, status: 'CANCELADO' },  // Ignorado
    ];

    const subtotal = PricingEngine.calculateSubtotal(items);
    expect(subtotal).toBe(4650); // R$ 46,50
  });

  it('deve calcular desconto percentual com arredondamento preciso', () => {
    const subtotal = 4650; // R$ 46,50
    // 10% de 4650 = 465
    const desc10 = PricingEngine.calculateDiscount(subtotal, { tipo: 'PERCENTUAL', valor: 10 });
    expect(desc10).toBe(465);

    // 15% de 4650 = 697.5 -> round to 698
    const desc15 = PricingEngine.calculateDiscount(subtotal, { tipo: 'PERCENTUAL', valor: 15 });
    expect(desc15).toBe(698);
  });

  it('deve calcular desconto de valor fixo em centavos', () => {
    const subtotal = 5000;
    const descFixo = PricingEngine.calculateDiscount(subtotal, { tipo: 'VALOR_FIXO', valor: 1500 });
    expect(descFixo).toBe(1500);
  });

  it('não deve permitir que o desconto ultrapasse o subtotal', () => {
    const subtotal = 3000;
    const descExcessivo = PricingEngine.calculateDiscount(subtotal, { tipo: 'VALOR_FIXO', valor: 5000 });
    expect(descExcessivo).toBe(3000); // Limitado a 3000
  });

  it('deve lançar erro para percentual superior a 100% ou desconto negativo', () => {
    expect(() =>
      PricingEngine.calculateDiscount(1000, { tipo: 'PERCENTUAL', valor: 105 })
    ).toThrow(InvalidDiscountError);

    expect(() =>
      PricingEngine.calculateDiscount(1000, { tipo: 'VALOR_FIXO', valor: -50 })
    ).toThrow(InvalidDiscountError);
  });

  it('deve recalcular totais completos (subtotal, desconto, total e itens_count)', () => {
    const items: Pick<ComandaItemDocument, 'quantidade' | 'preco_unitario_centavos' | 'status'>[] = [
      { quantidade: 2, preco_unitario_centavos: 2000, status: 'SOLICITADO' }, // 4000
      { quantidade: 1, preco_unitario_centavos: 1000, status: 'SOLICITADO' }, // 1000
    ];

    const result = PricingEngine.recalculate(items, { tipo: 'PERCENTUAL', valor: 10 });
    expect(result.subtotal_centavos).toBe(5000);
    expect(result.desconto_centavos).toBe(500);
    expect(result.total_centavos).toBe(4500);
    expect(result.itens_count).toBe(3);
  });

  it('deve validar pagamento e calcular troco em dinheiro', () => {
    const total = 4500;
    const result = PricingEngine.processPayment(total, 'DINHEIRO', 5000);
    expect(result.valorPagoCentavos).toBe(5000);
    expect(result.trocoCentavos).toBe(500); // Troco de R$ 5,00
  });

  it('não deve gerar troco para pagamentos via PIX ou Cartão', () => {
    const total = 4500;
    const resultPix = PricingEngine.processPayment(total, 'PIX', 4500);
    expect(resultPix.trocoCentavos).toBe(0);

    const resultCard = PricingEngine.processPayment(total, 'CARTAO_CREDITO', 4500);
    expect(resultCard.trocoCentavos).toBe(0);
  });

  it('deve lançar erro quando valor pago for insuficiente', () => {
    const total = 4500;
    expect(() =>
      PricingEngine.processPayment(total, 'DINHEIRO', 4000)
    ).toThrow(InsufficientPaymentError);
  });
});

import { ComandaItemDocument, DiscountPolicy, CalculationResult } from './types.js';
import { InvalidDiscountError, InsufficientPaymentError } from './errors.js';

/**
 * Monetary calculations and pricing engine in integer centavos
 */
export class PricingEngine {
  /**
   * Calculates the subtotal for a list of comanda items.
   * Only active items (not CANCELADO) are included.
   */
  public static calculateSubtotal(items: Pick<ComandaItemDocument, 'quantidade' | 'preco_unitario_centavos' | 'status'>[]): number {
    return items
      .filter(item => item.status !== 'CANCELADO')
      .reduce((acc, item) => {
        const itemTotal = item.quantidade * item.preco_unitario_centavos;
        return acc + Math.max(0, Math.floor(itemTotal));
      }, 0);
  }

  /**
   * Calculates total active items count
   */
  public static countActiveItems(items: Pick<ComandaItemDocument, 'quantidade' | 'status'>[]): number {
    return items
      .filter(item => item.status !== 'CANCELADO')
      .reduce((acc, item) => acc + item.quantidade, 0);
  }

  /**
   * Calculates discount in centavos based on policy
   */
  public static calculateDiscount(subtotalCentavos: number, policy?: DiscountPolicy | null): number {
    if (!policy || subtotalCentavos <= 0) {
      return 0;
    }

    if (policy.valor < 0) {
      throw new InvalidDiscountError('O valor do desconto não pode ser negativo.');
    }

    let discountCentavos = 0;

    if (policy.tipo === 'PERCENTUAL') {
      if (policy.valor > 100) {
        throw new InvalidDiscountError('O percentual de desconto não pode ser superior a 100%.');
      }
      // Round to nearest integer centavo
      discountCentavos = Math.round((subtotalCentavos * policy.valor) / 100);
    } else if (policy.tipo === 'VALOR_FIXO') {
      discountCentavos = Math.round(policy.valor);
    } else {
      throw new InvalidDiscountError(`Tipo de desconto '${policy.tipo}' não é suportado.`);
    }

    // Discount can never exceed subtotal
    return Math.min(subtotalCentavos, Math.max(0, discountCentavos));
  }

  /**
   * Recalculates all monetary values for a comanda
   */
  public static recalculate(
    items: Pick<ComandaItemDocument, 'quantidade' | 'preco_unitario_centavos' | 'status'>[],
    discountPolicy?: DiscountPolicy | null
  ): CalculationResult {
    const subtotal_centavos = this.calculateSubtotal(items);
    const desconto_centavos = this.calculateDiscount(subtotal_centavos, discountPolicy);
    const total_centavos = Math.max(0, subtotal_centavos - desconto_centavos);
    const itens_count = this.countActiveItems(items);

    return {
      subtotal_centavos,
      desconto_centavos,
      total_centavos,
      itens_count,
    };
  }

  /**
   * Validates payment and calculates change (troco)
   */
  public static processPayment(
    totalCentavos: number,
    metodoPagamento: string,
    valorPagoCentavos?: number | null
  ): { valorPagoCentavos: number; trocoCentavos: number } {
    if (totalCentavos <= 0) {
      return { valorPagoCentavos: 0, trocoCentavos: 0 };
    }

    const valorPago = valorPagoCentavos ?? totalCentavos;

    if (valorPago < totalCentavos) {
      throw new InsufficientPaymentError(totalCentavos, valorPago);
    }

    let trocoCentavos = 0;
    if (metodoPagamento === 'DINHEIRO') {
      trocoCentavos = Math.max(0, valorPago - totalCentavos);
    } else {
      // Cartão / PIX não geram troco
      trocoCentavos = 0;
    }

    return {
      valorPagoCentavos: valorPago,
      trocoCentavos,
    };
  }

  /**
   * Formats centavos to Brazilian Real currency string
   */
  public static formatBRL(centavos: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(centavos / 100);
  }

  /**
   * Checks whether the discount exceeds the maximum allowed threshold (default: 10%)
   * which requires generating a notification/alert to admin.
   */
  public static isHighDiscountAlertRequired(
    subtotalCentavos: number,
    descontoCentavos: number,
    thresholdPercentage = 10
  ): boolean {
    if (subtotalCentavos <= 0 || descontoCentavos <= 0) {
      return false;
    }
    const maxNormalDiscount = Math.round((subtotalCentavos * thresholdPercentage) / 100);
    return descontoCentavos > maxNormalDiscount;
  }

  /**
   * Consolidates financial metrics and payment methods for daily cash closing.
   */
  public static consolidateCashClosing(
    comandasFechadas: Array<{
      subtotal_centavos?: number;
      desconto_centavos?: number;
      total_centavos?: number;
      metodo_pagamento?: string | null;
    }>,
    totalComandasCanceladas = 0,
    comandasAbandonadasProcessadas = 0
  ) {
    let totalFaturadoCentavos = 0;
    let totalDescontosCentavos = 0;
    let totalLiquidoCentavos = 0;
    let totalDinheiroCentavos = 0;
    let totalPixCentavos = 0;
    let totalCartaoCreditoCentavos = 0;
    let totalCartaoDebitoCentavos = 0;

    for (const c of comandasFechadas) {
      const subtotal = c.subtotal_centavos || 0;
      const desconto = c.desconto_centavos || 0;
      const total = c.total_centavos !== undefined ? c.total_centavos : Math.max(0, subtotal - desconto);

      totalFaturadoCentavos += subtotal;
      totalDescontosCentavos += desconto;
      totalLiquidoCentavos += total;

      switch (c.metodo_pagamento) {
        case 'DINHEIRO':
          totalDinheiroCentavos += total;
          break;
        case 'PIX':
          totalPixCentavos += total;
          break;
        case 'CARTAO_CREDITO':
          totalCartaoCreditoCentavos += total;
          break;
        case 'CARTAO_DEBITO':
          totalCartaoDebitoCentavos += total;
          break;
      }
    }

    const status = comandasFechadas.length > 0 ? ('CONCLUIDO' as const) : ('SEM_MOVIMENTO' as const);
    const ticketMedioCentavos =
      comandasFechadas.length > 0 ? Math.round(totalLiquidoCentavos / comandasFechadas.length) : 0;

    return {
      total_faturado_centavos: totalFaturadoCentavos,
      total_descontos_centavos: totalDescontosCentavos,
      total_liquido_centavos: totalLiquidoCentavos,
      total_dinheiro_centavos: totalDinheiroCentavos,
      total_pix_centavos: totalPixCentavos,
      total_cartao_credito_centavos: totalCartaoCreditoCentavos,
      total_cartao_debito_centavos: totalCartaoDebitoCentavos,
      total_comandas_fechadas: comandasFechadas.length,
      total_comandas_canceladas: totalComandasCanceladas,
      comandas_abandonadas_processadas: comandasAbandonadasProcessadas,
      ticket_medio_centavos: ticketMedioCentavos,
      status,
    };
  }
}

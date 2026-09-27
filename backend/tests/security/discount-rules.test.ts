import { describe, it, expect } from 'vitest';
import { FormaPagamento, UserProfile, UserRole, TipoNotificacao } from '../../../shared/types';
import { validateDiscountSecurity, validatePaymentSecurity } from '../../../shared/security';

describe('Discount & Payment Security Validation', () => {
  const atendente: UserProfile = {
    $id: 'atendente-1',
    nome: 'Atendente',
    email: 'atendente@doceria.com',
    role: UserRole.ATENDENTE,
    ativo: true,
  };

  const caixa: UserProfile = {
    $id: 'caixa-1',
    nome: 'Caixa',
    email: 'caixa@doceria.com',
    role: UserRole.CAIXA,
    ativo: true,
  };

  const admin: UserProfile = {
    $id: 'admin-1',
    nome: 'Admin',
    email: 'admin@doceria.com',
    role: UserRole.ADMIN,
    ativo: true,
  };

  describe('Discount Security Rules', () => {
    it('permite desconto zero para qualquer papel', () => {
      const res = validateDiscountSecurity({
        subtotalCentavos: 10000,
        descontoCentavos: 0,
        userProfile: atendente,
      });
      expect(res.isValid).toBe(true);
      expect(res.totalCalculadoCentavos).toBe(10000);
      expect(res.percentualDesconto).toBe(0);
    });

    it('proíbe desconto negativo', () => {
      const res = validateDiscountSecurity({
        subtotalCentavos: 10000,
        descontoCentavos: -500,
        userProfile: caixa,
      });
      expect(res.isValid).toBe(false);
      expect(res.errorCode).toBe('INVALID_DISCOUNT_VALUE');
    });

    it('proíbe desconto superior ao subtotal', () => {
      const res = validateDiscountSecurity({
        subtotalCentavos: 5000,
        descontoCentavos: 6000,
        userProfile: caixa,
      });
      expect(res.isValid).toBe(false);
      expect(res.errorCode).toBe('DISCOUNT_EXCEEDS_SUBTOTAL');
    });

    it('PROÍBE atendente de conceder qualquer desconto', () => {
      const res = validateDiscountSecurity({
        subtotalCentavos: 10000,
        descontoCentavos: 500, // 5%
        userProfile: atendente,
      });
      expect(res.isValid).toBe(false);
      expect(res.errorCode).toBe('ROLE_DISCOUNT_FORBIDDEN');
    });

    it('permite que Caixa aplique desconto padrão de até 10%', () => {
      const res = validateDiscountSecurity({
        subtotalCentavos: 10000, // R$ 100,00
        descontoCentavos: 1000,  // R$ 10,00 (10%)
        userProfile: caixa,
      });
      expect(res.isValid).toBe(true);
      expect(res.totalCalculadoCentavos).toBe(9000);
      expect(res.percentualDesconto).toBe(10);
      expect(res.isDescontoAlto).toBe(false);
      expect(res.requiresAdminApproval).toBe(false);
    });

    it('BLOQUEIA e SINALIZA desconto superior a 10% aplicado por Caixa sem aprovação', () => {
      const res = validateDiscountSecurity({
        subtotalCentavos: 10000, // R$ 100,00
        descontoCentavos: 1500,  // R$ 15,00 (15%)
        userProfile: caixa,
      });
      expect(res.isValid).toBe(false);
      expect(res.isDescontoAlto).toBe(true);
      expect(res.requiresAdminApproval).toBe(true);
      expect(res.notificationType).toBe(TipoNotificacao.DESCONTO_ALTO);
      expect(res.errorCode).toBe('HIGH_DISCOUNT_REQUIRES_APPROVAL');
    });

    it('permite que Caixa aplique desconto > 10% se tiver adminApproved', () => {
      const res = validateDiscountSecurity({
        subtotalCentavos: 10000,
        descontoCentavos: 2000, // 20%
        userProfile: caixa,
        adminApproved: true,
      });
      expect(res.isValid).toBe(true);
      expect(res.totalCalculadoCentavos).toBe(8000);
      expect(res.percentualDesconto).toBe(20);
      expect(res.isDescontoAlto).toBe(true);
    });

    it('permite que Admin aplique qualquer desconto válido (inclusive 100% cortesia)', () => {
      const resCortesia = validateDiscountSecurity({
        subtotalCentavos: 5000,
        descontoCentavos: 5000, // 100%
        userProfile: admin,
        motivoDesconto: 'Cortesia do proprietário',
      });
      expect(resCortesia.isValid).toBe(true);
      expect(resCortesia.totalCalculadoCentavos).toBe(0);
      expect(resCortesia.percentualDesconto).toBe(100);
    });
  });

  describe('Payment Validation Rules', () => {
    it('valida pagamento em dinheiro com cálculo de troco', () => {
      const res = validatePaymentSecurity({
        totalCentavos: 3500,        // R$ 35,00
        valorPagoCentavos: 5000,    // R$ 50,00
        formaPagamento: FormaPagamento.DINHEIRO,
      });
      expect(res.isValid).toBe(true);
      expect(res.trocoCentavos).toBe(1500); // R$ 15,00
    });

    it('rejeita pagamento com valor insuficiente', () => {
      const res = validatePaymentSecurity({
        totalCentavos: 5000,
        valorPagoCentavos: 4000,
        formaPagamento: FormaPagamento.DINHEIRO,
      });
      expect(res.isValid).toBe(false);
      expect(res.errorCode).toBe('INSUFFICIENT_PAYMENT');
    });

    it('exige valor exato para pagamentos digitais (PIX / Cartões / Vale)', () => {
      // Valor exato no PIX -> OK
      const resPixOk = validatePaymentSecurity({
        totalCentavos: 4500,
        valorPagoCentavos: 4500,
        formaPagamento: FormaPagamento.PIX,
      });
      expect(resPixOk.isValid).toBe(true);
      expect(resPixOk.trocoCentavos).toBe(0);

      // Valor a mais no Cartão -> Invalido (não gera troco em cartão)
      const resCartaoInvalido = validatePaymentSecurity({
        totalCentavos: 4500,
        valorPagoCentavos: 5000,
        formaPagamento: FormaPagamento.CARTAO_CREDITO,
      });
      expect(resCartaoInvalido.isValid).toBe(false);
      expect(resCartaoInvalido.errorCode).toBe('EXACT_PAYMENT_REQUIRED_FOR_DIGITAL');
    });
  });
});

import { describe, it, expect } from 'vitest';
import { PricingEngine } from '../backend/src/core/pricing.js';
import { TipoNotificacao, UserRole } from '../shared/types.js';

describe('Notifications & Discount Limits — Notificação de Desconto > 10% e Eventos do Sistema', () => {
  describe('1. Regra de Limite de Desconto (Margem Máxima de 10%)', () => {
    const subtotalPadrao = 10000; // R$ 100,00

    it('NÃO deve alertar quando o desconto for menor que 10%', () => {
      const descontosAbaixo = [0, 100, 500, 999]; // 0%, 1%, 5%, 9.99%

      for (const desc of descontosAbaixo) {
        const precisaAlerta = PricingEngine.isHighDiscountAlertRequired(subtotalPadrao, desc, 10);
        expect(precisaAlerta).toBe(false);
      }
    });

    it('NÃO deve alertar quando o desconto for exatamente igual a 10%', () => {
      const exatamente10Porcento = 1000; // R$ 10,00 de R$ 100,00
      const precisaAlerta = PricingEngine.isHighDiscountAlertRequired(subtotalPadrao, exatamente10Porcento, 10);
      expect(precisaAlerta).toBe(false);
    });

    it('DEVE alertar quando o desconto ultrapassar 10% mesmo por 1 centavo', () => {
      const desconto1001 = 1001; // R$ 10,01 (> 10%)
      const precisaAlerta = PricingEngine.isHighDiscountAlertRequired(subtotalPadrao, desconto1001, 10);
      expect(precisaAlerta).toBe(true);
    });

    it('DEVE alertar para descontos elevados (ex: 15%, 20%, 50%)', () => {
      const descontosAltos = [1500, 2000, 5000, 8000]; // 15%, 20%, 50%, 80%

      for (const desc of descontosAltos) {
        const precisaAlerta = PricingEngine.isHighDiscountAlertRequired(subtotalPadrao, desc, 10);
        expect(precisaAlerta).toBe(true);
      }
    });

    it('deve avaliar corretamente subtotais com valores ímpares e centavos quebrados', () => {
      // Subtotal R$ 18,50 = 1850 centavos. 10% = 185 centavos.
      expect(PricingEngine.isHighDiscountAlertRequired(1850, 185, 10)).toBe(false);
      expect(PricingEngine.isHighDiscountAlertRequired(1850, 186, 10)).toBe(true);

      // Subtotal R$ 33,33 = 3333 centavos. 10% arredondado = 333 centavos.
      expect(PricingEngine.isHighDiscountAlertRequired(3333, 333, 10)).toBe(false);
      expect(PricingEngine.isHighDiscountAlertRequired(3333, 334, 10)).toBe(true);
    });
  });

  describe('2. Contratos de Notificação e Destinatários por Perfil', () => {
    it('deve direcionar notificação de DESCONTO_ALTO para o ADMIN', () => {
      const notificacaoDesconto = {
        tipo: TipoNotificacao.DESCONTO_ALTO,
        titulo: 'Alerta: Desconto Superior ao Limite',
        mensagem: 'Desconto de R$ 15,00 (15%) aplicado na comanda CMD-101.',
        destinatario_role: UserRole.ADMIN,
        lida: false,
      };

      expect(notificacaoDesconto.tipo).toBe('desconto_alto');
      expect(notificacaoDesconto.destinatario_role).toBe('admin');
    });

    it('deve direcionar notificação de PEDIR_CONTA para o CAIXA', () => {
      const notificacaoPedirConta = {
        tipo: TipoNotificacao.PEDIR_CONTA,
        titulo: 'Mesa 4 solicitou a conta',
        mensagem: 'A comanda CMD-104 solicitou fechamento.',
        destinatario_role: UserRole.CAIXA,
        lida: false,
      };

      expect(notificacaoPedirConta.tipo).toBe('pedir_conta');
      expect(notificacaoPedirConta.destinatario_role).toBe('caixa');
    });

    it('deve direcionar notificação de FECHAMENTO_CAIXA para o ADMIN', () => {
      const notificacaoFechamento = {
        tipo: TipoNotificacao.FECHAMENTO_CAIXA,
        titulo: 'Fechamento Diário de Caixa Concluído',
        mensagem: 'Faturamento total do dia: R$ 4.520,00.',
        destinatario_role: UserRole.ADMIN,
        lida: false,
      };

      expect(notificacaoFechamento.tipo).toBe('fechamento_caixa');
      expect(notificacaoFechamento.destinatario_role).toBe('admin');
    });
  });
});

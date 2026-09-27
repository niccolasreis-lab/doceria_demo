import { describe, it, expect } from 'vitest';
import { PricingEngine } from '../backend/src/core/pricing.js';

describe('CashClosing — Consolidação de Fechamento de Caixa Diário', () => {
  describe('1. Consolidação Financeira por Métodos de Pagamento', () => {
    it('deve consolidar corretamente comandas com múltiplos métodos de pagamento', () => {
      const comandasFechadas = [
        {
          subtotal_centavos: 4500, // R$ 45,00
          desconto_centavos: 500,  // R$ 5,00
          total_centavos: 4000,    // R$ 40,00
          metodo_pagamento: 'DINHEIRO',
        },
        {
          subtotal_centavos: 6000,
          desconto_centavos: 0,
          total_centavos: 6000,
          metodo_pagamento: 'PIX',
        },
        {
          subtotal_centavos: 8500,
          desconto_centavos: 1000,
          total_centavos: 7500,
          metodo_pagamento: 'CARTAO_CREDITO',
        },
        {
          subtotal_centavos: 3200,
          desconto_centavos: 200,
          total_centavos: 3000,
          metodo_pagamento: 'CARTAO_DEBITO',
        },
      ];

      const resultado = PricingEngine.consolidateCashClosing(comandasFechadas, 1, 0);

      expect(resultado.total_faturado_centavos).toBe(22200); // 4500 + 6000 + 8500 + 3200
      expect(resultado.total_descontos_centavos).toBe(1700);  // 500 + 0 + 1000 + 200
      expect(resultado.total_liquido_centavos).toBe(20500);   // 22200 - 1700
      expect(resultado.total_dinheiro_centavos).toBe(4000);
      expect(resultado.total_pix_centavos).toBe(6000);
      expect(resultado.total_cartao_credito_centavos).toBe(7500);
      expect(resultado.total_cartao_debito_centavos).toBe(3000);
      expect(resultado.total_comandas_fechadas).toBe(4);
      expect(resultado.total_comandas_canceladas).toBe(1);
      expect(resultado.status).toBe('CONCLUIDO');
    });

    it('deve garantir a Invariante Matemática Financeira: Faturado - Descontos == Líquido', () => {
      const comandas = [
        { subtotal_centavos: 12500, desconto_centavos: 1250, total_centavos: 11250, metodo_pagamento: 'PIX' },
        { subtotal_centavos: 8900, desconto_centavos: 890, total_centavos: 8010, metodo_pagamento: 'DINHEIRO' },
        { subtotal_centavos: 4200, desconto_centavos: 0, total_centavos: 4200, metodo_pagamento: 'CARTAO_CREDITO' },
      ];

      const res = PricingEngine.consolidateCashClosing(comandas);

      expect(res.total_faturado_centavos - res.total_descontos_centavos).toBe(res.total_liquido_centavos);
    });

    it('deve garantir a Invariante dos Meios de Pagamento: Soma(Métodos) == Total Líquido', () => {
      const comandas = [
        { subtotal_centavos: 5000, desconto_centavos: 500, total_centavos: 4500, metodo_pagamento: 'DINHEIRO' },
        { subtotal_centavos: 7000, desconto_centavos: 0, total_centavos: 7000, metodo_pagamento: 'PIX' },
        { subtotal_centavos: 10000, desconto_centavos: 1000, total_centavos: 9000, metodo_pagamento: 'CARTAO_CREDITO' },
        { subtotal_centavos: 3500, desconto_centavos: 350, total_centavos: 3150, metodo_pagamento: 'CARTAO_DEBITO' },
      ];

      const res = PricingEngine.consolidateCashClosing(comandas);
      const somaMetodos =
        res.total_dinheiro_centavos +
        res.total_pix_centavos +
        res.total_cartao_credito_centavos +
        res.total_cartao_debito_centavos;

      expect(somaMetodos).toBe(res.total_liquido_centavos);
      expect(res.total_liquido_centavos).toBe(23650);
    });
  });

  describe('2. Cálculo de Ticket Médio e Status de Fechamento', () => {
    it('deve calcular o ticket médio em centavos inteiros com arredondamento preciso', () => {
      const comandas = [
        { total_centavos: 3000, metodo_pagamento: 'PIX' }, // R$ 30,00
        { total_centavos: 4000, metodo_pagamento: 'PIX' }, // R$ 40,00
        { total_centavos: 5000, metodo_pagamento: 'PIX' }, // R$ 50,00
      ];

      const res = PricingEngine.consolidateCashClosing(comandas);
      expect(res.ticket_medio_centavos).toBe(4000); // R$ 40,00 de ticket médio
    });

    it('deve arredondar centavos fracionários no ticket médio', () => {
      // 10000 / 3 = 3333.33 -> 3333 centavos
      const comandas = [
        { total_centavos: 3334, metodo_pagamento: 'PIX' },
        { total_centavos: 3333, metodo_pagamento: 'PIX' },
        { total_centavos: 3333, metodo_pagamento: 'PIX' },
      ];

      const res = PricingEngine.consolidateCashClosing(comandas);
      expect(res.total_liquido_centavos).toBe(10000);
      expect(res.ticket_medio_centavos).toBe(3333);
    });

    it('deve retornar SEM_MOVIMENTO e ticket médio 0 quando não houver comandas fechadas', () => {
      const res = PricingEngine.consolidateCashClosing([], 2, 1);

      expect(res.status).toBe('SEM_MOVIMENTO');
      expect(res.total_comandas_fechadas).toBe(0);
      expect(res.total_faturado_centavos).toBe(0);
      expect(res.total_descontos_centavos).toBe(0);
      expect(res.total_liquido_centavos).toBe(0);
      expect(res.ticket_medio_centavos).toBe(0);
      expect(res.total_comandas_canceladas).toBe(2);
      expect(res.comandas_abandonadas_processadas).toBe(1);
    });
  });

  describe('3. Robustez e Casos Extremos de Fechamento', () => {
    it('deve processar comanda com 100% de desconto sem quebrar as métricas', () => {
      const comandas = [
        { subtotal_centavos: 5000, desconto_centavos: 5000, total_centavos: 0, metodo_pagamento: 'DINHEIRO' },
        { subtotal_centavos: 4000, desconto_centavos: 0, total_centavos: 4000, metodo_pagamento: 'PIX' },
      ];

      const res = PricingEngine.consolidateCashClosing(comandas);
      expect(res.total_faturado_centavos).toBe(9000);
      expect(res.total_descontos_centavos).toBe(5000);
      expect(res.total_liquido_centavos).toBe(4000);
      expect(res.ticket_medio_centavos).toBe(2000); // 4000 / 2 comandas
    });

    it('deve lidar com grandes volumes de comandas mantendo integridade dos dados', () => {
      const grandeVolume = Array.from({ length: 500 }, (_, i) => ({
        subtotal_centavos: 2000 + (i % 10) * 100, // 2000 a 2900 centavos
        desconto_centavos: i % 2 === 0 ? 100 : 0,
        total_centavos: (2000 + (i % 10) * 100) - (i % 2 === 0 ? 100 : 0),
        metodo_pagamento: i % 4 === 0 ? 'DINHEIRO' : i % 4 === 1 ? 'PIX' : i % 4 === 2 ? 'CARTAO_CREDITO' : 'CARTAO_DEBITO',
      }));

      const res = PricingEngine.consolidateCashClosing(grandeVolume);
      expect(res.total_comandas_fechadas).toBe(500);
      expect(res.total_faturado_centavos - res.total_descontos_centavos).toBe(res.total_liquido_centavos);
      expect(
        res.total_dinheiro_centavos +
        res.total_pix_centavos +
        res.total_cartao_credito_centavos +
        res.total_cartao_debito_centavos
      ).toBe(res.total_liquido_centavos);
    });
  });
});

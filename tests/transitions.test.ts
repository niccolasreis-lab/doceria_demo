import { describe, it, expect } from 'vitest';
import { StateMachine } from '../backend/src/core/transitions.js';
import {
  InvalidStateTransitionError,
  EmptyComandaClosingError,
  EmptyComandaBillRequestError,
} from '../backend/src/core/errors.js';
import { ComandaStatus, ComandaItemDocument } from '../backend/src/core/types.js';

describe('StateMachine — Validação de Transições de Estado e Bloqueios Críticos', () => {
  const activeItem: Pick<ComandaItemDocument, 'quantidade' | 'status'> = {
    quantidade: 1,
    status: 'SOLICITADO',
  };

  const deliveredItem: Pick<ComandaItemDocument, 'quantidade' | 'status'> = {
    quantidade: 2,
    status: 'ENTREGUE',
  };

  const canceledItem: Pick<ComandaItemDocument, 'quantidade' | 'status'> = {
    quantidade: 1,
    status: 'CANCELADO',
  };

  describe('1. Bloqueio de Pedir Conta em Comanda Vazia', () => {
    it('deve lançar EmptyComandaBillRequestError ao tentar pedir conta sem nenhum item', () => {
      expect(() =>
        StateMachine.validateTransition('ABERTA', 'CONTA_SOLICITADA', {
          items: [],
        })
      ).toThrow(EmptyComandaBillRequestError);
    });

    it('deve lançar EmptyComandaBillRequestError se todos os itens da comanda estiverem cancelados', () => {
      expect(() =>
        StateMachine.validateTransition('ABERTA', 'CONTA_SOLICITADA', {
          items: [canceledItem, { quantidade: 3, status: 'CANCELADO' }],
        })
      ).toThrow(EmptyComandaBillRequestError);
    });

    it('deve permitir pedir conta se houver pelo menos um item ativo (não cancelado)', () => {
      expect(() =>
        StateMachine.validateTransition('ABERTA', 'CONTA_SOLICITADA', {
          items: [canceledItem, activeItem],
        })
      ).not.toThrow();

      expect(() =>
        StateMachine.validateTransition('ABERTA', 'CONTA_SOLICITADA', {
          items: [deliveredItem],
        })
      ).not.toThrow();
    });
  });

  describe('2. Bloqueio de Fechamento de Comanda Vazia', () => {
    it('deve lançar EmptyComandaClosingError ao tentar fechar comanda aberta sem itens', () => {
      expect(() =>
        StateMachine.validateTransition('ABERTA', 'FECHADA', {
          items: [],
        })
      ).toThrow(EmptyComandaClosingError);
    });

    it('deve lançar EmptyComandaClosingError ao tentar fechar comanda com conta solicitada mas sem itens ativos', () => {
      expect(() =>
        StateMachine.validateTransition('CONTA_SOLICITADA', 'FECHADA', {
          items: [canceledItem],
        })
      ).toThrow(EmptyComandaClosingError);
    });

    it('deve permitir fechar comanda quando há itens ativos válidos consumidos', () => {
      expect(() =>
        StateMachine.validateTransition('ABERTA', 'FECHADA', {
          items: [activeItem],
        })
      ).not.toThrow();

      expect(() =>
        StateMachine.validateTransition('CONTA_SOLICITADA', 'FECHADA', {
          items: [activeItem, deliveredItem],
        })
      ).not.toThrow();
    });
  });

  describe('3. Transições Permitidas do Ciclo de Vida', () => {
    it('deve permitir transições legítimas a partir de ABERTA', () => {
      expect(StateMachine.canTransition('ABERTA', 'CONTA_SOLICITADA')).toBe(true);
      expect(StateMachine.canTransition('ABERTA', 'FECHADA')).toBe(true);
      expect(StateMachine.canTransition('ABERTA', 'CANCELADA')).toBe(true);
    });

    it('deve permitir transições legítimas a partir de CONTA_SOLICITADA', () => {
      expect(StateMachine.canTransition('CONTA_SOLICITADA', 'FECHADA')).toBe(true);
      expect(StateMachine.canTransition('CONTA_SOLICITADA', 'ABERTA')).toBe(true); // Reabertura para adicionar novos itens
      expect(StateMachine.canTransition('CONTA_SOLICITADA', 'CANCELADA')).toBe(true);
    });

    it('deve validar transição no-op (mesmo estado para mesmo estado) sem erro', () => {
      expect(() =>
        StateMachine.validateTransition('ABERTA', 'ABERTA', { items: [] })
      ).not.toThrow();
    });
  });

  describe('4. Proteção contra Transições Inválidas e Estados Terminais', () => {
    it('deve proibir qualquer transição a partir do estado terminal FECHADA', () => {
      const estadosDestino: ComandaStatus[] = ['ABERTA', 'CONTA_SOLICITADA', 'CANCELADA'];

      for (const dest of estadosDestino) {
        expect(StateMachine.canTransition('FECHADA', dest)).toBe(false);
        expect(() =>
          StateMachine.validateTransition('FECHADA', dest, { items: [activeItem] })
        ).toThrow(InvalidStateTransitionError);
      }
    });

    it('deve proibir qualquer transição a partir do estado terminal CANCELADA', () => {
      const estadosDestino: ComandaStatus[] = ['ABERTA', 'CONTA_SOLICITADA', 'FECHADA'];

      for (const dest of estadosDestino) {
        expect(StateMachine.canTransition('CANCELADA', dest)).toBe(false);
        expect(() =>
          StateMachine.validateTransition('CANCELADA', dest, { items: [activeItem] })
        ).toThrow(InvalidStateTransitionError);
      }
    });

    it('deve permitir adição de itens apenas quando comanda está no status ABERTA', () => {
      expect(StateMachine.canAddItems('ABERTA')).toBe(true);
      expect(StateMachine.canAddItems('CONTA_SOLICITADA')).toBe(false);
      expect(StateMachine.canAddItems('FECHADA')).toBe(false);
      expect(StateMachine.canAddItems('CANCELADA')).toBe(false);
    });
  });
});

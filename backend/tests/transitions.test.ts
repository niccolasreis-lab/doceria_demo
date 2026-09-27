import { describe, it, expect } from 'vitest';
import { StateMachine } from '../src/core/transitions.js';
import {
  InvalidStateTransitionError,
  EmptyComandaClosingError,
  EmptyComandaBillRequestError,
} from '../src/core/errors.js';

describe('StateMachine - Transições de Estado e Regras de Fechamento', () => {
  const activeItems = [{ quantidade: 1, status: 'SOLICITADO' as const }];
  const emptyItems: any[] = [];
  const canceledOnlyItems = [{ quantidade: 2, status: 'CANCELADO' as const }];

  it('deve permitir transições válidas a partir de ABERTA com itens', () => {
    expect(() =>
      StateMachine.validateTransition('ABERTA', 'CONTA_SOLICITADA', { items: activeItems })
    ).not.toThrow();

    expect(() =>
      StateMachine.validateTransition('ABERTA', 'FECHADA', { items: activeItems })
    ).not.toThrow();

    expect(() =>
      StateMachine.validateTransition('ABERTA', 'CANCELADA', { items: activeItems })
    ).not.toThrow();
  });

  it('deve permitir reabrir comanda a partir de CONTA_SOLICITADA para ABERTA', () => {
    expect(() =>
      StateMachine.validateTransition('CONTA_SOLICITADA', 'ABERTA', { items: activeItems })
    ).not.toThrow();
  });

  it('deve rejeitar solicitação de conta para comanda sem itens', () => {
    expect(() =>
      StateMachine.validateTransition('ABERTA', 'CONTA_SOLICITADA', { items: emptyItems })
    ).toThrow(EmptyComandaBillRequestError);

    expect(() =>
      StateMachine.validateTransition('ABERTA', 'CONTA_SOLICITADA', { items: canceledOnlyItems })
    ).toThrow(EmptyComandaBillRequestError);
  });

  it('deve rejeitar fechamento de comanda vazia como faturada/fechada', () => {
    expect(() =>
      StateMachine.validateTransition('ABERTA', 'FECHADA', { items: emptyItems })
    ).toThrow(EmptyComandaClosingError);

    expect(() =>
      StateMachine.validateTransition('CONTA_SOLICITADA', 'FECHADA', { items: emptyItems })
    ).toThrow(EmptyComandaClosingError);
  });

  it('deve rejeitar transições a partir do estado terminal FECHADA', () => {
    expect(() =>
      StateMachine.validateTransition('FECHADA', 'ABERTA', { items: activeItems })
    ).toThrow(InvalidStateTransitionError);

    expect(() =>
      StateMachine.validateTransition('FECHADA', 'CONTA_SOLICITADA', { items: activeItems })
    ).toThrow(InvalidStateTransitionError);

    expect(() =>
      StateMachine.validateTransition('FECHADA', 'CANCELADA', { items: activeItems })
    ).toThrow(InvalidStateTransitionError);
  });

  it('deve rejeitar transições a partir do estado terminal CANCELADA', () => {
    expect(() =>
      StateMachine.validateTransition('CANCELADA', 'ABERTA', { items: activeItems })
    ).toThrow(InvalidStateTransitionError);

    expect(() =>
      StateMachine.validateTransition('CANCELADA', 'FECHADA', { items: activeItems })
    ).toThrow(InvalidStateTransitionError);
  });
});

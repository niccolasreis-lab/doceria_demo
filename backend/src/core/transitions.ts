import { ComandaStatus, ComandaItemDocument } from './types.js';
import {
  InvalidStateTransitionError,
  EmptyComandaClosingError,
  EmptyComandaBillRequestError,
} from './errors.js';

export interface TransitionContext {
  items: Pick<ComandaItemDocument, 'quantidade' | 'status'>[];
  motivoCancelamento?: string;
}

export class StateMachine {
  private static readonly ALLOWED_TRANSITIONS: Record<ComandaStatus, ComandaStatus[]> = {
    ABERTA: ['CONTA_SOLICITADA', 'FECHADA', 'CANCELADA'],
    CONTA_SOLICITADA: ['FECHADA', 'ABERTA', 'CANCELADA'],
    FECHADA: [], // Terminal
    CANCELADA: [], // Terminal
  };

  /**
   * Validates if a transition from currentStatus to nextStatus is allowed
   */
  public static canTransition(currentStatus: ComandaStatus, nextStatus: ComandaStatus): boolean {
    const allowed = this.ALLOWED_TRANSITIONS[currentStatus] || [];
    return allowed.includes(nextStatus);
  }

  /**
   * Validates state transition and enforces business invariants (empty tab rules, terminal states)
   */
  public static validateTransition(
    currentStatus: ComandaStatus,
    nextStatus: ComandaStatus,
    context: TransitionContext
  ): void {
    if (currentStatus === nextStatus) {
      return;
    }

    if (!this.canTransition(currentStatus, nextStatus)) {
      throw new InvalidStateTransitionError(
        currentStatus,
        nextStatus,
        `Comandas em estado '${currentStatus}' não podem ser alteradas para '${nextStatus}'.`
      );
    }

    const activeItems = context.items.filter(i => i.status !== 'CANCELADO');
    const totalActiveQty = activeItems.reduce((acc, i) => acc + i.quantidade, 0);

    // Rule: Requesting bill requires at least 1 active item
    if (nextStatus === 'CONTA_SOLICITADA' && totalActiveQty === 0) {
      throw new EmptyComandaBillRequestError('comanda');
    }

    // Rule: Closing comanda requires at least 1 active item
    // If there are no items, it must be canceled instead of closed as a paid bill
    if (nextStatus === 'FECHADA' && totalActiveQty === 0) {
      throw new EmptyComandaClosingError('comanda');
    }
  }

  /**
   * Checks if comanda is open for item additions
   */
  public static canAddItems(status: ComandaStatus): boolean {
    return status === 'ABERTA';
  }
}

/**
 * Central domain errors for Doceria do Sr. Gilmar backend
 */

export class DomainError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, statusCode = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} com ID '${id}' não foi encontrado(a).`, 'NOT_FOUND', 404, { entity, id });
  }
}

export class ProductUnavailableError extends DomainError {
  constructor(productId: string, productName: string) {
    super(
      `O produto '${productName}' (${productId}) está indisponível para pedidos no momento.`,
      'PRODUCT_UNAVAILABLE',
      400,
      { productId, productName }
    );
  }
}

export class InvalidStateTransitionError extends DomainError {
  constructor(currentStatus: string, attemptedStatus: string, reason?: string) {
    super(
      `Transição de estado inválida: '${currentStatus}' -> '${attemptedStatus}'. ${reason || ''}`.trim(),
      'INVALID_STATE_TRANSITION',
      400,
      { currentStatus, attemptedStatus, reason }
    );
  }
}

export class EmptyComandaClosingError extends DomainError {
  constructor(comandaId: string) {
    super(
      `Não é possível fechar ou faturar a comanda '${comandaId}' sem itens consumidos. Para comandas vazias, solicite o cancelamento.`,
      'CANNOT_CLOSE_EMPTY_TAB',
      400,
      { comandaId }
    );
  }
}

export class EmptyComandaBillRequestError extends DomainError {
  constructor(comandaId: string) {
    super(
      `Não é possível solicitar a conta da comanda '${comandaId}' sem nenhum item adicionado.`,
      'CANNOT_REQUEST_BILL_EMPTY_TAB',
      400,
      { comandaId }
    );
  }
}

export class InsufficientPaymentError extends DomainError {
  constructor(totalCentavos: number, valorPagoCentavos: number) {
    super(
      `Valor pago (R$ ${(valorPagoCentavos / 100).toFixed(2)}) é inferior ao total devido (R$ ${(totalCentavos / 100).toFixed(2)}).`,
      'INSUFFICIENT_PAYMENT',
      400,
      { totalCentavos, valorPagoCentavos }
    );
  }
}

export class InvalidDiscountError extends DomainError {
  constructor(reason: string) {
    super(`Desconto inválido: ${reason}`, 'INVALID_DISCOUNT', 400);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

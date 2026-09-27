import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { store } from "../src/lib/store";
import { Order, PaymentEntry } from "../src/types";

describe("Doceria do Sr. Gilmar - POS & Business Logic Engine", () => {
  it("should calculate order subtotals, 10% service fee and total correctly", () => {
    store.resetToDefault();
    const order = store.requestTableBill("table-01");
    assert.ok(order, "Order should be created");

    // Add 2x Torta Holandesa (24.90 each = 49.80) + 2x Cappuccino (14.50 each = 29.00)
    store.addItemToOrder(order.id, "prod-1", 2);
    store.addItemToOrder(order.id, "prod-9", 2);

    const updated = store.getOrderById(order.id)!;
    assert.equal(updated.subtotal, 78.8);
    assert.equal(updated.serviceFeePercentage, 10);
    assert.equal(Math.round(updated.serviceFeeAmount * 100) / 100, 7.88);
    assert.equal(Math.round(updated.total * 100) / 100, 86.68);
  });

  it("should calculate percentage and fixed discounts accurately", () => {
    store.resetToDefault();
    const order = store.requestTableBill("table-05")!;
    store.addItemToOrder(order.id, "prod-12", 2); // 2x Croissant Brie 26.00 = 52.00

    // Apply 10% discount
    store.applyDiscount(order.id, {
      type: "PERCENTUAL",
      value: 10,
      calculatedAmount: 5.2,
      reason: "Cortesia fidelidade",
    });

    let updated = store.getOrderById(order.id)!;
    assert.equal(updated.subtotal, 52.0);
    assert.equal(updated.discount?.calculatedAmount, 5.2);
    // Base for service: 52.00 - 5.20 = 46.80. Service fee (10%): 4.68. Total: 46.80 + 4.68 = 51.48
    assert.equal(Math.round(updated.serviceFeeAmount * 100) / 100, 4.68);
    assert.equal(Math.round(updated.total * 100) / 100, 51.48);

    // Switch to fixed discount R$ 12.00
    store.applyDiscount(order.id, {
      type: "VALOR_FIXO",
      value: 12.0,
      calculatedAmount: 12.0,
      reason: "Voucher desconto",
    });

    updated = store.getOrderById(order.id)!;
    assert.equal(updated.subtotal, 52.0);
    assert.equal(updated.discount?.calculatedAmount, 12.0);
    // Base: 52 - 12 = 40. Service fee: 4.00. Total: 44.00
    assert.equal(updated.serviceFeeAmount, 4.0);
    assert.equal(updated.total, 44.0);
  });

  it("should handle service fee removal (opt-out)", () => {
    store.resetToDefault();
    const order = store.requestTableBill("table-06")!;
    store.addItemToOrder(order.id, "prod-15", 1); // Taça Suprema 34.00

    // Remove service fee
    store.toggleServiceFee(order.id, false);
    const updated = store.getOrderById(order.id)!;
    assert.equal(updated.serviceFeePercentage, 0);
    assert.equal(updated.serviceFeeAmount, 0);
    assert.equal(updated.total, 34.0);
  });

  it("should process split payments and calculate cash change", () => {
    store.resetToDefault();
    const order = store.requestTableBill("table-07")!;
    store.addItemToOrder(order.id, "prod-14", 2); // 2x Pão de Queijo 17.00 = 34.00
    store.toggleServiceFee(order.id, false); // Total = 34.00

    const payments: PaymentEntry[] = [
      {
        id: "pay-1",
        method: "PIX",
        amount: 14.0,
        createdAt: new Date().toISOString(),
      },
      {
        id: "pay-2",
        method: "DINHEIRO",
        amount: 20.0,
        receivedAmount: 50.0,
        changeAmount: 30.0,
        createdAt: new Date().toISOString(),
      },
    ];

    const result = store.settleOrderPayment(order.id, payments, "Mariana Silva");
    assert.ok(result, "Settlement must succeed");
    assert.equal(result.order.status, "PAGO");
    assert.equal(result.receipt.trocoTotal, 30.0);
    assert.equal(result.receipt.items.length, 1);

    // Mesa 7 deve voltar para LIVRE
    const table7 = store.getTableById("table-07")!;
    assert.equal(table7.status, "LIVRE");
    assert.equal(table7.currentOrderId, undefined);
  });

  it("should prevent order settlement with insufficient payment amount", () => {
    store.resetToDefault();
    const order = store.requestTableBill("table-09")!;
    store.addItemToOrder(order.id, "prod-1", 1); // Total com 10% = 27.39

    const insufficientPayments: PaymentEntry[] = [
      {
        id: "pay-short",
        method: "DINHEIRO",
        amount: 10.0,
        createdAt: new Date().toISOString(),
      },
    ];

    assert.throws(() => {
      store.settleOrderPayment(order.id, insufficientPayments, "Mariana Silva");
    }, /inferior ao total/);
  });

  it("should manage cash sessions, sangrias, suprimentos and blind closing", () => {
    store.resetToDefault();

    // Active session
    const active = store.getActiveSession();
    assert.ok(active, "Active session should exist in mock seed");
    const initialExpectedCash = active.expectedInCash;

    // Sangria of R$ 50.00
    store.addCashMovement("SANGRIA", 50.0, "Depósito de segurança", "Mariana Silva");
    assert.equal(active.expectedInCash, initialExpectedCash - 50.0);

    // Suprimento of R$ 30.00
    store.addCashMovement("SUPRIMENTO", 30.0, "Reforço moedas", "Mariana Silva");
    assert.equal(active.expectedInCash, initialExpectedCash - 50.0 + 30.0);

    // Fechamento de caixa
    const declared = {
      DINHEIRO: active.expectedInCash, // Sem divergência
      CARTAO_CREDITO: active.salesByMethod.CARTAO_CREDITO,
      CARTAO_DEBITO: active.salesByMethod.CARTAO_DEBITO,
      PIX: active.salesByMethod.PIX,
      VALE_REFEICAO: active.salesByMethod.VALE_REFEICAO,
    };

    const closed = store.closeCashSession(active.id, declared, "Fechamento test suite");
    assert.ok(closed);
    assert.equal(closed.status, "FECHADO");
    assert.equal(closed.differenceInCash, 0);
  });

  it("should support Products and Tables CRUD and stock management", () => {
    store.resetToDefault();

    // Create product
    const newProd = store.saveProduct({
      name: "Torta Especial de Limão Siciliano",
      category: "BOLOS_TORTAS",
      price: 23.0,
      costPrice: 6.5,
      sku: "TEST-001",
      description: "Torta artesanal de limão",
      stock: 10,
      minStock: 3,
      unit: "FATIA",
      isActive: true,
    });

    assert.ok(newProd.id);
    const found = store.getProductById(newProd.id);
    assert.equal(found?.name, "Torta Especial de Limão Siciliano");

    // Toggle status
    store.toggleProductStatus(newProd.id);
    assert.equal(store.getProductById(newProd.id)?.isActive, false);

    // Delete product
    const deleted = store.deleteProduct(newProd.id);
    assert.equal(deleted, true);
    assert.equal(store.getProductById(newProd.id), undefined);

    // Create table
    const newTable = store.saveTable({
      number: 99,
      name: "Mesa VIP Deck",
      seats: 8,
      sector: "DECK",
      status: "LIVRE",
    });

    assert.ok(newTable.id);
    assert.equal(store.getTableById(newTable.id)?.seats, 8);
    store.deleteTable(newTable.id);
    assert.equal(store.getTableById(newTable.id), undefined);
  });
});

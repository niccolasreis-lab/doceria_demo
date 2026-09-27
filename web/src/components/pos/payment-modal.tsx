"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Order, PaymentEntry, PaymentMethod, ReceiptData } from "@/types";
import { formatCurrency, getPaymentMethodLabel } from "@/lib/utils";
import { store } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import {
  Banknote,
  CreditCard,
  QrCode,
  Wallet,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onPaymentSuccess: (receipt: ReceiptData) => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  order,
  onPaymentSuccess,
}: PaymentModalProps) {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("CARTAO_CREDITO");
  const [amountInput, setAmountInput] = useState<string>("");
  const [receivedCashInput, setReceivedCashInput] = useState<string>("");
  const [customerDoc, setCustomerDoc] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize remaining amount
  useEffect(() => {
    if (order && isOpen) {
      setPayments([]);
      setCustomerDoc(order.customerDocument || "");
      setCustomerName(order.customerName || `Mesa ${order.tableNumber || "Balcão"}`);
      setAmountInput(order.total.toFixed(2));
      setReceivedCashInput("");
      setErrorMsg("");
    }
  }, [order, isOpen]);

  if (!order) return null;

  const totalPaidSoFar = payments.reduce((acc, p) => acc + p.amount, 0);
  const remainingAmount = Math.max(0, order.total - totalPaidSoFar);
  const isFullyPaid = remainingAmount <= 0.009;

  // Atualiza o valor do input quando o saldo restante muda
  const handleSelectMethod = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setAmountInput(remainingAmount.toFixed(2));
    setReceivedCashInput("");
  };

  const handleAddPaymentEntry = () => {
    setErrorMsg("");
    const parsedAmount = parseFloat(amountInput.replace(",", ".")) || 0;

    if (parsedAmount <= 0) {
      setErrorMsg("O valor a lançar deve ser maior que zero.");
      return;
    }

    if (parsedAmount > remainingAmount + 0.001) {
      setErrorMsg(
        `O valor (${formatCurrency(parsedAmount)}) excede o saldo restante (${formatCurrency(remainingAmount)}).`
      );
      return;
    }

    let receivedAmount: number | undefined;
    let changeAmount: number | undefined;

    if (selectedMethod === "DINHEIRO") {
      const parsedReceived = parseFloat(receivedCashInput.replace(",", ".")) || parsedAmount;
      if (parsedReceived < parsedAmount) {
        setErrorMsg("O valor recebido em dinheiro não pode ser menor que o valor cobrado.");
        return;
      }
      receivedAmount = parsedReceived;
      changeAmount = parsedReceived - parsedAmount;
    }

    const newEntry: PaymentEntry = {
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      method: selectedMethod,
      amount: parsedAmount,
      receivedAmount,
      changeAmount,
      referenceCode:
        selectedMethod === "PIX"
          ? `PIX-${Math.floor(100000 + Math.random() * 900000)}`
          : selectedMethod.startsWith("CARTAO")
          ? `AUT-${Math.floor(100000 + Math.random() * 900000)}`
          : undefined,
      createdAt: new Date().toISOString(),
    };

    const updatedPayments = [...payments, newEntry];
    setPayments(updatedPayments);

    const nextRemaining = Math.max(0, order.total - updatedPayments.reduce((a, b) => a + b.amount, 0));
    setAmountInput(nextRemaining.toFixed(2));
    setReceivedCashInput("");
  };

  const handleRemovePaymentEntry = (id: string) => {
    const updated = payments.filter((p) => p.id !== id);
    setPayments(updated);
    const nextRemaining = Math.max(0, order.total - updated.reduce((a, b) => a + b.amount, 0));
    setAmountInput(nextRemaining.toFixed(2));
  };

  const handleFinalize = async () => {
    if (!isFullyPaid) {
      setErrorMsg("Adicione as formas de pagamento necessárias para cobrir o total da conta.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg("");

    try {
      // Atualiza dados de cliente se informados
      store.updateCustomerInfo(order.id, customerName, customerDoc);

      const result = store.settleOrderPayment(
        order.id,
        payments,
        user?.name || "Mariana Silva (Caixa)"
      );

      if (result) {
        onClose();
        onPaymentSuccess(result.receipt);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao processar o fechamento da conta.";
      setErrorMsg(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const currentCashReceived = parseFloat(receivedCashInput.replace(",", ".")) || 0;
  const currentCashChange =
    selectedMethod === "DINHEIRO" && currentCashReceived > parseFloat(amountInput)
      ? currentCashReceived - parseFloat(amountInput)
      : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center justify-between w-full pr-6">
          <span>Fechamento &amp; Pagamento</span>
          <span className="text-sm font-normal text-stone-500">
            {order.tableNumber ? `Mesa ${order.tableNumber}` : "Balcão"} · Pedido #{order.orderNumber}
          </span>
        </div>
      }
      maxWidth="3xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Payment Methods & Inputs */}
        <div className="lg:col-span-7 space-y-4">
          {/* Method Selector Tabs */}
          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase mb-1.5">
              Selecione o Meio de Pagamento
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectMethod("CARTAO_CREDITO")}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  selectedMethod === "CARTAO_CREDITO"
                    ? "border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20"
                    : "border-stone-200 bg-stone-50/50 hover:bg-stone-100 text-stone-700"
                }`}
              >
                <CreditCard className="w-4 h-4 text-amber-600" />
                Crédito
              </button>

              <button
                type="button"
                onClick={() => handleSelectMethod("CARTAO_DEBITO")}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  selectedMethod === "CARTAO_DEBITO"
                    ? "border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20"
                    : "border-stone-200 bg-stone-50/50 hover:bg-stone-100 text-stone-700"
                }`}
              >
                <CreditCard className="w-4 h-4 text-sky-600" />
                Débito
              </button>

              <button
                type="button"
                onClick={() => handleSelectMethod("PIX")}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  selectedMethod === "PIX"
                    ? "border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20"
                    : "border-stone-200 bg-stone-50/50 hover:bg-stone-100 text-stone-700"
                }`}
              >
                <QrCode className="w-4 h-4 text-emerald-600" />
                PIX
              </button>

              <button
                type="button"
                onClick={() => handleSelectMethod("DINHEIRO")}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  selectedMethod === "DINHEIRO"
                    ? "border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20"
                    : "border-stone-200 bg-stone-50/50 hover:bg-stone-100 text-stone-700"
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-700" />
                Dinheiro
              </button>

              <button
                type="button"
                onClick={() => handleSelectMethod("VALE_REFEICAO")}
                className={`col-span-2 p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  selectedMethod === "VALE_REFEICAO"
                    ? "border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20"
                    : "border-stone-200 bg-stone-50/50 hover:bg-stone-100 text-stone-700"
                }`}
              >
                <Wallet className="w-4 h-4 text-purple-600" />
                Vale Refeição / Alimentação
              </button>
            </div>
          </div>

          {/* Amount to pay */}
          <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-stone-700">
                  Valor para {getPaymentMethodLabel(selectedMethod)}
                </label>
                <span className="text-[11px] text-stone-500">
                  Restante: <strong>{formatCurrency(remainingAmount)}</strong>
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  max={remainingAmount}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-lg font-bold text-stone-900 px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />
                <span className="absolute right-3 top-3 text-xs font-bold text-stone-400">
                  BRL
                </span>
              </div>
            </div>

            {/* If Dinheiro: Show received & calculate troco */}
            {selectedMethod === "DINHEIRO" && (
              <div className="pt-2 border-t border-stone-200 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-stone-700">
                    Valor Entregue pelo Cliente (R$)
                  </label>
                  {currentCashChange > 0 && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      Troco: {formatCurrency(currentCashChange)}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="any"
                  value={receivedCashInput}
                  onChange={(e) => setReceivedCashInput(e.target.value)}
                  placeholder={`Ex: ${(parseFloat(amountInput) || 50).toFixed(2)}`}
                  className="w-full text-sm font-semibold text-stone-900 px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />

                {/* Quick cash pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[20, 50, 100, 200].map((bill) => (
                    <button
                      key={bill}
                      type="button"
                      onClick={() => setReceivedCashInput(bill.toString())}
                      className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 hover:bg-emerald-100"
                    >
                      R$ {bill}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setReceivedCashInput(amountInput)}
                    className="px-2.5 py-1 text-xs font-medium bg-stone-200 text-stone-800 rounded-lg hover:bg-stone-300"
                  >
                    Valor Exato
                  </button>
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isFullyPaid || (parseFloat(amountInput) || 0) <= 0}
              onClick={handleAddPaymentEntry}
              className="w-full bg-stone-800 text-white hover:bg-stone-900 border-none"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Lançar Pagamento de {formatCurrency(parseFloat(amountInput) || 0)}
            </Button>
          </div>

          {/* Customer CPF / Nome opcional */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-medium text-stone-600 mb-1">
                Nome do Cliente (Opcional)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ex: Maria Souza"
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-stone-600 mb-1">
                CPF na Nota (Opcional)
              </label>
              <input
                type="text"
                value={customerDoc}
                onChange={(e) => setCustomerDoc(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Right Col: Summary & Split Payment List */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-stone-100/70 p-4 rounded-2xl border border-stone-200">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Resumo Financeiro da Conta
            </h4>

            {/* Price Details */}
            <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal dos Itens:</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount && (
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>Desconto ({order.discount.type === "PERCENTUAL" ? `${order.discount.value}%` : "Fixo"}):</span>
                  <span>- {formatCurrency(order.discount.calculatedAmount)}</span>
                </div>
              )}
              {order.serviceFeeAmount > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>Taxa de Serviço (10%):</span>
                  <span>{formatCurrency(order.serviceFeeAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-stone-900 pt-2 border-t border-stone-100">
                <span>Total a Pagar:</span>
                <span className="text-amber-700">{formatCurrency(order.total)}</span>
              </div>
            </div>

            {/* List of registered payments */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Pagamentos Lançados ({payments.length})
              </label>
              {payments.length === 0 ? (
                <div className="text-center py-4 bg-white rounded-xl border border-dashed border-stone-300 text-xs text-stone-400">
                  Nenhum pagamento registrado ainda.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-stone-200 text-xs shadow-2xs"
                    >
                      <div>
                        <div className="font-bold text-stone-900">
                          {getPaymentMethodLabel(p.method)}
                        </div>
                        <div className="text-[10px] text-stone-500">
                          {p.changeAmount ? `Recebido: ${formatCurrency(p.receivedAmount || 0)} (Troco: ${formatCurrency(p.changeAmount)})` : (p.referenceCode || "Aprovado")}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-700">
                          {formatCurrency(p.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemovePaymentEntry(p.id)}
                          className="text-stone-400 hover:text-rose-600 p-1"
                          title="Remover pagamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Balance Status */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                isFullyPaid
                  ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                  : "bg-amber-50 border-amber-300 text-amber-900 font-semibold"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {isFullyPaid ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                )}
                <span>{isFullyPaid ? "Conta Totalmente Paga!" : "Saldo Restante:"}</span>
              </div>
              <span className="text-sm font-bold">
                {isFullyPaid ? "R$ 0,00" : formatCurrency(remainingAmount)}
              </span>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}
          </div>

          {/* Finalize Button */}
          <div className="pt-4 border-t border-stone-200 space-y-2">
            <Button
              type="button"
              variant="success"
              size="lg"
              disabled={!isFullyPaid || isProcessing}
              isLoading={isProcessing}
              onClick={handleFinalize}
              className="w-full text-sm font-bold shadow-md"
            >
              Finalizar &amp; Emitir Cupom Térmico
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="w-full"
            >
              Voltar à Conferência
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

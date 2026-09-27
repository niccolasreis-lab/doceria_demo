"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Order, DiscountInfo } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { store } from "@/lib/store";
import { DiscountModal } from "./discount-modal";
import {
  Plus,
  Trash2,
  Tag,
  Receipt,
  UserCheck,
  Clock,
  Printer,
  Sparkles,
} from "lucide-react";

interface BillReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onProceedToPayment: (order: Order) => void;
}

export function BillReviewModal({
  isOpen,
  onClose,
  order,
  onProceedToPayment,
}: BillReviewModalProps) {
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [showAddProductSection, setShowAddProductSection] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedQty, setSelectedQty] = useState<number>(1);
  const [itemNote, setItemNote] = useState<string>("");
  const [cancelReasonPrompt, setCancelReasonPrompt] = useState<{ itemId: string; name: string } | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");

  if (!order) return null;

  const products = store.getProducts().filter((p) => p.isActive && p.stock > 0);

  const handleToggleServiceFee = () => {
    const updated = store.toggleServiceFee(order.id, order.serviceFeePercentage === 0);
    if (updated) {
      // Re-trigger via store reactive update
    }
  };

  const handleApplyDiscount = (discount: DiscountInfo) => {
    store.applyDiscount(order.id, discount);
  };

  const handleRemoveDiscount = () => {
    store.removeDiscount(order.id);
  };

  const handleAddExtraItem = () => {
    if (!selectedProductId) return;
    store.addItemToOrder(order.id, selectedProductId, selectedQty, itemNote);
    setSelectedProductId("");
    setSelectedQty(1);
    setItemNote("");
    setShowAddProductSection(false);
  };

  const handleConfirmCancelItem = () => {
    if (!cancelReasonPrompt || !cancelReason.trim()) return;
    store.cancelOrderItem(order.id, cancelReasonPrompt.itemId, cancelReason.trim());
    setCancelReasonPrompt(null);
    setCancelReason("");
  };

  const activeItems = order.items.filter((i) => i.status !== "CANCELADO");
  const cancelledItems = order.items.filter((i) => i.status === "CANCELADO");

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center justify-between w-full pr-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                {order.tableNumber ? `#${order.tableNumber}` : "B"}
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Conferência da Conta {order.tableNumber ? `· Mesa ${order.tableNumber}` : "· Balcão"}
                </h3>
                <p className="text-xs text-stone-500">
                  Comanda #{order.orderNumber} · Atendido por {order.waiterName || "Carlos Eduardo"}
                </p>
              </div>
            </div>
          </div>
        }
        maxWidth="3xl"
      >
        <div className="space-y-6">
          {/* Top Bar Details */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-stone-400" />
              <span>Abertura: <strong>{formatDateTime(order.createdAt)}</strong></span>
            </div>
            {order.customerName && (
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-stone-400" />
                <span>Cliente: <strong>{order.customerName}</strong></span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddProductSection(!showAddProductSection)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Item Extra
              </button>
            </div>
          </div>

          {/* Quick Add Extra Item Drawer */}
          {showAddProductSection && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Lançar Item de Última Hora na Comanda
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddProductSection(false)}
                  className="text-xs text-stone-500 hover:text-stone-800"
                >
                  Fechar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Selecione o Produto do Cardápio
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Selecione um produto...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatCurrency(p.price)}) · Estq: {p.stock}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Qtd
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={selectedQty}
                    onChange={(e) => setSelectedQty(parseInt(e.target.value) || 1)}
                    className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Observação
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Sem açúcar, aquecer..."
                    value={itemNote}
                    onChange={(e) => setItemNote(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={!selectedProductId}
                  onClick={handleAddExtraItem}
                >
                  Confirmar Inclusão
                </Button>
              </div>
            </div>
          )}

          {/* Items Table */}
          <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="bg-stone-100/80 px-4 py-2.5 text-xs font-bold text-stone-700 grid grid-cols-12 gap-2 border-b border-stone-200">
              <span className="col-span-1">Qtd</span>
              <span className="col-span-6">Item / Descrição</span>
              <span className="col-span-2 text-right">Unitário</span>
              <span className="col-span-2 text-right">Total</span>
              <span className="col-span-1 text-center">Ações</span>
            </div>

            <div className="divide-y divide-stone-100 max-h-64 overflow-y-auto bg-white">
              {activeItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-400">
                  Nenhum item ativo nesta comanda.
                </div>
              ) : (
                activeItems.map((item) => (
                  <div
                    key={item.id}
                    className="px-4 py-3 text-xs grid grid-cols-12 gap-2 items-center hover:bg-stone-50/80 transition-colors"
                  >
                    <span className="col-span-1 font-extrabold text-stone-900">
                      {item.quantity}x
                    </span>
                    <div className="col-span-6">
                      <div className="font-semibold text-stone-900">{item.productName}</div>
                      {item.notes && (
                        <div className="text-[11px] text-amber-700 italic">Obs: {item.notes}</div>
                      )}
                    </div>
                    <span className="col-span-2 text-right text-stone-600">
                      {formatCurrency(item.unitPrice)}
                    </span>
                    <span className="col-span-2 text-right font-bold text-stone-900">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </span>
                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setCancelReasonPrompt({
                            itemId: item.id,
                            name: item.productName,
                          })
                        }
                        title="Cancelar item"
                        className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cancelled items notice if any */}
            {cancelledItems.length > 0 && (
              <div className="p-3 bg-rose-50/60 border-t border-rose-100 text-[11px] text-rose-700 space-y-1">
                <span className="font-bold block uppercase tracking-wider text-[10px]">
                  Itens Cancelados ({cancelledItems.length}):
                </span>
                {cancelledItems.map((ci) => (
                  <div key={ci.id} className="flex justify-between line-through opacity-70">
                    <span>{ci.quantity}x {ci.productName} ({formatCurrency(ci.unitPrice * ci.quantity)})</span>
                    <span>Motivo: {ci.cancelledReason || "Erro de lançamento"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subtotal & Discounts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Options */}
            <div className="space-y-2.5">
              {/* Desconto Card */}
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-600" />
                    Desconto Promocional
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {order.discount
                      ? `${order.discount.type === "PERCENTUAL" ? `${order.discount.value}%` : formatCurrency(order.discount.value)} (${order.discount.reason})`
                      : "Nenhum desconto aplicado"}
                  </div>
                </div>
                <Button
                  type="button"
                  variant={order.discount ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setIsDiscountModalOpen(true)}
                >
                  {order.discount ? "Editar" : "Adicionar"}
                </Button>
              </div>

              {/* Service fee toggle */}
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-stone-800">
                    Taxa de Serviço Opcional (10%)
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {order.serviceFeePercentage > 0 ? "Inclusa na conta" : "Removida a pedido"}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={order.serviceFeePercentage > 0}
                    onChange={handleToggleServiceFee}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>
            </div>

            {/* Totals Breakdown */}
            <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/80 space-y-2 text-xs">
              <div className="flex justify-between text-stone-700">
                <span>Subtotal:</span>
                <span className="font-semibold">{formatCurrency(order.subtotal)}</span>
              </div>

              {order.discount && (
                <div className="flex justify-between text-rose-700 font-bold">
                  <span>Desconto Aplicado:</span>
                  <span>- {formatCurrency(order.discount.calculatedAmount)}</span>
                </div>
              )}

              {order.serviceFeeAmount > 0 && (
                <div className="flex justify-between text-stone-700">
                  <span>Taxa de Serviço (10%):</span>
                  <span className="font-semibold">{formatCurrency(order.serviceFeeAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-base font-extrabold text-stone-900 pt-2 border-t border-amber-200">
                <span>Total Final da Conta:</span>
                <span className="text-amber-800 text-lg">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-stone-200">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Voltar ao Salão
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => {
                  window.print();
                }}
                className="hidden sm:inline-flex"
                title="Imprimir extrato pré-conta para levar à mesa"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Imprimir Pré-Conta
              </Button>

              <Button
                type="button"
                variant="gold"
                size="md"
                className="font-bold shadow-md"
                onClick={() => {
                  onProceedToPayment(order);
                }}
              >
                <Receipt className="w-4 h-4 mr-1.5" />
                Seguir para o Pagamento ({formatCurrency(order.total)})
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Discount Sub-modal */}
      <DiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        subtotal={order.subtotal}
        currentDiscount={order.discount}
        onApply={handleApplyDiscount}
        onRemove={handleRemoveDiscount}
      />

      {/* Cancel Item Reason Modal */}
      {cancelReasonPrompt && (
        <Modal
          isOpen={true}
          onClose={() => setCancelReasonPrompt(null)}
          title="Justificativa de Cancelamento de Item"
          description={`Item: ${cancelReasonPrompt.name}`}
          maxWidth="sm"
        >
          <div className="space-y-3">
            <p className="text-xs text-stone-600">
              Informe o motivo do cancelamento para registro de auditoria e estorno de estoque:
            </p>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ex: Pedido duplicado, cliente desistiu..."
              className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelReasonPrompt(null)}
              >
                Voltar
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={!cancelReason.trim()}
                onClick={handleConfirmCancelItem}
              >
                Confirmar Estorno
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

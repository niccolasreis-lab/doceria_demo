"use client";

import React, { useEffect, useState } from "react";
import { store } from "@/lib/store";
import { Order, Table, TableSector, ReceiptData } from "@/types";
import { formatCurrency, getSectorLabel, getStatusLabel } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { BillReviewModal } from "@/components/pos/bill-review-modal";
import { PaymentModal } from "@/components/pos/payment-modal";
import { ReceiptModal } from "@/components/pos/receipt-modal";
import { CashSessionModal } from "@/components/pos/cash-session-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Receipt,
  BellRing,
  Users,
  Grid3X3,
  Calculator,
  CheckCircle2,
} from "lucide-react";

export default function CashierPage() {
  const { user } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [billRequests, setBillRequests] = useState<Order[]>([]);
  const [activeSession, setActiveSession] = useState(store.getActiveSession());
  const [selectedSector, setSelectedSector] = useState<TableSector | "ALL">("ALL");

  // Modals state
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);
  const [cashModalMode, setCashModalMode] = useState<"OPEN" | "CLOSE" | "SANGRIA" | "SUPRIMENTO" | "STATUS" | null>(null);

  // Sync with reactive store
  useEffect(() => {
    const update = () => {
      setTables(store.getTables());
      setBillRequests(store.getBillRequests());
      setActiveSession(store.getActiveSession());

      // If review modal is open, keep order state fresh
      if (reviewOrder) {
        const refreshed = store.getOrderById(reviewOrder.id);
        if (refreshed && refreshed.status !== "PAGO") {
          setReviewOrder(refreshed);
        }
      }
    };

    update();
    return store.subscribe(update);
  }, [reviewOrder]);

  const handleStartReview = (order: Order) => {
    store.startOrderConference(order.id);
    setReviewOrder(order);
  };

  const handleTableClick = (table: Table) => {
    if (table.status === "PEDINDO_CONTA" || table.status === "OCUPADA") {
      const order = store.getOrderByTableId(table.id);
      if (order) {
        setReviewOrder(order);
      } else {
        // Criar pedido caso mesa ocupada sem pedido
        const newOrder = store.requestTableBill(table.id);
        if (newOrder) setReviewOrder(newOrder);
      }
    } else if (table.status === "LIVRE") {
      // Simulação rápida de ocupação com solicitação de conta para teste ágil
      if (confirm(`Mesa ${table.number} está livre. Deseja simular ocupação e pedido para teste do caixa?`)) {
        store.updateTableStatus(table.id, "OCUPADA");
        const newOrder = store.requestTableBill(table.id);
        // Adiciona 2 itens de exemplo
        if (newOrder) {
          store.addItemToOrder(newOrder.id, "prod-1", 1, "Para viagem");
          store.addItemToOrder(newOrder.id, "prod-9", 1);
          setReviewOrder(store.getOrderById(newOrder.id) || newOrder);
        }
      }
    }
  };

  const handleSimulateNewBillRequest = () => {
    const occupiedWithoutBill = tables.find((t) => t.status === "OCUPADA");
    if (occupiedWithoutBill) {
      store.requestTableBill(occupiedWithoutBill.id);
    } else {
      const freeTable = tables.find((t) => t.status === "LIVRE");
      if (freeTable) {
        store.updateTableStatus(freeTable.id, "OCUPADA");
        const ord = store.requestTableBill(freeTable.id);
        if (ord) {
          store.addItemToOrder(ord.id, "prod-3", 2);
          store.addItemToOrder(ord.id, "prod-10", 2);
        }
      } else {
        alert("Todas as mesas estão ocupadas ou pedindo conta!");
      }
    }
  };

  const filteredTables =
    selectedSector === "ALL"
      ? tables
      : tables.filter((t) => t.sector === selectedSector);

  return (
    <ProtectedRoute allowedRoles={["CAIXA", "ADMIN", "GARCOM"]}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Operational Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-stone-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight">
                Frente de Caixa Operacional
              </h1>
              <p className="text-xs text-stone-500">
                Operador: <strong>{user?.name || "Mariana Silva"}</strong> · Terminal 01
              </p>
            </div>
          </div>

          {/* Quick Cashier Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {activeSession ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCashModalMode("STATUS")}
                  className="text-xs"
                >
                  <Calculator className="w-3.5 h-3.5 mr-1 text-amber-600" />
                  Gaveta ({formatCurrency(activeSession.expectedInCash)})
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCashModalMode("SANGRIA")}
                  className="text-xs"
                >
                  Sangria / Suprimento
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCashModalMode("CLOSE")}
                  className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                >
                  Fechar Caixa
                </Button>
              </>
            ) : (
              <Button
                variant="success"
                size="sm"
                onClick={() => setCashModalMode("OPEN")}
                className="text-xs"
              >
                Abrir Turno de Caixa
              </Button>
            )}

            <Button
              variant="gold"
              size="sm"
              onClick={handleSimulateNewBillRequest}
              className="text-xs font-semibold shadow-xs"
              title="Simular garçom ou cliente pedindo a conta em uma mesa"
            >
              <BellRing className="w-3.5 h-3.5 mr-1" />
              Simular Pedir Conta
            </Button>
          </div>
        </div>

        {/* SECTION 1: FILA PRIORITÁRIA "PEDIR CONTA" */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                Fila de Fechamento (&ldquo;Pedir Conta&rdquo;)
                <Badge variant="danger" size="md">
                  {billRequests.length} chamada{billRequests.length !== 1 ? "s" : ""}
                </Badge>
              </h2>
            </div>
            <span className="text-xs text-stone-500">
              Atenda os chamados para conferir e liberar as mesas com agilidade
            </span>
          </div>

          {billRequests.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-stone-200 text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-stone-800">
                Nenhuma mesa solicitando conta no momento
              </h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Todas as mesas estão atendidas ou consumindo normalmente. Quando um garçom ou cliente pedir a conta, ela aparecerá aqui em tempo real.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {billRequests.map((order) => {
                const isUnderConference = order.status === "CONFERENCIA";
                return (
                  <div
                    key={order.id}
                    className={`relative bg-white p-5 rounded-3xl border-2 shadow-sm transition-all hover:shadow-md ${
                      isUnderConference
                        ? "border-amber-400 bg-amber-50/30"
                        : "border-rose-400/90 ring-4 ring-rose-500/10"
                    }`}
                  >
                    {/* Urgency header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-lg shadow-xs ${
                            isUnderConference
                              ? "bg-amber-500 text-white"
                              : "bg-rose-600 text-white animate-pulse"
                          }`}
                        >
                          #{order.tableNumber || "B"}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-stone-900">
                            {order.tableNumber ? `Mesa ${order.tableNumber}` : "Balcão"}
                          </h3>
                          <span className="text-xs text-stone-500">
                            {order.customerName || "Consumidor"} · Comanda #{order.orderNumber}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant={isUnderConference ? "warning" : "danger"}
                        size="sm"
                      >
                        {isUnderConference ? "Em Conferência" : "Aguardando Caixa"}
                      </Badge>
                    </div>

                    {/* Order summary info */}
                    <div className="space-y-1.5 py-3 border-y border-stone-100 text-xs text-stone-600">
                      <div className="flex justify-between">
                        <span>Itens consumidos:</span>
                        <strong className="text-stone-900">
                          {order.items
                            .filter((i) => i.status !== "CANCELADO")
                            .reduce((acc, i) => acc + i.quantity, 0)}{" "}
                          itens
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Atendente responsável:</span>
                        <span className="text-stone-800">{order.waiterName || "Carlos E."}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-extrabold text-stone-900 pt-1">
                        <span>Valor Total Previsto:</span>
                        <span className="text-amber-700 font-black">
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-3">
                      <Button
                        variant={isUnderConference ? "gold" : "primary"}
                        size="md"
                        onClick={() => handleStartReview(order)}
                        className="w-full text-xs font-bold shadow-xs"
                      >
                        <Receipt className="w-4 h-4 mr-1.5" />
                        Conferir &amp; Fechar Conta
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: MAPA GERAL DAS MESAS DO SALÃO */}
        <div className="space-y-3 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Grid3X3 className="w-5 h-5 text-stone-600" />
              <h2 className="text-base font-bold text-stone-900">
                Mapa das Mesas &amp; Ambientes
              </h2>
            </div>

            {/* Sector Tabs */}
            <div className="flex items-center gap-1 bg-stone-200/60 p-1 rounded-xl text-xs overflow-x-auto">
              <button
                type="button"
                onClick={() => setSelectedSector("ALL")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  selectedSector === "ALL"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Todas ({tables.length})
              </button>
              {(["SALAO_PRINCIPAL", "VARANDA", "DECK", "BALCAO"] as TableSector[]).map(
                (sector) => (
                  <button
                    key={sector}
                    type="button"
                    onClick={() => setSelectedSector(sector)}
                    className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
                      selectedSector === sector
                        ? "bg-white text-stone-900 shadow-xs"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    {getSectorLabel(sector)}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Tables Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredTables.map((table) => {
              const statusStyles = {
                LIVRE: "bg-emerald-50/60 border-emerald-300 text-emerald-950 hover:bg-emerald-100/70",
                OCUPADA: "bg-sky-50/80 border-sky-300 text-sky-950 hover:bg-sky-100",
                PEDINDO_CONTA: "bg-rose-50 border-rose-400 text-rose-950 ring-2 ring-rose-400/40 animate-pulse",
                RESERVADA: "bg-purple-50/60 border-purple-300 text-purple-950",
                MANUTENCAO: "bg-stone-100 border-stone-300 text-stone-500 opacity-60 cursor-not-allowed",
              };

              const badgeColors = {
                LIVRE: "success" as const,
                OCUPADA: "info" as const,
                PEDINDO_CONTA: "danger" as const,
                RESERVADA: "purple" as const,
                MANUTENCAO: "neutral" as const,
              };

              const currentOrder = table.currentOrderId
                ? store.getOrderById(table.currentOrderId)
                : undefined;

              return (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => handleTableClick(table)}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all shadow-2xs ${
                    statusStyles[table.status]
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-base font-extrabold">{table.name}</span>
                    <Badge variant={badgeColors[table.status]} size="sm">
                      {getStatusLabel(table.status)}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-[11px] text-stone-600">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-stone-400" />
                      <span>{table.seats} lugares</span>
                    </div>

                    {currentOrder && (
                      <div className="font-bold text-stone-900 pt-1 text-xs">
                        {formatCurrency(currentOrder.total)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL 1: Conferência da Conta */}
      <BillReviewModal
        isOpen={!!reviewOrder}
        onClose={() => setReviewOrder(null)}
        order={reviewOrder}
        onProceedToPayment={(order) => {
          setReviewOrder(null);
          setPaymentOrder(order);
        }}
      />

      {/* MODAL 2: Pagamento & Múltiplos Meios */}
      <PaymentModal
        isOpen={!!paymentOrder}
        onClose={() => setPaymentOrder(null)}
        order={paymentOrder}
        onPaymentSuccess={(receipt) => {
          setPaymentOrder(null);
          setLastReceipt(receipt);
        }}
      />

      {/* MODAL 3: Cupom Térmico & Impressão */}
      <ReceiptModal
        isOpen={!!lastReceipt}
        onClose={() => setLastReceipt(null)}
        receipt={lastReceipt}
      />

      {/* MODAL 4: Abertura / Sangria / Fechamento de Caixa */}
      {cashModalMode && (
        <CashSessionModal
          isOpen={!!cashModalMode}
          onClose={() => setCashModalMode(null)}
          mode={cashModalMode}
          session={activeSession}
        />
      )}
    </ProtectedRoute>
  );
}

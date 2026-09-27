"use client";

import React, { useEffect, useState } from "react";
import { store } from "@/lib/store";
import { Order, PaymentMethod } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Printer,
  Tag,
  FileSpreadsheet,
} from "lucide-react";

export default function AdminReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | "ALL">("ALL");
  const [filterWithDiscount, setFilterWithDiscount] = useState(false);

  useEffect(() => {
    const update = () => {
      setOrders(store.getPaidOrdersHistory());
    };
    update();
    return store.subscribe(update);
  }, []);

  const filteredOrders = orders.filter((o) => {
    const matchesMethod =
      selectedMethod === "ALL" || o.payments.some((p) => p.method === selectedMethod);
    const matchesDiscount = !filterWithDiscount || !!o.discount;
    return matchesMethod && matchesDiscount;
  });

  const totalRevenue = filteredOrders.reduce((acc, o) => acc + o.total, 0);
  const totalDiscounts = filteredOrders.reduce(
    (acc, o) => acc + (o.discount?.calculatedAmount || 0),
    0
  );
  const totalServiceFees = filteredOrders.reduce((acc, o) => acc + o.serviceFeeAmount, 0);
  const averageTicket = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;

  const handleExportCSV = () => {
    const headers = [
      "Pedido",
      "Mesa",
      "Cliente",
      "Data Fechamento",
      "Subtotal",
      "Desconto",
      "Motivo Desconto",
      "Taxa Servico",
      "Total",
      "Formas Pagamento",
    ];

    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      o.tableNumber ? `Mesa ${o.tableNumber}` : "Balcao",
      `"${o.customerName || "Consumidor"}"`,
      formatDateTime(o.closedAt || o.createdAt),
      o.subtotal.toFixed(2),
      (o.discount?.calculatedAmount || 0).toFixed(2),
      `"${o.discount?.reason || ""}"`,
      o.serviceFeeAmount.toFixed(2),
      o.total.toFixed(2),
      `"${o.payments.map((p) => `${p.method}:${p.amount.toFixed(2)}`).join(" | ")}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_vendas_doceria_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl shadow-sm border border-stone-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-stone-900 tracking-tight">
                Relatórios Financeiros &amp; Vendas
              </h1>
              <p className="text-xs text-stone-500">
                Auditoria de vendas, descontos concedidos e fechamentos de pedidos
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1.5" />
              Imprimir
            </Button>
            <Button variant="primary" size="sm" onClick={handleExportCSV}>
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-sm">
            <span className="text-xs font-bold text-stone-500 uppercase">Receita Líquida</span>
            <span className="text-xl font-black text-stone-900 mt-1 block">
              {formatCurrency(totalRevenue)}
            </span>
            <span className="text-[11px] text-stone-500 mt-1 block">
              {filteredOrders.length} pedidos liquidados
            </span>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-sm">
            <span className="text-xs font-bold text-stone-500 uppercase">Ticket Médio</span>
            <span className="text-xl font-black text-stone-900 mt-1 block">
              {formatCurrency(averageTicket)}
            </span>
            <span className="text-[11px] text-stone-500 mt-1 block">
              Por mesa / atendimento
            </span>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-sm">
            <span className="text-xs font-bold text-stone-500 uppercase">Descontos Concedidos</span>
            <span className="text-xl font-black text-rose-700 mt-1 block">
              {formatCurrency(totalDiscounts)}
            </span>
            <span className="text-[11px] text-stone-500 mt-1 block">
              Auditoria de concessões
            </span>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-sm">
            <span className="text-xs font-bold text-stone-500 uppercase">Taxa de Serviço</span>
            <span className="text-xl font-black text-emerald-700 mt-1 block">
              {formatCurrency(totalServiceFees)}
            </span>
            <span className="text-[11px] text-stone-500 mt-1 block">
              10% repasse garçons
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-stone-700">Filtrar Meio:</span>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value as PaymentMethod | "ALL")}
              className="p-1.5 rounded-lg border border-stone-300 font-medium bg-white"
            >
              <option value="ALL">Todas as Formas de Pagamento</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="CARTAO_CREDITO">Cartão de Crédito</option>
              <option value="CARTAO_DEBITO">Cartão de Débito</option>
              <option value="PIX">PIX</option>
              <option value="VALE_REFEICAO">Vale Refeição</option>
            </select>

            <button
              type="button"
              onClick={() => setFilterWithDiscount(!filterWithDiscount)}
              className={`px-3 py-1.5 rounded-lg font-semibold border transition-all ${
                filterWithDiscount
                  ? "bg-amber-100 border-amber-300 text-amber-900"
                  : "bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200"
              }`}
            >
              <Tag className="w-3 h-3 inline mr-1" />
              Apenas com Desconto ({orders.filter((o) => o.discount).length})
            </button>
          </div>

          <div className="text-stone-500">
            Mostrando <strong>{filteredOrders.length}</strong> de {orders.length} pedidos
          </div>
        </div>

        {/* Orders Detailed Table */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-stone-200 bg-stone-50/70 text-xs font-bold text-stone-700 grid grid-cols-12 gap-2">
            <span className="col-span-2">Comanda / Local</span>
            <span className="col-span-3">Cliente / Atendente</span>
            <span className="col-span-2">Fechamento</span>
            <span className="col-span-2 text-right">Subtotal / Desconto</span>
            <span className="col-span-3 text-right">Total Pago / Meios</span>
          </div>

          <div className="divide-y divide-stone-100 text-xs">
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-stone-400">
                Nenhum pedido atende aos filtros selecionados.
              </div>
            ) : (
              filteredOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 grid grid-cols-12 gap-2 items-center hover:bg-stone-50/80 transition-colors"
                >
                  <div className="col-span-2">
                    <div className="font-bold text-stone-900">
                      #{ord.orderNumber} · {ord.tableNumber ? `Mesa ${ord.tableNumber}` : "Balcão"}
                    </div>
                    <div className="text-[10px] text-stone-500">
                      {ord.items.length} itens consumidos
                    </div>
                  </div>

                  <div className="col-span-3">
                    <div className="font-medium text-stone-900">
                      {ord.customerName || "Consumidor Final"}
                    </div>
                    <div className="text-[10px] text-stone-500">
                      Garçom: {ord.waiterName || "Carlos E."}
                    </div>
                  </div>

                  <div className="col-span-2 text-stone-600 text-[11px]">
                    {formatDateTime(ord.closedAt || ord.createdAt)}
                  </div>

                  <div className="col-span-2 text-right">
                    <div className="text-stone-700">{formatCurrency(ord.subtotal)}</div>
                    {ord.discount ? (
                      <div className="text-rose-600 font-semibold text-[10px]" title={ord.discount.reason}>
                        - {formatCurrency(ord.discount.calculatedAmount)} ({ord.discount.type === "PERCENTUAL" ? `${ord.discount.value}%` : "R$"})
                      </div>
                    ) : (
                      <div className="text-stone-400 text-[10px]">Sem desconto</div>
                    )}
                  </div>

                  <div className="col-span-3 text-right">
                    <div className="font-extrabold text-amber-900 text-sm">
                      {formatCurrency(ord.total)}
                    </div>
                    <div className="text-[10px] text-stone-500 truncate">
                      {ord.payments.map((p) => `${p.method.replace("_", " ")} (${formatCurrency(p.amount)})`).join(", ")}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

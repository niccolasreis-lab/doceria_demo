"use client";

import React, { useEffect, useState } from "react";
import { store } from "@/lib/store";
import { DailySummaryMetric, CashRegisterSession } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { ProtectedRoute } from "@/components/layout/protected-route";
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Users,
  Clock,
  Sparkles,
  ArrowUpRight,
  CreditCard,
  Cake,
  Activity,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DailySummaryMetric>(store.getDailySummaryMetrics());
  const [activeSession, setActiveSession] = useState<CashRegisterSession | undefined>(
    store.getActiveSession()
  );

  useEffect(() => {
    const update = () => {
      setMetrics(store.getDailySummaryMetrics());
      setActiveSession(store.getActiveSession());
    };
    update();
    return store.subscribe(update);
  }, []);

  const maxRevenueHour = Math.max(...metrics.revenueByHour.map((h) => h.revenue), 1);

  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl shadow-sm border border-stone-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-700 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-stone-900 tracking-tight">
                Painel Gerencial em Tempo Real
              </h1>
              <p className="text-xs text-stone-500">
                Visão holística de vendas, fluxo de salão e desempenho da Doceria do Sr. Gilmar
              </p>
            </div>
          </div>

          {/* Real-time Indicator */}
          <div className="flex items-center space-x-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-bold text-emerald-800">
              Sincronização Ao Vivo
            </span>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Faturamento */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
                  Faturamento do Dia
                </span>
                <span className="text-2xl font-black text-stone-900 mt-1 block">
                  {formatCurrency(metrics.totalRevenue)}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-xs text-emerald-700 font-semibold gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+18.4% em relação a ontem</span>
            </div>
          </div>

          {/* Ticket Médio */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
                  Ticket Médio / Conta
                </span>
                <span className="text-2xl font-black text-stone-900 mt-1 block">
                  {formatCurrency(metrics.averageTicket)}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-xs text-stone-500">
              Média baseada em <strong>{metrics.ordersCount}</strong> pedidos fechados
            </div>
          </div>

          {/* Pedidos & Itens */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
                  Itens Vendidos
                </span>
                <span className="text-2xl font-black text-stone-900 mt-1 block">
                  {metrics.itemsSoldCount} <span className="text-sm font-medium text-stone-500">un</span>
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-xs text-stone-500">
              Taxa de conversão de cardápio alta
            </div>
          </div>

          {/* Ocupação do Salão */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
                  Ocupação de Mesas
                </span>
                <span className="text-2xl font-black text-stone-900 mt-1 block">
                  {metrics.occupiedTables + metrics.waitingBillTables} / {metrics.totalTables}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="text-rose-600 font-bold">
                {metrics.waitingBillTables} pedindo conta
              </span>
              <span>·</span>
              <span className="text-stone-500">
                {metrics.totalTables - (metrics.occupiedTables + metrics.waitingBillTables)} livres
              </span>
            </div>
          </div>
        </div>

        {/* 2 Big Charts: Hourly Sales & Payment Methods Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Vendas por Horário */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-stone-900">
                  Curva de Vendas por Horário (Horários de Pico)
                </h3>
                <p className="text-xs text-stone-500">
                  Volume transacionado nas faixas de atendimento
                </p>
              </div>
              <Clock className="w-4 h-4 text-stone-400" />
            </div>

            {/* Custom SVG/HTML Bar Chart */}
            <div className="pt-6 pb-2">
              <div className="h-44 flex items-end justify-between gap-2 sm:gap-4 px-2">
                {metrics.revenueByHour.map((item, idx) => {
                  const heightPercent = Math.max(15, Math.round((item.revenue / maxRevenueHour) * 100));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 whitespace-nowrap">
                        {formatCurrency(item.revenue)}
                      </div>
                      <div className="w-full bg-stone-100 rounded-t-xl h-full flex items-end overflow-hidden">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-xl transition-all group-hover:from-amber-700 group-hover:to-amber-500"
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-stone-600">
                        {item.hour}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Formas de Pagamento */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-stone-900">
                  Mix de Meios de Pagamento
                </h3>
                <p className="text-xs text-stone-500">
                  Proporção de recebimento no caixa hoje
                </p>
              </div>
              <CreditCard className="w-4 h-4 text-stone-400" />
            </div>

            <div className="space-y-3 pt-2">
              {metrics.revenueByPaymentMethod.map((item) => (
                <div key={item.method} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-stone-700">
                    <span>{item.label}</span>
                    <span>
                      {formatCurrency(item.amount)}{" "}
                      <span className="text-stone-400 font-normal">({item.percentage}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${item.percentage}%` }}
                      className="bg-amber-600 h-full rounded-full transition-all"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Products & Active Cash Status */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Top 5 Best Sellers */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-stone-900">
                  Top 5 Campeões de Venda da Doceria
                </h3>
                <p className="text-xs text-stone-500">
                  Itens com maior rentabilidade e volume de pedidos
                </p>
              </div>
              <Cake className="w-4 h-4 text-stone-400" />
            </div>

            <div className="divide-y divide-stone-100">
              {metrics.topSellingProducts.map((p, idx) => (
                <div key={p.productId} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-stone-900">{p.productName}</div>
                      <div className="text-[11px] text-stone-500">
                        {p.quantity} unidades comercializadas
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-black text-amber-800 text-sm">
                    {formatCurrency(p.revenue)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Cashier Shift Monitor */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-stone-900">
                  Auditoria de Caixa Ativo
                </h3>
                <p className="text-xs text-stone-500">
                  Status da gaveta e movimentações
                </p>
              </div>
              <Activity className="w-4 h-4 text-stone-400" />
            </div>

            {activeSession ? (
              <div className="space-y-3 pt-2">
                <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Operador:</span>
                    <strong className="text-stone-900">{activeSession.operatorName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Fundo Inicial:</span>
                    <strong className="text-stone-900">{formatCurrency(activeSession.initialCash)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Total Vendas Acumuladas:</span>
                    <strong className="text-emerald-700">{formatCurrency(activeSession.totalSales)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Sangrias Efetuadas:</span>
                    <strong className="text-rose-700">{formatCurrency(activeSession.totalSangrias)}</strong>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-stone-200 font-bold text-sm">
                    <span>Espécie em Gaveta:</span>
                    <span className="text-amber-800">{formatCurrency(activeSession.expectedInCash)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-stone-50 rounded-2xl border border-dashed border-stone-300 text-center text-xs text-stone-500">
                Nenhum turno de caixa aberto no momento.
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { store } from "@/lib/store";
import { CashRegisterSession } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  Unlock,
  Printer,
  Eye,
  CheckCircle2,
  FileCheck,
} from "lucide-react";

export default function CashSessionsAdminPage() {
  const [sessions, setSessions] = useState<CashRegisterSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<CashRegisterSession | null>(null);

  useEffect(() => {
    const update = () => {
      setSessions(store.getAllCashSessions());
    };
    update();
    return store.subscribe(update);
  }, []);

  const handlePrintSessionReport = () => {
    window.print();
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl shadow-sm border border-stone-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-stone-900 tracking-tight">
                Histórico &amp; Auditoria de Fechamento de Caixa
              </h1>
              <p className="text-xs text-stone-500">
                Auditoria de turnos operacionais, sangrias, quebra de caixa e conciliação cega
              </p>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="space-y-4">
          {sessions.map((session) => {
            const isOpen = session.status === "ABERTO";
            const diff = session.differenceInCash || 0;
            const hasDifference = !isOpen && Math.abs(diff) > 0.01;

            return (
              <div
                key={session.id}
                className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4"
              >
                {/* Session Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                        isOpen
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-stone-100 text-stone-700"
                      }`}
                    >
                      {isOpen ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-stone-900">
                          Turno de {session.operatorName}
                        </h3>
                        <Badge variant={isOpen ? "success" : "neutral"} size="sm">
                          {isOpen ? "Turno Ativo / Aberto" : "Fechado & Conciliado"}
                        </Badge>
                      </div>
                      <p className="text-xs text-stone-500">
                        Aberto em: <strong>{formatDateTime(session.openedAt)}</strong>
                        {session.closedAt && (
                          <span> · Encerrado em: <strong>{formatDateTime(session.closedAt)}</strong></span>
                        )}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSession(session)}
                    className="text-xs self-start sm:self-auto"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Extrato Completo Z
                  </Button>
                </div>

                {/* Session Financial Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
                    <span className="text-stone-500 block text-[11px]">Fundo Inicial</span>
                    <strong className="text-stone-900 font-bold text-sm">
                      {formatCurrency(session.initialCash)}
                    </strong>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
                    <span className="text-stone-500 block text-[11px]">Total Vendas</span>
                    <strong className="text-emerald-700 font-bold text-sm">
                      {formatCurrency(session.totalSales)}
                    </strong>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
                    <span className="text-stone-500 block text-[11px]">Sangrias (Cofre)</span>
                    <strong className="text-rose-700 font-bold text-sm">
                      - {formatCurrency(session.totalSangrias)}
                    </strong>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
                    <span className="text-stone-500 block text-[11px]">Espécie Esperada</span>
                    <strong className="text-amber-800 font-bold text-sm">
                      {formatCurrency(session.expectedInCash)}
                    </strong>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
                    <span className="text-stone-500 block text-[11px]">Diferença / Quebra</span>
                    {isOpen ? (
                      <span className="text-stone-400 font-medium">Em andamento</span>
                    ) : hasDifference ? (
                      <strong className={diff > 0 ? "text-emerald-700" : "text-rose-700 font-bold"}>
                        {diff > 0 ? `+ Sobra: ${formatCurrency(diff)}` : `Falta: ${formatCurrency(diff)}`}
                      </strong>
                    ) : (
                      <strong className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> R$ 0,00 (Exato)
                      </strong>
                    )}
                  </div>
                </div>

                {/* Sales Breakdown by Payment Method */}
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 text-xs">
                  <span className="font-bold text-stone-700 block mb-2">
                    Vendas por Forma de Pagamento no Turno
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(session.salesByMethod).map(([method, amount]) => (
                      <span
                        key={method}
                        className="px-2.5 py-1 bg-white rounded-lg border border-stone-200 text-stone-700 font-medium"
                      >
                        {method.replace("_", " ")}: <strong>{formatCurrency(amount)}</strong>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Notes if closed */}
                {session.notes && (
                  <p className="text-xs text-stone-600 italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/50">
                    <strong>Obs do operador:</strong> {session.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Session Details / Resumo Z Modal */}
      {selectedSession && (
        <Modal
          isOpen={!!selectedSession}
          onClose={() => setSelectedSession(null)}
          title={
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-amber-600" />
              <span>Extrato de Fechamento de Turno (Resumo Z)</span>
            </div>
          }
          description={`Operador: ${selectedSession.operatorName} · Aberto em ${formatDateTime(selectedSession.openedAt)}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs font-mono">
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 leading-relaxed">
              <div className="text-center font-bold pb-2 border-b border-dashed border-stone-300">
                <div className="text-sm font-black">DOCERIA DO SR GILMAR LTDA</div>
                <div>RELATÓRIO FISCAL DE FECHAMENTO Z</div>
              </div>

              <div className="space-y-1 py-1 border-b border-dashed border-stone-300 text-[11px]">
                <div className="flex justify-between">
                  <span>OPERADOR:</span>
                  <span>{selectedSession.operatorName}</span>
                </div>
                <div className="flex justify-between">
                  <span>DATA/HORA ABERTURA:</span>
                  <span>{formatDateTime(selectedSession.openedAt)}</span>
                </div>
                {selectedSession.closedAt && (
                  <div className="flex justify-between">
                    <span>DATA/HORA FECHAMENTO:</span>
                    <span>{formatDateTime(selectedSession.closedAt)}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1 py-1 border-b border-dashed border-stone-300 text-[11px]">
                <div className="flex justify-between font-bold">
                  <span>FUNDO DE ABERTURA:</span>
                  <span>{formatCurrency(selectedSession.initialCash)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>TOTAL DE VENDAS:</span>
                  <span>{formatCurrency(selectedSession.totalSales)}</span>
                </div>
                <div className="flex justify-between text-rose-700">
                  <span>TOTAL SANGRIA:</span>
                  <span>- {formatCurrency(selectedSession.totalSangrias)}</span>
                </div>
                <div className="flex justify-between">
                  <span>TOTAL SUPRIMENTOS:</span>
                  <span>+ {formatCurrency(selectedSession.totalSuprimentos)}</span>
                </div>
              </div>

              <div className="space-y-1 py-1 border-b border-dashed border-stone-300 text-[11px]">
                <div className="font-bold mb-1">DISCRIMINAÇÃO POR MEIO:</div>
                {Object.entries(selectedSession.salesByMethod).map(([m, a]) => (
                  <div key={m} className="flex justify-between">
                    <span>{m.replace("_", " ")}:</span>
                    <span>{formatCurrency(a)}</span>
                  </div>
                ))}
              </div>

              {selectedSession.declaredAmounts && (
                <div className="space-y-1 py-1 text-[11px]">
                  <div className="font-bold mb-1">CONCILIAÇÃO CEGA:</div>
                  <div className="flex justify-between">
                    <span>DINHEIRO DECLARADO:</span>
                    <span>{formatCurrency(selectedSession.declaredAmounts.DINHEIRO || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DINHEIRO ESPERADO:</span>
                    <span>{formatCurrency(selectedSession.expectedInCash)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t border-stone-300">
                    <span>DIFERENÇA / QUEBRA:</span>
                    <span
                      className={
                        (selectedSession.differenceInCash || 0) < 0
                          ? "text-rose-700"
                          : "text-emerald-700"
                      }
                    >
                      {formatCurrency(selectedSession.differenceInCash || 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
              <Button variant="outline" size="sm" onClick={() => setSelectedSession(null)}>
                Fechar
              </Button>
              <Button variant="primary" size="sm" onClick={handlePrintSessionReport}>
                <Printer className="w-4 h-4 mr-1.5" />
                Imprimir Resumo Z
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </ProtectedRoute>
  );
}

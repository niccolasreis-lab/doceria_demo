"use client";

import React, { useEffect, useState } from "react";
import { store } from "@/lib/store";
import { ReceiptData } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { ReceiptModal } from "@/components/pos/receipt-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Printer,
  Eye,
  FileText,
} from "lucide-react";

export default function CashierHistoryPage() {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);

  useEffect(() => {
    const update = () => {
      setReceipts(store.getReceipts());
    };
    update();
    return store.subscribe(update);
  }, []);

  const filteredReceipts = receipts.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.orderNumber.toString().includes(term) ||
      r.customerName?.toLowerCase().includes(term) ||
      (r.tableNumber && `mesa ${r.tableNumber}`.includes(term)) ||
      r.receiptId.toLowerCase().includes(term)
    );
  });

  return (
    <ProtectedRoute allowedRoles={["CAIXA", "ADMIN", "GARCOM"]}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl shadow-sm border border-stone-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-stone-900 tracking-tight">
                Histórico de Cupons &amp; Reimpressão
              </h1>
              <p className="text-xs text-stone-500">
                Consulte e reimprima comprovantes térmicos emitidos pelo caixa
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por Nº comanda, mesa, cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Table List of Receipts */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50 text-xs font-bold text-stone-700">
            <span>Comprovantes Emitidos ({filteredReceipts.length})</span>
            <span className="text-stone-400">Total emitido: {formatCurrency(receipts.reduce((acc, r) => acc + r.total, 0))}</span>
          </div>

          {filteredReceipts.length === 0 ? (
            <div className="text-center py-12 text-xs text-stone-400">
              Nenhum cupom encontrado para o filtro pesquisado.
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {filteredReceipts.map((rcpt) => (
                <div
                  key={rcpt.receiptId}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/80 transition-colors text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 font-bold flex items-center justify-center">
                      #{rcpt.orderNumber}
                    </div>
                    <div>
                      <div className="font-bold text-stone-900 text-sm flex items-center gap-2">
                        {rcpt.tableNumber ? `Mesa ${rcpt.tableNumber}` : "Balcão / Viagem"}
                        <Badge variant="neutral" size="sm">
                          {rcpt.items.length} itens
                        </Badge>
                      </div>
                      <div className="text-stone-500 text-[11px] flex items-center gap-2 mt-0.5">
                        <span>{formatDateTime(rcpt.issuedAt)}</span>
                        <span>·</span>
                        <span>Op: {rcpt.cashierName}</span>
                        <span>·</span>
                        <span>Cliente: {rcpt.customerName || "Consumidor"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Breakdown & Total */}
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <div className="font-extrabold text-stone-900 text-sm">
                        {formatCurrency(rcpt.total)}
                      </div>
                      <div className="text-[10px] text-stone-500">
                        {rcpt.payments.map((p) => p.method.replace("_", " ")).join(", ")}
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedReceipt(rcpt)}
                        className="text-xs"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Ver Cupom
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedReceipt(rcpt);
                          setTimeout(() => window.print(), 200);
                        }}
                        className="text-xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reissue Receipt Modal */}
      <ReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        receipt={selectedReceipt}
      />
    </ProtectedRoute>
  );
}

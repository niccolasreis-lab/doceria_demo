"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CashRegisterSession, PaymentMethod } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { store } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import {
  Lock,
  Unlock,
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  AlertTriangle,
} from "lucide-react";

interface CashSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "OPEN" | "CLOSE" | "SANGRIA" | "SUPRIMENTO" | "STATUS";
  session?: CashRegisterSession;
}

export function CashSessionModal({
  isOpen,
  onClose,
  mode: initialMode,
  session,
}: CashSessionModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"OPEN" | "CLOSE" | "SANGRIA" | "SUPRIMENTO" | "STATUS">(
    initialMode
  );

  // Open inputs
  const [initialCashInput, setInitialCashInput] = useState<string>("250.00");

  // Movement inputs
  const [movementAmount, setMovementAmount] = useState<string>("");
  const [movementReason, setMovementReason] = useState<string>("");

  // Close inputs
  const [declaredCash, setDeclaredCash] = useState<string>("");
  const [declaredCredit, setDeclaredCredit] = useState<string>("");
  const [declaredDebit, setDeclaredDebit] = useState<string>("");
  const [declaredPix, setDeclaredPix] = useState<string>("");
  const [declaredVR, setDeclaredVR] = useState<string>("");
  const [closeNotes, setCloseNotes] = useState<string>("");

  const [errorMsg, setErrorMsg] = useState<string>("");

  const activeSession = session || store.getActiveSession();

  const handleOpenCash = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(initialCashInput.replace(",", ".")) || 0;
    if (val < 0) {
      setErrorMsg("O valor de fundo de caixa não pode ser negativo.");
      return;
    }
    store.openCashSession(user?.id || "caixa-1", user?.name || "Mariana Silva", val);
    onClose();
  };

  const handleMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(movementAmount.replace(",", ".")) || 0;
    if (val <= 0) {
      setErrorMsg("Informe um valor válido maior que zero.");
      return;
    }
    if (!movementReason.trim()) {
      setErrorMsg("Informe o motivo da movimentação.");
      return;
    }

    if (activeTab === "SANGRIA" && activeSession && val > activeSession.expectedInCash) {
      setErrorMsg(
        `Sangria (${formatCurrency(val)}) excede o saldo em dinheiro no caixa (${formatCurrency(activeSession.expectedInCash)}).`
      );
      return;
    }

    store.addCashMovement(
      activeTab === "SANGRIA" ? "SANGRIA" : "SUPRIMENTO",
      val,
      movementReason.trim(),
      user?.name || "Operador"
    );

    setMovementAmount("");
    setMovementReason("");
    onClose();
  };

  const handleCloseCash = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    const declared: Record<PaymentMethod, number> = {
      DINHEIRO: parseFloat(declaredCash.replace(",", ".")) || 0,
      CARTAO_CREDITO: parseFloat(declaredCredit.replace(",", ".")) || (activeSession.salesByMethod.CARTAO_CREDITO || 0),
      CARTAO_DEBITO: parseFloat(declaredDebit.replace(",", ".")) || (activeSession.salesByMethod.CARTAO_DEBITO || 0),
      PIX: parseFloat(declaredPix.replace(",", ".")) || (activeSession.salesByMethod.PIX || 0),
      VALE_REFEICAO: parseFloat(declaredVR.replace(",", ".")) || (activeSession.salesByMethod.VALE_REFEICAO || 0),
    };

    store.closeCashSession(activeSession.id, declared, closeNotes);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-amber-600" />
          <span>Gestão do Caixa Operacional</span>
        </div>
      }
      description={
        activeSession
          ? `Caixa Aberto por ${activeSession.operatorName} desde ${formatDateTime(activeSession.openedAt)}`
          : "Nenhum turno de caixa aberto no momento"
      }
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Navigation tabs */}
        <div className="flex border-b border-stone-200 pb-2 gap-2 text-xs font-semibold overflow-x-auto">
          {activeSession ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("STATUS");
                  setErrorMsg("");
                }}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === "STATUS"
                    ? "bg-amber-600 text-white"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                Status Atual
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("SANGRIA");
                  setErrorMsg("");
                }}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === "SANGRIA"
                    ? "bg-amber-600 text-white"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                Sangria (Retirada)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("SUPRIMENTO");
                  setErrorMsg("");
                }}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === "SUPRIMENTO"
                    ? "bg-amber-600 text-white"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                Suprimento (Entrada)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("CLOSE");
                  setErrorMsg("");
                  if (activeSession) {
                    setDeclaredCash(activeSession.expectedInCash.toFixed(2));
                    setDeclaredCredit((activeSession.salesByMethod.CARTAO_CREDITO || 0).toFixed(2));
                    setDeclaredDebit((activeSession.salesByMethod.CARTAO_DEBITO || 0).toFixed(2));
                    setDeclaredPix((activeSession.salesByMethod.PIX || 0).toFixed(2));
                    setDeclaredVR((activeSession.salesByMethod.VALE_REFEICAO || 0).toFixed(2));
                  }
                }}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === "CLOSE"
                    ? "bg-rose-600 text-white"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                Fechar Turno
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab("OPEN")}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white whitespace-nowrap"
            >
              Abrir Turno de Caixa
            </button>
          )}
        </div>

        {/* TAB: OPEN CASH */}
        {activeTab === "OPEN" && !activeSession && (
          <form onSubmit={handleOpenCash} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Fundo de Caixa Inicial (Troco em Espécie)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={initialCashInput}
                  onChange={(e) => setInitialCashInput(e.target.value)}
                  placeholder="200.00"
                  className="w-full text-base font-bold text-stone-900 px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3.5 top-3 text-xs font-bold text-stone-400">
                  BRL
                </span>
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-600 space-y-1">
              <p>
                <strong>Operador:</strong> {user?.name || "Mariana Silva"}
              </p>
              <p>
                <strong>Data/Hora de Abertura:</strong> {new Date().toLocaleString()}
              </p>
            </div>

            {errorMsg && (
              <div className="p-2 bg-rose-50 text-rose-700 text-xs rounded-lg">{errorMsg}</div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" variant="success" size="sm">
                <Unlock className="w-4 h-4 mr-1.5" />
                Confirmar Abertura do Caixa
              </Button>
            </div>
          </form>
        )}

        {/* TAB: STATUS */}
        {activeTab === "STATUS" && activeSession && (
          <div className="space-y-4 pt-2">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-stone-100 rounded-xl">
                <span className="text-stone-500 block">Fundo Inicial</span>
                <span className="text-sm font-bold text-stone-900">
                  {formatCurrency(activeSession.initialCash)}
                </span>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-emerald-700 block">Total Vendas</span>
                <span className="text-sm font-bold text-emerald-900">
                  {formatCurrency(activeSession.totalSales)}
                </span>
              </div>

              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                <span className="text-rose-700 block">Sangrias</span>
                <span className="text-sm font-bold text-rose-900">
                  {formatCurrency(activeSession.totalSangrias)}
                </span>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-amber-800 block">Dinheiro em Gaveta</span>
                <span className="text-sm font-bold text-amber-950">
                  {formatCurrency(activeSession.expectedInCash)}
                </span>
              </div>
            </div>

            {/* Vendas por Meio */}
            <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-2">
              <h4 className="text-xs font-bold text-stone-800">
                Vendas Consolidadas por Forma de Pagamento
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-200">
                  <span className="text-stone-600">Dinheiro:</span>
                  <span className="font-bold">{formatCurrency(activeSession.salesByMethod.DINHEIRO || 0)}</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-200">
                  <span className="text-stone-600">Cartão de Crédito:</span>
                  <span className="font-bold">{formatCurrency(activeSession.salesByMethod.CARTAO_CREDITO || 0)}</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-200">
                  <span className="text-stone-600">Cartão de Débito:</span>
                  <span className="font-bold">{formatCurrency(activeSession.salesByMethod.CARTAO_DEBITO || 0)}</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-200">
                  <span className="text-stone-600">PIX:</span>
                  <span className="font-bold">{formatCurrency(activeSession.salesByMethod.PIX || 0)}</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-200 col-span-2">
                  <span className="text-stone-600">Vale Refeição:</span>
                  <span className="font-bold">{formatCurrency(activeSession.salesByMethod.VALE_REFEICAO || 0)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Fechar Janela
              </Button>
            </div>
          </div>
        )}

        {/* TAB: SANGRIA / SUPRIMENTO */}
        {(activeTab === "SANGRIA" || activeTab === "SUPRIMENTO") && activeSession && (
          <form onSubmit={handleMovement} className="space-y-4 pt-2">
            <div className="p-3 bg-stone-50 rounded-xl text-xs space-y-1">
              <p className="text-stone-600">
                {activeTab === "SANGRIA"
                  ? "Retirada de numerário em espécie da gaveta do caixa para depósito no cofre de segurança."
                  : "Reforço de moedas e cédulas para composição de troco na gaveta do caixa."}
              </p>
              <p className="text-stone-800 font-semibold">
                Dinheiro disponível na gaveta: {formatCurrency(activeSession.expectedInCash)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Valor da Movimentação (R$)
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                value={movementAmount}
                onChange={(e) => setMovementAmount(e.target.value)}
                placeholder="Ex: 100.00"
                className="w-full text-base font-bold text-stone-900 px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Motivo / Justificativa
              </label>
              <input
                type="text"
                value={movementReason}
                onChange={(e) => setMovementReason(e.target.value)}
                placeholder={
                  activeTab === "SANGRIA"
                    ? "Ex: Sangria periódica para cofre central"
                    : "Ex: Reposição de moedas de R$ 1 e notas de R$ 5"
                }
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {errorMsg && (
              <div className="p-2 bg-rose-50 text-rose-700 text-xs rounded-lg">{errorMsg}</div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant={activeTab === "SANGRIA" ? "danger" : "primary"}
                size="sm"
              >
                {activeTab === "SANGRIA" ? (
                  <ArrowDownRight className="w-4 h-4 mr-1.5" />
                ) : (
                  <ArrowUpRight className="w-4 h-4 mr-1.5" />
                )}
                Confirmar {activeTab === "SANGRIA" ? "Sangria" : "Suprimento"}
              </Button>
            </div>
          </form>
        )}

        {/* TAB: CLOSE CASH */}
        {activeTab === "CLOSE" && activeSession && (
          <form onSubmit={handleCloseCash} className="space-y-4 pt-2">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Conferência Cega e Fechamento de Turno
              </p>
              <p>
                Declare os valores contados fisicamente na gaveta e comprovantes de cartão. O sistema registrará qualquer quebra ou sobra de caixa.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Dinheiro em Gaveta (R$)
                </label>
                <input
                  type="number"
                  step="any"
                  value={declaredCash}
                  onChange={(e) => setDeclaredCash(e.target.value)}
                  className="w-full p-2 font-bold rounded-lg border border-stone-300 focus:ring-2 focus:ring-rose-500"
                />
                <span className="text-[10px] text-stone-400">
                  Esperado: {formatCurrency(activeSession.expectedInCash)}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Cartão de Crédito (R$)
                </label>
                <input
                  type="number"
                  step="any"
                  value={declaredCredit}
                  onChange={(e) => setDeclaredCredit(e.target.value)}
                  className="w-full p-2 font-bold rounded-lg border border-stone-300 focus:ring-2 focus:ring-rose-500"
                />
                <span className="text-[10px] text-stone-400">
                  Sistema: {formatCurrency(activeSession.salesByMethod.CARTAO_CREDITO || 0)}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Cartão de Débito (R$)
                </label>
                <input
                  type="number"
                  step="any"
                  value={declaredDebit}
                  onChange={(e) => setDeclaredDebit(e.target.value)}
                  className="w-full p-2 font-bold rounded-lg border border-stone-300 focus:ring-2 focus:ring-rose-500"
                />
                <span className="text-[10px] text-stone-400">
                  Sistema: {formatCurrency(activeSession.salesByMethod.CARTAO_DEBITO || 0)}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  PIX (R$)
                </label>
                <input
                  type="number"
                  step="any"
                  value={declaredPix}
                  onChange={(e) => setDeclaredPix(e.target.value)}
                  className="w-full p-2 font-bold rounded-lg border border-stone-300 focus:ring-2 focus:ring-rose-500"
                />
                <span className="text-[10px] text-stone-400">
                  Sistema: {formatCurrency(activeSession.salesByMethod.PIX || 0)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Observações Finais do Fechamento
              </label>
              <textarea
                rows={2}
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="Ex: Turno encerrado sem divergências, cofre lacrado..."
                className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" variant="danger" size="sm">
                <Lock className="w-4 h-4 mr-1.5" />
                Encerrar Caixa Definitivamente
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { DiscountInfo, DiscountType } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Percent, DollarSign, ShieldAlert, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  currentDiscount?: DiscountInfo;
  onApply: (discount: DiscountInfo) => void;
  onRemove: () => void;
}

export function DiscountModal({
  isOpen,
  onClose,
  subtotal,
  currentDiscount,
  onApply,
  onRemove,
}: DiscountModalProps) {
  const { canApproveHighDiscounts, user } = useAuth();
  const [type, setType] = useState<DiscountType>(currentDiscount?.type || "PERCENTUAL");
  const [valInput, setValInput] = useState<string>(currentDiscount?.value?.toString() || "");
  const [reason, setReason] = useState<string>(currentDiscount?.reason || "");
  const [managerPin, setManagerPin] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const numVal = parseFloat(valInput.replace(",", ".")) || 0;

  let calculatedAmount = 0;
  if (type === "PERCENTUAL") {
    calculatedAmount = (subtotal * numVal) / 100;
  } else {
    calculatedAmount = Math.min(numVal, subtotal);
  }

  // Regra de negócio de desconto:
  // Operador de caixa normal pode conceder até 10% ou até R$ 20,00.
  // Acima disso requer perfil ADMIN ou PIN de gerente "1234".
  const isHighDiscount =
    (type === "PERCENTUAL" && numVal > 10) || (type === "VALOR_FIXO" && numVal > 20);

  const requiresPin = isHighDiscount && !canApproveHighDiscounts;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (numVal <= 0) {
      setErrorMsg("Informe um valor de desconto válido maior que zero.");
      return;
    }

    if (type === "PERCENTUAL" && numVal > 100) {
      setErrorMsg("O desconto percentual não pode ultrapassar 100%.");
      return;
    }

    if (type === "VALOR_FIXO" && numVal > subtotal) {
      setErrorMsg(`O desconto não pode ser maior que o subtotal (${formatCurrency(subtotal)}).`);
      return;
    }

    if (!reason.trim()) {
      setErrorMsg("Informe a justificativa/motivo do desconto para auditoria.");
      return;
    }

    if (requiresPin) {
      if (managerPin !== "1234") {
        setErrorMsg("PIN de gerente inválido para autorizar desconto superior ao limite do caixa. Use '1234'.");
        return;
      }
    }

    onApply({
      type,
      value: numVal,
      calculatedAmount,
      reason: reason.trim(),
      authorizedBy: requiresPin ? "Gerência (PIN 1234)" : user?.name,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Concessão de Desconto na Conta"
      description={`Subtotal da mesa: ${formatCurrency(subtotal)}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Toggle Tipo */}
        <div className="flex rounded-xl bg-stone-100 p-1 border border-stone-200">
          <button
            type="button"
            onClick={() => setType("PERCENTUAL")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              type === "PERCENTUAL"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            Percentual (%)
          </button>
          <button
            type="button"
            onClick={() => setType("VALOR_FIXO")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              type === "VALOR_FIXO"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Valor em Reais (R$)
          </button>
        </div>

        {/* Input Valor */}
        <div>
          <label className="block text-xs font-medium text-stone-700 mb-1">
            {type === "PERCENTUAL" ? "Percentual de Desconto (%)" : "Valor do Desconto (R$)"}
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              min="0"
              value={valInput}
              onChange={(e) => setValInput(e.target.value)}
              placeholder={type === "PERCENTUAL" ? "Ex: 10" : "Ex: 15.00"}
              className="w-full text-base font-bold text-stone-900 px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              autoFocus
            />
            <span className="absolute right-3.5 top-3 text-xs font-bold text-stone-400">
              {type === "PERCENTUAL" ? "%" : "BRL"}
            </span>
          </div>

          {/* Quick presets */}
          <div className="flex gap-2 mt-2">
            {(type === "PERCENTUAL" ? [5, 10, 15, 20] : [5, 10, 20, 50]).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setValInput(preset.toString())}
                className="px-2.5 py-1 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg border border-stone-200"
              >
                {type === "PERCENTUAL" ? `${preset}%` : formatCurrency(preset)}
              </button>
            ))}
          </div>
        </div>

        {/* Preview do Desconto */}
        {numVal > 0 && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center text-xs">
            <span className="text-amber-900 font-medium">Abatimento calculado:</span>
            <span className="text-amber-950 font-bold text-sm">
              - {formatCurrency(calculatedAmount)}
            </span>
          </div>
        )}

        {/* Justificativa / Motivo */}
        <div>
          <label className="block text-xs font-medium text-stone-700 mb-1">
            Motivo / Justificativa do Desconto <span className="text-rose-500">*</span>
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full text-xs font-medium text-stone-900 px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 mb-2 bg-white"
          >
            <option value="">Selecione um motivo prévio...</option>
            <option value="Cortesia fidelidade cliente frequente">Cortesia fidelidade cliente frequente</option>
            <option value="Cupom promocional / Parceria">Cupom promocional / Parceria</option>
            <option value="Desconto de colaborador / família">Desconto de colaborador / família</option>
            <option value="Compensação por atraso no atendimento">Compensação por atraso no atendimento</option>
            <option value="Outro motivo justificado">Outro motivo especificado abaixo</option>
          </select>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ou digite o motivo detalhado..."
            className="w-full text-xs text-stone-900 px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Alerta de Autorização de Gerência */}
        {requiresPin && (
          <div className="p-3.5 bg-amber-50/80 border border-amber-300 rounded-xl space-y-2">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-900">
                  Autorização de Gerência Obrigatória
                </p>
                <p className="text-[11px] text-amber-800">
                  Descontos acima de 10% ou R$ 20,00 exigem liberação do administrador (PIN: 1234).
                </p>
              </div>
            </div>
            <div>
              <input
                type="password"
                maxLength={6}
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
                placeholder="Digite o PIN do Gerente (1234)"
                className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-amber-300 bg-white focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
            {errorMsg}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100">
          {currentDiscount ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => {
                onRemove();
                onClose();
              }}
            >
              Remover Desconto
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              <Check className="w-4 h-4 mr-1" />
              Aplicar Desconto
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

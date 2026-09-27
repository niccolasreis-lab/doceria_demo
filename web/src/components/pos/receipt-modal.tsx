"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ReceiptData } from "@/types";
import { ThermalReceipt } from "./thermal-receipt";
import { Printer, CheckCircle2 } from "lucide-react";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt?: ReceiptData | null;
}

export function ReceiptModal({ isOpen, onClose, receipt }: ReceiptModalProps) {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span className="font-bold text-stone-900">
            Pagamento Concluído com Sucesso!
          </span>
        </div>
      }
      description={`Comprovante Nº ${receipt.orderNumber} emitido em ${new Date(receipt.issuedAt).toLocaleTimeString()}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Receipt Container */}
        <div className="max-h-[60vh] overflow-y-auto bg-stone-100 p-4 rounded-xl border border-stone-200">
          <ThermalReceipt receipt={receipt} />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 no-print">
          <Button variant="outline" size="sm" onClick={onClose}>
            Concluir &amp; Fechar
          </Button>

          <Button variant="primary" size="md" onClick={handlePrint} className="shadow-md">
            <Printer className="w-4 h-4 mr-1.5" />
            Imprimir Cupom Térmico
          </Button>
        </div>
      </div>
    </Modal>
  );
}

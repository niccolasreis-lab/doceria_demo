"use client";

import React from "react";
import { ReceiptData } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface ThermalReceiptProps {
  receipt: ReceiptData;
}

export function ThermalReceipt({ receipt }: ThermalReceiptProps) {
  return (
    <div
      id="thermal-receipt-printable"
      className="bg-white text-stone-900 font-mono text-[11px] leading-tight p-4 border border-stone-200 shadow-xs max-w-[340px] mx-auto"
    >
      {/* Header */}
      <div className="text-center pb-2 border-b border-dashed border-stone-400 space-y-0.5">
        <div className="font-bold text-xs uppercase tracking-wider">{receipt.tradeName}</div>
        <div className="text-[10px] text-stone-600">{receipt.companyName}</div>
        <div className="text-[10px]">CNPJ: {receipt.cnpj}</div>
        <div className="text-[10px]">{receipt.address}</div>
        <div className="text-[10px]">
          {receipt.city} - Tel: {receipt.phone}
        </div>
      </div>

      {/* Info cupom */}
      <div className="py-2 border-b border-dashed border-stone-400 text-[10px] space-y-0.5">
        <div className="flex justify-between font-bold">
          <span>EXTRATO NÃO FISCAL Nº: {receipt.orderNumber}</span>
          <span>{receipt.receiptId.slice(-7)}</span>
        </div>
        <div className="flex justify-between">
          <span>DATA / HORA:</span>
          <span>{formatDateTime(receipt.issuedAt)}</span>
        </div>
        {receipt.tableNumber ? (
          <div className="flex justify-between font-bold">
            <span>MESA / LOCAL:</span>
            <span>MESA {receipt.tableNumber.toString().padStart(2, "0")}</span>
          </div>
        ) : (
          <div className="flex justify-between font-bold">
            <span>BALCÃO / VIAGEM:</span>
            <span>PEDIDO BALCÃO</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>CLIENTE:</span>
          <span>{receipt.customerName || "Consumidor Final"}</span>
        </div>
        {receipt.customerDocument && receipt.customerDocument !== "Não informado" && (
          <div className="flex justify-between">
            <span>CPF/CNPJ:</span>
            <span>{receipt.customerDocument}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>OPERADOR CAIXA:</span>
          <span>{receipt.cashierName}</span>
        </div>
      </div>

      {/* Tabela de Itens */}
      <div className="py-2 border-b border-dashed border-stone-400">
        <div className="grid grid-cols-12 text-[10px] font-bold border-b border-stone-300 pb-1 mb-1">
          <span className="col-span-1">QTD</span>
          <span className="col-span-7">DESCRIÇÃO</span>
          <span className="col-span-2 text-right">VL.UN</span>
          <span className="col-span-2 text-right">TOTAL</span>
        </div>

        <div className="space-y-1">
          {receipt.items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 text-[10px]">
              <span className="col-span-1 font-bold">{item.quantity}x</span>
              <span className="col-span-7 truncate pr-1">{item.name}</span>
              <span className="col-span-2 text-right">{item.unitPrice.toFixed(2)}</span>
              <span className="col-span-2 text-right font-medium">
                {item.totalPrice.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Totais & Descontos */}
      <div className="py-2 border-b border-dashed border-stone-400 text-[10px] space-y-1">
        <div className="flex justify-between">
          <span>SUBTOTAL:</span>
          <span>{formatCurrency(receipt.subtotal)}</span>
        </div>

        {receipt.discountAmount > 0 && (
          <div className="flex justify-between text-rose-700 font-semibold">
            <span>DESCONTO:</span>
            <span>- {formatCurrency(receipt.discountAmount)}</span>
          </div>
        )}

        {receipt.serviceFeeAmount > 0 && (
          <div className="flex justify-between">
            <span>TAXA DE SERVIÇO (10%):</span>
            <span>{formatCurrency(receipt.serviceFeeAmount)}</span>
          </div>
        )}

        <div className="flex justify-between text-xs font-bold pt-1 border-t border-stone-300">
          <span>VALOR TOTAL PAGO:</span>
          <span>{formatCurrency(receipt.total)}</span>
        </div>
      </div>

      {/* Pagamentos */}
      <div className="py-2 border-b border-dashed border-stone-400 text-[10px] space-y-1">
        <div className="font-bold mb-0.5">FORMAS DE PAGAMENTO:</div>
        {receipt.payments.map((p, idx) => (
          <div key={idx} className="flex justify-between">
            <span>{p.method.replace("_", " ")}:</span>
            <span>{formatCurrency(p.amount)}</span>
          </div>
        ))}
        {receipt.trocoTotal > 0 && (
          <div className="flex justify-between font-bold pt-0.5">
            <span>TROCO DEVOLVIDO:</span>
            <span>{formatCurrency(receipt.trocoTotal)}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 text-center text-[9px] text-stone-500 space-y-1">
        <p className="font-bold text-stone-700">OBRIGADO PELA PREFERÊNCIA!</p>
        <p>Volte sempre à Doceria do Sr. Gilmar ❤️</p>
        <p className="text-[8px]">Sistema PDV Gastronômico v1.4.2</p>
      </div>
    </div>
  );
}

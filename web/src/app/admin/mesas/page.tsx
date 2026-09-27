"use client";

import React, { useEffect, useState } from "react";
import { store } from "@/lib/store";
import { Table, TableSector, TableStatus } from "@/types";
import { getSectorLabel, getStatusLabel, formatCurrency } from "@/lib/utils";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Grid3X3,
  Plus,
  Edit2,
  Trash2,
  Users,
  Check,
} from "lucide-react";

export default function AdminTablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedSector, setSelectedSector] = useState<TableSector | "ALL">("ALL");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);

  // Form state
  const [formNumber, setFormNumber] = useState<string>("");
  const [formName, setFormName] = useState<string>("");
  const [formSeats, setFormSeats] = useState<string>("4");
  const [formSector, setFormSector] = useState<TableSector>("SALAO_PRINCIPAL");
  const [formStatus, setFormStatus] = useState<TableStatus>("LIVRE");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    const update = () => {
      setTables(store.getTables());
    };
    update();
    return store.subscribe(update);
  }, []);

  const handleOpenCreateModal = () => {
    const nextNumber = tables.length > 0 ? Math.max(...tables.map((t) => t.number)) + 1 : 1;
    setEditingTable(null);
    setFormNumber(nextNumber.toString());
    setFormName(`Mesa ${nextNumber.toString().padStart(2, "0")}`);
    setFormSeats("4");
    setFormSector("SALAO_PRINCIPAL");
    setFormStatus("LIVRE");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (table: Table) => {
    setEditingTable(table);
    setFormNumber(table.number.toString());
    setFormName(table.name);
    setFormSeats(table.seats.toString());
    setFormSector(table.sector);
    setFormStatus(table.status);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleSaveTable = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const num = parseInt(formNumber);
    const seats = parseInt(formSeats);

    if (!num || num <= 0) {
      setErrorMsg("O número da mesa deve ser maior que zero.");
      return;
    }

    if (!seats || seats <= 0) {
      setErrorMsg("A capacidade deve ser de pelo menos 1 lugar.");
      return;
    }

    // Verifica se já existe outro com esse número
    const existing = tables.find((t) => t.number === num && t.id !== editingTable?.id);
    if (existing) {
      setErrorMsg(`Já existe uma mesa com o número ${num}.`);
      return;
    }

    store.saveTable({
      id: editingTable?.id,
      number: num,
      name: formName.trim() || `Mesa ${num.toString().padStart(2, "0")}`,
      seats,
      sector: formSector,
      status: formStatus,
    });

    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Deseja realmente excluir a mesa "${name}"?`)) {
      store.deleteTable(id);
    }
  };

  const handleQuickStatusChange = (tableId: string, status: TableStatus) => {
    store.updateTableStatus(tableId, status);
  };

  const filteredTables =
    selectedSector === "ALL"
      ? tables
      : tables.filter((t) => t.sector === selectedSector);

  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl shadow-sm border border-stone-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <Grid3X3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-stone-900 tracking-tight">
                Gestão de Mesas &amp; Ambientes
              </h1>
              <p className="text-xs text-stone-500">
                Organização do salão, capacidade de assentos e status em tempo real
              </p>
            </div>
          </div>

          <Button variant="primary" size="md" onClick={handleOpenCreateModal} className="shadow-xs">
            <Plus className="w-4 h-4 mr-1.5" />
            Adicionar Nova Mesa
          </Button>
        </div>

        {/* Sector Tabs Bar */}
        <div className="bg-white p-3.5 rounded-3xl border border-stone-200 shadow-sm flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSelectedSector("ALL")}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                selectedSector === "ALL"
                  ? "bg-amber-600 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Todas as Mesas ({tables.length})
            </button>
            {(["SALAO_PRINCIPAL", "VARANDA", "DECK", "BALCAO"] as TableSector[]).map(
              (sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setSelectedSector(sec)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                    selectedSector === sec
                      ? "bg-amber-600 text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {getSectorLabel(sec)} ({tables.filter((t) => t.sector === sec).length})
                </button>
              )
            )}
          </div>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTables.map((table) => {
            const currentOrder = table.currentOrderId
              ? store.getOrderById(table.currentOrderId)
              : undefined;

            return (
              <div
                key={table.id}
                className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm flex flex-col justify-between hover:border-amber-400 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 font-extrabold flex items-center justify-center text-sm">
                        #{table.number}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-stone-900">{table.name}</h3>
                        <span className="text-[10px] text-stone-400">
                          {getSectorLabel(table.sector)}
                        </span>
                      </div>
                    </div>

                    <Badge
                      variant={
                        table.status === "LIVRE"
                          ? "success"
                          : table.status === "OCUPADA"
                          ? "info"
                          : table.status === "PEDINDO_CONTA"
                          ? "danger"
                          : table.status === "RESERVADA"
                          ? "purple"
                          : "neutral"
                      }
                      size="sm"
                    >
                      {getStatusLabel(table.status)}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 py-3 border-y border-stone-100 text-xs text-stone-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-stone-400" />
                        Capacidade:
                      </span>
                      <strong>{table.seats} lugares</strong>
                    </div>

                    {currentOrder && (
                      <div className="flex items-center justify-between pt-1 text-amber-800 font-bold">
                        <span>Consumo Atual:</span>
                        <span>{formatCurrency(currentOrder.total)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Switcher & Actions */}
                <div className="pt-3 mt-2 space-y-2">
                  <div className="flex items-center gap-1">
                    <select
                      value={table.status}
                      onChange={(e) =>
                        handleQuickStatusChange(table.id, e.target.value as TableStatus)
                      }
                      className="w-full text-[11px] font-semibold p-1.5 bg-stone-50 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="LIVRE">Livre</option>
                      <option value="OCUPADA">Ocupada</option>
                      <option value="PEDINDO_CONTA">Pedindo Conta</option>
                      <option value="RESERVADA">Reservada</option>
                      <option value="MANUTENCAO">Manutenção</option>
                    </select>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenEditModal(table)}
                      className="p-1.5 h-auto text-xs"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(table.id, table.name)}
                      className="p-1.5 h-auto text-xs text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTable ? "Editar Mesa / Ponto" : "Nova Mesa / Ambiente"}
        description="Configure número, capacidade e setor do salão"
        maxWidth="md"
      >
        <form onSubmit={handleSaveTable} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Número da Mesa <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={formNumber}
                onChange={(e) => {
                  setFormNumber(e.target.value);
                  if (!editingTable) {
                    setFormName(`Mesa ${e.target.value.padStart(2, "0")}`);
                  }
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Capacidade (Lugares) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={formSeats}
                onChange={(e) => setFormSeats(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nome de Exibição
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Mesa 04 (Varanda)"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Ambiente / Setor
              </label>
              <select
                value={formSector}
                onChange={(e) => setFormSector(e.target.value as TableSector)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 bg-white"
              >
                <option value="SALAO_PRINCIPAL">Salão Principal</option>
                <option value="VARANDA">Varanda</option>
                <option value="DECK">Deck Externo</option>
                <option value="BALCAO">Balcão</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Status Inicial
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as TableStatus)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 bg-white"
              >
                <option value="LIVRE">Livre</option>
                <option value="OCUPADA">Ocupada</option>
                <option value="PEDINDO_CONTA">Pedindo Conta</option>
                <option value="RESERVADA">Reservada</option>
                <option value="MANUTENCAO">Manutenção</option>
              </select>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              <Check className="w-4 h-4 mr-1" />
              Salvar Mesa
            </Button>
          </div>
        </form>
      </Modal>
    </ProtectedRoute>
  );
}

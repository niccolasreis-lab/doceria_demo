"use client";

import React, { useEffect, useState } from "react";
import { store } from "@/lib/store";
import { Product, ProductCategory } from "@/types";
import { formatCurrency, getCategoryLabel } from "@/lib/utils";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UtensilsCrossed,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  Check,
  Power,
} from "lucide-react";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | "ALL">("ALL");
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<ProductCategory>("BOLOS_TORTAS");
  const [formPrice, setFormPrice] = useState("");
  const [formCostPrice, setFormCostPrice] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStock, setFormStock] = useState("10");
  const [formMinStock, setFormMinStock] = useState("3");
  const [formUnit, setFormUnit] = useState<"UN" | "FATIA" | "KG" | "PORCAO">("UN");
  const [formAllergens, setFormAllergens] = useState<string>("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const update = () => {
      setProducts(store.getProducts());
    };
    update();
    return store.subscribe(update);
  }, []);

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormName("");
    setFormCategory("BOLOS_TORTAS");
    setFormPrice("");
    setFormCostPrice("");
    setFormSku(`SKU-${Math.floor(100 + Math.random() * 900)}`);
    setFormDescription("");
    setFormStock("15");
    setFormMinStock("5");
    setFormUnit("UN");
    setFormAllergens("");
    setFormIsActive(true);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormPrice(product.price.toString());
    setFormCostPrice(product.costPrice.toString());
    setFormSku(product.sku);
    setFormDescription(product.description || "");
    setFormStock(product.stock.toString());
    setFormMinStock(product.minStock.toString());
    setFormUnit(product.unit);
    setFormAllergens(product.allergens?.join(", ") || "");
    setFormIsActive(product.isActive);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formName.trim()) {
      setErrorMsg("O nome do produto é obrigatório.");
      return;
    }

    const price = parseFloat(formPrice.replace(",", ".")) || 0;
    const costPrice = parseFloat(formCostPrice.replace(",", ".")) || 0;
    const stock = parseInt(formStock) || 0;
    const minStock = parseInt(formMinStock) || 0;

    if (price <= 0) {
      setErrorMsg("O preço de venda deve ser maior que zero.");
      return;
    }

    const allergensList = formAllergens
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    store.saveProduct({
      id: editingProduct?.id,
      name: formName.trim(),
      category: formCategory,
      price,
      costPrice,
      sku: formSku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
      description: formDescription.trim(),
      stock,
      minStock,
      unit: formUnit,
      allergens: allergensList,
      isActive: formIsActive,
    });

    setIsModalOpen(false);
  };

  const handleToggleStatus = (id: string) => {
    store.toggleProductStatus(id);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Deseja realmente excluir o produto "${name}"?`)) {
      store.deleteProduct(id);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === "ALL" || p.category === selectedCategory;
    const matchesLowStock = !filterLowStock || p.stock <= p.minStock;

    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const costVal = parseFloat(formCostPrice.replace(",", ".")) || 0;
  const priceVal = parseFloat(formPrice.replace(",", ".")) || 0;
  const profitMargin = priceVal > 0 ? (((priceVal - costVal) / priceVal) * 100).toFixed(1) : "0";

  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl shadow-sm border border-stone-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-stone-900 tracking-tight">
                Gestão de Produtos &amp; Cardápio
              </h1>
              <p className="text-xs text-stone-500">
                Cadastro, precificação, controle de estoque e alérgenos
              </p>
            </div>
          </div>

          <Button variant="primary" size="md" onClick={handleOpenCreateModal} className="shadow-xs">
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Produto
          </Button>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Buscar por nome, SKU, descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Low stock pill & count */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={() => setFilterLowStock(!filterLowStock)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                  filterLowStock
                    ? "bg-rose-100 border-rose-300 text-rose-800"
                    : "bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Estoque Baixo
              </button>

              <span className="text-xs text-stone-500 font-medium">
                Total: <strong>{filteredProducts.length}</strong> produtos
              </span>
            </div>
          </div>

          {/* Categories Tab list */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                selectedCategory === "ALL"
                  ? "bg-amber-600 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Todas as Categorias
            </button>
            {(
              [
                "BOLOS_TORTAS",
                "DOCES_FINOS",
                "CAFES_BEBIDAS",
                "SALGADOS",
                "SOBREMESAS_ESPECIAIS",
              ] as ProductCategory[]
            ).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-amber-600 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {getCategoryLabel(cat)}
              </button>
            ))}
          </div>
        </div>

        {/* Product List Grid / Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((p) => {
            const isLowStock = p.stock <= p.minStock;
            return (
              <div
                key={p.id}
                className={`bg-white p-5 rounded-3xl border shadow-sm flex flex-col justify-between transition-all ${
                  !p.isActive
                    ? "opacity-60 border-stone-200"
                    : isLowStock
                    ? "border-amber-300 ring-2 ring-amber-400/20"
                    : "border-stone-200 hover:border-amber-400"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                        {getCategoryLabel(p.category)}
                      </span>
                      <h3 className="text-sm font-bold text-stone-900 leading-tight mt-0.5">
                        {p.name}
                      </h3>
                      <span className="text-[10px] text-stone-400">SKU: {p.sku}</span>
                    </div>

                    <Badge variant={p.isActive ? "success" : "neutral"} size="sm">
                      {p.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>

                  <p className="text-xs text-stone-600 line-clamp-2">{p.description}</p>

                  {p.allergens && p.allergens.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {p.allergens.map((alg, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded bg-stone-100 text-[10px] text-stone-600 border border-stone-200"
                        >
                          {alg}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stock & Prices */}
                <div className="pt-4 mt-4 border-t border-stone-100 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-stone-400 block text-[10px]">Preço Venda</span>
                      <strong className="text-stone-900 font-extrabold text-sm">
                        {formatCurrency(p.price)}
                      </strong>
                    </div>

                    <div className="text-center">
                      <span className="text-stone-400 block text-[10px]">Custo / Margem</span>
                      <span className="text-stone-600 font-medium">
                        {formatCurrency(p.costPrice)} (
                        {(((p.price - p.costPrice) / p.price) * 100).toFixed(0)}%)
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-stone-400 block text-[10px]">Estoque Atual</span>
                      <span
                        className={`font-bold ${
                          isLowStock ? "text-rose-600 flex items-center gap-0.5 justify-end" : "text-stone-900"
                        }`}
                      >
                        {isLowStock && <AlertTriangle className="w-3 h-3" />}
                        {p.stock} {p.unit}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(p.id)}
                      title={p.isActive ? "Desativar produto" : "Ativar produto"}
                      className={`p-2 rounded-xl border text-xs flex items-center gap-1 transition-colors ${
                        p.isActive
                          ? "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                          : "text-stone-500 bg-stone-100 border-stone-200 hover:bg-stone-200"
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenEditModal(p)}
                        className="text-xs"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(p.id, p.name)}
                        className="text-xs text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Product Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? "Editar Produto do Cardápio" : "Novo Produto / Receita"}
        description="Configure precificação, estoque e dados de cardápio"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nome do Produto <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Torta Holandesa de Pistache Artesanal"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Categoria do Cardápio
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as ProductCategory)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 bg-white"
              >
                <option value="BOLOS_TORTAS">Bolos &amp; Tortas</option>
                <option value="DOCES_FINOS">Doces Finos &amp; Brigadeiros</option>
                <option value="CAFES_BEBIDAS">Cafés &amp; Bebidas</option>
                <option value="SALGADOS">Salgados &amp; Quiches</option>
                <option value="SOBREMESAS_ESPECIAIS">Sobremesas Especiais</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Unidade de Medida
              </label>
              <select
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value as "UN" | "FATIA" | "KG" | "PORCAO")}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 bg-white"
              >
                <option value="UN">Unidade (UN)</option>
                <option value="FATIA">Fatia</option>
                <option value="PORCAO">Porção</option>
                <option value="KG">Quilo (KG)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Preço de Venda (R$) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                placeholder="0.00"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Preço de Custo (R$)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={formCostPrice}
                onChange={(e) => setFormCostPrice(e.target.value)}
                placeholder="0.00"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-[10px] text-emerald-700 font-semibold">
                Margem de lucro: {profitMargin}%
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Estoque Atual
              </label>
              <input
                type="number"
                min="0"
                value={formStock}
                onChange={(e) => setFormStock(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Estoque Mínimo (Alerta)
              </label>
              <input
                type="number"
                min="0"
                value={formMinStock}
                onChange={(e) => setFormMinStock(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Alérgenos (Separados por vírgula)
              </label>
              <input
                type="text"
                value={formAllergens}
                onChange={(e) => setFormAllergens(e.target.value)}
                placeholder="Ex: Lactose, Glúten, Castanhas"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Descrição do Cardápio
              </label>
              <textarea
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Ingredientes nobres, modo de preparo..."
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-stone-100">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700">
              <input
                type="checkbox"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
              />
              Produto Ativo para Vendas
            </label>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm">
                <Check className="w-4 h-4 mr-1" />
                Salvar Produto
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </ProtectedRoute>
  );
}

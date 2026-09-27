import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { PaymentMethod, ProductCategory, TableSector, TableStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return isoString;
  }
}

export function getSectorLabel(sector: TableSector): string {
  switch (sector) {
    case "SALAO_PRINCIPAL":
      return "Salão Principal";
    case "VARANDA":
      return "Varanda";
    case "DECK":
      return "Deck Externo";
    case "BALCAO":
      return "Balcão";
    default:
      return sector;
  }
}

export function getStatusLabel(status: TableStatus): string {
  switch (status) {
    case "LIVRE":
      return "Livre";
    case "OCUPADA":
      return "Ocupada";
    case "PEDINDO_CONTA":
      return "Pedindo Conta";
    case "RESERVADA":
      return "Reservada";
    case "MANUTENCAO":
      return "Manutenção";
    default:
      return status;
  }
}

export function getCategoryLabel(category: ProductCategory): string {
  switch (category) {
    case "DOCES_FINOS":
      return "Doces Finos & Brigadeiros";
    case "BOLOS_TORTAS":
      return "Bolos & Tortas Artesanais";
    case "CAFES_BEBIDAS":
      return "Cafés Especiais & Bebidas";
    case "SALGADOS":
      return "Salgados & Quiches";
    case "SOBREMESAS_ESPECIAIS":
      return "Sobremesas Especiais";
    default:
      return category;
  }
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case "DINHEIRO":
      return "Dinheiro (Espécie)";
    case "CARTAO_CREDITO":
      return "Cartão de Crédito";
    case "CARTAO_DEBITO":
      return "Cartão de Débito";
    case "PIX":
      return "PIX";
    case "VALE_REFEICAO":
      return "Vale Refeição / Alimentação";
    default:
      return method;
  }
}

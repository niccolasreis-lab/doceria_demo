"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Store,
  Receipt,
  LayoutDashboard,
  UtensilsCrossed,
  Grid3X3,
  BarChart3,
  Lock,
  LogOut,
  UserCheck,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { store } from "@/lib/store";
import { CashRegisterSession } from "@/types";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, canAccessAdmin } = useAuth();
  const [activeSession, setActiveSession] = useState<CashRegisterSession | undefined>(undefined);
  const [pendingBillsCount, setPendingBillsCount] = useState(0);

  useEffect(() => {
    const updateStats = () => {
      setActiveSession(store.getActiveSession());
      setPendingBillsCount(store.getBillRequests().length);
    };

    updateStats();
    return store.subscribe(updateStats);
  }, []);

  const handleResetDemo = () => {
    if (confirm("Deseja restaurar os dados de demonstração da Doceria do Sr. Gilmar?")) {
      store.resetToDefault();
      window.location.reload();
    }
  };

  const navLinks = [
    {
      href: "/caixa",
      label: "Frente de Caixa",
      icon: Receipt,
      badge: pendingBillsCount > 0 ? `${pendingBillsCount} pedir conta` : undefined,
      badgeColor: "danger" as const,
    },
    {
      href: "/caixa/historico",
      label: "Histórico & Cupons",
      icon: Store,
    },
    {
      href: "/admin",
      label: "Dashboard",
      icon: LayoutDashboard,
      adminOnly: true,
    },
    {
      href: "/admin/produtos",
      label: "Produtos",
      icon: UtensilsCrossed,
      adminOnly: true,
    },
    {
      href: "/admin/mesas",
      label: "Mesas & Salão",
      icon: Grid3X3,
      adminOnly: true,
    },
    {
      href: "/admin/relatorios",
      label: "Relatórios",
      icon: BarChart3,
      adminOnly: true,
    },
    {
      href: "/admin/fechamento-caixa",
      label: "Fechamento Caixa",
      icon: Lock,
      adminOnly: true,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-stone-900 border-b border-stone-800 text-stone-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <Link href="/caixa" className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-stone-950 fill-amber-300" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white block leading-tight">
                  Doceria do Sr. Gilmar
                </span>
                <span className="text-[11px] font-medium text-amber-400/90 block">
                  PDV &amp; Gestão Gastronômica
                </span>
              </div>
            </Link>

            {/* Cashier status pill */}
            <div className="hidden lg:flex items-center pl-4 border-l border-stone-800 space-x-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  activeSession ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                }`}
              />
              <span className="text-xs text-stone-300">
                Caixa:{" "}
                <strong className={activeSession ? "text-emerald-400" : "text-rose-400"}>
                  {activeSession ? "ABERTO" : "FECHADO"}
                </strong>
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((item) => {
              if (item.adminOnly && !canAccessAdmin) return null;
              const isActive = pathname === item.href || (item.href !== "/admin" && item.href !== "/caixa" && pathname?.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "text-stone-300 hover:text-white hover:bg-stone-800/80"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full animate-bounce">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User profile / Quick Switch / Logout */}
          <div className="flex items-center space-x-3">
            {/* Reset data helper */}
            <button
              onClick={handleResetDemo}
              title="Restaurar dados de teste"
              className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg text-xs flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xl:inline text-[11px]">Resetar Demo</span>
            </button>

            {user ? (
              <div className="flex items-center space-x-2 bg-stone-800/90 pl-3 pr-2 py-1.5 rounded-full border border-stone-700">
                <div className="text-right">
                  <div className="text-xs font-bold text-stone-100 truncate max-w-[120px]">
                    {user.name.split(" ")[0]}
                  </div>
                  <div className="text-[10px] text-amber-400 font-semibold tracking-wider uppercase">
                    {user.role}
                  </div>
                </div>

                <div className="w-7 h-7 rounded-full bg-amber-500 text-stone-900 font-bold flex items-center justify-center text-xs">
                  {user.name.charAt(0)}
                </div>

                {/* Switch profile quick button */}
                <button
                  onClick={() => router.push("/login")}
                  title="Trocar perfil"
                  className="p-1 text-stone-400 hover:text-amber-400 transition-colors"
                >
                  <UserCheck className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    logout();
                    router.push("/login");
                  }}
                  title="Sair do sistema"
                  className="p-1 text-stone-400 hover:text-rose-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-xs font-semibold px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sub-bar navigation */}
      <div className="md:hidden border-t border-stone-800 px-4 py-2 flex items-center space-x-2 overflow-x-auto">
        {navLinks.map((item) => {
          if (item.adminOnly && !canAccessAdmin) return null;
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium ${
                isActive
                  ? "bg-amber-500/20 text-amber-300 font-semibold"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
              {item.badge && (
                <span className="w-2 h-2 rounded-full bg-rose-500 ml-1" />
              )}
            </Link>
          );
        })}
      </div>
    </header>
  );
}

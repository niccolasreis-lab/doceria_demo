"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { UserRole } from "@/types";
import { Sparkles, Shield, Receipt, UtensilsCrossed, KeyRound, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const { loginAs, loginWithCredentials, user } = useAuth();
  const [credentialInput, setCredentialInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    loginAs(role);
    if (role === "ADMIN") {
      router.push("/admin");
    } else {
      router.push("/caixa");
    }
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!credentialInput.trim()) {
      setErrorMsg("Informe seu e-mail ou PIN de operador");
      return;
    }

    setIsLoading(true);
    const ok = await loginWithCredentials(credentialInput);
    setIsLoading(false);

    if (ok) {
      router.push("/caixa");
    } else {
      setErrorMsg("Credenciais não localizadas. Utilize um dos perfis rápidos abaixo ou digite '0000', '1234' ou '1111'.");
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-stone-200">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-stone-950 shadow-md mb-4">
            <Sparkles className="w-8 h-8 fill-amber-200" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Doceria do Sr. Gilmar
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Acesso ao Ponto de Venda (PDV) e Gestão Administrativa
          </p>
        </div>

        {/* Quick Role Selectors */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">
            Acesso Rápido por Perfil Operacional
          </label>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Caixa */}
            <button
              type="button"
              onClick={() => handleRoleSelect("CAIXA")}
              className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200 hover:border-amber-500 hover:bg-amber-50/50 transition-all text-left group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                    Operador de Caixa
                    {user?.role === "CAIXA" && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                    )}
                  </div>
                  <div className="text-xs text-stone-500">Mariana Silva · PIN: 0000</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* Admin */}
            <button
              type="button"
              onClick={() => handleRoleSelect("ADMIN")}
              className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200 hover:border-amber-500 hover:bg-amber-50/50 transition-all text-left group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                    Administrador / Gerente
                    {user?.role === "ADMIN" && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                    )}
                  </div>
                  <div className="text-xs text-stone-500">Sr. Gilmar Santos · PIN: 1234</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* Atendente/Garçom */}
            <button
              type="button"
              onClick={() => handleRoleSelect("GARCOM")}
              className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200 hover:border-amber-500 hover:bg-amber-50/50 transition-all text-left group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                    Garçom / Atendente
                    {user?.role === "GARCOM" && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                    )}
                  </div>
                  <div className="text-xs text-stone-500">Carlos Eduardo · PIN: 1111</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-stone-200"></div>
          <span className="flex-shrink mx-4 text-stone-400 text-xs font-semibold uppercase">
            ou acesse via PIN / E-mail
          </span>
          <div className="flex-grow border-t border-stone-200"></div>
        </div>

        {/* Form */}
        <form onSubmit={handleCustomLogin} className="space-y-4">
          <div>
            <label
              htmlFor="credentialInput"
              className="block text-xs font-medium text-stone-700 mb-1"
            >
              PIN de 4 dígitos ou E-mail
            </label>
            <div className="relative">
              <input
                id="credentialInput"
                type="text"
                value={credentialInput}
                onChange={(e) => setCredentialInput(e.target.value)}
                placeholder="Ex: 0000 ou gilmar@..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
              <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
          >
            Entrar no Sistema
          </Button>
        </form>
      </div>
    </div>
  );
}

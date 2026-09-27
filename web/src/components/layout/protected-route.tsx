"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { UserRole } from "@/types";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-stone-500">Carregando ambiente...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[60vh] max-w-md mx-auto flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 mb-2">Acesso Restrito</h2>
        <p className="text-sm text-stone-600 mb-6">
          Seu perfil atual (<strong>{user.role}</strong>) não possui permissão para acessar esta área administrativa.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push("/caixa")}>
            Ir para o Caixa
          </Button>
          <Button variant="primary" onClick={() => router.push("/login")}>
            Alternar Perfil
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { SpaceBackground } from "@/components/auth/space-background";
import { Mail, Lock, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (inviteToken) {
      router.push(`/join/${encodeURIComponent(inviteToken)}`);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-transparent px-4 overflow-hidden">
      {/* Interactive Space Background */}
      <SpaceBackground />

      <Card className="relative z-10 w-full max-w-md border-border/20 bg-card shadow-2xl overflow-hidden rounded-2xl">
        {/* Top Half: Landscape/Cosmic Banner */}
        <div className="relative h-48 w-full overflow-hidden">
          <img
            src="/login-bg.jpg"
            alt="Cosmic Banner"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
          
          {/* Centered logo & title */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <img
              src="/logo.png"
              alt="Unico Ex Logo"
              className="h-14 w-14 rounded-2xl object-contain animate-bounce [animation-duration:4s] border border-white/10 shadow-xl"
            />
            <h1 className="text-xl font-bold tracking-widest text-white drop-shadow-md">
              UNICO EX
            </h1>
          </div>
        </div>

        {/* Bottom Half: Form & Fields */}
        <div className="bg-[#f8fafc] dark:bg-[#0b0f19] text-[#0f172a] dark:text-[#f8fafc] p-6 sm:p-8 flex flex-col gap-5">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[#0f172a] dark:text-white">
              {inviteToken ? "Entrar para aceitar" : "Login"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {inviteToken
                ? "Entre na sua conta para resgatar o convite"
                : "Entre com suas credenciais de acesso"}
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-muted-foreground text-xs font-semibold uppercase tracking-wider pl-2">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-500/70 dark:text-rose-400/60" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu-email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-full border-none bg-rose-100/50 dark:bg-rose-950/30 pl-11 text-[#0f172a] dark:text-white placeholder:text-rose-400/80 dark:placeholder:text-rose-300/30 focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between pl-2">
                <Label htmlFor="password" className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  Senha
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  Esqueceu sua senha?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-500/70 dark:text-rose-400/60" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 rounded-full border-none bg-rose-100/50 dark:bg-rose-950/30 pl-11 text-[#0f172a] dark:text-white placeholder:text-rose-400/80 dark:placeholder:text-rose-300/30 focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="mt-3 h-11 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary-hover font-semibold transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          {/* Create Account Link */}
          <p className="text-center text-sm text-muted-foreground">
            Não tem uma conta?{" "}
            <Link
              href={
                inviteToken
                  ? `/signup?invite=${encodeURIComponent(inviteToken)}`
                  : "/signup"
              }
              className="text-primary font-semibold hover:underline"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}

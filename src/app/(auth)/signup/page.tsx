"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { SpaceBackground } from "@/components/auth/space-background";
import { Mail, Lock, User, CheckCircle } from "lucide-react";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageInner />
    </Suspense>
  );
}

function SignupPageInner() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);

    const emailRedirectTo = inviteToken
      ? `${window.location.origin}/join/${encodeURIComponent(inviteToken)}`
      : undefined;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-transparent px-4 overflow-hidden">
        <SpaceBackground />

        <Card className="relative z-10 w-full max-w-md border-border/20 bg-card shadow-2xl overflow-hidden rounded-2xl">
          {/* Cosmic Banner header */}
          <div className="relative h-44 w-full overflow-hidden">
            <img
              src="/login-bg.jpg"
              alt="Cosmic Banner"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <img
                src="/logo.png"
                alt="Unico Ex Logo"
                className="h-12 w-12 rounded-xl object-contain border border-white/10"
              />
              <h1 className="text-lg font-bold tracking-widest text-white">
                UNICO EX
              </h1>
            </div>
          </div>

          {/* Verification message area */}
          <div className="bg-[#f8fafc] dark:bg-[#0b0f19] text-[#0f172a] dark:text-[#f8fafc] p-6 sm:p-8 flex flex-col gap-5 text-center items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#0f172a] dark:text-white">
                Verifique seu e-mail
              </h2>
              <p className="text-sm text-muted-foreground mt-2 px-1">
                Enviamos um link de confirmação para{" "}
                <span className="text-[#0f172a] dark:text-white font-semibold">{email}</span>.
                Por favor, acesse seu e-mail e clique no link para verificar sua conta.
              </p>
            </div>

            <Link
              href={
                inviteToken
                  ? `/login?invite=${encodeURIComponent(inviteToken)}`
                  : "/login"
              }
              className="w-full"
            >
              <Button
                variant="outline"
                className="w-full h-11 rounded-full border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Voltar para login
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-transparent px-4 overflow-hidden">
      <SpaceBackground />

      <Card className="relative z-10 w-full max-w-md border-border/20 bg-card shadow-2xl overflow-hidden rounded-2xl">
        {/* Top Half: Cosmic Banner */}
        <div className="relative h-40 w-full overflow-hidden">
          <img
            src="/login-bg.jpg"
            alt="Cosmic Banner"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
          
          {/* Centered logo & title */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
            <img
              src="/logo.png"
              alt="Unico Ex Logo"
              className="h-12 w-12 rounded-xl object-contain border border-white/10"
            />
            <h1 className="text-lg font-bold tracking-widest text-white drop-shadow-md">
              UNICO EX
            </h1>
          </div>
        </div>

        {/* Bottom Half: Form & Fields */}
        <div className="bg-[#f8fafc] dark:bg-[#0b0f19] text-[#0f172a] dark:text-[#f8fafc] p-6 sm:p-8 flex flex-col gap-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[#0f172a] dark:text-white">
              {inviteToken ? "Criar conta e participar" : "Criar conta"}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {inviteToken
                ? "Cadastre-se para se juntar à equipe"
                : "Comece a usar o seu CRM para WhatsApp"}
            </p>
          </div>

          <form onSubmit={handleSignup} className="flex flex-col gap-3.5">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-500 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Name Field */}
            <div className="flex flex-col gap-1">
              <Label htmlFor="fullName" className="text-muted-foreground text-xs font-semibold uppercase tracking-wider pl-2">
                Nome completo
              </Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-500/70 dark:text-rose-400/60" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-10 rounded-full border-none bg-rose-100/50 dark:bg-rose-950/30 pl-11 text-[#0f172a] dark:text-white placeholder:text-rose-400/80 dark:placeholder:text-rose-300/30 focus-visible:ring-2 focus-visible:ring-purple-500"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="flex flex-col gap-1">
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
                  className="h-10 rounded-full border-none bg-rose-100/50 dark:bg-rose-950/30 pl-11 text-[#0f172a] dark:text-white placeholder:text-rose-400/80 dark:placeholder:text-rose-300/30 focus-visible:ring-2 focus-visible:ring-purple-500"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1">
              <Label htmlFor="password" className="text-muted-foreground text-xs font-semibold uppercase tracking-wider pl-2">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-500/70 dark:text-rose-400/60" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Pelo menos 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10 rounded-full border-none bg-rose-100/50 dark:bg-rose-950/30 pl-11 text-[#0f172a] dark:text-white placeholder:text-rose-400/80 dark:placeholder:text-rose-300/30 focus-visible:ring-2 focus-visible:ring-purple-500"
                />
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="flex flex-col gap-1">
              <Label htmlFor="confirmPassword" className="text-muted-foreground text-xs font-semibold uppercase tracking-wider pl-2">
                Confirmar senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-500/70 dark:text-rose-400/60" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repita sua senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-10 rounded-full border-none bg-rose-100/50 dark:bg-rose-950/30 pl-11 text-[#0f172a] dark:text-white placeholder:text-rose-400/80 dark:placeholder:text-rose-300/30 focus-visible:ring-2 focus-visible:ring-purple-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-11 w-full rounded-full bg-[#7c3aed] text-white hover:bg-[#6d28d9] font-medium transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
            >
              {loading ? "Criando conta..." : "Criar conta"}
            </Button>
          </form>

          {/* Login Link */}
          <p className="text-center text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link
              href={
                inviteToken
                  ? `/login?invite=${encodeURIComponent(inviteToken)}`
                  : "/login"
              }
              className="text-purple-600 dark:text-purple-400 font-semibold hover:underline"
            >
              Entrar
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}

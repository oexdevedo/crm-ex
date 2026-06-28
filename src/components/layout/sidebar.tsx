"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTotalUnread } from "@/hooks/use-total-unread";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  GitBranch,
  Radio,
  Zap,
  Workflow,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  beta?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Chat", icon: MessageSquare },
  { href: "/contacts", label: "Contatos", icon: Users },
  { href: "/pipelines", label: "Funis de Vendas", icon: GitBranch },
  { href: "/broadcasts", label: "Transmissões", icon: Radio },
  { href: "/automations", label: "Automações", icon: Zap },
  { href: "/flows", label: "Fluxos", icon: Workflow, beta: true },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const totalUnread = useTotalUnread();

  // Close the drawer when route changes on mobile
  useEffect(() => {
    onClose?.();
  }, [pathname]);

  // Lock body scroll while mobile drawer is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <>
      {/* Mobile Backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-background/70 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        className={cn(
          // Mobile: drawer that slides in
          "fixed inset-y-0 left-0 z-40 flex h-full w-20 flex-col bg-[#0c0f16] dark:bg-[#04060b]",
          "transition-transform duration-200 ease-out will-change-transform",
          open ? "translate-x-0" : "-translate-x-full",
          // Desktop: static sidebar
          "lg:static lg:z-0 lg:w-20 lg:translate-x-0 lg:transition-none"
        )}
        aria-label="Primary"
      >
        {/* Brand Logo Header */}
        <div className="relative flex h-20 shrink-0 items-center justify-center">
          <Link href="/dashboard" className="flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Unico Ex Logo"
              className="h-10 w-10 rounded-2xl object-contain border border-primary/20 shadow-lg shadow-primary/10 transition-all hover:scale-105"
            />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="absolute right-1 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-muted/20 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto w-full py-4 flex flex-col items-center">
          <ul className="flex w-full flex-col gap-2">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              const showUnreadDot =
                item.href === "/inbox" && totalUnread > 0 && !isActive;

              return (
                <li key={item.href} className="relative flex w-full justify-center">
                  <Link
                    href={item.href}
                    title={item.label}
                    className="relative flex h-12 w-full items-center justify-center text-muted-foreground/80 hover:text-foreground transition-all duration-200"
                  >
                    {/* Curved background slide behind the centered icon */}
                    {isActive && (
                      <div className="sidebar-curved-active absolute inset-y-0 right-0 left-3" />
                    )}

                    <div
                      className={cn(
                        "relative z-10 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                          : "hover:bg-muted/30"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                    </div>

                    {/* Unread indicators */}
                    {showUnreadDot && (
                      <span className="absolute top-1.5 right-4 flex h-2.5 w-2.5 z-20">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                      </span>
                    )}
                    
                    {item.beta && !isActive && (
                      <span className="absolute bottom-1.5 right-4.5 h-1.5 w-1.5 rounded-full bg-amber-400 z-20" title="Beta" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Divider */}
          <div className="my-4 w-8 border-t border-border/20" />

          {/* Settings Nav Item */}
          <ul className="flex w-full flex-col gap-2">
            <li className="relative flex w-full justify-center">
              <Link
                href="/settings"
                title="Configurações"
                className="relative flex h-12 w-full items-center justify-center text-muted-foreground/80 hover:text-foreground transition-all duration-200"
              >
                {/* Curved background slide behind settings icon */}
                {pathname.startsWith("/settings") && (
                  <div className="sidebar-curved-active absolute inset-y-0 right-0 left-3" />
                )}

                <div
                  className={cn(
                    "relative z-10 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200",
                    pathname.startsWith("/settings")
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                      : "hover:bg-muted/30"
                  )}
                >
                  <Settings className="h-5 w-5" />
                </div>
              </Link>
            </li>
          </ul>
        </nav>

        {/* User Account / Avatar Dropdown */}
        <div className="shrink-0 flex justify-center pb-6">
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#0c0f16]">
              <Avatar className="size-10 border-2 border-primary/20 hover:border-primary transition-all">
                {profile?.avatar_url ? (
                  <AvatarImage
                    src={profile.avatar_url}
                    alt={profile.full_name ?? "Avatar"}
                  />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="right"
              sideOffset={12}
              className="min-w-56 bg-popover text-popover-foreground ring-border"
            >
              <div className="px-2 py-1.5">
                <p className="truncate text-sm font-medium text-foreground">
                  {profile?.full_name ?? "User"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {profile?.email ?? ""}
                </p>
              </div>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings?tab=profile"
                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  />
                }
              >
                <Settings className="size-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings?tab=whatsapp"
                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  />
                }
              >
                <Settings className="size-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={signOut}
                className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
              >
                <LogOut className="size-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}

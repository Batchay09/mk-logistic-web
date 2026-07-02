"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { API_URL } from "@/lib/api"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  LayoutDashboard, Package, ShoppingCart, History, User, Building2,
  HeadphonesIcon, Truck, Users, MapPin, DollarSign, Calendar, ClipboardList,
  LogOut, BarChart3, Search, Menu
} from "lucide-react"
import { ThemeToggle } from "@/components/ui/theme-toggle"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

const clientNav: NavItem[] = [
  { href: "/dashboard", label: "Главная", icon: LayoutDashboard },
  { href: "/orders/new", label: "Новый заказ", icon: Package },
  { href: "/cart", label: "Корзина", icon: ShoppingCart },
  { href: "/orders/active", label: "Активные заказы", icon: Truck },
  { href: "/orders/history", label: "История", icon: History },
  { href: "/profile", label: "Профиль", icon: User },
  { href: "/companies", label: "Мои компании", icon: Building2 },
  { href: "/support", label: "Поддержка", icon: HeadphonesIcon },
]

const managerNav: NavItem[] = [
  { href: "/manager/dashboard", label: "Главная", icon: LayoutDashboard },
  { href: "/manager/payments", label: "Проверка оплат", icon: DollarSign },
  { href: "/manager/search", label: "Поиск заказов", icon: Search },
  { href: "/manager/reports", label: "Excel / Отчёты", icon: BarChart3 },
]

const adminNav: NavItem[] = [
  { href: "/admin/dashboard", label: "Главная", icon: LayoutDashboard },
  { href: "/admin/users", label: "Пользователи", icon: Users },
  { href: "/admin/destinations", label: "Направления", icon: MapPin },
  { href: "/admin/prices", label: "Тарифы", icon: DollarSign },
  { href: "/admin/schedule", label: "Расписание", icon: Calendar },
  { href: "/admin/audit", label: "История изменений", icon: ClipboardList },
]

async function handleLogout() {
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  })
  window.location.href = "/"
}

type SidebarRole = "client" | "manager" | "admin"

const roleLabel = (r: SidebarRole) =>
  r === "client" ? "Клиент" : r === "manager" ? "Менеджер" : "Администратор"

function SidebarBody({ role, onNavigate }: { role: SidebarRole; onNavigate?: () => void }) {
  const pathname = usePathname()
  const nav = role === "admin" ? adminNav : role === "manager" ? managerNav : clientNav

  return (
    <div className="relative flex flex-col h-full overflow-hidden bg-sidebar text-sidebar-foreground">
      {/* Брендовое свечение вверху сайдбара */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -left-10 h-56 w-56 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(from var(--primary) l c h / 0.55) 0%, transparent 70%)",
        }}
      />

      <div className="relative px-4 py-4 border-b border-sidebar-border/70">
        <div className="flex items-center gap-2.5">
          <Image
            src="/brand/logo-mk-logistik.jpg"
            alt="МК Логистик"
            width={38}
            height={38}
            className="rounded-xl ring-1 ring-white/15 shadow-lg shrink-0"
            priority
          />
          <span className="font-bold text-[13px] tracking-wider leading-tight">
            МК<br />ЛОГИСТИК
          </span>
        </div>
      </div>

      <div className="relative px-5 pt-3 pb-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary/25 to-primary/10 px-2.5 py-1 text-xs font-medium text-secondary ring-1 ring-white/10">
          <span className="size-1.5 rounded-full bg-primary" />
          {roleLabel(role)}
        </span>
      </div>

      <nav className="relative flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-[var(--duration-base)]",
                active
                  ? "bg-gradient-to-r from-primary to-[var(--brand-dark)] text-white font-semibold shadow-[0_8px_20px_-8px_rgb(212_81_43_/_0.7)]"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground hover:translate-x-0.5"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-[var(--duration-base)]",
                  active ? "scale-110" : "group-hover:scale-105"
                )}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="relative p-3 border-t border-sidebar-border/70 space-y-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-sidebar-foreground/60">Тема</span>
          <ThemeToggle className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
        </div>
        <button
          onClick={handleLogout}
          className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full text-sidebar-foreground/60 hover:bg-destructive/15 hover:text-destructive transition-all duration-[var(--duration-base)]"
        >
          <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Выйти
        </button>
      </div>
    </div>
  )
}

export function AppSidebar({ role = "client" }: { role?: SidebarRole }) {
  return (
    <aside className="hidden md:flex w-60 shrink-0 h-screen sticky top-0">
      <SidebarBody role={role} />
    </aside>
  )
}

export function MobileTopbar({ role = "client" }: { role?: SidebarRole }) {
  const [open, setOpen] = useState(false)
  return (
    <header className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-2 bg-sidebar text-sidebar-foreground px-2 h-14 border-b border-sidebar-border pt-safe">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          aria-label="Открыть меню"
          className="tap-target inline-flex items-center justify-center rounded-md hover:bg-sidebar-accent transition-colors"
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64 bg-sidebar border-sidebar-border">
          <SheetTitle className="sr-only">Меню</SheetTitle>
          <SidebarBody role={role} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex items-center gap-2">
        <Image
          src="/brand/logo-mk-logistik.jpg"
          alt="МК Логистик"
          width={28}
          height={28}
          className="rounded ring-1 ring-white/10"
          priority
        />
        <span className="font-bold text-sm tracking-wide">МК ЛОГИСТИК</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="inline-flex items-center gap-1 text-[11px] bg-gradient-to-r from-primary/25 to-primary/10 text-secondary px-2.5 py-1 rounded-full font-medium ring-1 ring-white/10">
          <span className="size-1.5 rounded-full bg-primary" />
          {roleLabel(role)}
        </span>
        <ThemeToggle className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
      </div>
    </header>
  )
}

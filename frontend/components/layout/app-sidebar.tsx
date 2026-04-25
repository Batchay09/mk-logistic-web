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
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <Image
            src="/brand/logo-mk-logistik.jpg"
            alt="МК Логистик"
            width={36}
            height={36}
            className="rounded-md ring-1 ring-white/10 shrink-0"
            priority
          />
          <span className="font-bold text-[13px] tracking-wider leading-tight">
            МК<br />ЛОГИСТИК
          </span>
        </div>
      </div>

      <div className="px-5 pt-3 pb-1">
        <span className="text-xs bg-[#D4512B]/20 text-[#EAC9B0] px-2 py-0.5 rounded capitalize">
          {roleLabel(role)}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm w-full text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
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
    <header className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-2 bg-sidebar text-sidebar-foreground px-4 h-14 border-b border-sidebar-border">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          aria-label="Открыть меню"
          className="p-2 -ml-2 rounded-md hover:bg-sidebar-accent transition-colors"
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
      <span className="text-[11px] bg-[#D4512B]/20 text-[#EAC9B0] px-2 py-0.5 rounded">
        {roleLabel(role)}
      </span>
    </header>
  )
}

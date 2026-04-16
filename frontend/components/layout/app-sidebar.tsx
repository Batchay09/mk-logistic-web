"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Package, ShoppingCart, History, User, Building2,
  HeadphonesIcon, Truck, Users, MapPin, DollarSign, Calendar, ClipboardList,
  LogOut, BarChart3, Search
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
  await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  })
  window.location.href = "/"
}

type SidebarRole = "client" | "manager" | "admin"

export function AppSidebar({ role = "client" }: { role?: SidebarRole }) {
  const pathname = usePathname()
  const nav = role === "admin" ? adminNav : role === "manager" ? managerNav : clientNav

  return (
    <aside className="w-60 shrink-0 bg-sidebar text-sidebar-foreground h-screen flex flex-col sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="bg-[#EAC9B0] rounded p-1.5">
            <Truck className="h-4 w-4 text-[#D4512B]" />
          </div>
          <span className="font-bold text-sm tracking-wide">МК ЛОГИСТИК</span>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-5 pt-3 pb-1">
        <span className="text-xs bg-[#D4512B]/20 text-[#EAC9B0] px-2 py-0.5 rounded capitalize">
          {role === "client" ? "Клиент" : role === "manager" ? "Менеджер" : "Администратор"}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
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

      {/* Logout */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm w-full text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>
    </aside>
  )
}

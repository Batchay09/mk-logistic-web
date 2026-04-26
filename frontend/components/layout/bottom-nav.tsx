"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  History,
  User,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Дополнительные пути, которые тоже подсвечивают пункт активным */
  matches?: string[]
}

const clientItems: NavItem[] = [
  { href: "/dashboard", label: "Главная", icon: LayoutDashboard },
  {
    href: "/orders/new",
    label: "Новый",
    icon: Package,
    matches: ["/orders/active", "/orders/history"],
  },
  { href: "/cart", label: "Корзина", icon: ShoppingCart },
  { href: "/profile", label: "Профиль", icon: User, matches: ["/companies", "/support"] },
]

const managerItems: NavItem[] = [
  { href: "/manager/dashboard", label: "Главная", icon: LayoutDashboard },
  { href: "/manager/payments", label: "Оплаты", icon: ShoppingCart },
  { href: "/manager/search", label: "Поиск", icon: Package },
  { href: "/manager/reports", label: "Отчёты", icon: History },
]

const adminItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Главная", icon: LayoutDashboard },
  { href: "/admin/users", label: "Юзеры", icon: User },
  { href: "/admin/prices", label: "Тарифы", icon: ShoppingCart },
  { href: "/admin/audit", label: "Аудит", icon: History },
]

type Role = "client" | "manager" | "admin"

interface BottomNavProps {
  role?: Role
  /** Дополнительный класс для контейнера */
  className?: string
  /** Показать badge на пункте (например, кол-во в корзине) */
  badges?: Partial<Record<string, number | string>>
}

function isActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.href) return true
  if (pathname.startsWith(item.href + "/")) return true
  return (item.matches ?? []).some(
    (m) => pathname === m || pathname.startsWith(m + "/"),
  )
}

export function BottomNav({ role = "client", className, badges }: BottomNavProps) {
  const pathname = usePathname()
  const items =
    role === "admin" ? adminItems : role === "manager" ? managerItems : clientItems

  return (
    <nav
      role="navigation"
      aria-label="Основная навигация"
      className={cn(
        "md:hidden fixed inset-x-0 bottom-0 z-40",
        "bg-background/95 supports-[backdrop-filter]:bg-background/80 backdrop-blur-md",
        "border-t border-border",
        "pb-safe",
        className,
      )}
    >
      <ul className="flex items-stretch justify-around px-1">
        {items.map((item) => {
          const active = isActive(pathname, item)
          const badge = badges?.[item.href]
          const Icon = item.icon
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 py-2",
                  "min-h-14 tap-target",
                  "text-[11px] font-medium leading-none",
                  "transition-colors duration-[var(--duration-fast)]",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground active:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "relative inline-flex items-center justify-center rounded-full",
                    "h-9 w-12 transition-all duration-[var(--duration-base)]",
                    active && "bg-primary/10",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-5 transition-transform duration-[var(--duration-base)]",
                      active && "scale-110",
                    )}
                    aria-hidden
                  />
                  {badge !== undefined && badge !== 0 && badge !== "" && (
                    <span
                      className={cn(
                        "absolute -top-0.5 -right-1 min-w-[18px] h-[18px] px-1",
                        "inline-flex items-center justify-center",
                        "rounded-full bg-primary text-primary-foreground",
                        "text-[10px] font-semibold leading-none",
                        "ring-2 ring-background",
                      )}
                    >
                      {badge}
                    </span>
                  )}
                </span>
                <span className="truncate max-w-full px-1">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

"use client"

import Link from "next/link"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Users, MapPin, DollarSign, Calendar, ClipboardList } from "lucide-react"

const CARDS = [
  { href: "/admin/users",        icon: Users,        title: "Пользователи",      desc: "Управление ролями",     accent: "bg-primary/15 text-primary group-hover:bg-primary group-hover:text-primary-foreground" },
  { href: "/admin/destinations", icon: MapPin,        title: "Направления",       desc: "WB и Ozon склады",      accent: "bg-info/15 text-info group-hover:bg-info/25" },
  { href: "/admin/prices",       icon: DollarSign,    title: "Тарифы",            desc: "Цены по кол-ву коробок", accent: "bg-success/15 text-success group-hover:bg-success/25" },
  { href: "/admin/schedule",     icon: Calendar,      title: "Расписание",        desc: "Дни сдачи и доставки",  accent: "bg-warning/15 text-warning group-hover:bg-warning/25" },
  { href: "/admin/audit",        icon: ClipboardList, title: "История изменений", desc: "Лог + откат",           accent: "bg-primary/15 text-primary group-hover:bg-primary group-hover:text-primary-foreground" },
]

export default function AdminDashboard() {
  return (
    <LayoutWithSidebar role="admin">
      <div className="space-y-6">
        {/* Header + one Aurora glow */}
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-12 left-0 h-56 w-[32rem] max-w-full rounded-full opacity-50 blur-3xl"
            style={{ background: "radial-gradient(circle, oklch(from var(--primary) l c h / 0.10) 0%, transparent 70%)" }}
          />
          <h1 className="relative text-2xl font-bold">Панель администратора</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CARDS.map(({ href, icon: Icon, title, desc, accent }) => (
            <Link key={href} href={href} className="group">
              <Card
                className={
                  "border-border bg-card rounded-2xl shadow-sm h-full cursor-pointer " +
                  "hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40 " +
                  "transition-all duration-[var(--duration-base)]"
                }
              >
                <CardContent className="pt-5 flex items-center gap-4">
                  <div
                    className={
                      "rounded-xl p-3 shrink-0 transition-colors duration-[var(--duration-base)] " +
                      accent
                    }
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{title}</p>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </LayoutWithSidebar>
  )
}

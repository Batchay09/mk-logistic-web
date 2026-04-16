"use client"

import Link from "next/link"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Users, MapPin, DollarSign, Calendar, ClipboardList } from "lucide-react"

const CARDS = [
  { href: "/admin/users",        icon: Users,        title: "Пользователи",      desc: "Управление ролями" },
  { href: "/admin/destinations", icon: MapPin,        title: "Направления",       desc: "WB и Ozon склады" },
  { href: "/admin/prices",       icon: DollarSign,    title: "Тарифы",            desc: "Цены по кол-ву коробок" },
  { href: "/admin/schedule",     icon: Calendar,      title: "Расписание",        desc: "Дни сдачи и доставки" },
  { href: "/admin/audit",        icon: ClipboardList, title: "История изменений", desc: "Лог + откат" },
]

export default function AdminDashboard() {
  return (
    <LayoutWithSidebar role="admin">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Панель администратора</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CARDS.map(({ href, icon: Icon, title, desc }) => (
            <Link key={href} href={href}>
              <Card className="border-[#EAC9B0] hover:border-[#D4512B] hover:shadow-md transition-all cursor-pointer h-full">
                <CardContent className="pt-5 flex items-center gap-4">
                  <div className="bg-[#EAC9B0] rounded-lg p-3 shrink-0">
                    <Icon className="h-5 w-5 text-[#D4512B]" />
                  </div>
                  <div>
                    <p className="font-semibold">{title}</p>
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

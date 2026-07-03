"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { statusMeta } from "@/lib/order-status"
import { Search, Loader2 } from "lucide-react"

interface Order {
  id: number; status: string; marketplace: string; destination_name: string | null
  company_name: string | null; client_name: string | null; ship_date: string
  boxes_count: number; total_amount: number
}

export default function ManagerSearchPage() {
  const [company, setCompany] = useState("")
  const [date, setDate] = useState("")
  const [query, setQuery] = useState<{ company?: string; ship_date?: string } | null>(null)

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["manager-search", query],
    queryFn: () => {
      const params = new URLSearchParams()
      if (query?.company) params.set("company", query.company)
      if (query?.ship_date) params.set("ship_date", query.ship_date)
      return api.get(`/manager/orders/search?${params}`)
    },
    enabled: query !== null,
  })

  function handleSearch() {
    if (!company && !date) return
    setQuery({ company: company || undefined, ship_date: date || undefined })
  }

  return (
    <LayoutWithSidebar role="manager">
      <div className="space-y-6 max-w-2xl">
        {/* Header + одно мягкое аврора-свечение */}
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-12 left-0 h-56 w-[32rem] max-w-full rounded-full opacity-50 blur-3xl"
            style={{ background: "radial-gradient(circle, oklch(from var(--primary) l c h / 0.10) 0%, transparent 70%)" }}
          />
          <h1 className="relative text-2xl font-bold">Поиск заказов</h1>
        </div>

        <Card className="border-border">
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Компания / ИП</Label>
                <Input
                  className="mt-1 border-border"
                  placeholder="ООО Ромашка"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div>
                <Label className="text-sm">Дата сдачи</Label>
                <Input
                  type="date"
                  className="mt-1 border-border"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleSearch} className="btn-shine rounded-full">
              <Search className="h-4 w-4 mr-2" /> Найти
            </Button>
          </CardContent>
        </Card>

        {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}

        {query && !isLoading && orders.length === 0 && (
          <p className="text-center text-muted-foreground py-6">Ничего не найдено</p>
        )}

        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/manager/orders/${order.id}`} className="block">
              <Card className="border-border transition-all duration-[var(--duration-base)] hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                <CardContent className="py-4 px-5 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-primary">#{order.id}</span>
                    <Badge variant="outline" className="border-border text-xs">{order.marketplace.toUpperCase()}</Badge>
                    <span className="text-sm">{order.destination_name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {order.company_name || order.client_name} · {order.boxes_count} кор. · {new Date(order.ship_date).toLocaleDateString("ru-RU")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="font-bold tabular-nums">{order.total_amount.toLocaleString("ru-RU")} ₽</span>
                  <span className={statusMeta(order.status).cls}>{statusMeta(order.status).label}</span>
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

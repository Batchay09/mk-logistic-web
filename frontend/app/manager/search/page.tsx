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
        <h1 className="text-2xl font-bold">Поиск заказов</h1>

        <Card className="border-[#EAC9B0]">
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Компания / ИП</Label>
                <Input
                  className="mt-1 border-[#EAC9B0]"
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
                  className="mt-1 border-[#EAC9B0]"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleSearch} className="bg-[#D4512B] hover:bg-[#B33D1A]">
              <Search className="h-4 w-4 mr-2" /> Найти
            </Button>
          </CardContent>
        </Card>

        {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#D4512B]" /></div>}

        {query && !isLoading && orders.length === 0 && (
          <p className="text-center text-muted-foreground py-6">Ничего не найдено</p>
        )}

        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id} className="border-[#EAC9B0] hover:border-[#D4512B] transition-colors">
              <CardContent className="py-4 px-5 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#D4512B]">#{order.id}</span>
                    <Badge variant="outline" className="border-[#EAC9B0] text-xs">{order.marketplace.toUpperCase()}</Badge>
                    <span className="text-sm">{order.destination_name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {order.company_name || order.client_name} · {order.boxes_count} кор. · {new Date(order.ship_date).toLocaleDateString("ru-RU")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="font-bold">{order.total_amount.toLocaleString("ru-RU")} ₽</span>
                  <Badge variant="outline" className="text-xs border-[#EAC9B0]">{order.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </LayoutWithSidebar>
  )
}

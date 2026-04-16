"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { api } from "@/lib/api"
import { Truck, Loader2 } from "lucide-react"

interface Order {
  id: number
  status: string
  marketplace: string
  destination_name: string
  ship_date: string
  boxes_count: number
  total_amount: number
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  confirmed:        { label: "Подтверждён",      cls: "bg-blue-100 text-blue-800" },
  awaiting_payment: { label: "Ожидает оплаты",   cls: "bg-orange-100 text-orange-800" },
  paid:             { label: "Оплачен",           cls: "bg-green-100 text-green-800" },
  assigned:         { label: "Назначен водитель", cls: "bg-purple-100 text-purple-800" },
  picked_up:        { label: "Забран",            cls: "bg-indigo-100 text-indigo-800" },
  in_transit:       { label: "В пути",            cls: "bg-cyan-100 text-cyan-800" },
}

export default function ActiveOrdersPage() {
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["orders-active"],
    queryFn: () => api.get("/client/orders"),
    select: (data) => data.filter((o) => !["new", "delivered", "canceled", "draft"].includes(o.status)),
  })

  return (
    <LayoutWithSidebar role="client">
      <div className="space-y-5">
        <h1 className="text-2xl font-bold">Активные заказы</h1>
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#D4512B]" />
          </div>
        )}
        {!isLoading && orders.length === 0 && (
          <Card className="border-[#EAC9B0] border-dashed">
            <CardContent className="py-12 text-center">
              <Truck className="h-10 w-10 text-[#EAC9B0] mx-auto mb-3" />
              <p className="text-muted-foreground">Нет активных заказов</p>
            </CardContent>
          </Card>
        )}
        <div className="space-y-3">
          {orders.map((order) => {
            const st = STATUS_MAP[order.status] || { label: order.status, cls: "bg-gray-100 text-gray-700" }
            return (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card className="border-[#EAC9B0] hover:border-[#D4512B] transition-colors cursor-pointer">
                  <CardContent className="py-4 px-5 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#D4512B]">#{order.id}</span>
                        <Badge variant="outline" className="border-[#EAC9B0] text-xs">{order.marketplace.toUpperCase()}</Badge>
                        <span className="text-sm font-medium">{order.destination_name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.boxes_count} кор. · {new Date(order.ship_date).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="font-bold">{order.total_amount.toLocaleString("ru-RU")} ₽</span>
                      <Badge className={`${st.cls} border-0 text-xs`}>{st.label}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </LayoutWithSidebar>
  )
}

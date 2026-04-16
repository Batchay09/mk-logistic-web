"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { api } from "@/lib/api"
import { History, Loader2 } from "lucide-react"

interface Order {
  id: number; status: string; marketplace: string; destination_name: string
  ship_date: string; boxes_count: number; total_amount: number
}

export default function OrderHistoryPage() {
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["orders-history"],
    queryFn: () => api.get("/client/orders"),
    select: (data) => data.filter((o) => ["delivered", "canceled"].includes(o.status)).slice(0, 30),
  })

  return (
    <LayoutWithSidebar role="client">
      <div className="space-y-5">
        <h1 className="text-2xl font-bold">История заказов</h1>
        {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#D4512B]" /></div>}
        {!isLoading && orders.length === 0 && (
          <Card className="border-[#EAC9B0] border-dashed">
            <CardContent className="py-12 text-center">
              <History className="h-10 w-10 text-[#EAC9B0] mx-auto mb-3" />
              <p className="text-muted-foreground">История пуста</p>
            </CardContent>
          </Card>
        )}
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <Card className="border-[#EAC9B0] hover:border-[#D4512B] transition-colors cursor-pointer">
                <CardContent className="py-4 px-5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#D4512B]">#{order.id}</span>
                      <span className="text-sm">{order.destination_name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.boxes_count} кор. · {new Date(order.ship_date).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="font-bold">{order.total_amount.toLocaleString("ru-RU")} ₽</span>
                    <Badge className={order.status === "delivered" ? "bg-green-100 text-green-800 border-0" : "bg-red-100 text-red-800 border-0"}>
                      {order.status === "delivered" ? "Доставлен" : "Отменён"}
                    </Badge>
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

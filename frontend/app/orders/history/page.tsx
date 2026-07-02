"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { api } from "@/lib/api"
import { statusMeta } from "@/lib/order-status"
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
      <div className="relative space-y-5">
        {/* Aurora-подсветка за заголовком */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-12 left-0 h-56 w-[32rem] max-w-full rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(from var(--primary) l c h / 0.10) 0%, transparent 70%)" }}
        />
        <h1 className="relative text-2xl font-bold">История заказов</h1>
        {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
        {!isLoading && orders.length === 0 && (
          <Card className="border-dashed border-border bg-muted/30">
            <CardContent className="py-14 text-center">
              <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[var(--brand-dark)] text-white shadow-brand">
                <History className="h-7 w-7" aria-hidden />
              </div>
              <p className="text-muted-foreground">История пуста</p>
            </CardContent>
          </Card>
        )}
        <div className="space-y-3">
          {orders.map((order) => {
            const st = statusMeta(order.status)
            return (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card className="border-border transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg cursor-pointer">
                  <CardContent className="py-4 px-5 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary">#{order.id}</span>
                        <span className="text-sm">{order.destination_name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.boxes_count} кор. · {new Date(order.ship_date).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="font-bold">{order.total_amount.toLocaleString("ru-RU")} ₽</span>
                      <span className={st.cls}>{st.label}</span>
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

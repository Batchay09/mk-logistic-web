"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { toast } from "sonner"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { api } from "@/lib/api"
import { startPayment } from "@/lib/payments"
import { statusMeta } from "@/lib/order-status"
import { Truck, Loader2, CreditCard } from "lucide-react"

interface Order {
  id: number
  status: string
  marketplace: string
  destination_name: string
  ship_date: string
  boxes_count: number
  total_amount: number
}

export default function ActiveOrdersPage() {
  const [payingId, setPayingId] = useState<number | null>(null)

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["orders-active"],
    queryFn: () => api.get("/client/orders"),
    select: (data) => data.filter((o) => !["new", "delivered", "canceled", "draft"].includes(o.status)),
  })

  async function pay(orderId: number) {
    setPayingId(orderId)
    try {
      await startPayment([orderId])
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Не удалось создать платёж")
      setPayingId(null)
    }
  }

  return (
    <LayoutWithSidebar role="client">
      <div className="relative space-y-5">
        {/* Aurora-подсветка за заголовком */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-12 left-0 h-56 w-[32rem] max-w-full rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(from var(--primary) l c h / 0.10) 0%, transparent 70%)" }}
        />
        <h1 className="relative text-2xl font-bold">Активные заказы</h1>
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        {!isLoading && orders.length === 0 && (
          <Card className="border-dashed border-border bg-muted/30">
            <CardContent className="py-14 text-center">
              <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[var(--brand-dark)] text-white shadow-brand">
                <Truck className="h-7 w-7" aria-hidden />
              </div>
              <p className="text-muted-foreground">Нет активных заказов</p>
            </CardContent>
          </Card>
        )}
        <div className="space-y-3">
          {orders.map((order) => {
            const st = statusMeta(order.status)
            const awaiting = order.status === "awaiting_payment"
            return (
              <Card
                key={order.id}
                className="border-border transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
              >
                <CardContent className="py-4 px-5 flex items-center justify-between gap-3">
                  <Link href={`/orders/${order.id}`} className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary">#{order.id}</span>
                      <Badge variant="outline" className="border-border text-xs">{order.marketplace.toUpperCase()}</Badge>
                      <span className="text-sm font-medium truncate">{order.destination_name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.boxes_count} кор. · {new Date(order.ship_date).toLocaleDateString("ru-RU")}
                    </p>
                  </Link>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="font-bold">{order.total_amount.toLocaleString("ru-RU")} ₽</span>
                    <span className={st.cls}>{st.label}</span>
                    {awaiting && (
                      <Button
                        size="sm"
                        onClick={() => pay(order.id)}
                        disabled={payingId === order.id}
                        className="btn-shine mt-1 h-8 rounded-full px-4 text-xs"
                      >
                        {payingId === order.id ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CreditCard className="mr-1 h-3.5 w-3.5" />
                        )}
                        Оплатить
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </LayoutWithSidebar>
  )
}

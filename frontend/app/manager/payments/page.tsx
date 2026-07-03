"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { toast } from "sonner"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { CheckCircle, XCircle, Loader2, CreditCard } from "lucide-react"

interface Order {
  id: number; company_name: string | null; client_name: string | null; client_email: string | null
  marketplace: string; destination_name: string | null; ship_date: string
  boxes_count: number; total_amount: number; payment_method: string | null
}

export default function ManagerPaymentsPage() {
  const qc = useQueryClient()

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["manager-payments"],
    queryFn: () => api.get("/manager/payments/awaiting"),
  })

  const confirmMut = useMutation({
    mutationFn: (id: number) => api.post(`/manager/payments/${id}/confirm`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["manager-payments"] }); toast.success("Оплата подтверждена, стикеры отправлены") },
    onError: (e: Error) => toast.error(e.message),
  })

  const cancelMut = useMutation({
    mutationFn: (id: number) => api.post(`/manager/payments/${id}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["manager-payments"] }); toast.success("Заказ отменён") },
    onError: (e: Error) => toast.error(e.message),
  })

  const total = orders.reduce((s, o) => s + o.total_amount, 0)

  return (
    <LayoutWithSidebar role="manager">
      <div className="space-y-5">
        {/* Header + одно мягкое аврора-свечение */}
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-12 left-0 h-56 w-[32rem] max-w-full rounded-full opacity-50 blur-3xl"
            style={{ background: "radial-gradient(circle, oklch(from var(--primary) l c h / 0.10) 0%, transparent 70%)" }}
          />
          <div className="relative flex items-center gap-3">
            <h1 className="text-2xl font-bold">Проверка оплат</h1>
            {orders.length > 0 && (
              <Badge className="bg-warning/15 text-warning border-0">{orders.length} ожидают</Badge>
            )}
          </div>
        </div>

        {/* Сумма к подтверждению — брендовая аврора-панель */}
        {orders.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--brand)] via-[var(--brand)] to-[var(--brand-dark)] p-6 text-white shadow-brand">
            <div className="aurora-wrap" aria-hidden>
              <div
                className="aurora-blob"
                style={{
                  width: 300, height: 300, top: "-40%", left: "-6%",
                  background: "radial-gradient(circle, #FFB27A 0%, transparent 68%)",
                }}
              />
              <div
                className="aurora-blob"
                style={{
                  width: 260, height: 260, bottom: "-50%", right: "-4%",
                  background: "radial-gradient(circle, #FF7A45 0%, transparent 66%)",
                  animationDelay: "-6s",
                }}
              />
            </div>
            <div className="relative flex items-end justify-between gap-3">
              <div>
                <div className="text-sm text-white/75">Сумма к подтверждению</div>
                <div className="text-xs text-white/60 mt-0.5">
                  {orders.length} {orders.length === 1 ? "заказ" : orders.length < 5 ? "заказа" : "заказов"}
                </div>
              </div>
              <div
                className="text-3xl font-bold tabular-nums leading-none"
                style={{ textShadow: "0 2px 16px rgba(0,0,0,0.25)" }}
              >
                {total.toLocaleString("ru-RU")} ₽
              </div>
            </div>
          </div>
        )}

        {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}

        {!isLoading && orders.length === 0 && (
          <Card className="rounded-2xl border-dashed border-border bg-muted/30">
            <CardContent className="py-14 text-center">
              <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[var(--brand-dark)] text-white shadow-brand">
                <CreditCard className="h-7 w-7" aria-hidden />
              </div>
              <p className="text-muted-foreground">Нет заказов ожидающих подтверждения</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {orders.map((order) => (
            <Card
              key={order.id}
              className="border-border transition-all duration-[var(--duration-base)] hover:border-primary/30 hover:shadow-md"
            >
              <CardContent className="py-4 px-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <Link href={`/manager/orders/${order.id}`} className="group flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-primary group-hover:underline">#{order.id}</span>
                      <Badge variant="outline" className="border-border text-xs">{order.marketplace.toUpperCase()}</Badge>
                      <span className="text-sm font-medium">{order.destination_name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.company_name || order.client_name} · {order.boxes_count} кор.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.ship_date).toLocaleDateString("ru-RU")}
                      {order.client_email && ` · ${order.client_email}`}
                    </p>
                  </Link>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="font-bold text-lg text-primary tabular-nums">{order.total_amount.toLocaleString("ru-RU")} ₽</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={() => cancelMut.mutate(order.id)}
                        disabled={cancelMut.isPending || confirmMut.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Отменить
                      </Button>
                      <Button
                        size="sm"
                        className="btn-shine rounded-full bg-success text-white hover:bg-success/90"
                        onClick={() => confirmMut.mutate(order.id)}
                        disabled={confirmMut.isPending || cancelMut.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" /> Подтвердить
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </LayoutWithSidebar>
  )
}

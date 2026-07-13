"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { toast } from "sonner"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { PIPELINE_TABS, advanceLabel } from "@/lib/manager-pipeline"
import { PackageCheck, ArrowRight, Loader2, Table2 } from "lucide-react"

interface Order {
  id: number
  company_name: string | null
  client_name: string | null
  client_email: string | null
  marketplace: string
  destination_name: string | null
  ship_date: string
  boxes_count: number
  total_amount: number
  payment_method: string | null
  service_pickup: boolean
  status: string
}

type Counts = Record<string, number>

export default function ManagerOrdersPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<string>("paid")

  const { data: counts = {} } = useQuery<Counts>({
    queryKey: ["manager-order-counts"],
    queryFn: () => api.get("/manager/orders/counts"),
  })

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["manager-orders", tab],
    queryFn: () => api.get(`/manager/orders/by-status?status=${tab}`),
  })

  const advanceMut = useMutation({
    mutationFn: (id: number) => api.post(`/manager/orders/${id}/advance`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manager-orders"] })
      qc.invalidateQueries({ queryKey: ["manager-order-counts"] })
      qc.invalidateQueries({ queryKey: ["manager-to-ship"] })
      toast.success("Заказ переведён на следующий этап")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <LayoutWithSidebar role="manager">
      <div className="space-y-5">
        {/* Header */}
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-12 left-0 h-56 w-[32rem] max-w-full rounded-full opacity-50 blur-3xl"
            style={{ background: "radial-gradient(circle, oklch(from var(--primary) l c h / 0.10) 0%, transparent 70%)" }}
          />
          <div className="relative flex items-center gap-3">
            <h1 className="text-2xl font-bold">Заказы</h1>
            <Link href="/manager/orders/table" className="ml-auto">
              <Button variant="outline" size="sm" className="rounded-full">
                <Table2 className="mr-1.5 h-4 w-4" /> Таблица
              </Button>
            </Link>
          </div>
          <p className="relative mt-1 text-sm text-muted-foreground">
            Отслеживайте и двигайте заказы по этапам: от оплаты до доставки
          </p>
        </div>

        {/* Вкладки по этапам */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {PIPELINE_TABS.map((t) => {
            const active = tab === t.status
            const n = counts[t.status] ?? 0
            return (
              <button
                key={t.status}
                onClick={() => setTab(t.status)}
                className={
                  "tap-target inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors " +
                  (active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground")
                }
              >
                {t.label}
                {n > 0 && (
                  <span
                    className={
                      "rounded-full px-1.5 text-xs font-semibold " +
                      (active ? "bg-white/25" : "bg-muted text-foreground")
                    }
                  >
                    {n}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && orders.length === 0 && (
          <Card className="rounded-2xl border-dashed border-border bg-muted/30">
            <CardContent className="py-14 text-center">
              <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[var(--brand-dark)] text-white shadow-brand">
                <PackageCheck className="h-7 w-7" aria-hidden />
              </div>
              <p className="text-muted-foreground">На этом этапе заказов нет</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {orders.map((order) => {
            const nextLabel = advanceLabel(order.status, order.service_pickup)
            return (
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
                        {order.service_pickup && (
                          <Badge className="bg-accent/60 text-foreground border-0 text-xs">Забор</Badge>
                        )}
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
                      <span className="font-bold text-lg text-primary tabular-nums">
                        {order.total_amount.toLocaleString("ru-RU")} ₽
                      </span>
                      {nextLabel && (
                        <Button
                          size="sm"
                          className="btn-shine rounded-full"
                          onClick={() => advanceMut.mutate(order.id)}
                          disabled={advanceMut.isPending}
                        >
                          {nextLabel} <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                    </div>
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

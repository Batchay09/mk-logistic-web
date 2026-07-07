"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { toast } from "sonner"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { PackageCheck, Truck, Loader2 } from "lucide-react"

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
}

export default function ManagerToShipPage() {
  const qc = useQueryClient()

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["manager-to-ship"],
    queryFn: () => api.get("/manager/orders/to-ship"),
  })

  const shipMut = useMutation({
    mutationFn: (id: number) => api.post(`/manager/orders/${id}/ship`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manager-to-ship"] })
      toast.success("Заказ взят в работу")
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
            <h1 className="text-2xl font-bold">К отправке</h1>
            {orders.length > 0 && (
              <Badge className="bg-primary/15 text-primary border-0">{orders.length}</Badge>
            )}
          </div>
          <p className="relative mt-1 text-sm text-muted-foreground">
            Оплаченные заказы, которые нужно взять в работу и отгрузить
          </p>
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
              <p className="text-muted-foreground">Нет оплаченных заказов в очереди</p>
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
                      <Badge className="bg-success/15 text-success border-0 text-xs">Оплачено</Badge>
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
                    <span className="font-bold text-lg text-primary tabular-nums">
                      {order.total_amount.toLocaleString("ru-RU")} ₽
                    </span>
                    <Button
                      size="sm"
                      className="btn-shine rounded-full"
                      onClick={() => shipMut.mutate(order.id)}
                      disabled={shipMut.isPending}
                    >
                      <Truck className="h-4 w-4 mr-1" /> Взять в работу
                    </Button>
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

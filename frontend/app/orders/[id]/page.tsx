"use client"

import { use } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { api, API_URL } from "@/lib/api"
import { statusMeta } from "@/lib/order-status"
import { FileDown, ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Order {
  id: number; status: string; marketplace: string; destination_name: string
  company_name: string | null; ship_date: string; arrival_date: string | null
  boxes_count: number; pallets_count: number; is_pallet_mode: boolean
  service_pickup: boolean; service_palletizing: boolean
  price_delivery: number; price_pickup: number; price_palletizing: number; total_amount: number
  payment_method: string | null
}

const STICKER_STATUSES = new Set(["confirmed", "awaiting_payment", "paid", "assigned", "picked_up", "in_transit", "delivered"])

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ["order", id],
    queryFn: () => api.get(`/client/orders/${id}`),
  })

  async function downloadStickers() {
    try {
      const url = `${API_URL}/stickers/${id}.pdf`
      const res = await fetch(url, { credentials: "include" })
      if (!res.ok) throw new Error("Нет доступа к стикерам")
      const blob = await res.blob()
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = `stickers_${id}.pdf`
      a.click()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка загрузки стикеров")
    }
  }

  if (isLoading) return (
    <LayoutWithSidebar role="client">
      <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
    </LayoutWithSidebar>
  )

  if (!order) return (
    <LayoutWithSidebar role="client">
      <div className="text-center py-20 text-muted-foreground">Заказ не найден</div>
    </LayoutWithSidebar>
  )

  const st = statusMeta(order.status)

  return (
    <LayoutWithSidebar role="client">
      <div className="relative max-w-xl mx-auto space-y-5">
        {/* Aurora-подсветка за заголовком */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-12 left-0 h-56 w-[32rem] max-w-full rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(from var(--primary) l c h / 0.10) 0%, transparent 70%)" }}
        />

        <div className="relative flex items-center gap-3">
          <Link href="/orders/active">
            <Button variant="ghost" size="icon" className="text-primary"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <h1 className="text-2xl font-bold">Заказ #{order.id}</h1>
          <span className={`${st.cls} ml-auto`}>{st.label}</span>
        </div>

        <Card className="relative border-border">
          <CardHeader className="pb-2"><CardTitle className="text-base">Детали заказа</CardTitle></CardHeader>
          <CardContent className="divide-y divide-border">
            <Row label="Маркетплейс" value={order.marketplace.toUpperCase()} />
            <Row label="Направление" value={order.destination_name || "—"} />
            {order.company_name && <Row label="Компания" value={order.company_name} />}
            <Row label="Дата сдачи" value={new Date(order.ship_date).toLocaleDateString("ru-RU")} />
            {order.arrival_date && <Row label="Дата прибытия" value={new Date(order.arrival_date).toLocaleDateString("ru-RU")} />}
            <Row label="Коробок" value={`${order.boxes_count} шт.`} />
            {order.is_pallet_mode && <Row label="Паллет" value={`${order.pallets_count} шт.`} />}
            <Row label="Забор груза" value={order.service_pickup ? "Да" : "Нет"} />
            {order.payment_method && <Row label="Способ оплаты" value={order.payment_method === "cash" ? "Наличные" : "Безналичный"} />}
          </CardContent>
        </Card>

        {/* Итог по заказу — брендовая аврора-панель */}
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

          <div className="relative space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-white/75">Доставка</span>
              <span className="tabular-nums">{order.price_delivery.toLocaleString("ru-RU")} ₽</span>
            </div>
            {order.price_pickup > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-white/75">Забор</span>
                <span className="tabular-nums">{order.price_pickup.toLocaleString("ru-RU")} ₽</span>
              </div>
            )}
            {order.price_palletizing > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-white/75">Паллетизация</span>
                <span className="tabular-nums">{order.price_palletizing.toLocaleString("ru-RU")} ₽</span>
              </div>
            )}
            <Separator className="my-4 bg-white/20" />
            <div className="flex items-end justify-between font-bold">
              <span className="text-lg">ИТОГО</span>
              <span
                className="text-2xl tabular-nums leading-none"
                style={{ textShadow: "0 2px 16px rgba(0,0,0,0.25)" }}
              >
                {order.total_amount.toLocaleString("ru-RU")} ₽
              </span>
            </div>
          </div>
        </div>

        {STICKER_STATUSES.has(order.status) && (
          <Button onClick={downloadStickers} className="btn-shine w-full rounded-full bg-primary hover:bg-primary/90">
            <FileDown className="h-4 w-4 mr-2" /> Скачать стикеры PDF
          </Button>
        )}
      </div>
    </LayoutWithSidebar>
  )
}

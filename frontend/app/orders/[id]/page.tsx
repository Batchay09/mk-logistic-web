"use client"

import { use } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { api, ApiError } from "@/lib/api"
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

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  new:              { label: "В корзине",          cls: "bg-yellow-100 text-yellow-800" },
  confirmed:        { label: "Подтверждён",         cls: "bg-blue-100 text-blue-800" },
  awaiting_payment: { label: "Ожидает оплаты",      cls: "bg-orange-100 text-orange-800" },
  paid:             { label: "Оплачен",             cls: "bg-green-100 text-green-800" },
  assigned:         { label: "Назначен водитель",   cls: "bg-purple-100 text-purple-800" },
  picked_up:        { label: "Забран",              cls: "bg-indigo-100 text-indigo-800" },
  in_transit:       { label: "В пути",              cls: "bg-cyan-100 text-cyan-800" },
  delivered:        { label: "Доставлен",           cls: "bg-green-100 text-green-800" },
  canceled:         { label: "Отменён",             cls: "bg-red-100 text-red-800" },
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

  const { data: order, isLoading, error } = useQuery<Order>({
    queryKey: ["order", id],
    queryFn: () => api.get(`/client/orders/${id}`),
  })

  async function downloadStickers() {
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/stickers/${id}.pdf`
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
      <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-[#D4512B]" /></div>
    </LayoutWithSidebar>
  )

  if (!order) return (
    <LayoutWithSidebar role="client">
      <div className="text-center py-20 text-muted-foreground">Заказ не найден</div>
    </LayoutWithSidebar>
  )

  const st = STATUS_MAP[order.status] || { label: order.status, cls: "bg-gray-100 text-gray-700" }

  return (
    <LayoutWithSidebar role="client">
      <div className="max-w-xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/orders/active">
            <Button variant="ghost" size="icon" className="text-[#D4512B]"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <h1 className="text-2xl font-bold">Заказ #{order.id}</h1>
          <Badge className={`${st.cls} border-0 ml-auto`}>{st.label}</Badge>
        </div>

        <Card className="border-[#EAC9B0]">
          <CardHeader className="pb-2"><CardTitle className="text-base">Детали заказа</CardTitle></CardHeader>
          <CardContent className="divide-y divide-[#EAC9B0]">
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

        <Card className="border-[#EAC9B0] bg-[#FBF0EA]">
          <CardContent className="pt-5 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Доставка</span>
              <span>{order.price_delivery.toLocaleString("ru-RU")} ₽</span>
            </div>
            {order.price_pickup > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Забор</span>
                <span>{order.price_pickup.toLocaleString("ru-RU")} ₽</span>
              </div>
            )}
            {order.price_palletizing > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Паллетизация</span>
                <span>{order.price_palletizing.toLocaleString("ru-RU")} ₽</span>
              </div>
            )}
            <Separator className="bg-[#EAC9B0]" />
            <div className="flex justify-between font-bold text-lg">
              <span>ИТОГО</span>
              <span className="text-[#D4512B]">{order.total_amount.toLocaleString("ru-RU")} ₽</span>
            </div>
          </CardContent>
        </Card>

        {STICKER_STATUSES.has(order.status) && (
          <Button onClick={downloadStickers} className="w-full bg-[#D4512B] hover:bg-[#B33D1A]">
            <FileDown className="h-4 w-4 mr-2" /> Скачать стикеры PDF
          </Button>
        )}
      </div>
    </LayoutWithSidebar>
  )
}

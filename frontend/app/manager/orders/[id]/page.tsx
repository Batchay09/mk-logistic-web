"use client"

import { use } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { api } from "@/lib/api"
import { statusMeta } from "@/lib/order-status"
import { ArrowLeft, Loader2, CheckCircle, XCircle, User, Mail, Phone, MapPin } from "lucide-react"

interface OrderDetail {
  id: number
  status: string
  marketplace: string
  destination_name: string | null
  company_name: string | null
  payment_method: string | null
  ship_date: string | null
  arrival_date: string | null
  boxes_count: number
  pallets_count: number
  is_pallet_mode: boolean
  service_pickup: boolean
  service_palletizing: boolean
  price_delivery: number
  price_pickup: number
  price_palletizing: number
  total_amount: number
  yookassa_payment_id: string | null
  created_at: string | null
  client: { name: string | null; email: string | null; phone: string | null }
  pickup_address: { city: string; street: string; house: string; comment: string | null } | null
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-2 gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}

export default function ManagerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const qc = useQueryClient()

  const { data: order, isLoading } = useQuery<OrderDetail>({
    queryKey: ["manager-order", id],
    queryFn: () => api.get(`/manager/orders/${id}`),
  })

  const confirmMut = useMutation({
    mutationFn: () => api.post(`/manager/payments/${id}/confirm`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manager-payments"] })
      qc.invalidateQueries({ queryKey: ["manager-order", id] })
      toast.success("Оплата подтверждена, стикеры отправлены клиенту")
      router.push("/manager/payments")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const cancelMut = useMutation({
    mutationFn: () => api.post(`/manager/payments/${id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manager-payments"] })
      qc.invalidateQueries({ queryKey: ["manager-order", id] })
      toast.success("Заказ отменён")
      router.push("/manager/payments")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return (
    <LayoutWithSidebar role="manager">
      <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
    </LayoutWithSidebar>
  )

  if (!order) return (
    <LayoutWithSidebar role="manager">
      <div className="text-center py-20 text-muted-foreground">Заказ не найден</div>
    </LayoutWithSidebar>
  )

  const st = statusMeta(order.status)
  const canAct = order.status === "awaiting_payment"
  const acting = confirmMut.isPending || cancelMut.isPending
  const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("ru-RU") : "—")

  return (
    <LayoutWithSidebar role="manager">
      <div className="relative max-w-xl mx-auto space-y-5">
        {/* Aurora-подсветка за заголовком */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-12 left-0 h-56 w-[32rem] max-w-full rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(from var(--primary) l c h / 0.10) 0%, transparent 70%)" }}
        />

        <div className="relative flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-primary" onClick={() => router.back()} aria-label="Назад">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Заказ #{order.id}</h1>
          <span className={`${st.cls} ml-auto`}>{st.label}</span>
        </div>

        {/* Клиент */}
        <Card className="relative border-border">
          <CardHeader className="pb-2"><CardTitle className="text-base">Клиент</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            <div className="flex items-center gap-2.5 text-sm">
              <User className="size-4 text-muted-foreground shrink-0" aria-hidden />
              <span className="font-medium">{order.client.name || "—"}</span>
            </div>
            {order.client.email && (
              <a href={`mailto:${order.client.email}`} className="flex items-center gap-2.5 text-sm text-primary hover:underline">
                <Mail className="size-4 shrink-0" aria-hidden />
                {order.client.email}
              </a>
            )}
            {order.client.phone && (
              <a href={`tel:${order.client.phone}`} className="flex items-center gap-2.5 text-sm text-primary hover:underline">
                <Phone className="size-4 shrink-0" aria-hidden />
                {order.client.phone}
              </a>
            )}
          </CardContent>
        </Card>

        {/* Детали заказа */}
        <Card className="relative border-border">
          <CardHeader className="pb-2"><CardTitle className="text-base">Детали заказа</CardTitle></CardHeader>
          <CardContent className="divide-y divide-border">
            <Row label="Маркетплейс" value={order.marketplace.toUpperCase()} />
            <Row label="Направление" value={order.destination_name || "—"} />
            {order.company_name && <Row label="Компания" value={order.company_name} />}
            <Row label="Дата сдачи" value={fmtDate(order.ship_date)} />
            {order.arrival_date && <Row label="Дата прибытия" value={fmtDate(order.arrival_date)} />}
            <Row label="Коробок" value={`${order.boxes_count} шт.`} />
            {order.is_pallet_mode && <Row label="Паллет" value={`${order.pallets_count} шт.`} />}
            <Row label="Забор груза" value={order.service_pickup ? "Да" : "Нет"} />
            <Row label="Паллетизация" value={order.service_palletizing ? "Да" : "Нет"} />
            {order.payment_method && (
              <Row label="Способ оплаты" value={order.payment_method === "cash" ? "Наличные" : "Безналичный"} />
            )}
            <Row label="Создан" value={fmtDate(order.created_at)} />
            {order.yookassa_payment_id && <Row label="ID платежа ЮKassa" value={order.yookassa_payment_id} />}
          </CardContent>
        </Card>

        {/* Адрес забора */}
        {order.pickup_address && (
          <Card className="relative border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="size-4 text-primary" aria-hidden /> Адрес забора
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="font-medium">
                {order.pickup_address.city}, {order.pickup_address.street}, {order.pickup_address.house}
              </p>
              {order.pickup_address.comment && (
                <p className="text-muted-foreground mt-1">{order.pickup_address.comment}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Разбивка цены — брендовая аврора-панель */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--brand)] via-[var(--brand)] to-[var(--brand-dark)] p-6 text-white shadow-brand">
          <div className="aurora-wrap" aria-hidden>
            <div
              className="aurora-blob"
              style={{ width: 300, height: 300, top: "-40%", left: "-6%", background: "radial-gradient(circle, #FFB27A 0%, transparent 68%)" }}
            />
            <div
              className="aurora-blob"
              style={{ width: 260, height: 260, bottom: "-50%", right: "-4%", background: "radial-gradient(circle, #FF7A45 0%, transparent 66%)", animationDelay: "-6s" }}
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
              <span className="text-2xl tabular-nums leading-none" style={{ textShadow: "0 2px 16px rgba(0,0,0,0.25)" }}>
                {order.total_amount.toLocaleString("ru-RU")} ₽
              </span>
            </div>
          </div>
        </div>

        {/* Действия для заказов на подтверждении */}
        {canAct && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-12 rounded-full border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => cancelMut.mutate()}
              disabled={acting}
            >
              {cancelMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
              Отменить
            </Button>
            <Button
              className="btn-shine h-12 rounded-full bg-success text-white hover:bg-success/90"
              onClick={() => confirmMut.mutate()}
              disabled={acting}
            >
              {confirmMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Подтвердить оплату
            </Button>
          </div>
        )}
      </div>
    </LayoutWithSidebar>
  )
}

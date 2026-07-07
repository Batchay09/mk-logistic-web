"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { api } from "@/lib/api"
import { Trash2, Plus, ShoppingCart, CreditCard, Banknote, Loader2 } from "lucide-react"

interface Order {
  id: number
  status: string
  marketplace: string
  destination_name: string
  ship_date: string
  arrival_date: string
  boxes_count: number
  pallets_count: number
  is_pallet_mode: boolean
  service_pickup: boolean
  service_palletizing: boolean
  price_delivery: number
  price_pickup: number
  price_palletizing: number
  total_amount: number
  company_name: string | null
}

interface CheckoutResult {
  status: string
  order_ids: number[]
  total?: number
}

interface YooKassaPayment {
  payment_id: string
  confirmation_url: string
  total: number
}

export default function CartPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [paying, setPaying] = useState(false)

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["cart"],
    queryFn: () => api.get("/client/orders?status=new"),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/client/orders/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] })
      qc.invalidateQueries({ queryKey: ["orders"] })
      toast.success("Заказ удалён")
      setDeleteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  async function checkout(method: "cash" | "cashless") {
    if (!orders.length) return
    setPaying(true)
    try {
      if (method === "cash") {
        await api.post<CheckoutResult>("/client/cart/checkout", {
          order_ids: orders.map((o) => o.id),
          payment_method: "cash",
        })
        qc.invalidateQueries({ queryKey: ["cart"] })
        qc.invalidateQueries({ queryKey: ["orders"] })
        toast.success("Заказ(ы) подтверждены! Стикеры будут высланы на email.")
        router.push("/orders/active")
        return
      }

      // Безнал — создаём платёж в ЮKassa напрямую по заказам из корзины.
      // Заказы остаются в корзине (статус NEW), пока платёж не создан: если
      // ЮKassa вернёт ошибку, ничего не теряется и оплату можно повторить.
      const payment = await api.post<YooKassaPayment>("/payments/yookassa/create", {
        order_ids: orders.map((o) => o.id),
        return_url: `${window.location.origin}/orders/active`,
      })
      window.location.href = payment.confirmation_url
    } catch (e: Error | unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка оплаты")
      setPaying(false)
    }
  }

  const total = orders.reduce((s, o) => s + o.total_amount, 0)

  if (isLoading) return (
    <LayoutWithSidebar role="client">
      <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />Загрузка...
      </div>
    </LayoutWithSidebar>
  )

  return (
    <LayoutWithSidebar role="client">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Корзина</h1>
          <Link href="/orders/new">
            <Button variant="outline" className="rounded-full">
              <Plus className="h-4 w-4 mr-1" /> Добавить заказ
            </Button>
          </Link>
        </div>

        {orders.length === 0 ? (
          <Card className="border-dashed border-border bg-muted/30">
            <CardContent className="py-14 text-center">
              <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[var(--brand-dark)] text-white shadow-brand">
                <ShoppingCart className="h-7 w-7" aria-hidden />
              </div>
              <p className="font-semibold mb-1">Корзина пуста</p>
              <p className="text-sm text-muted-foreground mb-4">Добавьте заказ чтобы продолжить</p>
              <Link href="/orders/new">
                <Button className="btn-shine rounded-full px-6">Создать заказ</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Order list */}
            <div className="space-y-3">
              {orders.map((order) => (
                <Card
                  key={order.id}
                  className="group border-border transition-all duration-[var(--duration-base)] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
                >
                  <CardContent className="py-4 px-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-primary">#{order.id}</span>
                          <Badge variant="outline" className="border-border text-xs">
                            {order.marketplace.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-medium">{order.destination_name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Сдача: {new Date(order.ship_date).toLocaleDateString("ru-RU")} →{" "}
                          {order.arrival_date && new Date(order.arrival_date).toLocaleDateString("ru-RU")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {order.boxes_count} кор.
                          {order.is_pallet_mode && ` (${order.pallets_count} палл.)`}
                          {order.service_pickup && " • Забор"}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="font-bold text-primary tabular-nums">{order.total_amount.toLocaleString("ru-RU")} ₽</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteId(order.id)}
                          aria-label={`Удалить заказ #${order.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Totals & Payment — брендовая аврора-панель */}
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

              <div className="relative">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-sm text-white/75">Итого к оплате</div>
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

                <Separator className="my-5 bg-white/20" />

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => checkout("cash")}
                    disabled={paying}
                    className="glass-brand h-12 rounded-full text-white hover:bg-white/20"
                  >
                    {paying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Banknote className="h-4 w-4 mr-2" />}
                    Наличные
                  </Button>
                  <Button
                    onClick={() => checkout("cashless")}
                    disabled={paying}
                    className="btn-shine h-12 rounded-full bg-white font-semibold text-[var(--brand)] hover:bg-white"
                  >
                    {paying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                    Безналичный
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete confirm dialog */}
      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить заказ #{deleteId}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Это действие нельзя отменить.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setDeleteId(null)}>Отмена</Button>
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </LayoutWithSidebar>
  )
}

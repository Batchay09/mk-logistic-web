"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { api } from "@/lib/api"
import { Trash2, Plus, ShoppingCart, CreditCard, Banknote, Loader2, ExternalLink } from "lucide-react"

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
  sbp_phone?: string
  sbp_card?: string
  note?: string
}

export default function CartPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null)
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
      const result = await api.post<CheckoutResult>("/client/cart/checkout", {
        order_ids: orders.map((o) => o.id),
        payment_method: method,
      })
      setCheckoutResult(result)
      qc.invalidateQueries({ queryKey: ["cart"] })
      qc.invalidateQueries({ queryKey: ["orders"] })
      if (method === "cash") {
        toast.success("Заказ(ы) подтверждены! Стикеры будут высланы на email.")
        router.push("/orders/active")
      }
    } catch (e: Error | unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка оплаты")
    } finally {
      setPaying(false)
    }
  }

  const total = orders.reduce((s, o) => s + o.total_amount, 0)

  if (isLoading) return (
    <LayoutWithSidebar role="client">
      <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-[#D4512B]" />Загрузка...
      </div>
    </LayoutWithSidebar>
  )

  return (
    <LayoutWithSidebar role="client">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Корзина</h1>
          <Link href="/orders/new">
            <Button variant="outline" className="border-[#EAC9B0] text-[#D4512B] hover:bg-[#FBF0EA]">
              <Plus className="h-4 w-4 mr-1" /> Добавить заказ
            </Button>
          </Link>
        </div>

        {orders.length === 0 ? (
          <Card className="border-[#EAC9B0] border-dashed">
            <CardContent className="py-14 text-center">
              <ShoppingCart className="h-10 w-10 text-[#EAC9B0] mx-auto mb-3" />
              <p className="font-semibold mb-1">Корзина пуста</p>
              <p className="text-sm text-muted-foreground mb-4">Добавьте заказ чтобы продолжить</p>
              <Link href="/orders/new">
                <Button className="bg-[#D4512B] hover:bg-[#B33D1A]">Создать заказ</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Order list */}
            <div className="space-y-3">
              {orders.map((order) => (
                <Card key={order.id} className="border-[#EAC9B0]">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[#D4512B]">#{order.id}</span>
                          <Badge variant="outline" className="border-[#EAC9B0] text-xs">
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
                        <span className="font-bold text-[#D4512B]">{order.total_amount.toLocaleString("ru-RU")} ₽</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(order.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Totals & Payment */}
            <Card className="border-[#D4512B] bg-[#FBF0EA]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Итого к оплате</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-xl font-bold">
                  <span>Итого:</span>
                  <span className="text-[#D4512B]">{total.toLocaleString("ru-RU")} ₽</span>
                </div>
                <Separator className="bg-[#EAC9B0]" />
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => checkout("cash")}
                    disabled={paying}
                    variant="outline"
                    className="border-[#D4512B] text-[#D4512B] hover:bg-[#D4512B] hover:text-white h-12"
                  >
                    {paying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Banknote className="h-4 w-4 mr-2" />}
                    Наличные
                  </Button>
                  <Button
                    onClick={() => checkout("cashless")}
                    disabled={paying}
                    className="bg-[#D4512B] hover:bg-[#B33D1A] h-12"
                  >
                    {paying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                    Безналичный
                  </Button>
                </div>
              </CardContent>
            </Card>
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
            <Button variant="outline" onClick={() => setDeleteId(null)}>Отмена</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SBP payment dialog */}
      {checkoutResult?.status === "awaiting_payment" && (
        <Dialog open onOpenChange={() => setCheckoutResult(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Оплата через СБП</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <p className="font-medium text-[#D4512B] text-base">
                Сумма: {checkoutResult.total?.toLocaleString("ru-RU")} ₽
              </p>
              <div className="bg-[#FBF0EA] rounded-lg p-3 space-y-1 border border-[#EAC9B0]">
                <p><span className="text-muted-foreground">Карта:</span> {checkoutResult.sbp_card}</p>
                <p><span className="text-muted-foreground">Телефон:</span> {checkoutResult.sbp_phone}</p>
                <p><span className="text-muted-foreground">Назначение:</span> {checkoutResult.note}</p>
              </div>
              <p className="text-muted-foreground text-xs">
                После перевода менеджер подтвердит оплату и вышлет стикеры на email.
              </p>
            </div>
            <DialogFooter>
              <Button className="bg-[#D4512B] hover:bg-[#B33D1A]" onClick={() => {
                setCheckoutResult(null)
                router.push("/orders/active")
              }}>
                Я оплатил
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </LayoutWithSidebar>
  )
}

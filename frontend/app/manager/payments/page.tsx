"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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

  return (
    <LayoutWithSidebar role="manager">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Проверка оплат</h1>
          {orders.length > 0 && (
            <Badge className="bg-orange-100 text-orange-800 border-0">{orders.length} ожидают</Badge>
          )}
        </div>

        {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#D4512B]" /></div>}

        {!isLoading && orders.length === 0 && (
          <Card className="border-[#EAC9B0] border-dashed">
            <CardContent className="py-12 text-center">
              <CreditCard className="h-10 w-10 text-[#EAC9B0] mx-auto mb-3" />
              <p className="text-muted-foreground">Нет заказов ожидающих подтверждения</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id} className="border-[#EAC9B0]">
              <CardContent className="py-4 px-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#D4512B]">#{order.id}</span>
                      <Badge variant="outline" className="border-[#EAC9B0] text-xs">{order.marketplace.toUpperCase()}</Badge>
                      <span className="text-sm font-medium">{order.destination_name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.company_name || order.client_name} · {order.boxes_count} кор.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.ship_date).toLocaleDateString("ru-RU")}
                      {order.client_email && ` · ${order.client_email}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="font-bold text-lg text-[#D4512B]">{order.total_amount.toLocaleString("ru-RU")} ₽</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => cancelMut.mutate(order.id)}
                        disabled={cancelMut.isPending || confirmMut.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Отменить
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
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

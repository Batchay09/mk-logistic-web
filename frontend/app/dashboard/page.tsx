"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { statusMeta } from "@/lib/order-status"
import { Package, ShoppingCart, Truck, Plus, ArrowRight } from "lucide-react"

interface Order {
  id: number
  status: string
  marketplace: string
  destination_name: string
  ship_date: string
  boxes_count: number
  total_amount: number
}

export default function DashboardPage() {
  const { data: allOrders = [] } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => api.get("/client/orders"),
  })

  const cart = allOrders.filter((o) => o.status === "new")
  const active = allOrders.filter((o) => !["delivered", "canceled", "new"].includes(o.status))
  const recent = allOrders.filter((o) => ["delivered", "canceled"].includes(o.status)).slice(0, 3)

  return (
    <LayoutWithSidebar role="client">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Мой кабинет</h1>
          <Link href="/orders/new">
            <Button className="bg-[#D4512B] hover:bg-[#B33D1A]">
              <Plus className="h-4 w-4 mr-2" />
              Новый заказ
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/cart">
            <Card className="border-[#EAC9B0] hover:border-[#D4512B] transition-colors cursor-pointer">
              <CardContent className="pt-5 flex items-center gap-4">
                <div className="bg-yellow-100 rounded-lg p-3">
                  <ShoppingCart className="h-5 w-5 text-yellow-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{cart.length}</p>
                  <p className="text-sm text-muted-foreground">В корзине</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/orders/active">
            <Card className="border-[#EAC9B0] hover:border-[#D4512B] transition-colors cursor-pointer">
              <CardContent className="pt-5 flex items-center gap-4">
                <div className="bg-blue-100 rounded-lg p-3">
                  <Truck className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{active.length}</p>
                  <p className="text-sm text-muted-foreground">Активных заказов</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/orders/history">
            <Card className="border-[#EAC9B0] hover:border-[#D4512B] transition-colors cursor-pointer">
              <CardContent className="pt-5 flex items-center gap-4">
                <div className="bg-[#EAC9B0] rounded-lg p-3">
                  <Package className="h-5 w-5 text-[#D4512B]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{allOrders.length}</p>
                  <p className="text-sm text-muted-foreground">Всего заказов</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Cart reminder */}
        {cart.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-orange-800">У вас {cart.length} заказ(а) в корзине</p>
                <p className="text-sm text-orange-700">
                  Итого: {cart.reduce((s, o) => s + o.total_amount, 0).toLocaleString("ru-RU")} ₽
                </p>
              </div>
              <Link href="/cart">
                <Button className="bg-[#D4512B] hover:bg-[#B33D1A]">
                  Оплатить <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Active orders */}
        {active.length > 0 && (
          <Card className="border-[#EAC9B0]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                Активные заказы
                <Link href="/orders/active" className="text-sm text-[#D4512B] font-normal hover:underline">
                  Все →
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {active.slice(0, 5).map((order) => {
                  const st = statusMeta(order.status)
                  return (
                    <Link key={order.id} href={`/orders/${order.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-[#EAC9B0] hover:border-[#D4512B] transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-[#D4512B]">#{order.id}</span>
                          <span className="text-sm">{order.destination_name}</span>
                          <span className="text-xs text-muted-foreground">{order.boxes_count} кор.</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{order.total_amount.toLocaleString("ru-RU")} ₽</span>
                          <span className={st.cls}>{st.label}</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {allOrders.length === 0 && (
          <Card className="border-[#EAC9B0] border-dashed">
            <CardContent className="pt-10 pb-10 text-center">
              <Package className="h-10 w-10 text-[#EAC9B0] mx-auto mb-3" />
              <h3 className="font-semibold mb-1">Заказов пока нет</h3>
              <p className="text-sm text-muted-foreground mb-4">Создайте первый заказ на доставку</p>
              <Link href="/orders/new">
                <Button className="bg-[#D4512B] hover:bg-[#B33D1A]">
                  <Plus className="h-4 w-4 mr-2" /> Создать заказ
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </LayoutWithSidebar>
  )
}

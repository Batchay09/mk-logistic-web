"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { H2, H3, H4, Lead, Muted } from "@/components/ui/typography"
import { VStack, HStack } from "@/components/ui/stack"
import { api } from "@/lib/api"
import { statusMeta } from "@/lib/order-status"
import {
  Package,
  ShoppingCart,
  Truck,
  Plus,
  ArrowRight,
  type LucideIcon,
} from "lucide-react"

interface Order {
  id: number
  status: string
  marketplace: string
  destination_name: string
  ship_date: string
  boxes_count: number
  total_amount: number
}

interface StatCardProps {
  href: string
  icon: LucideIcon
  iconClassName: string
  value: number | string
  label: string
}

function StatCard({ href, icon: Icon, iconClassName, value, label }: StatCardProps) {
  return (
    <Link href={href} className="group">
      <Card
        className={
          "border-border bg-card rounded-2xl shadow-sm " +
          "hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40 " +
          "transition-all duration-[var(--duration-base)] cursor-pointer"
        }
      >
        <CardContent className="p-5 flex items-center gap-4">
          <div
            className={
              "rounded-xl p-3 transition-colors duration-[var(--duration-base)] " +
              iconClassName
            }
          >
            <Icon className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-foreground leading-none">
              {value}
            </p>
            <Muted className="mt-1">{label}</Muted>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function DashboardPage() {
  const { data: allOrders = [] } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => api.get("/client/orders"),
  })

  const cart = allOrders.filter((o) => o.status === "new")
  const active = allOrders.filter(
    (o) => !["delivered", "canceled", "new"].includes(o.status),
  )
  const cartTotal = cart.reduce((s, o) => s + o.total_amount, 0)

  return (
    <LayoutWithSidebar role="client">
      <VStack gap="lg" className="w-full">
        {/* Header */}
        <HStack justify="between" align="center" className="flex-wrap gap-3">
          <div className="space-y-1">
            <H2 className="text-2xl sm:text-3xl">Мой кабинет</H2>
            <Muted>Все заказы и компании в одном месте</Muted>
          </div>
          <Link href="/orders/new" className="ml-auto">
            <Button
              size="lg"
              className="h-11 px-5 shadow-sm tap-target font-medium"
            >
              <Plus className="size-4" aria-hidden />
              Новый заказ
            </Button>
          </Link>
        </HStack>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            href="/cart"
            icon={ShoppingCart}
            iconClassName="bg-warning/15 text-warning group-hover:bg-warning/25"
            value={cart.length}
            label="В корзине"
          />
          <StatCard
            href="/orders/active"
            icon={Truck}
            iconClassName="bg-info/15 text-info group-hover:bg-info/25"
            value={active.length}
            label="Активных заказов"
          />
          <StatCard
            href="/orders/history"
            icon={Package}
            iconClassName="bg-primary/15 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
            value={allOrders.length}
            label="Всего заказов"
          />
        </div>

        {/* Cart reminder */}
        {cart.length > 0 && (
          <Card className="border-primary/20 bg-primary/5 rounded-2xl shadow-sm">
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">
                  У вас {cart.length} заказ
                  {cart.length === 1 ? "" : cart.length < 5 ? "а" : "ов"}{" "}
                  в корзине
                </p>
                <Muted>
                  Итого:{" "}
                  <span className="font-semibold text-foreground">
                    {cartTotal.toLocaleString("ru-RU")} ₽
                  </span>
                </Muted>
              </div>
              <Link href="/cart" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-11 px-5 shadow-sm tap-target font-medium"
                >
                  Оплатить
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Active orders */}
        {active.length > 0 && (
          <Card className="border-border bg-card rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <H4 className="text-base sm:text-lg">Активные заказы</H4>
                <Link
                  href="/orders/active"
                  className="text-sm font-medium text-primary hover:underline tap-target inline-flex items-center"
                >
                  Все
                  <ArrowRight className="size-3.5 ml-1" aria-hidden />
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="flex flex-col gap-2">
                {active.slice(0, 5).map((order) => {
                  const st = statusMeta(order.status)
                  return (
                    <li key={order.id}>
                      <Link
                        href={`/orders/${order.id}`}
                        className={
                          "flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl " +
                          "border border-border bg-background " +
                          "hover:border-primary/40 hover:bg-muted/40 " +
                          "transition-colors duration-[var(--duration-fast)]"
                        }
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-sm font-semibold text-primary shrink-0">
                            #{order.id}
                          </span>
                          <span className="text-sm text-foreground truncate">
                            {order.destination_name}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {order.boxes_count} кор.
                          </span>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          <span className="text-sm font-medium text-foreground">
                            {order.total_amount.toLocaleString("ru-RU")} ₽
                          </span>
                          <span className={st.cls}>{st.label}</span>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {allOrders.length === 0 && (
          <Card className="border-dashed border-border bg-muted/30 rounded-2xl">
            <CardContent className="py-12 text-center">
              <div className="mx-auto bg-primary/10 text-primary rounded-2xl p-4 w-16 h-16 flex items-center justify-center mb-4">
                <Package className="size-7" aria-hidden />
              </div>
              <H3 className="text-xl mb-1">Заказов пока нет</H3>
              <Lead className="text-base mb-5">
                Создайте первый заказ на доставку
              </Lead>
              <Link href="/orders/new">
                <Button size="lg" className="h-11 px-6 shadow-sm tap-target">
                  <Plus className="size-4" aria-hidden />
                  Создать заказ
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </VStack>
    </LayoutWithSidebar>
  )
}

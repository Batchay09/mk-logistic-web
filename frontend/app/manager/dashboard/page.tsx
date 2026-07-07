"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { CreditCard, Search, BarChart3, ArrowRight, PackageCheck } from "lucide-react"

export default function ManagerDashboard() {
  const { data: awaiting = [] } = useQuery<unknown[]>({
    queryKey: ["manager-payments"],
    queryFn: () => api.get("/manager/payments/awaiting"),
  })

  const { data: toShip = [] } = useQuery<unknown[]>({
    queryKey: ["manager-to-ship"],
    queryFn: () => api.get("/manager/orders/to-ship"),
  })

  const hasAwaiting = awaiting.length > 0
  const hasToShip = toShip.length > 0

  return (
    <LayoutWithSidebar role="manager">
      <div className="space-y-6">
        {/* Header + одно мягкое аврора-свечение */}
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-12 left-0 h-56 w-[32rem] max-w-full rounded-full opacity-50 blur-3xl"
            style={{ background: "radial-gradient(circle, oklch(from var(--primary) l c h / 0.10) 0%, transparent 70%)" }}
          />
          <h1 className="relative text-2xl font-bold">Панель менеджера</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/manager/orders" className="group">
            <Card
              className={
                "rounded-2xl transition-all duration-[var(--duration-base)] cursor-pointer hover:shadow-md hover:-translate-y-0.5 " +
                (hasToShip
                  ? "border-primary/40 bg-primary/5 hover:border-primary/60"
                  : "border-border hover:border-primary/40")
              }
            >
              <CardContent className="pt-5 flex items-center gap-4">
                <div className="rounded-xl p-3 bg-primary/15 text-primary transition-colors duration-[var(--duration-base)] group-hover:bg-primary group-hover:text-primary-foreground">
                  <PackageCheck className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground leading-none">{toShip.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">К отправке</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/manager/payments" className="group">
            <Card
              className={
                "rounded-2xl transition-all duration-[var(--duration-base)] cursor-pointer hover:shadow-md hover:-translate-y-0.5 " +
                (hasAwaiting
                  ? "border-warning/40 bg-warning/5 hover:border-warning/60"
                  : "border-border hover:border-primary/40")
              }
            >
              <CardContent className="pt-5 flex items-center gap-4">
                <div
                  className={
                    "rounded-xl p-3 transition-colors duration-[var(--duration-base)] " +
                    (hasAwaiting
                      ? "bg-warning/15 text-warning group-hover:bg-warning/25"
                      : "bg-primary/15 text-primary group-hover:bg-primary group-hover:text-primary-foreground")
                  }
                >
                  <CreditCard className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground leading-none">{awaiting.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">Ожидают оплаты</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/manager/search" className="group">
            <Card className="rounded-2xl border-border transition-all duration-[var(--duration-base)] cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40">
              <CardContent className="pt-5 flex items-center gap-4">
                <div className="rounded-xl p-3 bg-primary/15 text-primary transition-colors duration-[var(--duration-base)] group-hover:bg-primary group-hover:text-primary-foreground">
                  <Search className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Поиск</p>
                  <p className="text-sm text-muted-foreground">По ИП или дате</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/manager/reports" className="group">
            <Card className="rounded-2xl border-border transition-all duration-[var(--duration-base)] cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40">
              <CardContent className="pt-5 flex items-center gap-4">
                <div className="rounded-xl p-3 bg-primary/15 text-primary transition-colors duration-[var(--duration-base)] group-hover:bg-primary group-hover:text-primary-foreground">
                  <BarChart3 className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Отчёты</p>
                  <p className="text-sm text-muted-foreground">Excel импорт/экспорт</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {hasToShip && (
          <Card className="rounded-2xl border-primary/30 bg-primary/5">
            <CardContent className="pt-5 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-semibold text-foreground">{toShip.length} оплаченных заказ(ов) в очереди на отправку</p>
                <p className="text-sm text-muted-foreground">Возьмите их в работу и отгрузите</p>
              </div>
              <Link href="/manager/orders">
                <Button className="btn-shine rounded-full">
                  Открыть <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {hasAwaiting && (
          <Card className="rounded-2xl border-warning/30 bg-warning/5">
            <CardContent className="pt-5 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-semibold text-foreground">{awaiting.length} заказ(а) ожидают подтверждения оплаты</p>
                <p className="text-sm text-muted-foreground">Клиенты ждут подтверждения и стикеров</p>
              </div>
              <Link href="/manager/payments">
                <Button className="btn-shine rounded-full">
                  Проверить <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </LayoutWithSidebar>
  )
}

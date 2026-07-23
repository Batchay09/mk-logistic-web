"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { forgetPayment, recallPayment, startPayment, syncPayments } from "@/lib/payments"
import { CheckCircle2, Clock, Loader2, ShoppingCart, RefreshCw, FileDown } from "lucide-react"

// При успешной оплате ЮKassa обычно подтверждает платёж ещё до редиректа, но
// webhook об успехе может отстать на секунду-две. Делаем максимум 2 короткие
// проверки, чтобы поймать этот случай, — и не крутим спиннер дольше.
const EXTRA_CHECKS = 2
const CHECK_DELAY_MS = 1500

// Что показываем: проверяем / оплачено / не завершено / нечего проверять.
type View = "checking" | "paid" | "unpaid" | "empty"

export default function PaymentResultPage() {
  const [view, setView] = useState<View>("checking")
  const [orderIds, setOrderIds] = useState<number[]>([])
  const [retrying, setRetrying] = useState(false)
  const alive = useRef(true)

  const check = useCallback(async () => {
    setView("checking")
    for (let attempt = 0; ; attempt++) {
      let result
      try {
        result = await syncPayments(recallPayment())
      } catch {
        // Сверка не удалась (ЮKassa недоступна или платёж не найден) — заказы
        // всё равно видны в кабинете, не пугаем ошибкой.
        if (alive.current) setView("empty")
        return
      }
      if (!alive.current) return

      setOrderIds(result.order_ids)

      if (result.status === "succeeded") {
        forgetPayment()
        setView("paid")
        return
      }
      if (result.status === "none") {
        setView("empty")
        return
      }
      // pending/canceled — оплата не завершена. Ещё разок подождём успех,
      // потом показываем «не завершено».
      if (attempt >= EXTRA_CHECKS) {
        forgetPayment()
        setView("unpaid")
        return
      }
      await new Promise((r) => setTimeout(r, CHECK_DELAY_MS))
      if (!alive.current) return
    }
  }, [])

  useEffect(() => {
    alive.current = true
    check()
    return () => {
      alive.current = false
    }
  }, [check])

  async function retry() {
    if (!orderIds.length) return
    setRetrying(true)
    try {
      await startPayment(orderIds)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Не удалось создать платёж")
      setRetrying(false)
    }
  }

  return (
    <LayoutWithSidebar role="client">
      <div className="mx-auto max-w-lg py-6">
        <Card className="relative overflow-hidden border-border">
          <div className="aurora-wrap" aria-hidden>
            <div
              className="aurora-blob"
              style={{
                width: 320, height: 320, top: "-45%", left: "-10%",
                background: "radial-gradient(circle, var(--brand) 0%, transparent 70%)",
                opacity: 0.16,
              }}
            />
          </div>

          <CardContent className="relative py-12 text-center">
            {view === "checking" && (
              <>
                <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-muted">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
                </div>
                <h1 className="mb-1 text-xl font-bold">Проверяем оплату</h1>
                <p className="text-sm text-muted-foreground">Это займёт пару секунд</p>
              </>
            )}

            {view === "paid" && (
              <>
                <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[var(--brand-dark)] text-white shadow-brand">
                  <CheckCircle2 className="h-8 w-8" aria-hidden />
                </div>
                <h1 className="mb-1 text-xl font-bold">Оплачено</h1>
                <p className="mb-6 text-sm text-muted-foreground">
                  {orderIds.length === 1
                    ? `Заказ #${orderIds[0]} оплачен.`
                    : `Заказы ${orderIds.map((id) => `#${id}`).join(", ")} оплачены.`}{" "}
                  Стикеры отправлены на вашу почту и доступны в заказе.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  {orderIds.length === 1 && (
                    <Link href={`/orders/${orderIds[0]}`}>
                      <Button className="btn-shine w-full rounded-full px-6 sm:w-auto">
                        <FileDown className="mr-2 h-4 w-4" /> Открыть заказ
                      </Button>
                    </Link>
                  )}
                  <Link href="/orders/active">
                    <Button
                      variant={orderIds.length === 1 ? "outline" : "default"}
                      className="w-full rounded-full px-6 sm:w-auto"
                    >
                      Мои заказы
                    </Button>
                  </Link>
                </div>
              </>
            )}

            {view === "unpaid" && (
              <>
                <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-secondary/40 text-primary">
                  <Clock className="h-8 w-8" aria-hidden />
                </div>
                <h1 className="mb-1 text-xl font-bold">Оплата не завершена</h1>
                <p className="mb-6 text-sm text-muted-foreground">
                  Деньги не списаны.{" "}
                  {orderIds.length === 1 ? "Заказ" : "Заказы"} ожидает оплаты — можно оплатить
                  сейчас или вернуться к этому позже в «Моих заказах».
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button
                    onClick={retry}
                    disabled={retrying || !orderIds.length}
                    className="btn-shine w-full rounded-full px-6 sm:w-auto"
                  >
                    {retrying ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Оплатить
                  </Button>
                  <Link href="/orders/active">
                    <Button variant="outline" className="w-full rounded-full px-6 sm:w-auto">
                      Мои заказы
                    </Button>
                  </Link>
                </div>
              </>
            )}

            {view === "empty" && (
              <>
                <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-muted text-muted-foreground">
                  <ShoppingCart className="h-7 w-7" aria-hidden />
                </div>
                <h1 className="mb-1 text-xl font-bold">Нет платежей в работе</h1>
                <p className="mb-6 text-sm text-muted-foreground">
                  Незавершённых оплат не найдено. Проверьте статус в списке заказов.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Link href="/orders/active">
                    <Button className="btn-shine w-full rounded-full px-6 sm:w-auto">Мои заказы</Button>
                  </Link>
                  <Link href="/cart">
                    <Button variant="outline" className="w-full rounded-full px-6 sm:w-auto">
                      <ShoppingCart className="mr-2 h-4 w-4" /> В корзину
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </LayoutWithSidebar>
  )
}

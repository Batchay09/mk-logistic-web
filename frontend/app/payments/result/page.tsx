"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  forgetPayment,
  recallPayment,
  startPayment,
  syncPayments,
  type PaymentStatus,
} from "@/lib/payments"
import { CheckCircle2, XCircle, Loader2, ShoppingCart, RefreshCw, FileDown } from "lucide-react"

// Платёж редко подтверждается мгновенно: webhook от ЮKassa может отстать
// от редиректа на пару секунд. Поэтому не выносим вердикт сразу, а
// переспрашиваем несколько раз, прежде чем показать «обрабатывается».
const POLL_ATTEMPTS = 5
const POLL_DELAY_MS = 2000

export default function PaymentResultPage() {
  const router = useRouter()
  const [status, setStatus] = useState<PaymentStatus | "checking">("checking")
  const [orderIds, setOrderIds] = useState<number[]>([])
  const [retrying, setRetrying] = useState(false)
  // Опрос переживает уход со страницы — не трогаем state после размонтирования.
  const alive = useRef(true)

  const check = useCallback(async () => {
    setStatus("checking")
    for (let attempt = 0; ; attempt++) {
      let result
      try {
        result = await syncPayments(recallPayment())
      } catch {
        // Сверка не удалась (ЮKassa недоступна или платёж не найден) — не пугаем
        // клиента ошибкой: заказы в любом случае видны в кабинете.
        if (alive.current) setStatus("none")
        return
      }
      if (!alive.current) return

      if (result.status !== "pending" || attempt >= POLL_ATTEMPTS) {
        setOrderIds(result.order_ids)
        setStatus(result.status)
        if (result.status === "succeeded" || result.status === "canceled") forgetPayment()
        return
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS))
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
    if (!orderIds.length) {
      router.push("/cart")
      return
    }
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
            {status === "checking" && (
              <>
                <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-muted">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
                </div>
                <h1 className="mb-1 text-xl font-bold">Проверяем оплату</h1>
                <p className="text-sm text-muted-foreground">Это займёт несколько секунд</p>
              </>
            )}

            {status === "succeeded" && (
              <>
                <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[var(--brand-dark)] text-white shadow-brand">
                  <CheckCircle2 className="h-8 w-8" aria-hidden />
                </div>
                <h1 className="mb-1 text-xl font-bold">Оплата прошла</h1>
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

            {status === "canceled" && (
              <>
                <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-destructive/10 text-destructive">
                  <XCircle className="h-8 w-8" aria-hidden />
                </div>
                <h1 className="mb-1 text-xl font-bold">Оплата не прошла</h1>
                <p className="mb-6 text-sm text-muted-foreground">
                  Платёж отменён или не был завершён. Деньги не списаны,
                  {orderIds.length ? " заказы вернулись в корзину" : " заказы остались в корзине"} —
                  можно попробовать снова.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button
                    onClick={retry}
                    disabled={retrying}
                    className="btn-shine w-full rounded-full px-6 sm:w-auto"
                  >
                    {retrying ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Повторить оплату
                  </Button>
                  <Link href="/cart">
                    <Button variant="outline" className="w-full rounded-full px-6 sm:w-auto">
                      <ShoppingCart className="mr-2 h-4 w-4" /> В корзину
                    </Button>
                  </Link>
                </div>
              </>
            )}

            {status === "pending" && (
              <>
                <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-muted">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
                </div>
                <h1 className="mb-1 text-xl font-bold">Платёж обрабатывается</h1>
                <p className="mb-6 text-sm text-muted-foreground">
                  Банк ещё не подтвердил оплату. Как только деньги поступят, заказ станет
                  оплаченным, а стикеры придут на почту — это может занять несколько минут.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button
                    onClick={check}
                    className="w-full rounded-full px-6 sm:w-auto"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> Проверить ещё раз
                  </Button>
                  <Link href="/orders/active">
                    <Button variant="outline" className="w-full rounded-full px-6 sm:w-auto">
                      Мои заказы
                    </Button>
                  </Link>
                </div>
              </>
            )}

            {status === "none" && (
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

import { api } from "./api"

export interface YooKassaPayment {
  payment_id: string
  confirmation_url: string
  total: number
}

export type PaymentStatus = "succeeded" | "canceled" | "pending" | "none"

export interface PaymentSyncResult {
  status: PaymentStatus
  order_ids: number[]
  paid_order_ids: number[]
}

/** Ключ sessionStorage с id последнего платежа. */
export const LAST_PAYMENT_KEY = "mk:last-payment-id"

export function rememberPayment(paymentId: string) {
  try {
    sessionStorage.setItem(LAST_PAYMENT_KEY, paymentId)
  } catch {
    // Приватный режим браузера — не критично: страница результата
    // спросит бэкенд про все незавершённые платежи клиента.
  }
}

export function recallPayment(): string | null {
  try {
    return sessionStorage.getItem(LAST_PAYMENT_KEY)
  } catch {
    return null
  }
}

export function forgetPayment() {
  try {
    sessionStorage.removeItem(LAST_PAYMENT_KEY)
  } catch {}
}

/**
 * Создаёт платёж в ЮKassa и уводит клиента на форму оплаты.
 *
 * Id платежа запоминаем до редиректа: ЮKassa возвращает на return_url без
 * параметров, а странице результата нужно знать, судьбу какого платежа проверять.
 */
export async function startPayment(orderIds: number[]): Promise<void> {
  const payment = await api.post<YooKassaPayment>("/payments/yookassa/create", {
    order_ids: orderIds,
    return_path: "/payments/result",
  })
  rememberPayment(payment.payment_id)
  window.location.href = payment.confirmation_url
}

/**
 * Спрашивает у бэкенда настоящий статус платежа (тот сверяет его с ЮKassa).
 *
 * Возврат на сайт не означает, что деньги прошли, а webhook может опоздать —
 * поэтому статус всегда подтверждаем сверкой, а не фактом редиректа.
 */
export function syncPayments(paymentId?: string | null) {
  const query = paymentId ? `?payment_id=${encodeURIComponent(paymentId)}` : ""
  return api.post<PaymentSyncResult>(`/payments/yookassa/sync${query}`)
}

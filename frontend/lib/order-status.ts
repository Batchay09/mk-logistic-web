// Order status palette — DaNet design system (8+1 statuses).
// Maps backend status code → user-facing label + CSS class from globals.css

export type OrderStatus =
  | "new" | "confirmed" | "awaiting_payment" | "paid"
  | "assigned" | "picked_up" | "in_transit" | "delivered" | "canceled"

interface StatusMeta {
  label: string
  cls: string  // matches .status-* in globals.css
}

const MAP: Record<string, StatusMeta> = {
  new:              { label: "В корзине",        cls: "status-badge status-new" },
  confirmed:        { label: "Подтверждён",      cls: "status-badge status-confirmed" },
  awaiting_payment: { label: "Ожидает оплаты",   cls: "status-badge status-awaiting" },
  paid:             { label: "Оплачен",          cls: "status-badge status-paid" },
  assigned:         { label: "Назначен водитель", cls: "status-badge status-assigned" },
  picked_up:        { label: "Забран",           cls: "status-badge status-picked" },
  in_transit:       { label: "В пути",           cls: "status-badge status-transit" },
  delivered:        { label: "Доставлен",        cls: "status-badge status-delivered" },
  canceled:         { label: "Отменён",          cls: "status-badge status-canceled" },
}

const FALLBACK: StatusMeta = { label: "—", cls: "status-badge status-new" }

export function statusMeta(code: string): StatusMeta {
  return MAP[code] ?? { ...FALLBACK, label: code }
}

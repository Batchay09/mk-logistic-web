// Пайплайн исполнения заказа для менеджера (после оплаты).
// Зеркалит логику backend (app/api/manager.py): «Забрано» — только для
// заказов с услугой забора груза.

export interface PipelineTab {
  status: string
  label: string
}

/** Вкладки страницы «Заказы» — этапы после оплаты. */
export const PIPELINE_TABS: PipelineTab[] = [
  { status: "paid", label: "К отправке" },
  { status: "assigned", label: "В работе" },
  { status: "picked_up", label: "Забран" },
  { status: "in_transit", label: "В пути" },
  { status: "delivered", label: "Доставлен" },
]

/** Последовательность этапов. «picked_up» — только при заборе груза. */
export function pipelineSeq(servicePickup: boolean): string[] {
  return servicePickup
    ? ["paid", "assigned", "picked_up", "in_transit", "delivered"]
    : ["paid", "assigned", "in_transit", "delivered"]
}

/** Следующий этап или null, если заказ на финальном этапе / вне пайплайна. */
export function nextStatus(status: string, servicePickup: boolean): string | null {
  const seq = pipelineSeq(servicePickup)
  const i = seq.indexOf(status)
  if (i < 0 || i + 1 >= seq.length) return null
  return seq[i + 1]
}

// Подпись кнопки продвижения — по целевому (следующему) этапу.
const ADVANCE_LABEL: Record<string, string> = {
  assigned: "Взять в работу",
  picked_up: "Отметить забранным",
  in_transit: "Отправить в путь",
  delivered: "Отметить доставленным",
}

/** Текст кнопки «следующий этап» или null, если продвигать некуда. */
export function advanceLabel(status: string, servicePickup: boolean): string | null {
  const next = nextStatus(status, servicePickup)
  return next ? ADVANCE_LABEL[next] ?? "Следующий этап" : null
}

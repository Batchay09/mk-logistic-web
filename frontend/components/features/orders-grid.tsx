"use client"

import { statusMeta } from "@/lib/order-status"
import {
  cellValue,
  EditableFields,
  EditableKey,
  GRID_EDITABLE_STATUSES,
  GRID_STATUS_OPTIONS,
  OrderGridRow,
} from "@/lib/manager-grid"

interface OrdersGridProps {
  rows: OrderGridRow[]
  drafts: Map<number, EditableFields>
  errors: Map<number, string>
  onCellChange: (row: OrderGridRow, key: EditableKey, value: string | null) => void
  onCellRevert: (orderId: number, key: EditableKey) => void
}

const TH = "sticky top-0 z-10 bg-muted px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b-2 border-border whitespace-nowrap"
const TD = "border-b border-r border-border p-0 whitespace-nowrap last:border-r-0"
const CELL_INPUT = "w-full bg-transparent px-2.5 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/50"

function dirtyCls(isDirty: boolean, hasError: boolean): string {
  if (hasError) return " bg-destructive/10 ring-1 ring-inset ring-destructive"
  if (isDirty) return " bg-warning/15 ring-1 ring-inset ring-warning"
  return ""
}

/** Excel-навигация: Enter — та же колонка строкой ниже, Esc — откат ячейки. */
function useGridKeys(onCellRevert: OrdersGridProps["onCellRevert"]) {
  return (e: React.KeyboardEvent, row: OrderGridRow, key: EditableKey, rowIndex: number) => {
    if (e.key === "Enter") {
      e.preventDefault()
      const next = document.querySelector<HTMLElement>(`[data-cell="${key}:${rowIndex + 1}"]`)
      next?.focus()
    }
    if (e.key === "Escape") {
      onCellRevert(row.id, key)
      ;(e.target as HTMLElement).blur()
    }
  }
}

export function OrdersGrid({ rows, drafts, errors, onCellChange, onCellRevert }: OrdersGridProps) {
  const handleKeys = useGridKeys(onCellRevert)

  const isDirty = (row: OrderGridRow, key: EditableKey) => {
    const entry = drafts.get(row.id)
    return !!entry && key in entry
  }

  return (
    <div className="max-h-[calc(100dvh-300px)] min-h-[320px] overflow-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[1180px] border-collapse text-[13px]">
        <thead>
          <tr>
            <th className={TH}>#</th>
            <th className={TH}>Компания</th>
            <th className={TH}>Клиент</th>
            <th className={TH}>Направление</th>
            <th className={TH}>Отправка</th>
            <th className={TH}>Прибытие</th>
            <th className={`${TH} text-right`}>Кор.</th>
            <th className={`${TH} text-right`}>Сумма</th>
            <th className={TH}>Оплата</th>
            <th className={TH}>Статус</th>
            <th className={TH}>Заметка</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const rowError = errors.get(row.id)
            const statusEditable = GRID_EDITABLE_STATUSES.has(row.status)
            const st = statusMeta(cellValue(row, drafts, "status"))
            return (
              <tr key={row.id} title={rowError} className={rowError ? "bg-destructive/5" : undefined}>
                <td className={TD}>
                  <span className="block px-2.5 py-2 tabular-nums text-muted-foreground">{row.id}</span>
                </td>
                <td className={TD + dirtyCls(isDirty(row, "company_name"), !!rowError)}>
                  <input
                    className={CELL_INPUT}
                    data-cell={`company_name:${i}`}
                    value={cellValue(row, drafts, "company_name")}
                    onChange={(e) => onCellChange(row, "company_name", e.target.value || null)}
                    onKeyDown={(e) => handleKeys(e, row, "company_name", i)}
                  />
                </td>
                <td className={TD}>
                  <span className="block px-2.5 py-2 text-muted-foreground">
                    {row.client_name || "—"}
                    {row.client_phone && <span className="ml-1.5">· {row.client_phone}</span>}
                  </span>
                </td>
                <td className={TD}>
                  <span className="block px-2.5 py-2">
                    {row.destination_name || "—"}{" "}
                    <span className="text-muted-foreground uppercase">· {row.marketplace}</span>
                  </span>
                </td>
                <td className={TD + dirtyCls(isDirty(row, "ship_date"), !!rowError)}>
                  <input
                    type="date"
                    className={CELL_INPUT}
                    data-cell={`ship_date:${i}`}
                    value={cellValue(row, drafts, "ship_date")}
                    onChange={(e) => onCellChange(row, "ship_date", e.target.value || null)}
                    onKeyDown={(e) => handleKeys(e, row, "ship_date", i)}
                  />
                </td>
                <td className={TD + dirtyCls(isDirty(row, "arrival_date"), !!rowError)}>
                  <input
                    type="date"
                    className={CELL_INPUT}
                    data-cell={`arrival_date:${i}`}
                    value={cellValue(row, drafts, "arrival_date")}
                    onChange={(e) => onCellChange(row, "arrival_date", e.target.value || null)}
                    onKeyDown={(e) => handleKeys(e, row, "arrival_date", i)}
                  />
                </td>
                <td className={TD}>
                  <span className="block px-2.5 py-2 text-right tabular-nums">
                    {row.boxes_count}
                    {row.pallets_count > 0 && (
                      <span className="text-muted-foreground"> ({row.pallets_count} п)</span>
                    )}
                  </span>
                </td>
                <td className={TD}>
                  <span className="block px-2.5 py-2 text-right font-medium tabular-nums">
                    {row.total_amount.toLocaleString("ru-RU")} ₽
                  </span>
                </td>
                <td className={TD + dirtyCls(isDirty(row, "payment_method"), !!rowError)}>
                  <select
                    className={CELL_INPUT + " cursor-pointer appearance-none"}
                    data-cell={`payment_method:${i}`}
                    value={cellValue(row, drafts, "payment_method")}
                    onChange={(e) => onCellChange(row, "payment_method", e.target.value)}
                    onKeyDown={(e) => handleKeys(e, row, "payment_method", i)}
                  >
                    <option value="cash">Нал</option>
                    <option value="cashless">Безнал</option>
                    {!row.payment_method && <option value="">—</option>}
                  </select>
                </td>
                <td className={TD + dirtyCls(isDirty(row, "status"), !!rowError)}>
                  {statusEditable ? (
                    <div className="relative">
                      <span className={`${st.cls} pointer-events-none absolute left-2 top-1/2 -translate-y-1/2`}>
                        {st.label}
                      </span>
                      <select
                        className={CELL_INPUT + " cursor-pointer appearance-none text-transparent"}
                        data-cell={`status:${i}`}
                        value={cellValue(row, drafts, "status")}
                        onChange={(e) => onCellChange(row, "status", e.target.value)}
                        onKeyDown={(e) => handleKeys(e, row, "status", i)}
                      >
                        {GRID_STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s} className="text-foreground">
                            {statusMeta(s).label}
                          </option>
                        ))}
                        {!GRID_STATUS_OPTIONS.includes(row.status) && (
                          <option value={row.status} className="text-foreground">{st.label}</option>
                        )}
                      </select>
                    </div>
                  ) : (
                    <span
                      className="block px-2.5 py-2"
                      title="Оплата подтверждается на странице «Проверка оплат»"
                    >
                      <span className={st.cls}>{st.label}</span>
                    </span>
                  )}
                </td>
                <td className={TD + dirtyCls(isDirty(row, "manager_note"), !!rowError)}>
                  <input
                    className={CELL_INPUT + " min-w-[160px]"}
                    data-cell={`manager_note:${i}`}
                    placeholder="—"
                    value={cellValue(row, drafts, "manager_note")}
                    onChange={(e) => onCellChange(row, "manager_note", e.target.value || null)}
                    onKeyDown={(e) => handleKeys(e, row, "manager_note", i)}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="py-14 text-center text-sm text-muted-foreground">
          Заказов по выбранным фильтрам нет
        </div>
      )}
    </div>
  )
}

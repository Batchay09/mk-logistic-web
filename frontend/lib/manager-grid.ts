"use client"

import { useCallback, useMemo, useState } from "react"

// Строка GET /manager/orders/grid
export interface OrderGridRow {
  id: number
  status: string
  marketplace: string
  destination_name: string | null
  destination_id: number | null
  company_name: string | null
  ship_date: string
  arrival_date: string | null
  boxes_count: number
  pallets_count: number
  total_amount: number
  payment_method: string | null
  service_pickup: boolean
  client_name: string | null
  client_email: string | null
  client_phone: string | null
  manager_note: string | null
  created_at: string
}

export interface OrdersGridResponse {
  total: number
  rows: OrderGridRow[]
}

// Редактируемые поля (зеркало OrderFieldsPatch бэкенда)
export interface EditableFields {
  status?: string
  ship_date?: string
  arrival_date?: string | null
  company_name?: string | null
  payment_method?: string
  manager_note?: string | null
}

export type EditableKey = keyof EditableFields

// Зеркало _GRID_STATUS_FROM/_GRID_STATUS_TO бэкенда: статус меняется только
// внутри пайплайна исполнения; до оплаты — через «Проверку оплат».
export const GRID_EDITABLE_STATUSES = new Set([
  "paid", "assigned", "picked_up", "in_transit", "delivered",
])
export const GRID_STATUS_OPTIONS = [
  "paid", "assigned", "picked_up", "in_transit", "delivered", "canceled",
]

function normalize(v: unknown): string {
  return v === null || v === undefined ? "" : String(v)
}

/** Черновик правок таблицы: Map id заказа → изменённые поля.
 *  Возврат ячейки к исходному значению снимает с неё пометку dirty. */
export function useGridDraft() {
  const [drafts, setDrafts] = useState<Map<number, EditableFields>>(new Map())

  const setCell = useCallback(
    (row: OrderGridRow, key: EditableKey, value: string | null) => {
      setDrafts((prev) => {
        const next = new Map(prev)
        const original = normalize(row[key as keyof OrderGridRow])
        const entry: EditableFields = { ...(next.get(row.id) ?? {}) }
        if (normalize(value) === original) {
          delete entry[key]
        } else {
          // null = явная очистка значения (arrival_date, заметка)
          ;(entry as Record<string, string | null>)[key] = value
        }
        if (Object.keys(entry).length === 0) next.delete(row.id)
        else next.set(row.id, entry)
        return next
      })
    },
    [],
  )

  const revertCell = useCallback((orderId: number, key: EditableKey) => {
    setDrafts((prev) => {
      const entry = prev.get(orderId)
      if (!entry || !(key in entry)) return prev
      const next = new Map(prev)
      const copy = { ...entry }
      delete copy[key]
      if (Object.keys(copy).length === 0) next.delete(orderId)
      else next.set(orderId, copy)
      return next
    })
  }, [])

  const resetAll = useCallback(() => setDrafts(new Map()), [])

  const clearSaved = useCallback((ids: number[]) => {
    setDrafts((prev) => {
      const next = new Map(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
  }, [])

  const dirtyCells = useMemo(
    () => Array.from(drafts.values()).reduce((n, e) => n + Object.keys(e).length, 0),
    [drafts],
  )

  const buildChanges = useCallback(
    () => Array.from(drafts.entries()).map(([id, fields]) => ({ id, fields })),
    [drafts],
  )

  return { drafts, setCell, revertCell, resetAll, clearSaved, dirtyCells, buildChanges }
}

/** Значение ячейки с учётом черновика. */
export function cellValue(
  row: OrderGridRow,
  drafts: Map<number, EditableFields>,
  key: EditableKey,
): string {
  const entry = drafts.get(row.id)
  if (entry && key in entry) return normalize(entry[key])
  return normalize(row[key as keyof OrderGridRow])
}

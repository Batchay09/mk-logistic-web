"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { OrdersGrid } from "@/components/features/orders-grid"
import { api } from "@/lib/api"
import { statusMeta } from "@/lib/order-status"
import { GRID_STATUS_OPTIONS, OrdersGridResponse, useGridDraft } from "@/lib/manager-grid"
import { Kanban, Loader2, Table2 } from "lucide-react"

const PAGE_SIZE = 100

// «Все» = все кроме черновиков (их отсекает бэкенд всегда)
const FILTER_STATUSES = ["new", "confirmed", "awaiting_payment", ...GRID_STATUS_OPTIONS]

interface Destination { id: number; name: string; marketplace: string }
interface BulkResult { updated: number; failed: { id: number; error: string }[] }

const FILTER_CLS = "h-9 rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"

export default function ManagerOrdersTablePage() {
  const qc = useQueryClient()
  const { drafts, setCell, revertCell, resetAll, clearSaved, dirtyCells, buildChanges } = useGridDraft()
  const [errors, setErrors] = useState<Map<number, string>>(new Map())

  // Фильтры
  const [status, setStatus] = useState("")
  const [destinationId, setDestinationId] = useState("")
  const [company, setCompany] = useState("")
  const [companyDebounced, setCompanyDebounced] = useState("")
  const [shipFrom, setShipFrom] = useState("")
  const [shipTo, setShipTo] = useState("")
  const [page, setPage] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setCompanyDebounced(company), 400)
    return () => clearTimeout(t)
  }, [company])

  // Несохранённые правки не должны молча пропасть при уходе со страницы
  useEffect(() => {
    if (dirtyCells === 0) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirtyCells])

  const params = useMemo(() => {
    const p = new URLSearchParams()
    if (status) p.set("status", status)
    if (destinationId) p.set("destination_id", destinationId)
    if (companyDebounced) p.set("company", companyDebounced)
    if (shipFrom) p.set("ship_from", shipFrom)
    if (shipTo) p.set("ship_to", shipTo)
    p.set("limit", String(PAGE_SIZE))
    p.set("offset", String(page * PAGE_SIZE))
    return p.toString()
  }, [status, destinationId, companyDebounced, shipFrom, shipTo, page])

  const { data, isLoading, isFetching } = useQuery<OrdersGridResponse>({
    queryKey: ["manager-grid", params],
    queryFn: () => api.get(`/manager/orders/grid?${params}`),
    placeholderData: keepPreviousData,
  })

  const { data: destinations = [] } = useQuery<Destination[]>({
    queryKey: ["destinations-all"],
    queryFn: () => api.get("/client/destinations"),
  })

  const saveMut = useMutation({
    mutationFn: () => api.patch<BulkResult>("/manager/orders/bulk", { changes: buildChanges() }),
    onSuccess: (result) => {
      const failedIds = new Set(result.failed.map((f) => f.id))
      const savedIds = buildChanges().map((c) => c.id).filter((id) => !failedIds.has(id))
      clearSaved(savedIds)
      setErrors(new Map(result.failed.map((f) => [f.id, f.error])))
      qc.invalidateQueries({ queryKey: ["manager-grid"] })
      qc.invalidateQueries({ queryKey: ["manager-order-counts"] })
      if (result.failed.length === 0) {
        toast.success(`Сохранено: ${result.updated}`)
      } else {
        toast.error(`Сохранено: ${result.updated}, с ошибками: ${result.failed.length} — строки подсвечены`)
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function guardDirty(apply: () => void) {
    if (dirtyCells > 0 && !window.confirm("Есть несохранённые изменения. Продолжить без сохранения?")) return
    resetAll()
    setErrors(new Map())
    setPage(0)
    apply()
  }

  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <LayoutWithSidebar role="manager" wide>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-foreground">
            <Table2 className="h-6 w-6 text-primary" /> Таблица заказов
          </h1>
          <Link href="/manager/orders" className="ml-auto">
            <Button variant="outline" size="sm" className="rounded-full">
              <Kanban className="mr-1.5 h-4 w-4" /> Канбан
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Правки прямо в ячейках, затем «Сохранить всё». Enter — строка ниже, Esc — отменить правку ячейки.
          Изменения пишутся в журнал аудита.
        </p>

        {/* Фильтры */}
        <div className="flex flex-wrap items-center gap-2">
          <select className={FILTER_CLS} value={status} onChange={(e) => guardDirty(() => setStatus(e.target.value))}>
            <option value="">Все статусы</option>
            {FILTER_STATUSES.map((s) => (
              <option key={s} value={s}>{statusMeta(s).label}</option>
            ))}
          </select>
          <select className={FILTER_CLS} value={destinationId} onChange={(e) => guardDirty(() => setDestinationId(e.target.value))}>
            <option value="">Все направления</option>
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>{d.name} · {d.marketplace.toUpperCase()}</option>
            ))}
          </select>
          <input type="date" className={FILTER_CLS} value={shipFrom} title="Отправка с"
            onChange={(e) => guardDirty(() => setShipFrom(e.target.value))} />
          <input type="date" className={FILTER_CLS} value={shipTo} title="Отправка по"
            onChange={(e) => guardDirty(() => setShipTo(e.target.value))} />
          <Input
            placeholder="Компания…"
            className="h-9 w-44"
            value={company}
            onChange={(e) => { setCompany(e.target.value); setPage(0) }}
          />
          <span className="ml-auto text-sm text-muted-foreground tabular-nums">
            {isFetching && <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" />}
            Всего: {total}
          </span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <OrdersGrid
            rows={rows}
            drafts={drafts}
            errors={errors}
            onCellChange={(row, key, value) => setCell(row, key, value)}
            onCellRevert={revertCell}
          />
        )}

        {/* Пагинация */}
        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
            <Button variant="outline" size="sm" disabled={page === 0}
              onClick={() => guardDirty(() => setPage(Math.max(0, page - 1)))}>
              Назад
            </Button>
            <span className="tabular-nums">стр. {page + 1} из {pages}</span>
            <Button variant="outline" size="sm" disabled={page + 1 >= pages}
              onClick={() => guardDirty(() => setPage(page + 1))}>
              Вперёд
            </Button>
          </div>
        )}

        {/* Панель несохранённых изменений */}
        {dirtyCells > 0 && (
          <div className="sticky bottom-3 z-20 flex items-center gap-3 rounded-xl border border-warning/50 bg-warning/10 px-4 py-3 backdrop-blur-md shadow-lg">
            <span className="text-sm font-semibold text-foreground">
              Изменено ячеек: {dirtyCells}
            </span>
            <span className="text-xs text-muted-foreground">
              заказы: {Array.from(drafts.keys()).slice(0, 8).map((id) => `#${id}`).join(", ")}
              {drafts.size > 8 && "…"}
            </span>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" className="rounded-full"
                onClick={() => { resetAll(); setErrors(new Map()) }}>
                Отменить всё
              </Button>
              <Button size="sm" className="btn-shine rounded-full"
                disabled={saveMut.isPending}
                onClick={() => saveMut.mutate()}>
                {saveMut.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Сохранить всё
              </Button>
            </div>
          </div>
        )}
      </div>
    </LayoutWithSidebar>
  )
}

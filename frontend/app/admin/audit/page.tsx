"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import { RotateCcw, Loader2, History } from "lucide-react"

interface AuditLog {
  id: number; table_name: string; record_id: number; action: string
  old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null
  created_at: string; label: string
}

const ACTION_COLORS: Record<string, string> = {
  create: "bg-success/10 text-success",
  update: "bg-info/10 text-info",
  delete: "bg-destructive/10 text-destructive",
  rollback: "bg-warning/10 text-warning",
}

const TABLE_LABELS: Record<string, string> = {
  destinations: "Направление",
  price_rules: "Тариф",
  schedule_rules: "Расписание",
}

export default function AdminAuditPage() {
  const qc = useQueryClient()
  const [tableFilter, setTableFilter] = useState("all")
  const [rollbackId, setRollbackId] = useState<number | null>(null)

  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["audit", tableFilter],
    queryFn: () => api.get(`/admin/audit${tableFilter !== "all" ? `?table_name=${tableFilter}&limit=30` : "?limit=30"}`),
  })

  const rollbackMut = useMutation({
    mutationFn: (id: number) => api.post(`/admin/audit/rollback/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit"] })
      toast.success("Откат выполнен")
      setRollbackId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <LayoutWithSidebar role="admin">
      <div className="relative space-y-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-12 left-0 h-56 w-[32rem] max-w-full rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(from var(--primary) l c h / 0.10) 0%, transparent 70%)" }}
        />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold">История изменений</h1>
          <Select value={tableFilter} onValueChange={(v) => v && setTableFilter(v)}>
            <SelectTrigger className="w-44 border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все таблицы</SelectItem>
              <SelectItem value="destinations">Направления</SelectItem>
              <SelectItem value="price_rules">Тарифы</SelectItem>
              <SelectItem value="schedule_rules">Расписание</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}

        {!isLoading && logs.length === 0 && (
          <Card className="border-border border-dashed bg-muted/30">
            <CardContent className="py-12 text-center">
              <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[var(--brand-dark)] text-white shadow-brand">
                <History className="h-7 w-7" aria-hidden />
              </div>
              <p className="text-muted-foreground">История пуста</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id} className="border-border transition-colors hover:border-primary/30">
              <CardContent className="py-3 px-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className={`${ACTION_COLORS[log.action] || "bg-muted text-muted-foreground"} border-0 text-xs`}>
                    {log.action === "create" ? "Создание" : log.action === "update" ? "Изменение" : "Удаление"}
                  </Badge>
                  <Badge variant="outline" className="border-border text-xs">
                    {TABLE_LABELS[log.table_name] || log.table_name} #{log.record_id}
                  </Badge>
                  <span className="text-sm">{log.label}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("ru-RU")}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-muted"
                    title="Откатить" onClick={() => setRollbackId(log.id)}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
              {/* Diff view */}
              {log.action === "update" && log.old_data && log.new_data && (
                <div className="px-4 pb-3">
                  <div className="text-xs bg-muted rounded-lg p-2 font-mono space-y-0.5">
                    {Object.keys(log.new_data).map((k) => {
                      if (log.old_data![k] === log.new_data![k]) return null
                      return (
                        <div key={k} className="flex gap-2">
                          <span className="text-destructive">- {k}: {String(log.old_data![k])}</span>
                          <span className="text-success">+ {k}: {String(log.new_data![k])}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={rollbackId !== null} onOpenChange={(o) => !o && setRollbackId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Откатить изменение?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Это действие восстановит предыдущее состояние записи. Само действие будет залогировано.
          </p>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setRollbackId(null)}>Отмена</Button>
            <Button className="btn-shine rounded-full" disabled={rollbackMut.isPending}
              onClick={() => rollbackId && rollbackMut.mutate(rollbackId)}>
              {rollbackMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Откатить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutWithSidebar>
  )
}

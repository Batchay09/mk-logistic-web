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
import { RotateCcw, Loader2 } from "lucide-react"

interface AuditLog {
  id: number; table_name: string; record_id: number; action: string
  old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null
  created_at: string; label: string
}

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
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
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold">История изменений</h1>
          <Select value={tableFilter} onValueChange={(v) => v && setTableFilter(v)}>
            <SelectTrigger className="w-44 border-[#EAC9B0]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все таблицы</SelectItem>
              <SelectItem value="destinations">Направления</SelectItem>
              <SelectItem value="price_rules">Тарифы</SelectItem>
              <SelectItem value="schedule_rules">Расписание</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#D4512B]" /></div>}

        {!isLoading && logs.length === 0 && (
          <Card className="border-[#EAC9B0] border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">История пуста</CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id} className="border-[#EAC9B0]">
              <CardContent className="py-3 px-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className={`${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-700"} border-0 text-xs`}>
                    {log.action === "create" ? "Создание" : log.action === "update" ? "Изменение" : "Удаление"}
                  </Badge>
                  <Badge variant="outline" className="border-[#EAC9B0] text-xs">
                    {TABLE_LABELS[log.table_name] || log.table_name} #{log.record_id}
                  </Badge>
                  <span className="text-sm">{log.label}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("ru-RU")}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-[#D4512B] hover:bg-[#FBF0EA]"
                    title="Откатить" onClick={() => setRollbackId(log.id)}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
              {/* Diff view */}
              {log.action === "update" && log.old_data && log.new_data && (
                <div className="px-4 pb-3">
                  <div className="text-xs bg-gray-50 rounded p-2 font-mono space-y-0.5">
                    {Object.keys(log.new_data).map((k) => {
                      if (log.old_data![k] === log.new_data![k]) return null
                      return (
                        <div key={k} className="flex gap-2">
                          <span className="text-red-500">- {k}: {String(log.old_data![k])}</span>
                          <span className="text-green-600">+ {k}: {String(log.new_data![k])}</span>
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
            <Button variant="outline" onClick={() => setRollbackId(null)}>Отмена</Button>
            <Button className="bg-[#D4512B] hover:bg-[#B33D1A]" disabled={rollbackMut.isPending}
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

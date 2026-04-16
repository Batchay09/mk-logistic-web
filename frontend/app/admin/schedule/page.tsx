"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import { Plus, Trash2, Copy, Loader2 } from "lucide-react"

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

interface Destination { id: number; name: string; marketplace: string }
interface ScheduleRule { id: number; destination_id: number; weekday_from: number; weekday_to: number; week_offset: number }

export default function AdminSchedulePage() {
  const qc = useQueryClient()
  const [mpFilter, setMpFilter] = useState("wb")
  const [destId, setDestId] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [showCopy, setShowCopy] = useState(false)
  const [copySource, setCopySource] = useState("")
  const [form, setForm] = useState({ weekday_from: "0", weekday_to: "2", week_offset: "0" })

  const { data: dests = [] } = useQuery<Destination[]>({
    queryKey: ["admin-dests-sched", mpFilter],
    queryFn: () => api.get(`/admin/destinations?marketplace=${mpFilter}`),
  })

  const { data: rules = [], isLoading } = useQuery<ScheduleRule[]>({
    queryKey: ["admin-schedule", destId],
    queryFn: () => api.get(`/admin/schedule?destination_id=${destId}`),
    enabled: !!destId,
  })

  const addMut = useMutation({
    mutationFn: (d: object) => api.post("/admin/schedule", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-schedule"] }); toast.success("Правило добавлено"); setShowAdd(false) },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/schedule/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-schedule"] }); toast.success("Удалено") },
    onError: (e: Error) => toast.error(e.message),
  })

  const copyMut = useMutation({
    mutationFn: ({ source, target }: { source: number; target: number }) =>
      api.post("/admin/schedule/copy", { source_destination_id: source, target_destination_id: target }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-schedule"] }); toast.success("Расписание скопировано"); setShowCopy(false) },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <LayoutWithSidebar role="admin">
      <div className="space-y-5 max-w-3xl">
        <h1 className="text-2xl font-bold">Расписание</h1>

        <div className="flex gap-3 flex-wrap">
          <Select value={mpFilter} onValueChange={(v) => { if (v) { setMpFilter(v); setDestId("") } }}>
            <SelectTrigger className="w-32 border-[#EAC9B0]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="wb">WB</SelectItem>
              <SelectItem value="ozon">Ozon</SelectItem>
            </SelectContent>
          </Select>
          <Select value={destId} onValueChange={(v) => v && setDestId(v)}>
            <SelectTrigger className="w-52 border-[#EAC9B0]">
              <SelectValue placeholder="Выберите направление" />
            </SelectTrigger>
            <SelectContent>
              {dests.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {destId && (
            <>
              <Button className="bg-[#D4512B] hover:bg-[#B33D1A]" onClick={() => setShowAdd(true)}>
                <Plus className="h-4 w-4 mr-1" /> Добавить
              </Button>
              <Button variant="outline" className="border-[#EAC9B0] text-[#D4512B]" onClick={() => setShowCopy(true)}>
                <Copy className="h-4 w-4 mr-1" /> Скопировать с...
              </Button>
            </>
          )}
        </div>

        {destId && (
          <Card className="border-[#EAC9B0]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>День сдачи</TableHead>
                  <TableHead>День доставки</TableHead>
                  <TableHead>Сдвиг</TableHead>
                  <TableHead className="text-right">Удалить</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={4} className="text-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-[#D4512B] mx-auto" />
                  </TableCell></TableRow>
                )}
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{DAYS[r.weekday_from]}</TableCell>
                    <TableCell className="font-medium">{DAYS[r.weekday_to]}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.week_offset === 0 ? "Текущая неделя" : `+${r.week_offset} нед.`}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600"
                        onClick={() => deleteMut.mutate(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && rules.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Нет правил</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новое правило расписания</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>День сдачи</Label>
              <Select value={form.weekday_from} onValueChange={(v) => v && setForm((f) => ({ ...f, weekday_from: v }))}>
                <SelectTrigger className="mt-1 border-[#EAC9B0]"><SelectValue /></SelectTrigger>
                <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>День доставки</Label>
              <Select value={form.weekday_to} onValueChange={(v) => v && setForm((f) => ({ ...f, weekday_to: v }))}>
                <SelectTrigger className="mt-1 border-[#EAC9B0]"><SelectValue /></SelectTrigger>
                <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Сдвиг недели (0 = текущая, 1 = следующая)</Label>
              <Input type="number" min={0} className="mt-1 border-[#EAC9B0]" value={form.week_offset}
                onChange={(e) => setForm((f) => ({ ...f, week_offset: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Отмена</Button>
            <Button className="bg-[#D4512B] hover:bg-[#B33D1A]" disabled={addMut.isPending}
              onClick={() => addMut.mutate({ destination_id: Number(destId), weekday_from: Number(form.weekday_from), weekday_to: Number(form.weekday_to), week_offset: Number(form.week_offset) })}>
              {addMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy dialog */}
      <Dialog open={showCopy} onOpenChange={setShowCopy}>
        <DialogContent>
          <DialogHeader><DialogTitle>Скопировать расписание</DialogTitle></DialogHeader>
          <Select value={copySource} onValueChange={(v) => v && setCopySource(v)}>
            <SelectTrigger className="border-[#EAC9B0]"><SelectValue placeholder="Выберите источник..." /></SelectTrigger>
            <SelectContent>
              {dests.filter((d) => String(d.id) !== destId).map((d) =>
                <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
              )}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopy(false)}>Отмена</Button>
            <Button className="bg-[#D4512B] hover:bg-[#B33D1A]" disabled={!copySource || copyMut.isPending}
              onClick={() => copyMut.mutate({ source: Number(copySource), target: Number(destId) })}>
              {copyMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Скопировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutWithSidebar>
  )
}

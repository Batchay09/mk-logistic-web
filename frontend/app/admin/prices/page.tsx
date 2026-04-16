"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import { Plus, Trash2, Copy, Loader2 } from "lucide-react"

interface Destination { id: number; name: string; marketplace: string }
interface PriceRule { id: number; destination_id: number; min_qty: number; price: number }

export default function AdminPricesPage() {
  const qc = useQueryClient()
  const [destId, setDestId] = useState<string>("")
  const [mpFilter, setMpFilter] = useState("wb")
  const [showAdd, setShowAdd] = useState(false)
  const [showCopy, setShowCopy] = useState(false)
  const [form, setForm] = useState({ min_qty: "1", price: "" })
  const [copySource, setCopySource] = useState("")

  const { data: dests = [] } = useQuery<Destination[]>({
    queryKey: ["admin-dests-prices", mpFilter],
    queryFn: () => api.get(`/admin/destinations?marketplace=${mpFilter}`),
  })

  const { data: rules = [], isLoading } = useQuery<PriceRule[]>({
    queryKey: ["admin-prices", destId],
    queryFn: () => api.get(`/admin/prices?destination_id=${destId}`),
    enabled: !!destId,
  })

  const addMut = useMutation({
    mutationFn: (d: { destination_id: number; min_qty: number; price: number }) =>
      api.post("/admin/prices", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-prices"] }); toast.success("Тариф добавлен"); setShowAdd(false) },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/prices/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-prices"] }); toast.success("Тариф удалён") },
    onError: (e: Error) => toast.error(e.message),
  })

  const copyMut = useMutation({
    mutationFn: ({ source, target }: { source: number; target: number }) =>
      api.post("/admin/prices/copy", { source_destination_id: source, target_destination_id: target }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-prices"] }); toast.success("Тарифы скопированы"); setShowCopy(false) },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <LayoutWithSidebar role="admin">
      <div className="space-y-5 max-w-3xl">
        <h1 className="text-2xl font-bold">Тарифы</h1>

        <div className="flex gap-3 flex-wrap">
          <Select value={mpFilter} onValueChange={(v) => { setMpFilter(v); setDestId("") }}>
            <SelectTrigger className="w-32 border-[#EAC9B0]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="wb">WB</SelectItem>
              <SelectItem value="ozon">Ozon</SelectItem>
            </SelectContent>
          </Select>
          <Select value={destId} onValueChange={setDestId}>
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
                  <TableHead>От (кол-во)</TableHead>
                  <TableHead>Цена за шт.</TableHead>
                  <TableHead className="text-right">Удалить</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={3} className="text-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-[#D4512B] mx-auto" />
                  </TableCell></TableRow>
                )}
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>от {r.min_qty} шт.</TableCell>
                    <TableCell className="font-semibold">{Number(r.price).toLocaleString("ru-RU")} ₽</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600"
                        onClick={() => deleteMut.mutate(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && rules.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                    Нет тарифов
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новый тариф</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>От (кол-во коробок)</Label>
              <Input className="mt-1 border-[#EAC9B0]" type="number" min={1} value={form.min_qty}
                onChange={(e) => setForm((f) => ({ ...f, min_qty: e.target.value }))} />
            </div>
            <div><Label>Цена за штуку (₽)</Label>
              <Input className="mt-1 border-[#EAC9B0]" type="number" min={0} placeholder="350" value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Отмена</Button>
            <Button className="bg-[#D4512B] hover:bg-[#B33D1A]" disabled={!form.price || addMut.isPending}
              onClick={() => addMut.mutate({ destination_id: Number(destId), min_qty: Number(form.min_qty), price: Number(form.price) })}>
              {addMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy dialog */}
      <Dialog open={showCopy} onOpenChange={setShowCopy}>
        <DialogContent>
          <DialogHeader><DialogTitle>Скопировать тарифы с другого направления</DialogTitle></DialogHeader>
          <div><Label>Источник</Label>
            <Select value={copySource} onValueChange={setCopySource}>
              <SelectTrigger className="mt-1 border-[#EAC9B0]"><SelectValue placeholder="Выберите..." /></SelectTrigger>
              <SelectContent>
                {dests.filter((d) => String(d.id) !== destId).map((d) =>
                  <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
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

"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import { Plus, Pencil, Power, PowerOff, Loader2 } from "lucide-react"

interface Destination {
  id: number; marketplace: string; name: string; is_active: boolean
}

export default function AdminDestinationsPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState("all")
  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem] = useState<Destination | null>(null)
  const [form, setForm] = useState({ marketplace: "wb", name: "" })

  const { data: destinations = [], isLoading } = useQuery<Destination[]>({
    queryKey: ["admin-destinations", filter],
    queryFn: () => api.get(`/admin/destinations${filter !== "all" ? `?marketplace=${filter}` : ""}`),
  })

  const createMut = useMutation({
    mutationFn: (d: { marketplace: string; name: string }) => api.post("/admin/destinations", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-destinations"] }); toast.success("Направление создано"); setShowCreate(false) },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Destination> }) =>
      api.patch(`/admin/destinations/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-destinations"] }); toast.success("Сохранено"); setEditItem(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  function toggleActive(dest: Destination) {
    updateMut.mutate({ id: dest.id, data: { is_active: !dest.is_active } })
  }

  return (
    <LayoutWithSidebar role="admin">
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold">Направления</h1>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v) => v && setFilter(v)}>
              <SelectTrigger className="w-32 border-[#EAC9B0]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="wb">WB</SelectItem>
                <SelectItem value="ozon">Ozon</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-[#D4512B] hover:bg-[#B33D1A]" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" /> Добавить
            </Button>
          </div>
        </div>

        <Card className="border-[#EAC9B0]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Маркетплейс</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-[#D4512B] mx-auto" />
                </TableCell></TableRow>
              )}
              {destinations.map((dest) => (
                <TableRow key={dest.id}>
                  <TableCell className="font-mono text-sm text-muted-foreground">{dest.id}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-[#EAC9B0] text-xs">{dest.marketplace.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{dest.name}</TableCell>
                  <TableCell>
                    <Badge className={dest.is_active ? "bg-green-100 text-green-800 border-0" : "bg-gray-100 text-gray-600 border-0"}>
                      {dest.is_active ? "Активно" : "Отключено"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditItem(dest)}>
                        <Pencil className="h-4 w-4 text-[#D4512B]" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(dest)}>
                        {dest.is_active
                          ? <PowerOff className="h-4 w-4 text-gray-500" />
                          : <Power className="h-4 w-4 text-green-600" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новое направление</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Маркетплейс</Label>
              <Select value={form.marketplace} onValueChange={(v) => v && setForm((f) => ({ ...f, marketplace: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wb">Wildberries</SelectItem>
                  <SelectItem value="ozon">Ozon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Название склада</Label>
              <Input className="mt-1 border-[#EAC9B0]" placeholder="Коледино" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Отмена</Button>
            <Button className="bg-[#D4512B] hover:bg-[#B33D1A]" disabled={!form.name || createMut.isPending}
              onClick={() => createMut.mutate(form)}>
              {createMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Редактировать направление</DialogTitle></DialogHeader>
          {editItem && (
            <div>
              <Label>Название</Label>
              <Input className="mt-1 border-[#EAC9B0]" value={editItem.name}
                onChange={(e) => setEditItem((d) => d ? { ...d, name: e.target.value } : d)} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Отмена</Button>
            <Button className="bg-[#D4512B] hover:bg-[#B33D1A]" disabled={updateMut.isPending}
              onClick={() => editItem && updateMut.mutate({ id: editItem.id, data: { name: editItem.name } })}>
              {updateMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutWithSidebar>
  )
}

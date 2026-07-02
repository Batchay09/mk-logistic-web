"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import { Loader2, Pencil } from "lucide-react"

interface User {
  id: number; email: string | null; full_name: string | null; phone: string | null
  company_name: string | null; role: string; tg_id: number | null
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive",
  manager: "bg-primary/10 text-primary",
  driver: "bg-info/10 text-info",
  client: "bg-success/10 text-success",
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Админ", manager: "Менеджер", driver: "Водитель", client: "Клиент"
}

export default function AdminUsersPage() {
  const qc = useQueryClient()
  const [editUser, setEditUser] = useState<User | null>(null)
  const [newRole, setNewRole] = useState("")

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: () => api.get("/admin/users?limit=50"),
  })

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      api.patch(`/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] })
      toast.success("Роль изменена")
      setEditUser(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function openEdit(user: User) {
    setEditUser(user)
    setNewRole(user.role)
  }

  return (
    <LayoutWithSidebar role="admin">
      <div className="space-y-5">
        {/* Header + one Aurora glow */}
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-12 left-0 h-56 w-[32rem] max-w-full rounded-full opacity-50 blur-3xl"
            style={{ background: "radial-gradient(circle, oklch(from var(--primary) l c h / 0.10) 0%, transparent 70%)" }}
          />
          <h1 className="relative text-2xl font-bold">Пользователи</h1>
        </div>
        <Card className="border-border rounded-2xl shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Имя</TableHead>
                <TableHead>Email / TG</TableHead>
                <TableHead>Компания</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
                </TableCell></TableRow>
              )}
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.email || (user.tg_id ? `tg: ${user.tg_id}` : "—")}
                  </TableCell>
                  <TableCell className="text-sm">{user.company_name || "—"}</TableCell>
                  <TableCell>
                    <Badge className={`${ROLE_COLORS[user.role] || "bg-muted text-muted-foreground"} border-0 text-xs`}>
                      {ROLE_LABELS[user.role] || user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => openEdit(user)}>
                      <Pencil className="h-4 w-4 text-primary" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить роль — {editUser?.full_name || editUser?.email}</DialogTitle>
          </DialogHeader>
          <Select value={newRole} onValueChange={(v) => v && setNewRole(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="client">Клиент</SelectItem>
              <SelectItem value="manager">Менеджер</SelectItem>
              <SelectItem value="driver">Водитель</SelectItem>
              <SelectItem value="admin">Администратор</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setEditUser(null)}>Отмена</Button>
            <Button className="btn-shine rounded-full" disabled={roleMut.isPending}
              onClick={() => editUser && roleMut.mutate({ id: editUser.id, role: newRole })}>
              {roleMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutWithSidebar>
  )
}

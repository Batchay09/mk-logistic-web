"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Building2, Plus, Trash2, Loader2 } from "lucide-react"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { H2, Muted } from "@/components/ui/typography"
import { api } from "@/lib/api"

interface Company {
  id: number
  company_name: string
}

const schema = z.object({
  company_name: z.string().min(2, "Минимум 2 символа"),
})
type FormData = z.infer<typeof schema>

export default function CompaniesPage() {
  const qc = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null)

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["companies"],
    queryFn: () => api.get("/client/companies"),
  })

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { company_name: "" },
  })

  const createMut = useMutation({
    mutationFn: (company_name: string) =>
      api.post<Company>("/client/companies", { company_name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] })
      toast.success("Компания добавлена")
      form.reset()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/client/companies/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] })
      toast.success("Компания удалена")
      setDeleteTarget(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function onSubmit(data: FormData) {
    createMut.mutate(data.company_name.trim())
  }

  return (
    <LayoutWithSidebar role="client">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Aurora-заголовок */}
        <div className="relative space-y-1">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-10 left-0 h-48 w-[28rem] max-w-full rounded-full opacity-50 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, oklch(from var(--primary) l c h / 0.10) 0%, transparent 70%)",
            }}
          />
          <H2 className="relative text-2xl sm:text-3xl">Мои компании</H2>
          <Muted className="relative">
            Юр. лица для оформления заказов и стикеров
          </Muted>
        </div>

        {/* Форма добавления */}
        <Card className="border-border">
          <CardContent className="py-4 px-5">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col sm:flex-row items-start gap-3"
              >
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem className="flex-1 w-full">
                      <FormControl>
                        <Input placeholder="ООО «Ромашка» или ИП Иванов" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={createMut.isPending}
                  className="btn-shine rounded-full px-6 w-full sm:w-auto shrink-0"
                >
                  {createMut.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-1" />
                  )}
                  Добавить
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Список компаний */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Загрузка...
          </div>
        ) : companies.length === 0 ? (
          <Card className="border-dashed border-border bg-muted/30">
            <CardContent className="py-14 text-center">
              <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[var(--brand-dark)] text-white shadow-brand">
                <Building2 className="h-7 w-7" aria-hidden />
              </div>
              <p className="font-semibold mb-1">Пока нет компаний</p>
              <p className="text-sm text-muted-foreground">
                Добавьте юр. лицо, чтобы привязывать его к заказам
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {companies.map((company) => (
              <Card
                key={company.id}
                className="group border-border transition-all duration-[var(--duration-base)] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
              >
                <CardContent className="py-4 px-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Building2 className="h-4 w-4" aria-hidden />
                      </div>
                      <span className="font-medium truncate">{company.company_name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(company)}
                      aria-label={`Удалить компанию «${company.company_name}»`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Диалог подтверждения удаления */}
      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить компанию?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            «{deleteTarget?.company_name}» будет удалена. Это действие нельзя отменить.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setDeleteTarget(null)}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutWithSidebar>
  )
}

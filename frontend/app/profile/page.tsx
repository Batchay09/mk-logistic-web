"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, User, Lock, ShieldCheck, ShieldAlert } from "lucide-react"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"

interface Profile {
  id: number
  email: string
  full_name: string | null
  phone: string | null
  company_name: string | null
  role: string
  email_verified: boolean
}

const personalSchema = z.object({
  full_name: z.string().min(2, "Введите имя"),
  phone: z.string().optional(),
  company_name: z.string().optional(),
})
type PersonalData = z.infer<typeof personalSchema>

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Введите текущий пароль"),
    new_password: z.string().min(8, "Минимум 8 символов"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Пароли не совпадают",
    path: ["confirm_password"],
  })
type PasswordData = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const qc = useQueryClient()

  const { data: profile, isLoading } = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: () => api.get("/client/profile"),
  })

  const personalForm = useForm<PersonalData>({
    resolver: zodResolver(personalSchema),
    defaultValues: { full_name: "", phone: "", company_name: "" },
    // Синхронизируем форму с данными профиля после загрузки/рефетча.
    values: profile
      ? {
          full_name: profile.full_name ?? "",
          phone: profile.phone ?? "",
          company_name: profile.company_name ?? "",
        }
      : undefined,
  })

  const passwordForm = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: "", new_password: "", confirm_password: "" },
  })

  const saveMut = useMutation({
    mutationFn: (data: PersonalData) => api.patch("/client/profile", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] })
      toast.success("Данные сохранены")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const passwordMut = useMutation({
    mutationFn: (data: PasswordData) =>
      api.post("/auth/change-password", {
        current_password: data.current_password,
        new_password: data.new_password,
      }),
    onSuccess: () => {
      toast.success("Пароль изменён")
      passwordForm.reset()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading || !profile) {
    return (
      <LayoutWithSidebar role="client">
        <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" /> Загрузка...
        </div>
      </LayoutWithSidebar>
    )
  }

  return (
    <LayoutWithSidebar role="client">
      <div className="relative max-w-2xl mx-auto space-y-6">
        {/* Aurora-подсветка за заголовком */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 h-64 w-[34rem] max-w-full rounded-full opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, oklch(from var(--primary) l c h / 0.12) 0%, transparent 70%)",
          }}
        />

        <div className="relative">
          <h1 className="text-2xl font-bold text-foreground">Профиль</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Личные данные и безопасность аккаунта
          </p>
        </div>

        {/* Личные данные */}
        <Card className="relative border-primary/15 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2.5 text-foreground">
              <span className="grid place-items-center size-8 rounded-lg bg-gradient-to-br from-primary to-[var(--brand-dark)] text-white shadow-brand">
                <User className="h-4 w-4" />
              </span>
              Личные данные
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...personalForm}>
              <form
                onSubmit={personalForm.handleSubmit((d) => saveMut.mutate(d))}
                className="space-y-4"
              >
                <FormField
                  control={personalForm.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ФИО</FormLabel>
                      <FormControl>
                        <Input placeholder="Иван Иванов" autoComplete="name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={personalForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Телефон{" "}
                        <span className="text-muted-foreground font-normal">(необязательно)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+7 900 000 00 00"
                          autoComplete="tel"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={personalForm.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Компания по умолчанию{" "}
                        <span className="text-muted-foreground font-normal">(необязательно)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ООО «Ромашка» или ИП Иванов"
                          autoComplete="organization"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email — read-only, изменить нельзя (бэкенд не поддерживает) */}
                <div className="space-y-2">
                  <Label htmlFor="profile-email" className="flex items-center gap-2">
                    Email
                    {profile.email_verified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                        <ShieldCheck className="h-3.5 w-3.5" /> подтверждён
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
                        <ShieldAlert className="h-3.5 w-3.5" /> не подтверждён
                      </span>
                    )}
                  </Label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={profile.email}
                    autoComplete="email"
                    readOnly
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">Email изменить нельзя.</p>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    disabled={saveMut.isPending}
                    className="btn-shine rounded-full px-6"
                  >
                    {saveMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Сохранить
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Смена пароля */}
        <Card className="relative border-primary/15 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2.5 text-foreground">
              <span className="grid place-items-center size-8 rounded-lg bg-gradient-to-br from-primary to-[var(--brand-dark)] text-white shadow-brand">
                <Lock className="h-4 w-4" />
              </span>
              Смена пароля
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form
                onSubmit={passwordForm.handleSubmit((d) => passwordMut.mutate(d))}
                className="space-y-4"
              >
                <FormField
                  control={passwordForm.control}
                  name="current_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Текущий пароль</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete="current-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={passwordForm.control}
                    name="new_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Новый пароль</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Минимум 8 символов"
                            autoComplete="new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirm_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Повторите новый</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            autoComplete="new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    disabled={passwordMut.isPending}
                    className="btn-shine rounded-full px-6"
                  >
                    {passwordMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Сменить пароль
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </LayoutWithSidebar>
  )
}

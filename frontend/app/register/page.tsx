"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { AuthShell, AuthHeader } from "@/components/layout/auth-shell"
import { api } from "@/lib/api"
import type { CurrentUser } from "@/lib/auth"

const schema = z.object({
  full_name: z.string().min(2, "Введите имя"),
  email: z.string().email("Неверный email"),
  password: z.string().min(8, "Минимум 8 символов"),
  confirm_password: z.string(),
  phone: z.string().optional(),
  company_name: z.string().optional(),
}).refine((d) => d.password === d.confirm_password, {
  message: "Пароли не совпадают",
  path: ["confirm_password"],
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", email: "", password: "", confirm_password: "", phone: "", company_name: "" },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const { confirm_password: _, ...payload } = data
      void _
      await api.post<CurrentUser>("/auth/register", payload)
      toast.success("Аккаунт создан! Проверьте email для подтверждения.")
      router.push("/dashboard")
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ошибка регистрации"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="w-full max-w-md">
        <AuthHeader title="Регистрация" subtitle="Создайте аккаунт — займёт меньше минуты" />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-3">
            <FormField control={form.control} name="full_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Имя / ФИО</FormLabel>
                <FormControl><Input placeholder="Иван Иванов" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="company_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Компания / ИП <span className="text-muted-foreground font-normal">(необязательно)</span></FormLabel>
                <FormControl><Input placeholder="ООО «Ромашка» или ИП Иванов" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Телефон <span className="text-muted-foreground font-normal">(необязательно)</span></FormLabel>
                <FormControl><Input type="tel" placeholder="+7 900 000 00 00" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" placeholder="your@email.ru" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Пароль</FormLabel>
                  <FormControl><Input type="password" placeholder="Минимум 8 символов" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="confirm_password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Повторите</FormLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <Button type="submit" disabled={loading} size="lg" className="w-full mt-2">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Создать аккаунт
            </Button>
          </form>
        </Form>

        <div className="mt-5 pt-4 border-t border-border text-sm text-muted-foreground text-center">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">Войти</Link>
        </div>
      </div>
    </AuthShell>
  )
}

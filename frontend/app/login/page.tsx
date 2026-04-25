"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { getRoleRedirect } from "@/lib/auth"

const schema = z.object({
  email: z.string().email("Неверный email"),
  password: z.string().min(1, "Введите пароль"),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || null
  const [loading, setLoading] = useState(false)

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const user = await api.post<CurrentUser>("/auth/login", data)
      toast.success("Добро пожаловать!")
      router.push(next || getRoleRedirect(user.role))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ошибка входа"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="w-full max-w-sm">
        <AuthHeader title="Вход в кабинет" subtitle="Введите email и пароль для входа" />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="your@email.ru" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Пароль</FormLabel>
                  <Link href="/reset-password" className="text-xs text-[#D4512B] hover:underline">
                    Забыли?
                  </Link>
                </div>
                <FormControl>
                  <Input type="password" placeholder="••••••••" autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Button
              type="submit"
              disabled={loading}
              size="lg"
              className="w-full bg-[#D4512B] hover:bg-[#B33D1A]"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Войти
            </Button>
          </form>
        </Form>

        <div className="mt-6 pt-5 border-t border-[#F5F5F5] text-sm text-muted-foreground text-center">
          Нет аккаунта?{" "}
          <Link href="/register" className="text-[#D4512B] hover:underline font-medium">
            Зарегистрироваться
          </Link>
        </div>
      </div>
    </AuthShell>
  )
}

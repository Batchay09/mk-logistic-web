"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Truck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
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
    <div className="min-h-screen bg-[#FBF0EA] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="bg-[#D4512B] rounded-lg p-2">
            <Truck className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-[#D4512B]">МК ЛОГИСТИК</span>
        </div>
        <Card className="border-[#EAC9B0] shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Вход в кабинет</CardTitle>
            <CardDescription>Введите email и пароль для входа</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="your@email.ru" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Пароль</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex justify-end">
                  <Link href="/reset-password" className="text-sm text-[#D4512B] hover:underline">
                    Забыли пароль?
                  </Link>
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-[#D4512B] hover:bg-[#B33D1A]">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Войти
                </Button>
              </form>
            </Form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Нет аккаунта?{" "}
              <Link href="/register" className="text-[#D4512B] hover:underline font-medium">
                Зарегистрироваться
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

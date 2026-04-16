"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
            <CardTitle className="text-xl">Регистрация</CardTitle>
            <CardDescription>Создайте аккаунт для управления заказами</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="full_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Имя / ФИО</FormLabel>
                    <FormControl><Input placeholder="Иван Иванов" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="company_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Компания / ИП (необязательно)</FormLabel>
                    <FormControl><Input placeholder="ООО «Ромашка» или ИП Иванов" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Телефон (необязательно)</FormLabel>
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
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Пароль</FormLabel>
                    <FormControl><Input type="password" placeholder="Минимум 8 символов" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="confirm_password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Повторите пароль</FormLabel>
                    <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={loading} className="w-full bg-[#D4512B] hover:bg-[#B33D1A]">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Создать аккаунт
                </Button>
              </form>
            </Form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Уже есть аккаунт?{" "}
              <Link href="/login" className="text-[#D4512B] hover:underline font-medium">Войти</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

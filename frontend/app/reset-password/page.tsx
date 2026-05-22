"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, MailCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { AuthShell, AuthHeader } from "@/components/layout/auth-shell"
import { api } from "@/lib/api"

const requestSchema = z.object({
  email: z.string().email("Неверный email"),
})
type RequestData = z.infer<typeof requestSchema>

const confirmSchema = z
  .object({
    new_password: z.string().min(8, "Минимум 8 символов"),
    confirm: z.string(),
  })
  .refine((d) => d.new_password === d.confirm, {
    message: "Пароли не совпадают",
    path: ["confirm"],
  })
type ConfirmData = z.infer<typeof confirmSchema>

// Шаг 1: запрос ссылки на email
function RequestForm() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const form = useForm<RequestData>({ resolver: zodResolver(requestSchema), defaultValues: { email: "" } })

  async function onSubmit(data: RequestData) {
    setLoading(true)
    try {
      await api.post("/auth/reset-password", data)
      setSent(true)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ошибка"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm text-center">
        <MailCheck className="h-12 w-12 mx-auto text-primary" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Проверьте почту</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Если аккаунт с таким email существует, мы отправили на него ссылку для сброса пароля.
          Ссылка действует 2 часа.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm text-primary hover:underline font-medium">
          Вернуться ко входу
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <AuthHeader title="Восстановление пароля" subtitle="Укажите email — пришлём ссылку для сброса" />

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

          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Отправить ссылку
          </Button>
        </form>
      </Form>

      <div className="mt-6 pt-5 border-t border-border text-sm text-muted-foreground text-center">
        Вспомнили пароль?{" "}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Войти
        </Link>
      </div>
    </div>
  )
}

// Шаг 2: ввод нового пароля по токену из письма
function ConfirmForm({ token }: { token: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const form = useForm<ConfirmData>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { new_password: "", confirm: "" },
  })

  async function onSubmit(data: ConfirmData) {
    setLoading(true)
    try {
      await api.post("/auth/reset-confirm", { token, new_password: data.new_password })
      toast.success("Пароль обновлён — войдите с новым паролем")
      router.push("/login")
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ссылка устарела или недействительна"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <AuthHeader title="Новый пароль" subtitle="Придумайте новый пароль для входа" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <FormField control={form.control} name="new_password" render={({ field }) => (
            <FormItem>
              <FormLabel>Новый пароль</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="confirm" render={({ field }) => (
            <FormItem>
              <FormLabel>Повторите пароль</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Сохранить пароль
          </Button>
        </form>
      </Form>
    </div>
  )
}

function ResetContent() {
  const token = useSearchParams().get("token")
  return token ? <ConfirmForm token={token} /> : <RequestForm />
}

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="text-muted-foreground">Загрузка...</div>}>
        <ResetContent />
      </Suspense>
    </AuthShell>
  )
}

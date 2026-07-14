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
import { OtpCodeInput, ResendCodeButton } from "@/components/features/otp-code"
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

// Шаг 1: запрос кода на email
function RequestForm({ onSent }: { onSent: (email: string) => void }) {
  const [loading, setLoading] = useState(false)
  const form = useForm<RequestData>({ resolver: zodResolver(requestSchema), defaultValues: { email: "" } })

  async function onSubmit(data: RequestData) {
    setLoading(true)
    try {
      await api.post("/auth/reset-password", { email: data.email })
      toast.success("Если аккаунт существует, код отправлен на почту")
      onSent(data.email)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <AuthHeader title="Восстановление пароля" subtitle="Укажите email — пришлём 6-значный код" />

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
            Отправить код
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

// Шаг 2: код из письма + новый пароль
function ConfirmForm({ email }: { email: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState("")
  const form = useForm<ConfirmData>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { new_password: "", confirm: "" },
  })

  async function onSubmit(data: ConfirmData) {
    if (code.length !== 6) {
      toast.error("Введите 6-значный код из письма")
      return
    }
    setLoading(true)
    try {
      await api.post("/auth/reset-confirm", { email, code, new_password: data.new_password })
      toast.success("Пароль обновлён — войдите с новым паролем")
      router.push("/login")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Неверный или устаревший код")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <AuthHeader title="Новый пароль" subtitle={`Код отправлен на ${email}`} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-2">
            <FormLabel>Код из письма</FormLabel>
            <OtpCodeInput value={code} onChange={setCode} autoFocus />
          </div>

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

          <Button type="submit" disabled={loading || code.length !== 6} size="lg" className="w-full">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Сохранить пароль
          </Button>
          <ResendCodeButton email={email} purpose="reset" />
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Письмо не приходит? Проверьте папку «Спам» или{" "}
            <Link href="/contacts" target="_blank" className="text-primary hover:underline">
              свяжитесь с нами
            </Link>{" "}
            — поможем восстановить доступ.
          </p>
        </form>
      </Form>
    </div>
  )
}

export default function ResetPasswordPage() {
  const [email, setEmail] = useState<string | null>(null)
  return (
    <AuthShell>
      {email ? <ConfirmForm email={email} /> : <RequestForm onSent={setEmail} />}
    </AuthShell>
  )
}

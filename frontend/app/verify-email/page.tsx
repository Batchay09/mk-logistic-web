"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { AuthShell } from "@/components/layout/auth-shell"
import { api } from "@/lib/api"

type Status = "loading" | "ok" | "error"

function VerifyContent() {
  const token = useSearchParams().get("token")
  // Начальное состояние выводим из наличия токена — без синхронного setState в effect.
  const [status, setStatus] = useState<Status>(token ? "loading" : "error")
  const [message, setMessage] = useState(
    token ? "" : "Ссылка не содержит токен подтверждения",
  )

  useEffect(() => {
    if (!token) return
    api
      .post("/auth/verify-email", { token })
      .then(() => setStatus("ok"))
      .catch((e: unknown) => {
        setStatus("error")
        setMessage(e instanceof Error ? e.message : "Неверная или устаревшая ссылка")
      })
  }, [token])

  if (status === "loading") {
    return (
      <div className="w-full max-w-sm text-center text-muted-foreground">
        <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
        <p className="mt-4 text-sm">Подтверждаем email...</p>
      </div>
    )
  }

  if (status === "ok") {
    return (
      <div className="w-full max-w-sm text-center">
        <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Email подтверждён</h1>
        <p className="mt-2 text-sm text-muted-foreground">Теперь можно войти в личный кабинет.</p>
        <Link href="/login" className="mt-6 inline-block text-sm text-primary hover:underline font-medium">
          Войти
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm text-center">
      <XCircle className="h-12 w-12 mx-auto text-destructive" />
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Не удалось подтвердить</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <Link href="/login" className="mt-6 inline-block text-sm text-primary hover:underline font-medium">
        Вернуться ко входу
      </Link>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="text-muted-foreground">Загрузка...</div>}>
        <VerifyContent />
      </Suspense>
    </AuthShell>
  )
}

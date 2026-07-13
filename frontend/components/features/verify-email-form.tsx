"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OtpCodeInput, ResendCodeButton } from "@/components/features/otp-code"
import { api } from "@/lib/api"
import type { CurrentUser } from "@/lib/auth"

/** Экран подтверждения email кодом из письма. По успеху бэкенд ставит
 *  auth-cookie — пользователь сразу залогинен. */
export function VerifyEmailForm({
  email,
  onSuccess,
}: {
  email: string
  onSuccess: (user: CurrentUser) => void
}) {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await api.post<CurrentUser>("/auth/register/confirm", { email, code })
      onSuccess(user)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Неверный или устаревший код")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        Мы отправили 6-значный код на{" "}
        <span className="font-medium text-foreground">{email}</span>.
        Введите его, чтобы подтвердить почту.
      </p>
      <OtpCodeInput value={code} onChange={setCode} autoFocus />
      <Button type="submit" disabled={loading || code.length !== 6} size="lg" className="w-full">
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Подтвердить
      </Button>
      <ResendCodeButton email={email} purpose="register" />
    </form>
  )
}

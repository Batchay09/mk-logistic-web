"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"

const RESEND_COOLDOWN_SECONDS = 60

/** Поле ввода 6-значного кода из письма: цифры, автозаполнение из СМС/почты. */
export function OtpCodeInput({
  value,
  onChange,
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
}) {
  return (
    <Input
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      placeholder="••••••"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      autoFocus={autoFocus}
      className="text-center text-2xl font-bold tracking-[0.5em] h-14"
    />
  )
}

/** Кнопка «Отправить код ещё раз» с кулдауном. Кулдаун стартует сразу:
 *  код уже был отправлен перед показом формы. */
export function ResendCodeButton({
  email,
  purpose,
}: {
  email: string
  purpose: "register" | "reset"
}) {
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function resend() {
    setSending(true)
    try {
      await api.post("/auth/resend-code", { email, purpose })
      toast.success("Код отправлен повторно — проверьте почту")
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Не удалось отправить код")
    } finally {
      setSending(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      disabled={cooldown > 0 || sending}
      onClick={resend}
      className="w-full text-sm text-muted-foreground"
    >
      {cooldown > 0 ? `Отправить код ещё раз (${cooldown} c)` : "Отправить код ещё раз"}
    </Button>
  )
}

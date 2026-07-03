"use client"

import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { MessageCircle, X, Send, Loader2, ImagePlus } from "lucide-react"
import { api, API_URL } from "@/lib/api"
import { cn } from "@/lib/utils"

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ACCEPT_IMAGES = "image/jpeg,image/png,image/webp"

interface ChatMessage {
  id: number
  sender_role: "client" | "manager"
  body: string
  created_at: string | null
  attachment: { name: string | null; mime: string } | null
}
interface ChatData {
  conversation_id: number
  messages: ChatMessage[]
}

function time(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
}

/**
 * Плавающий виджет чата с поддержкой для клиента.
 * Рендерится на всех страницах кабинета (через LayoutWithSidebar).
 * Обновление — polling (react-query refetchInterval).
 */
export function ChatWidget() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  // Бейдж непрочитанного — опрашиваем всегда, чтобы было видно новое сообщение
  const { data: unread } = useQuery<{ unread: number }>({
    queryKey: ["client-chat-unread"],
    queryFn: () => api.get("/client/chat/unread"),
    refetchInterval: 8000,
  })

  // Тред — грузим и опрашиваем только когда окно открыто
  const { data: chat, isLoading } = useQuery<ChatData>({
    queryKey: ["client-chat"],
    queryFn: () => api.get("/client/chat"),
    enabled: open,
    refetchInterval: open ? 4000 : false,
  })

  const sendMut = useMutation({
    mutationFn: (body: string) => api.post("/client/chat", { body }),
    onSuccess: () => {
      setText("")
      qc.invalidateQueries({ queryKey: ["client-chat"] })
      qc.invalidateQueries({ queryKey: ["client-chat-unread"] })
    },
  })

  const fileRef = useRef<HTMLInputElement>(null)

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch(`${API_URL}/client/chat/upload`, {
        method: "POST",
        credentials: "include",
        body: fd,
      })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error((j && j.detail) || "Не удалось загрузить изображение")
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-chat"] })
      qc.invalidateQueries({ queryKey: ["client-chat-unread"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // сброс — чтобы можно было выбрать тот же файл снова
    if (!file) return
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Изображение больше 5 МБ")
      return
    }
    uploadMut.mutate(file)
  }

  // Открытие чата извне (кнопка «Поддержка» в меню шлёт это событие)
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener("mk:open-chat", handler)
    return () => window.removeEventListener("mk:open-chat", handler)
  }, [])

  // При открытии — сбросить бейдж (сервер помечает прочитанным на GET /client/chat)
  useEffect(() => {
    if (open) qc.invalidateQueries({ queryKey: ["client-chat-unread"] })
  }, [open, qc])

  // Автоскролл вниз
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chat?.messages?.length, open])

  const unreadCount = unread?.unread ?? 0
  const messages = chat?.messages ?? []

  function submit() {
    const t = text.trim()
    if (!t || sendMut.isPending) return
    sendMut.mutate(t)
  }

  return (
    <>
      {/* ── Панель чата ── */}
      {open && (
        <div
          className={cn(
            "fixed right-4 z-50 flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl",
            "bottom-[calc(5.75rem+env(safe-area-inset-bottom))] md:bottom-24",
            "w-[min(22rem,calc(100vw-2rem))] h-[28rem] max-h-[70svh]",
          )}
        >
          {/* Header */}
          <div className="relative flex items-center gap-3 overflow-hidden bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] px-4 py-3 text-white">
            <div className="grid size-9 place-items-center rounded-full bg-white/20 text-sm font-bold">МК</div>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight">Поддержка МК</div>
              <div className="flex items-center gap-1.5 text-xs text-white/85">
                <span className="size-1.5 rounded-full bg-[#7CF0A6]" /> на связи
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Закрыть чат"
              className="ml-auto grid size-8 place-items-center rounded-full text-white/90 transition-colors hover:bg-white/15"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-2.5 overflow-y-auto bg-muted/30 p-4">
            {isLoading && (
              <div className="flex justify-center py-6">
                <Loader2 className="size-5 animate-spin text-primary" />
              </div>
            )}
            {!isLoading && messages.length === 0 && (
              <p className="mx-auto max-w-[16rem] rounded-2xl bg-card px-3 py-2.5 text-center text-[13px] text-muted-foreground shadow-sm">
                Здравствуйте! Напишите нам — менеджер ответит как можно скорее.
              </p>
            )}
            {messages.map((m) => {
              const mine = m.sender_role === "client"
              return (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[80%] overflow-hidden rounded-2xl px-3 py-2 text-[13px] leading-snug",
                    mine
                      ? "ml-auto rounded-br-sm bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] text-white"
                      : "mr-auto rounded-bl-sm border border-border bg-card text-foreground",
                  )}
                >
                  {m.attachment && (
                    <a
                      href={`${API_URL}/client/chat/attachment/${m.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`${API_URL}/client/chat/attachment/${m.id}`}
                        alt={m.attachment.name || "Изображение"}
                        className="mb-1 max-h-48 w-full rounded-xl object-cover"
                        loading="lazy"
                      />
                    </a>
                  )}
                  {m.body && <span>{m.body}</span>}
                  <span className={cn("mt-1 block text-[10px]", mine ? "text-white/70" : "text-muted-foreground")}>
                    {time(m.created_at)}
                  </span>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 border-t border-border bg-card p-2.5">
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT_IMAGES}
              onChange={onPickFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadMut.isPending}
              aria-label="Прикрепить изображение"
              className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary disabled:opacity-40"
            >
              {uploadMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-5" />}
            </button>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
              rows={1}
              placeholder="Написать сообщение…"
              className="max-h-24 flex-1 resize-none rounded-2xl border border-border bg-background px-3.5 py-2 text-sm outline-none focus-visible:border-primary/50"
            />
            <button
              onClick={submit}
              disabled={!text.trim() || sendMut.isPending}
              aria-label="Отправить"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] text-white shadow-brand transition-opacity disabled:opacity-40"
            >
              {sendMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
        </div>
      )}

      {/* ── Плавающая кнопка ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Закрыть чат" : "Открыть чат с поддержкой"}
        className={cn(
          "fixed right-4 z-50 grid size-14 place-items-center rounded-full text-white shadow-[0_12px_28px_-8px_rgb(212_81_43_/_0.7)]",
          "bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] transition-transform hover:scale-105 active:scale-95",
          "bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6",
        )}
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
        {!open && unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-5 h-5 place-items-center rounded-full bg-success px-1 text-[11px] font-bold ring-2 ring-background">
            {unreadCount}
          </span>
        )}
      </button>
    </>
  )
}

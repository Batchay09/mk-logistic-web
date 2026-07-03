"use client"

import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Loader2, MessageCircle, Send, ArrowLeft, Mail, Phone } from "lucide-react"

interface ChatListItem {
  id: number
  client_name: string | null
  client_email: string | null
  unread: number
  updated_at: string | null
  last_message: string | null
  last_sender: "client" | "manager" | null
}

interface ChatMessage {
  id: number
  sender_role: "client" | "manager"
  body: string
  created_at: string
}

interface ChatDetail {
  id: number
  client: { name: string | null; email: string | null; phone: string | null }
  messages: ChatMessage[]
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
}

function displayName(name: string | null, email: string | null): string {
  return name || email || "Клиент"
}

export default function ManagerChatsPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const { data: chats = [], isLoading } = useQuery<ChatListItem[]>({
    queryKey: ["manager-chats"],
    queryFn: () => api.get("/manager/chats"),
    refetchInterval: 5000,
  })

  return (
    <LayoutWithSidebar role="manager">
      <div className="flex flex-col gap-4 h-[calc(100dvh-10rem)] md:h-[calc(100dvh-3rem)]">
        {/* Header + аврора-свечение */}
        <div className="relative shrink-0">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-12 left-0 h-56 w-[32rem] max-w-full rounded-full opacity-50 blur-3xl"
            style={{ background: "radial-gradient(circle, oklch(from var(--primary) l c h / 0.10) 0%, transparent 70%)" }}
          />
          <h1 className="relative text-2xl font-bold">Чаты</h1>
        </div>

        {/* Двухпанельный инбокс */}
        <div className="flex-1 min-h-0 md:grid md:grid-cols-[280px_1fr] md:gap-4">
          {/* Список диалогов */}
          <Card
            className={cn(
              "flex flex-col min-h-0 h-full gap-0 p-0 border-border",
              selectedId !== null && "hidden md:flex",
            )}
          >
            {isLoading ? (
              <div className="flex flex-1 items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : chats.length === 0 ? (
              <div className="flex flex-1 items-center justify-center px-4 py-12 text-center text-sm text-muted-foreground">
                Пока нет диалогов
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border">
                {chats.map((c) => {
                  const active = c.id === selectedId
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={cn(
                        "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors",
                        active ? "bg-primary/10" : "hover:bg-muted",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                          {displayName(c.client_name, c.client_email)}
                        </span>
                        {c.unread > 0 && (
                          <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-xs font-semibold text-white tabular-nums">
                            {c.unread}
                          </span>
                        )}
                      </div>
                      {c.last_message && (
                        <p className="truncate text-sm text-muted-foreground">
                          {c.last_sender === "manager" && <span className="text-foreground/60">Вы: </span>}
                          {c.last_message}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Тред */}
          <div
            className={cn(
              "flex min-h-0 h-full flex-col",
              selectedId === null && "hidden md:flex",
            )}
          >
            {selectedId === null ? (
              <EmptyThread />
            ) : (
              <ChatThread conversationId={selectedId} onBack={() => setSelectedId(null)} />
            )}
          </div>
        </div>
      </div>
    </LayoutWithSidebar>
  )
}

function EmptyThread() {
  return (
    <Card className="flex flex-1 flex-col items-center justify-center gap-4 border-dashed border-border bg-muted/30 text-center">
      <div className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[var(--brand-dark)] text-white shadow-brand">
        <MessageCircle className="h-7 w-7" aria-hidden />
      </div>
      <p className="text-muted-foreground">Выберите диалог слева</p>
    </Card>
  )
}

function ChatThread({ conversationId, onBack }: { conversationId: number; onBack: () => void }) {
  const qc = useQueryClient()
  const [text, setText] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: chat, isLoading } = useQuery<ChatDetail>({
    queryKey: ["manager-chat", conversationId],
    queryFn: () => api.get(`/manager/chats/${conversationId}`),
    refetchInterval: 4000,
  })

  const messages = chat?.messages ?? []

  // Автоскролл вниз при новых сообщениях
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  const sendMut = useMutation({
    mutationFn: (body: string) => api.post(`/manager/chats/${conversationId}`, { body }),
    onSuccess: () => {
      setText("")
      qc.invalidateQueries({ queryKey: ["manager-chat", conversationId] })
      qc.invalidateQueries({ queryKey: ["manager-chats"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function handleSend() {
    const body = text.trim()
    if (!body || sendMut.isPending) return
    sendMut.mutate(body)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Card className="flex min-h-0 h-full flex-col gap-0 p-0 border-border">
      {/* Заголовок треда */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-primary shrink-0"
          onClick={onBack}
          aria-label="Назад к списку"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">
            {chat ? displayName(chat.client.name, chat.client.email) : "Диалог"}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
            {chat?.client.email && (
              <a href={`mailto:${chat.client.email}`} className="flex items-center gap-1 text-primary hover:underline">
                <Mail className="size-3 shrink-0" aria-hidden />
                <span className="truncate">{chat.client.email}</span>
              </a>
            )}
            {chat?.client.phone && (
              <a href={`tel:${chat.client.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                <Phone className="size-3 shrink-0" aria-hidden />
                {chat.client.phone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Лента сообщений */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            Сообщений пока нет — напишите первым
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => {
              const mine = m.sender_role === "manager"
              return (
                <div
                  key={m.id}
                  className={cn("flex max-w-[80%] flex-col gap-1", mine ? "ml-auto items-end" : "mr-auto items-start")}
                >
                  <div
                    className={cn(
                      "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm",
                      mine
                        ? "rounded-br-sm bg-gradient-to-br from-primary to-[var(--brand-dark)] text-white shadow-brand"
                        : "rounded-bl-sm border border-border bg-card text-foreground",
                    )}
                  >
                    {m.body}
                  </div>
                  <span className="px-1 text-[11px] text-muted-foreground tabular-nums">
                    {fmtTime(m.created_at)}
                  </span>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Композитор */}
      <div className="flex items-end gap-2 border-t border-border p-3 shrink-0">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Написать сообщение..."
          rows={1}
          className="max-h-32 min-h-11 flex-1 resize-none border-border"
        />
        <Button
          onClick={handleSend}
          disabled={!text.trim() || sendMut.isPending}
          className="btn-shine size-11 shrink-0 rounded-full p-0"
          aria-label="Отправить"
        >
          {sendMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </Card>
  )
}

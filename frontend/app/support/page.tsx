"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { HeadphonesIcon, Mail, MessageCircle, Send, Loader2 } from "lucide-react"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { H2, H4, Lead, Muted } from "@/components/ui/typography"
import { VStack } from "@/components/ui/stack"
import { api, ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

interface ContactProps {
  icon: typeof Mail
  title: string
  description: string
  href: string
  hrefLabel: string
}

function ContactCard({ icon: Icon, title, description, href, hrefLabel }: ContactProps) {
  return (
    <a
      href={href}
      className={cn(
        "group flex items-start gap-4 p-5 rounded-2xl",
        "border border-border bg-card shadow-sm",
        "hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40",
        "transition-all duration-[var(--duration-base)]",
      )}
    >
      <div className="shrink-0 size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="space-y-1 min-w-0">
        <H4 className="text-base sm:text-lg">{title}</H4>
        <Muted>{description}</Muted>
        <span className="text-sm font-medium text-primary inline-block pt-1">
          {hrefLabel} →
        </span>
      </div>
    </a>
  )
}

const supportSchema = z.object({
  message: z.string().min(10, "Опишите вопрос подробнее — минимум 10 символов"),
})
type SupportFormData = z.infer<typeof supportSchema>

function SupportForm() {
  const [loading, setLoading] = useState(false)

  const form = useForm<SupportFormData>({
    resolver: zodResolver(supportSchema),
    defaultValues: { message: "" },
  })

  async function onSubmit(data: SupportFormData) {
    setLoading(true)
    try {
      await api.post<{ ok: boolean }>("/client/support", data)
      toast.success("Сообщение отправлено, менеджер ответит")
      form.reset({ message: "" })
    } catch (e: unknown) {
      const msg = e instanceof ApiError ? e.message : "Не удалось отправить сообщение"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-border bg-card rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Написать в поддержку</CardTitle>
        <CardDescription>Опишите вопрос — ответим на email, указанный в профиле</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="message" render={({ field }) => (
              <FormItem>
                <FormLabel>Сообщение</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Опишите вопрос по заказу, оплате или доставке..."
                    className="min-h-32 resize-y"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Button type="submit" disabled={loading} size="lg" className="btn-shine rounded-full px-6">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Отправить
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export default function SupportPage() {
  return (
    <LayoutWithSidebar role="client">
      <VStack gap="lg" className="w-full">
        <div className="relative space-y-1">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-10 left-0 h-48 w-[28rem] max-w-full rounded-full opacity-50 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, oklch(from var(--primary) l c h / 0.10) 0%, transparent 70%)",
            }}
          />
          <H2 className="relative text-2xl sm:text-3xl">Поддержка</H2>
          <Muted className="relative">Менеджер ответит в течение часа в рабочие дни</Muted>
        </div>

        <Card className="border-border bg-card rounded-2xl shadow-sm">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="shrink-0 size-12 rounded-xl bg-gradient-to-br from-primary to-[var(--brand-dark)] text-white flex items-center justify-center shadow-brand">
              <HeadphonesIcon className="size-5" aria-hidden />
            </div>
            <div className="space-y-1.5">
              <H4 className="text-base sm:text-lg">Чем мы можем помочь?</H4>
              <Lead className="text-base">
                Опишите вопрос — менеджер ответит и поможет с заказом, оплатой или
                доставкой.
              </Lead>
            </div>
          </CardContent>
        </Card>

        <SupportForm />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ContactCard
            icon={Mail}
            title="Email"
            description="Самый быстрый способ — напишите нам с описанием вопроса"
            href="mailto:support@mk-logistic.ru"
            hrefLabel="support@mk-logistic.ru"
          />
          <ContactCard
            icon={MessageCircle}
            title="Telegram-бот"
            description="Менеджер на связи 9:00–21:00 МСК, ответы в течение часа"
            href="https://t.me/mk_tranzit_bot"
            hrefLabel="@mk_tranzit_bot"
          />
        </div>
      </VStack>
    </LayoutWithSidebar>
  )
}

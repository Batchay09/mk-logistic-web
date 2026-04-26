"use client"

import { HeadphonesIcon, Mail, MessageCircle } from "lucide-react"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { H2, H4, Lead, Muted } from "@/components/ui/typography"
import { VStack } from "@/components/ui/stack"
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

export default function SupportPage() {
  return (
    <LayoutWithSidebar role="client">
      <VStack gap="lg" className="w-full">
        <div className="space-y-1">
          <H2 className="text-2xl sm:text-3xl">Поддержка</H2>
          <Muted>Менеджер ответит в течение часа в рабочие дни</Muted>
        </div>

        <Card className="border-border bg-card rounded-2xl shadow-sm">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="shrink-0 size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
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

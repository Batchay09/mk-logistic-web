"use client"

import {
  Package,
  Calculator,
  CreditCard,
  Truck,
  Check,
  type LucideIcon,
} from "lucide-react"
import { Container } from "@/components/ui/container"
import { Section, SectionHeader } from "@/components/ui/section"
import { Eyebrow, H2, H4, Lead, Muted } from "@/components/ui/typography"
import { Reveal } from "@/components/ui/reveal"
import { cn } from "@/lib/utils"

interface Step {
  icon: LucideIcon
  title: string
  description: string
  benefits: string[]
}

const STEPS: Step[] = [
  {
    icon: Package,
    title: "Создайте заказ",
    description:
      "Заполните мастер заказа за 6 шагов: маркетплейс, склад, дата, коробки.",
    benefits: ["Wildberries и Ozon", "Все направления", "Сохраним черновик"],
  },
  {
    icon: Calculator,
    title: "Получите расчёт",
    description:
      "Система автоматически посчитает стоимость и предложит дату прибытия.",
    benefits: ["Прозрачные тарифы", "Паллеты от 11 коробок", "Дата доставки"],
  },
  {
    icon: CreditCard,
    title: "Оплатите онлайн",
    description:
      "ЮKassa: банковская карта или СБП. Стикеры приходят сразу после оплаты.",
    benefits: ["Карта или СБП", "PDF-стикеры на email", "Чек для бухгалтерии"],
  },
  {
    icon: Truck,
    title: "Отслеживайте",
    description:
      "Статус заказа в реальном времени — от забора до приёмки на складе.",
    benefits: ["Уведомления на email", "QR-коды на коробках", "Связь с менеджером"],
  },
]

interface StepCardProps {
  step: Step
  index: number
}

function StepCard({ step, index }: StepCardProps) {
  const Icon = step.icon
  const num = String(index + 1).padStart(2, "0")
  return (
    <article
      className={cn(
        "group relative flex flex-col gap-4 p-6 rounded-2xl",
        "bg-card border border-border shadow-sm",
        "hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40",
        "transition-all duration-[var(--duration-base)]",
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl",
            "bg-primary/10 text-primary",
            "group-hover:bg-primary group-hover:text-primary-foreground",
            "transition-colors duration-[var(--duration-base)]",
          )}
        >
          <Icon className="size-6" aria-hidden />
        </div>
        <span
          aria-hidden
          className="font-mono text-sm font-semibold text-muted-foreground/70 tabular-nums"
        >
          {num}
        </span>
      </header>

      <div className="space-y-1.5">
        <H4 className="text-lg sm:text-xl">{step.title}</H4>
        <Muted>{step.description}</Muted>
      </div>

      <ul className="flex flex-col gap-2 mt-auto pt-1">
        {step.benefits.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm text-foreground/85">
            <Check
              className="size-4 mt-0.5 shrink-0 text-primary"
              aria-hidden
            />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

export function HowItWorks() {
  return (
    <Section tone="default" spacing="lg" id="how-it-works">
      <Container>
        <Reveal>
          <SectionHeader>
            <Eyebrow>Как это работает</Eyebrow>
            <H2>4 шага до доставки на склад</H2>
            <Lead>
              Не нужно звонить менеджеру и присылать таблицы — оформляйте,
              рассчитывайте и отправляйте грузы прямо в браузере.
            </Lead>
          </SectionHeader>
        </Reveal>

        <div className="relative max-w-6xl mx-auto">
          {/* Соединительная линия — только на десктопе */}
          <div
            aria-hidden
            className={cn(
              "hidden lg:block absolute top-12 left-0 right-0 h-px",
              "bg-gradient-to-r from-transparent via-border to-transparent",
              "z-0",
            )}
          />

          {/* Маркеры с цифрами — только на десктопе, выровнены с карточками */}
          <ol
            aria-hidden
            className="hidden lg:grid lg:grid-cols-4 gap-6 mb-6 relative z-10"
          >
            {STEPS.map((_, i) => (
              <li key={i} className="flex justify-center">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full",
                    "bg-background ring-4 ring-background",
                    "border-2 border-primary text-primary",
                    "font-bold text-sm tabular-nums",
                  )}
                >
                  {i + 1}
                </span>
              </li>
            ))}
          </ol>

          {/* Карточки шагов — mobile-first, на mobile вертикальный timeline через ::before */}
          <ol
            className={cn(
              "relative grid gap-5 sm:gap-6",
              "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
              // Vertical timeline line на мобиле и планшете
              "lg:before:hidden",
              "before:content-[''] before:absolute before:left-6 before:top-6 before:bottom-6",
              "before:w-px before:bg-border sm:before:hidden",
            )}
          >
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative">
                {/* Маркер с цифрой на mobile (one-column) */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute -left-0.5 top-6 z-10 sm:hidden",
                    "flex h-7 w-7 items-center justify-center rounded-full",
                    "bg-background ring-4 ring-background",
                    "border-2 border-primary text-primary",
                    "font-bold text-xs tabular-nums",
                  )}
                >
                  {i + 1}
                </span>
                <Reveal delay={i * 0.08} className="sm:pl-0 pl-10">
                  <StepCard step={step} index={i} />
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </Section>
  )
}

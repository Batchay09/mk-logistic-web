"use client"

import Link from "next/link"
import {
  Boxes,
  Layers,
  Truck,
  Calculator,
  ArrowRight,
  Check,
  type LucideIcon,
} from "lucide-react"
import { Container } from "@/components/ui/container"
import { Section, SectionHeader } from "@/components/ui/section"
import { Eyebrow, H2, Lead, Muted } from "@/components/ui/typography"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Reveal } from "@/components/ui/reveal"
import { cn } from "@/lib/utils"

interface PriceItem {
  icon: LucideIcon
  label: string
  hint: string
}

const PRICES: PriceItem[] = [
  {
    icon: Boxes,
    label: "Поштучная отправка",
    hint: "Подходит для небольших партий — оплата за каждую коробку",
  },
  {
    icon: Layers,
    label: "Паллетная отправка",
    hint: "Автоматически паллетизируем при 11 и более коробках",
  },
  {
    icon: Truck,
    label: "Забор груза",
    hint: "Можем забрать груз — указываете адрес при оформлении",
  },
]

const ADVANTAGES = [
  "Расчёт прямо в кабинете — без звонка менеджеру",
  "Цена видна на этапе оформления, до оплаты",
  "Тариф зависит от направления и количества — без неожиданностей",
]

interface PriceCardProps {
  item: PriceItem
}

function PriceCard({ item }: PriceCardProps) {
  const Icon = item.icon
  return (
    <Card
      className={cn(
        "border-border bg-card rounded-2xl shadow-sm",
        "hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40",
        "transition-all duration-[var(--duration-base)]",
      )}
    >
      <CardContent className="p-6 flex flex-col gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-6" aria-hidden />
        </div>

        <div className="space-y-1.5">
          <p className="font-heading text-xl sm:text-2xl font-bold text-foreground leading-tight">
            {item.label}
          </p>
          <Muted>{item.hint}</Muted>
        </div>
      </CardContent>
    </Card>
  )
}

export function PricingTeaser() {
  return (
    <Section tone="default" spacing="lg" id="pricing">
      <Container>
        <Reveal>
          <SectionHeader>
            <Eyebrow>Тарифы</Eyebrow>
            <H2>Как считается стоимость</H2>
            <Lead>
              Стоимость зависит от направления и количества коробок.
              Точный расчёт — в кабинете при оформлении заказа.
            </Lead>
          </SectionHeader>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          {PRICES.map((item, i) => (
            <Reveal key={item.label} delay={i * 0.08}>
              <PriceCard item={item} />
            </Reveal>
          ))}
        </div>

        {/* Advantages + CTA */}
        <Reveal>
        <Card
          className={cn(
            "border-primary/20 bg-card rounded-2xl shadow-md",
            "overflow-hidden",
          )}
        >
          <CardContent className="p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
            <div className="flex-1 space-y-3">
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                {ADVANTAGES.map((a) => (
                  <li
                    key={a}
                    className="flex items-start gap-2.5 text-sm sm:text-base text-foreground/85"
                  >
                    <Check
                      className="size-5 mt-0.5 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-2 lg:items-end shrink-0">
              <Link href="/orders/new" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-12 px-6 shadow-sm tap-target font-semibold"
                >
                  <Calculator className="size-4" aria-hidden />
                  Открыть калькулятор
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground text-center sm:text-right">
                Точная стоимость — после регистрации, без оплаты
              </p>
            </div>
          </CardContent>
        </Card>
        </Reveal>
      </Container>
    </Section>
  )
}

import Link from "next/link"
import { ArrowRight, type LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { H2, Lead, Muted } from "@/components/ui/typography"
import { VStack } from "@/components/ui/stack"

interface PlaceholderPageProps {
  icon: LucideIcon
  title: string
  description: string
  /** Опциональная подсказка под описанием */
  hint?: string
  /** Действие/ссылка по кнопке. По умолчанию — на /dashboard */
  href?: string
  ctaLabel?: string
}

export function PlaceholderPage({
  icon: Icon,
  title,
  description,
  hint,
  href = "/dashboard",
  ctaLabel = "Вернуться в кабинет",
}: PlaceholderPageProps) {
  return (
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
        <H2 className="relative text-2xl sm:text-3xl">{title}</H2>
        <Muted className="relative">{description}</Muted>
      </div>

      <Card className="relative overflow-hidden border-dashed border-border bg-muted/30 rounded-2xl">
        <CardContent className="py-14 sm:py-20 text-center flex flex-col items-center gap-4">
          <div className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[var(--brand-dark)] text-white shadow-brand animate-float-y">
            <Icon className="size-7" aria-hidden />
          </div>
          <div className="space-y-1.5 max-w-md">
            <H2 className="text-xl sm:text-2xl">Раздел в разработке</H2>
            <Lead className="text-base">
              Скоро здесь появится {title.toLowerCase()}. Пока что доступно через
              чат с менеджером.
            </Lead>
            {hint && <Muted className="pt-1">{hint}</Muted>}
          </div>
          <Link href={href}>
            <Button size="lg" className="btn-shine h-11 rounded-full px-6 mt-2 tap-target">
              {ctaLabel}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </VStack>
  )
}

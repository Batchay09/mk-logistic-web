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
      <div className="space-y-1">
        <H2 className="text-2xl sm:text-3xl">{title}</H2>
        <Muted>{description}</Muted>
      </div>

      <Card className="border-dashed border-border bg-muted/30 rounded-2xl">
        <CardContent className="py-14 sm:py-20 text-center flex flex-col items-center gap-4">
          <div className="bg-primary/10 text-primary rounded-2xl p-4 w-16 h-16 flex items-center justify-center">
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
            <Button size="lg" className="h-11 px-5 mt-2 tap-target">
              {ctaLabel}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </VStack>
  )
}

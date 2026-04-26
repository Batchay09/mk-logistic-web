import { Container } from "@/components/ui/container"
import { Section } from "@/components/ui/section"
import { Caption } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

interface PartnerProps {
  name: string
  /** Фирменный hex-цвет — отображается как акцент-точка слева от названия */
  brandColor: string
  className?: string
}

function Partner({ name, brandColor, className }: PartnerProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5",
        "text-base sm:text-lg font-semibold tracking-tight",
        "text-foreground/70 hover:text-foreground",
        "transition-colors duration-[var(--duration-base)]",
        className,
      )}
    >
      <span
        aria-hidden
        className="size-2.5 rounded-full shrink-0"
        style={{ background: brandColor }}
      />
      {name}
    </span>
  )
}

export function Trust() {
  return (
    <Section tone="default" spacing="sm" aria-label="Партнёры и оплата">
      <Container>
        <div className="flex flex-col items-center gap-6 sm:gap-8 text-center">
          <Caption>Доставляем на склады • Принимаем оплату</Caption>

          <div
            className={cn(
              // Mobile: 2x2 сетка, по центру каждый партнёр
              "grid grid-cols-2 gap-x-6 gap-y-5 place-items-center",
              // Tablet+: одна полоса с разделителем посередине
              "sm:flex sm:flex-row sm:flex-wrap sm:gap-x-12 lg:gap-x-16",
            )}
          >
            <Partner name="Wildberries" brandColor="#CB11AB" />
            <Partner name="OZON" brandColor="#005BFF" />
            <span
              aria-hidden
              className="hidden sm:inline-block h-6 w-px bg-border"
            />
            <Partner name="ЮKassa" brandColor="#0BAB66" />
            <Partner name="СБП" brandColor="#2DA94F" />
          </div>
        </div>
      </Container>
    </Section>
  )
}

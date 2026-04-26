import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * MobileBottomBar — sticky-футер для wizard'а заказа, корзины, форм оплаты.
 * Прилипает к низу экрана, имеет blur-фон, безопасную зону под home indicator iPhone.
 *
 * НЕ использовать вместе с BottomNav на одной странице — они конфликтуют.
 * Если нужны и nav, и CTA — рендери CTA как обычную кнопку в потоке страницы.
 */

interface MobileBottomBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Обернуть содержимое в стандартный flex с gap */
  asFlex?: boolean
  /** Добавляет тонкую тень сверху для отделения от контента */
  elevated?: boolean
}

export function MobileBottomBar({
  className,
  asFlex = true,
  elevated = true,
  children,
  ...props
}: MobileBottomBarProps) {
  return (
    <div
      className={cn(
        "md:hidden fixed inset-x-0 bottom-0 z-30",
        "bg-background/95 supports-[backdrop-filter]:bg-background/85 backdrop-blur-md",
        "border-t border-border",
        elevated && "shadow-[0_-8px_24px_-12px_rgb(180_70_35_/_0.12)]",
        "px-4 pt-3 pb-safe",
        className,
      )}
      {...props}
    >
      {asFlex ? (
        <div className="flex items-center gap-3 [&>*]:flex-1">{children}</div>
      ) : (
        children
      )}
    </div>
  )
}

/**
 * MobileBottomBarSpacer — пустой блок, который надо добавить в конец
 * скроллируемого контента, чтобы MobileBottomBar не перекрывал последние элементы.
 */
export function MobileBottomBarSpacer({
  className,
}: {
  className?: string
}) {
  return <div aria-hidden className={cn("md:hidden h-24", className)} />
}

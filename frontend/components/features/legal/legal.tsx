import * as React from "react"
import { cn } from "@/lib/utils"
import { H1, H3 } from "@/components/ui/typography"

/**
 * Небольшой набор примитивов для юридических документов (оферта, политика,
 * доставка). Единый читаемый стиль без хардкода цветов — только токены.
 */

interface DocHeaderProps {
  title: string
  /** Дата последнего обновления, напр. «6 июля 2026 г.» */
  updated?: string
  /** Короткое вступление под заголовком */
  intro?: React.ReactNode
}

export function DocHeader({ title, updated, intro }: DocHeaderProps) {
  return (
    <header className="mb-8 border-b border-border pb-6">
      <H1 className="text-3xl sm:text-4xl">{title}</H1>
      {updated && (
        <p className="mt-3 text-sm text-muted-foreground">
          Редакция от {updated}
        </p>
      )}
      {intro && (
        <div className="mt-4 text-base leading-relaxed text-muted-foreground">
          {intro}
        </div>
      )}
    </header>
  )
}

interface SectionProps {
  /** Номер раздела (для оферты/политики) */
  n?: number
  title: string
  children: React.ReactNode
}

export function DocSection({ n, title, children }: SectionProps) {
  return (
    <section className="mb-8">
      <H3 className="mb-3 text-xl sm:text-2xl">
        {n != null && <span className="text-primary">{n}. </span>}
        {title}
      </H3>
      <div className="space-y-3 text-[15px] leading-relaxed text-foreground/90">
        {children}
      </div>
    </section>
  )
}

export function DocP({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("leading-relaxed", className)} {...props} />
}

export function DocList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="ml-1 space-y-2">
      {children}
    </ul>
  )
}

export function DocLi({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" />
      <span className="leading-relaxed">{children}</span>
    </li>
  )
}

/**
 * Плашка-плейсхолдер для фактов, которые должен подтвердить владелец бизнеса
 * (сроки, условия возврата и т.п.). Заметна визуально — легко найти и заменить.
 */
export function DocTodo({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-3 rounded-lg border border-dashed border-warning/50 bg-warning/10 px-4 py-3 text-sm text-foreground/80">
      <span className="font-semibold text-warning">⚠ Уточнить: </span>
      {children}
    </div>
  )
}

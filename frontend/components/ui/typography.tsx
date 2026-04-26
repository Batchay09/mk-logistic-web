import * as React from "react"
import { cn } from "@/lib/utils"

type HeadingProps = React.HTMLAttributes<HTMLHeadingElement>
type TextProps = React.HTMLAttributes<HTMLParagraphElement>

export function H1({ className, ...props }: HeadingProps) {
  return (
    <h1
      className={cn(
        "font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground",
        "leading-[1.05]",
        className,
      )}
      {...props}
    />
  )
}

export function H2({ className, ...props }: HeadingProps) {
  return (
    <h2
      className={cn(
        "font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground",
        "leading-[1.1]",
        className,
      )}
      {...props}
    />
  )
}

export function H3({ className, ...props }: HeadingProps) {
  return (
    <h3
      className={cn(
        "font-heading text-2xl sm:text-3xl font-semibold tracking-tight text-foreground",
        "leading-[1.2]",
        className,
      )}
      {...props}
    />
  )
}

export function H4({ className, ...props }: HeadingProps) {
  return (
    <h4
      className={cn(
        "font-heading text-xl sm:text-2xl font-semibold tracking-tight text-foreground",
        "leading-[1.25]",
        className,
      )}
      {...props}
    />
  )
}

export function Eyebrow({ className, ...props }: TextProps) {
  return (
    <p
      className={cn(
        "text-xs sm:text-sm font-semibold uppercase tracking-[0.12em] text-primary",
        className,
      )}
      {...props}
    />
  )
}

export function Lead({ className, ...props }: TextProps) {
  return (
    <p
      className={cn(
        "text-lg sm:text-xl text-muted-foreground leading-relaxed",
        className,
      )}
      {...props}
    />
  )
}

export function Body({ className, ...props }: TextProps) {
  return (
    <p
      className={cn("text-base text-foreground leading-relaxed", className)}
      {...props}
    />
  )
}

export function Muted({ className, ...props }: TextProps) {
  return (
    <p
      className={cn("text-sm text-muted-foreground leading-relaxed", className)}
      {...props}
    />
  )
}

export function Caption({ className, ...props }: TextProps) {
  return (
    <p
      className={cn(
        "text-xs text-muted-foreground uppercase tracking-wider",
        className,
      )}
      {...props}
    />
  )
}

interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode
}

export function Kbd({ className, children, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-border bg-muted px-1.5 py-0.5",
        "font-mono text-xs text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
  )
}

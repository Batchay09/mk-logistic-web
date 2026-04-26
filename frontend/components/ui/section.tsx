import * as React from "react"
import { cn } from "@/lib/utils"

type SectionTone = "default" | "muted" | "brand" | "inverted" | "accent"
type SectionSpacing = "none" | "sm" | "default" | "lg" | "xl"

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  tone?: SectionTone
  spacing?: SectionSpacing
  as?: "section" | "div" | "article" | "header" | "footer"
}

const toneMap: Record<SectionTone, string> = {
  default: "bg-background text-foreground",
  muted: "bg-muted text-foreground",
  accent: "bg-accent text-accent-foreground",
  brand: "bg-primary text-primary-foreground",
  inverted: "bg-sidebar text-sidebar-foreground",
}

const spacingMap: Record<SectionSpacing, string> = {
  none: "",
  sm: "py-10 sm:py-14",
  default: "py-16 sm:py-20 lg:py-24",
  lg: "py-20 sm:py-28 lg:py-32",
  xl: "py-24 sm:py-32 lg:py-40",
}

export function Section({
  className,
  tone = "default",
  spacing = "default",
  as: Tag = "section",
  ...props
}: SectionProps) {
  return (
    <Tag
      className={cn(
        "relative w-full",
        toneMap[tone],
        spacingMap[spacing],
        className,
      )}
      {...props}
    />
  )
}

interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "left" | "center"
}

export function SectionHeader({
  className,
  align = "center",
  ...props
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 max-w-3xl",
        align === "center" ? "mx-auto text-center items-center" : "items-start",
        "mb-12 sm:mb-16",
        className,
      )}
      {...props}
    />
  )
}

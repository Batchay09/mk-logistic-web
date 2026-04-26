import * as React from "react"
import { cn } from "@/lib/utils"

type Gap = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
type Align = "start" | "center" | "end" | "stretch" | "baseline"
type Justify = "start" | "center" | "end" | "between" | "around" | "evenly"

const gapMap: Record<Gap, string> = {
  none: "gap-0",
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
  "2xl": "gap-12",
}

const alignMap: Record<Align, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
}

const justifyMap: Record<Justify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
}

interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: Gap
  align?: Align
  justify?: Justify
  as?: React.ElementType
}

/** Вертикальный стек — flex column с консистентным gap */
export function VStack({
  className,
  gap = "md",
  align = "stretch",
  justify = "start",
  as: Tag = "div",
  ...props
}: StackProps) {
  return (
    <Tag
      className={cn(
        "flex flex-col",
        gapMap[gap],
        alignMap[align],
        justifyMap[justify],
        className,
      )}
      {...props}
    />
  )
}

/** Горизонтальный стек — flex row, не переносится */
export function HStack({
  className,
  gap = "md",
  align = "center",
  justify = "start",
  as: Tag = "div",
  ...props
}: StackProps) {
  return (
    <Tag
      className={cn(
        "flex flex-row",
        gapMap[gap],
        alignMap[align],
        justifyMap[justify],
        className,
      )}
      {...props}
    />
  )
}

/** Cluster — горизонтальный стек, который ПЕРЕНОСИТ элементы (для тегов, бейджей) */
export function Cluster({
  className,
  gap = "sm",
  align = "center",
  justify = "start",
  as: Tag = "div",
  ...props
}: StackProps) {
  return (
    <Tag
      className={cn(
        "flex flex-wrap",
        gapMap[gap],
        alignMap[align],
        justifyMap[justify],
        className,
      )}
      {...props}
    />
  )
}

interface SpacerProps {
  /** Высота для VStack-контекста (px-units из tailwind) */
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  /** Если true — растягивается, занимая всё доступное пространство */
  flex?: boolean
}

const spacerSize: Record<NonNullable<SpacerProps["size"]>, string> = {
  xs: "h-2",
  sm: "h-4",
  md: "h-6",
  lg: "h-10",
  xl: "h-16",
}

/** Spacer — пустое пространство в стеке */
export function Spacer({ size = "md", flex = false }: SpacerProps) {
  if (flex) return <div className="flex-1" aria-hidden />
  return <div className={cn(spacerSize[size])} aria-hidden />
}

import * as React from "react"
import { cn } from "@/lib/utils"

type ContainerSize = "narrow" | "default" | "wide" | "full"

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: ContainerSize
  asChild?: boolean
}

const sizeMap: Record<ContainerSize, string> = {
  narrow: "max-w-3xl",       // ~768px — для текста, форм, статей
  default: "max-w-7xl",      // ~1280px — основная ширина приложения
  wide: "max-w-screen-2xl",  // ~1536px — лендинги, дашборды
  full: "max-w-none",        // без ограничения
}

export function Container({
  className,
  size = "default",
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        sizeMap[size],
        className,
      )}
      {...props}
    />
  )
}

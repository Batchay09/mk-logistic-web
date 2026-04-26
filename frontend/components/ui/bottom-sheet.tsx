"use client"

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

/**
 * BottomSheet — мобильно-первый паттерн «шторка снизу».
 * Под капотом — обычный Sheet с side="bottom", но со скруглением сверху,
 * drag-handle, ограничением высоты и safe-area внизу.
 *
 * Используй для: фильтров, выбора слота доставки, корзины на мобилке,
 * подтверждения оплаты.
 */

export const BottomSheet = Sheet
export const BottomSheetTrigger = SheetTrigger
export const BottomSheetClose = SheetClose
export const BottomSheetTitle = SheetTitle
export const BottomSheetDescription = SheetDescription

interface BottomSheetContentProps
  extends React.ComponentProps<typeof SheetContent> {
  /** Показать "ручку" сверху (как у нативных iOS/Android sheets) */
  showHandle?: boolean
}

export function BottomSheetContent({
  className,
  children,
  showHandle = true,
  showCloseButton = true,
  ...props
}: BottomSheetContentProps) {
  return (
    <SheetContent
      side="bottom"
      showCloseButton={showCloseButton}
      className={cn(
        "rounded-t-3xl border-t border-border bg-popover",
        "max-h-[90vh] overflow-y-auto",
        "px-4 pt-2 pb-safe",
        "shadow-2xl",
        className,
      )}
      {...props}
    >
      {showHandle && (
        <div
          aria-hidden
          className="mx-auto mt-1 mb-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30"
        />
      )}
      {children}
    </SheetContent>
  )
}

interface BottomSheetHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function BottomSheetHeader({
  className,
  ...props
}: BottomSheetHeaderProps) {
  return (
    <div
      className={cn("flex flex-col gap-1 px-1 pb-4", className)}
      {...props}
    />
  )
}

interface BottomSheetFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function BottomSheetFooter({
  className,
  ...props
}: BottomSheetFooterProps) {
  return (
    <div
      className={cn(
        "sticky bottom-0 -mx-4 mt-auto px-4 pt-3 pb-3",
        "bg-popover/95 backdrop-blur supports-[backdrop-filter]:bg-popover/80",
        "border-t border-border",
        "flex flex-col gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  )
}

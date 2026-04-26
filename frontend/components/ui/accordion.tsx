"use client"

import * as React from "react"
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

function Accordion({
  className,
  ...props
}: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function AccordionItem({
  className,
  ...props
}: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(
        "group/accordion-item rounded-2xl border border-border bg-card",
        "shadow-sm transition-shadow duration-[var(--duration-base)]",
        "hover:shadow-md data-[panel-open]:shadow-md",
        "overflow-hidden",
        className,
      )}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "flex flex-1 items-center justify-between gap-3 px-5 py-4 text-left",
          "text-base font-semibold text-foreground",
          "tap-target",
          "transition-colors duration-[var(--duration-fast)]",
          "hover:bg-muted/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "[&[data-panel-open]>svg]:rotate-180",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-muted-foreground",
            "transition-transform duration-[var(--duration-base)]",
          )}
          aria-hidden
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionPanel({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-panel"
      className={cn(
        "overflow-hidden text-muted-foreground",
        "data-[ending-style]:h-0 data-[starting-style]:h-0",
        "h-[var(--accordion-panel-height)] transition-[height] duration-[var(--duration-base)] ease-[var(--ease-out-soft)]",
      )}
      {...props}
    >
      <div className={cn("px-5 pb-5 pt-1 text-sm leading-relaxed", className)}>
        {children}
      </div>
    </AccordionPrimitive.Panel>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionPanel }

"use client"

import type { WizardState } from "@/app/orders/new/page"
import { Store } from "lucide-react"
import { cn } from "@/lib/utils"

const MARKETPLACES = [
  { value: "wb", label: "Wildberries" },
  { value: "ozon", label: "Ozon" },
]

export function StepMarketplace({ state, update }: { state: WizardState; update: (p: Partial<WizardState>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {MARKETPLACES.map(({ value, label }) => {
        const active = state.marketplace === value
        return (
          <button
            key={value}
            onClick={() => update({ marketplace: value, destination_id: null, destination_name: "" })}
            className={cn(
              "flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 font-medium text-lg transition-all duration-[var(--duration-base)]",
              active
                ? "border-primary bg-muted text-primary shadow-md scale-[1.03]"
                : "border-border text-foreground hover:border-primary/50 hover:bg-muted"
            )}
          >
            <span
              className={cn(
                "grid size-14 place-items-center rounded-2xl transition-all duration-[var(--duration-base)]",
                active
                  ? "bg-gradient-to-br from-primary to-[var(--brand-dark)] text-white shadow-brand"
                  : "bg-primary/10 text-primary"
              )}
            >
              <Store className="size-6" aria-hidden />
            </span>
            {label}
          </button>
        )
      })}
    </div>
  )
}

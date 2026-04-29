"use client"

import type { WizardState } from "@/app/orders/new/page"
import { cn } from "@/lib/utils"

const MARKETPLACES = [
  { value: "wb", label: "Wildberries", color: "bg-purple-600", emoji: "🟣" },
  { value: "ozon", label: "Ozon", color: "bg-blue-600", emoji: "🔵" },
]

export function StepMarketplace({ state, update }: { state: WizardState; update: (p: Partial<WizardState>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {MARKETPLACES.map(({ value, label, color, emoji }) => (
        <button
          key={value}
          onClick={() => update({ marketplace: value, destination_id: null, destination_name: "" })}
          className={cn(
            "flex flex-col items-center justify-center gap-3 py-8 rounded-xl border-2 transition-all font-medium text-lg",
            state.marketplace === value
              ? "border-primary bg-muted text-primary shadow-md scale-105"
              : "border-border text-foreground hover:border-primary hover:bg-muted"
          )}
        >
          <span className="text-4xl">{emoji}</span>
          {label}
        </button>
      ))}
    </div>
  )
}

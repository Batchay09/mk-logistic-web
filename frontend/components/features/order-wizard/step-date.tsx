"use client"

import { useQuery } from "@tanstack/react-query"
import type { WizardState } from "@/app/orders/new/page"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { CalendarDays, Loader2, ArrowRight } from "lucide-react"

interface DateOption {
  ship_date: string
  arrival_date: string
  label: string
}

export function StepDate({ state, update }: { state: WizardState; update: (p: Partial<WizardState>) => void }) {
  const { data: dates = [], isLoading } = useQuery<DateOption[]>({
    queryKey: ["dates", state.destination_id],
    queryFn: () => api.post("/calc/dates", { destination_id: state.destination_id, days_ahead: 7 }),
    enabled: !!state.destination_id,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Загружаем расписание...
      </div>
    )
  }

  if (!dates.length) {
    return <p className="text-center text-muted-foreground py-8">Нет доступных дат для этого направления</p>
  }

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {dates.map((d) => (
        <button
          key={d.ship_date}
          onClick={() => update({ ship_date: d.ship_date, arrival_date: d.arrival_date })}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border-2 text-left transition-all",
            state.ship_date === d.ship_date
              ? "border-primary bg-muted"
              : "border-border hover:border-primary hover:bg-muted"
          )}
        >
          <CalendarDays className={cn("h-5 w-5 shrink-0", state.ship_date === d.ship_date ? "text-primary" : "text-muted-foreground")} />
          <span className={cn("text-sm font-medium", state.ship_date === d.ship_date ? "text-primary" : "text-foreground")}>
            {d.label}
          </span>
        </button>
      ))}
    </div>
  )
}

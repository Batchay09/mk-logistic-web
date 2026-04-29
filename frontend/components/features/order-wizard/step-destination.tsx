"use client"

import { useQuery } from "@tanstack/react-query"
import type { WizardState } from "@/app/orders/new/page"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { MapPin, Loader2 } from "lucide-react"

interface Destination {
  id: number
  name: string
  marketplace: string
  is_active: boolean
}

export function StepDestination({ state, update }: { state: WizardState; update: (p: Partial<WizardState>) => void }) {
  const { data: destinations = [], isLoading } = useQuery<Destination[]>({
    queryKey: ["destinations", state.marketplace],
    queryFn: () => api.get(`/client/destinations?marketplace=${state.marketplace}`),
    enabled: !!state.marketplace,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Загружаем направления...
      </div>
    )
  }

  if (!destinations.length) {
    return <p className="text-center text-muted-foreground py-8">Нет доступных направлений</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
      {destinations.map((dest) => (
        <button
          key={dest.id}
          onClick={() => update({ destination_id: dest.id, destination_name: dest.name, ship_date: "", arrival_date: "" })}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left transition-all",
            state.destination_id === dest.id
              ? "border-primary bg-muted text-primary font-medium"
              : "border-border text-foreground hover:border-primary hover:bg-muted"
          )}
        >
          <MapPin className={cn("h-4 w-4 shrink-0", state.destination_id === dest.id ? "text-primary" : "text-muted-foreground")} />
          <span className="text-sm">{dest.name}</span>
        </button>
      ))}
    </div>
  )
}

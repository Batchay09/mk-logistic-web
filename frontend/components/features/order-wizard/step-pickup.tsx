"use client"

import type { WizardState } from "@/app/orders/new/page"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Truck, Package } from "lucide-react"

const CITIES = [
  "Учкекен", "Джага", "Красный Курган", "Первомайское",
  "Терезе", "Римгорское", "Черкесск", "Пятигорск",
]

export function StepPickup({ state, update }: { state: WizardState; update: (p: Partial<WizardState>) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => update({ service_pickup: false })}
          className={cn(
            "flex flex-col items-center gap-2 py-5 rounded-xl border-2 transition-all",
            !state.service_pickup
              ? "border-primary bg-muted text-primary"
              : "border-border text-foreground hover:border-primary"
          )}
        >
          <Package className="h-7 w-7" />
          <span className="text-sm font-medium">Привезу сам</span>
        </button>
        <button
          onClick={() => update({ service_pickup: true })}
          className={cn(
            "flex flex-col items-center gap-2 py-5 rounded-xl border-2 transition-all",
            state.service_pickup
              ? "border-primary bg-muted text-primary"
              : "border-border text-foreground hover:border-primary"
          )}
        >
          <Truck className="h-7 w-7" />
          <span className="text-sm font-medium">Нужен забор</span>
          <span className="text-xs text-muted-foreground">+500 ₽</span>
        </button>
      </div>

      {state.service_pickup && (
        <div className="space-y-3 border border-border rounded-lg p-4 bg-muted">
          <div>
            <Label className="text-sm text-foreground">Город</Label>
            <Select value={state.pickup_city} onValueChange={(v) => v && update({ pickup_city: v })}>
              <SelectTrigger className="mt-1 border-border bg-background">
                <SelectValue placeholder="Выберите город" />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm text-foreground">Улица</Label>
            <Input
              className="mt-1 border-border bg-background text-foreground"
              placeholder="ул. Ленина"
              value={state.pickup_street}
              onChange={(e) => update({ pickup_street: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-sm text-foreground">Дом / Офис</Label>
            <Input
              className="mt-1 border-border bg-background text-foreground"
              placeholder="12А"
              value={state.pickup_house}
              onChange={(e) => update({ pickup_house: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-sm text-foreground">Комментарий (необязательно)</Label>
            <Input
              className="mt-1 border-border bg-background text-foreground"
              placeholder="Въезд со двора, склад №2"
              value={state.pickup_comment}
              onChange={(e) => update({ pickup_comment: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  )
}

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
              ? "border-[#D4512B] bg-[#FBF0EA] text-[#D4512B]"
              : "border-[#EAC9B0] hover:border-[#D4512B]"
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
              ? "border-[#D4512B] bg-[#FBF0EA] text-[#D4512B]"
              : "border-[#EAC9B0] hover:border-[#D4512B]"
          )}
        >
          <Truck className="h-7 w-7" />
          <span className="text-sm font-medium">Нужен забор</span>
          <span className="text-xs text-muted-foreground">+500 ₽</span>
        </button>
      </div>

      {state.service_pickup && (
        <div className="space-y-3 border border-[#EAC9B0] rounded-lg p-4 bg-[#FBF0EA]">
          <div>
            <Label className="text-sm">Город</Label>
            <Select value={state.pickup_city} onValueChange={(v) => update({ pickup_city: v })}>
              <SelectTrigger className="mt-1 border-[#EAC9B0]">
                <SelectValue placeholder="Выберите город" />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Улица</Label>
            <Input
              className="mt-1 border-[#EAC9B0]"
              placeholder="ул. Ленина"
              value={state.pickup_street}
              onChange={(e) => update({ pickup_street: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-sm">Дом / Офис</Label>
            <Input
              className="mt-1 border-[#EAC9B0]"
              placeholder="12А"
              value={state.pickup_house}
              onChange={(e) => update({ pickup_house: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-sm">Комментарий (необязательно)</Label>
            <Input
              className="mt-1 border-[#EAC9B0]"
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

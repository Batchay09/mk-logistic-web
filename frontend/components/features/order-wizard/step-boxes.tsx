"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { WizardState } from "@/app/orders/new/page"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Minus, Plus, AlertTriangle } from "lucide-react"

interface PriceResult {
  price_delivery: number
  price_pickup: number
  price_palletizing: number
  total_amount: number
  unit_price: number
  pallets_count: number
  is_pallet_mode: boolean
}

export function StepBoxes({ state, update }: { state: WizardState; update: (p: Partial<WizardState>) => void }) {
  const [inputVal, setInputVal] = useState(String(state.boxes_count))

  const { data: pricing, isLoading } = useQuery<PriceResult>({
    queryKey: ["price", state.destination_id, state.boxes_count, state.service_palletizing],
    queryFn: () => api.post("/calc/price", {
      destination_id: state.destination_id,
      boxes: state.boxes_count,
      service_pickup: false,
      service_palletizing: state.service_palletizing,
    }),
    enabled: !!state.destination_id && state.boxes_count >= 1,
  })

  useEffect(() => {
    if (pricing) {
      update({
        price_delivery: pricing.price_delivery,
        price_pickup: pricing.price_pickup,
        price_palletizing: pricing.price_palletizing,
        total_amount: pricing.total_amount,
        unit_price: pricing.unit_price,
        pallets_count: pricing.pallets_count,
        is_pallet_mode: pricing.is_pallet_mode,
      })
    }
  }, [pricing])

  function setBoxes(n: number) {
    const val = Math.max(1, n)
    setInputVal(String(val))
    update({ boxes_count: val })
  }

  function handleInput(v: string) {
    setInputVal(v)
    const n = parseInt(v)
    if (!isNaN(n) && n >= 1) update({ boxes_count: n })
  }

  return (
    <div className="space-y-5">
      {/* Counter */}
      <div className="flex items-center gap-4 justify-center">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setBoxes(state.boxes_count - 1)}
          disabled={state.boxes_count <= 1}
          className="h-12 w-12 rounded-full border-[#EAC9B0] text-[#D4512B]"
        >
          <Minus className="h-5 w-5" />
        </Button>
        <div className="w-28">
          <Input
            type="number"
            min={1}
            value={inputVal}
            onChange={(e) => handleInput(e.target.value)}
            className="text-center text-2xl font-bold h-14 border-[#EAC9B0] focus-visible:ring-[#D4512B]"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setBoxes(state.boxes_count + 1)}
          className="h-12 w-12 rounded-full border-[#EAC9B0] text-[#D4512B]"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
      <p className="text-center text-sm text-muted-foreground">коробок</p>

      {/* Pallet mode warning */}
      {state.is_pallet_mode && (
        <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-orange-800">Паллетный режим</span>
            <span className="text-orange-700"> — {state.pallets_count} паллет(а) по 11 коробок</span>
          </div>
        </div>
      )}

      {/* Palletizing service */}
      {state.is_pallet_mode && (
        <div className="flex items-center justify-between p-3 bg-[#FBF0EA] rounded-lg border border-[#EAC9B0]">
          <Label className="cursor-pointer text-sm">
            Паллетизация (+{(state.pallets_count * 500).toLocaleString("ru-RU")} ₽)
          </Label>
          <Switch
            checked={state.service_palletizing}
            onCheckedChange={(v) => update({ service_palletizing: v })}
            className="data-[state=checked]:bg-[#D4512B]"
          />
        </div>
      )}

      {/* Price breakdown */}
      {pricing && (
        <div className="space-y-2 border border-[#EAC9B0] rounded-lg p-4 bg-[#FBF0EA]">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Доставка ({state.boxes_count} × {pricing.unit_price.toLocaleString("ru-RU")} ₽)
            </span>
            <span className="font-medium">{pricing.price_delivery.toLocaleString("ru-RU")} ₽</span>
          </div>
          {pricing.price_palletizing > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Паллетизация</span>
              <span className="font-medium">{pricing.price_palletizing.toLocaleString("ru-RU")} ₽</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold border-t border-[#EAC9B0] pt-2 mt-1">
            <span>Итого доставка</span>
            <span className="text-[#D4512B]">{pricing.total_amount.toLocaleString("ru-RU")} ₽</span>
          </div>
          <p className="text-xs text-muted-foreground">* Услуга забора рассчитается на следующем шаге</p>
        </div>
      )}
      {isLoading && <div className="text-center text-sm text-muted-foreground">Считаем стоимость...</div>}
    </div>
  )
}

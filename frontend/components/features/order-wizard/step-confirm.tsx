"use client"

import type { WizardState } from "@/app/orders/new/page"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

const MP_LABELS: Record<string, string> = { wb: "Wildberries", ozon: "Ozon" }

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[55%]">{value}</span>
    </div>
  )
}

export function StepConfirm({ state, update }: { state: WizardState; update: (p: Partial<WizardState>) => void }) {
  const pickup = state.service_pickup
    ? `${state.pickup_city}, ${state.pickup_street}, ${state.pickup_house}`
    : "Самопривоз"

  const total = state.price_delivery + state.price_pickup + (state.service_palletizing ? state.price_palletizing : 0)

  return (
    <div className="space-y-4">
      <div className="space-y-0.5 border border-[#EAC9B0] rounded-lg divide-y divide-[#EAC9B0]">
        <div className="px-4 py-1">
          <Row label="Маркетплейс" value={MP_LABELS[state.marketplace] || state.marketplace} />
        </div>
        <div className="px-4 py-1">
          <Row label="Направление" value={state.destination_name} />
        </div>
        <div className="px-4 py-1">
          <Row label="Дата сдачи" value={state.ship_date ? new Date(state.ship_date).toLocaleDateString("ru-RU") : "—"} />
          <Row label="Дата прибытия" value={state.arrival_date ? new Date(state.arrival_date).toLocaleDateString("ru-RU") : "—"} />
        </div>
        <div className="px-4 py-1">
          <Row label="Коробок" value={`${state.boxes_count} шт.`} />
          {state.is_pallet_mode && <Row label="Паллет" value={`${state.pallets_count} шт.`} />}
        </div>
        <div className="px-4 py-1">
          <Row label="Забор груза" value={pickup} />
        </div>
      </div>

      {/* Company name */}
      <div>
        <Label className="text-sm">Компания для стикера</Label>
        <Input
          className="mt-1 border-[#EAC9B0]"
          placeholder="Ваша компания или ИП (необязательно)"
          value={state.company_name}
          onChange={(e) => update({ company_name: e.target.value })}
        />
      </div>

      <Separator className="bg-[#EAC9B0]" />

      {/* Price */}
      <div className="space-y-1 bg-[#FBF0EA] rounded-lg p-4 border border-[#EAC9B0]">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Доставка</span>
          <span>{state.price_delivery.toLocaleString("ru-RU")} ₽</span>
        </div>
        {state.service_pickup && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Забор груза</span>
            <span>500 ₽</span>
          </div>
        )}
        {state.service_palletizing && state.price_palletizing > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Паллетизация</span>
            <span>{state.price_palletizing.toLocaleString("ru-RU")} ₽</span>
          </div>
        )}
        <Separator className="bg-[#EAC9B0] my-2" />
        <div className="flex justify-between font-bold text-base">
          <span>ИТОГО</span>
          <span className="text-[#D4512B]">{total.toLocaleString("ru-RU")} ₽</span>
        </div>
      </div>
    </div>
  )
}

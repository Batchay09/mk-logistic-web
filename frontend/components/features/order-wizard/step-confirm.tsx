"use client"

import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import type { WizardState } from "@/app/orders/new/page"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { api } from "@/lib/api"

const MP_LABELS: Record<string, string> = { wb: "Wildberries", ozon: "Ozon" }

interface Company { id: number; company_name: string }
interface Me { id: number; company_name: string | null }

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right max-w-[55%]">{value}</span>
    </div>
  )
}

export function StepConfirm({ state, update }: { state: WizardState; update: (p: Partial<WizardState>) => void }) {
  const { data: companies } = useQuery<Company[]>({
    queryKey: ["companies"],
    queryFn: () => api.get("/client/companies"),
  })
  const { data: me } = useQuery<Me>({
    queryKey: ["me"],
    queryFn: () => api.get("/auth/me"),
  })

  // Auto-fill company on first render: prefer first saved CompanyProfile, fallback to user.company_name
  useEffect(() => {
    if (state.company_name) return
    const first = companies?.[0]?.company_name
    const fallback = me?.company_name ?? ""
    const value = first || fallback
    if (value) update({ company_name: value })
  }, [companies, me, state.company_name, update])

  const pickup = state.service_pickup
    ? `${state.pickup_city}, ${state.pickup_street}, ${state.pickup_house}`
    : "Самопривоз"

  const total = state.price_delivery + state.price_pickup + (state.service_palletizing ? state.price_palletizing : 0)
  const hasCompanies = (companies?.length ?? 0) > 0

  return (
    <div className="space-y-4">
      <div className="space-y-0.5 border border-border rounded-lg divide-y divide-border">
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

      <div>
        <Label className="text-sm text-foreground">Компания для стикера</Label>
        {hasCompanies && (
          <select
            className="mt-1 w-full h-9 rounded-md border border-border bg-background text-foreground px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={companies?.find((c) => c.company_name === state.company_name) ? state.company_name : ""}
            onChange={(e) => update({ company_name: e.target.value })}
          >
            <option value="">— Ввести вручную —</option>
            {companies?.map((c) => (
              <option key={c.id} value={c.company_name}>{c.company_name}</option>
            ))}
          </select>
        )}
        <Input
          className="mt-2 border-border bg-background text-foreground"
          placeholder="Ваша компания или ИП (необязательно)"
          value={state.company_name}
          onChange={(e) => update({ company_name: e.target.value })}
        />
      </div>

      <Separator className="bg-border" />

      <div className="space-y-1 bg-muted rounded-lg p-4 border border-border">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Доставка</span>
          <span className="text-foreground">{state.price_delivery.toLocaleString("ru-RU")} ₽</span>
        </div>
        {state.service_pickup && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Забор груза</span>
            <span className="text-foreground">500 ₽</span>
          </div>
        )}
        {state.service_palletizing && state.price_palletizing > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Паллетизация</span>
            <span className="text-foreground">{state.price_palletizing.toLocaleString("ru-RU")} ₽</span>
          </div>
        )}
        <Separator className="bg-border my-2" />
        <div className="flex justify-between font-bold text-base">
          <span className="text-foreground">ИТОГО</span>
          <span className="text-primary">{total.toLocaleString("ru-RU")} ₽</span>
        </div>
      </div>
    </div>
  )
}

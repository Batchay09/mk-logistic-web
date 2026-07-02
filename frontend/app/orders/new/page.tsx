"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Check } from "lucide-react"
import { StepMarketplace } from "@/components/features/order-wizard/step-marketplace"
import { StepDestination } from "@/components/features/order-wizard/step-destination"
import { StepDate } from "@/components/features/order-wizard/step-date"
import { StepBoxes } from "@/components/features/order-wizard/step-boxes"
import { StepPickup } from "@/components/features/order-wizard/step-pickup"
import { StepConfirm } from "@/components/features/order-wizard/step-confirm"
import { api } from "@/lib/api"

export interface WizardState {
  marketplace: string
  destination_id: number | null
  destination_name: string
  ship_date: string
  arrival_date: string
  boxes_count: number
  service_pickup: boolean
  service_palletizing: boolean
  pickup_city: string
  pickup_street: string
  pickup_house: string
  pickup_comment: string
  company_name: string
  // calc results
  price_delivery: number
  price_pickup: number
  price_palletizing: number
  total_amount: number
  unit_price: number
  pallets_count: number
  is_pallet_mode: boolean
}

const EMPTY: WizardState = {
  marketplace: "",
  destination_id: null,
  destination_name: "",
  ship_date: "",
  arrival_date: "",
  boxes_count: 1,
  service_pickup: false,
  service_palletizing: false,
  pickup_city: "",
  pickup_street: "",
  pickup_house: "",
  pickup_comment: "",
  company_name: "",
  price_delivery: 0,
  price_pickup: 0,
  price_palletizing: 0,
  total_amount: 0,
  unit_price: 0,
  pallets_count: 0,
  is_pallet_mode: false,
}

const STEPS = ["Маркетплейс", "Направление", "Дата", "Коробки", "Забор", "Подтверждение"]

export default function NewOrderPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [step, setStep] = useState(0)
  const [state, setState] = useState<WizardState>(EMPTY)
  const [submitting, setSubmitting] = useState(false)

  function update(patch: Partial<WizardState>) {
    setState((s) => ({ ...s, ...patch }))
  }

  function canNext(): boolean {
    if (step === 0) return !!state.marketplace
    if (step === 1) return !!state.destination_id
    if (step === 2) return !!state.ship_date
    if (step === 3) return state.boxes_count >= 1 && state.total_amount > 0
    if (step === 4) {
      if (!state.service_pickup) return true
      return !!state.pickup_city && !!state.pickup_street && !!state.pickup_house
    }
    return true
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await api.post("/client/orders", {
        marketplace: state.marketplace,
        destination_id: state.destination_id,
        ship_date: state.ship_date,
        arrival_date: state.arrival_date,
        boxes_count: state.boxes_count,
        service_pickup: state.service_pickup,
        service_palletizing: state.service_palletizing,
        company_name: state.company_name || undefined,
        pickup_address: state.service_pickup
          ? { city: state.pickup_city, street: state.pickup_street, house: state.pickup_house, comment: state.pickup_comment || undefined }
          : undefined,
      })
      // Инвалидируем кэш корзины и заказов, чтобы /cart и /dashboard
      // подтянули свежие данные при заходе.
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["cart"] }),
        qc.invalidateQueries({ queryKey: ["orders"] }),
      ])
      toast.success("Заказ добавлен в корзину!")
      router.push("/cart")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка создания заказа")
    } finally {
      setSubmitting(false)
    }
  }

  const stepComponents = [
    <StepMarketplace key={0} state={state} update={update} />,
    <StepDestination key={1} state={state} update={update} />,
    <StepDate key={2} state={state} update={update} />,
    <StepBoxes key={3} state={state} update={update} />,
    <StepPickup key={4} state={state} update={update} />,
    <StepConfirm key={5} state={state} update={update} />,
  ]

  return (
    <LayoutWithSidebar role="client">
      <div className="relative max-w-2xl mx-auto space-y-6">
        {/* Aurora-подсветка за мастером */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 h-64 w-[34rem] max-w-full rounded-full opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, oklch(from var(--primary) l c h / 0.12) 0%, transparent 70%)",
          }}
        />

        <div className="relative">
          <h1 className="text-2xl font-bold text-foreground">Новый заказ</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Шаг {step + 1} из {STEPS.length} — {STEPS[step]}
          </p>
        </div>

        {/* Progress */}
        <div className="relative flex items-center gap-1">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-[var(--duration-base)] ${
                  i < step
                    ? "bg-gradient-to-br from-primary to-[var(--brand-dark)] text-white shadow-[0_6px_14px_-6px_rgb(212_81_43_/_0.7)]"
                    : i === step
                    ? "bg-gradient-to-br from-primary to-[var(--brand-dark)] text-white ring-2 ring-primary/40 ring-offset-2 ring-offset-background shadow-[0_8px_18px_-6px_rgb(212_81_43_/_0.8)] scale-110"
                    : "bg-muted text-muted-foreground ring-1 ring-border"
                }`}>
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-[11px] hidden sm:block transition-colors ${
                  i === step ? "text-primary font-semibold" : i < step ? "text-foreground/70" : "text-muted-foreground"
                }`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="h-0.5 flex-1 mx-1 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full bg-gradient-to-r from-primary to-[var(--brand-dark)] transition-all duration-500 ${i < step ? "w-full" : "w-0"}`} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <Card className="relative border-primary/15 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2.5 text-foreground">
              <span className="grid place-items-center min-w-8 h-8 px-2 rounded-lg bg-gradient-to-br from-primary to-[var(--brand-dark)] text-white text-xs font-bold shadow-brand">
                {step + 1}/{STEPS.length}
              </span>
              {STEPS[step]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stepComponents[step]}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="relative flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="rounded-full"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Назад
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
              className="btn-shine rounded-full px-6"
            >
              Далее <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-shine rounded-full px-6"
            >
              {submitting ? "Добавляем..." : "Добавить в корзину"}
            </Button>
          )}
        </div>
      </div>
    </LayoutWithSidebar>
  )
}

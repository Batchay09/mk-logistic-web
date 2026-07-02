"use client"

import { useRef } from "react"
import { toast } from "sonner"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FileDown, Upload, FileSpreadsheet } from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"

async function downloadFile(url: string, filename: string) {
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) { toast.error("Ошибка загрузки файла"); return }
  const blob = await res.blob()
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

async function uploadFile(url: string, file: File): Promise<string> {
  const fd = new FormData()
  fd.append("file", file)
  const res = await fetch(url, { method: "POST", credentials: "include", body: fd })
  const json = await res.json()
  if (!res.ok) throw new Error(json.detail || "Ошибка загрузки")
  return json.message || "Готово"
}

export default function ManagerReportsPage() {
  const ordersRef = useRef<HTMLInputElement>(null)
  const pricesRef = useRef<HTMLInputElement>(null)
  const scheduleRef = useRef<HTMLInputElement>(null)

  async function handleUpload(ref: React.RefObject<HTMLInputElement | null>, url: string) {
    const file = ref.current?.files?.[0]
    if (!file) return
    try {
      const msg = await uploadFile(`${API}${url}`, file)
      toast.success(msg)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка")
    } finally {
      if (ref.current) ref.current.value = ""
    }
  }

  return (
    <LayoutWithSidebar role="manager">
      <div className="space-y-6 max-w-2xl">
        {/* Header + одно мягкое аврора-свечение */}
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-12 left-0 h-56 w-[32rem] max-w-full rounded-full opacity-50 blur-3xl"
            style={{ background: "radial-gradient(circle, oklch(from var(--primary) l c h / 0.10) 0%, transparent 70%)" }}
          />
          <h1 className="relative text-2xl font-bold">Отчёты и импорт</h1>
        </div>

        <Card className="border-border transition-all duration-[var(--duration-base)] hover:border-primary/30 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2.5">
              <span className="grid place-items-center size-9 rounded-lg bg-primary/15 text-primary">
                <FileSpreadsheet className="h-5 w-5" aria-hidden />
              </span>
              Экспорт заказов
            </CardTitle>
            <CardDescription>Все заказы кроме черновиков в формате Excel</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => downloadFile(`${API}/manager/orders/export.xlsx`, "orders.xlsx")}
              className="btn-shine rounded-full">
              <FileDown className="h-4 w-4 mr-2" /> Скачать Excel
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border transition-all duration-[var(--duration-base)] hover:border-primary/30 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2.5">
              <span className="grid place-items-center size-9 rounded-lg bg-primary/15 text-primary">
                <Upload className="h-5 w-5" aria-hidden />
              </span>
              Импорт статусов
            </CardTitle>
            <CardDescription>Excel с колонками: ID, Status (опц.), ShipDate (опц.)</CardDescription>
          </CardHeader>
          <CardContent>
            <input ref={ordersRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={() => handleUpload(ordersRef, "/manager/orders/import")} />
            <Button variant="outline" className="rounded-full text-primary"
              onClick={() => ordersRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Загрузить файл
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border transition-all duration-[var(--duration-base)] hover:border-primary/30 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2.5">
              <span className="grid place-items-center size-9 rounded-lg bg-primary/15 text-primary">
                <FileSpreadsheet className="h-5 w-5" aria-hidden />
              </span>
              Импорт тарифов
            </CardTitle>
            <CardDescription>Marketplace, Destination, Price_1_10, Price_11_plus</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button variant="outline" className="rounded-full"
              onClick={() => downloadFile(`${API}/manager/prices/template.xlsx`, "prices_template.xlsx")}>
              <FileDown className="h-4 w-4 mr-2" /> Шаблон
            </Button>
            <input ref={pricesRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={() => handleUpload(pricesRef, "/manager/prices/import")} />
            <Button className="btn-shine rounded-full" onClick={() => pricesRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Загрузить
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border transition-all duration-[var(--duration-base)] hover:border-primary/30 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2.5">
              <span className="grid place-items-center size-9 rounded-lg bg-primary/15 text-primary">
                <FileSpreadsheet className="h-5 w-5" aria-hidden />
              </span>
              Импорт расписания
            </CardTitle>
            <CardDescription>Marketplace, Destination, WeekdayFrom, WeekdayTo, WeekOffset</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button variant="outline" className="rounded-full"
              onClick={() => downloadFile(`${API}/manager/schedule/template.xlsx`, "schedule_template.xlsx")}>
              <FileDown className="h-4 w-4 mr-2" /> Шаблон
            </Button>
            <input ref={scheduleRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={() => handleUpload(scheduleRef, "/manager/schedule/import")} />
            <Button className="btn-shine rounded-full" onClick={() => scheduleRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Загрузить
            </Button>
          </CardContent>
        </Card>
      </div>
    </LayoutWithSidebar>
  )
}

"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { CreditCard, Search, BarChart3, ArrowRight } from "lucide-react"

export default function ManagerDashboard() {
  const { data: awaiting = [] } = useQuery<unknown[]>({
    queryKey: ["manager-payments"],
    queryFn: () => api.get("/manager/payments/awaiting"),
  })

  return (
    <LayoutWithSidebar role="manager">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Панель менеджера</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/manager/payments">
            <Card className={`border-2 hover:shadow-md transition-all cursor-pointer ${awaiting.length > 0 ? "border-orange-400 bg-orange-50" : "border-[#EAC9B0]"}`}>
              <CardContent className="pt-5 flex items-center gap-4">
                <div className={`rounded-lg p-3 ${awaiting.length > 0 ? "bg-orange-100" : "bg-[#EAC9B0]"}`}>
                  <CreditCard className={`h-5 w-5 ${awaiting.length > 0 ? "text-orange-700" : "text-[#D4512B]"}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{awaiting.length}</p>
                  <p className="text-sm text-muted-foreground">Ожидают оплаты</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/manager/search">
            <Card className="border-[#EAC9B0] hover:border-[#D4512B] transition-all cursor-pointer">
              <CardContent className="pt-5 flex items-center gap-4">
                <div className="bg-[#EAC9B0] rounded-lg p-3">
                  <Search className="h-5 w-5 text-[#D4512B]" />
                </div>
                <div>
                  <p className="font-semibold">Поиск</p>
                  <p className="text-sm text-muted-foreground">По ИП или дате</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/manager/reports">
            <Card className="border-[#EAC9B0] hover:border-[#D4512B] transition-all cursor-pointer">
              <CardContent className="pt-5 flex items-center gap-4">
                <div className="bg-[#EAC9B0] rounded-lg p-3">
                  <BarChart3 className="h-5 w-5 text-[#D4512B]" />
                </div>
                <div>
                  <p className="font-semibold">Отчёты</p>
                  <p className="text-sm text-muted-foreground">Excel импорт/экспорт</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {awaiting.length > 0 && (
          <Card className="border-orange-300 bg-orange-50">
            <CardContent className="pt-5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-orange-800">{awaiting.length} заказ(а) ожидают подтверждения оплаты</p>
                <p className="text-sm text-orange-700">Клиенты ждут подтверждения и стикеров</p>
              </div>
              <Link href="/manager/payments">
                <Button className="bg-[#D4512B] hover:bg-[#B33D1A]">
                  Проверить <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </LayoutWithSidebar>
  )
}

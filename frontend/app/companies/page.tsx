"use client"

import { Building2 } from "lucide-react"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { PlaceholderPage } from "@/components/features/PlaceholderPage"

export default function CompaniesPage() {
  return (
    <LayoutWithSidebar role="client">
      <PlaceholderPage
        icon={Building2}
        title="Мои компании"
        description="Карточки ИП и ООО для оформления заказов"
        hint="При оформлении заказа компания будет привязана автоматически."
      />
    </LayoutWithSidebar>
  )
}

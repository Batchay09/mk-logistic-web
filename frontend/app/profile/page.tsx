"use client"

import { User } from "lucide-react"
import { LayoutWithSidebar } from "@/app/layout-with-sidebar"
import { PlaceholderPage } from "@/components/features/PlaceholderPage"

export default function ProfilePage() {
  return (
    <LayoutWithSidebar role="client">
      <PlaceholderPage
        icon={User}
        title="Профиль"
        description="Имя, контактные данные, пароль и уведомления"
        hint="Чтобы поменять данные сейчас — напишите менеджеру."
      />
    </LayoutWithSidebar>
  )
}

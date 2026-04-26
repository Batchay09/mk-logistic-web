import { AppSidebar, MobileTopbar } from "@/components/layout/app-sidebar"
import { BottomNav } from "@/components/layout/bottom-nav"

type SidebarRole = "client" | "manager" | "admin"

export function LayoutWithSidebar({
  children,
  role = "client",
}: {
  children: React.ReactNode
  role?: SidebarRole
}) {
  return (
    <div className="flex h-screen bg-muted">
      <AppSidebar role={role} />
      <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">
        <MobileTopbar role={role} />
        <main className="flex-1">
          <div className="max-w-5xl mx-auto p-4 md:p-6 pb-24 md:pb-6">
            {children}
          </div>
        </main>
      </div>
      <BottomNav role={role} />
    </div>
  )
}

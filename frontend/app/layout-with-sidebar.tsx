import { AppSidebar } from "@/components/layout/app-sidebar"

type SidebarRole = "client" | "manager" | "admin"

export function LayoutWithSidebar({ children, role }: { children: React.ReactNode; role?: SidebarRole }) {
  return (
    <div className="flex h-screen bg-[#FBF0EA]">
      <AppSidebar role={role} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

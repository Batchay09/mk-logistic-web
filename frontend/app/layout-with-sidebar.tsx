import { AppSidebar, MobileTopbar } from "@/components/layout/app-sidebar"
import { BottomNav } from "@/components/layout/bottom-nav"
import { ChatWidget } from "@/components/features/ChatWidget"

type SidebarRole = "client" | "manager" | "admin"

export function LayoutWithSidebar({
  children,
  role = "client",
}: {
  children: React.ReactNode
  role?: SidebarRole
}) {
  return (
    <div className="flex h-dvh bg-muted">
      <AppSidebar role={role} />
      <div className="relative flex flex-col flex-1 min-w-0 overflow-y-auto">
        {/* Амбиентное брендовое свечение вверху контента */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 h-72 w-[36rem] max-w-full rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, oklch(from var(--primary) l c h / 0.10) 0%, transparent 70%)",
          }}
        />
        <MobileTopbar role={role} />
        <main className="relative flex-1">
          <div
            className={
              "max-w-5xl mx-auto p-4 md:p-6 md:pb-6 " +
              // На mobile нужен большой запас снизу: высота bottom-nav (~70px)
              // + safe-area home-indicator + динамическая browser bar в iOS Safari.
              "pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-6"
            }
          >
            {children}
          </div>
        </main>
      </div>
      <BottomNav role={role} />
      {role === "client" && <ChatWidget />}
    </div>
  )
}

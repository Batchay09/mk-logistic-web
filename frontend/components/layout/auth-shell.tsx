import Image from "next/image"
import { Check } from "lucide-react"

const FEATURES = [
  "Коробки от 1 шт — без минимального объёма",
  "Стикеры с QR-кодом — в один клик",
  "Прозрачный статус каждого заказа",
]

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Brand side — Aurora Glass. Invariant brand surface (всегда оранжевая) */}
      <aside className="relative hidden lg:flex flex-1 items-center justify-center overflow-hidden p-12 text-white bg-gradient-to-br from-[var(--brand)] via-[var(--brand)] to-[var(--brand-dark)]">
        {/* Aurora background */}
        <div className="aurora-wrap" aria-hidden>
          <div
            className="aurora-blob"
            style={{
              width: 440, height: 440, top: "-10%", left: "-8%",
              background: "radial-gradient(circle, #FFB27A 0%, transparent 68%)",
            }}
          />
          <div
            className="aurora-blob"
            style={{
              width: 360, height: 360, bottom: "-14%", right: "-6%",
              background: "radial-gradient(circle, #FF7A45 0%, transparent 66%)",
              animationDelay: "-6s",
            }}
          />
        </div>
        <div className="hero-grid" aria-hidden />
        <div className="hero-noise" aria-hidden />

        <div className="relative max-w-md">
          <Image
            src="/brand/logo-mk-logistik.jpg"
            alt="МК Логистик"
            width={88}
            height={88}
            className="rounded-3xl mb-6 ring-1 ring-white/25 shadow-2xl"
            priority
          />
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            Доставка на Wildberries и&nbsp;Ozon
          </h2>
          <p className="mt-4 text-[15px] text-white/90 leading-relaxed">
            Создайте заказ за минуту. Мы заберём коробки со склада и довезём их до нужного FBO.
          </p>
          <ul className="mt-8 flex flex-col gap-3 text-[13px]">
            {FEATURES.map((t) => (
              <li
                key={t}
                className="glass-brand flex items-center gap-3 rounded-2xl px-4 py-3"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/20">
                  <Check className="size-3.5" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Form side */}
      <main className="relative flex-1 flex items-center justify-center overflow-hidden p-6 bg-background">
        {/* Мягкое брендовое свечение */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-28 -right-24 h-80 w-80 rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, oklch(from var(--primary) l c h / 0.18) 0%, transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, oklch(from var(--secondary) l c h / 0.5) 0%, transparent 70%)",
          }}
        />
        <div className="relative w-full flex justify-center">{children}</div>
      </main>
    </div>
  )
}

export function AuthHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <div className="flex items-center gap-2.5 mb-7">
        <Image
          src="/brand/logo-mk-logistik.jpg"
          alt="МК Логистик"
          width={40}
          height={40}
          className="rounded-xl ring-1 ring-border"
          priority
        />
        <span className="font-bold text-sm tracking-wider text-foreground">МК ЛОГИСТИК</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>
    </>
  )
}

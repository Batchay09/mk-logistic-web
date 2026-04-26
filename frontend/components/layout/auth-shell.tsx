import Image from "next/image"
import { Check } from "lucide-react"

const FEATURES = [
  "Коробки от 1 шт — без минимального объёма",
  "Стикеры с QR-кодом — в один клик",
  "Прозрачный статус каждого заказа",
]

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-muted">
      {/* Brand side — hidden on small screens. Invariant brand surface (всегда оранжевая) */}
      <aside className="hidden lg:flex flex-1 items-center justify-center p-12 text-white bg-gradient-to-br from-[var(--brand)] via-[var(--brand)] to-[var(--brand-dark)]">
        <div className="max-w-md">
          <Image
            src="/brand/logo-mk-logistik.jpg"
            alt="МК Логистик"
            width={88}
            height={88}
            className="rounded-2xl mb-5 ring-1 ring-white/20"
            priority
          />
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            Доставка на Wildberries и&nbsp;Ozon
          </h2>
          <p className="mt-4 text-[15px] text-white/90 leading-relaxed">
            Создайте заказ за минуту. Мы заберём коробки со склада и довезём их до нужного FBO.
          </p>
          <ul className="mt-7 flex flex-col gap-2.5 text-[13px]">
            {FEATURES.map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <span className="w-[18px] h-[18px] rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Form side */}
      <main className="flex-1 flex items-center justify-center p-6 bg-background">
        {children}
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
          className="rounded-md"
          priority
        />
        <span className="font-bold text-sm tracking-wider text-foreground">МК ЛОГИСТИК</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>
    </>
  )
}

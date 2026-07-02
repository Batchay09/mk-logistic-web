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
      {/* Brand side — Clean SaaS: светлая панель с брендовым акцентом */}
      <aside className="hidden lg:flex flex-1 items-center justify-center p-12 bg-muted border-r border-border">
        <div className="max-w-md">
          <Image
            src="/brand/logo-mk-logistik.jpg"
            alt="МК Логистик"
            width={80}
            height={80}
            className="rounded-2xl mb-6 ring-1 ring-border shadow-sm"
            priority
          />
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-foreground text-balance">
            Доставка на Wildberries и&nbsp;Ozon
          </h2>
          <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
            Создайте заказ за минуту. Мы заберём коробки со склада и довезём их до нужного FBO.
          </p>
          <ul className="mt-8 flex flex-col gap-3.5 text-sm text-foreground">
            {FEATURES.map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Check className="size-3.5" />
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

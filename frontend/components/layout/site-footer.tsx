import Image from "next/image"
import Link from "next/link"
import { Container } from "@/components/ui/container"
import { COMPANY } from "@/lib/company"

const LEGAL_LINKS = [
  { href: "/delivery", label: "Доставка и оплата" },
  { href: "/offer", label: "Публичная оферта" },
  { href: "/privacy", label: "Политика конфиденциальности" },
  { href: "/contacts", label: "Контакты и реквизиты" },
] as const

/**
 * Публичный футер сайта. Содержит реквизиты ИП (ИНН/ОГРНИП) и ссылки на
 * юридические документы — размещается на всех публичных страницах, чтобы
 * реквизиты были видны везде (требование эквайринга).
 */
export function SiteFooter() {
  const { brand, tagline, requisites } = COMPANY
  const year = 2026

  return (
    <footer className="mt-auto border-t border-border/60 bg-sidebar text-sidebar-foreground/70">
      <Container size="wide">
        <div className="grid grid-cols-1 gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Бренд */}
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/brand/logo-mk-logistik.jpg"
                alt={brand}
                width={32}
                height={32}
                className="rounded-lg ring-1 ring-border"
              />
              <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
                {brand.toUpperCase()}
              </span>
            </Link>
            <p className="text-xs leading-relaxed">{tagline}</p>
          </div>

          {/* Документы */}
          <nav className="flex flex-col gap-2.5 text-sm" aria-label="Документы">
            <p className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Документы
            </p>
            {LEGAL_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="w-fit transition-colors hover:text-sidebar-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Реквизиты */}
          <div className="flex flex-col gap-1.5 text-xs leading-relaxed lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Реквизиты
            </p>
            <p className="text-sidebar-foreground/85">{requisites.legalName}</p>
            <p>ИНН: {requisites.inn}</p>
            <p>ОГРНИП: {requisites.ogrnip}</p>
            <p>{requisites.address}</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-2 border-t border-border/40 py-5 text-xs sm:flex-row">
          <p>
            © {year} {brand}. {requisites.taxNote}
          </p>
          <div className="flex items-center gap-5">
            <Link
              href="/login"
              className="transition-colors hover:text-sidebar-foreground"
            >
              Войти
            </Link>
            <Link
              href="/register"
              className="transition-colors hover:text-sidebar-foreground"
            >
              Регистрация
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  )
}

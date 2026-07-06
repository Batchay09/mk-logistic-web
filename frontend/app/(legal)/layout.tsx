import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Container } from "@/components/ui/container"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { SiteFooter } from "@/components/layout/site-footer"
import { COMPANY } from "@/lib/company"

/**
 * Общий каркас публичных юридических страниц: /contacts, /delivery, /offer,
 * /privacy. Шапка + читаемая колонка контента + футер с реквизитами.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <Container size="wide">
          <div className="flex h-16 items-center justify-between gap-3">
            <Link
              href="/"
              className="tap-target -ml-1 flex items-center gap-2.5 rounded-full px-1 transition-colors hover:bg-muted/60"
            >
              <Image
                src="/brand/logo-mk-logistik.jpg"
                alt={COMPANY.brand}
                width={36}
                height={36}
                className="rounded-xl shadow-xs ring-1 ring-border"
                priority
              />
              <span className="text-sm font-bold tracking-tight text-foreground sm:text-base">
                {COMPANY.brand.toUpperCase()}
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                href="/"
                className="tap-target inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                <ArrowLeft className="size-4" aria-hidden />
                <span className="hidden sm:inline">На главную</span>
              </Link>
            </div>
          </div>
        </Container>
      </header>

      <main className="flex-1 py-10 sm:py-14">
        <Container size="narrow">{children}</Container>
      </main>

      <SiteFooter />
    </div>
  )
}

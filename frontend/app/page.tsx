import Image from "next/image"
import Link from "next/link"
import {
  Truck,
  Package,
  BarChart3,
  Shield,
  Clock,
  CheckCircle,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Container } from "@/components/ui/container"
import { Section, SectionHeader } from "@/components/ui/section"
import { H2, H3, Eyebrow, Lead, Muted } from "@/components/ui/typography"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Reveal } from "@/components/ui/reveal"
import { AuroraHero } from "@/components/features/AuroraHero"
import { HowItWorks } from "@/components/features/HowItWorks"
import { Trust } from "@/components/features/Trust"
import { Faq } from "@/components/features/Faq"
import { PricingTeaser } from "@/components/features/PricingTeaser"

const features = [
  {
    icon: Package,
    title: "Удобное оформление",
    desc: "Мастер заказа в 6 шагов — маркетплейс, склад, дата, коробки, забор, оплата",
  },
  {
    icon: Clock,
    title: "Расписание доставки",
    desc: "Выбирайте дату из доступных слотов, система автоматически рассчитает дату прибытия",
  },
  {
    icon: BarChart3,
    title: "Контроль заказов",
    desc: "Отслеживайте статус каждого заказа: от оформления до доставки на склад",
  },
  {
    icon: CheckCircle,
    title: "Онлайн-оплата",
    desc: "Оплата через ЮKassa — банковская карта или СБП. Стикеры отправим автоматически",
  },
  {
    icon: Shield,
    title: "PDF стикеры",
    desc: "Стикеры 58×40мм с QR-кодом для каждой коробки — готовы сразу после оплаты",
  },
  {
    icon: Truck,
    title: "Забор груза",
    desc: "Нужен забор? Укажите адрес при оформлении — стоимость считается отдельно",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ====================== HEADER ====================== */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 supports-[backdrop-filter]:bg-background/60 backdrop-blur-xl">
        <Container size="wide">
          <div className="flex items-center justify-between gap-3 h-16">
            <Link
              href="/"
              className="flex items-center gap-2.5 -ml-1 px-1 rounded-full tap-target hover:bg-muted/60 transition-colors"
            >
              <Image
                src="/brand/logo-mk-logistik.jpg"
                alt="МК Логистик"
                width={36}
                height={36}
                className="rounded-xl ring-1 ring-border shadow-xs"
                priority
              />
              <span className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                МК ЛОГИСТИК
              </span>
            </Link>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <ThemeToggle />
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="hidden sm:inline-flex h-10 rounded-full px-4 text-sm tap-target"
                >
                  Войти
                </Button>
              </Link>
              <Link href="/register">
                <Button className="btn-shine h-10 rounded-full px-4 sm:px-5 text-sm font-medium shadow-sm tap-target">
                  <span className="hidden sm:inline">Регистрация</span>
                  <span className="sm:hidden">Войти</span>
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </header>

      {/* ====================== HERO (Aurora Glass) ====================== */}
      <AuroraHero />

      {/* ====================== TRUST ====================== */}
      <Trust />

      {/* ====================== HOW IT WORKS ====================== */}
      <HowItWorks />

      {/* ====================== FEATURES ====================== */}
      <Section tone="muted" spacing="lg" className="relative overflow-hidden">
        {/* Мягкое брендовое свечение позади карточек */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[46rem] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, oklch(from var(--primary) l c h / 0.16) 0%, transparent 70%)",
          }}
        />
        <Container className="relative">
          <Reveal>
            <SectionHeader>
              <Eyebrow>Возможности</Eyebrow>
              <H2>Всё что нужно для доставки</H2>
              <Lead>
                Мы собрали в одном кабинете все инструменты — от расчёта
                стоимости до выдачи QR-стикеров.
              </Lead>
            </SectionHeader>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <Reveal key={title} delay={(i % 3) * 0.08}>
                <Card className="group relative h-full overflow-hidden rounded-2xl border-border/60 bg-card/80 backdrop-blur-sm shadow-sm transition-all duration-[var(--duration-slow)] hover:-translate-y-1 hover:shadow-brand hover:border-primary/30">
                  {/* Верхний glow при наведении */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-0 transition-opacity duration-[var(--duration-slow)] group-hover:opacity-100"
                    style={{
                      background:
                        "radial-gradient(60% 100% at 50% 0%, oklch(from var(--primary) l c h / 0.14) 0%, transparent 100%)",
                    }}
                  />
                  <CardContent className="relative p-6 flex flex-col gap-3">
                    <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[var(--brand-dark)] text-primary-foreground shadow-brand transition-transform duration-[var(--duration-base)] group-hover:scale-105 group-hover:-rotate-3">
                      <Icon className="size-5" aria-hidden />
                    </div>
                    <H3 className="text-lg sm:text-xl font-semibold">{title}</H3>
                    <Muted>{desc}</Muted>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* ====================== PRICING TEASER ====================== */}
      <PricingTeaser />

      {/* ====================== FAQ ====================== */}
      <Faq />

      {/* ====================== CTA ====================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--brand)] via-[var(--brand)] to-[var(--brand-dark)] text-white py-20 sm:py-28">
        {/* Aurora blobs */}
        <div className="aurora-wrap" aria-hidden>
          <div
            className="aurora-blob"
            style={{
              width: 420, height: 420, top: "-20%", left: "10%",
              background: "radial-gradient(circle, #FFB27A 0%, transparent 68%)",
            }}
          />
          <div
            className="aurora-blob"
            style={{
              width: 360, height: 360, bottom: "-24%", right: "12%",
              background: "radial-gradient(circle, #FF7A45 0%, transparent 66%)",
              animationDelay: "-7s",
            }}
          />
        </div>
        <div className="hero-noise" aria-hidden />

        <Container size="narrow" className="relative text-center">
          <Reveal className="flex flex-col items-center gap-4" duration={0.55}>
            <H2 className="!text-white">Начните прямо сейчас</H2>
            <Lead className="!text-white/85">
              Регистрация занимает 1 минуту, без оплаты и обязательств
            </Lead>
            <Link href="/register" className="mt-3 w-full sm:w-auto">
              <Button
                size="lg"
                className="btn-shine h-12 w-full rounded-full bg-white px-10 text-base font-semibold text-[var(--brand)] shadow-glow transition-transform hover:-translate-y-0.5 hover:bg-white sm:w-auto"
              >
                Зарегистрироваться бесплатно
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </Link>
          </Reveal>
        </Container>
      </section>

      {/* ====================== FOOTER ====================== */}
      <footer className="bg-sidebar text-sidebar-foreground/70 mt-auto">
        <Container size="wide">
          <div className="py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
            <p>© 2026 МК Логистик. Доставка на склады Wildberries и Ozon.</p>
            <div className="flex items-center gap-5">
              <Link
                href="/login"
                className="hover:text-sidebar-foreground transition-colors"
              >
                Войти
              </Link>
              <Link
                href="/register"
                className="hover:text-sidebar-foreground transition-colors"
              >
                Регистрация
              </Link>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  )
}

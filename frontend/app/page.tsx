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
import { Badge } from "@/components/ui/badge"
import { Container } from "@/components/ui/container"
import { Section, SectionHeader } from "@/components/ui/section"
import {
  H1,
  H2,
  H3,
  Eyebrow,
  Lead,
  Muted,
} from "@/components/ui/typography"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { HowItWorks } from "@/components/features/HowItWorks"
import { Trust } from "@/components/features/Trust"
import { Faq } from "@/components/features/Faq"

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
    desc: "Нужен забор? Укажите адрес при оформлении — наш водитель приедет в срок",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ====================== HEADER ====================== */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 supports-[backdrop-filter]:bg-background/70 backdrop-blur-md">
        <Container size="wide">
          <div className="flex items-center justify-between gap-3 h-16">
            <Link
              href="/"
              className="flex items-center gap-2.5 -ml-1 px-1 rounded-md tap-target hover:bg-muted/60 transition-colors"
            >
              <Image
                src="/brand/logo-mk-logistik.jpg"
                alt="МК Логистик"
                width={36}
                height={36}
                className="rounded-md ring-1 ring-border shadow-xs"
                priority
              />
              <span className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                МК ЛОГИСТИК
              </span>
            </Link>
            <div className="flex items-center gap-1 sm:gap-2">
              <ThemeToggle />
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="hidden sm:inline-flex h-10 px-4 text-sm tap-target"
                >
                  Войти
                </Button>
              </Link>
              <Link href="/register">
                <Button className="h-10 px-4 sm:px-5 text-sm font-medium shadow-sm tap-target">
                  <span className="hidden sm:inline">Регистрация</span>
                  <span className="sm:hidden">Войти</span>
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </header>

      {/* ====================== HERO ======================
          Brand surface — invariant к теме. Используем явный --brand
          и text-white вместо токенов, чтобы выглядеть одинаково в light/dark.
      */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--brand)] via-[var(--brand)] to-[var(--brand-dark)] text-white">
        {/* Декоративный background-узор */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 30%, rgba(255,255,255,0.6) 0%, transparent 40%), radial-gradient(circle at 75% 70%, rgba(255,255,255,0.4) 0%, transparent 40%)",
          }}
        />
        <Container size="wide" className="relative">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center py-16 sm:py-20 lg:py-28">
            {/* Левая колонка — текст */}
            <div className="text-center lg:text-left flex flex-col items-center lg:items-start gap-6">
              <Badge
                variant="outline"
                className="bg-white/15 border-white/30 text-white backdrop-blur-sm px-3 py-1 text-xs sm:text-sm font-medium"
              >
                Доставка на склады WB и Ozon
              </Badge>

              <H1 className="!text-white max-w-2xl">
                Логистика для маркетплейсов{" "}
                <span className="text-[var(--brand-light)] block sm:inline">
                  просто и удобно
                </span>
              </H1>

              <Lead className="!text-white/85 max-w-xl">
                Оформляйте заказы на доставку грузов на склады Wildberries
                и Ozon онлайн. Отслеживайте статусы, получайте стикеры
                и управляйте компанией в одном месте.
              </Lead>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto pt-2">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto h-12 px-7 bg-white text-[var(--brand)] hover:bg-[var(--brand-light)] font-semibold text-base shadow-glow tap-target"
                  >
                    Создать заказ
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                </Link>
                <Link href="/login" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto h-12 px-7 border-white/40 bg-white/5 text-white hover:bg-white/15 hover:text-white text-base tap-target"
                  >
                    Войти в кабинет
                  </Button>
                </Link>
              </div>
            </div>

            {/* Правая колонка — иллюстрация */}
            <div className="hidden lg:flex justify-center">
              <div className="relative rounded-3xl bg-[var(--brand-muted)] p-8 shadow-2xl ring-1 ring-white/20">
                <Image
                  src="/brand/illustration-warehouse.svg"
                  alt=""
                  width={520}
                  height={290}
                  className="rounded-2xl"
                  priority
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ====================== TRUST ====================== */}
      <Trust />

      {/* ====================== HOW IT WORKS ====================== */}
      <HowItWorks />

      {/* ====================== FEATURES ====================== */}
      <Section tone="muted" spacing="lg">
        <Container>
          <SectionHeader>
            <Eyebrow>Возможности</Eyebrow>
            <H2>Всё что нужно для доставки</H2>
            <Lead>
              Мы собрали в одном кабинете все инструменты — от расчёта
              стоимости до выдачи QR-стикеров.
            </Lead>
          </SectionHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc }) => (
              <Card
                key={title}
                className="group border-border bg-card rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-[var(--duration-base)]"
              >
                <CardContent className="p-6 flex flex-col gap-3">
                  <div className="bg-primary/10 text-primary rounded-xl p-2.5 w-11 h-11 flex items-center justify-center transition-colors duration-[var(--duration-base)] group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <H3 className="text-lg sm:text-xl font-semibold">{title}</H3>
                  <Muted>{desc}</Muted>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* ====================== FAQ ====================== */}
      <Faq />

      {/* ====================== CTA ====================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--brand)] via-[var(--brand)] to-[var(--brand-dark)] text-white py-20 sm:py-28">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.6) 0%, transparent 50%)",
          }}
        />
        <Container size="narrow" className="relative text-center">
          <div className="flex flex-col items-center gap-4">
            <H2 className="!text-white">Начните прямо сейчас</H2>
            <Lead className="!text-white/85">
              Регистрация занимает 1 минуту, без оплаты и обязательств
            </Lead>
            <Link href="/register" className="mt-3 w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-12 px-10 bg-white text-[var(--brand)] hover:bg-[var(--brand-light)] font-semibold text-base shadow-glow tap-target"
              >
                Зарегистрироваться бесплатно
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </Link>
          </div>
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

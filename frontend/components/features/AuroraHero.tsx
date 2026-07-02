"use client"

import { useRef } from "react"
import Link from "next/link"
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "motion/react"
import {
  ArrowRight,
  Package,
  QrCode,
  CreditCard,
  Truck,
  ShieldCheck,
  MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const SPRING = { stiffness: 120, damping: 22, mass: 0.4 }

/**
 * Иммёрсивный hero в стиле Aurora Glass.
 * Брендовый оранжевый градиент + живые световые ауры + стеклянная композиция
 * с parallax-глубиной по движению мыши. Всё на transform/opacity (дёшево для GPU),
 * parallax отключается при prefers-reduced-motion.
 */
export function AuroraHero() {
  const prefersReduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)

  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const sx = useSpring(px, SPRING)
  const sy = useSpring(py, SPRING)

  // Слои глубины (дальше → меньше смещение)
  const farX = useTransform(sx, (v) => v * -18)
  const farY = useTransform(sy, (v) => v * -12)
  const midX = useTransform(sx, (v) => v * 30)
  const midY = useTransform(sy, (v) => v * 22)
  const nearX = useTransform(sx, (v) => v * 52)
  const nearY = useTransform(sy, (v) => v * 40)
  const tiltX = useTransform(sy, (v) => v * -6)
  const tiltY = useTransform(sx, (v) => v * 8)

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (prefersReduced || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width - 0.5)
    py.set((e.clientY - r.top) / r.height - 0.5)
  }
  function onLeave() {
    px.set(0)
    py.set(0)
  }

  const enter = (delay: number) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] as const },
  })

  return (
    <section
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative overflow-hidden bg-gradient-to-br from-[var(--brand)] via-[var(--brand)] to-[var(--brand-dark)] text-white"
    >
      {/* ---------- Aurora background ---------- */}
      <div className="aurora-wrap" aria-hidden>
        <div
          className="aurora-blob"
          style={{
            width: 520, height: 520, top: "-12%", left: "-6%",
            background: "radial-gradient(circle, #FFB27A 0%, transparent 68%)",
            animationDelay: "0s",
          }}
        />
        <div
          className="aurora-blob"
          style={{
            width: 460, height: 460, top: "10%", right: "-8%",
            background: "radial-gradient(circle, #FF7A45 0%, transparent 66%)",
            animationDelay: "-4s",
          }}
        />
        <div
          className="aurora-blob"
          style={{
            width: 400, height: 400, bottom: "-16%", left: "28%",
            background: "radial-gradient(circle, #FFD9A0 0%, transparent 70%)",
            animationDelay: "-9s",
          }}
        />
        <div
          className="aurora-blob"
          style={{
            width: 300, height: 300, bottom: "6%", right: "22%",
            background: "radial-gradient(circle, #FF5E3A 0%, transparent 64%)",
            animationDelay: "-13s",
          }}
        />
      </div>
      <div className="hero-grid" aria-hidden />
      <div className="hero-noise" aria-hidden />

      {/* ---------- Content ---------- */}
      <div className="relative mx-auto w-full max-w-[86rem] px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 py-20 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:py-28">
          {/* ===== Left: текст ===== */}
          <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
            <motion.div {...enter(0)}>
              <span className="glass-brand inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium sm:text-sm">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-2 animate-ping rounded-full bg-white/70" />
                  <span className="relative inline-flex size-2 rounded-full bg-white" />
                </span>
                Доставка на склады WB и Ozon
              </span>
            </motion.div>

            <motion.h1
              {...enter(0.08)}
              className="max-w-2xl text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            >
              Логистика для маркетплейсов{" "}
              <span className="bg-gradient-to-r from-white via-[#FFE7D3] to-[var(--brand-light)] bg-clip-text text-transparent">
                нового уровня
              </span>
            </motion.h1>

            <motion.p
              {...enter(0.16)}
              className="max-w-xl text-pretty text-base leading-relaxed text-white/85 sm:text-lg"
            >
              Оформляйте доставку грузов на склады Wildberries и Ozon онлайн.
              Отслеживайте статусы, получайте QR-стикеры и управляйте компанией
              в одном кабинете.
            </motion.p>

            <motion.div
              {...enter(0.24)}
              className="flex w-full flex-col gap-3 pt-2 sm:w-auto sm:flex-row"
            >
              <Link href="/register" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="btn-shine h-12 w-full gap-2 rounded-full bg-white px-8 text-base font-semibold text-[var(--brand)] shadow-glow transition-transform hover:-translate-y-0.5 hover:bg-white sm:w-auto"
                >
                  Начать бесплатно
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="glass-brand h-12 w-full rounded-full px-8 text-base font-medium text-white hover:bg-white/20 sm:w-auto"
                >
                  Войти
                </Button>
              </Link>
            </motion.div>

            {/* Мини-строка доверия (факты из продукта, без выдуманных цифр) */}
            <motion.ul
              {...enter(0.32)}
              className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-3 text-sm text-white/80 lg:justify-start"
            >
              <li className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-4" aria-hidden /> Оплата ЮKassa
              </li>
              <li className="inline-flex items-center gap-1.5">
                <QrCode className="size-4" aria-hidden /> QR-стикеры автоматически
              </li>
              <li className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden /> WB · Ozon
              </li>
            </motion.ul>
          </div>

          {/* ===== Right: плавающая стеклянная композиция ===== */}
          <motion.div
            {...enter(0.2)}
            className="relative mx-auto hidden h-[440px] w-full max-w-md lg:block"
            style={{ perspective: 1200 }}
          >
            {/* Основная карта — маршрут доставки */}
            <motion.div
              style={{ x: farX, y: farY, rotateX: tiltX, rotateY: tiltY, transformStyle: "preserve-3d" }}
              className="glass-brand animate-float-y-slow absolute left-1/2 top-1/2 w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <span className="grid size-8 place-items-center rounded-xl bg-white/15">
                    <Truck className="size-4" aria-hidden />
                  </span>
                  Заказ в пути
                </div>
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white/90">
                  В пути
                </span>
              </div>

              {/* Маршрут WB → Ozon с движущимся грузовиком */}
              <div className="relative mt-6">
                <div className="flex items-center justify-between text-xs font-medium text-white/85">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-white" /> Wildberries
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    Ozon <span className="size-2 rounded-full bg-white/60" />
                  </span>
                </div>
                <div className="relative mt-3 h-1.5 rounded-full bg-white/15">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-white/70 to-white"
                    initial={{ width: "18%" }}
                    animate={prefersReduced ? { width: "62%" } : { width: ["18%", "82%", "18%"] }}
                    transition={{ duration: 6, repeat: Infinity, ease: [0.32, 0.72, 0, 1] }}
                  />
                  {!prefersReduced && (
                    <motion.div
                      className="absolute top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-white text-[var(--brand)] shadow-lg"
                      initial={{ left: "18%" }}
                      animate={{ left: ["18%", "82%", "18%"] }}
                      transition={{ duration: 6, repeat: Infinity, ease: [0.32, 0.72, 0, 1] }}
                      style={{ marginLeft: -14 }}
                    >
                      <Truck className="size-3.5" aria-hidden />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Мини-детали заказа */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-white/70">
                    <Package className="size-3.5" aria-hidden /> Коробки
                  </div>
                  <div className="mt-1 text-lg font-semibold text-white">Паллеты</div>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-white/70">
                    <QrCode className="size-3.5" aria-hidden /> Стикеры
                  </div>
                  <div className="mt-1 text-lg font-semibold text-white">58×40 мм</div>
                </div>
              </div>
            </motion.div>

            {/* Плавающий чип — ЮKassa (ближний слой) */}
            <motion.div
              style={{ x: nearX, y: nearY }}
              className="glass-brand animate-float-y absolute -right-2 top-6 flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-white"
            >
              <span className="grid size-7 place-items-center rounded-lg bg-white/15">
                <CreditCard className="size-4" aria-hidden />
              </span>
              Оплата картой / СБП
            </motion.div>

            {/* Плавающий чип — Мастер заказа (средний слой) */}
            <motion.div
              style={{ x: midX, y: midY }}
              className="glass-brand animate-float-y-slow absolute -left-3 bottom-8 flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-white"
            >
              <span className="grid size-7 place-items-center rounded-lg bg-white/15">
                <Package className="size-4" aria-hidden />
              </span>
              Мастер заказа · 6 шагов
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Плавный переход к следующей секции */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background"
      />
    </section>
  )
}

"use client"

import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
} from "motion/react"
import type { ReactNode } from "react"

type Direction = "up" | "down" | "left" | "right" | "none"

const DIRECTIONS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
  none: { x: 0, y: 0 },
}

const EASE_OUT_EXPO = [0.21, 0.47, 0.32, 0.98] as const

type MotionDivProps = Omit<
  HTMLMotionProps<"div">,
  "initial" | "animate" | "whileInView" | "viewport" | "variants" | "transition"
>

interface RevealProps extends MotionDivProps {
  children: ReactNode
  /** Задержка появления, секунды. */
  delay?: number
  /** Длительность анимации, секунды. */
  duration?: number
  /** Откуда «выезжает» элемент. */
  direction?: Direction
  /** Смещение в px. */
  distance?: number
  /** Триггер анимации при mount вместо whileInView. Для above-the-fold (Hero/Header). */
  initialOnMount?: boolean
  /** Если false — анимация повторится при каждом возврате в viewport. */
  once?: boolean
}

/**
 * Точечный wrapper для reveal-анимации одного блока.
 * Не делает ничего, если пользователь установил `prefers-reduced-motion: reduce`.
 */
export function Reveal({
  children,
  delay = 0,
  duration = 0.5,
  direction = "up",
  distance = 24,
  initialOnMount = false,
  once = true,
  className,
  ...rest
}: RevealProps) {
  const prefersReduced = useReducedMotion()

  if (prefersReduced) {
    return <div className={className}>{children}</div>
  }

  const offset = DIRECTIONS[direction]
  const hidden = {
    opacity: 0,
    x: offset.x * distance,
    y: offset.y * distance,
  }
  const visible = { opacity: 1, x: 0, y: 0 }

  const motionProps = initialOnMount
    ? { initial: hidden, animate: visible }
    : {
        initial: hidden,
        whileInView: visible,
        viewport: { once, margin: "-80px" },
      }

  return (
    <motion.div
      className={className}
      transition={{ duration, delay, ease: EASE_OUT_EXPO }}
      {...motionProps}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

interface RevealStaggerProps extends MotionDivProps {
  children: ReactNode
  /** Интервал между анимациями детей, секунды. */
  interval?: number
  /** Задержка перед первым ребёнком. */
  delay?: number
  once?: boolean
}

/**
 * Контейнер, который последовательно (с задержкой) показывает свои `<RevealItem>` дети.
 */
export function RevealStagger({
  children,
  className,
  interval = 0.08,
  delay = 0,
  once = true,
  ...rest
}: RevealStaggerProps) {
  const prefersReduced = useReducedMotion()

  if (prefersReduced) {
    return <div className={className}>{children}</div>
  }

  const variants: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: interval, delayChildren: delay },
    },
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-60px" }}
      variants={variants}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

interface RevealItemProps extends MotionDivProps {
  children: ReactNode
  /** Откуда «выезжает» элемент. */
  direction?: Direction
  /** Смещение в px. */
  distance?: number
  /** Длительность анимации, секунды. */
  duration?: number
}

const ITEM_VARIANTS_CACHE = new Map<string, Variants>()

function getItemVariants(
  direction: Direction,
  distance: number,
  duration: number,
): Variants {
  const key = `${direction}:${distance}:${duration}`
  const cached = ITEM_VARIANTS_CACHE.get(key)
  if (cached) return cached

  const offset = DIRECTIONS[direction]
  const variants: Variants = {
    hidden: {
      opacity: 0,
      x: offset.x * distance,
      y: offset.y * distance,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration, ease: EASE_OUT_EXPO },
    },
  }
  ITEM_VARIANTS_CACHE.set(key, variants)
  return variants
}

/**
 * Один ребёнок stagger-контейнера. Должен быть прямым потомком `<RevealStagger>`.
 */
export function RevealItem({
  children,
  className,
  direction = "up",
  distance = 20,
  duration = 0.45,
  ...rest
}: RevealItemProps) {
  const prefersReduced = useReducedMotion()

  if (prefersReduced) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      variants={getItemVariants(direction, distance, duration)}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

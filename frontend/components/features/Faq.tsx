"use client"

import Link from "next/link"
import { HelpCircle } from "lucide-react"
import { Container } from "@/components/ui/container"
import { Section, SectionHeader } from "@/components/ui/section"
import { Eyebrow, H2, Lead, Muted } from "@/components/ui/typography"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionPanel,
} from "@/components/ui/accordion"
import { Reveal } from "@/components/ui/reveal"

interface FaqEntry {
  q: string
  a: React.ReactNode
}

const FAQ: FaqEntry[] = [
  {
    q: "На какие маркетплейсы вы доставляете?",
    a: "Wildberries и Ozon — список направлений виден в кабинете при оформлении заказа.",
  },
  {
    q: "Сколько стоит доставка?",
    a: "Стоимость зависит от направления и количества коробок. Калькулятор внутри кабинета посчитает точно. Если в заказе 11 и более коробок, система автоматически предложит паллетный тариф.",
  },
  {
    q: "Какие данные нужны для отправки?",
    a: "Достаточно указать название компании (или ИП) при оформлении — оно используется на стикере. Сохранить можно в профиле, чтобы не вводить каждый раз.",
  },
  {
    q: "Когда груз будет на складе?",
    a: "Дата прибытия рассчитывается автоматически на основе слота отправки и направления. Конкретная дата видна на этапе оформления заказа.",
  },
  {
    q: "Что такое QR-стикеры и зачем они нужны?",
    a: "Это PDF 58×40 мм с уникальным QR-кодом для каждой коробки. Клеятся на коробки перед отправкой — по ним груз идентифицируют на складе и в пути.",
  },
  {
    q: "Как происходит оплата?",
    a: "Через ЮKassa — банковская карта или СБП. Также доступна оплата по реквизитам СБП: менеджер подтверждает поступление и активирует заказ.",
  },
  {
    q: "Что если коробок больше 11 — будет паллет?",
    a: "Да. При 11 и более коробках система автоматически переходит на паллетный тариф. Стоимость до и после паллетизации видна на этапе расчёта.",
  },
  {
    q: "Можно ли отменить заказ?",
    a: "Заказ в статусе «Новый» можно удалить из корзины самостоятельно. Если заказ уже оплачен или передан в обработку — свяжитесь с менеджером.",
  },
]

export function Faq() {
  return (
    <Section tone="default" spacing="lg" id="faq">
      <Container size="narrow">
        <Reveal>
          <SectionHeader>
            <Eyebrow>Вопросы</Eyebrow>
            <H2>Частые вопросы</H2>
            <Lead>
              Самое важное, что обычно спрашивают перед первой отправкой.
              Не нашли ответ — напишите нам через раздел «Поддержка».
            </Lead>
          </SectionHeader>
        </Reveal>

        <Reveal>
          <Accordion>
            {FAQ.map((item, i) => (
              <AccordionItem key={i} value={String(i)}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionPanel>{item.a}</AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <div className="inline-flex items-center justify-center size-10 rounded-full bg-primary/10 text-primary">
              <HelpCircle className="size-5" aria-hidden />
            </div>
            <Muted>Остались вопросы?</Muted>
            <Link href="/support">
              <Button variant="outline" size="lg" className="h-11 px-5 tap-target">
                Написать в поддержку
              </Button>
            </Link>
          </div>
        </Reveal>
      </Container>
    </Section>
  )
}

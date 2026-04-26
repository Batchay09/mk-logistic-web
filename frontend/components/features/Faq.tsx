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

interface FaqEntry {
  q: string
  a: React.ReactNode
}

const FAQ: FaqEntry[] = [
  {
    q: "На какие маркетплейсы вы доставляете?",
    a: "Wildberries и Ozon — все активные склады по России. Список направлений и дат обновляется ежедневно из расписания.",
  },
  {
    q: "Сколько стоит доставка одной коробки?",
    a: "Стоимость зависит от направления и количества коробок. Калькулятор внутри кабинета посчитает точно — без звонка менеджеру. Если в заказе 11+ коробок, мы автоматически паллетизируем для экономии.",
  },
  {
    q: "Какие документы нужны для отправки?",
    a: "Достаточно карточки компании (ИНН, ОГРН, адрес) — добавляется один раз в профиле. Чек об оплате присылаем на email сразу после подтверждения.",
  },
  {
    q: "Сколько идёт груз до склада?",
    a: "Дата прибытия рассчитывается автоматически на основе слота отправки и направления. Обычно 2–7 дней. Конкретная дата всегда видна на этапе оформления.",
  },
  {
    q: "Что такое QR-стикеры и зачем они нужны?",
    a: "Это PDF 58×40 мм с уникальным QR-кодом для каждой коробки. Клеятся на коробки до отправки — по ним идентифицируют груз на складе и в пути. Стикеры приходят на email сразу после оплаты.",
  },
  {
    q: "Как происходит оплата?",
    a: "Через ЮKassa: банковская карта или СБП. Чек отправим автоматически на email. Для крупных клиентов возможна СБП по реквизитам — менеджер подтверждает поступление и активирует заказ.",
  },
  {
    q: "Что если коробок больше 11 — будет паллет?",
    a: "Да, при 11+ коробках мы автоматически предложим паллет — это выгоднее по тарифу. Расчёт прозрачный: видите стоимость до и после паллетизации.",
  },
  {
    q: "Можно ли отменить заказ после оплаты?",
    a: "Можно, если он ещё не передан в обработку. Деньги возвращаются на ту же карту в течение 1–3 рабочих дней. После отправки груза отмена невозможна.",
  },
]

export function Faq() {
  return (
    <Section tone="default" spacing="lg" id="faq">
      <Container size="narrow">
        <SectionHeader>
          <Eyebrow>Вопросы</Eyebrow>
          <H2>Частые вопросы</H2>
          <Lead>
            Самое важное, что обычно спрашивают перед первой отправкой.
            Не нашли ответ — напишите нам, ответим в течение часа.
          </Lead>
        </SectionHeader>

        <Accordion>
          {FAQ.map((item, i) => (
            <AccordionItem key={i} value={String(i)}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionPanel>{item.a}</AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>

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
      </Container>
    </Section>
  )
}

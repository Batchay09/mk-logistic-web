import type { Metadata } from "next"
import { Phone, Mail, Clock, MapPin, Send, MessageCircle } from "lucide-react"
import { H3 } from "@/components/ui/typography"
import { DocHeader } from "@/components/features/legal/legal"
import { COMPANY, hasContact, telHref } from "@/lib/company"

export const metadata: Metadata = {
  title: "Контакты и реквизиты — МК Логистик",
  description:
    "Контакты службы доставки МК Логистик и реквизиты индивидуального предпринимателя (ИНН, ОГРНИП).",
}

const { contacts, requisites } = COMPANY

interface ContactItem {
  icon: React.ReactNode
  label: string
  value: string
  href?: string
}

/**
 * Собираем только заполненные способы связи — пустые (например, телефон,
 * которого пока нет) не показываем, чтобы страница выглядела завершённой.
 * Адрес показываем всегда — он берётся из реквизитов.
 */
const CONTACT_ITEMS: ContactItem[] = [
  hasContact(contacts.phone) && {
    icon: <Phone className="size-5" aria-hidden />,
    label: "Телефон",
    value: contacts.phone,
    href: telHref(contacts.phone),
  },
  hasContact(contacts.email) && {
    icon: <Mail className="size-5" aria-hidden />,
    label: "Email",
    value: contacts.email,
    href: `mailto:${contacts.email}`,
  },
  hasContact(contacts.workingHours) && {
    icon: <Clock className="size-5" aria-hidden />,
    label: "Часы работы",
    value: contacts.workingHours,
  },
  {
    icon: <MapPin className="size-5" aria-hidden />,
    label: "Адрес",
    value: requisites.address,
  },
  hasContact(contacts.telegram) && {
    icon: <Send className="size-5" aria-hidden />,
    label: "Telegram",
    value: contacts.telegram,
    href: contacts.telegram,
  },
  hasContact(contacts.whatsapp) && {
    icon: <MessageCircle className="size-5" aria-hidden />,
    label: "WhatsApp",
    value: contacts.whatsapp,
    href: contacts.whatsapp,
  },
].filter(Boolean) as ContactItem[]

interface Row {
  label: string
  value: string
}

const REQUISITE_ROWS: Row[] = [
  { label: "Наименование", value: requisites.legalName },
  { label: "ИНН", value: requisites.inn },
  { label: "ОГРНИП", value: requisites.ogrnip },
  { label: "Адрес", value: requisites.address },
  { label: "Налогообложение", value: requisites.taxNote },
]

export default function ContactsPage() {
  return (
    <>
      <DocHeader
        title="Контакты и реквизиты"
        intro="Свяжитесь с нами удобным способом — ответим в рабочее время. Ниже указаны официальные реквизиты."
      />

      {/* Контакты */}
      <section className="mb-10">
        <H3 className="mb-4 text-xl sm:text-2xl">Как связаться</H3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CONTACT_ITEMS.map((item) => (
            <ContactCard key={item.label} item={item} />
          ))}
        </div>
      </section>

      {/* Реквизиты */}
      <section>
        <H3 className="mb-4 text-xl sm:text-2xl">Реквизиты</H3>
        <dl className="overflow-hidden rounded-2xl border border-border">
          {REQUISITE_ROWS.map((row, i) => (
            <div
              key={row.label}
              className={
                "flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:gap-4 " +
                (i % 2 === 0 ? "bg-card" : "bg-muted/40")
              }
            >
              <dt className="w-full shrink-0 text-sm font-medium text-muted-foreground sm:w-48">
                {row.label}
              </dt>
              <dd className="text-[15px] text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  )
}

function ContactCard({ item }: { item: ContactItem }) {
  const inner = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        {item.icon}
      </span>
      <span className="flex flex-col">
        <span className="text-xs text-muted-foreground">{item.label}</span>
        <span className="text-[15px] font-medium text-foreground">{item.value}</span>
      </span>
    </>
  )

  const base =
    "flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors"

  if (item.href) {
    return (
      <a href={item.href} className={base + " tap-target hover:border-primary/40 hover:bg-muted/40"}>
        {inner}
      </a>
    )
  }
  return <div className={base}>{inner}</div>
}

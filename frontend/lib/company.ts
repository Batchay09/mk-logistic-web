/**
 * Единый источник правды по реквизитам и контактам компании.
 *
 * Используется в футере, на странице /contacts, в оферте и политике
 * конфиденциальности. Меняем данные ТОЛЬКО здесь — по всему сайту обновится
 * автоматически. Не хардкодим реквизиты по страницам.
 *
 * Реквизиты (ИНН/ОГРНИП/наименование) — публичные данные из ЕГРИП.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  TODO ПЕРЕД ПУБЛИКАЦИЕЙ: заполнить поля, помеченные FILL_ME.       │
 * │  Эквайер (ЮKassa/банк) требует видеть телефон и email на сайте.    │
 * └─────────────────────────────────────────────────────────────────┘
 */

/** Плейсхолдер для незаполненных контактов — заметен и в UI, и в коде. */
const FILL_ME = "" as const

export interface CompanyContacts {
  /** Телефон в формате +7 999 123-45-67 (кликабельный tel:) */
  readonly phone: string
  /** Email для клиентов (кликабельный mailto:) */
  readonly email: string
  /** Часы работы, напр. «Пн–Пт, 9:00–18:00 (МСК)» */
  readonly workingHours: string
  /** Ссылка на Telegram (полный URL) или "" если нет */
  readonly telegram: string
  /** Ссылка на WhatsApp (полный URL) или "" если нет */
  readonly whatsapp: string
}

export interface CompanyRequisites {
  /** Полное наименование, напр. «Индивидуальный предприниматель Узденов Таулан Абубакирович» */
  readonly legalName: string
  /** Краткое наименование для футера, напр. «ИП Узденов Т. А.» */
  readonly shortName: string
  readonly inn: string
  readonly ogrnip: string
  /** Адрес для публикации (регион/город — точный адрес прописки ИП не обязателен) */
  readonly address: string
  /** Налоговый режим — влияет на формулировку про НДС */
  readonly taxNote: string
}

export interface Company {
  /** Бренд для UI */
  readonly brand: string
  /** Описание услуги одной строкой */
  readonly tagline: string
  readonly requisites: CompanyRequisites
  readonly contacts: CompanyContacts
}

export const COMPANY: Company = {
  brand: "МК Логистик",
  tagline: "Доставка грузов на склады Wildberries и Ozon",

  requisites: {
    legalName:
      "Индивидуальный предприниматель Узденов Таулан Абубакирович",
    shortName: "ИП Узденов Т. А.",
    inn: "090903525542",
    ogrnip: "322090000019787",
    address: "Карачаево-Черкесская Республика, с. Красный Курган",
    taxNote: "Применяется УСН. НДС не облагается.",
  },

  contacts: {
    phone: FILL_ME, // FILL_ME напр. "+7 928 000-00-00" — в ЕГРИП телефона нет
    email: "uzdenovtau@mail.ru", // из ЕГРИП; замени на отдельный support@, если заведёшь
    workingHours: FILL_ME, // FILL_ME напр. "Пн–Пт, 9:00–18:00 (МСК)"
    telegram: FILL_ME, // FILL_ME напр. "https://t.me/mklogistic" (или "")
    whatsapp: FILL_ME, // FILL_ME напр. "https://wa.me/79280000000" (или "")
  },
}

/** true, если контакт заполнен и его можно показывать/делать кликабельным. */
export function hasContact(value: string): boolean {
  return value.trim().length > 0
}

/** Значение для tel: — только цифры и «+». */
export function telHref(phone: string): string {
  return "tel:" + phone.replace(/[^\d+]/g, "")
}

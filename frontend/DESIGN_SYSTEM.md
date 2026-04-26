# MK Логистик — Design System

Источник правды для UI. Любой компонент (свой, shadcn, или сгенерированный через 21st.dev Magic) обязан опираться на токены из этого документа.

## 🎨 Цвета

Все цвета определены как CSS-переменные в `app/globals.css` (формат `oklch` для лучшей цветопередачи). Tailwind утилиты создаются автоматически из токенов в `@theme`.

### Семантические токены (использовать в 99% случаев)

| Tailwind class | Назначение | Где использовать |
|---|---|---|
| `bg-background` / `text-foreground` | Базовый фон / текст страницы | body, всё что не карточка |
| `bg-card` / `text-card-foreground` | Карточки | `<Card>`, любые контейнеры с приподнятостью |
| `bg-primary` / `text-primary-foreground` | Бренд, главные CTA | «Создать заказ», «Войти», важные ссылки |
| `bg-secondary` / `text-secondary-foreground` | Вторичные кнопки, бежевые акценты | «Войти в кабинет», теги |
| `bg-accent` / `text-accent-foreground` | Decorative подложки | hover-state, badge background |
| `bg-muted` / `text-muted-foreground` | Тихие секции, второстепенный текст | альт. фоны, описания, captions |
| `border-border` | Все границы | везде где нужна линия |
| `bg-destructive` / `text-destructive` | Удаление, ошибки | confirm dialogs |
| `bg-success` / `text-success` | Успех | toast.success, paid badge |
| `bg-warning` / `text-warning` | Предупреждение | unpaid badge |
| `bg-info` / `text-info` | Информация | info banners |

### Брендовые шорткаты (только для специфики)

`--brand`, `--brand-dark`, `--brand-light`, `--brand-muted` — в коде через `bg-[var(--brand)]`. **Используй только если семантический токен не подходит** (например, для логотипа в SVG).

### Status palette (только для статусов заказов)

В `app/globals.css` определены `.status-new`, `.status-paid`, `.status-delivered` и т.д. Применяются на `<span class="status-badge status-paid">Оплачен</span>`.

## 🔤 Typography

Используй **компоненты** из `components/ui/typography.tsx`. Не пиши `<h1 className="text-5xl ...">` руками.

| Компонент | Размер (mobile → desktop) | Назначение |
|---|---|---|
| `<H1>` | 4xl → 5xl → 6xl, bold | Hero лендинга, страница profile |
| `<H2>` | 3xl → 4xl → 5xl, bold | Заголовок секции |
| `<H3>` | 2xl → 3xl, semibold | Подсекция, карточка-фича |
| `<H4>` | xl → 2xl, semibold | Заголовок формы, диалога |
| `<Eyebrow>` | xs → sm, uppercase, primary | Маленький лейбл над H1/H2 |
| `<Lead>` | lg → xl, muted | Подзаголовок hero, intro |
| `<Body>` | base | Обычный параграф |
| `<Muted>` | sm, muted | Вторичный текст, captions |
| `<Caption>` | xs, uppercase, muted | Маленькие метки |

## 📐 Spacing & Radius

### Радиусы (дружелюбный B2B)

База `--radius: 0.75rem` (12px). Tailwind утилиты:

- `rounded-sm` (~7px) — мелкие чипы, inputs
- `rounded-md` (~10px) — small badges
- `rounded-lg` (12px) — кнопки, inputs (default)
- `rounded-xl` (~17px) — карточки
- `rounded-2xl` (~22px) — крупные secondary блоки
- `rounded-3xl` (~26px) — featured карточки, hero
- `rounded-full` — аватары, иконки

### Тени (тёплые, brand-tinted)

- `shadow-xs` — еле заметная (для inputs)
- `shadow-sm` — карточки в списке
- `shadow-md` — приподнятые элементы
- `shadow-lg` — модалки, dropdown
- `shadow-xl` — featured cards
- `shadow-2xl` — hero blocks
- `shadow-brand` — сильная brand-окрашенная (для CTA hover)
- `shadow-glow` — glow для primary элементов

## 📱 Mobile-first

- Все размеры **стартуют с мобилки** и расширяются через `sm:` `md:` `lg:`
- Tap target ≥ 44px: `min-h-11` или utility `tap-target`
- Safe area для нижних бар: `pb-safe`, `pt-safe`
- Brakepoints: `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536

## 🎬 Анимации

CSS-переменные:
- `--duration-fast: 150ms` — hover, простые transitions
- `--duration-base: 200ms` — большинство переходов
- `--duration-slow: 350ms` — крупные движения (modal slide, page enter)
- `--ease-out-soft` — плавный выход
- `--ease-spring` — отскок (для interactive элементов)

В классах: `transition-all duration-200 ease-[var(--ease-out-soft)]`

## 🧱 Layout-примитивы

### `<Container>`

`components/ui/container.tsx`. Размеры:
- `narrow` — 768px (формы, тексты)
- `default` — 1280px (приложение)
- `wide` — 1536px (лендинг)
- `full` — без ограничения

```tsx
<Container size="wide">
  <H1>Заголовок</H1>
</Container>
```

### `<Section>`

`components/ui/section.tsx`. Тоны: `default`, `muted`, `accent`, `brand`, `inverted`. Spacing: `sm`, `default`, `lg`, `xl`.

```tsx
<Section tone="muted" spacing="lg">
  <Container>
    <SectionHeader>
      <Eyebrow>Возможности</Eyebrow>
      <H2>Всё что нужно для доставки</H2>
      <Lead>Описание секции...</Lead>
    </SectionHeader>
    {/* контент */}
  </Container>
</Section>
```

## 🌗 Тёмная тема

Подключена через `next-themes` в `providers.tsx`. Все токены имеют dark-варианты в `:root.dark`. Компоненты, использующие семантические токены, **автоматически адаптируются** — не надо писать `dark:bg-...`.

Тоггл: `<ThemeToggle />` из `components/ui/theme-toggle.tsx`.

### ⚠️ Invariant brand surfaces (важное исключение)

**Hero, CTA-блоки, маркетинговые секции на бренд-фоне** должны выглядеть **одинаково в light и dark** — это распространённый паттерн (Stripe, Vercel, Resend). Юзер ожидает что hero яркий-оранжевый всегда.

В таких секциях **НЕ используй** семантические токены `bg-primary`/`text-primary-foreground` — они инвертируются в dark и сломают вид.

**Делай так:**
```tsx
<section className="bg-gradient-to-br from-[var(--brand)] via-[var(--brand)] to-[var(--brand-dark)] text-white">
  <H1 className="!text-white">...</H1>          {/* ! важен — H1 имеет text-foreground по умолчанию */}
  <Lead className="!text-white/85">...</Lead>
  <Button className="bg-white text-[var(--brand)] hover:bg-[var(--brand-light)]">CTA</Button>
</section>
```

| Где | Bg | Text | Кнопка |
|---|---|---|---|
| Brand-секция | `bg-[var(--brand)]` или `bg-gradient-...` | `!text-white` | `bg-white text-[var(--brand)]` |
| Обычная секция | `bg-background` / `bg-muted` | `text-foreground` | `<Button>` (default) |

`<Section tone="brand">` тоже инвертируется в dark — поэтому для invariant brand surfaces используй обычный `<section>` с явными классами.

## ✅ Чек-лист перед коммитом UI

- [ ] Никаких `bg-[#...]`, `text-[#...]` — только токены
- [ ] Заголовки через `<H1>` / `<H2>` / ..., не `<h1 className="...">`
- [ ] Карточки и секции с правильными тенями (`shadow-md` или выше)
- [ ] Mobile-first: проверил при ширине 375px
- [ ] Tap targets ≥ 44px
- [ ] Тёмная тема: переключил toggle, выглядит ОК
- [ ] Focus visible работает (Tab по интерактивам)

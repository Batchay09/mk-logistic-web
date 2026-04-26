# Frontend (Next.js 16)

Смотри корневой [CLAUDE.md](../CLAUDE.md) для полного описания проекта.
Полная справка по дизайн-системе → [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).

## Команды

```bash
npm run dev        # разработка (http://localhost:3000)
npm run build      # production build
npx tsc --noEmit   # TypeScript проверка без компиляции
```

## Стек

- Next.js 16 App Router + React 19
- shadcn/ui + Tailwind CSS v4
- @tanstack/react-query — data fetching
- react-hook-form + zod — формы и валидация
- sonner — toast уведомления
- next-themes — light/dark mode (см. ThemeToggle)
- lucide-react — иконки

## Соглашения

- Client компоненты: `"use client"` в начале файла
- API запросы через `lib/api.ts` (credentials: "include" для httpOnly cookie)
- Роль-based routing через `app/layout-with-sidebar.tsx`
- Все формы — `react-hook-form` + zod schema

## Дизайн-система (CRITICAL)

### НЕЛЬЗЯ
- ❌ Хардкодить цвета: `bg-[#D4512B]`, `border-[#EAC9B0]`, `text-[#FBF0EA]`
- ❌ Использовать произвольные оттенки серого `text-gray-500` — у нас есть `text-muted-foreground`
- ❌ Произвольные тени `shadow-[0_4px_20px_rgba(...)]` — есть `shadow-md`, `shadow-lg`
- ❌ Произвольные радиусы `rounded-[10px]` — есть scale `rounded-md`, `rounded-xl`

### НУЖНО
- ✅ Цвета через токены: `bg-primary`, `text-foreground`, `border-border`, `bg-muted`
- ✅ Тени через scale: `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-brand`, `shadow-glow`
- ✅ Радиусы через scale: `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`
- ✅ Заголовки через примитивы: `<H1>`, `<H2>`, `<Lead>`, `<Muted>` из `components/ui/typography`
- ✅ Контейнеры через `<Container>` и `<Section>` из `components/ui`
- ✅ Tap target ≥ 44px на мобильных кнопках (utility `tap-target` или класс `min-h-11`)
- ✅ Safe-area для mobile bottom-bars: `pb-safe`

### Палитра (токены)

| Токен | Назначение | Hex (light) |
|-------|-----------|-------------|
| `primary` | Бренд, основные CTA | `#D4512B` |
| `secondary` | Бежевые акценты, hover | `#EAC9B0` |
| `accent` | Светлые decorative блоки | `#F1DCC9` |
| `muted` | Карточки, фоны секций | `#FBF0EA` |
| `foreground` | Основной текст | почти чёрный (тёплый) |
| `muted-foreground` | Вторичный текст | тёплый серый |
| `success` | Зелёные статусы | OK |
| `warning` | Жёлтые статусы | OK |
| `destructive` | Удаление, ошибки | OK |

### Брейкпоинты (mobile-first)

```
sm:  ≥ 640px   планшет (вертикальный)
md:  ≥ 768px   планшет (горизонтальный)
lg:  ≥ 1024px  ноутбук
xl:  ≥ 1280px  десктоп
2xl: ≥ 1536px  большой десктоп
```

Правило: всегда стартуем с мобилки и расширяем через `sm:`, `md:`, `lg:`.

### Тёмная тема

Подключена через `next-themes`. Тоггл — `<ThemeToggle />`. Все токены имеют dark-вариант — компоненты не должны явно проверять `dark:` если используют токены правильно.

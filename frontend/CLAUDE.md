# Frontend (Next.js 15)

Смотри корневой [CLAUDE.md](../CLAUDE.md) для полного описания проекта.

## Команды

```bash
npm run dev        # разработка (http://localhost:3000)
npm run build      # production build
npx tsc --noEmit   # TypeScript проверка без компиляции
```

## Стек

- Next.js 15 App Router + React 19
- shadcn/ui + Tailwind CSS v4
- @tanstack/react-query — data fetching
- react-hook-form + zod — формы и валидация
- sonner — toast уведомления

## Соглашения

- Client компоненты: `"use client"` в начале файла
- API запросы через `lib/api.ts` (credentials: "include" для httpOnly cookie)
- Роль-based routing через `app/layout-with-sidebar.tsx`
- Фирменные цвета через inline классы: `bg-[#D4512B]`, `border-[#EAC9B0]`


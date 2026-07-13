import { NextRequest, NextResponse } from "next/server"

// Префиксы публичных разделов. Корень "/" проверяется отдельно точным
// сравнением — иначе startsWith("/") сматчил бы АБСОЛЮТНО любой путь и открыл
// доступ к /admin, /manager, /dashboard без авторизации.
const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/reset-password",
  // Публичные юридические страницы — должны открываться без входа,
  // иначе модератор эквайринга (и клиент) их не увидит.
  "/offer",
  "/privacy",
  "/contacts",
  "/delivery",
  "/api/",
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get("access_token")?.value

  // Allow public paths (корень + публичные префиксы)
  const isPublic = pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  if (isPublic) {
    return NextResponse.next()
  }

  // Redirect unauthenticated users
  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Исключаем внутренние маршруты Next и статические ассеты (по расширению),
    // иначе картинки из /public (логотип .jpg, .svg) ловят редирект на /login,
    // и Next/Image не может загрузить исходник → «битое» изображение.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico)$).*)",
  ],
}

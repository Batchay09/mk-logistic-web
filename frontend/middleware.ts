import { NextRequest, NextResponse } from "next/server"

// Префиксы публичных разделов. Корень "/" проверяется отдельно точным
// сравнением — иначе startsWith("/") сматчил бы АБСОЛЮТНО любой путь и открыл
// доступ к /admin, /manager, /dashboard без авторизации.
const PUBLIC_PREFIXES = ["/login", "/register", "/verify-email", "/reset-password", "/api/"]

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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
}

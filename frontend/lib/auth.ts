export type UserRole = "admin" | "manager" | "driver" | "client"

export interface CurrentUser {
  id: number
  email: string | null
  full_name: string | null
  company_name: string | null
  phone: string | null
  role: UserRole
  email_verified: boolean
}

export function isAdmin(user: CurrentUser) {
  return user.role === "admin"
}

export function isManager(user: CurrentUser) {
  return user.role === "manager" || user.role === "admin"
}

export function isClient(user: CurrentUser) {
  return ["client", "manager", "admin"].includes(user.role)
}

export function getRoleRedirect(role: UserRole): string {
  switch (role) {
    case "admin": return "/admin/dashboard"
    case "manager": return "/manager/dashboard"
    default: return "/dashboard"
  }
}

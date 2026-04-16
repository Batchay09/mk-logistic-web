const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"

type RequestOptions = {
  method?: string
  body?: unknown
  headers?: Record<string, string>
  cache?: RequestCache
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: unknown,
  ) {
    super(message)
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options

  const init: RequestInit = {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    cache: options.cache,
  }

  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }

  const res = await fetch(`${API_URL}${path}`, init)

  if (!res.ok) {
    let detail: unknown
    try {
      const json = await res.json()
      detail = json
    } catch {}
    const msg = typeof detail === "object" && detail !== null && "detail" in detail
      ? String((detail as { detail: unknown }).detail)
      : `HTTP ${res.status}`
    throw new ApiError(res.status, msg, detail)
  }

  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

// Shortcuts
export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) =>
    apiRequest<T>(path, { method: "DELETE" }),
}

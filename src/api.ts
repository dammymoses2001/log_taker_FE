export async function api<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  })
  const body = (await response.json().catch(() => ({}))) as T
  return { status: response.status, body }
}

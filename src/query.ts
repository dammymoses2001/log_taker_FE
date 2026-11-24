export const REFRESH_MS = 5_000

export type LogQuery = {
  search?: string
  status?: string
  method?: string
  level?: string
  range?: string
  from?: string
  to?: string
}

export function buildLogsQuery(linkId: string, query: LogQuery): string {
  const params = new URLSearchParams()
  if (query.search?.trim()) params.set('search', query.search.trim())
  if (query.status?.trim()) params.set('status', query.status.trim())
  if (query.method?.trim()) params.set('method', query.method.trim())
  if (query.level?.trim()) params.set('level', query.level.trim())
  if (query.range && query.range !== 'custom') params.set('range', query.range)
  if (query.range === 'custom') {
    if (query.from) params.set('from', new Date(query.from).toISOString())
    if (query.to) params.set('to', new Date(query.to).toISOString())
  }
  const suffix = params.size ? `?${params.toString()}` : ''
  return `/v1/view/${linkId}/logs${suffix}`
}

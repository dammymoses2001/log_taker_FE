const pad = (n: number, width = 2) => String(n).padStart(width, '0')

export function clock(iso: string): { time: string; ms: string } {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { time: '--:--:--', ms: '.---' }
  return {
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
    ms: `.${pad(d.getMilliseconds(), 3)}`,
  }
}

export function ago(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const s = Math.max(0, Math.round((now - t) / 1000))
  if (s < 1) return 'now'
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export function dur(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—'
  if (ms < 1) return '<1ms'
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 10_000) return `${(ms / 1000).toFixed(2)}s`
  return `${(ms / 1000).toFixed(1)}s`
}

export function until(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const diff = t - now
  if (diff <= 0) return 'expired'
  const m = Math.floor(diff / 60_000)
  if (m < 1) return '<1m'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${pad(m % 60)}m`
  return `${Math.floor(h / 24)}d ${pad(h % 24)}h`
}

export function shortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

export function dateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function statusClass(status: number | null): string {
  if (!status) return 'st-0'
  return `st-${Math.floor(status / 100)}`
}

export function levelClass(level: string | null): string {
  if (!level) return ''
  return level === 'error' || level === 'fatal' ? 'lv-error' : level === 'warn' ? 'lv-warn' : ''
}

export function methodTone(method: string | null): string {
  if (!method) return 'muted'
  if (method === 'DELETE') return 'm-err'
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') return 'm-write'
  return ''
}

export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ')

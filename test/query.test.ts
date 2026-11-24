import { describe, expect, it } from 'vitest'
import { buildLogsQuery, REFRESH_MS } from '../src/query'

describe('viewer query', () => {
  it('builds a same-origin log URL and refreshes every five seconds', () => {
    expect(REFRESH_MS).toBe(5000)
    const path = buildLogsQuery('abc', {
      search: 'zephyr',
      status: '2xx',
      method: 'POST',
      level: 'info',
      range: '15m',
    })
    expect(path.startsWith('/v1/view/abc/logs?')).toBe(true)
    expect(path).toContain('search=zephyr')
    expect(path).toContain('status=2xx')
    expect(path).toContain('range=15m')
    expect(path).not.toContain('pin')
  })

  it('sends a custom range as timestamps', () => {
    const path = buildLogsQuery('abc', { range: 'custom', from: '2026-11-23T10:00', to: '2026-11-23T12:00' })
    expect(path).toContain('from=')
    expect(path).toContain('to=')
    expect(path).not.toContain('range=')
  })
})

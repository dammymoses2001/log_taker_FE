import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'
import { Icon } from '../components/Icon'
import { JsonView } from '../components/JsonView'
import { CopyButton, Segmented, ThemeToggle } from '../components/ui'
import { buildLogsQuery, REFRESH_MS, type LogQuery } from '../query'
import { clock, cx, dateTime, dur, levelClass, statusClass } from '../lib/format'

type LogRow = {
  id: string
  ts: string
  level: string | null
  method: string | null
  status: number | null
  route: string | null
  name: string | null
  durationMs: number | null
  msg: string | null
  excerpt: string | null
}

type Payload = {
  request?: { method?: string; path?: string; headers?: Record<string, string>; query?: unknown; body?: unknown }
  response?: { status?: number; headers?: Record<string, string>; body?: unknown }
  timing?: { totalMs?: number; dnsMs?: number; connectMs?: number; ttfbMs?: number }
  runtime?: Record<string, unknown>
}

type Detail = LogRow & {
  requestId?: string | null
  truncated?: boolean
  payload?: Payload
}

type Gate = 'loading' | 'pin' | 'open' | 'invalid' | 'locked'
type Tab = 'request' | 'response' | 'timing'

const EMPTY: LogQuery = { search: '', status: '', method: '', level: '', range: '24h', from: '', to: '' }
const STATUS = [
  { value: '', label: 'All' },
  { value: '2xx', label: '2xx' },
  { value: '3xx', label: '3xx' },
  { value: '4xx', label: '4xx' },
  { value: '5xx', label: '5xx' },
]
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const LEVELS = ['debug', 'info', 'warn', 'error']
const RANGES = [
  { value: '15m', label: '15 min' },
  { value: '1h', label: '1 hour' },
  { value: '24h', label: '24 hours' },
  { value: 'custom', label: 'Custom' },
]

function Headers({ headers }: { headers?: Record<string, string> }) {
  const entries = Object.entries(headers ?? {})
  if (entries.length === 0) return <p className="note">No headers captured.</p>
  return (
    <div className="hlist">
      {entries.map(([key, value]) => (
        <div className="hrow" key={key}>
          <span className="hk">{key}</span>
          <span className="hv">{value === '[REDACTED]' ? <span className="redacted">REDACTED</span> : value}</span>
        </div>
      ))}
    </div>
  )
}

export function Viewer() {
  const { linkId = '' } = useParams()
  const searchRef = useRef<HTMLInputElement | null>(null)

  const [gate, setGate] = useState<Gate>('loading')
  const [pin, setPin] = useState('')
  const [gateMessage, setGateMessage] = useState('')
  const [unlocking, setUnlocking] = useState(false)

  const [query, setQuery] = useState<LogQuery>(EMPTY)
  const [searchText, setSearchText] = useState('')
  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState(0)
  const [live, setLive] = useState(true)

  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState<Detail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('request')

  const path = useMemo(() => buildLogsQuery(linkId, query), [linkId, query])
  const seq = useRef(0)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setQuery((current) => (current.search === searchText ? current : { ...current, search: searchText }))
    }, 250)
    return () => window.clearTimeout(id)
  }, [searchText])

  const load = useCallback(async (quiet = false) => {
    const ticket = ++seq.current
    if (!quiet) setLoading(true)
    const result = await api<{ logs: LogRow[] }>(path)
    if (ticket !== seq.current) return
    if (result.status === 410) return setGate('invalid')
    if (result.status === 401) return setGate('pin')
    if (result.status !== 200) {
      setError('Could not read logs. The link may have just expired.')
      setLoading(false)
      return
    }
    setError('')
    setGate('open')
    setLogs(result.body.logs ?? [])
    setUpdatedAt(Date.now())
    setLoading(false)
  }, [path])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (gate !== 'open' || !live) return
    const id = window.setInterval(() => {
      if (!document.hidden) void load(true)
    }, REFRESH_MS)
    return () => window.clearInterval(id)
  }, [gate, live, load])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    void api<Detail>(`/v1/view/${linkId}/logs/${selectedId}`).then((result) => {
      if (cancelled) return
      setDetailLoading(false)
      if (result.status === 200) setDetail(result.body)
    })
    return () => { cancelled = true }
  }, [selectedId, linkId])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const el = event.target as HTMLElement | null
      const typing = el?.tagName === 'INPUT' || el?.tagName === 'SELECT' || el?.tagName === 'TEXTAREA'
      if (typing) {
        if (event.key === 'Escape') el?.blur()
        return
      }
      if (event.key === '/') {
        event.preventDefault()
        searchRef.current?.focus()
        return
      }
      if (event.key === 'Escape') {
        setSelectedId('')
        return
      }
      if (event.key === 'j' || event.key === 'k') {
        if (logs.length === 0) return
        event.preventDefault()
        const index = logs.findIndex((row) => row.id === selectedId)
        const next = event.key === 'j' ? Math.min(logs.length - 1, index + 1) : Math.max(0, index - 1)
        const row = logs[next]
        if (row) setSelectedId(row.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [logs, selectedId])

  async function unlock(event: FormEvent) {
    event.preventDefault()
    if (!pin.trim()) return
    setUnlocking(true)
    const result = await api(`/v1/view/${linkId}/unlock`, { method: 'POST', body: JSON.stringify({ pin }) })
    setUnlocking(false)
    setPin('')
    if (result.status === 410) return setGate('invalid')
    if (result.status === 429) {
      setGate('locked')
      setGateMessage('Too many attempts. This link is locked for 15 minutes.')
      return
    }
    if (result.status !== 200) {
      setGateMessage('That PIN is not right.')
      return
    }
    setGateMessage('')
    setGate('open')
    void load()
  }

  if (gate === 'invalid') {
    return (
      <div className="gate">
        <div className="gate-card">
          <div className="mark"><span className="mark-tick" /><span className="mark-name">logviewer</span></div>
          <h1>Link unavailable</h1>
          <p>This link has expired or was deleted. Logs stay for seven days — ask the owner for a new link.</p>
          <div className="gate-meta">Nothing was exposed.</div>
        </div>
      </div>
    )
  }

  if (gate === 'pin' || gate === 'locked') {
    return (
      <div className="gate">
        <div className="gate-card">
          <div className="mark"><span className="mark-tick" /><span className="mark-name">logviewer</span></div>
          <h1>Enter the PIN</h1>
          <p>The six-digit PIN was sent in a separate email from the link itself.</p>
          <form onSubmit={(event) => void unlock(event)}>
            <input
              className="pin"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
              autoFocus
              disabled={gate === 'locked'}
              aria-label="Six-digit PIN"
            />
            <button type="submit" className="btn btn-primary" style={{ height: 36 }} disabled={unlocking || gate === 'locked'}>
              {unlocking ? 'Checking…' : 'Unlock logs'}
            </button>
          </form>
          {gateMessage ? (
            <div className="warn-strip" style={{ marginTop: 12 }}>
              <Icon name="alert" size={14} />
              <span>{gateMessage}</span>
            </div>
          ) : null}
          <div className="gate-meta">Link {linkId.slice(0, 6)}… · locked after five wrong tries</div>
        </div>
      </div>
    )
  }

  return (
    <div className="viewer">
      <header className="vbar">
        <span className="mark"><span className="mark-tick" /><span className="mark-name">logviewer</span></span>
        <span className="faint mono" style={{ fontSize: 11 }}>/</span>
        <span className="project">logs <span className="mono">· {linkId.slice(0, 8)}</span></span>
        <div className="vbar-right">
          <span className="expiry"><span className={cx('dot', live && gate === 'open' ? 'live' : '')} />{live ? 'live · 5s' : 'paused'}</span>
          <ThemeToggle />
        </div>
      </header>

      <div className="vquery">
        <div className="vsearch">
          <Icon name="search" size={13} />
          <input
            ref={searchRef}
            placeholder="Search route, message, payload…"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            aria-label="Search logs"
          />
          <span className="kbd">/</span>
        </div>

        <Segmented options={STATUS} value={query.status ?? ''} onChange={(value) => setQuery({ ...query, status: value })} label="Status" />

        <select className="select" value={query.method ?? ''} onChange={(event) => setQuery({ ...query, method: event.target.value })} aria-label="Method">
          <option value="">Any method</option>
          {METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
        </select>

        <select className="select" value={query.level ?? ''} onChange={(event) => setQuery({ ...query, level: event.target.value })} aria-label="Level">
          <option value="">Any level</option>
          {LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
        </select>

        <select className="select" value={query.range ?? '24h'} onChange={(event) => setQuery({ ...query, range: event.target.value })} aria-label="Time range">
          {RANGES.map((range) => <option key={range.value} value={range.value}>{range.label}</option>)}
        </select>

        {query.range === 'custom' ? (
          <>
            <input className="input" type="datetime-local" value={query.from ?? ''} onChange={(event) => setQuery({ ...query, from: event.target.value })} aria-label="From" style={{ height: 30, fontSize: 11 }} />
            <input className="input" type="datetime-local" value={query.to ?? ''} onChange={(event) => setQuery({ ...query, to: event.target.value })} aria-label="To" style={{ height: 30, fontSize: 11 }} />
          </>
        ) : null}

        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setLive(!live)}
          title={live ? 'Pause auto-refresh' : 'Resume auto-refresh'}
          aria-pressed={live}
        >
          <span className={cx('dot', live ? 'live' : '')} />
          {live ? 'Live' : 'Paused'}
        </button>

        <span className="spacer" />
        <span className="vcount"><b>{logs.length}</b> events</span>
      </div>

      <div className={cx('vbody', selectedId && 'open')}>
        <div className="vlist">
          {error ? (
            <div style={{ padding: 18 }}>
              <div className="warn-strip"><Icon name="alert" size={14} /><span>{error}</span></div>
            </div>
          ) : null}

          {loading && logs.length === 0 ? (
            <div style={{ padding: 14, display: 'grid', gap: 8 }}>
              {Array.from({ length: 12 }).map((_, i) => <div key={i} className="sk" style={{ height: 18, width: `${100 - (i % 4) * 9}%` }} />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="empty empty-fill">
              <div className="empty-mark"><Icon name="terminal" size={18} /></div>
              <h3>{query.search || query.status || query.method || query.level ? 'Nothing matches these filters' : 'No events in this window'}</h3>
              <p>
                {query.search || query.status || query.method || query.level
                  ? 'Try a wider time range or clear the filters.'
                  : 'If the app just started, give it a few seconds — this view refreshes every five seconds.'}
              </p>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => { setSearchText(''); setQuery({ ...EMPTY }) }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <table className="vtable">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Route</th>
                  <th style={{ textAlign: 'right' }}>Dur</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => {
                  const t = clock(row.ts)
                  return (
                    <tr
                      key={row.id}
                      className={cx('vrow', levelClass(row.level), selectedId === row.id && 'sel')}
                      onClick={() => { setSelectedId(row.id); setTab('request') }}
                      tabIndex={0}
                      onKeyDown={(event) => { if (event.key === 'Enter') { setSelectedId(row.id); setTab('request') } }}
                    >
                      <td className="c-time" title={dateTime(row.ts)}>{t.time}<span className="ms">{t.ms}</span></td>
                      <td className={cx('c-method', row.method ? `m-${row.method.toLowerCase()}` : '')}>{row.method ?? '—'}</td>
                      <td className={cx('c-status', statusClass(row.status))}>{row.status ?? '—'}</td>
                      <td className="c-route">{row.route ?? row.name ?? '—'}</td>
                      <td className={cx('c-dur', (row.durationMs ?? 0) > 1000 && 'dur-slow')}>{dur(row.durationMs)}</td>
                      <td className="c-msg">{row.msg ?? row.excerpt ?? ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {selectedId ? (
          <aside className="vdetail" aria-label="Event detail">
            <div className="d-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={cx('pill', detail && detail.status !== null && detail.status >= 500 ? 'pill-err' : detail && detail.status !== null && detail.status >= 400 ? 'pill-warn' : 'pill-ok')}>
                  {detail?.status ?? '—'}
                </span>
                <span className="d-route">{detail?.method ?? ''} {detail?.route ?? detail?.name ?? ''}</span>
                <button type="button" className="btn btn-quiet btn-icon" style={{ marginLeft: 'auto' }} onClick={() => setSelectedId('')} aria-label="Close detail">
                  <Icon name="x" size={14} />
                </button>
              </div>
              <div className="d-meta">
                <span><b>{detail ? dateTime(detail.ts) : '—'}</b></span>
                <span>{detail ? dur(detail.durationMs) : '—'}</span>
                <span>{detail?.requestId ? <>req <b>{detail.requestId}</b></> : 'no request id'}</span>
                {detail?.truncated ? <span style={{ color: 'var(--warn)' }}>truncated</span> : null}
              </div>
            </div>

            <div className="d-tabs">
              {(['request', 'response', 'timing'] as Tab[]).map((value) => (
                <button key={value} type="button" className={cx('d-tab', tab === value && 'on')} onClick={() => setTab(value)}>
                  {value}
                </button>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                {detail ? <CopyButton value={JSON.stringify(detail.payload ?? detail, null, 2)} label="Copy JSON" className="btn btn-sm btn-quiet" /> : null}
              </div>
            </div>

            {detailLoading ? (
              <div className="d-body">
                <div className="sk" style={{ height: 14, width: '50%' }} />
                <div className="sk" style={{ height: 120 }} />
              </div>
            ) : detail ? (
              <div className="d-body">
                {tab === 'request' ? (
                  <>
                    <div className="sect">
                      <div className="sect-h"><h3>Headers</h3><span className="rule" /></div>
                      <Headers headers={detail.payload?.request?.headers} />
                    </div>
                    <div className="sect">
                      <div className="sect-h"><h3>Body</h3><span className="rule" /></div>
                      {detail.payload?.request?.body === undefined ? <p className="note">No request body captured.</p> : <JsonView value={detail.payload.request.body} />}
                    </div>
                  </>
                ) : null}

                {tab === 'response' ? (
                  <>
                    <div className="sect">
                      <div className="sect-h"><h3>Headers</h3><span className="rule" /></div>
                      <Headers headers={detail.payload?.response?.headers} />
                    </div>
                    <div className="sect">
                      <div className="sect-h"><h3>Body</h3><span className="rule" /></div>
                      {detail.payload?.response?.body === undefined ? <p className="note">No response body captured.</p> : <JsonView value={detail.payload.response.body} />}
                    </div>
                  </>
                ) : null}

                {tab === 'timing' ? <Timing timing={detail.payload?.timing} total={detail.durationMs} /> : null}

                <div className="sect">
                  <div className="sect-h"><h3>Summary</h3><span className="rule" /></div>
                  <div className="hlist">
                    <div className="hrow"><span className="hk">timestamp</span><span className="hv">{new Date(detail.ts).toISOString()}</span></div>
                    <div className="hrow"><span className="hk">id</span><span className="hv">{detail.id}</span></div>
                    <div className="hrow"><span className="hk">name</span><span className="hv">{detail.name ?? '—'}</span></div>
                    <div className="hrow"><span className="hk">level</span><span className="hv">{detail.level ?? '—'}</span></div>
                    <div className="hrow"><span className="hk">excerpt</span><span className="hv">{detail.excerpt ?? '—'}</span></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="d-body"><p className="note">Could not load this event.</p></div>
            )}
          </aside>
        ) : null}
      </div>

      <footer className="statusbar">
        <span>{updatedAt ? `updated ${clock(new Date(updatedAt).toISOString()).time}` : 'loading'}</span>
        <span className="spacer" />
        <span><span className="kbd">/</span> search</span>
        <span><span className="kbd">j</span> <span className="kbd">k</span> move</span>
        <span><span className="kbd">esc</span> close</span>
        <span className="mono">{linkId.slice(0, 8)}</span>
      </footer>
    </div>
  )
}

function Timing({ timing, total }: { timing?: Payload['timing']; total: number | null }) {
  const rows = [
    { label: 'total', value: total ?? timing?.totalMs ?? 0 },
    { label: 'ttfb', value: timing?.ttfbMs ?? 0 },
    { label: 'connect', value: timing?.connectMs ?? 0 },
    { label: 'dns', value: timing?.dnsMs ?? 0 },
  ]
  const max = Math.max(...rows.map((row) => row.value), 1)
  return (
    <div className="sect">
      <div className="sect-h"><h3>Timing</h3><span className="rule" /></div>
      <div className="hlist">
        {rows.map((row) => (
          <div className="hrow" key={row.label} style={{ gridTemplateColumns: '80px minmax(0, 1fr) 64px' }}>
            <span className="hk">{row.label}</span>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ height: 4, width: `${Math.max(2, (row.value / max) * 100)}%`, background: row.label === 'total' ? 'var(--accent)' : 'var(--line)' }} />
            </span>
            <span className="hv" style={{ textAlign: 'right' }}>{dur(row.value)}</span>
          </div>
        ))}
      </div>
      <p className="note">Timing is reported by the SDK at capture time, not reconstructed later.</p>
    </div>
  )
}

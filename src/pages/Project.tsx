import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { Icon } from '../components/Icon'
import { CopyButton, Modal, Segmented, useNow } from '../components/ui'
import { ago, dateTime, shortDate, until } from '../lib/format'

type KeyRow = { id: string; prefix: string; createdAt: string; revokedAt: string | null }
type LinkRow = { linkId: string; createdAt: string; expiresAt: string; status: 'active' | 'expired' | 'deleted' }
type Expiry = '1h' | '24h' | '48h' | '7d'

const EXPIRY: ReadonlyArray<{ value: Expiry; label: string }> = [
  { value: '1h', label: '1 hour' },
  { value: '24h', label: '24 hours' },
  { value: '48h', label: '48 hours' },
  { value: '7d', label: '7 days' },
]

export function Project() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const now = useNow(15_000)

  const [name, setName] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const [keys, setKeys] = useState<KeyRow[]>([])
  const [links, setLinks] = useState<LinkRow[]>([])
  const [loading, setLoading] = useState(true)

  const [freshKey, setFreshKey] = useState('')
  const [rotating, setRotating] = useState(false)
  const [minting, setMinting] = useState(false)
  const [expires, setExpires] = useState<Expiry>('24h')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState('')
  const confirmTimer = useRef<number | null>(null)

  async function load() {
    const [project, keyList, linkList] = await Promise.all([
      api<{ name: string; createdAt: string }>(`/v1/projects/${id}`),
      api<{ keys: KeyRow[] }>(`/v1/projects/${id}/keys`),
      api<{ links: LinkRow[] }>(`/v1/projects/${id}/links`),
    ])
    setLoading(false)
    if (project.status === 401) return navigate('/login')
    if (project.status === 404) return navigate('/')
    setName(project.body.name ?? '')
    setCreatedAt(project.body.createdAt ?? '')
    setKeys(keyList.body.keys ?? [])
    setLinks(linkList.body.links ?? [])
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function rotate() {
    setRotating(true)
    const result = await api<{ projectKey: string }>(`/v1/projects/${id}/keys/rotate`, { method: 'POST' })
    if (result.status !== 200) {
      setError('Could not rotate the key.')
      return
    }
    setFreshKey(result.body.projectKey)
    await load()
  }

  async function mint(event: FormEvent) {
    event.preventDefault()
    setSending(true)
    setError('')
    const result = await api<{ emailedTo: string }>(`/v1/projects/${id}/links`, {
      method: 'POST',
      body: JSON.stringify({ expires }),
    })
    setSending(false)
    if (result.status === 429) return setError('Link limit reached — five per project per hour.')
    if (result.status !== 201) return setError('Could not create the view link.')
    setMinting(false)
    setNotice(`Link and PIN sent separately to ${result.body.emailedTo}.`)
    await load()
  }

  async function remove(linkId: string) {
    if (confirmDelete !== linkId) {
      setConfirmDelete(linkId)
      if (confirmTimer.current) window.clearTimeout(confirmTimer.current)
      confirmTimer.current = window.setTimeout(() => setConfirmDelete(''), 3200)
      return
    }
    setConfirmDelete('')
    await api(`/v1/projects/${id}/links/${linkId}`, { method: 'DELETE' })
    setNotice('Link deleted. Sessions for it ended; logs are untouched.')
    await load()
  }

  const activeKey = keys.find((key) => key.revokedAt === null)
  const activeLinks = links.filter((link) => link.status === 'active').length
  const origin = typeof window === 'undefined' ? 'https://logviewer.app' : window.location.origin
  const curl = `curl -sX POST ${origin}/v1/logs \\
  -H "authorization: Bearer ${activeKey?.prefix ?? 'lv_…'}_…" \\
  -H "content-type: application/json" \\
  -d '{"logs":[{"level":"info","msg":"hello from my app"}]}'`

  if (loading) {
    return (
      <section>
        <div className="sk" style={{ height: 26, width: 260, marginBottom: 14 }} />
        <div className="split">
          <div className="sk" style={{ height: 220 }} />
          <div className="sk" style={{ height: 220 }} />
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="crumbs">
        <Link to="/">Projects</Link>
        <Icon name="chev" size={12} />
        <span>{name}</span>
      </div>

      <div className="page-head">
        <div>
          <h1 className="page-title">{name}</h1>
          <p className="page-sub">
            <span className="mono">{id}</span> · created {shortDate(createdAt)}
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={() => setRotating(true)}>
            <Icon name="rotate" size={14} />
            Rotate key
          </button>
          <button type="button" className="btn btn-primary" onClick={() => { setMinting(true); setError('') }}>
            <Icon name="link" size={14} />
            New view link
          </button>
        </div>
      </div>

      {notice ? (
        <div className="notice" role="status">
          <Icon name="check" size={14} />
          <span>{notice}</span>
          <button type="button" className="btn btn-quiet btn-icon" style={{ marginLeft: 'auto' }} onClick={() => setNotice('')} aria-label="Dismiss">
            <Icon name="x" size={12} />
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="warn-strip" style={{ marginBottom: 14 }}>
          <Icon name="alert" size={14} />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="split">
        <div className="panel">
          <div className="panel-head">
            <h2>Ingest keys</h2>
            <span className="count">{keys.length}</span>
            <span className="faint mono" style={{ marginLeft: 'auto', fontSize: 10.5 }}>shown once</span>
          </div>
          {keys.length === 0 ? (
            <div className="empty" style={{ padding: '34px 20px' }}>
              <h3>No key yet</h3>
              <p>Create the project again, or rotate to mint a fresh key.</p>
            </div>
          ) : (
            keys.map((key) => (
              <div className="kv-row" key={key.id}>
                <span className={`dot ${key.revokedAt ? '' : 'ok'}`} />
                <div className="k">
                  <div className="key-prefix">{key.prefix}…</div>
                  <div className="key-meta">
                    {key.revokedAt ? `revoked ${dateTime(key.revokedAt)}` : `created ${dateTime(key.createdAt)}`}
                  </div>
                </div>
                <span className={`pill ${key.revokedAt ? '' : 'pill-ok'}`}>{key.revokedAt ? 'revoked' : 'active'}</span>
              </div>
            ))
          )}
          <div className="panel-foot note">
            Rotating revokes the current key immediately. Apps holding the old key stop ingesting until you deploy the new one.
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>View links</h2>
            <span className="count">{activeLinks} active</span>
          </div>

          {links.length === 0 ? (
            <div className="empty" style={{ padding: '34px 20px' }}>
              <h3>No links yet</h3>
              <p>Mint a link to read this project's logs. The PIN arrives in a separate email.</p>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setMinting(true)}>
                <Icon name="link" size={13} /> New view link
              </button>
            </div>
          ) : (
            links.map((link) => (
              <div className="link-row" key={link.linkId}>
                <div style={{ minWidth: 0 }}>
                  <div className="link-id">{link.linkId.slice(0, 10)}…{link.linkId.slice(-4)}</div>
                  <div className="link-exp">
                    made {ago(link.createdAt, now)} ago · expires {dateTime(link.expiresAt)}
                  </div>
                </div>
                <div>
                  <span className={`pill ${link.status === 'active' ? 'pill-ok' : link.status === 'expired' ? 'pill-warn' : ''}`}>
                    {link.status}
                  </span>
                  {link.status === 'active' ? (
                    <div className={`countdown ${new Date(link.expiresAt).getTime() - now < 3_600_000 ? 'soon' : ''}`}>
                      {until(link.expiresAt, now)} left
                    </div>
                  ) : null}
                </div>
                <div className="link-act" style={{ textAlign: 'right' }}>
                  {link.status === 'active' ? (
                    <button
                      type="button"
                      className={`btn btn-sm ${confirmDelete === link.linkId ? 'btn-danger' : 'btn-quiet'}`}
                      onClick={() => void remove(link.linkId)}
                      title="Delete this link early"
                    >
                      {confirmDelete === link.linkId ? 'Sure?' : <Icon name="trash" size={13} />}
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
          <div className="panel-foot note">
            Links work until they expire or are deleted. The PIN is never shown here — it is emailed separately.
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <h2>Send a log</h2>
          <span className="faint mono" style={{ marginLeft: 'auto', fontSize: 10.5 }}>POST /v1/logs</span>
        </div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <pre className="snippet"><code>{curl}</code></pre>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CopyButton value={curl} label="Copy curl" />
            <span className="note">Or install <span className="mono">@logviewer/node</span> and pass the key to the transport.</span>
          </div>
        </div>
      </div>

      {minting ? (
        <Modal
          title="New view link"
          onClose={() => setMinting(false)}
          footer={
            <>
              <span className="note" style={{ marginRight: 'auto' }}>Two emails: link, then PIN.</span>
              <button type="button" className="btn" onClick={() => setMinting(false)}>Cancel</button>
              <button type="submit" form="mint-form" className="btn btn-primary" disabled={sending}>
                {sending ? 'Sending…' : 'Send link'}
              </button>
            </>
          }
        >
          <p className="note">
            The person opening the link needs the six-digit PIN. Both are sent to your verified email — forward them together.
          </p>
          <form id="mint-form" onSubmit={(event) => void mint(event)} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="label">Expiry</span>
            <Segmented options={EXPIRY} value={expires} onChange={setExpires} label="Link expiry" />
            <span className="note">Maximum is 7 days, matching log retention. Five links per project per hour.</span>
          </form>
        </Modal>
      ) : null}

      {rotating ? (
        <Modal
          title="Rotate project key"
          onClose={() => setRotating(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setRotating(false)} style={{ marginLeft: 'auto' }}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={() => void rotate()}>Rotate key</button>
            </>
          }
        >
          <p className="note">
            The current key stops working immediately. Any app still using it will fail to ingest until you deploy the new key —
            so rotate when you can deploy.
          </p>
          <div className="warn-strip">
            <Icon name="alert" size={14} />
            <span>There is no undo. The new key is shown once.</span>
          </div>
        </Modal>
      ) : null}

      {freshKey ? (
        <Modal
          title="New project key"
          onClose={() => setFreshKey('')}
          footer={<button type="button" className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setFreshKey('')}>I have saved this key</button>}
        >
          <div className="key-box">
            <code>{freshKey}</code>
            <CopyButton value={freshKey} label="Copy" />
          </div>
          <div className="warn-strip">
            <Icon name="alert" size={14} />
            <span>Shown once. Store it in your app's environment, never in the repo.</span>
          </div>
        </Modal>
      ) : null}
    </section>
  )
}

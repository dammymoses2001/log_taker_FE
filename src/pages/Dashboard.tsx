import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Icon } from '../components/Icon'
import { CopyButton, Modal } from '../components/ui'
import { ago, shortDate } from '../lib/format'

type ProjectRow = { id: string; name: string; createdAt: string }

export function Dashboard() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [freshKey, setFreshKey] = useState('')
  const [freshName, setFreshName] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    void api<{ projects: ProjectRow[] }>('/v1/projects').then((result) => {
      setLoading(false)
      if (result.status === 401) return navigate('/login')
      if (result.status !== 200) return setError('Could not load projects.')
      setProjects(result.body.projects ?? [])
    })
  }, [navigate])

  useEffect(() => {
    if (creating) inputRef.current?.focus()
  }, [creating])

  async function create(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    const result = await api<ProjectRow & { projectKey?: string }>('/v1/projects', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim() }),
    })
    setBusy(false)
    if (result.status === 401) return navigate('/login')
    if (result.status !== 201 || !result.body.id) return setError('Could not create the project.')
    setProjects((current) => [{ id: result.body.id, name: result.body.name, createdAt: result.body.createdAt }, ...current])
    setFreshKey(result.body.projectKey ?? '')
    setFreshName(result.body.name)
    setName('')
    setCreating(false)
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Workspace</div>
          <h1 className="page-title">Projects</h1>
          <p className="page-sub">One key per app. A key can only write to the project that owns it.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <Icon name="key" size={14} />
            New project
          </button>
        </div>
      </div>

      {error ? (
        <div className="warn-strip" style={{ marginBottom: 14 }}>
          <Icon name="alert" size={14} />
          <span>{error}</span>
        </div>
      ) : null}

      {creating ? (
        <form className="create-bar" onSubmit={(event) => void create(event)}>
          <input
            ref={inputRef}
            className="input"
            placeholder="Project name — e.g. flowly-testbackend"
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
            {busy ? 'Creating…' : 'Create project'}
          </button>
          <button type="button" className="btn btn-quiet" onClick={() => { setCreating(false); setName('') }}>
            Cancel
          </button>
        </form>
      ) : null}

      <div className="panel">
        <div className="panel-head">
          <h2>All projects</h2>
          <span className="count">{projects.length}</span>
          <span className="faint mono" style={{ marginLeft: 'auto', fontSize: 10.5 }}>7-day retention</span>
        </div>

        {loading ? (
          <div style={{ padding: 14, display: 'grid', gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="sk" style={{ height: 34, width: `${88 - i * 10}%` }} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="empty">
            <div className="empty-mark"><Icon name="terminal" size={18} /></div>
            <h3>No projects yet</h3>
            <p>Create a project to get a key. Point the SDK at it, and events appear in a view link.</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
              <Icon name="key" size={13} /> Create the first project
            </button>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Project</th>
                <th className="hide-sm" style={{ width: 230 }}>ID</th>
                <th className="hide-sm" style={{ width: 160 }}>Created</th>
                <th style={{ width: 34 }} />
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.id}
                  tabIndex={0}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  onKeyDown={(event) => { if (event.key === 'Enter') navigate(`/projects/${project.id}`) }}
                >
                  <td>
                    <div className="row-name">{project.name}</div>
                    <div className="row-sub show-sm">{project.id} · {shortDate(project.createdAt)}</div>
                  </td>
                  <td className="mono faint hide-sm" style={{ fontSize: 11 }}>{project.id}</td>
                  <td className="mono faint hide-sm" style={{ fontSize: 11 }}>{shortDate(project.createdAt)}</td>
                  <td><Icon name="chev" size={14} className="chev" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="faint mono" style={{ fontSize: 10.5, marginTop: 14 }}>
        keys are hashed at rest · logs expire after 7 days · view links are PIN-gated
      </p>

      {freshKey ? (
        <Modal
          title="Project key"
          onClose={() => setFreshKey('')}
          footer={
            <button type="button" className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setFreshKey('')}>
              I have saved this key
            </button>
          }
        >
          <p className="note">
            <strong>{freshName}</strong> is ready. This key is shown once — put it in your app's environment now.
          </p>
          <div className="key-box">
            <code>{freshKey}</code>
            <CopyButton value={freshKey} label="Copy" />
          </div>
          <div className="warn-strip">
            <Icon name="alert" size={14} />
            <span>Any app with this key can write logs to this project. Rotate it from the project page if it leaks.</span>
          </div>
        </Modal>
      ) : null}
    </section>
  )
}

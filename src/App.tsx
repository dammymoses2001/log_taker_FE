import { useEffect, useState } from 'react'
import { Link, Outlet, Route, Routes, useNavigate } from 'react-router-dom'
import { api } from './api'
import { Icon } from './components/Icon'
import { ThemeToggle } from './components/ui'
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'
import { Project } from './pages/Project'
import { Viewer } from './pages/Viewer'

type Me = { id: string; email: string }

function Shell() {
  const navigate = useNavigate()
  const [me, setMe] = useState<Me | null>(null)

  useEffect(() => {
    void api<Me>('/v1/me').then((result) => {
      if (result.status === 200) setMe(result.body)
    })
  }, [])

  async function signOut() {
    await api('/v1/auth/logout', { method: 'POST' })
    navigate('/login')
  }

  return (
    <div className="shell">
      <header className="shell-bar">
        <Link to="/" className="mark" aria-label="Logviewer home">
          <span className="mark-tick" />
          <span className="mark-name">logviewer</span>
        </Link>
        <div className="shell-right">
          {me ? <span className="mono faint me" style={{ fontSize: 11, marginRight: 8 }}>{me.email}</span> : null}
          <ThemeToggle />
          <button type="button" className="btn btn-quiet btn-icon" onClick={() => void signOut()} aria-label="Sign out" title="Sign out">
            <Icon name="logout" size={15} />
          </button>
        </div>
      </header>
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  )
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/v/:linkId" element={<Viewer />} />
      <Route element={<Shell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects/:id" element={<Project />} />
      </Route>
    </Routes>
  )
}

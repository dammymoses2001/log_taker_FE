import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Icon } from '../components/Icon'

const SAMPLE = [
  { t: '14:02:11', m: 'POST', s: 201, r: '/api/v1/orders', d: '142ms' },
  { t: '14:02:05', m: 'GET', s: 200, r: '/api/v1/products', d: '64ms' },
  { t: '14:01:58', m: 'POST', s: 422, r: '/api/v1/orders', d: '31ms' },
  { t: '14:01:44', m: 'POST', s: 502, r: '/api/v1/whatsapp/send', d: '2.60s' },
]

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function requestCode(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    const result = await api('/v1/auth/request', { method: 'POST', body: JSON.stringify({ email }) })
    setBusy(false)
    if (result.status === 429) return setError('Too many attempts. Wait a minute, then try again.')
    if (result.status !== 200) return setError('Could not send a sign-in message.')
    setSent(true)
  }

  async function verify(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    const result = await api('/v1/auth/verify', { method: 'POST', body: JSON.stringify({ email, otp }) })
    setBusy(false)
    if (result.status === 429) return setError('Too many attempts. Wait a minute, then try again.')
    if (result.status !== 200) return setError('That code was not accepted.')
    navigate('/')
  }

  return (
    <div className="auth">
      <section className="auth-left">
        <div className="mark">
          <span className="mark-tick" />
          <span className="mark-name">logviewer</span>
        </div>

        <div className="auth-copy">
          <div className="eyebrow" style={{ marginBottom: 14 }}>Log console for your own apps</div>
          <h1>Read the request,<br />not the guesswork.</h1>
          <p>
            Seven days of requests and responses, searchable from one expiring link. Secrets are
            redacted before they leave your process — and again when they land.
          </p>
        </div>

        <div className="auth-demo" aria-hidden="true">
          <div className="cap">
            <span className="dot ok live" />
            flowly-testbackend
            <span style={{ marginLeft: 'auto' }}>live</span>
          </div>
          <table className="mini-table">
            <tbody>
              {SAMPLE.map((row) => (
                <tr key={row.t + row.r}>
                  <td className="mono faint">{row.t}</td>
                  <td className={`mono m-${row.m.toLowerCase()}`}>{row.m}</td>
                  <td className={`mono st-${Math.floor(row.s / 100)}`}>{row.s}</td>
                  <td className="mono">{row.r}</td>
                  <td className="mono faint" style={{ textAlign: 'right' }}>{row.d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="auth-right">
        <div className="auth-form">
          <h2>{sent ? 'Check your email' : 'Sign in'}</h2>
          <p>
            {sent
              ? `We sent a link and a six-digit code to ${email}. Either one signs you in.`
              : 'We email a magic link and a one-time code. Either one works.'}
          </p>

          <form onSubmit={sent ? verify : requestCode}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={sent}
                required
              />
            </div>

            {sent ? (
              <div className="field">
                <label htmlFor="otp">Six-digit code</label>
                <input
                  id="otp"
                  className="input pin-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                  autoFocus
                  required
                />
              </div>
            ) : null}

            <button type="submit" className="btn btn-primary" disabled={busy} style={{ height: 36 }}>
              {busy ? 'Working…' : sent ? 'Sign in' : 'Continue'}
            </button>
          </form>

          {error ? (
            <div className="warn-strip" style={{ marginTop: 12 }}>
              <Icon name="alert" size={14} />
              <span>{error}</span>
            </div>
          ) : null}

          {sent ? (
            <button
              type="button"
              className="btn btn-quiet btn-sm"
              style={{ marginTop: 12, paddingLeft: 0 }}
              onClick={() => { setSent(false); setOtp(''); setError('') }}
            >
              Use a different email
            </button>
          ) : null}

          <p className="auth-foot">
            No passwords. Owner sessions end after 12 hours.<br />
            View links are PIN-protected and expire.
          </p>
        </div>
      </section>
    </div>
  )
}

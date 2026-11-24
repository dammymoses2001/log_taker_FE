import type { ReactNode } from 'react'

const TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g

function isRedacted(text: string): boolean {
  return text === '"[REDACTED]"' || text === '"•••"' || text === '"[redacted]"'
}

export function JsonView({ value }: { value: unknown }) {
  let text: string
  try {
    text = JSON.stringify(value ?? null, null, 2) ?? 'null'
  } catch {
    text = String(value)
  }

  const out: ReactNode[] = []
  let last = 0
  let i = 0
  TOKEN.lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = TOKEN.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index))
    const [full, str, colon, literal, num] = match

    if (str !== undefined) {
      if (isRedacted(str)) {
        out.push(<span className="redacted" key={i++}>REDACTED</span>)
      } else if (colon !== undefined) {
        out.push(<span className="j-key" key={i++}>{str}</span>)
        out.push(<span className="j-punc" key={i++}>{colon}</span>)
      } else {
        out.push(<span className="j-str" key={i++}>{str}</span>)
      }
    } else if (literal !== undefined) {
      out.push(
        <span className={literal === 'null' ? 'j-null' : 'j-bool'} key={i++}>
          {literal}
        </span>,
      )
    } else if (num !== undefined) {
      out.push(<span className="j-num" key={i++}>{num}</span>)
    } else if (full) {
      out.push(full)
    }
    last = match.index + full.length
  }
  if (last < text.length) out.push(text.slice(last))

  return (
    <div className="json">
      <pre>{out}</pre>
    </div>
  )
}

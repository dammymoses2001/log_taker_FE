import type { ReactNode } from 'react'

type IconName =
  | 'search'
  | 'chev'
  | 'copy'
  | 'check'
  | 'x'
  | 'key'
  | 'link'
  | 'rotate'
  | 'trash'
  | 'sun'
  | 'moon'
  | 'alert'
  | 'terminal'
  | 'back'
  | 'arrow'
  | 'clock'
  | 'logout'

const paths: Record<IconName, ReactNode> = {
  search: (
    <>
      <circle cx="7.2" cy="7.2" r="4.4" />
      <path d="m10.6 10.6 3.1 3.1" />
    </>
  ),
  chev: <path d="m6.5 4 4 4-4 4" />,
  copy: (
    <>
      <rect x="5.5" y="5.5" width="7" height="7" rx="1.2" />
      <path d="M3.5 10.5v-6a1 1 0 0 1 1-1h6" />
    </>
  ),
  check: <path d="m3.5 8.5 3 3 6-6.5" />,
  x: <path d="m4 4 8 8M12 4l-8 8" />,
  key: (
    <>
      <circle cx="6.2" cy="9.8" r="2.7" />
      <path d="m8.2 7.8 6-6M11.4 4.6l2 2M13 3l2 2" />
    </>
  ),
  link: (
    <>
      <path d="M6.8 9.2a3 3 0 0 1 0-4.2l1.4-1.4a3 3 0 0 1 4.2 4.2l-.8.8" />
      <path d="M9.2 6.8a3 3 0 0 1 0 4.2l-1.4 1.4a3 3 0 0 1-4.2-4.2l.8-.8" />
    </>
  ),
  rotate: (
    <>
      <path d="M13 8a5 5 0 1 1-1.6-3.7" />
      <path d="M13 2.5V5h-2.5" />
    </>
  ),
  trash: (
    <>
      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.1a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-8.1" />
    </>
  ),
  sun: (
    <>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" />
    </>
  ),
  moon: <path d="M13 9.3A5.4 5.4 0 0 1 6.7 3 5.6 5.6 0 1 0 13 9.3Z" />,
  alert: (
    <>
      <path d="M8 2.5 14 13H2Z" />
      <path d="M8 6.5v3M8 11.2v.1" />
    </>
  ),
  terminal: (
    <>
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="m4.5 6.5 2 1.8-2 1.8M8.5 10.5h3" />
    </>
  ),
  back: <path d="M12.5 8h-9M7 4.5 3.5 8 7 11.5" />,
  arrow: <path d="M8 2.5v11M3.5 9 8 13.5 12.5 9" />,
  clock: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5v3.2l2 1.3" />
    </>
  ),
  logout: (
    <>
      <path d="M10 3.5H3.5v9H10" />
      <path d="M7.5 8h6M11 5.5 13.5 8 11 10.5" />
    </>
  ),
}

export function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className ? `ic ${className}` : 'ic'}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

/** Roadsmith mark: a guide sign with a road running to the horizon. */
export function Mark({ className = 'rs-mark' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="7" fill="#0e6b4f" />
      <rect x="3" y="3" width="26" height="26" rx="5" fill="none" stroke="#fff" strokeWidth="1.5" />
      <path d="M9 27 L14.5 8 M23 27 L17.5 8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16 25v-3 M16 18.5v-2.5 M16 13v-2" stroke="#e8a317" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

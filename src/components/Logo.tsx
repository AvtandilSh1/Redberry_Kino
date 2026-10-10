export function Logo() {
  return (
    <span className="logo">
      <svg className="logo-mark" viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r="18" fill="#ff3b30" />
        <path
          d="M8 20.5c6.2-1.2 9.4-4.6 11.2-8.8.4 2.8 1.6 5.2 4.4 7.2-3.2.6-5.6 2-7.4 4.6-1.2-2.2-3.4-3.4-8.2-3Z"
          fill="#fff"
        />
        <circle cx="25.2" cy="9.2" r="1.3" fill="#fff" />
      </svg>
      <span className="logo-word">
        KINO <em>XII</em>
      </span>
    </span>
  )
}

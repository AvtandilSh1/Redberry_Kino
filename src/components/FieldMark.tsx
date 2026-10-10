import { CheckIcon } from './Icons'

export function FieldMark({ tone }: { tone: string }) {
  if (tone.includes('is-invalid')) {
    return (
      <span className="field-mark is-error" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16.5v.01" />
        </svg>
      </span>
    )
  }
  if (tone.includes('is-valid')) {
    return (
      <span className="field-mark" aria-hidden="true">
        <CheckIcon size={16} />
      </span>
    )
  }
  return null
}

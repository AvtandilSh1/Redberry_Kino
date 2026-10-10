type SectionStateProps = {
  title: string
  message: string
  onRetry?: () => void
}

export function SectionMessage({ title, message, onRetry }: SectionStateProps) {
  return (
    <section className="band">
      <div className="band-head">
        <h2>{title}</h2>
      </div>
      <div className="state-card">
        <p>{message}</p>
        {onRetry && (
          <button type="button" className="btn btn-ghost" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </section>
  )
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="card-row" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="skeleton-card" key={index}>
          <div className="skeleton poster" />
          <div className="skeleton line" />
          <div className="skeleton line short" />
        </div>
      ))}
    </div>
  )
}

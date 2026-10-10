type AgeBadgeProps = {
  code: string
  description?: string
}

export function AgeBadge({ code, description }: AgeBadgeProps) {
  const tone = code.replace('+', '')
  return (
    <span className={`age-badge age-${tone}`} title={description}>
      {code}
    </span>
  )
}

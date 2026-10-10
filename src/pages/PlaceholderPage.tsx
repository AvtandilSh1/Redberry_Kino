type PlaceholderPageProps = {
  title: string
  body: string
}

export function PlaceholderPage({ title, body }: PlaceholderPageProps) {
  return (
    <main className="placeholder">
      <p className="eyebrow">Next section</p>
      <h1>{title}</h1>
      <p>{body}</p>
    </main>
  )
}

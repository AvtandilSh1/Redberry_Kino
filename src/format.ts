export function formatRuntime(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}m`
  if (rest === 0) return `${hours}h`
  return `${hours}h ${rest}m`
}

export function formatPrice(amount: number) {
  const value = Number.isInteger(amount) ? String(amount) : amount.toFixed(2)
  return `₾${value}`
}

export function formatMinutes(minutes: number) {
  return `${minutes} min`
}

export function genreLine(genres: { name: string }[], minutes: number) {
  const genre = genres[0]?.name
  return genre ? `${genre} · ${formatMinutes(minutes)}` : formatMinutes(minutes)
}

export function formatDayMonth(isoDate: string, month: 'long' | 'short' = 'long') {
  const date = new Date(`${isoDate.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return isoDate
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month }).format(date)
}

export function formatShowDate(isoDate: string, style: 'long' | 'short' = 'long') {
  const date = new Date(`${isoDate.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return isoDate
  const parts = new Intl.DateTimeFormat('en-GB', { weekday: style, day: 'numeric', month: style }).formatToParts(date)
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('weekday')} ${part('day')} ${part('month')}`
}

export function formatReleaseDate(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return isoDate
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

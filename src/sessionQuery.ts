export type SessionFilters = {
  date: string
  venues: string[]
  formats: string[]
  languages: string[]
  bands: string[]
  search: string
  sort: string
  page: number
}

export function todayIso() {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function upcomingDates(count = 7) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date()
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() + index)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${date.getFullYear()}-${month}-${day}`
  })
}

function readList(params: URLSearchParams, keys: string[]) {
  const values: string[] = []
  keys.forEach((key) => {
    params.getAll(key).forEach((value) => {
      value.split(',').forEach((part) => {
        const item = part.trim()
        if (item && !values.includes(item)) values.push(item)
      })
    })
  })
  return values
}

export function readFilters(params: URLSearchParams): SessionFilters {
  const page = Number(params.get('page') || '1')
  return {
    date: params.get('date') || todayIso(),
    venues: readList(params, ['venues', 'venues[]', 'venue']),
    formats: readList(params, ['formats', 'formats[]', 'format']),
    languages: readList(params, ['languages', 'languages[]', 'language']),
    bands: readList(params, ['bands', 'bands[]', 'band']),
    search: params.get('search') ?? '',
    sort: params.get('sort') || 'time_asc',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}

export function writeFilters(filters: SessionFilters, defaults: { date: string; sort: string }) {
  const params = new URLSearchParams()
  if (filters.date && filters.date !== defaults.date) params.set('date', filters.date)
  filters.venues.forEach((value) => params.append('venues', value))
  filters.formats.forEach((value) => params.append('formats', value))
  filters.languages.forEach((value) => params.append('languages', value))
  filters.bands.forEach((value) => params.append('bands', value))
  if (filters.search.trim()) params.set('search', filters.search.trim())
  if (filters.sort && filters.sort !== defaults.sort) params.set('sort', filters.sort)
  if (filters.page > 1) params.set('page', String(filters.page))
  return params
}

export function toApiQuery(filters: SessionFilters) {
  const params = new URLSearchParams()
  params.set('date', filters.date)
  filters.venues.forEach((value) => params.append('venues[]', value))
  filters.formats.forEach((value) => params.append('formats[]', value))
  filters.languages.forEach((value) => params.append('languages[]', value))
  filters.bands.forEach((value) => params.append('bands[]', value))
  if (filters.search.trim()) params.set('search', filters.search.trim().slice(0, 100))
  params.set('sort', filters.sort || 'time_asc')
  params.set('page', String(filters.page))
  return params
}

export function activeFilterCount(filters: SessionFilters) {
  return (
    filters.venues.length +
    filters.formats.length +
    filters.languages.length +
    filters.bands.length +
    (filters.search.trim() ? 1 : 0)
  )
}

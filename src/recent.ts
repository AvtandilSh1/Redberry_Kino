import type { Movie } from './types'

const STORAGE_KEY = 'kinoxii.recent'
const LIMIT = 10

export type RecentMovie = {
  slug: string
  title: string
  posterUrl: string
  runtimeMinutes: number
  fromPrice: number
  releaseDate: string
  isComingSoon: boolean
  ageCode: string
  ageDescription: string
  genre?: string
}

export function readRecent(): RecentMovie[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentMovie[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function toRecent(movie: Movie): RecentMovie {
  return {
    slug: movie.slug,
    title: movie.title,
    posterUrl: movie.posterUrl,
    runtimeMinutes: movie.runtimeMinutes,
    fromPrice: movie.fromPrice,
    releaseDate: movie.releaseDate,
    isComingSoon: movie.isComingSoon,
    ageCode: movie.ageRating.code,
    ageDescription: movie.ageRating.description,
    genre: movie.genres[0]?.name,
  }
}

export function rememberMovie(movie: RecentMovie) {
  const next = [movie, ...readRecent().filter((item) => item.slug !== movie.slug)].slice(0, LIMIT)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('kinoxii-recent'))
  return next
}

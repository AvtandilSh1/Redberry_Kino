import type { Movie, MovieListResponse } from './types'

const API_URL = 'https://api.kinoxii.redberryinternship.ge/api'

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`)
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

export function getFeaturedMovies() {
  return getJson<MovieListResponse>('/movies/featured')
}

export function getNowPlaying(limit = 8) {
  return getJson<MovieListResponse>(`/movies/now-playing?limit=${limit}`)
}

export function getComingSoon() {
  return getJson<MovieListResponse>('/movies/coming-soon')
}

export function searchMovies(query: string) {
  const params = new URLSearchParams({ q: query })
  return getJson<MovieListResponse>(`/search?${params.toString()}`)
}

export type { Movie }

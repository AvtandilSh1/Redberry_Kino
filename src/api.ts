import { readToken } from './session'
import type { AuthPayload, Movie, MovieListResponse, User } from './types'

const API_URL = 'https://api.kinoxii.redberryinternship.ge/api'

export class ApiError extends Error {
  status: number
  fieldErrors: Record<string, string>

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function authHeader(): HeadersInit {
  const token = readToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function readError(response: Response) {
  let message = `Request failed (${response.status})`
  const fieldErrors: Record<string, string> = {}
  try {
    const body = (await response.json()) as {
      message?: string
      errors?: Record<string, string[]>
    }
    if (body.message) message = body.message
    for (const [key, messages] of Object.entries(body.errors ?? {})) {
      if (messages[0]) fieldErrors[key] = messages[0]
    }
  } catch {
    // Some failures return an empty body.
  }
  return new ApiError(response.status, message, fieldErrors)
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Accept: 'application/json', ...authHeader() },
  })
  if (!response.ok) throw await readError(response)
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

export async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!response.ok) throw await readError(response)
  return response.json() as Promise<AuthPayload>
}

export async function register(input: {
  username: string
  email: string
  password: string
  passwordConfirmation: string
  avatar: File | null
}) {
  const body = new FormData()
  body.append('username', input.username)
  body.append('email', input.email)
  body.append('password', input.password)
  body.append('password_confirmation', input.passwordConfirmation)
  if (input.avatar) body.append('avatar', input.avatar)

  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body,
  })
  if (!response.ok) throw await readError(response)
  return response.json() as Promise<AuthPayload>
}

export async function logout() {
  const response = await fetch(`${API_URL}/logout`, {
    method: 'POST',
    headers: { Accept: 'application/json', ...authHeader() },
  })
  if (!response.ok && response.status !== 401) throw await readError(response)
}

export async function getMe() {
  const response = await fetch(`${API_URL}/me`, {
    headers: { Accept: 'application/json', ...authHeader() },
  })
  if (!response.ok) throw await readError(response)
  const body = (await response.json()) as { data: User }
  return body.data
}

export async function notifyMovie(slug: string) {
  const response = await fetch(`${API_URL}/movies/${slug}/notify`, {
    method: 'POST',
    headers: { Accept: 'application/json', ...authHeader() },
  })
  if (!response.ok) throw await readError(response)
}

export type { Movie }

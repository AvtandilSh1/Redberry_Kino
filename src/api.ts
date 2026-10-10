import { readToken } from './session'
import type {
  AuthPayload,
  FilterOptions,
  Movie,
  MovieDetail,
  MovieListResponse,
  Order,
  SeatHold,
  SeatMap,
  SessionDetail,
  SessionsResponse,
  User,
  VenueSessionGroup,
} from './types'

const API_URL = 'https://api.kinoxii.redberryinternship.ge/api'

export class ApiError extends Error {
  status: number
  fieldErrors: Record<string, string>
  contested: string[]

  constructor(
    status: number,
    message: string,
    fieldErrors: Record<string, string> = {},
    contested: string[] = [],
  ) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
    this.contested = contested
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
      contested?: string[]
    }
    if (body.message) message = body.message
    for (const [key, messages] of Object.entries(body.errors ?? {})) {
      if (messages[0]) fieldErrors[key] = messages[0]
    }
    const contested = Array.isArray(body.contested) ? body.contested.filter((code) => typeof code === 'string') : []
    return new ApiError(response.status, message, fieldErrors, contested)
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

export function getMovie(slug: string) {
  return getJson<{ data: MovieDetail }>(`/movies/${encodeURIComponent(slug)}`)
}

export function getMovieSessions(slug: string, date: string) {
  const params = new URLSearchParams({ date })
  return getJson<{ data: VenueSessionGroup[] }>(`/movies/${encodeURIComponent(slug)}/sessions?${params.toString()}`)
}

export function getFilterOptions() {
  return getJson<{ data: FilterOptions }>('/filter-options')
}

export function getSessions(query: URLSearchParams) {
  return getJson<SessionsResponse>(`/sessions?${query.toString()}`)
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

export function getSession(sessionId: number) {
  return getJson<{ data: SessionDetail }>(`/sessions/${sessionId}`)
}

export function getSeatMap(sessionId: number) {
  return getJson<{ data: SeatMap }>(`/sessions/${sessionId}/seats`)
}

export async function createHold(sessionId: number, seats: { seatId: number; ticketType: string }[]) {
  const response = await fetch(`${API_URL}/sessions/${sessionId}/holds`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ seats }),
  })
  if (!response.ok) throw await readError(response)
  return response.json() as Promise<{ data: SeatHold }>
}

export function getHold(holdId: string) {
  return getJson<{ data: SeatHold }>(`/holds/${holdId}`)
}

export async function releaseHold(holdId: string) {
  const response = await fetch(`${API_URL}/holds/${holdId}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json', ...authHeader() },
  })
  if (!response.ok && response.status !== 404) throw await readError(response)
}

export async function updateProfile(input: {
  fullName: string
  mobileNumber: string
  dateOfBirth: string
  preferredVenueId: string
}) {
  const body = new FormData()
  body.append('fullName', input.fullName)
  body.append('mobileNumber', input.mobileNumber)
  body.append('dateOfBirth', input.dateOfBirth)
  body.append('preferredVenueId', input.preferredVenueId)
  const response = await fetch(`${API_URL}/profile`, {
    method: 'PUT',
    headers: { Accept: 'application/json', ...authHeader() },
    body,
  })
  if (!response.ok) throw await readError(response)
  return response.json() as Promise<{ data: User }>
}

export function getTickets(filter: 'upcoming' | 'past') {
  return getJson<{ data: Order[] }>(`/tickets?filter=${filter}`)
}

export async function refundOrder(reference: string) {
  const response = await fetch(`${API_URL}/orders/${encodeURIComponent(reference)}/refund`, {
    method: 'POST',
    headers: { Accept: 'application/json', ...authHeader() },
  })
  if (!response.ok) throw await readError(response)
  return response.json() as Promise<{ data: Order }>
}

export async function createOrder(input: {
  holdId: string
  fullName: string
  email: string
  mobileNumber: string
  cardNumber: string
  expiry: string
  cvv: string
}) {
  const response = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(input),
  })
  if (!response.ok) throw await readError(response)
  return response.json() as Promise<{ data: Order }>
}

export type { Movie }

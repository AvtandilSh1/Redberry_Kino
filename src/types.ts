export type AgeRating = {
  code: string
  minAge: number
  description: string
}

export type Genre = {
  id: number
  slug: string
  name: string
}

export type Format = {
  id: number
  slug: string
  name: string
  priceUplift: number
}

export type Venue = {
  id: number
  slug: string
  name: string
  city: string
  formats: Format[]
}

export type Language = {
  id: number
  slug: string
  name: string
  code: string
}

export type NamedOption = {
  id: string
  label: string
}

export type TicketType = {
  id: number
  slug: string
  name: string
  priceRatio: number
  note: string | null
  blockedFromRatingAge: number | null
}

export type FilterOptions = {
  venues: Venue[]
  formats: Format[]
  languages: Language[]
  timeBands: NamedOption[]
  sorts: NamedOption[]
  ticketTypes: TicketType[]
  maxSeatsPerOrder: number
  holdMinutes: number
}

export type SessionItem = {
  id: number
  time: string
  price: number
  seatsLeft: number
  isSoldOut: boolean
  hall: { id: number; name: string }
  venue: { id: number; slug: string; name: string; city: string }
  format: Format
  language: Language
}

export type SessionGroup = {
  movie: Movie
  sessions: SessionItem[]
}

export type SessionsResponse = {
  data: SessionGroup[]
  meta: {
    currentPage: number
    lastPage: number
    perPage: number
    totalSessions: number
    totalMovies: number
    date: string
  }
}

export type Movie = {
  id: number
  slug: string
  title: string
  kind: string
  runtimeMinutes: number
  posterUrl: string
  backdropUrl: string
  releaseDate: string
  isComingSoon: boolean
  isNotified: boolean
  isFeatured: boolean
  fromPrice: number
  ageRating: AgeRating
  genres: Genre[]
  formats: Format[]
  synopsis?: string
}

export type MovieDetail = Movie & {
  synopsis: string
  director: string | null
  cast: string | null
  availableDates: string[]
}

export type VenueSessionGroup = {
  venue: { id: number; slug: string; name: string; city: string }
  sessions: SessionItem[]
}

export type SessionDetail = SessionItem & {
  date: string
  startsAt: string
  movie: Movie
}

export type MovieListResponse = {
  data: Movie[]
}

export type User = {
  id: number
  username: string
  email: string
  avatar: string | null
  fullName: string | null
  mobileNumber: string | null
  dateOfBirth: string | null
  age: number | null
  preferredVenue: { id: number; slug: string; name: string; city: string } | null
  profileComplete: boolean
}

export type Seat = {
  id: number
  code: string
  label: string
  state: 'available' | 'sold' | 'held' | 'unavailable'
  aisleAfter: boolean
  isMine: boolean
}

export type SeatMap = {
  sessionId: number
  hall: { id: number; name: string; venue: { id: number; slug: string; name: string; city: string } }
  sections: { name: string; rows: { label: string; seats: Seat[] }[] }[]
}

export type SeatHold = {
  holdId: string
  sessionId: number
  expiresAt: string
  secondsRemaining: number
  isLive: boolean
  subtotal: number
  seats: { seatId: number; code: string; ticketType: { slug: string; name: string }; price: number }[]
}

export type Order = {
  id: number
  reference: string
  status: string
  totalPrice: number
  paidAt: string
  refundedAt: string | null
  cardLastFour: string
  isUpcoming: boolean
  isRefundable: boolean
  contact: { fullName: string; email: string; mobileNumber: string }
  session: SessionDetail
  tickets: { id: number; seatCode: string; ticketType: { slug: string; name: string }; price: number }[]
}

export type AuthPayload = {
  data: {
    user: User
    token: string
  }
}

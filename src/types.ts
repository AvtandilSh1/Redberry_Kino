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

export type AuthPayload = {
  data: {
    user: User
    token: string
  }
}

import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ApiError, getMovie, getMovieSessions, notifyMovie } from '../api'
import { useAuth } from '../auth'
import { TicketIcon, TimerIcon } from '../components/Icons'
import { formatDayMonth, formatMinutes, formatPrice, formatReleaseDate } from '../format'
import { rememberMovie, toRecent } from '../recent'
import { todayIso, upcomingDates } from '../sessionQuery'
import type { MovieDetail, SessionItem, User, VenueSessionGroup } from '../types'

function dayParts(iso: string) {
  const date = new Date(`${iso}T12:00:00`)
  return {
    weekday: date.toLocaleDateString('en-GB', { weekday: 'short' }),
    day: date.getDate(),
  }
}

function chosenDate(available: string[], requested: string | null) {
  const days = upcomingDates()
  if (requested && days.includes(requested)) return requested
  const today = todayIso()
  if (available.includes(today)) return today
  return days.find((day) => available.includes(day)) ?? today
}

function isTooYoung(user: User | null, movie: MovieDetail) {
  if (!user || user.age == null) return false
  return movie.ageRating.minAge >= 16 && user.age < movie.ageRating.minAge
}

export function MoviePage({ backdrop }: { backdrop?: { slug: string; date: string } }) {
  const { slug: routeSlug = '' } = useParams()
  const slug = backdrop?.slug ?? routeSlug
  const fixedDate = backdrop?.date
  const [params, setParams] = useSearchParams()
  const { user, requireAuth } = useAuth()
  const [movie, setMovie] = useState<MovieDetail | null>(null)
  const [groups, setGroups] = useState<VenueSessionGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [error, setError] = useState('')
  const [sessionsError, setSessionsError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [notified, setNotified] = useState(false)
  const [notifyPending, setNotifyPending] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setMovie(null)
    getMovie(slug)
      .then((response) => {
        if (cancelled) return
        setMovie(response.data)
        setNotified(response.data.isNotified)
        rememberMovie(toRecent(response.data))
        setLoading(false)
      })
      .catch((reason: unknown) => {
        if (cancelled) return
        setLoading(false)
        if (reason instanceof ApiError && reason.status === 404) {
          setError('We could not find this film.')
          return
        }
        setError(reason instanceof ApiError ? reason.message : 'We could not load this film. Try again.')
      })
    return () => {
      cancelled = true
    }
  }, [slug, reloadKey])

  const date = movie ? fixedDate ?? chosenDate(movie.availableDates, params.get('date')) : ''

  useEffect(() => {
    if (!movie || fixedDate) return
    const requested = params.get('date')
    const days = upcomingDates()
    if (requested && days.includes(requested)) return
    const nextDate = chosenDate(movie.availableDates, null)
    const next = new URLSearchParams(params)
    if (nextDate === todayIso()) next.delete('date')
    else next.set('date', nextDate)
    if (next.toString() !== params.toString()) setParams(next, { replace: true })
  }, [movie, params, setParams, fixedDate])

  useEffect(() => {
    if (!movie || !date) return
    let cancelled = false
    setSessionsLoading(true)
    setSessionsError('')
    getMovieSessions(movie.slug, date)
      .then((response) => {
        if (cancelled) return
        setGroups(response.data)
        setSessionsLoading(false)
      })
      .catch((reason: unknown) => {
        if (cancelled) return
        setGroups([])
        setSessionsLoading(false)
        setSessionsError(reason instanceof ApiError ? reason.message : 'We could not load showtimes. Try again.')
      })
    return () => {
      cancelled = true
    }
  }, [movie, date, reloadKey])

  function selectDate(iso: string) {
    const next = new URLSearchParams(params)
    const implicit = chosenDate(movie?.availableDates ?? [], null)
    if (iso === implicit && iso === todayIso()) next.delete('date')
    else next.set('date', iso)
    setParams(next)
  }

  if (loading) {
    return (
      <main className="film" aria-busy="true">
        <div className="skeleton film-skeleton" />
      </main>
    )
  }

  if (error || !movie) {
    return (
      <main className="film film-error">
        <div className="state-card">
          <p>{error || 'We could not load this film. Try again.'}</p>
          <button type="button" className="btn btn-ghost" onClick={() => setReloadKey((value) => value + 1)}>
            Try again
          </button>
        </div>
      </main>
    )
  }

  const blocked = isTooYoung(user, movie)
  const days = upcomingDates()
  const sessionCount = groups.reduce((total, group) => total + group.sessions.length, 0)

  return (
    <main className="film" inert={Boolean(backdrop)} aria-hidden={backdrop ? true : undefined}>
      <section className="film-hero">
        {movie.backdropUrl && <img className="film-backdrop" src={movie.backdropUrl} alt="" />}
        <div className="film-hero-shade" />
        <div className="film-hero-inner">
          {movie.posterUrl && <img className="film-poster" src={movie.posterUrl} alt={`${movie.title} poster`} />}
          <div className="film-copy">
            <p className="hero-eyebrow">{movie.isComingSoon ? `In cinemas ${formatDayMonth(movie.releaseDate)}` : 'Now playing'}</p>
            <h1>{movie.title}</h1>
            {movie.synopsis && <p className="film-synopsis">{movie.synopsis}</p>}
            <div className="hero-tags">
              <span className="tag tag-red" title={movie.ageRating.description}>
                {movie.ageRating.code}
              </span>
              <span className="tag">
                <TimerIcon size={14} />
                {formatMinutes(movie.runtimeMinutes)}
              </span>
              {movie.genres.slice(0, 2).map((genre) => (
                <span key={genre.id} className="tag">
                  {genre.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="film-body">
      <section className="film-sessions" aria-labelledby="showtimes-heading">
        <h2 id="showtimes-heading">Sessions</h2>
        <div className="film-dates">
          {days.map((iso) => {
            const parts = dayParts(iso)
            const open = movie.availableDates.includes(iso)
            return (
              <button
                key={iso}
                type="button"
                aria-pressed={iso === date}
                className={iso === date ? 'film-date is-selected' : 'film-date'}
                disabled={!open}
                title={open ? undefined : 'No sessions'}
                onClick={() => selectDate(iso)}
              >
                <span>{parts.weekday}</span>
                <strong>{parts.day}</strong>
              </button>
            )
          })}
        </div>

        {movie.isComingSoon && (
          <div className="state-card film-notify">
            <p>This film is coming soon, so there are no showtimes yet.</p>
            <button
              type="button"
              className="btn btn-solid btn-sm"
              disabled={notified || notifyPending}
              onClick={() => {
                requireAuth(async () => {
                  setNotifyPending(true)
                  try {
                    await notifyMovie(movie.slug)
                    setNotified(true)
                    setNotice('')
                  } catch (reason) {
                    if (reason instanceof ApiError && reason.status === 401) throw reason
                    setNotice(reason instanceof Error ? reason.message : 'Could not save the notification.')
                  } finally {
                    setNotifyPending(false)
                  }
                })
              }}
            >
              {notified ? 'Notified' : 'Notify Me'}
            </button>
          </div>
        )}
        {notice && <p className="inline-note">{notice}</p>}

        {blocked && (
          <div className="state-card age-block">
            <p>This film is rated {movie.ageRating.code}. You cannot buy tickets for it with this account.</p>
          </div>
        )}

        {sessionsLoading && <div className="skeleton session-skeleton" />}
        {sessionsError && (
          <div className="state-card">
            <p>{sessionsError}</p>
            <button type="button" className="btn btn-ghost" onClick={() => setReloadKey((value) => value + 1)}>
              Try again
            </button>
          </div>
        )}
        {!movie.isComingSoon && !sessionsLoading && !sessionsError && sessionCount === 0 && (
          <div className="state-card">
            <p>No sessions on this day. Pick another date.</p>
          </div>
        )}
        {!sessionsLoading && !sessionsError && sessionCount > 0 && (
          <div className="venue-list">
            {groups.map((group) => (
              <section className="venue-block" key={group.venue.slug}>
                <h3>{group.venue.name}</h3>
                <div className="hall-cards">
                  {byHall(group.sessions).map(([hall, sessions]) => (
                    <div className="hall-card" key={hall}>
                      <h4>Hall {hall}</h4>
                      <div className="hall-tickets">
                        {sessions.map((session) => {
                          const closed = blocked || session.isSoldOut
                          const body = (
                            <>
                              <span className="ticket-main">
                                <b>{session.time}</b>
                                <span>
                                  <span title={session.language.name}>{session.language.code}</span>
                                  <em>{session.format.name}</em>
                                </span>
                              </span>
                              <span className="ticket-stub">
                                <strong>{formatPrice(session.price)}</strong>
                                <small>
                                  {session.isSoldOut ? (
                                    'Sold out'
                                  ) : (
                                    <>
                                      <TicketIcon size={12} />
                                      {session.seatsLeft} left
                                    </>
                                  )}
                                </small>
                              </span>
                            </>
                          )
                          if (closed) {
                            return (
                              <button key={session.id} type="button" className="ticket-time is-disabled" disabled>
                                {body}
                              </button>
                            )
                          }
                          return (
                            <Link key={session.id} className="ticket-time" to={`/sessions/${session.id}/seats`}>
                              {body}
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      <aside className="film-details" aria-labelledby="details-heading">
        <h2 id="details-heading">Details</h2>
        <dl>
          {movie.director && (
            <div>
              <dt>Director</dt>
              <dd>{movie.director}</dd>
            </div>
          )}
          {movie.cast && (
            <div>
              <dt>Main cast</dt>
              <dd>{movie.cast}</dd>
            </div>
          )}
          <div>
            <dt>Duration</dt>
            <dd>{movie.runtimeMinutes} minutes</dd>
          </div>
          {movie.genres.length > 0 && (
            <div>
              <dt>Genre</dt>
              <dd>{movie.genres.map((genre) => genre.name).join(', ')}</dd>
            </div>
          )}
          <div>
            <dt>Release date</dt>
            <dd>{formatReleaseDate(movie.releaseDate)}</dd>
          </div>
          {movie.formats.length > 0 && (
            <div>
              <dt>Formats</dt>
              <dd>{movie.formats.map((format) => format.name).join(', ')}</dd>
            </div>
          )}
          {!movie.isComingSoon && (
            <div>
              <dt>From</dt>
              <dd>{formatPrice(movie.fromPrice)}</dd>
            </div>
          )}
        </dl>
        <div className="rating-note">
          <p>Rating note</p>
          <div>
            <strong>{movie.ageRating.code}</strong>
            <span>{movie.ageRating.description}</span>
          </div>
        </div>
      </aside>
      </div>
    </main>
  )
}

function byHall(sessions: SessionItem[]) {
  const halls = new Map<string, SessionItem[]>()
  sessions.forEach((session) => {
    const list = halls.get(session.hall.name) ?? []
    list.push(session)
    halls.set(session.hall.name, list)
  })
  return [...halls.entries()]
}

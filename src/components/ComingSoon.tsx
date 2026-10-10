import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, notifyMovie } from '../api'
import { useAuth } from '../auth'
import { formatDayMonth, genreLine } from '../format'
import { rememberMovie, toRecent } from '../recent'
import type { Movie } from '../types'
import { AgeBadge } from './AgeBadge'
import { BellIcon, CheckIcon } from './Icons'

type ComingSoonProps = {
  movies: Movie[]
}

export function ComingSoon({ movies }: ComingSoonProps) {
  const { requireAuth } = useAuth()
  const [notice, setNotice] = useState('')
  const [notified, setNotified] = useState<Record<string, boolean>>({})
  const [pendingSlug, setPendingSlug] = useState('')

  return (
    <section className="band" aria-labelledby="soon-heading">
      <div className="band-head">
        <h2 id="soon-heading">Coming Soon...</h2>
      </div>
      {notice && <p className="inline-note">{notice}</p>}
      {movies.length === 0 ? (
        <div className="state-card">
          <p>No upcoming releases yet.</p>
        </div>
      ) : (
        <div className="card-row">
          {movies.map((movie) => {
            const done = Boolean(notified[movie.slug] || movie.isNotified)
            return (
              <article className="soon-card" key={movie.slug}>
                <Link to={`/movies/${movie.slug}`} className="soon-card-image" onClick={() => rememberMovie(toRecent(movie))}>
                  <img src={movie.backdropUrl || movie.posterUrl} alt={`${movie.title} still`} />
                </Link>
                <div className="soon-card-body">
                  <p className="soon-date">In cinemas {formatDayMonth(movie.releaseDate)}</p>
                  <h3>
                    <Link to={`/movies/${movie.slug}`} onClick={() => rememberMovie(toRecent(movie))}>
                      {movie.title}
                    </Link>
                  </h3>
                  <p className="card-meta">{genreLine(movie.genres, movie.runtimeMinutes)}</p>
                  <AgeBadge code={movie.ageRating.code} description={movie.ageRating.description} />
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    disabled={done || pendingSlug === movie.slug}
                    onClick={() => {
                      requireAuth(async () => {
                        setPendingSlug(movie.slug)
                        try {
                          await notifyMovie(movie.slug)
                          setNotified((current) => ({ ...current, [movie.slug]: true }))
                          setNotice('')
                        } catch (error) {
                          if (error instanceof ApiError && error.status === 401) throw error
                          setNotice(error instanceof Error ? error.message : 'Could not save the notification.')
                        } finally {
                          setPendingSlug('')
                        }
                      })
                    }}
                  >
                    {done ? <CheckIcon size={14} /> : <BellIcon size={14} />}
                    {done ? 'Notified' : 'Notify Me'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

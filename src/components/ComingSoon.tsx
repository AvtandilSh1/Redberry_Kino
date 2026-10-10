import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatReleaseDate, formatRuntime } from '../format'
import { rememberMovie, toRecent } from '../recent'
import type { Movie } from '../types'
import { AgeBadge } from './AgeBadge'

type ComingSoonProps = {
  movies: Movie[]
}

export function ComingSoon({ movies }: ComingSoonProps) {
  const [notice, setNotice] = useState('')

  return (
    <section className="band" aria-labelledby="soon-heading">
      <div className="band-head">
        <h2 id="soon-heading">Coming Soon</h2>
      </div>
      {notice && <p className="inline-note">{notice}</p>}
      {movies.length === 0 ? (
        <div className="state-card">
          <p>No upcoming releases yet.</p>
        </div>
      ) : (
        <div className="card-row">
          {movies.map((movie) => (
            <article className="film-card" key={movie.slug}>
              <Link to={`/movies/${movie.slug}`} onClick={() => rememberMovie(toRecent(movie))}>
                <img src={movie.posterUrl} alt={`${movie.title} poster`} />
              </Link>
              <div className="film-card-body">
                <h3>
                  <Link to={`/movies/${movie.slug}`} onClick={() => rememberMovie(toRecent(movie))}>
                    {movie.title}
                  </Link>
                </h3>
                <div className="meta-row compact">
                  <AgeBadge code={movie.ageRating.code} description={movie.ageRating.description} />
                  <span>{formatRuntime(movie.runtimeMinutes)}</span>
                </div>
                <p className="price">{formatReleaseDate(movie.releaseDate)}</p>
                <button
                  type="button"
                  className="btn btn-ghost btn-block"
                  onClick={() =>
                    setNotice('Log in to get notified when this film is released.')
                  }
                >
                  Notify Me
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice, formatRuntime } from '../format'
import { rememberMovie, toRecent } from '../recent'
import type { Movie } from '../types'
import { AgeBadge } from './AgeBadge'

const ROTATE_MS = 6500

type HeroProps = {
  movies: Movie[]
}

export function Hero({ movies }: HeroProps) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (movies.length < 2 || paused) return
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % movies.length)
    }, ROTATE_MS)
    return () => window.clearInterval(timer)
  }, [movies.length, paused])

  if (movies.length === 0) return null

  const active = movies[index] ?? movies[0]

  return (
    <section
      className={paused ? 'hero is-paused' : 'hero'}
      aria-label="Featured films"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="hero-stage" key={active.slug}>
        <img className="hero-backdrop" src={active.backdropUrl} alt="" />
        <div className="hero-shade" />
      </div>

      <div className="hero-content">
        <div className="hero-copy">
          <p className="eyebrow">Featured</p>
          <h1>{active.title}</h1>
          {active.synopsis && <p className="hero-synopsis">{active.synopsis}</p>}
          <div className="meta-row">
            <AgeBadge code={active.ageRating.code} description={active.ageRating.description} />
            <span>{formatRuntime(active.runtimeMinutes)}</span>
            <span>from {formatPrice(active.fromPrice)}</span>
            {active.genres.slice(0, 2).map((genre) => (
              <span key={genre.id} className="chip">
                {genre.name}
              </span>
            ))}
          </div>
          <Link
            className="btn btn-solid btn-lg"
            to={`/movies/${active.slug}`}
            onClick={() => rememberMovie(toRecent(active))}
          >
            Buy Ticket
          </Link>
        </div>

        <div className="hero-posters" role="tablist" aria-label="Featured previews">
          {movies.map((movie, movieIndex) => {
            const selected = movieIndex === index
            return (
              <button
                key={movie.slug}
                type="button"
                role="tab"
                aria-selected={selected}
                className={selected ? 'hero-poster is-active' : 'hero-poster'}
                onClick={() => setIndex(movieIndex)}
              >
                <img src={movie.posterUrl} alt={movie.title} />
                <span className="hero-poster-title">{movie.title}</span>
                {selected && <span className="hero-progress" style={{ animationDuration: `${ROTATE_MS}ms` }} />}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

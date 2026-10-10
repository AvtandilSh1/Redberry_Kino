import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDayMonth, formatMinutes } from '../format'
import { rememberMovie, toRecent } from '../recent'
import type { Movie } from '../types'
import { ChevronLeft, ChevronRight, TicketIcon, TimerIcon } from './Icons'

const ROTATE_MS = 6500
const DAY_MS = 86_400_000

type HeroProps = {
  movies: Movie[]
}

function eyebrow(movie: Movie) {
  const released = new Date(`${movie.releaseDate}T00:00:00`).getTime()
  if (movie.isComingSoon) return `Coming soon · ${formatDayMonth(movie.releaseDate, 'short')}`
  if (Date.now() - released < 30 * DAY_MS) return `Premiere · Week of ${formatDayMonth(movie.releaseDate, 'short')}`
  return 'Now showing'
}

export function Hero({ movies }: HeroProps) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (movies.length < 2 || paused) return
    const timer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % movies.length)
    }, ROTATE_MS)
    return () => window.clearTimeout(timer)
  }, [movies.length, paused, index])

  if (movies.length === 0) return null

  const active = movies[index] ?? movies[0]
  const step = (delta: number) => setIndex((current) => (current + delta + movies.length) % movies.length)

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

      <div className="hero-body" key={`copy-${active.slug}`}>
        <p className="hero-eyebrow">{eyebrow(active)}</p>
        <h1>{active.title}</h1>
        <div className="hero-tags">
          <span className="tag tag-red" title={active.ageRating.description}>
            {active.ageRating.code}
          </span>
          <span className="tag">
            <TimerIcon size={14} />
            {formatMinutes(active.runtimeMinutes)}
          </span>
          {active.formats.slice(0, 3).map((format) => (
            <span key={format.id} className="tag">
              {format.name}
            </span>
          ))}
        </div>
        {active.synopsis && <p className="hero-synopsis">{active.synopsis}</p>}
        <div className="hero-actions">
          <Link className="btn btn-solid" to={`/movies/${active.slug}`} onClick={() => rememberMovie(toRecent(active))}>
            <TicketIcon size={16} />
            Buy tickets
          </Link>
          <Link className="btn btn-glass" to="/sessions">
            All sessions
          </Link>
        </div>
      </div>

      <div className="hero-bar">
        <div className="hero-steps" role="tablist" aria-label="Featured films">
          {movies.map((movie, movieIndex) => (
            <button
              key={movie.slug}
              type="button"
              role="tab"
              aria-selected={movieIndex === index}
              aria-label={movie.title}
              className={movieIndex === index ? 'hero-step is-active' : 'hero-step'}
              onClick={() => setIndex(movieIndex)}
            >
              {movieIndex === index && <span style={{ animationDuration: `${ROTATE_MS}ms` }} />}
            </button>
          ))}
        </div>
        <button type="button" className="round-button" aria-label="Previous film" onClick={() => step(-1)}>
          <ChevronLeft size={20} />
        </button>
        <button type="button" className="round-button" aria-label="Next film" onClick={() => step(1)}>
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  )
}

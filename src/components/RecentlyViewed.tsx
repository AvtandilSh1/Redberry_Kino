import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatMinutes } from '../format'
import { readRecent, rememberMovie, type RecentMovie } from '../recent'
import { AgeBadge } from './AgeBadge'

export function RecentlyViewed() {
  const [movies, setMovies] = useState<RecentMovie[]>(() => readRecent())

  useEffect(() => {
    const sync = () => setMovies(readRecent())
    window.addEventListener('kinoxii-recent', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('kinoxii-recent', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  if (movies.length === 0) return null

  return (
    <section className="band band-recent" aria-labelledby="recent-heading">
      <div className="band-head">
        <h2 id="recent-heading">Recently viewed</h2>
      </div>
      <div className="recent-row">
        {movies.map((movie) => (
          <Link key={movie.slug} to={`/movies/${movie.slug}`} className="recent-card" onClick={() => rememberMovie(movie)}>
            <img src={movie.posterUrl} alt="" />
            <span className="recent-copy">
              <strong>{movie.title}</strong>
              <small>{movie.genre ? `${movie.genre} · ${formatMinutes(movie.runtimeMinutes)}` : formatMinutes(movie.runtimeMinutes)}</small>
              <AgeBadge code={movie.ageCode} description={movie.ageDescription} />
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

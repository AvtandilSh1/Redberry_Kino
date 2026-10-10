import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatRuntime } from '../format'
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

  return (
    <section className="band" aria-labelledby="recent-heading">
      <div className="band-head">
        <h2 id="recent-heading">Recently viewed</h2>
      </div>
      {movies.length === 0 ? (
        <div className="state-card">
          <p>You have not opened a film yet. Pick one below and it will stay here.</p>
        </div>
      ) : (
        <div className="recent-row">
          {movies.map((movie) => (
            <Link
              key={movie.slug}
              to={`/movies/${movie.slug}`}
              className="recent-card"
              onClick={() => rememberMovie(movie)}
            >
              <img src={movie.posterUrl} alt="" />
              <span className="recent-copy">
                <strong>{movie.title}</strong>
                <span className="meta-row compact">
                  <AgeBadge code={movie.ageCode} description={movie.ageDescription} />
                  <span>{formatRuntime(movie.runtimeMinutes)}</span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

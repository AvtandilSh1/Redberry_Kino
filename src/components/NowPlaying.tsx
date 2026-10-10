import { Link } from 'react-router-dom'
import { formatPrice, formatRuntime } from '../format'
import { rememberMovie, toRecent } from '../recent'
import type { Movie } from '../types'
import { AgeBadge } from './AgeBadge'

type NowPlayingProps = {
  movies: Movie[]
}

export function NowPlaying({ movies }: NowPlayingProps) {
  return (
    <section className="band" aria-labelledby="now-heading">
      <div className="band-head">
        <h2 id="now-heading">Now Playing</h2>
        <Link to="/sessions" className="see-all">
          See All
        </Link>
      </div>
      {movies.length === 0 ? (
        <div className="state-card">
          <p>Nothing is on screens right now.</p>
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
                <p className="price">from {formatPrice(movie.fromPrice)}</p>
                <Link
                  className="btn btn-solid btn-block"
                  to={`/movies/${movie.slug}`}
                  onClick={() => rememberMovie(toRecent(movie))}
                >
                  Buy Ticket
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

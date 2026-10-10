import { Link } from 'react-router-dom'
import { formatPrice, genreLine } from '../format'
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
          See all
        </Link>
      </div>
      {movies.length === 0 ? (
        <div className="state-card">
          <p>Nothing is on screens right now.</p>
        </div>
      ) : (
        <div className="card-row">
          {movies.map((movie) => (
            <article className="poster-card" key={movie.slug}>
              <Link to={`/movies/${movie.slug}`} className="poster-card-image" onClick={() => rememberMovie(toRecent(movie))}>
                <img src={movie.posterUrl} alt={`${movie.title} poster`} />
              </Link>
              <h3>
                <Link to={`/movies/${movie.slug}`} onClick={() => rememberMovie(toRecent(movie))}>
                  {movie.title}
                </Link>
              </h3>
              <p className="card-meta">{genreLine(movie.genres, movie.runtimeMinutes)}</p>
              <AgeBadge code={movie.ageRating.code} description={movie.ageRating.description} />
              <div className="poster-card-foot">
                <span>From {formatPrice(movie.fromPrice)}</span>
                <Link
                  className="btn btn-solid btn-sm"
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

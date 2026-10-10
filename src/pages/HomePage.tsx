import { useCallback, useEffect, useState } from 'react'
import { getComingSoon, getFeaturedMovies, getNowPlaying } from '../api'
import { ComingSoon } from '../components/ComingSoon'
import { Hero } from '../components/Hero'
import { NowPlaying } from '../components/NowPlaying'
import { RecentlyViewed } from '../components/RecentlyViewed'
import { CardSkeleton, SectionMessage } from '../components/SectionState'
import type { Movie } from '../types'

type LoadState<T> = {
  data: T
  loading: boolean
  error: string
}

function useList(loader: () => Promise<{ data: Movie[] }>) {
  const [state, setState] = useState<LoadState<Movie[]>>({
    data: [],
    loading: true,
    error: '',
  })

  const reload = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    loader()
      .then((response) => setState({ data: response.data, loading: false, error: '' }))
      .catch(() =>
        setState({
          data: [],
          loading: false,
          error: 'We could not load this list. Check your connection and try again.',
        }),
      )
  }, [loader])

  useEffect(() => {
    reload()
  }, [reload])

  return { ...state, reload }
}

export function HomePage() {
  const loadFeatured = useCallback(() => getFeaturedMovies(), [])
  const loadNowPlaying = useCallback(() => getNowPlaying(8), [])
  const loadComingSoon = useCallback(() => getComingSoon(), [])
  const featured = useList(loadFeatured)
  const nowPlaying = useList(loadNowPlaying)
  const comingSoon = useList(loadComingSoon)

  return (
    <main>
      {featured.loading && (
        <section className="hero hero-loading" aria-busy="true" aria-label="Loading featured films">
          <div className="skeleton hero-skeleton" />
        </section>
      )}
      {featured.error && (
        <SectionMessage title="Featured" message={featured.error} onRetry={featured.reload} />
      )}
      {!featured.loading && !featured.error && <Hero movies={featured.data} />}

      <RecentlyViewed />

      {nowPlaying.loading && (
        <section className="band" aria-busy="true">
          <div className="band-head">
            <h2>Now Playing</h2>
          </div>
          <CardSkeleton />
        </section>
      )}
      {nowPlaying.error && (
        <SectionMessage title="Now Playing" message={nowPlaying.error} onRetry={nowPlaying.reload} />
      )}
      {!nowPlaying.loading && !nowPlaying.error && <NowPlaying movies={nowPlaying.data} />}

      {comingSoon.loading && (
        <section className="band" aria-busy="true">
          <div className="band-head">
            <h2>Coming Soon</h2>
          </div>
          <CardSkeleton />
        </section>
      )}
      {comingSoon.error && (
        <SectionMessage title="Coming Soon" message={comingSoon.error} onRetry={comingSoon.reload} />
      )}
      {!comingSoon.loading && !comingSoon.error && <ComingSoon movies={comingSoon.data} />}
    </main>
  )
}

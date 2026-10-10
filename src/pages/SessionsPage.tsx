import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError, getFilterOptions, getSessions } from '../api'
import { useAuth } from '../auth'
import { AgeBadge } from '../components/AgeBadge'
import { CheckIcon, ChevronDown, ChevronLeft, ChevronRight, CloseIcon, TicketIcon } from '../components/Icons'
import { formatMinutes, formatPrice } from '../format'
import { rememberMovie, toRecent } from '../recent'
import {
  activeFilterCount,
  readFilters,
  todayIso,
  toApiQuery,
  upcomingDates,
  writeFilters,
  type SessionFilters,
} from '../sessionQuery'
import type { FilterOptions, Format, SessionGroup, SessionItem } from '../types'

function dayParts(iso: string) {
  const date = new Date(`${iso}T12:00:00`)
  return {
    weekday: date.toLocaleDateString('en-GB', { weekday: 'short' }),
    day: date.getDate(),
  }
}

function underRating(age: number | null | undefined, minAge: number) {
  return age != null && minAge >= 16 && age < minAge
}

export function SessionsPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const filters = readFilters(params)
  const queryKey = params.toString()
  const [options, setOptions] = useState<FilterOptions | null>(null)
  const [optionsError, setOptionsError] = useState('')
  const [groups, setGroups] = useState<SessionGroup[]>([])
  const [totalSessions, setTotalSessions] = useState(0)
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [searchText, setSearchText] = useState(filters.search)
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  useEffect(() => {
    let cancelled = false
    getFilterOptions()
      .then((response) => {
        if (!cancelled) setOptions(response.data)
      })
      .catch(() => {
        if (!cancelled) setOptionsError('We could not load the filters. Try again.')
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  useEffect(() => {
    setSearchText(filters.search)
  }, [filters.search])

  useEffect(() => {
    const current = filtersRef.current
    if (searchText === current.search) return
    const timer = window.setTimeout(() => {
      const latest = filtersRef.current
      setParams(writeFilters({ ...latest, search: searchText, page: 1 }, { date: todayIso(), sort: 'time_asc' }))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchText, setParams])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    getSessions(toApiQuery(filters))
      .then((response) => {
        if (cancelled) return
        setGroups(response.data)
        setTotalSessions(response.meta.totalSessions)
        setLastPage(response.meta.lastPage)
        setLoading(false)
      })
      .catch((reason: unknown) => {
        if (cancelled) return
        setGroups([])
        setLoading(false)
        setError(reason instanceof ApiError ? reason.message : 'We could not load sessions. Try again.')
      })
    return () => {
      cancelled = true
    }
  }, [queryKey, reloadKey])

  function commit(next: SessionFilters) {
    setParams(writeFilters(next, { date: todayIso(), sort: 'time_asc' }))
  }

  function patch(partial: Partial<SessionFilters>, resetPage = true) {
    commit({ ...filters, ...partial, page: resetPage ? 1 : (partial.page ?? filters.page) })
  }

  const visibleFormats = visibleFormatList(options, filters.venues)

  useEffect(() => {
    if (!options) return
    const allowed = new Set(visibleFormats.map((format) => format.slug))
    const kept = filters.formats.filter((slug) => allowed.has(slug))
    if (kept.length !== filters.formats.length) patch({ formats: kept })
  }, [options, filters.venues.join('|')])

  const count = activeFilterCount(filters)
  const dates = upcomingDates()

  return (
    <main className="sessions">
      <div className="page-title">
        <h1>Sessions</h1>
        <p>Browse showtimes across all venues</p>
      </div>
      <aside className="filters">
        <h2>Filters</h2>
        {optionsError && (
          <div className="state-card">
            <p>{optionsError}</p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReloadKey((value) => value + 1)}>
              Try again
            </button>
          </div>
        )}
        {options && (
          <>
            <CheckGroup
              title="Venue"
              options={options.venues.map((venue) => ({
                id: venue.slug,
                label: venue.name,
                detail: venue.city,
              }))}
              selected={filters.venues}
              onToggle={(slug) => patch({ venues: toggle(filters.venues, slug) })}
            />
            <FilterGroup title="Date">
              <div className="date-row">
                {dates.map((iso) => {
                  const parts = dayParts(iso)
                  return (
                    <button
                      key={iso}
                      type="button"
                      aria-pressed={iso === filters.date}
                      className={iso === filters.date ? 'date-chip is-selected' : 'date-chip'}
                      onClick={() => patch({ date: iso })}
                    >
                      <span>{parts.weekday}</span>
                      <span>{parts.day}</span>
                    </button>
                  )
                })}
              </div>
            </FilterGroup>
            <CheckGroup
              title="Format"
              options={visibleFormats.map((format) => ({ id: format.slug, label: format.name }))}
              selected={filters.formats}
              onToggle={(slug) => patch({ formats: toggle(filters.formats, slug) })}
            />
            <CheckGroup
              title="Language"
              options={options.languages.map((language) => ({ id: language.slug, label: language.name }))}
              selected={filters.languages}
              onToggle={(slug) => patch({ languages: toggle(filters.languages, slug) })}
            />
            <CheckGroup
              title="Time of day"
              options={options.timeBands.map((band) => bandOption(band))}
              selected={filters.bands}
              onToggle={(id) => patch({ bands: toggle(filters.bands, id) })}
            />
            <div className="filters-foot">
              <button
                type="button"
                className="btn btn-outline btn-block btn-sm"
                disabled={count === 0}
                onClick={() => patch({ venues: [], formats: [], languages: [], bands: [], search: '' })}
              >
                Clear All Filters
              </button>
              <p>
                {count} {count === 1 ? 'filter' : 'filters'} active
              </p>
            </div>
          </>
        )}
      </aside>

      <section className="session-results">
        <div className="results-bar">
          <p className="result-count">
            {loading ? 'Loading sessions…' : totalSessions === 0 ? 'No sessions found' : `Showing ${totalSessions} sessions`}
          </p>
          {filters.search && (
            <button type="button" className="search-chip" onClick={() => setSearchText('')}>
              “{filters.search}” <CloseIcon size={12} />
            </button>
          )}
          <SortMenu
            value={filters.sort}
            options={options?.sorts ?? fallbackSorts}
            onChange={(sort) => patch({ sort })}
          />
        </div>

        {loading && <SessionSkeleton />}
        {error && (
          <div className="state-card">
            <p>{error}</p>
            <button type="button" className="btn btn-ghost" onClick={() => setReloadKey((value) => value + 1)}>
              Try again
            </button>
          </div>
        )}
        {!loading && !error && groups.length === 0 && (
          <div className="state-card">
            <p>No sessions found. Clear a filter or pick another day.</p>
          </div>
        )}
        {!loading && !error && groups.length > 0 && (
          <div className="session-groups">
            {groups.map((group) => (
              <article className="session-group" key={group.movie.slug}>
                <Link
                  className="session-movie"
                  to={`/movies/${group.movie.slug}`}
                  onClick={() => rememberMovie(toRecent(group.movie))}
                >
                  <img src={group.movie.posterUrl} alt="" />
                  <span>
                    <span className="session-movie-title">
                      <strong>{group.movie.title}</strong>
                      <AgeBadge code={group.movie.ageRating.code} description={group.movie.ageRating.description} />
                    </span>
                    <small>{formatMinutes(group.movie.runtimeMinutes)}</small>
                  </span>
                </Link>
                {underRating(user?.age, group.movie.ageRating.minAge) && (
                  <p className="inline-note">
                    This film is rated {group.movie.ageRating.code}. You cannot buy tickets for it with this account.
                  </p>
                )}
                <div className="showtimes">
                  {group.sessions.map((session) => {
                    const blocked = underRating(user?.age, group.movie.ageRating.minAge)
                    const body = <ShowtimeBody session={session} />
                    if (session.isSoldOut || blocked) {
                      return (
                        <button key={session.id} type="button" className="showtime is-soldout" disabled>
                          {body}
                        </button>
                      )
                    }
                    return (
                      <Link key={session.id} className="showtime" to={`/sessions/${session.id}/seats`}>
                        {body}
                      </Link>
                    )
                  })}
                </div>
              </article>
            ))}
          </div>
        )}

        {lastPage > 1 && (
          <nav className="pager" aria-label="Pages">
            <button
              type="button"
              aria-label="Previous page"
              disabled={filters.page <= 1}
              onClick={() => patch({ page: filters.page - 1 }, false)}
            >
              <ChevronLeft size={16} />
            </button>
            {pageItems(filters.page, lastPage).map((item, index) =>
              item === 'gap' ? (
                <span key={`gap-${index}`} className="pager-gap">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  className={item === filters.page ? 'is-current' : ''}
                  onClick={() => patch({ page: item }, false)}
                  aria-current={item === filters.page ? 'page' : undefined}
                >
                  {item}
                </button>
              ),
            )}
            <button
              type="button"
              aria-label="Next page"
              disabled={filters.page >= lastPage}
              onClick={() => patch({ page: filters.page + 1 }, false)}
            >
              <ChevronRight size={16} />
            </button>
            <span className="pager-count">
              Page {filters.page} of {lastPage}
            </span>
          </nav>
        )}
      </section>
    </main>
  )
}

const fallbackSorts = [
  { id: 'time_asc', label: 'Showtime: earliest first' },
  { id: 'time_desc', label: 'Showtime: latest first' },
  { id: 'price_asc', label: 'Price: low to high' },
  { id: 'price_desc', label: 'Price: high to low' },
  { id: 'title_asc', label: 'Title: A-Z' },
]

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

function visibleFormatList(options: FilterOptions | null, venueSlugs: string[]): Format[] {
  if (!options) return []
  if (venueSlugs.length === 0) return options.formats
  const allowed = new Set(
    options.venues
      .filter((venue) => venueSlugs.includes(venue.slug))
      .flatMap((venue) => venue.formats.map((format) => format.slug)),
  )
  return options.formats.filter((format) => allowed.has(format.slug))
}

function bandOption(band: { id: string; label: string }) {
  const match = band.label.match(/^(.*?)\s*\((.*)\)\s*$/)
  return match ? { id: band.id, label: match[1], detail: match[2] } : { id: band.id, label: band.label }
}

function pageItems(current: number, last: number): (number | 'gap')[] {
  const pages = new Set([1, last, current - 1, current, current + 1])
  const sorted = [...pages].filter((page) => page >= 1 && page <= last).sort((a, b) => a - b)
  const items: (number | 'gap')[] = []
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) items.push('gap')
    items.push(page)
  })
  return items
}

function ShowtimeBody({ session }: { session: SessionItem }) {
  return (
    <>
      <span className="showtime-row">
        <b>{session.time}</b>
        <em>{session.format.name}</em>
      </span>
      <span className="showtime-row">
        <span className="showtime-lang">{session.language.name}</span>
        {session.isSoldOut ? (
          <span className="seats-left is-out">Sold out</span>
        ) : (
          <span className={session.seatsLeft <= 10 ? 'seats-left is-low' : 'seats-left'}>
            <TicketIcon size={13} />
            {session.seatsLeft} left
          </span>
        )}
      </span>
      <span className="showtime-row">
        <span className="showtime-venue">
          {session.venue.name} · Hall {session.hall.name}
        </span>
        <strong>{formatPrice(session.price)}</strong>
      </span>
    </>
  )
}

function SortMenu({
  value,
  options,
  onChange,
}: {
  value: string
  options: { id: string; label: string }[]
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const current = options.find((option) => option.id === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    function onDown(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="sort-menu" ref={boxRef}>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((state) => !state)}>
        <span>Sort:</span>
        <strong>{current?.label}</strong>
        <ChevronDown size={16} className={open ? 'chevron is-up' : 'chevron'} />
      </button>
      {open && (
        <ul role="listbox" aria-label="Sort sessions">
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                role="option"
                aria-selected={option.id === value}
                className={option.id === value ? 'is-current' : ''}
                onClick={() => {
                  setOpen(false)
                  if (option.id !== value) onChange(option.id)
                }}
              >
                {option.label}
                {option.id === value && <CheckIcon size={14} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="filter-group">
      <legend>{title}</legend>
      {children}
    </fieldset>
  )
}

function CheckGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string
  options: { id: string; label: string; detail?: string }[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <FilterGroup title={title}>
      {options.map((option) => (
        <label key={option.id} className="check-row">
          <input type="checkbox" checked={selected.includes(option.id)} onChange={() => onToggle(option.id)} />
          <span className="check-box" aria-hidden="true">
            <CheckIcon size={12} strokeWidth={3} />
          </span>
          <span>
            {option.label}
            {option.detail && <small> · {option.detail}</small>}
          </span>
        </label>
      ))}
    </FilterGroup>
  )
}

function SessionSkeleton() {
  return (
    <div className="session-groups" aria-busy="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div className="skeleton session-skeleton" key={index} />
      ))}
    </div>
  )
}

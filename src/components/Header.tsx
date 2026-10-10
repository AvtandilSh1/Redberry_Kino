import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { searchMovies } from '../api'
import { useAuth } from '../auth'
import { formatMinutes, formatPrice } from '../format'
import { toRecent, rememberMovie } from '../recent'
import type { Movie, User } from '../types'
import { ChevronDown, LogoutIcon, PopcornIcon, SearchIcon, CloseIcon, TicketIcon, UserIcon } from './Icons'
import { Logo } from './Logo'

function displayName(user: User) {
  return user.fullName?.trim() || user.username
}

function firstName(user: User) {
  return displayName(user).split(/\s+/)[0]
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function Avatar({ user }: { user: User }) {
  return (
    <span className="avatar-wrap">
      {user.avatar ? (
        <img className="avatar" src={user.avatar} alt="" />
      ) : (
        <span className="avatar avatar-fallback">{initials(displayName(user))}</span>
      )}
      <span
        className={user.profileComplete ? 'profile-dot is-complete' : 'profile-dot'}
        title={user.profileComplete ? 'Profile complete' : 'Profile incomplete'}
      />
    </span>
  )
}

export function Header() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Movie[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, ready, openAuth, logout } = useAuth()
  const navigate = useNavigate()
  const trimmed = query.trim()

  useEffect(() => {
    if (!trimmed) {
      setResults([])
      setSearching(false)
      setSearchError('')
      return
    }

    const controller = new AbortController()
    setSearching(true)
    const timer = window.setTimeout(async () => {
      setSearchError('')
      try {
        const response = await searchMovies(trimmed)
        if (!controller.signal.aborted) setResults(response.data)
      } catch {
        if (!controller.signal.aborted) {
          setResults([])
          setSearchError('Search failed. Try again.')
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 300)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [trimmed])

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false)
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  function closeSearch() {
    setOpen(false)
    setQuery('')
  }

  function openMovie(movie: Movie) {
    rememberMovie(toRecent(movie))
    closeSearch()
  }

  function browseSessions() {
    closeSearch()
    navigate('/sessions')
  }

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo-link" aria-label="Kino XII home">
          <Logo />
        </Link>

        <nav className="header-nav" aria-label="Primary">
          <NavLink to="/sessions" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Sessions
          </NavLink>
        </nav>

        <div className={open ? 'search is-open' : 'search'} ref={boxRef}>
          <label className="search-field">
            <SearchIcon size={16} />
            <span className="sr-only">Search films and live events</span>
            <input
              ref={inputRef}
              type="search"
              placeholder="Search films and live events"
              value={query}
              autoComplete="off"
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              onChange={(event) => {
                setQuery(event.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
            />
            {query && (
              <button
                type="button"
                className="search-clear"
                aria-label="Clear search"
                onClick={() => {
                  setQuery('')
                  inputRef.current?.focus()
                }}
              >
                <CloseIcon size={12} />
              </button>
            )}
          </label>
          {open && (
            <div className="search-panel" id={listId} role="listbox">
              {!trimmed && (
                <div className="search-empty">
                  <span className="search-empty-icon">
                    <PopcornIcon size={20} />
                  </span>
                  <strong>What do you want to watch?</strong>
                  <p>Search by title, director or cast</p>
                  <button type="button" className="btn btn-dark" onClick={browseSessions}>
                    Browse all sessions
                  </button>
                </div>
              )}
              {trimmed && searching && results.length === 0 && <p className="search-status">Searching…</p>}
              {trimmed && searchError && <p className="search-status">{searchError}</p>}
              {trimmed && !searching && !searchError && results.length === 0 && (
                <div className="search-empty">
                  <span className="search-empty-icon">
                    <SearchIcon size={20} />
                  </span>
                  <strong>No results for “{trimmed}”</strong>
                  <p>Check the spelling or try another film or live event.</p>
                  <button type="button" className="btn btn-dark" onClick={browseSessions}>
                    Browse all sessions
                  </button>
                </div>
              )}
              {trimmed && results.length > 0 && (
                <>
                  <div className="search-head">
                    <span>Films &amp; events</span>
                    <span>
                      {results.length} {results.length === 1 ? 'result' : 'results'}
                    </span>
                  </div>
                  {results.map((movie) => (
                    <Link
                      key={movie.slug}
                      to={`/movies/${movie.slug}`}
                      className="search-hit"
                      role="option"
                      onClick={() => openMovie(movie)}
                    >
                      <img src={movie.posterUrl} alt="" />
                      <span className="search-hit-copy">
                        <strong>{movie.title}</strong>
                        <small>
                          {movie.kind === 'event' ? 'Live event' : 'Film'} · {movie.ageRating.code} ·{' '}
                          {formatMinutes(movie.runtimeMinutes)}
                        </small>
                      </span>
                      {movie.isComingSoon ? (
                        <span className="search-soon">Coming Soon</span>
                      ) : (
                        <span className="search-price">from {formatPrice(movie.fromPrice)}</span>
                      )}
                    </Link>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div className="header-auth">
          {!ready ? null : user ? (
            <div className="user-menu" ref={menuRef}>
              <button
                type="button"
                className="user-button"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((value) => !value)}
              >
                <Avatar user={user} />
                <span className="user-name">{firstName(user)}</span>
                <ChevronDown size={16} className={menuOpen ? 'chevron is-up' : 'chevron'} />
              </button>
              {menuOpen && (
                <div className="user-dropdown" role="menu">
                  <div className="user-dropdown-head">
                    <Avatar user={user} />
                    <span>
                      <strong>{displayName(user)}</strong>
                      <small>{user.email}</small>
                    </span>
                  </div>
                  {user.profileComplete ? (
                    <p className="menu-status is-complete">
                      Profile Complete ✓
                    </p>
                  ) : (
                    <p className="menu-status">
                      <strong>Profile incomplete</strong>
                      Please complete your profile to enable booking.
                    </p>
                  )}
                  <Link to="/profile" role="menuitem" onClick={() => setMenuOpen(false)}>
                    <UserIcon size={16} />
                    My Profile
                  </Link>
                  <Link to="/profile?tab=tickets" role="menuitem" onClick={() => setMenuOpen(false)}>
                    <TicketIcon size={16} />
                    My Tickets
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    className="menu-logout"
                    onClick={() => {
                      setMenuOpen(false)
                      void logout()
                    }}
                  >
                    <LogoutIcon size={16} />
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button type="button" className="btn btn-solid" onClick={() => openAuth('signup')}>
                Sign up
              </button>
              <button type="button" className="btn btn-light" onClick={() => openAuth('login')}>
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

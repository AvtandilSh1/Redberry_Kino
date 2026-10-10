import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { searchMovies } from '../api'
import { useAuth } from '../auth'
import { toRecent, rememberMovie } from '../recent'
import type { Movie, User } from '../types'
import { Logo } from './Logo'

function displayName(user: User) {
  return user.fullName?.trim() || user.username
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function Header() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Movie[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, ready, openAuth, logout } = useAuth()

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setSearching(false)
      setSearchError('')
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSearching(true)
      setSearchError('')
      try {
        const response = await searchMovies(trimmed)
        if (!controller.signal.aborted) {
          setResults(response.data)
          setOpen(true)
        }
      } catch {
        if (!controller.signal.aborted) {
          setResults([])
          setSearchError('Search failed. Try again.')
          setOpen(true)
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 300)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query])

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onMenuPointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('mousedown', onMenuPointer)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('mousedown', onMenuPointer)
    }
  }, [])

  function openMovie(movie: Movie) {
    rememberMovie(toRecent(movie))
    setOpen(false)
    setQuery('')
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

        <div className="search" ref={boxRef}>
          <label className="sr-only" htmlFor="header-search">
            Search films
          </label>
          <input
            id="header-search"
            type="search"
            placeholder="Search films"
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
          {open && query.trim() && (
            <div className="search-panel" id={listId} role="listbox">
              {searching && <p className="search-status">Searching…</p>}
              {searchError && <p className="search-status">{searchError}</p>}
              {!searching && !searchError && results.length === 0 && (
                <p className="search-status">No films match that title.</p>
              )}
              {results.map((movie) => (
                <Link
                  key={movie.slug}
                  to={`/movies/${movie.slug}`}
                  className="search-hit"
                  role="option"
                  onClick={() => openMovie(movie)}
                >
                  <img src={movie.posterUrl} alt="" />
                  <span>
                    <strong>{movie.title}</strong>
                    <small>
                      {movie.ageRating.code} · {movie.isComingSoon ? 'Coming soon' : 'Now playing'}
                    </small>
                  </span>
                </Link>
              ))}
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
                onClick={() => setMenuOpen((open) => !open)}
              >
                <span className="avatar-wrap">
                  {user.avatar ? (
                    <img className="avatar" src={user.avatar} alt="" />
                  ) : (
                    <span className="avatar avatar-fallback">{initials(displayName(user))}</span>
                  )}
                  {!user.profileComplete && <span className="profile-dot" title="Profile incomplete" />}
                </span>
                <span>{displayName(user)}</span>
              </button>
              {menuOpen && (
                <div className="user-dropdown" role="menu">
                  <Link to="/profile" role="menuitem" onClick={() => setMenuOpen(false)}>
                    My Profile
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false)
                      void logout()
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => openAuth('login')}>
                Log in
              </button>
              <button type="button" className="btn btn-solid" onClick={() => openAuth('signup')}>
                Sign up
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

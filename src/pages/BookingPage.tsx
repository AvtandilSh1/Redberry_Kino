import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth'
import { BookingModal } from '../components/BookingModal'
import { MoviePage } from './MoviePage'

function leaveBooking(navigate: ReturnType<typeof useNavigate>) {
  const index = (window.history.state as { idx?: number } | null)?.idx ?? 0
  if (index > 0) navigate(-1)
  else navigate('/sessions')
}

export function BookingPage() {
  const { sessionId = '' } = useParams()
  const id = Number(sessionId)
  const navigate = useNavigate()
  const { user, ready, mode, openAuth } = useAuth()
  const previousMode = useRef(mode)
  const [backdrop, setBackdrop] = useState<{ slug: string; date: string } | null>(null)

  useEffect(() => {
    if (!ready || user) return
    const wasOpen = previousMode.current !== null
    previousMode.current = mode
    if (!mode && wasOpen) {
      leaveBooking(navigate)
      return
    }
    if (!mode) openAuth('login')
  }, [ready, user, mode, openAuth, navigate])

  if (!ready) {
    return (
      <main className="film" aria-busy="true">
        <div className="skeleton film-skeleton" />
      </main>
    )
  }
  if (!user) return null
  if (!Number.isInteger(id)) return <Navigate to="/sessions" replace />
  if (!user.profileComplete) {
    return <Navigate to="/profile" replace state={{ notice: 'Please complete your profile before booking.' }} />
  }

  return (
    <>
      {backdrop ? <MoviePage backdrop={backdrop} /> : <main className="film" />}
      <BookingModal
        sessionId={id}
        onClose={() => leaveBooking(navigate)}
        onSessionLoaded={(session) =>
          setBackdrop((current) =>
            current?.slug === session.movie.slug && current.date === session.date
              ? current
              : { slug: session.movie.slug, date: session.date },
          )
        }
        onProfileRequired={() =>
          navigate('/profile', { replace: true, state: { notice: 'Please complete your profile before booking.' } })
        }
      />
    </>
  )
}

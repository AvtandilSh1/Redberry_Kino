import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError, getFilterOptions, getTickets, refundOrder, updateProfile } from '../api'
import { useAuth } from '../auth'
import { AgeBadge } from '../components/AgeBadge'
import { FieldMark } from '../components/FieldMark'
import { CloseIcon } from '../components/Icons'
import { formatMinutes, formatPrice, formatShowDate } from '../format'
import type { Order, User } from '../types'

type ProfileValues = {
  fullName: string
  mobileNumber: string
  dateOfBirth: string
  preferredVenueId: string
}

type TicketFilter = 'upcoming' | 'past'
type TicketLists = Record<TicketFilter, Order[]>

const REFUND_CUTOFF_MS = 2 * 60 * 60 * 1000

function fromUser(user: User): ProfileValues {
  return {
    fullName: user.fullName ?? '',
    mobileNumber: user.mobileNumber ?? '',
    dateOfBirth: user.dateOfBirth ?? '',
    preferredVenueId: user.preferredVenue ? String(user.preferredVenue.id) : '',
  }
}

function nameError(value: string) {
  const name = value.trim()
  if (!name) return 'Name is required'
  if (name.length < 3) return 'Name must be at least 3 characters'
  if (name.length > 50) return 'Name must not exceed 50 characters'
  return ''
}

function mobileError(value: string) {
  const mobile = value.replace(/\s/g, '')
  if (!mobile) return 'Mobile number is required'
  if (!/^\d+$/.test(mobile)) return 'Please enter a valid Georgian mobile number (9 digits starting with 5)'
  if (!mobile.startsWith('5')) return 'Georgian mobile numbers must start with 5'
  if (mobile.length !== 9) return 'Mobile number must be exactly 9 digits'
  return ''
}

function dobError(value: string) {
  if (!value) return 'Date of birth is required'
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return 'Please enter a valid date of birth'
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return 'Please enter a valid date of birth'
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (date > today) return 'Please enter a valid date of birth'
  let age = today.getFullYear() - year
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1
  if (age < 12) return 'You must be at least 12 years old to create an account'
  return ''
}

function eligibility(age: number | null) {
  if (age == null) return ''
  if (age >= 18) return `You are ${age}, you can buy tickets for all age ratings`
  if (age >= 16) return `You are ${age}, you cannot buy tickets for 18+ titles`
  return `You are ${age}, you cannot buy tickets for 16+ or 18+ titles`
}

function refundDeadline(order: Order) {
  const start = new Date(order.session.startsAt)
  if (Number.isNaN(start.getTime())) return ''
  const cutoff = new Date(start.getTime() - REFUND_CUTOFF_MS)
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(cutoff)
  const day = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(cutoff)
  return `${time}, ${day.replace(',', '')}`
}

function leaveProfile(navigate: ReturnType<typeof useNavigate>) {
  const index = (window.history.state as { idx?: number } | null)?.idx ?? 0
  if (index > 0) navigate(-1)
  else navigate('/')
}

export function ProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, ready, mode, openAuth, updateUser, requireAuth } = useAuth()
  const previousMode = useRef(mode)
  const notice = (location.state as { notice?: string } | null)?.notice

  useEffect(() => {
    if (!ready || user) return
    const wasOpen = previousMode.current !== null
    previousMode.current = mode
    if (!mode && wasOpen) {
      leaveProfile(navigate)
      return
    }
    if (!mode) openAuth('login')
  }, [ready, user, mode, openAuth, navigate])

  if (!ready) {
    return (
      <main className="profile" aria-busy="true">
        <div className="skeleton session-skeleton" />
      </main>
    )
  }
  if (!user) return null

  return <ProfileContent user={user} notice={notice} updateUser={updateUser} requireAuth={requireAuth} />
}

function ProfileContent({
  user,
  notice,
  updateUser,
  requireAuth,
}: {
  user: User
  notice?: string
  updateUser: (user: User) => void
  requireAuth: (action: () => Promise<void> | void) => void
}) {
  const [params, setParams] = useSearchParams()
  const { hash } = useLocation()
  const tab = params.get('tab') === 'tickets' || hash === '#tickets' ? 'tickets' : 'info'
  const [upcomingCount, setUpcomingCount] = useState<number | null>(null)

  function selectTab(next: 'info' | 'tickets') {
    const query = new URLSearchParams(params)
    if (next === 'tickets') query.set('tab', 'tickets')
    else query.delete('tab')
    setParams(query, { replace: true })
  }

  return (
    <main className="profile">
      <h1>My Profile</h1>
      <div className="profile-tabs" role="tablist" aria-label="Profile sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'info'}
          className={tab === 'info' ? 'is-current' : ''}
          onClick={() => selectTab('info')}
        >
          Personal Information
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'tickets'}
          className={tab === 'tickets' ? 'is-current' : ''}
          onClick={() => selectTab('tickets')}
        >
          My Tickets
          {upcomingCount ? <span className="tab-badge">{upcomingCount}</span> : null}
        </button>
      </div>

      <div hidden={tab !== 'info'}>
        <ProfileForm user={user} notice={notice} updateUser={updateUser} requireAuth={requireAuth} />
      </div>
      <div hidden={tab !== 'tickets'}>
        <Tickets requireAuth={requireAuth} onCount={setUpcomingCount} />
      </div>
    </main>
  )
}

function ProfileForm({
  user,
  notice,
  updateUser,
  requireAuth,
}: {
  user: User
  notice?: string
  updateUser: (user: User) => void
  requireAuth: (action: () => Promise<void> | void) => void
}) {
  const [values, setValues] = useState(() => fromUser(user))
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')
  const [venues, setVenues] = useState<{ id: number; name: string; city: string }[]>(
    user.preferredVenue ? [user.preferredVenue] : [],
  )
  const [venuesError, setVenuesError] = useState('')

  useEffect(() => {
    let cancelled = false
    getFilterOptions()
      .then((response) => {
        if (!cancelled) setVenues(response.data.venues)
      })
      .catch(() => {
        if (!cancelled) setVenuesError('We could not load the cinemas. Try again.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const savedValues = fromUser(user)
  const dirty =
    values.fullName.trim() !== savedValues.fullName.trim() ||
    values.mobileNumber.replace(/\s/g, '') !== savedValues.mobileNumber.replace(/\s/g, '') ||
    values.dateOfBirth !== savedValues.dateOfBirth ||
    values.preferredVenueId !== savedValues.preferredVenueId
  const problems = {
    fullName: nameError(values.fullName),
    mobileNumber: mobileError(values.mobileNumber),
    dateOfBirth: dobError(values.dateOfBirth),
  }
  const invalid = Boolean(problems.fullName || problems.mobileNumber || problems.dateOfBirth)

  function update(field: keyof ProfileValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setServerErrors((current) => ({ ...current, [field]: '' }))
    setSaved('')
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setTouched({ fullName: true, mobileNumber: true, dateOfBirth: true })
    if (invalid || !dirty || saving) return
    setSaving(true)
    setServerErrors({})
    try {
      const response = await updateProfile({
        fullName: values.fullName.trim(),
        mobileNumber: values.mobileNumber.trim(),
        dateOfBirth: values.dateOfBirth,
        preferredVenueId: values.preferredVenueId,
      })
      updateUser(response.data)
      setValues(fromUser(response.data))
      setSaved('Profile saved.')
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) {
        requireAuth(() => {
          document.querySelector<HTMLFormElement>('#profile-form')?.requestSubmit()
        })
        return
      }
      if (reason instanceof ApiError) setServerErrors(reason.fieldErrors)
      else setSaved('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form id="profile-form" className="profile-form" onSubmit={save} noValidate>
      {notice && !user.profileComplete && <p className="inline-note">{notice}</p>}
      {!user.profileComplete && <p className="profile-banner">Please complete your profile to enable booking.</p>}
      <Field
        label="Full name"
        name="fullName"
        value={values.fullName}
        placeholder="e.g. Meri Sanikidze"
        error={serverErrors.fullName || (touched.fullName ? problems.fullName : '')}
        valid={Boolean(touched.fullName && !problems.fullName && !serverErrors.fullName && values.fullName.trim())}
        onBlur={() => setTouched((current) => ({ ...current, fullName: true }))}
        onChange={(value) => update('fullName', value)}
      />
      <label className="field">
        <span>Email</span>
        <span className="field-control">
          <input value={user.email} disabled readOnly />
        </span>
        <span className="field-hint">Set at registration and cannot be changed</span>
      </label>
      <Field
        label="Mobile number"
        name="mobileNumber"
        value={values.mobileNumber}
        placeholder="5XX XXX XXX"
        error={serverErrors.mobileNumber || (touched.mobileNumber ? problems.mobileNumber : '')}
        valid={Boolean(touched.mobileNumber && !problems.mobileNumber && !serverErrors.mobileNumber)}
        onBlur={() => setTouched((current) => ({ ...current, mobileNumber: true }))}
        onChange={(value) => update('mobileNumber', value)}
      />
      <Field
        label="Date of birth"
        name="dateOfBirth"
        type="date"
        value={values.dateOfBirth}
        error={serverErrors.dateOfBirth || (touched.dateOfBirth ? problems.dateOfBirth : '')}
        valid={Boolean(touched.dateOfBirth && !problems.dateOfBirth && !serverErrors.dateOfBirth)}
        onBlur={() => setTouched((current) => ({ ...current, dateOfBirth: true }))}
        onChange={(value) => update('dateOfBirth', value)}
      />
      <label className="field">
        <span>Preferred Venue (Optional)</span>
        <span className="field-control">
          <select value={values.preferredVenueId} onChange={(event) => update('preferredVenueId', event.target.value)}>
            <option value="">No preference</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}, {venue.city}
              </option>
            ))}
          </select>
        </span>
        {venuesError && <small>{venuesError}</small>}
      </label>
      {user.age != null && <p className="eligibility">{eligibility(user.age)}</p>}
      {saved && <p className="profile-saved">{saved}</p>}
      <div>
        <button type="submit" className="btn btn-solid btn-lg" disabled={!dirty || invalid || saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  name,
  value,
  error,
  valid,
  onBlur,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  name: string
  value: string
  error: string
  valid: boolean
  onBlur: () => void
  onChange: (value: string) => void
  type?: string
  placeholder?: string
}) {
  const tone = error ? 'is-invalid' : valid && type !== 'date' ? 'is-valid' : ''
  return (
    <label className={`field ${tone}`}>
      <span>{label}</span>
      <span className="field-control">
        <input
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
        />
        {type !== 'date' && <FieldMark tone={tone} />}
      </span>
      {error && <small>{error}</small>}
    </label>
  )
}

function Tickets({
  requireAuth,
  onCount,
}: {
  requireAuth: (action: () => Promise<void> | void) => void
  onCount: (count: number) => void
}) {
  const [filter, setFilter] = useState<TicketFilter>('upcoming')
  const [lists, setLists] = useState<TicketLists>({ upcoming: [], past: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [pending, setPending] = useState<Order | null>(null)
  const [refunding, setRefunding] = useState(false)
  const [refundError, setRefundError] = useState('')

  const countUpcoming = useCallback(
    (next: TicketLists) => onCount(next.upcoming.filter((order) => order.status !== 'refunded').length),
    [onCount],
  )

  useEffect(() => {
    if (!pending) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !refunding) setPending(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [pending, refunding])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    Promise.all([getTickets('upcoming'), getTickets('past')])
      .then(([upcoming, past]) => {
        if (cancelled) return
        const next = { upcoming: upcoming.data, past: past.data }
        setLists(next)
        countUpcoming(next)
        setLoading(false)
      })
      .catch((reason: unknown) => {
        if (cancelled) return
        setLoading(false)
        if (reason instanceof ApiError && reason.status === 401) {
          requireAuth(() => setReloadKey((value) => value + 1))
          return
        }
        setError(reason instanceof ApiError ? reason.message : 'We could not load your tickets. Try again.')
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey, requireAuth, countUpcoming])

  async function confirmRefund() {
    if (!pending || refunding) return
    setRefunding(true)
    setRefundError('')
    try {
      const response = await refundOrder(pending.reference)
      const refunded = response.data
      setLists((current) => {
        const swap = (orders: Order[]) =>
          orders.map((order) => (order.reference === refunded.reference ? refunded : order))
        const next = { upcoming: swap(current.upcoming).filter((order) => order.isUpcoming), past: swap(current.past) }
        countUpcoming(next)
        return next
      })
      setPending(null)
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) {
        requireAuth(() => confirmRefund())
        return
      }
      setRefundError(reason instanceof ApiError ? reason.message : 'We could not refund this order. Try again.')
    } finally {
      setRefunding(false)
    }
  }

  const orders = lists[filter]

  return (
    <section className="tickets" aria-label="My tickets">
      <div className="ticket-toggle" role="tablist" aria-label="Ticket period">
        {(['upcoming', 'past'] as const).map((option) => (
          <button
            type="button"
            role="tab"
            key={option}
            aria-selected={filter === option}
            className={filter === option ? 'is-current' : ''}
            onClick={() => setFilter(option)}
          >
            {option === 'upcoming' ? 'Upcoming' : 'Past'}
            {!loading && <span>{lists[option].length}</span>}
          </button>
        ))}
      </div>

      {loading && <div className="skeleton ticket-skeleton" />}
      {error && (
        <div className="state-card">
          <p>{error}</p>
          <button type="button" className="btn btn-ghost" onClick={() => setReloadKey((value) => value + 1)}>
            Try again
          </button>
        </div>
      )}
      {!loading && !error && orders.length === 0 && (
        <div className="state-card">
          <p>{filter === 'upcoming' ? 'You have no upcoming tickets.' : 'You have no past tickets.'}</p>
        </div>
      )}
      {!loading && !error && orders.length > 0 && (
        <div className="ticket-list">
          {orders.map((order) => (
            <TicketCard
              key={order.reference}
              order={order}
              past={filter === 'past'}
              onRefund={() => {
                setRefundError('')
                setPending(order)
              }}
            />
          ))}
        </div>
      )}

      {pending && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !refunding) setPending(null)
          }}
        >
          <div className="modal refund-modal" role="dialog" aria-modal="true" aria-labelledby="refund-title">
            <div className="modal-head">
              <h2 id="refund-title">Refund #{pending.reference}?</h2>
              <button type="button" className="icon-button" aria-label="Close" disabled={refunding} onClick={() => setPending(null)}>
                <CloseIcon size={18} />
              </button>
            </div>
            <p className="modal-sub">
              {formatPrice(pending.totalPrice)} goes back to your card ending {pending.cardLastFour}. This cannot be undone and the
              seats go back on sale.
            </p>
            {refundError && <p className="form-error">{refundError}</p>}
            <div className="modal-foot">
              <button type="button" className="btn btn-dark" disabled={refunding} onClick={() => setPending(null)}>
                Close
              </button>
              <button type="button" className="btn btn-solid" disabled={refunding} onClick={confirmRefund}>
                {refunding ? 'Refunding…' : 'Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function TicketCard({ order, past, onRefund }: { order: Order; past: boolean; onRefund: () => void }) {
  const { session } = order
  const refunded = order.status === 'refunded'
  return (
    <article className={`ticket-card${refunded ? ' is-refunded' : ''}`}>
      {session.movie.posterUrl && <img src={session.movie.posterUrl} alt="" />}
      <div className="ticket-info">
        <div className="ticket-title">
          <h3>{session.movie.title}</h3>
          <AgeBadge code={session.movie.ageRating.code} description={session.movie.ageRating.description} />
          <span>{formatMinutes(session.movie.runtimeMinutes)}</span>
        </div>
        <dl className="ticket-facts">
          <div>
            <dt>Date</dt>
            <dd>
              {formatShowDate(session.date, 'short')} · {session.time}
            </dd>
          </div>
          <div>
            <dt>Venue</dt>
            <dd>
              {session.venue.name} · Hall {session.hall.name}
            </dd>
          </div>
          <div>
            <dt>Format</dt>
            <dd>
              {session.format.name} · {session.language.name}
            </dd>
          </div>
        </dl>
        <div className="ticket-seats">
          <span>Seats</span>
          {order.tickets.map((ticket) => (
            <em key={ticket.id}>
              {ticket.seatCode} · {ticket.ticketType.name}
            </em>
          ))}
        </div>
      </div>
      <div className="ticket-side">
        <p className="ticket-order">
          <span>Order</span>#{order.reference}
        </p>
        <p className="ticket-total">
          <span>Total paid</span>
          <strong>{formatPrice(order.totalPrice)}</strong>
        </p>
        {refunded ? (
          <p className="ticket-status">Refunded</p>
        ) : (
          <>
            <button type="button" className="btn btn-dark btn-sm" disabled={past || !order.isRefundable} onClick={onRefund}>
              Refund
            </button>
            <small>
              {past
                ? 'This screening has ended.'
                : order.isRefundable
                  ? `Refundable until ${refundDeadline(order)}`
                  : 'Refunds close 2 hours before the screening.'}
            </small>
          </>
        )}
      </div>
    </article>
  )
}

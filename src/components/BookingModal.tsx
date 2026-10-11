import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ApiError,
  createHold,
  createOrder,
  getFilterOptions,
  getHold,
  getSeatMap,
  getSession,
  releaseHold,
} from '../api'
import { useAuth } from '../auth'
import { formatPrice, formatShowDate } from '../format'
import { FieldMark } from './FieldMark'
import { CheckIcon, CloseIcon } from './Icons'
import type { FilterOptions, Order, Seat, SeatHold, SeatMap, SessionDetail, TicketType } from '../types'

const HOLD_KEY = 'kinoxii.hold'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Choice = { seatId: number; code: string; section: string; ticketType: string }
type Step = 'seats' | 'checkout' | 'done'
type Payment = {
  fullName: string
  email: string
  mobileNumber: string
  cardNumber: string
  expiry: string
  cvv: string
}

function readStoredHold(sessionId: number) {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(HOLD_KEY) || '') as { holdId?: string; sessionId?: number }
    return parsed.sessionId === sessionId && parsed.holdId ? parsed.holdId : null
  } catch {
    return null
  }
}

function writeStoredHold(sessionId: number, holdId: string) {
  sessionStorage.setItem(HOLD_KEY, JSON.stringify({ sessionId, holdId }))
}

function clearStoredHold() {
  sessionStorage.removeItem(HOLD_KEY)
}

function adultSlug(options: FilterOptions) {
  return options.ticketTypes.find((type) => type.slug === 'adult')?.slug ?? options.ticketTypes[0]?.slug ?? 'adult'
}

function allowedTypes(options: FilterOptions, minAge: number) {
  return options.ticketTypes
    .filter((type) => type.blockedFromRatingAge == null || minAge < type.blockedFromRatingAge)
    .sort((a, b) => a.priceRatio - b.priceRatio)
}

function ticketPrice(sessionPrice: number, types: TicketType[], slug: string) {
  const ratio = types.find((type) => type.slug === slug)?.priceRatio ?? 1
  return Math.round(sessionPrice * ratio * 100) / 100
}

function clock(expiresAt: string) {
  const seconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function locate(map: SeatMap, seatId: number) {
  for (const section of map.sections) {
    for (const row of section.rows) {
      const seat = row.seats.find((item) => item.id === seatId)
      if (seat) return { seat, section: section.name }
    }
  }
  return null
}

function choicesFromHold(hold: SeatHold, map: SeatMap): Choice[] {
  return hold.seats.map((seat) => ({
    seatId: seat.seatId,
    code: seat.code,
    section: locate(map, seat.seatId)?.section ?? '',
    ticketType: seat.ticketType.slug,
  }))
}

function mineChoices(map: SeatMap, options: FilterOptions): Choice[] {
  const ticketType = adultSlug(options)
  const choices: Choice[] = []
  map.sections.forEach((section) => {
    section.rows.forEach((row) => {
      row.seats.forEach((seat) => {
        if (seat.isMine) choices.push({ seatId: seat.id, code: seat.code, section: section.name, ticketType })
      })
    })
  })
  return choices
}

function nameError(value: string) {
  const name = value.trim()
  if (!name) return 'The full name field is required.'
  if (name.length < 3) return 'The full name field must be at least 3 characters.'
  if (name.length > 50) return 'The full name field must not be greater than 50 characters.'
  return ''
}

function emailError(value: string) {
  const email = value.trim()
  if (!email) return 'The email field is required.'
  if (!EMAIL_PATTERN.test(email)) return 'The email field must be a valid email address.'
  return ''
}

function mobileError(value: string) {
  const mobile = value.replace(/\s/g, '')
  if (!mobile) return 'The mobile number field is required.'
  if (!/^5\d{8}$/.test(mobile)) return 'Please enter a valid Georgian mobile number (9 digits starting with 5)'
  return ''
}

function cardError(value: string) {
  const card = value.replace(/\s/g, '')
  if (!card) return 'The card number field is required.'
  if (!/^\d{16}$/.test(card)) return 'Card number must be exactly 16 digits'
  return ''
}

function expiryError(value: string) {
  const expiry = value.trim()
  if (!expiry) return 'The expiry field is required.'
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(expiry)
  if (!match) return 'Use MM/YY'
  const month = Number(match[1])
  const year = 2000 + Number(match[2])
  const now = new Date()
  const expired = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)
  if (expired) return 'That card has expired'
  return ''
}

function cvvError(value: string) {
  if (!value) return 'The cvv field is required.'
  if (!/^\d{3}$/.test(value)) return 'CVV must be exactly 3 digits'
  return ''
}

export function BookingModal({
  sessionId,
  onClose,
  onProfileRequired,
  onSessionLoaded,
}: {
  sessionId: number
  onClose: () => void
  onProfileRequired: () => void
  onSessionLoaded?: (session: SessionDetail) => void
}) {
  const { user, requireAuth } = useAuth()
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [options, setOptions] = useState<FilterOptions | null>(null)
  const [map, setMap] = useState<SeatMap | null>(null)
  const [choices, setChoices] = useState<Choice[]>([])
  const [hold, setHold] = useState<SeatHold | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [step, setStep] = useState<Step>('seats')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [notice, setNotice] = useState('')
  const [holding, setHolding] = useState(false)
  const [paying, setPaying] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [payment, setPayment] = useState<Payment>({
    fullName: user?.fullName ?? '',
    email: user?.email ?? '',
    mobileNumber: user?.mobileNumber ?? '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({})
  const holdRef = useRef<SeatHold | null>(null)
  const paidRef = useRef(false)
  const expiredRef = useRef(false)
  const sessionLoadedRef = useRef(onSessionLoaded)
  holdRef.current = hold
  sessionLoadedRef.current = onSessionLoaded

  const leave = useCallback(() => {
    onClose()
  }, [onClose])

  useEffect(() => {
    return () => {
      const current = holdRef.current
      if (current?.isLive && !paidRef.current) {
        clearStoredHold()
        void releaseHold(current.holdId)
      }
    }
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !holding && !paying) leave()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [leave, holding, paying])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    Promise.all([getSession(sessionId), getFilterOptions(), getSeatMap(sessionId)])
      .then(async ([sessionResponse, optionsResponse, mapResponse]) => {
        if (cancelled) return
        const nextOptions = optionsResponse.data
        const nextMap = mapResponse.data
        setSession(sessionResponse.data)
        sessionLoadedRef.current?.(sessionResponse.data)
        setOptions(nextOptions)
        setMap(nextMap)
        const stored = readStoredHold(sessionId)
        if (!stored) {
          setChoices(mineChoices(nextMap, nextOptions))
          setLoading(false)
          return
        }
        try {
          const holdResponse = await getHold(stored)
          if (cancelled) return
          if (holdResponse.data.isLive) {
            setHold(holdResponse.data)
            setChoices(choicesFromHold(holdResponse.data, nextMap))
            setStep('checkout')
          } else {
            clearStoredHold()
            setWarning('Your hold time expired. Please re-select your seats.')
            setChoices(mineChoices(nextMap, nextOptions))
          }
        } catch {
          if (!cancelled) {
            clearStoredHold()
            setChoices(mineChoices(nextMap, nextOptions))
          }
        }
        if (!cancelled) setLoading(false)
      })
      .catch((reason: unknown) => {
        if (cancelled) return
        setLoading(false)
        setError(reason instanceof ApiError ? reason.message : 'We could not open this screening. Try again.')
      })
    return () => {
      cancelled = true
    }
  }, [sessionId, reloadKey])

  const expire = useCallback(() => {
    if (expiredRef.current || paidRef.current) return
    expiredRef.current = true
    holdRef.current = null
    setHold(null)
    clearStoredHold()
    setChoices([])
    setStep('seats')
    setWarning('Your hold time expired. Please re-select your seats.')
    getSeatMap(sessionId)
      .then((response) => setMap(response.data))
      .catch(() => setError('We could not refresh the seat map. Try again.'))
  }, [sessionId])

  async function reloadMap() {
    const response = await getSeatMap(sessionId)
    setMap(response.data)
  }

  async function loseSeats(message: string, codes: string[]) {
    setWarning(codes.length ? `${message} ${codes.join(', ')}` : message)
    setChoices((current) => current.filter((choice) => !codes.includes(choice.code)))
    setHold(null)
    holdRef.current = null
    clearStoredHold()
    setStep('seats')
    try {
      await reloadMap()
    } catch {
      setError('We could not refresh the seat map. Try again.')
    }
  }

  function toggleSeat(seat: Seat, section: string) {
    if (!options) return
    const max = options.maxSeatsPerOrder
    const ticketType = adultSlug(options)
    setChoices((current) => {
      if (current.some((choice) => choice.seatId === seat.id)) {
        queueMicrotask(() => setNotice(''))
        return current.filter((choice) => choice.seatId !== seat.id)
      }
      if (seat.state !== 'available' && !seat.isMine) return current
      if (current.length >= max) {
        queueMicrotask(() => setNotice(`You can book at most ${max} seats in one order.`))
        return current
      }
      queueMicrotask(() => setNotice(''))
      return [...current, { seatId: seat.id, code: seat.code, section, ticketType }]
    })
  }

  const types = options && session ? allowedTypes(options, session.movie.ageRating.minAge) : []
  const blockedChoice = choices.find((choice) => !types.some((type) => type.slug === choice.ticketType))

  async function goCheckout() {
    if (!options || holding || choices.length === 0 || blockedChoice) return
    setHolding(true)
    setWarning('')
    try {
      const response = await createHold(
        sessionId,
        choices.map((choice) => ({ seatId: choice.seatId, ticketType: choice.ticketType })),
      )
      expiredRef.current = false
      holdRef.current = response.data
      setHold(response.data)
      writeStoredHold(sessionId, response.data.holdId)
      setStep('checkout')
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) {
        requireAuth(() => goCheckout())
        return
      }
      if (reason instanceof ApiError && reason.status === 409) {
        await loseSeats(reason.message, reason.contested)
        return
      }
      if (reason instanceof ApiError && reason.status === 422 && Object.keys(reason.fieldErrors).length === 0) {
        if (reason.message.toLowerCase().includes('profile')) {
          clearStoredHold()
          onProfileRequired()
          return
        }
        setWarning(reason.message)
        return
      }
      const fieldMessage = reason instanceof ApiError ? Object.values(reason.fieldErrors)[0] : ''
      setWarning(fieldMessage || (reason instanceof Error ? reason.message : 'We could not hold these seats. Try again.'))
    } finally {
      setHolding(false)
    }
  }

  async function pay(event: FormEvent) {
    event.preventDefault()
    if (!hold) return
    setTouched({ fullName: true, email: true, mobileNumber: true, cardNumber: true, expiry: true, cvv: true })
    const problems = {
      fullName: nameError(payment.fullName),
      email: emailError(payment.email),
      mobileNumber: mobileError(payment.mobileNumber),
      cardNumber: cardError(payment.cardNumber),
      expiry: expiryError(payment.expiry),
      cvv: cvvError(payment.cvv),
    }
    if (Object.values(problems).some(Boolean)) return
    setPaying(true)
    setServerErrors({})
    setWarning('')
    try {
      const response = await createOrder({
        holdId: hold.holdId,
        fullName: payment.fullName.trim(),
        email: payment.email.trim(),
        mobileNumber: payment.mobileNumber.trim(),
        cardNumber: payment.cardNumber.trim(),
        expiry: payment.expiry.trim(),
        cvv: payment.cvv.trim(),
      })
      paidRef.current = true
      holdRef.current = null
      clearStoredHold()
      setOrder(response.data)
      setStep('done')
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) {
        requireAuth(() => {
          const form = document.querySelector<HTMLFormElement>('.checkout-form')
          form?.requestSubmit()
        })
        return
      }
      if (reason instanceof ApiError && reason.status === 409) {
        await loseSeats(reason.message, reason.contested)
        return
      }
      if (reason instanceof ApiError && reason.status === 422 && Object.keys(reason.fieldErrors).length === 0) {
        setWarning(reason.message)
        expiredRef.current = true
        holdRef.current = null
        setHold(null)
        clearStoredHold()
        setChoices([])
        setStep('seats')
        reloadMap().catch(() => setError('We could not refresh the seat map. Try again.'))
        return
      }
      if (reason instanceof ApiError) setServerErrors(reason.fieldErrors)
      else setWarning('We could not take the payment. Try again.')
    } finally {
      setPaying(false)
    }
  }

  const subtotal = options && session
    ? choices.reduce((sum, choice) => sum + ticketPrice(session.price, options.ticketTypes, choice.ticketType), 0)
    : 0

  const busy = holding || paying
  const ready = !loading && !error && session && options && map
  const notes = (
    <>
      {warning && <p className="inline-note">{warning}</p>}
      {notice && <p className="inline-note">{notice}</p>}
    </>
  )

  return (
    <div
      className="modal-backdrop booking-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) leave()
      }}
    >
      <div
        className={`modal booking-modal${step === 'done' ? ' is-done' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
      >
        {step !== 'done' && (
          <header className="booking-head">
            <div>
              <h2 id="booking-title">{session?.movie.title ?? 'Select seats'}</h2>
              {session && (
                <p className="booking-meta">
                  {session.venue.name} · Hall {session.hall.name} · {formatShowDate(session.date)} · {session.time} ·{' '}
                  {session.format.name} · {session.language.name}
                </p>
              )}
            </div>
            <div className="booking-head-side">
              {hold?.isLive && <HoldClock expiresAt={hold.expiresAt} onExpire={expire} />}
              <button type="button" className="icon-button" aria-label="Close" onClick={leave} disabled={busy}>
                <CloseIcon size={18} />
              </button>
            </div>
          </header>
        )}

        {step !== 'done' && (
          <div className="booking-body">
            <div className="booking-main">
              <div className="booking-tabs" role="tablist" aria-label="Booking steps">
                <button
                  type="button"
                  role="tab"
                  aria-selected={step === 'seats'}
                  className={step === 'seats' ? 'is-current' : ''}
                  onClick={() => setStep('seats')}
                  disabled={paying}
                >
                  Seats
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={step === 'checkout'}
                  className={step === 'checkout' ? 'is-current' : ''}
                  onClick={() => {
                    if (step === 'seats') void goCheckout()
                  }}
                  disabled={step === 'seats' && (holding || choices.length === 0 || Boolean(blockedChoice))}
                >
                  Checkout
                </button>
              </div>

              {notes}
              {loading && <div className="skeleton session-skeleton" />}
              {error && (
                <div className="state-card">
                  <p>{error}</p>
                  <button type="button" className="btn btn-ghost" onClick={() => setReloadKey((value) => value + 1)}>
                    Try again
                  </button>
                </div>
              )}

              {ready && step === 'seats' && (
                <div className="seat-map">
                  <div className="screen">Screen</div>
                  {map.sections.map((section) => (
                    <section className="hall-section" key={section.name}>
                      <h3>{sectionLabel(section)}</h3>
                      {section.rows.map((row) => (
                        <div className="seat-row" key={row.label}>
                          <span className="row-label">{row.label}</span>
                          <div className="seat-line">
                            {row.seats.map((seat) => (
                              <span className="seat-slot" key={seat.id}>
                                {seat.state === 'unavailable' && !seat.isMine ? (
                                  <span className="seat-gap" />
                                ) : (
                                  <button
                                    type="button"
                                    className={seatClass(seat, choices)}
                                    disabled={seat.state !== 'available' && !seat.isMine && !choices.some((choice) => choice.seatId === seat.id)}
                                    aria-pressed={choices.some((choice) => choice.seatId === seat.id)}
                                    aria-label={`${seat.code} ${seat.state}`}
                                    onClick={() => toggleSeat(seat, section.name)}
                                  >
                                    {seat.label}
                                  </button>
                                )}
                                {seat.aisleAfter && <span className="aisle" />}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </section>
                  ))}
                  <ul className="seat-legend">
                    <li><i className="swatch is-available" /> Available</li>
                    <li><i className="swatch is-selected" /> Selected</li>
                    <li><i className="swatch is-sold" /> Sold</li>
                    <li><i className="swatch is-held" /> Held</li>
                  </ul>
                </div>
              )}

              {ready && hold && step === 'checkout' && (
                <form id="checkout-form" className="checkout-form" onSubmit={pay} noValidate>
                  <PayField label="Full name" name="fullName" value={payment.fullName} placeholder="e.g. Meri Sanikidze" autoComplete="name" touched={touched} serverErrors={serverErrors} error={nameError(payment.fullName)} onBlur={() => setTouched((current) => ({ ...current, fullName: true }))} onChange={(value) => setPayment((current) => ({ ...current, fullName: value }))} />
                  <div className="field-pair">
                    <PayField label="Email" name="email" value={payment.email} placeholder="e.g. example@gmail.com" autoComplete="email" touched={touched} serverErrors={serverErrors} error={emailError(payment.email)} onBlur={() => setTouched((current) => ({ ...current, email: true }))} onChange={(value) => setPayment((current) => ({ ...current, email: value }))} />
                    <PayField label="Mobile number" name="mobileNumber" value={payment.mobileNumber} placeholder="e.g. 555 123 456" inputMode="numeric" autoComplete="tel-national" touched={touched} serverErrors={serverErrors} error={mobileError(payment.mobileNumber)} onBlur={() => setTouched((current) => ({ ...current, mobileNumber: true }))} onChange={(value) => setPayment((current) => ({ ...current, mobileNumber: value }))} />
                  </div>
                  <hr className="checkout-rule" />
                  <PayField label="Card number" name="cardNumber" value={payment.cardNumber} placeholder="e.g. 1234 4567 8901 2345" inputMode="numeric" autoComplete="cc-number" touched={touched} serverErrors={serverErrors} error={cardError(payment.cardNumber)} onBlur={() => setTouched((current) => ({ ...current, cardNumber: true }))} onChange={(value) => setPayment((current) => ({ ...current, cardNumber: value }))} />
                  <div className="field-pair">
                    <PayField label="Expiry" name="expiry" value={payment.expiry} placeholder="e.g. 12/34" autoComplete="cc-exp" touched={touched} serverErrors={serverErrors} error={expiryError(payment.expiry)} onBlur={() => setTouched((current) => ({ ...current, expiry: true }))} onChange={(value) => setPayment((current) => ({ ...current, expiry: value }))} />
                    <PayField label="CVV" name="cvv" value={payment.cvv} placeholder="e.g. 123" inputMode="numeric" autoComplete="cc-csc" touched={touched} serverErrors={serverErrors} error={cvvError(payment.cvv)} onBlur={() => setTouched((current) => ({ ...current, cvv: true }))} onChange={(value) => setPayment((current) => ({ ...current, cvv: value }))} />
                  </div>
                </form>
              )}
            </div>

            {ready && (
              <aside className="booking-side">
                {step === 'seats' && (
                  <>
                    <h3>Your seats · Max {options.maxSeatsPerOrder}</h3>
                    {choices.length === 0 && (
                      <p className="side-hint">
                        Pick up to {options.maxSeatsPerOrder} seats from the map. Each seat can carry its own ticket type.
                      </p>
                    )}
                    <div className="seat-cards">
                      {choices.map((choice) => {
                        const type = options.ticketTypes.find((item) => item.slug === choice.ticketType)
                        return (
                          <div className="seat-card" key={choice.seatId}>
                            <div className="seat-card-head">
                              <span>
                                Seat <b>{choice.code}</b>
                              </span>
                              <strong>{formatPrice(ticketPrice(session.price, options.ticketTypes, choice.ticketType))}</strong>
                              <button
                                type="button"
                                className="seat-remove"
                                aria-label={`Remove seat ${choice.code}`}
                                onClick={() => {
                                  setNotice('')
                                  setChoices((current) => current.filter((item) => item.seatId !== choice.seatId))
                                }}
                              >
                                <CloseIcon size={14} />
                              </button>
                            </div>
                            <div className="type-pills" role="radiogroup" aria-label={`Ticket type for ${choice.code}`}>
                              {types.map((typeOption) => (
                                <button
                                  type="button"
                                  role="radio"
                                  key={typeOption.slug}
                                  aria-checked={choice.ticketType === typeOption.slug}
                                  className={choice.ticketType === typeOption.slug ? 'is-current' : ''}
                                  onClick={() =>
                                    setChoices((current) =>
                                      current.map((item) =>
                                        item.seatId === choice.seatId ? { ...item, ticketType: typeOption.slug } : item,
                                      ),
                                    )
                                  }
                                >
                                  {typeOption.name} {Math.round(typeOption.priceRatio * 100)}%
                                </button>
                              ))}
                            </div>
                            {type?.note && <small>{type.note}</small>}
                          </div>
                        )
                      })}
                    </div>
                    {blockedChoice && (
                      <p className="inline-note">
                        {blockedChoice.code}: Child tickets are not available for {session.movie.ageRating.code} titles.
                      </p>
                    )}
                    <div className="booking-total">
                      <p>
                        <span>Subtotal</span>
                        <strong>{formatPrice(subtotal)}</strong>
                      </p>
                      <button
                        type="button"
                        className="btn btn-solid"
                        onClick={goCheckout}
                        disabled={holding || choices.length === 0 || Boolean(blockedChoice)}
                      >
                        {holding ? 'Holding seats…' : 'Next: Checkout'}
                      </button>
                    </div>
                  </>
                )}

                {step === 'checkout' && hold && (
                  <>
                    <h3>Summary</h3>
                    <div className="summary-card">
                      <h4>{session.movie.title}</h4>
                      <p>
                        Hall {session.hall.name} · {formatShowDate(session.date, 'short')} · {session.time}
                      </p>
                      <dl>
                        <div>
                          <dt>Seats</dt>
                          <dd>{hold.seats.map((seat) => seat.code).join(', ')}</dd>
                        </div>
                        <div>
                          <dt>Tickets</dt>
                          <dd>{ticketSummary(hold.seats.map((seat) => seat.ticketType.name))}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="booking-total">
                      <p>
                        <span>Subtotal</span>
                        <strong>{formatPrice(hold.subtotal)}</strong>
                      </p>
                      <button type="submit" form="checkout-form" className="btn btn-solid" disabled={paying}>
                        {paying ? 'Paying…' : 'Pay & Complete Order'}
                      </button>
                    </div>
                  </>
                )}
              </aside>
            )}
          </div>
        )}

        {step === 'done' && order && (
          <div className="confirmation">
            <span className="confirm-check" aria-hidden="true">
              <CheckIcon size={28} />
            </span>
            <h2 id="booking-title">Booking confirmed!</h2>
            <p className="confirm-sub">Your tickets are ready. We've sent the confirmation to your email.</p>
            <span className="order-pill">Order #{order.reference}</span>
            <div className="summary-card confirm-card">
              <div className="confirm-film">
                <img src={order.session.movie.posterUrl} alt="" />
                <div>
                  <h4>{order.session.movie.title}</h4>
                  <p>
                    {order.session.venue.name} · Hall {order.session.hall.name} · {formatShowDate(order.session.date, 'short')} ·{' '}
                    {order.session.time}
                  </p>
                </div>
              </div>
              <dl>
                <div>
                  <dt>Seats</dt>
                  <dd>{order.tickets.map((ticket) => ticket.seatCode).join(', ')}</dd>
                </div>
                <div>
                  <dt>Tickets</dt>
                  <dd>{ticketSummary(order.tickets.map((ticket) => ticket.ticketType.name))}</dd>
                </div>
                <div>
                  <dt>Card</dt>
                  <dd>•••• {order.cardLastFour}</dd>
                </div>
              </dl>
              <p className="summary-total">
                <span>Total paid</span>
                <strong>{formatPrice(order.totalPrice)}</strong>
              </p>
            </div>
            <div className="confirm-actions">
              <Link to="/profile?tab=tickets" className="btn btn-solid">
                My Tickets
              </Link>
              <button type="button" className="btn btn-dark" onClick={leave}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function sectionLabel(section: SeatMap['sections'][number]) {
  const first = section.rows[0]?.label
  const last = section.rows[section.rows.length - 1]?.label
  if (!first) return section.name
  return first === last ? `${section.name} · Row ${first}` : `${section.name} · Rows ${first}-${last}`
}

function ticketSummary(names: string[]) {
  const counts = new Map<string, number>()
  names.forEach((name) => counts.set(name, (counts.get(name) ?? 0) + 1))
  return [...counts].map(([name, count]) => `${count} x ${name}`).join(', ')
}

function seatClass(seat: Seat, choices: Choice[]) {
  if (choices.some((choice) => choice.seatId === seat.id)) return 'seat is-selected'
  if (seat.state === 'sold') return 'seat is-sold'
  if (seat.state === 'held' && !seat.isMine) return 'seat is-held'
  return 'seat is-available'
}

function HoldClock({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) {
  const [label, setLabel] = useState(() => clock(expiresAt))
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (new Date(expiresAt).getTime() <= Date.now()) {
        setLabel('0:00')
        onExpire()
        return
      }
      setLabel(clock(expiresAt))
    }, 250)
    return () => window.clearInterval(timer)
  }, [expiresAt, onExpire])
  return (
    <p className="hold-clock" role="timer" aria-live="off">
      <span>Seats held</span>
      <strong>{label}</strong>
    </p>
  )
}

function PayField({
  label,
  name,
  value,
  error,
  touched,
  serverErrors,
  onBlur,
  onChange,
  placeholder,
  inputMode,
  autoComplete,
}: {
  label: string
  name: keyof Payment
  value: string
  error: string
  touched: Record<string, boolean>
  serverErrors: Record<string, string>
  onBlur: () => void
  onChange: (value: string) => void
  placeholder?: string
  inputMode?: 'numeric'
  autoComplete?: string
}) {
  const message = serverErrors[name] || (touched[name] ? error : '')
  const tone = message ? 'is-invalid' : touched[name] && value ? 'is-valid' : ''
  return (
    <label className={`field ${tone}`}>
      <span>{label}</span>
      <span className="field-control">
        <input
          name={name}
          value={value}
          placeholder={placeholder}
          inputMode={inputMode}
          autoComplete={autoComplete}
          aria-invalid={Boolean(message)}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
        />
        <FieldMark tone={tone} />
      </span>
      {message && <small>{message}</small>}
    </label>
  )
}

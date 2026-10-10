import { useEffect, useId, useState, type FormEvent } from 'react'
import { ApiError } from '../api'
import { useAuth } from '../auth'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

type LoginFields = { email: string; password: string }
type SignupFields = LoginFields & { username: string; confirmPassword: string }

function emailError(value: string) {
  if (!value.trim()) return 'Email is required'
  if (!EMAIL_PATTERN.test(value.trim())) return 'Please enter a valid email'
  return ''
}

function passwordError(value: string) {
  if (!value) return 'Password is required'
  if (value.length < 3) return 'Password must be at least 3 characters'
  return ''
}

function usernameError(value: string) {
  if (!value.trim()) return 'Username is required'
  if (value.trim().length < 3) return 'Username must be at least 3 characters'
  return ''
}

export function AuthModal() {
  const { mode, closeAuth, openAuth, login, register } = useAuth()
  if (!mode) return null
  return (
    <AuthDialog
      key={mode}
      mode={mode}
      onClose={closeAuth}
      onSwitch={() => openAuth(mode === 'login' ? 'signup' : 'login')}
      onLogin={login}
      onRegister={register}
    />
  )
}

function AuthDialog({
  mode,
  onClose,
  onSwitch,
  onLogin,
  onRegister,
}: {
  mode: 'login' | 'signup'
  onClose: () => void
  onSwitch: () => void
  onLogin: (email: string, password: string) => Promise<void>
  onRegister: (input: {
    username: string
    email: string
    password: string
    passwordConfirmation: string
    avatar: File | null
  }) => Promise<void>
}) {
  const titleId = useId()
  const [values, setValues] = useState<SignupFields>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [avatar, setAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [avatarError, setAvatarError] = useState('')

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  function update(field: keyof SignupFields, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setServerErrors((current) => ({ ...current, [field]: '' }))
    setFormError('')
  }

  const clientErrors: Record<string, string> = {
    email: emailError(values.email),
    password: passwordError(values.password),
    username: mode === 'signup' ? usernameError(values.username) : '',
    confirmPassword:
      mode === 'signup'
        ? !values.confirmPassword
          ? 'Confirm your password'
          : values.confirmPassword !== values.password
            ? 'Passwords do not match'
            : ''
        : '',
    avatar: avatarError,
  }

  function message(field: string) {
    return serverErrors[field] || ((touched[field] || submitting) && clientErrors[field]) || ''
  }

  function tone(field: keyof SignupFields) {
    if (message(field)) return 'is-invalid'
    if (touched[field] && values[field]) return 'is-valid'
    return ''
  }

  function onAvatar(file: File | undefined) {
    setAvatarError('')
    setServerErrors((current) => ({ ...current, avatar: '' }))
    if (!file) {
      setAvatar(null)
      setAvatarPreview('')
      return
    }
    const allowed = AVATAR_TYPES.has(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name)
    if (!allowed) {
      setAvatar(null)
      setAvatarPreview('')
      setAvatarError('Please upload a jpg, png, or webp image')
      setTouched((current) => ({ ...current, avatar: true }))
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatar(null)
      setAvatarPreview('')
      setAvatarError('Avatar must be 2MB or smaller')
      setTouched((current) => ({ ...current, avatar: true }))
      return
    }
    setAvatar(file)
    setAvatarPreview(URL.createObjectURL(file))
    setTouched((current) => ({ ...current, avatar: true }))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setTouched({ email: true, password: true, username: true, confirmPassword: true, avatar: true })
    const blocked =
      clientErrors.email ||
      clientErrors.password ||
      clientErrors.username ||
      clientErrors.confirmPassword ||
      clientErrors.avatar
    if (blocked) return

    setSubmitting(true)
    setFormError('')
    setServerErrors({})
    try {
      if (mode === 'login') {
        await onLogin(values.email.trim(), values.password)
      } else {
        await onRegister({
          username: values.username.trim(),
          email: values.email.trim(),
          password: values.password,
          passwordConfirmation: values.confirmPassword,
          avatar,
        })
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setServerErrors({
          email: error.fieldErrors.email ?? '',
          password: error.fieldErrors.password ?? '',
          username: error.fieldErrors.username ?? '',
          confirmPassword: error.fieldErrors.password_confirmation ?? '',
          avatar: error.fieldErrors.avatar ?? '',
        })
        if (Object.keys(error.fieldErrors).length === 0) setFormError(error.message)
      } else {
        setFormError('Something went wrong. Try again.')
      }
      setSubmitting(false)
    }
  }

  const title = mode === 'login' ? 'Log in' : 'Sign up'

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} noValidate>
          {mode === 'signup' && (
            <Field
              label="Username"
              name="username"
              value={values.username}
              tone={tone('username')}
              error={message('username')}
              disabled={submitting}
              onBlur={() => setTouched((current) => ({ ...current, username: true }))}
              onChange={(value) => update('username', value)}
            />
          )}
          <Field
            label="Email"
            name="email"
            type="email"
            value={values.email}
            tone={tone('email')}
            error={message('email')}
            disabled={submitting}
            onBlur={() => setTouched((current) => ({ ...current, email: true }))}
            onChange={(value) => update('email', value)}
          />
          <Field
            label="Password"
            name="password"
            type="password"
            value={values.password}
            tone={tone('password')}
            error={message('password')}
            disabled={submitting}
            onBlur={() => setTouched((current) => ({ ...current, password: true }))}
            onChange={(value) => update('password', value)}
          />
          {mode === 'signup' && (
            <Field
              label="Confirm password"
              name="confirmPassword"
              type="password"
              value={values.confirmPassword}
              tone={tone('confirmPassword')}
              error={message('confirmPassword')}
              disabled={submitting}
              onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))}
              onChange={(value) => update('confirmPassword', value)}
            />
          )}
          {mode === 'signup' && (
            <div className={`field ${message('avatar') ? 'is-invalid' : avatar ? 'is-valid' : ''}`}>
              <span>Avatar</span>
              <label className="avatar-picker">
                {avatarPreview ? <img src={avatarPreview} alt="" /> : <span>Optional</span>}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={submitting}
                  onChange={(event) => onAvatar(event.target.files?.[0])}
                />
              </label>
              {message('avatar') && <small>{message('avatar')}</small>}
            </div>
          )}

          {formError && <p className="form-error">{formError}</p>}

          <button type="submit" className="btn btn-solid btn-block" disabled={submitting}>
            {submitting ? 'Please wait…' : title}
          </button>
        </form>

        <div className="modal-foot">
          <button type="button" className="text-button" onClick={onSwitch} disabled={submitting}>
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  name,
  value,
  tone,
  error,
  disabled,
  type = 'text',
  onBlur,
  onChange,
}: {
  label: string
  name: string
  value: string
  tone: string
  error: string
  disabled: boolean
  type?: string
  onBlur: () => void
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <label className={`field ${tone}`} htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        disabled={disabled}
        autoComplete={name === 'confirmPassword' ? 'new-password' : name}
        aria-invalid={Boolean(error)}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
      />
      {tone === 'is-valid' && <em className="field-mark">✓</em>}
      {error && <small>{error}</small>}
    </label>
  )
}

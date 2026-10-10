import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ApiError, getMe, login as loginRequest, logout as logoutRequest, register as registerRequest } from './api'
import { clearToken, readToken, writeToken } from './session'
import type { User } from './types'

type AuthMode = 'login' | 'signup'

type AuthContextValue = {
  user: User | null
  ready: boolean
  mode: AuthMode | null
  openAuth: (mode: AuthMode) => void
  closeAuth: () => void
  login: (email: string, password: string) => Promise<void>
  register: (input: {
    username: string
    email: string
    password: string
    passwordConfirmation: string
    avatar: File | null
  }) => Promise<void>
  logout: () => Promise<void>
  requireAuth: (action: () => Promise<void> | void) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(() => !readToken())
  const [mode, setMode] = useState<AuthMode | null>(null)
  const pending = useRef<(() => Promise<void> | void) | null>(null)

  useEffect(() => {
    const token = readToken()
    if (!token) return
    getMe()
      .then(setUser)
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) clearToken()
      })
      .finally(() => setReady(true))
  }, [])

  const finish = useCallback(async (nextUser: User, token: string) => {
    writeToken(token)
    setUser(nextUser)
    const action = pending.current
    pending.current = null
    setMode(null)
    if (action) await action()
  }, [])

  const openAuth = useCallback((next: AuthMode) => setMode(next), [])

  const closeAuth = useCallback(() => {
    pending.current = null
    setMode(null)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await loginRequest(email, password)
      await finish(response.data.user, response.data.token)
    },
    [finish],
  )

  const register = useCallback(
    async (input: {
      username: string
      email: string
      password: string
      passwordConfirmation: string
      avatar: File | null
    }) => {
      const response = await registerRequest(input)
      await finish(response.data.user, response.data.token)
    },
    [finish],
  )

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      clearToken()
      setUser(null)
    }
  }, [])

  const requireAuth = useCallback(
    (action: () => Promise<void> | void) => {
      if (user) {
        void Promise.resolve(action()).catch((error: unknown) => {
          if (error instanceof ApiError && error.status === 401) {
            clearToken()
            setUser(null)
            pending.current = action
            setMode('login')
          }
        })
        return
      }
      pending.current = action
      setMode('login')
    },
    [user],
  )

  const value = useMemo(
    () => ({ user, ready, mode, openAuth, closeAuth, login, register, logout, requireAuth }),
    [user, ready, mode, openAuth, closeAuth, login, register, logout, requireAuth],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}

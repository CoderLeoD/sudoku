import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AUTH_SESSION_STORAGE_KEY, authService } from '../data/dataServices.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true

    const loadSession = async () => {
      try {
        const nextUser = await authService.getCurrentUser()
        if (active) setUser(nextUser)
      } catch (error) {
        console.error('无法读取账户状态', error)
        if (active) setUser(null)
      } finally {
        if (active) setReady(true)
      }
    }

    const syncSession = (event) => {
      if (event.key === AUTH_SESSION_STORAGE_KEY) loadSession()
    }

    loadSession()
    window.addEventListener('storage', syncSession)
    return () => {
      active = false
      window.removeEventListener('storage', syncSession)
    }
  }, [])

  const login = useCallback(async (credentials) => {
    const nextUser = await authService.login(credentials)
    setUser(nextUser)
    setReady(true)
    return nextUser
  }, [])

  const register = useCallback(async (credentials) => {
    const nextUser = await authService.register(credentials)
    setUser(nextUser)
    setReady(true)
    return nextUser
  }, [])

  const logout = useCallback(async () => {
    setUser(null)
    await authService.logout()
  }, [])

  const value = useMemo(() => ({ user, ready, login, register, logout }), [user, ready, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

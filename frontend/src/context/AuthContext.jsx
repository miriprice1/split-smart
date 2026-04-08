import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('splitsmart_user') || 'null') } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('splitsmart_token')
    if (!token) { setLoading(false); return }
    // Verify token is still valid
    api.me()
      .then(u => { setUser(u); setLoading(false) })
      .catch(() => { logout(); setLoading(false) })
  }, [])

  const login = (token, userData) => {
    localStorage.setItem('splitsmart_token', token)
    localStorage.setItem('splitsmart_user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('splitsmart_token')
    localStorage.removeItem('splitsmart_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

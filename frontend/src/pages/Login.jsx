import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }))

  const submit = async () => {
    setError('')
    if (mode === 'register' && !form.name.trim()) return setError('שם נדרש')
    if (!form.email.trim()) return setError('אימייל נדרש')
    if (!form.password) return setError('סיסמה נדרשת')
    setLoading(true)
    try {
      const res = mode === 'login'
        ? await api.login({ email: form.email, password: form.password })
        : await api.register({ name: form.name, email: form.email, password: form.password })
      login(res.token, res.user)
      navigate(from, { replace: true })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">💸</div>
          <h1 className="text-3xl font-bold text-gray-900">SplitSmart</h1>
          <p className="text-gray-500 mt-1">חלוקת הוצאות חכמה לחברים</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          {/* Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'login' ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}
            >
              כניסה
            </button>
            <button
              onClick={() => { setMode('register'); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'register' ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}
            >
              הרשמה
            </button>
          </div>

          <div className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
                <input
                  autoFocus={mode === 'register'}
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  placeholder="השם שלך"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-right"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
              <input
                autoFocus={mode === 'login'}
                type="email"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                placeholder="your@email.com"
                dir="ltr"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-left"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
              <input
                type="password"
                value={form.password}
                onChange={e => update('password', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder={mode === 'register' ? 'לפחות 6 תווים' : '••••••••'}
                dir="ltr"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-left"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading}
            className="mt-5 w-full py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-base hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            {loading ? '...' : mode === 'login' ? 'כניסה' : 'צור חשבון'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          {mode === 'login' ? 'עדיין אין לך חשבון? ' : 'כבר יש לך חשבון? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            className="text-indigo-600 font-medium hover:underline"
          >
            {mode === 'login' ? 'הירשם' : 'התחבר'}
          </button>
        </p>
      </div>
    </div>
  )
}

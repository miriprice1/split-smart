import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function NavBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  if (!user) return null

  const onDashboard = location.pathname === '/dashboard'
  const onHome = location.pathname === '/'

  return (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="font-bold text-indigo-600 text-base tracking-tight"
        >
          💸 SplitSmart
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard')}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
              onDashboard ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            הדשבורד שלי
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            יציאה
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Layout({ children, title, back, actions }) {
  const navigate = useNavigate()
  return (
    <>
      <NavBar />
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          {back && (
            <button
              onClick={() => navigate(back)}
              className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
              aria-label="חזרה"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-900 flex-1 min-w-0">{title}</h1>
          {actions}
        </div>
        {children}
      </div>
    </>
  )
}

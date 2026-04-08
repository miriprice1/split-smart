import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

function CreateGroupModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!name.trim()) return setError('שם הקבוצה חסר')
    setLoading(true)
    try {
      const group = await api.createGroup({ name: name.trim() })
      onCreate(group)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-2 text-gray-900">קבוצה חדשה</h2>
        <p className="text-sm text-gray-500 mb-5">
          תקבל קישור הזמנה לשיתוף עם חברים — כל אחד יצטרף עם החשבון שלו
        </p>

        <label className="block text-sm font-medium text-gray-700 mb-1">שם הקבוצה</label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder='למשל: "הדירה"'
          className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-right"
        />

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          >
            ביטול
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? '...' : 'צור קבוצה'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [groups, setGroups] = useState([])
  const [showModal, setShowModal] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()
  const currentUser = user?.name || ''

  useEffect(() => {
    api.getGroups().then(setGroups).catch(console.error)
  }, [])

  const handleCreateClick = () => setShowModal(true)

  const handleCreate = (group) => {
    setGroups(prev => [group, ...prev])
    setShowModal(false)
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('למחוק את הקבוצה?')) return
    await api.deleteGroup(id)
    setGroups(prev => prev.filter(g => g.id !== id))
  }

  return (
    <Layout
      title="SplitSmart 💸"
      actions={
        <button
          onClick={handleCreateClick}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors"
        >
          + קבוצה חדשה
        </button>
      }
    >
      {groups.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">👥</div>
          <p className="text-gray-500 text-lg">אין עדיין קבוצות</p>
          <p className="text-gray-400 text-sm mt-1">צור קבוצה ראשונה כדי להתחיל</p>
          <button
            onClick={handleCreateClick}
            className="mt-6 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700"
          >
            צור קבוצה ראשונה
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => (
            <div
              key={g.id}
              onClick={() => navigate(`/groups/${g.id}`)}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{g.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {g.members.slice(0, 4).map(m => m.name).join(', ')}
                    {g.members.length > 4 && ` ועוד ${g.members.length - 4}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-full">
                    {g.members.length} חברים
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, g.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors p-1"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CreateGroupModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </Layout>
  )
}

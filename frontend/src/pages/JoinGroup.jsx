import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

export default function JoinGroup() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [groupInfo, setGroupInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getGroupByCode(code)
      .then(setGroupInfo)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [code])

  const handleJoin = async () => {
    setJoining(true)
    try {
      const group = await api.joinGroup(code)
      navigate(`/groups/${group.id}`)
    } catch (e) {
      setError(e.message)
      setJoining(false)
    }
  }

  if (loading) return (
    <Layout title="הצטרפות לקבוצה">
      <div className="text-center py-20 text-gray-400">טוען...</div>
    </Layout>
  )

  return (
    <Layout title="הצטרפות לקבוצה" back="/">
      {error ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">❌</div>
          <p className="text-red-500 font-medium">{error}</p>
          <button onClick={() => navigate('/')} className="mt-6 text-indigo-600 hover:underline text-sm">
            חזרה לדף הבית
          </button>
        </div>
      ) : groupInfo ? (
        <div className="max-w-sm mx-auto mt-10">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
            <div className="text-5xl mb-4">👥</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{groupInfo.name}</h2>
            <p className="text-gray-400 text-sm mb-6">{groupInfo.member_count} חברים בקבוצה</p>

            {groupInfo.already_member ? (
              <>
                <div className="bg-green-50 text-green-700 rounded-xl px-4 py-3 text-sm font-medium mb-5">
                  אתה כבר חבר בקבוצה זו
                </div>
                <button
                  onClick={() => navigate(`/groups/${groupInfo.id}`)}
                  className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                >
                  עבור לקבוצה
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-600 text-sm mb-6">
                  תצטרף בתור{' '}
                  <span className="font-bold text-indigo-700">{user?.name}</span>
                </p>
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all"
                >
                  {joining ? 'מצטרף...' : 'הצטרף לקבוצה'}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </Layout>
  )
}

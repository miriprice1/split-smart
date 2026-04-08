import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

function StatCard({ label, amount, color }) {
  const colors = {
    green: 'bg-green-50 text-green-700 border-green-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    gray: 'bg-gray-50 text-gray-600 border-gray-100',
  }
  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-xl font-bold">{Math.abs(amount).toLocaleString('he-IL')}₪</p>
    </div>
  )
}

function SettlementRow({ s, myName, onMarkDone }) {
  const isMyDebt = s.from === myName
  const isDone = s.status === 'done'
  return (
    <div className={`flex items-center gap-2 py-2 ${isDone ? 'opacity-50' : ''}`}>
      <div className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-lg ${
        isDone ? 'bg-gray-100 text-gray-400' : isMyDebt ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
      }`}>
        {isMyDebt ? `אתה → ${s.to}` : `${s.from} → אתה`}
      </div>
      <span className={`font-bold text-sm ${isDone ? 'text-gray-400' : isMyDebt ? 'text-red-600' : 'text-green-600'}`}>
        {s.amount.toLocaleString('he-IL')}₪
      </span>
      <div className="mr-auto flex-shrink-0">
        {isDone ? (
          <span className="text-xs text-green-600 font-medium">✓ בוצע</span>
        ) : isMyDebt ? (
          <button
            onClick={() => onMarkDone(s.id)}
            className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 font-medium"
          >
            בוצע ✓
          </button>
        ) : (
          <span className="text-xs text-gray-400">ממתין</span>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'pending' | 'completed'

  useEffect(() => {
    api.getDashboard().then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleMarkDone = async (eventId, settlementId) => {
    try {
      await api.markSettlementDone(eventId, settlementId)
      // Refresh dashboard
      const updated = await api.getDashboard()
      setData(updated)
    } catch (e) {
      alert(e.message)
    }
  }

  if (loading) return (
    <Layout title="הדשבורד שלי" back="/">
      <div className="text-center py-20 text-gray-400">טוען...</div>
    </Layout>
  )

  if (!data) return null

  const { stats, events } = data
  const filtered = events.filter(ev => {
    if (filter === 'pending') return ev.event_status === 'active'
    if (filter === 'completed') return ev.event_status === 'completed'
    return true
  })

  return (
    <Layout title={`שלום, ${user.name} 👋`} back="/">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard label="שילמתי סה״כ" amount={stats.total_paid} color="indigo" />
        <StatCard
          label={stats.net >= 0 ? "מגיע לי" : "אני חייב"}
          amount={stats.net}
          color={stats.net >= 0 ? 'green' : 'red'}
        />
        <StatCard label="עדיין חייב" amount={stats.total_owe} color="red" />
        <StatCard label="מגיע לי בחזרה" amount={stats.total_owed_to_me} color="green" />
      </div>

      {/* Filter */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
        {[['all', 'הכל'], ['pending', 'פתוח'], ['completed', 'הושלם']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${filter === val ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Events */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🎉</div>
          <p className="text-gray-500">אין אירועים להצגה</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(ev => {
            const diff = ev.my_payment - ev.fair_share
            const pct = ev.fair_share > 0 ? Math.min(100, (ev.my_payment / (ev.total_paid || 1)) * 100) : 0
            const hasMySettlements = ev.my_settlements.length > 0
            return (
              <div key={ev.event_id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Header */}
                <div
                  className="px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => navigate(`/events/${ev.event_id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{ev.event_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {ev.group_name} · {new Date(ev.created_at).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {ev.event_status === 'completed' ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ הושלם</span>
                      ) : (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">פתוח</span>
                      )}
                    </div>
                  </div>

                  {/* Payment bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>שילמתי: <span className="font-semibold text-gray-800">{ev.my_payment.toLocaleString('he-IL')}₪</span></span>
                      <span>חלק שלי: <span className={`font-semibold ${Math.abs(diff) < 0.01 ? 'text-gray-600' : diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {ev.fair_share.toLocaleString('he-IL', { maximumFractionDigits: 0 })}₪
                      </span></span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${diff > 0.01 ? 'bg-green-400' : diff < -0.01 ? 'bg-red-400' : 'bg-indigo-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {Math.abs(diff) > 0.01 && (
                      <p className={`text-xs mt-1 ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {diff > 0 ? `שילמתי יותר ב-${diff.toFixed(0)}₪` : `חייב עוד ${Math.abs(diff).toFixed(0)}₪`}
                      </p>
                    )}
                  </div>
                </div>

                {/* Settlements */}
                {hasMySettlements && (
                  <div className="border-t border-gray-50 px-5 py-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">ההעברות שלי</p>
                    <div className="divide-y divide-gray-50">
                      {ev.my_settlements.map(s => (
                        <SettlementRow
                          key={s.id}
                          s={s}
                          myName={user.name}
                          onMarkDone={(sid) => handleMarkDone(ev.event_id, sid)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}

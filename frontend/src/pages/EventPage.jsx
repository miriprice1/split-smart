import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

// ── Settlement Result Modal ───────────────────────────────────────────────────

function SettlementResult({ result, onClose }) {
  const { total, fair_share, payments, transactions } = result

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="bg-gradient-to-l from-indigo-600 to-purple-600 p-6 text-white">
          <h2 className="text-2xl font-bold mb-1">סיכום 💸</h2>
          <p className="text-indigo-200 text-sm">
            סה״כ: {total.toLocaleString('he-IL')}₪ · כל אחד: {fair_share.toLocaleString('he-IL')}₪
          </p>
        </div>
        <div className="p-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">מה שולם</h3>
          <div className="space-y-1.5 mb-6">
            {payments.map(p => (
              <div key={p.member_name} className="flex justify-between items-center">
                <span className="text-gray-800 font-medium">{p.member_name}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${p.amount > fair_share ? 'text-green-600' : p.amount < fair_share ? 'text-red-500' : 'text-gray-500'}`}>
                    {p.amount.toLocaleString('he-IL')}₪
                  </span>
                  {Math.abs(p.amount - fair_share) > 0.01 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.amount > fair_share ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {p.amount > fair_share ? `+${(p.amount - fair_share).toFixed(0)}` : `${(p.amount - fair_share).toFixed(0)}`}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            העברות נדרשות
            <span className="mr-2 text-indigo-600 normal-case font-medium">
              {transactions.length === 0 ? '✓ מסולק' : `${transactions.length} העברות`}
            </span>
          </h3>

          {transactions.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <div className="text-4xl mb-2">🎉</div>
              <p>הכל מסולק!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((t, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
                  <div className="bg-red-100 text-red-700 font-semibold text-sm px-3 py-1.5 rounded-lg flex-shrink-0">
                    {t.from}
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                    <span className="text-indigo-700 font-bold text-base">{t.amount.toLocaleString('he-IL')}₪</span>
                    <div className="flex items-center gap-1 text-gray-400 text-sm"><span>←</span><span>מעביר</span></div>
                  </div>
                  <div className="bg-green-100 text-green-700 font-semibold text-sm px-3 py-1.5 rounded-lg flex-shrink-0">
                    {t.to}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onClose}
            className="mt-6 w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Settlement Tracking Section ───────────────────────────────────────────────

function SettlementTracker({ settlements, currentUser, onMarkDone, eventStatus }) {
  if (!settlements || settlements.length === 0) return null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">מעקב העברות</h3>
        {eventStatus === 'completed' ? (
          <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
            ✓ הושלם
          </span>
        ) : (
          <span className="text-sm text-gray-400">
            {settlements.filter(s => s.status === 'done').length}/{settlements.length} בוצעו
          </span>
        )}
      </div>
      <div className="divide-y divide-gray-50">
        {settlements.map(s => {
          const isMyTransfer = s.from === currentUser
          const isDone = s.status === 'done'
          return (
            <div
              key={s.id}
              className={`px-5 py-4 flex items-center gap-3 transition-colors ${isDone ? 'bg-green-50/50' : ''}`}
            >
              {/* From */}
              <div className={`text-sm font-semibold px-2.5 py-1 rounded-lg flex-shrink-0 ${
                isDone ? 'bg-gray-100 text-gray-400' : 'bg-red-100 text-red-700'
              }`}>
                {s.from}
              </div>
              {/* Arrow + amount */}
              <div className="flex-1 flex flex-col items-center">
                <span className={`font-bold text-sm ${isDone ? 'text-gray-400' : 'text-indigo-700'}`}>
                  {s.amount.toLocaleString('he-IL')}₪
                </span>
                <span className="text-gray-300 text-xs">←</span>
              </div>
              {/* To */}
              <div className={`text-sm font-semibold px-2.5 py-1 rounded-lg flex-shrink-0 ${
                isDone ? 'bg-gray-100 text-gray-400' : 'bg-green-100 text-green-700'
              }`}>
                {s.to}
              </div>
              {/* Status / action */}
              <div className="flex-shrink-0 mr-auto">
                {isDone ? (
                  <span className="text-green-600 text-sm font-medium">✓ בוצע</span>
                ) : isMyTransfer ? (
                  <button
                    onClick={() => onMarkDone(s.id)}
                    className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  >
                    בוצע ✓
                  </button>
                ) : (
                  <span className="text-xs text-gray-300">ממתין</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Manage Participants Modal ─────────────────────────────────────────────────

function ManageParticipantsModal({ event, onClose, onSave }) {
  const currentParticipants = new Set(event.payments.map(p => p.member_name))
  const [selected, setSelected] = useState(new Set(currentParticipants))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggle = (name) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })

  const submit = async () => {
    if (selected.size === 0) return setError('לפחות משתתף אחד נדרש')
    setLoading(true)
    try {
      const updated = await api.updateParticipants(event.id, [...selected])
      onSave(updated)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-1 text-gray-900">ניהול משתתפים</h2>
        <p className="text-sm text-gray-400 mb-5">בחר מי משתתף באירוע זה</p>

        <div className="space-y-2 mb-5">
          {(event.group_members || []).map(name => (
            <button
              key={name}
              type="button"
              onClick={() => toggle(name)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-right ${
                selected.has(name)
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                selected.has(name) ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
              }`}>
                {selected.has(name) && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className="font-medium flex-1">{name}</span>
              {!currentParticipants.has(name) && selected.has(name) && (
                <span className="text-xs text-indigo-500">חדש</span>
              )}
              {currentParticipants.has(name) && !selected.has(name) && (
                <span className="text-xs text-red-400">יוסר</span>
              )}
            </button>
          ))}
        </div>

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
            {loading ? '...' : 'שמור'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main EventPage ────────────────────────────────────────────────────────────

export default function EventPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const currentUser = user?.name || ''
  const [event, setEvent] = useState(null)
  const [payments, setPayments] = useState({})
  const [loading, setLoading] = useState(true)
  const [calcLoading, setCalcLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [settlement, setSettlement] = useState(null)
  const [showParticipants, setShowParticipants] = useState(false)

  useEffect(() => {
    api.getEvent(eventId)
      .then(ev => {
        setEvent(ev)
        const p = {}
        ev.payments.forEach(pay => { p[pay.member_name] = pay.amount })
        setPayments(p)
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [eventId])

  const isAdmin = event?.is_admin || false

  const updatePayment = (name, val) => {
    setPayments(prev => ({ ...prev, [name]: val }))
  }

  const saveMyAmount = async () => {
    setSaveLoading(true)
    try {
      const myPayment = [{ member_name: currentUser, amount: parseFloat(payments[currentUser]) || 0 }]
      await api.updatePayments(eventId, myPayment)
      const refreshed = await api.getEvent(eventId)
      setEvent(refreshed)
      const p = {}
      refreshed.payments.forEach(pay => { p[pay.member_name] = pay.amount })
      setPayments(p)
    } catch (e) {
      alert(e.message)
    } finally {
      setSaveLoading(false)
    }
  }

  const saveAndCalculate = async () => {
    setCalcLoading(true)
    try {
      const paymentList = Object.entries(payments).map(([member_name, amount]) => ({
        member_name,
        amount: parseFloat(amount) || 0,
      }))
      await api.updatePayments(eventId, paymentList)
      const result = await api.settleEvent(eventId)
      setSettlement(result)
      const refreshed = await api.getEvent(eventId)
      setEvent(refreshed)
    } catch (e) {
      alert(e.message)
    } finally {
      setCalcLoading(false)
    }
  }

  const handleParticipantsSave = (updated) => {
    setEvent(updated)
    const p = {}
    updated.payments.forEach(pay => { p[pay.member_name] = pay.amount })
    setPayments(p)
    setShowParticipants(false)
  }

  const handleMarkDone = async (settlementId) => {
    try {
      const updated = await api.markSettlementDone(eventId, settlementId)
      setEvent(updated)
    } catch (e) {
      alert(e.message)
    }
  }

  const total = Object.values(payments).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const n = Object.keys(payments).length
  const fairShare = n > 0 ? total / n : 0

  if (loading) return (
    <Layout title="..." back="/">
      <div className="text-center py-20 text-gray-400">טוען...</div>
    </Layout>
  )

  if (!event) return null

  return (
    <Layout
      title={
        <span className="flex items-center gap-2">
          {event.name}
          {event.status === 'completed' && (
            <span className="text-sm bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
              ✓ הושלם
            </span>
          )}
        </span>
      }
      back={`/groups/${event.group_id}`}
    >
      {/* Payment inputs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="bg-gradient-to-l from-indigo-50 to-purple-50 px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <p className="text-sm text-gray-600">
            סה״כ: <span className="font-bold text-gray-900">{total.toLocaleString('he-IL')}₪</span>
            {n > 0 && (
              <span className="mr-3">
                לאחד: <span className="font-bold text-indigo-700">
                  {fairShare.toLocaleString('he-IL', { maximumFractionDigits: 2 })}₪
                </span>
              </span>
            )}
            <div className="text-gray-400">{n} משתתפים</div>
          </p>
          {isAdmin && event.status !== 'completed' && (
            <button
              onClick={() => setShowParticipants(true)}
              className="flex-shrink-0 text-xs text-indigo-600 border border-indigo-200 bg-white px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors font-medium"
            >
              ✏️ משתתפים
            </button>
          )}
        </div>
        <div className="divide-y divide-gray-50">
          {Object.entries(payments).map(([name, amount]) => {
            const paid = parseFloat(amount) || 0
            const diff = paid - fairShare
            const canEdit = isAdmin || name === currentUser
            return (
              <div key={name} className="px-5 py-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm flex-shrink-0 ${
                  name === currentUser ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">
                    {name}
                    {name === currentUser && <span className="text-xs text-indigo-400 mr-1">(אני)</span>}
                  </p>
                  {total > 0 && Math.abs(diff) > 0.01 && (
                    <p className={`text-xs mt-0.5 ${diff > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {diff > 0 ? `שילם יותר ב-${diff.toFixed(0)}₪` : `חייב ${Math.abs(diff).toFixed(0)}₪`}
                    </p>
                  )}
                </div>
                <div className="relative flex-shrink-0 w-32">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={amount === 0 ? '' : amount}
                    onChange={e => canEdit && updatePayment(name, e.target.value)}
                    placeholder="0"
                    disabled={!canEdit}
                    className={`w-full border rounded-xl px-3 py-2.5 text-left font-medium focus:outline-none transition-colors ${
                      canEdit
                        ? 'border-gray-200 text-gray-900 focus:ring-2 focus:ring-indigo-400 bg-gray-50 focus:bg-white'
                        : 'border-gray-100 text-gray-400 bg-gray-50 cursor-not-allowed'
                    }`}
                    dir="ltr"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">₪</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Settlement tracker (shown after first calculation) */}
      {event.settlements && event.settlements.length > 0 && (
        <SettlementTracker
          settlements={event.settlements}
          currentUser={currentUser}
          onMarkDone={handleMarkDone}
          eventStatus={event.status}
        />
      )}

      {isAdmin ? (
        <>
          <button
            onClick={saveAndCalculate}
            disabled={calcLoading || event.status === 'completed'}
            className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            {calcLoading ? 'מחשב...' : '💰 חשב העברות'}
          </button>
          <p className="text-center text-xs text-gray-400 mt-3">
            האלגוריתם מחשב את מינימום ההעברות לסילוק החוב
          </p>
        </>
      ) : (
        <>
          <button
            onClick={saveMyAmount}
            disabled={saveLoading || event.status === 'completed'}
            className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            {saveLoading ? 'שומר...' : '💾 שמור את הסכום שלי'}
          </button>
          <p className="text-center text-xs text-gray-400 mt-3">
            מנהל הקבוצה יחשב את ההעברות לאחר שכולם יזינו את הסכומים
          </p>
        </>
      )}

      {settlement && (
        <SettlementResult result={settlement} onClose={() => setSettlement(null)} />
      )}

      {showParticipants && (
        <ManageParticipantsModal
          event={event}
          onClose={() => setShowParticipants(false)}
          onSave={handleParticipantsSave}
        />
      )}
    </Layout>
  )
}

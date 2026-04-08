import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

// ── Create Event Modal (with participant checklist) ───────────────────────────

function CreateEventModal({ group, onClose, onCreate, currentUser }) {
  const [name, setName] = useState('')
  const [selected, setSelected] = useState(new Set(group.members.map(m => m.name)))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const toggle = (memberName) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(memberName) ? next.delete(memberName) : next.add(memberName)
      return next
    })

  const submit = async () => {
    if (!name.trim()) return setError('שם האירוע חסר')
    if (selected.size === 0) return setError('יש לבחור לפחות משתתף אחד')
    setLoading(true)
    try {
      await onCreate({
        name: name.trim(),
        participants: [...selected],
        created_by: currentUser || '',
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-5 text-gray-900">אירוע חדש</h2>

        <label className="block text-sm font-medium text-gray-700 mb-1">שם האירוע</label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder='למשל: "טיול אילת"'
          className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-right"
        />

        <label className="block text-sm font-medium text-gray-700 mb-2">
          מי משתתף?
          <span className="text-gray-400 font-normal mr-1">({selected.size} נבחרו)</span>
        </label>
        <div className="space-y-2 mb-5">
          {group.members.map(m => (
            <button
              key={m.name}
              type="button"
              onClick={() => toggle(m.name)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-right ${
                selected.has(m.name)
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                selected.has(m.name) ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
              }`}>
                {selected.has(m.name) && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className="font-medium">{m.name}</span>
              {m.email && <span className="text-xs text-gray-400 mr-auto">{m.email}</span>}
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
            {loading ? '...' : 'צור אירוע'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Group Modal ──────────────────────────────────────────────────────────

function EditGroupModal({ group, onClose, onSave }) {
  const [name, setName] = useState(group.name)
  const [toRemove, setToRemove] = useState(new Set())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const toggleRemove = (memberName) =>
    setToRemove(prev => {
      const next = new Set(prev)
      next.has(memberName) ? next.delete(memberName) : next.add(memberName)
      return next
    })

  const submit = async () => {
    setLoading(true)
    try {
      const updated = await api.updateGroup(group.id, {
        name: name.trim() || group.name,
        remove_members: [...toRemove],
      })
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
        <h2 className="text-xl font-bold mb-5 text-gray-900">ערוך קבוצה</h2>

        <label className="block text-sm font-medium text-gray-700 mb-1">שם הקבוצה</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-right"
        />

        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">חברים</label>
          <span className="text-xs text-gray-400">לחץ על חבר להסרה</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          {group.members.map(m => (
            <button
              key={m.name}
              type="button"
              onClick={() => toggleRemove(m.name)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                toRemove.has(m.name)
                  ? 'bg-red-50 text-red-600 border-red-300 line-through'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-100 hover:border-red-300'
              }`}
            >
              {m.name}{m.role === 'admin' ? ' 👑' : ''} {toRemove.has(m.name) ? '✕' : ''}
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

// ── Invite Link Section ───────────────────────────────────────────────────────

function InviteSection({ group }) {
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [emailError, setEmailError] = useState('')
  const inviteUrl = `${window.location.origin}/join/${group.invite_code}`

  const copy = () => {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const sendInvite = async () => {
    if (!email.trim()) return setEmailError('הכנס כתובת אימייל')
    setEmailError('')
    setSending(true)
    try {
      await api.inviteByEmail(group.id, email.trim(), inviteUrl)
      setSent(true)
      setEmail('')
      setTimeout(() => setSent(false), 3000)
    } catch (e) {
      setEmailError(e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-indigo-50 rounded-2xl p-4 mb-6 border border-indigo-100">
      <p className="text-sm font-semibold text-indigo-800 mb-3">הזמנה לקבוצה</p>

      {/* Copy link row */}
      <div className="flex items-center gap-2 mb-3">
        <p className="text-xs text-indigo-500 font-mono truncate flex-1 bg-white/60 px-2 py-1.5 rounded-lg border border-indigo-100">
          {inviteUrl}
        </p>
        <button
          onClick={copy}
          className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
            copied ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {copied ? '✓ הועתק' : 'העתק'}
        </button>
      </div>

      {/* Email invite row */}
      <div className="flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setEmailError('') }}
          onKeyDown={e => e.key === 'Enter' && sendInvite()}
          placeholder="שלח הזמנה לאימייל..."
          dir="ltr"
          className="flex-1 text-xs bg-white border border-indigo-100 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-gray-400 text-left"
        />
        <button
          onClick={sendInvite}
          disabled={sending}
          className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 ${
            sent ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {sending ? '...' : sent ? '✓ נשלח' : 'שלח'}
        </button>
      </div>
      {emailError && <p className="text-red-500 text-xs mt-1.5">{emailError}</p>}
    </div>
  )
}

// ── Member Tag with Email Tooltip ────────────────────────────────────────────

function MemberTag({ member }) {
  const [hovered, setHovered] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyEmail = (e) => {
    e.stopPropagation()
    if (!member.email) return
    navigator.clipboard.writeText(member.email).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setCopied(false) }}
    >
      <span
        className={`inline-block text-sm font-medium px-3 py-1.5 rounded-full cursor-default select-none ${
          member.role === 'admin'
            ? 'bg-indigo-100 text-indigo-900'
            : 'bg-gray-100 text-gray-700'
        }`}
      >
        {member.name}{member.role === 'admin' ? ' 👑' : ''}
      </span>

      {hovered && member.email && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
          <div className="bg-gray-900 text-white text-xs rounded-xl px-3 py-2 whitespace-nowrap shadow-lg flex items-center gap-2">
            <span className="text-gray-300">{member.email}</span>
            <button
              onClick={copyEmail}
              className="text-indigo-300 hover:text-white transition-colors font-medium"
            >
              {copied ? '✓' : 'העתק'}
            </button>
          </div>
          <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  )
}

// ── Inline Event Rename ───────────────────────────────────────────────────────

function EventNameCell({ event, canEdit, onRename }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(event.name)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const commit = async () => {
    const trimmed = value.trim()
    if (!trimmed || trimmed === event.name) {
      setValue(event.name)
      setEditing(false)
      return
    }
    try {
      await onRename(event.id, trimmed)
    } catch {
      setValue(event.name)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setValue(event.name); setEditing(false) }
        }}
        className="font-semibold text-gray-900 border-b-2 border-indigo-400 outline-none bg-transparent w-full"
        onClick={e => e.stopPropagation()}
      />
    )
  }

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <p className="font-semibold text-gray-900 truncate">{event.name}</p>
      {canEdit && (
        <button
          onClick={e => { e.stopPropagation(); setEditing(true) }}
          className="text-gray-300 hover:text-indigo-500 flex-shrink-0 transition-colors"
          title="שנה שם"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}
    </div>
  )
}

// ── Main GroupPage ────────────────────────────────────────────────────────────

export default function GroupPage() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const currentUser = user?.name || ''
  const [group, setGroup] = useState(null)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [showEditGroup, setShowEditGroup] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getGroup(groupId).then(setGroup).catch(() => navigate('/')).finally(() => setLoading(false))
  }, [groupId])

  const handleCreateEvent = async (data) => {
    const event = await api.createEvent(groupId, data)
    setGroup(prev => ({ ...prev, events: [event, ...prev.events] }))
    setShowCreateEvent(false)
  }

  const handleCreateEventClick = () => setShowCreateEvent(true)

  const handleDeleteEvent = async (e, eventId) => {
    e.stopPropagation()
    if (!confirm('למחוק את האירוע?')) return
    await api.deleteEvent(eventId)
    setGroup(prev => ({ ...prev, events: prev.events.filter(ev => ev.id !== eventId) }))
  }

  const handleRenameEvent = async (eventId, newName) => {
    const updated = await api.renameEvent(eventId, newName)
    setGroup(prev => ({
      ...prev,
      events: prev.events.map(ev => ev.id === eventId ? { ...ev, name: updated.name } : ev),
    }))
  }

  const isAdmin = group?.my_role === 'admin'

  if (loading) return (
    <Layout title="..." back="/">
      <div className="text-center py-20 text-gray-400">טוען...</div>
    </Layout>
  )

  if (!group) return null

  return (
    <Layout
      title={group.name}
      back="/"
      actions={
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowEditGroup(true)}
              className="border border-gray-200 text-gray-600 px-3 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              title="ערוך קבוצה"
            >
              ✏️
            </button>
          )}
          <button
            onClick={handleCreateEventClick}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors"
          >
            + אירוע חדש
          </button>
        </div>
      }
    >
      {/* Invite link — admin only */}
      {isAdmin && group.invite_code && <InviteSection group={group} />}

      {/* Members */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">חברי הקבוצה</h3>
          <span className="text-xs text-gray-400">{group.members.length} חברים</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {group.members.map(m => (
            <MemberTag key={m.name} member={m} />
          ))}
        </div>
      </div>

      {/* Events */}
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">אירועים</h3>
      {group.events.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🎉</div>
          <p className="text-gray-500">אין אירועים עדיין</p>
          <button
            onClick={handleCreateEventClick}
            className="mt-4 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700"
          >
            צור אירוע ראשון
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {group.events.map(ev => {
            const canEditEvent = isAdmin
            return (
              <div
                key={ev.id}
                onClick={() => navigate(`/events/${ev.id}`)}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <EventNameCell event={ev} canEdit={canEditEvent} onRename={handleRenameEvent} />
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-400">
                        {new Date(ev.created_at).toLocaleDateString('he-IL')}
                      </p>
                      {ev.status === 'completed' && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          ✓ הושלם
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {isAdmin && (
                      <button
                        onClick={(e) => handleDeleteEvent(e, ev.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreateEvent && (
        <CreateEventModal
          group={group}
          onClose={() => setShowCreateEvent(false)}
          onCreate={handleCreateEvent}
          currentUser={currentUser}
        />
      )}

      {showEditGroup && (
        <EditGroupModal
          group={group}
          onClose={() => setShowEditGroup(false)}
          onSave={(updated) => { setGroup(updated); setShowEditGroup(false) }}
        />
      )}
    </Layout>
  )
}

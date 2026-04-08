const BASE = '/api'

function getToken() {
  return localStorage.getItem('splitsmart_token') || ''
}

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })
  if (res.status === 401) {
    // Clear stale token and force re-login
    localStorage.removeItem('splitsmart_token')
    localStorage.removeItem('splitsmart_user')
    window.location.href = '/login'
    return
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'שגיאה' }))
    throw new Error(err.detail || 'שגיאה')
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  // Auth
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me'),

  // Groups
  getGroups: () => request('/groups'),
  createGroup: (data) => request('/groups', { method: 'POST', body: JSON.stringify(data) }),
  getGroup: (id) => request(`/groups/${id}`),
  updateGroup: (id, data) => request(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGroup: (id) => request(`/groups/${id}`, { method: 'DELETE' }),
  getGroupByCode: (code) => request(`/groups/invite/${code}`),
  joinGroup: (invite_code) => request('/groups/join', { method: 'POST', body: JSON.stringify({ invite_code }) }),
  inviteByEmail: (groupId, email, invite_url) =>
    request(`/groups/${groupId}/invite-email`, { method: 'POST', body: JSON.stringify({ email, invite_url }) }),

  // Events
  createEvent: (groupId, data) =>
    request(`/groups/${groupId}/events`, { method: 'POST', body: JSON.stringify(data) }),
  getEvent: (id) => request(`/events/${id}`),
  renameEvent: (id, name) =>
    request(`/events/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  updatePayments: (eventId, payments) =>
    request(`/events/${eventId}/payments`, { method: 'PUT', body: JSON.stringify({ payments }) }),
  updateParticipants: (eventId, participants) =>
    request(`/events/${eventId}/participants`, { method: 'PUT', body: JSON.stringify({ participants }) }),
  settleEvent: (eventId) =>
    request(`/events/${eventId}/settle`, { method: 'POST' }),
  markSettlementDone: (eventId, settlementId) =>
    request(`/events/${eventId}/settlements/${settlementId}/done`, { method: 'POST' }),
  deleteEvent: (id) => request(`/events/${id}`, { method: 'DELETE' }),

  // Dashboard
  getDashboard: () => request('/users/me/dashboard'),
}

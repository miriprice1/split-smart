import { createContext, useContext, useState, useEffect } from 'react'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('splitsmart_user') || '')
  const [showPrompt, setShowPrompt] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)

  const saveUser = (name) => {
    const trimmed = name.trim()
    if (trimmed) {
      localStorage.setItem('splitsmart_user', trimmed)
      setCurrentUser(trimmed)
      setShowPrompt(false)
      if (pendingAction) {
        pendingAction(trimmed)
        setPendingAction(null)
      }
    }
  }

  // Returns currentUser or triggers name prompt, resolving with the name
  const requireUser = () =>
    new Promise((resolve) => {
      if (currentUser) return resolve(currentUser)
      setPendingAction(() => resolve)
      setShowPrompt(true)
    })

  return (
    <UserContext.Provider value={{ currentUser, requireUser }}>
      {children}
      {showPrompt && <NamePrompt onSave={saveUser} />}
    </UserContext.Provider>
  )
}

function NamePrompt({ onSave }) {
  const [name, setName] = useState('')
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-2 text-gray-900">ברוך הבא ל-SplitSmart!</h2>
        <p className="text-gray-500 text-sm mb-5">מה שמך? (ישמש לזיהוי בתוך האפליקציה)</p>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && name.trim() && onSave(name)}
          placeholder="השם שלך"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-right"
        />
        <button
          onClick={() => name.trim() && onSave(name)}
          disabled={!name.trim()}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-40"
        >
          המשך
        </button>
      </div>
    </div>
  )
}

export const useUser = () => useContext(UserContext)

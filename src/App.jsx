import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Sidebar from './components/shared/Sidebar'
import Dashboard from './pages/Dashboard'
import Invoices from './pages/Invoices'
import Expenses from './pages/Expenses'
import GSTReturns from './pages/GSTReturns'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import IncomeTax from './pages/IncomeTax'
import TDSTracker from './pages/TDSTracker'
import HSNLookup from './pages/HSNLookup'
import Auth from './pages/Auth'

export const ThemeContext = React.createContext()

import React from 'react'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState([])
  const [expenses, setExpenses] = useState([])
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true'
  })

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) { loadInvoices(); loadExpenses() }
  }, [user])

  const loadInvoices = async () => {
    const { data } = await supabase.from('invoices').select('*').order('created_at', { ascending: false })
    if (data) setInvoices(data)
  }

  const loadExpenses = async () => {
    const { data } = await supabase.from('expenses').select('*').order('created_at', { ascending: false })
    if (data) setExpenses(data)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setInvoices([])
    setExpenses([])
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-blue-900'} flex items-center justify-center`}>
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) return <Auth darkMode={darkMode} />

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      <BrowserRouter>
        <div className={`flex h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
          <Sidebar onLogout={handleLogout} user={user} darkMode={darkMode} setDarkMode={setDarkMode} />
          <main className={`flex-1 overflow-y-auto p-4 md:p-6 pt-16 md:pt-6 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
            <Routes>
              <Route path="/" element={<Dashboard invoices={invoices} expenses={expenses} darkMode={darkMode} />} />
              <Route path="/invoices" element={<Invoices invoices={invoices} setInvoices={setInvoices} userId={user.id} darkMode={darkMode} />} />
              <Route path="/expenses" element={<Expenses expenses={expenses} setExpenses={setExpenses} userId={user.id} darkMode={darkMode} />} />
              <Route path="/gst" element={<GSTReturns invoices={invoices} expenses={expenses} darkMode={darkMode} />} />
              <Route path="/tax" element={<IncomeTax darkMode={darkMode} />} />
              <Route path="/tds" element={<TDSTracker userId={user.id} darkMode={darkMode} />} />
              <Route path="/hsn" element={<HSNLookup darkMode={darkMode} />} />
              <Route path="/reports" element={<Reports invoices={invoices} expenses={expenses} darkMode={darkMode} />} />
              <Route path="/settings" element={<Settings userId={user.id} darkMode={darkMode} />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ThemeContext.Provider>
  )
}

export default App
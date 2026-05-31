import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState([])
  const [expenses, setExpenses] = useState([])

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
    if (user) {
      loadInvoices()
      loadExpenses()
    }
  }, [user])

  const loadInvoices = async () => {
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setInvoices(data)
  }

  const loadExpenses = async () => {
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setExpenses(data)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setInvoices([])
    setExpenses([])
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-100">
        <Sidebar onLogout={handleLogout} user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard invoices={invoices} expenses={expenses} />} />
            <Route path="/invoices" element={<Invoices invoices={invoices} setInvoices={setInvoices} userId={user.id} />} />
            <Route path="/expenses" element={<Expenses expenses={expenses} setExpenses={setExpenses} userId={user.id} />} />
            <Route path="/gst" element={<GSTReturns invoices={invoices} expenses={expenses} />} />
            <Route path="/tax" element={<IncomeTax />} />
            <Route path="/tds" element={<TDSTracker userId={user.id} />} />
            <Route path="/hsn" element={<HSNLookup />} />
            <Route path="/reports" element={<Reports invoices={invoices} expenses={expenses} />} />
            <Route path="/settings" element={<Settings userId={user.id} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
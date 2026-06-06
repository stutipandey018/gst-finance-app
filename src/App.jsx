import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect, lazy, Suspense, createContext } from 'react'
import { supabase } from './supabase'
import Sidebar from './components/shared/Sidebar'
import Auth from './pages/Auth'

// Lazy load all pages for faster initial load
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Invoices = lazy(() => import('./pages/Invoices'))
const Expenses = lazy(() => import('./pages/Expenses'))
const GSTReturns = lazy(() => import('./pages/GSTReturns'))
const Reports = lazy(() => import('./pages/Reports'))
const Settings = lazy(() => import('./pages/Settings'))
const IncomeTax = lazy(() => import('./pages/IncomeTax'))
const TDSTracker = lazy(() => import('./pages/TDSTracker'))
const HSNLookup = lazy(() => import('./pages/HSNLookup'))

export const ThemeContext = createContext()

const PageLoader = ({ darkMode }) => (
  <div className={`flex items-center justify-center h-64 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
    <div className="text-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p className="text-sm">Loading...</p>
    </div>
  </div>
)

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState([])
  const [expenses, setExpenses] = useState([])
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true'
  })

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
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
    const { data } = await supabase
      .from('invoices')
      .select('id, invoice_no, date, customer_name, customer_gstin, is_inter_state, items, subtotal, total_cgst, total_sgst, total_igst, total_gst, grand_total, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    if (data) setInvoices(data)
  }

  const loadExpenses = async () => {
    const { data } = await supabase
      .from('expenses')
      .select('id, date, description, category, amount, gst_paid, vendor, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
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
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading GST Finance...</p>
        </div>
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
            <Suspense fallback={<PageLoader darkMode={darkMode} />}>
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
            </Suspense>
          </main>
        </div>
      </BrowserRouter>
    </ThemeContext.Provider>
  )
}

export default App
import { useState } from 'react'
import { supabase } from '../supabase'

function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    if (!email || !password) {
      setError('Please enter email and password')
      setLoading(false)
      return
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Account created! You can now login directly.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900">GST Finance</h1>
          <p className="text-gray-500 mt-1">Business Manager</p>
        </div>

        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => { setIsLogin(true); setError(''); setMessage('') }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              isLogin ? 'bg-white text-blue-700 shadow' : 'text-gray-500'
            }`}>Login</button>
          <button
            onClick={() => { setIsLogin(false); setError(''); setMessage('') }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              !isLogin ? 'bg-white text-blue-700 shadow' : 'text-gray-500'
            }`}>Sign Up</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 block mb-1">Email</label>
            <input type="email"
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Password</label>
            <input type="password"
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          {message && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">{message}</div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Please wait...' : isLogin ? 'Login' : 'Create Account'}
          </button>
        </div>

        <div className="mt-6 bg-blue-50 rounded-xl p-4 text-xs text-blue-700">
          <p className="font-semibold mb-1">GST Finance Manager</p>
          <p>• Invoices, Expenses, GST Returns</p>
          <p>• Income Tax & TDS Calculator</p>
          <p>• HSN Code Lookup</p>
          <p>• Data securely saved in cloud</p>
        </div>
      </div>
    </div>
  )
}

export default Auth
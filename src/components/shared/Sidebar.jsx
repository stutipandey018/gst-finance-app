import { Link, useLocation } from 'react-router-dom'

const links = [
  { path: '/', label: 'Dashboard', icon: '🏠' },
  { path: '/invoices', label: 'Invoices', icon: '🧾' },
  { path: '/expenses', label: 'Expenses', icon: '💰' },
  { path: '/gst', label: 'GST Returns', icon: '📊' },
  { path: '/tax', label: 'Income Tax', icon: '🧮' },
  { path: '/tds', label: 'TDS Tracker', icon: '📋' },
  { path: '/hsn', label: 'HSN Lookup', icon: '🔍' },
  { path: '/reports', label: 'Reports', icon: '📈' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
]

function Sidebar({ onLogout, user }) {
  const location = useLocation()
  return (
    <div className="w-64 bg-blue-900 text-white flex flex-col">
      <div className="p-6 border-b border-blue-700">
        <h1 className="text-xl font-bold">GST Finance</h1>
        <p className="text-blue-300 text-sm mt-1">Business Manager</p>
      </div>
      <nav className="flex-1 p-4 overflow-y-auto">
        {links.map(link => (
          <Link key={link.path} to={link.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
              location.pathname === link.path
                ? 'bg-blue-700 text-white'
                : 'text-blue-200 hover:bg-blue-800'
            }`}>
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-blue-700">
        <p className="text-blue-300 text-xs mb-2 truncate">{user?.email}</p>
        <button
          onClick={onLogout}
          className="w-full bg-blue-800 hover:bg-red-700 text-white text-sm py-2 rounded-lg transition-colors"
        >Logout</button>
      </div>
    </div>
  )
}

export default Sidebar
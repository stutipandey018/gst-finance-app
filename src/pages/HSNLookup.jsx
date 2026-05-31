import { useState } from 'react'
import { searchHSN, HSN_CODES } from '../utils/hsnCodes'

const GST_RATE_GROUPS = [0, 3, 5, 12, 18, 28]

function HSNLookup() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedRate, setSelectedRate] = useState(null)

  const handleSearch = (q) => {
    setQuery(q)
    if (q.length >= 2) {
      setResults(searchHSN(q))
    } else {
      setResults([])
    }
  }

  const byRate = GST_RATE_GROUPS.map(rate => ({
    rate,
    items: HSN_CODES.filter(h => h.gstRate === rate)
  }))

  const RATE_COLORS = {
    0: 'bg-green-100 text-green-800',
    3: 'bg-yellow-100 text-yellow-800',
    5: 'bg-blue-100 text-blue-800',
    12: 'bg-purple-100 text-purple-800',
    18: 'bg-orange-100 text-orange-800',
    28: 'bg-red-100 text-red-800',
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">HSN / SAC Code Lookup</h2>
      <p className="text-gray-500 text-sm mb-6">Search product/service → get GST rate automatically</p>

      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <div className="relative">
          <input
            className="w-full border-2 border-blue-200 rounded-xl px-5 py-4 text-base focus:outline-none focus:border-blue-500"
            placeholder="Type product name or HSN code... e.g. 'mobile', 'software', '8517'"
            value={query}
            onChange={e => handleSearch(e.target.value)}
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]) }}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 text-xl">×</button>
          )}
        </div>

        {results.length > 0 && (
          <div className="mt-3 border rounded-xl overflow-hidden">
            {results.map(r => (
              <div key={r.hsn}
                className="flex items-center justify-between px-5 py-3 hover:bg-blue-50 border-b last:border-0 cursor-pointer"
                onClick={() => { setQuery(r.description); setResults([]) }}>
                <div>
                  <span className="font-mono font-bold text-blue-700 mr-3">{r.hsn}</span>
                  <span className="text-gray-700">{r.description}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${RATE_COLORS[r.gstRate]}`}>
                  GST {r.gstRate}%
                </span>
              </div>
            ))}
          </div>
        )}

        {query.length >= 2 && results.length === 0 && (
          <p className="mt-3 text-gray-400 text-sm text-center py-4">
            Koi result nahi mila. Dusra keyword try karo.
          </p>
        )}
      </div>

      <div className="mb-4">
        <h3 className="font-semibold text-gray-700 mb-3">GST Rate wise list — click to filter:</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedRate(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              selectedRate === null ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'
            }`}>All Rates</button>
          {GST_RATE_GROUPS.map(rate => (
            <button key={rate}
              onClick={() => setSelectedRate(selectedRate === rate ? null : rate)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                selectedRate === rate ? 'bg-blue-600 text-white' : `${RATE_COLORS[rate]}`
              }`}>
              {rate}% GST
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {byRate
          .filter(g => selectedRate === null || g.rate === selectedRate)
          .map(group => (
            <div key={group.rate} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className={`px-4 py-2 ${RATE_COLORS[group.rate]}`}>
                <span className="font-semibold">GST {group.rate}%</span>
                <span className="text-xs ml-2">({group.items.length} items)</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-gray-500">HSN/SAC</th>
                    <th className="text-left px-4 py-2 text-gray-500">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map(item => (
                    <tr key={item.hsn} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-blue-700 font-medium">{item.hsn}</td>
                      <td className="px-4 py-2 text-gray-700">{item.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </div>
    </div>
  )
}

export default HSNLookup
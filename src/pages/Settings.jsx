import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const emptyProfile = {
  business_name: '',
  owner_name: '',
  gstin: '',
  pan: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  email: '',
  bank_name: '',
  account_no: '',
  ifsc: '',
  upi: '',
  registration_type: 'Regular',
  business_type: 'Proprietorship',
}

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal'
]

function validateGSTIN(gstin) {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)
}

function validatePAN(pan) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)
}

function Settings({ userId }) {
  const [profile, setProfile] = useState(emptyProfile)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) {
      setProfile(data)
      localStorage.setItem('gst_profile', JSON.stringify({
        businessName: data.business_name,
        ownerName: data.owner_name,
        gstin: data.gstin,
        pan: data.pan,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        phone: data.phone,
        email: data.email,
        bankName: data.bank_name,
        accountNo: data.account_no,
        ifsc: data.ifsc,
        upi: data.upi,
      }))
    }
  }

  const validate = () => {
    const errs = {}
    if (!profile.business_name) errs.business_name = 'Required'
    if (!profile.gstin) errs.gstin = 'Required'
    else if (!validateGSTIN(profile.gstin)) errs.gstin = 'Invalid GSTIN format'
    if (profile.pan && !validatePAN(profile.pan)) errs.pan = 'Invalid PAN format'
    return errs
  }

  const saveProfile = async () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)

    const { error } = await supabase
      .from('profiles')
      .upsert({ ...profile, id: userId })

    if (error) {
      alert('Error: ' + error.message)
    } else {
      localStorage.setItem('gst_profile', JSON.stringify({
        businessName: profile.business_name,
        ownerName: profile.owner_name,
        gstin: profile.gstin,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        pincode: profile.pincode,
        phone: profile.phone,
        email: profile.email,
        bankName: profile.bank_name,
        accountNo: profile.account_no,
        ifsc: profile.ifsc,
        upi: profile.upi,
      }))
      setSaved(true)
      setErrors({})
      setTimeout(() => setSaved(false), 3000)
    }
    setLoading(false)
  }

  const update = (field, value) => {
    setProfile({ ...profile, [field]: value })
    if (errors[field]) setErrors({ ...errors, [field]: null })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Business Settings</h2>
        {saved && <span className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium">Saved successfully! ✓</span>}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b">Business Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Business Name *</label>
                <input className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.business_name ? 'border-red-400' : ''}`}
                  placeholder="Your business / firm name"
                  value={profile.business_name} onChange={e => update('business_name', e.target.value)} />
                {errors.business_name && <p className="text-red-500 text-xs mt-1">{errors.business_name}</p>}
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Owner Name</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Full name"
                  value={profile.owner_name} onChange={e => update('owner_name', e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Business Type</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={profile.business_type} onChange={e => update('business_type', e.target.value)}>
                  {['Proprietorship', 'Partnership', 'LLP', 'Private Limited', 'Public Limited', 'HUF'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">GST Registration Type</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={profile.registration_type} onChange={e => update('registration_type', e.target.value)}>
                  {['Regular', 'Composition', 'Unregistered'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b">Tax Identifiers</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">GSTIN *</label>
                <input className={`w-full border rounded-lg px-3 py-2 text-sm uppercase ${errors.gstin ? 'border-red-400' : ''}`}
                  placeholder="22AAAAA0000A1Z5" maxLength={15}
                  value={profile.gstin} onChange={e => update('gstin', e.target.value.toUpperCase())} />
                {errors.gstin && <p className="text-red-500 text-xs mt-1">{errors.gstin}</p>}
                {profile.gstin && !errors.gstin && validateGSTIN(profile.gstin) && <p className="text-green-600 text-xs mt-1">Valid GSTIN ✓</p>}
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">PAN</label>
                <input className={`w-full border rounded-lg px-3 py-2 text-sm uppercase ${errors.pan ? 'border-red-400' : ''}`}
                  placeholder="AAAAA0000A" maxLength={10}
                  value={profile.pan} onChange={e => update('pan', e.target.value.toUpperCase())} />
                {errors.pan && <p className="text-red-500 text-xs mt-1">{errors.pan}</p>}
                {profile.pan && !errors.pan && validatePAN(profile.pan) && <p className="text-green-600 text-xs mt-1">Valid PAN ✓</p>}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b">Address & Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm text-gray-600 block mb-1">Address</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Street address"
                  value={profile.address} onChange={e => update('address', e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">City</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="City"
                  value={profile.city} onChange={e => update('city', e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">State</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={profile.state} onChange={e => update('state', e.target.value)}>
                  <option value="">Select state</option>
                  {STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Pincode</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="400001" maxLength={6}
                  value={profile.pincode} onChange={e => update('pincode', e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Phone</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="9876543210"
                  value={profile.phone} onChange={e => update('phone', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-gray-600 block mb-1">Email</label>
                <input type="email" className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="business@email.com"
                  value={profile.email} onChange={e => update('email', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b">Bank Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Bank Name</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="SBI / HDFC / ICICI"
                  value={profile.bank_name} onChange={e => update('bank_name', e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Account Number</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Account number"
                  value={profile.account_no} onChange={e => update('account_no', e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">IFSC Code</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm uppercase"
                  placeholder="SBIN0001234"
                  value={profile.ifsc} onChange={e => update('ifsc', e.target.value.toUpperCase())} />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">UPI ID</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="business@upi"
                  value={profile.upi} onChange={e => update('upi', e.target.value)} />
              </div>
            </div>
          </div>

          <button onClick={saveProfile} disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Business Profile'}
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h4 className="font-medium text-gray-700 mb-3">Profile Preview</h4>
            <div className="text-sm space-y-1">
              <p className="font-bold text-gray-800 text-base">{profile.business_name || 'Your Business Name'}</p>
              <p className="text-gray-600">{profile.owner_name}</p>
              <p className="text-gray-500 text-xs">{profile.address}</p>
              <p className="text-gray-500 text-xs">{[profile.city, profile.state, profile.pincode].filter(Boolean).join(', ')}</p>
              {profile.gstin && <p className="text-xs"><span className="font-medium">GSTIN:</span> {profile.gstin}</p>}
              {profile.pan && <p className="text-xs"><span className="font-medium">PAN:</span> {profile.pan}</p>}
              {profile.phone && <p className="text-xs"><span className="font-medium">Ph:</span> {profile.phone}</p>}
            </div>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 text-xs text-amber-800 space-y-1">
            <p className="font-semibold">GST Rules reminder</p>
            <p>• GSTIN mandatory on invoices above ₹200</p>
            <p>• E-invoice mandatory if turnover &gt; ₹5 crore</p>
            <p>• Composition dealers cannot charge GST</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-800 space-y-1">
            <p className="font-semibold">Filing deadlines FY 2025-26</p>
            <p>• GSTR-1: 11th of next month</p>
            <p>• GSTR-3B: 20th of next month</p>
            <p>• ITR filing: 31st July 2026</p>
            <p>• Advance tax Q1: 15th June</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
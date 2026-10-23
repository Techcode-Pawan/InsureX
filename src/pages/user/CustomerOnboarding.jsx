import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, ShieldCheck } from 'lucide-react'
import api from '../../services/apiClient'
import { useAuth } from '../../context/AuthContext'
import { Brand, Notice, Panel } from '../../components/panel'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Button from '../../components/ui/Button'
import '../../styles/user.css'

const ID_TYPES = ['Aadhaar', 'PAN', 'Passport', 'Voter ID', 'Driving Licence']
const GENDERS = ['Female', 'Male', 'Non-binary', 'Prefer not to say']

function validate(f) {
  const e = {}
  if (!f.firstName.trim()) e.firstName = 'Enter your first name.'
  if (!f.lastName.trim()) e.lastName = 'Enter your last name.'
  if (!f.dateOfBirth) e.dateOfBirth = 'Enter your date of birth.'
  else {
    const age = (Date.now() - new Date(f.dateOfBirth).getTime()) / (365.25 * 86400000)
    if (age < 18 || age > 100) e.dateOfBirth = 'Policyholders must be between 18 and 100 years old.'
  }
  if (!f.gender) e.gender = 'Select an option.'
  if (f.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a phone number with at least 10 digits.'
  if (!f.address.trim()) e.address = 'Enter your address.'
  if (!f.city.trim()) e.city = 'Enter your city.'
  if (!f.state.trim()) e.state = 'Enter your state.'
  if (f.postalCode.trim().length < 4) e.postalCode = 'Enter a valid postal code.'
  if (!f.idProofType) e.idProofType = 'Select an ID type.'
  if (!/^[A-Za-z0-9]{4}$/.test(f.idProofLast4.trim())) e.idProofLast4 = 'Enter exactly the last 4 characters.'
  return e
}

export default function CustomerOnboarding() {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const [first, ...rest] = (user?.name || '').split(' ')
  const [form, setForm] = useState({
    firstName: first || '', lastName: rest.join(' '), dateOfBirth: '', gender: '', phone: user?.phone || '',
    address: '', city: '', state: '', postalCode: '', idProofType: '', idProofLast4: '',
  })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [pending, setPending] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const v = validate(form)
    setErrors(v)
    if (Object.keys(v).length) return
    setPending(true)
    setServerError(null)
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([k, val]) => [k, val.trim()]))
      await api.post('/me/profile', payload)
      await refreshUser()
      navigate('/user', { replace: true })
    } catch (err) {
      setServerError(err)
    } finally {
      setPending(false)
    }
  }

  async function signOut() {
    await logout()
    navigate('/login', { replace: true })
  }

  const [maxDob] = useState(() => new Date(Date.now() - 18 * 365.25 * 86400000).toISOString().slice(0, 10))

  return (
    <div className="cp-onboard">
      <header className="cp-onboard-top">
        <div className="inner">
          <Brand sub="My Insurance" to="/user/onboarding" light />
          <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#C9D6E5' }} onClick={signOut}>
            <LogOut size={15} aria-hidden="true" /> Sign out
          </button>
        </div>
      </header>
      <main className="cp-onboard-main">
        <p className="px-eyebrow">One last step</p>
        <h1 className="px-title" style={{ fontSize: 24 }}>Set up your policyholder profile</h1>
        <p className="px-sub" style={{ marginBottom: 20 }}>
          We use these details on your applications and policy documents. You can update your contact details later;
          identity details can only be changed by InsureX support.
        </p>

        {serverError && (
          <div style={{ marginBottom: 16 }}>
            {serverError.status === 409 ? (
              <Notice tone="warn">
                <strong>We already have a customer record for {user?.email}.</strong>
                <div style={{ marginTop: 4 }}>
                  This usually means an agent registered you earlier. For your security we don't link existing records to a login
                  automatically. Please contact your agent or InsureX support. Once they verify your identity, they will link the
                  record to this account and your policies will appear here.
                </div>
              </Notice>
            ) : (
              <Notice tone="error">{serverError.message}</Notice>
            )}
          </div>
        )}

        <form onSubmit={submit} noValidate>
          <Panel title="About you">
            <div className="form-grid">
              <Input label="First name" id="ob-first" value={form.firstName} onChange={set('firstName')} error={errors.firstName} autoComplete="given-name" required />
              <Input label="Last name" id="ob-last" value={form.lastName} onChange={set('lastName')} error={errors.lastName} autoComplete="family-name" required />
              <Input label="Date of birth" id="ob-dob" type="date" max={maxDob} value={form.dateOfBirth} onChange={set('dateOfBirth')} error={errors.dateOfBirth} autoComplete="bday" required />
              <Select label="Gender" id="ob-gender" value={form.gender} onChange={set('gender')} error={errors.gender} placeholder="Select" options={GENDERS} required />
              <Input label="Mobile number" id="ob-phone" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" inputMode="tel" required />
              <Input label="Email" id="ob-email" value={user?.email || ''} disabled hint="Your sign-in email is used on your policies." />
            </div>
          </Panel>

          <div style={{ height: 16 }} />
          <Panel title="Address">
            <div className="form-grid">
              <Input className="span-2" label="Street address" id="ob-addr" value={form.address} onChange={set('address')} error={errors.address} autoComplete="street-address" required />
              <Input label="City" id="ob-city" value={form.city} onChange={set('city')} error={errors.city} autoComplete="address-level2" required />
              <Input label="State" id="ob-state" value={form.state} onChange={set('state')} error={errors.state} autoComplete="address-level1" required />
              <Input label="Postal code" id="ob-pin" value={form.postalCode} onChange={set('postalCode')} error={errors.postalCode} autoComplete="postal-code" inputMode="numeric" required />
            </div>
          </Panel>

          <div style={{ height: 16 }} />
          <Panel title="Identity document" note="We store only the last 4 characters of your ID number.">
            <div className="form-grid">
              <Select label="ID type" id="ob-idtype" value={form.idProofType} onChange={set('idProofType')} error={errors.idProofType} placeholder="Select" options={ID_TYPES} required />
              <Input label="Last 4 characters of ID number" id="ob-id4" maxLength={4} value={form.idProofLast4} onChange={set('idProofLast4')} error={errors.idProofLast4} autoComplete="off" required />
            </div>
            <p className="field-help" style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 12 }}>
              <ShieldCheck size={14} aria-hidden="true" /> Never enter your full ID number here. Verification documents can be uploaded securely later.
            </p>
          </Panel>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <Button type="submit" size="lg" loading={pending}>Create my profile</Button>
          </div>
        </form>
      </main>
    </div>
  )
}

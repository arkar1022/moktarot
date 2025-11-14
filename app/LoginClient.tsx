'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Stage = 'email' | 'login' | 'register'
type Lang = 'my' | 'en'

const COUNTRY_CODES = [
  { code: '95', name: { my: 'မြန်မာ', en: 'Myanmar' } },
  { code: '66', name: { my: 'ထိုင်း', en: 'Thailand' } },
  { code: '60', name: { my: 'မလေးရှား', en: 'Malaysia' } },
  { code: '65', name: { my: 'စင်္ကာပူ', en: 'Singapore' } },
  { code: '62', name: { my: 'အင်ဒိုနီးရှား', en: 'Indonesia' } },
  { code: '84', name: { my: 'ဗီယက်နမ်', en: 'Vietnam' } },
  { code: '63', name: { my: 'ဖိလစ်ပိုင်', en: 'Philippines' } },
  { code: '91', name: { my: 'အိန္ဒိယ', en: 'India' } },
  { code: '880', name: { my: 'ဗಾಂಗလားဒေ့ရှ်', en: 'Bangladesh' } },
  { code: '86', name: { my: 'တရုတ်', en: 'China' } },
  { code: '81', name: { my: 'ဂျပန်', en: 'Japan' } },
  { code: '82', name: { my: 'ကိုရီးယား (တောင်)', en: 'South Korea' } },
  { code: '1', name: { my: 'အမေရိကန်', en: 'United States' } },
  { code: '44', name: { my: 'ယူကေ', en: 'United Kingdom' } },
  { code: '61', name: { my: 'ဩစတြေးလျ', en: 'Australia' } },
] as const

const COPY = {
  my: {
    methodEmail: 'အီးမေးလ်',
    methodPhone: 'ဖုန်း',
    emailLabel: 'အီးမေးလ် (Gmail)',
    countryLabel: 'နိုင်ငံ',
    phoneLabel: 'ဖုန်းနံပါတ်',
    continue: 'ဆက်လုပ်မည်',
    loading: 'စောင့်ပါ…',
    passwordLabel: 'စကားဝှက်',
    back: 'နောက်သို့',
    loginButton: 'ဝင်မည်',
    nameLabel: 'အမည်',
    genderLabel: 'ကျား/မ',
    gender: { male: 'ကျား', female: 'မ', other: 'အခြား' },
    ageLabel: 'အသက်',
    registerPassword: 'စကားဝှက်',
    termsPrefix: 'စည်းကမ်းချက်များနှင့် သဘောတူညီပါသည် —',
    viewPolicy: 'ကြည့်ရှုရန်',
    registerButton: 'အကောင့်ဖန်တီးမည်',
    info: 'Email (Gmail) သို့မဟုတ် ဖုန်းနံပါတ်ဖြင့် မှတ်ပုံတင်/ဝင်ရောက်နိုင်သည်',
    errors: {
      emailRequired: 'အီးမေးလ်ထည့်ပါ',
      gmailOnly: 'Gmail (@gmail.com) သာအသုံးပြုခွင့်ရှိသည်',
      invalidEmail: 'မမှန်ကန်သော အီးမေးလ်',
      phoneRequired: 'ဖုန်းနံပါတ် ဖြည့်ပါ',
      invalidPhone: 'မမှန်ကန်သော ဖုန်း',
      passwordShort: 'စကားဝှက် အနည်းဆုံး ၆ လုံး',
      loginFailed: 'ဝင်ရောက်မှု မအောင်မြင်ပါ',
      nameRequired: 'အမည် ထည့်ပါ',
      genderRequired: 'ကျား/မ ရွေးချယ်ပါ',
      ageRequired: 'အသက် ထည့်ပါ',
      termsRequired: 'စည်းကမ်းချက်များကို သဘောတူရန် လိုအပ်ပါသည်',
      registerFailed: 'စာရင်းသွင်းမှု မအောင်မြင်ပါ',
    },
  },
  en: {
    methodEmail: 'Email',
    methodPhone: 'Phone',
    emailLabel: 'Email (Gmail)',
    countryLabel: 'Country',
    phoneLabel: 'Phone number',
    continue: 'Continue',
    loading: 'Please wait…',
    passwordLabel: 'Password',
    back: 'Back',
    loginButton: 'Sign in',
    nameLabel: 'Name',
    genderLabel: 'Gender',
    gender: { male: 'Male', female: 'Female', other: 'Other' },
    ageLabel: 'Age',
    registerPassword: 'Password',
    termsPrefix: 'I agree to the policies —',
    viewPolicy: 'View',
    registerButton: 'Create account',
    info: 'Sign up or log in with your Gmail or phone number.',
    errors: {
      emailRequired: 'Please enter your email.',
      gmailOnly: 'Only Gmail (@gmail.com) is accepted.',
      invalidEmail: 'Invalid email address.',
      phoneRequired: 'Please enter your phone number.',
      invalidPhone: 'Invalid phone number.',
      passwordShort: 'Password must be at least 6 characters.',
      loginFailed: 'Login failed.',
      nameRequired: 'Please enter your name.',
      genderRequired: 'Please select a gender.',
      ageRequired: 'Please enter your age.',
      termsRequired: 'You must agree to the policies.',
      registerFailed: 'Registration failed.',
    },
  }
} as const

export default function LoginClient({ initialLang }: { initialLang: Lang }) {
  const router = useRouter()
  const [language, setLanguage] = useState<Lang>(initialLang)
  const [stage, setStage] = useState<Stage>('email')
  const [email, setEmail] = useState('')
  const [method, setMethod] = useState<'email'|'phone'>('email')
  const [phoneCode, setPhoneCode] = useState('95')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'male'|'female'|'other'|''>('' as any)
  const [age, setAge] = useState('')
  const [password, setPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [agree, setAgree] = useState(false)
  const [showPolicy, setShowPolicy] = useState(false)

  useEffect(() => {
    if (typeof document === 'undefined') return
    const html = document.documentElement
    const sync = () => {
      const lang = html.lang === 'en' ? 'en' : 'my'
      setLanguage(prev => (prev === lang ? prev : lang))
    }
    const observer = new MutationObserver(sync)
    observer.observe(html, { attributes: true, attributeFilter: ['lang'] })
    sync()
    return () => observer.disconnect()
  }, [])

  const copy = COPY[language]

  useEffect(() => { setError(null); setInfo(null) }, [stage])

  async function onCheckEmail(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null); setInfo(null)
    setLoading(true)
    try {
      if (method === 'email') {
        if (!email) { setError(copy.errors.emailRequired); return }
        const res = await fetch('/api/auth/check-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
        const data = await res.json()
        if (data.gmailOnly === true) { setError(copy.errors.gmailOnly); return }
        if (!data.ok) { setError(copy.errors.invalidEmail); return }
        setStage(data.exists ? 'login' : 'register')
      } else {
        if (!phoneCode || !phoneNumber) { setError(copy.errors.phoneRequired); return }
        const res = await fetch('/api/auth/check-phone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneCode, phoneNumber }) })
        const data = await res.json()
        if (!data.ok) { setError(copy.errors.invalidPhone); return }
        setStage(data.exists ? 'login' : 'register')
      }
    } finally {
      setLoading(false)
    }
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault(); setError(null)
    if (password.length < 6) return setError(copy.errors.passwordShort)
    setLoading(true)
    const body = method === 'email' ? { email, password } : { phoneCode, phoneNumber, password }
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json(); setLoading(false)
    if (res.ok) { router.push('/app/dashboard'); return }
    else setError(data.error || copy.errors.loginFailed)
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault(); setError(null)
    if (!name.trim()) return setError(copy.errors.nameRequired)
    if (!gender) return setError(copy.errors.genderRequired)
    const ageNum = Number(age)
    if (!Number.isFinite(ageNum) || ageNum <= 0) return setError(copy.errors.ageRequired)
    if (password.length < 6) return setError(copy.errors.passwordShort)
    if (!agree) return setError(copy.errors.termsRequired)
    setLoading(true)
    const body = method === 'email'
      ? { email, name, password, gender, age: ageNum }
      : { phoneCode, phoneNumber, name, password, gender, age: ageNum }
    const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json(); setLoading(false)
    if (res.ok) { router.push('/app/dashboard'); return }
    else setError(data.error || copy.errors.registerFailed)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-mok-black text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-2xl border border-mok-goldDeep/30 bg-gradient-to-b from-mok-smoke to-mok-black">
        <div className="flex flex-col items-center gap-2 mb-6">
          <Image src="/logo.webp" width={90} height={90} alt="MOK logo" />
          <h1 className="text-2xl font-semibold gold-gradient">MOK Tarot Reading</h1>
        </div>

        {stage === 'email' && (
          <form onSubmit={onCheckEmail} className="space-y-4">
            <div className="flex gap-2 text-sm">
              <button type="button" onClick={()=>setMethod('email')} className={`flex-1 px-3 py-2 rounded-md border ${method==='email'?'border-mok-gold bg-black/40':'border-mok-goldDeep/30'}`}>{copy.methodEmail}</button>
              <button type="button" onClick={()=>setMethod('phone')} className={`flex-1 px-3 py-2 rounded-md border ${method==='phone'?'border-mok-gold bg-black/40':'border-mok-goldDeep/30'}`}>{copy.methodPhone}</button>
            </div>
            {method === 'email' ? (
              <div>
                <label className="block mb-1 text-sm text-mok-goldLight">{copy.emailLabel}</label>
                <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" placeholder="you@gmail.com" className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold"/>
              </div>
            ) : (
              <div className="grid grid-cols-[1fr_2fr] gap-2">
                <label className="text-sm">
                  <div className="block mb-1 text-mok-goldLight">{copy.countryLabel}</div>
                  <select value={phoneCode} onChange={(e)=>setPhoneCode(e.target.value)} className="w-full h-10 rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold">
                    {COUNTRY_CODES.map(c => (
                      <option key={c.code} value={c.code}>{(language === 'en' ? c.name.en : c.name.my)} (+{c.code})</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <div className="block mb-1 text-mok-goldLight">{copy.phoneLabel}</div>
                  <input value={phoneNumber} onChange={(e)=>setPhoneNumber(e.target.value)} placeholder="09…" className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold"/>
                </label>
              </div>
            )}
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {info && <p className="text-green-400 text-sm">{info}</p>}
            <button disabled={loading} className="w-full py-2 rounded-md bg-gold-linear text-black font-medium disabled:opacity-60">{loading ? copy.loading : copy.continue}</button>
          </form>
        )}

        {stage === 'login' && (
          <form onSubmit={onLogin} className="space-y-4">
            <p className="text-sm text-mok-goldLight">{method==='email' ? email : `+${phoneCode} ${phoneNumber}`}</p>
            <div>
              <label className="block mb-1 text-sm text-mok-goldLight">{copy.passwordLabel}</label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e)=>setPassword(e.target.value)}
                  type={showLoginPassword ? 'text' : 'password'}
                  className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 pr-12 outline-none focus:border-mok-gold"
                />
                <button
                  type="button"
                  onClick={()=>setShowLoginPassword(prev => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center text-mok-gold/70 hover:text-mok-gold"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={()=>setStage('email')} className="px-3 py-2 rounded-md border border-mok-goldDeep/40">{copy.back}</button>
              <button disabled={loading} className="flex-1 py-2 rounded-md bg-gold-linear text-black font-medium disabled:opacity-60">{copy.loginButton}</button>
            </div>
          </form>
        )}

        {stage === 'register' && (
          <form onSubmit={onRegister} className="space-y-4">
            <p className="text-sm text-mok-goldLight">{method==='email' ? email : `+${phoneCode} ${phoneNumber}`}</p>
            <div>
              <label className="block mb-1 text-sm text-mok-goldLight">{copy.nameLabel}</label>
              <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold" />
            </div>
            <div>
              <label className="block mb-1 text-sm text-mok-goldLight">{copy.genderLabel}</label>
              <div className="flex items-center gap-3 text-sm">
                <label className="inline-flex items-center gap-1"><input type="radio" name="gender" checked={gender==='male'} onChange={()=>setGender('male')} /> {copy.gender.male}</label>
                <label className="inline-flex items-center gap-1"><input type="radio" name="gender" checked={gender==='female'} onChange={()=>setGender('female')} /> {copy.gender.female}</label>
                <label className="inline-flex items-center gap-1"><input type="radio" name="gender" checked={gender==='other'} onChange={()=>setGender('other')} /> {copy.gender.other}</label>
              </div>
            </div>
            <div>
              <label className="block mb-1 text-sm text-mok-goldLight">{copy.ageLabel}</label>
              <input value={age} onChange={(e)=>setAge(e.target.value)} className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold" />
            </div>
            <div>
              <label className="block mb-1 text-sm text-mok-goldLight">{copy.registerPassword}</label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e)=>setPassword(e.target.value)}
                  type={showRegisterPassword ? 'text' : 'password'}
                  className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 pr-12 outline-none focus:border-mok-gold"
                />
                <button
                  type="button"
                  onClick={()=>setShowRegisterPassword(prev => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center text-mok-gold/70 hover:text-mok-gold"
                  aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                >
                  {showRegisterPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <label className="flex items-start gap-2 text-xs text-neutral-400">
              <input type="checkbox" checked={agree} onChange={(e)=>setAgree(e.target.checked)} className="mt-1"/>
              <span>
                {copy.termsPrefix}
                <button type="button" onClick={()=>setShowPolicy(true)} className="underline underline-offset-2 text-mok-gold hover:text-mok-goldLight ml-1">{copy.viewPolicy}</button>
              </span>
            </label>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={()=>setStage('email')} className="px-3 py-2 rounded-md border border-mok-goldDeep/40">{copy.back}</button>
              <button disabled={loading || !agree} className="flex-1 py-2 rounded-md bg-gold-linear text-black font-medium disabled:opacity-60">{copy.registerButton}</button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-neutral-400">{copy.info}</p>
      </div>

      {showPolicy && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="max-w-2xl bg-[#050302] border border-mok-goldDeep/40 rounded-2xl p-4 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-mok-gold">Policies</h3>
              <button onClick={()=>setShowPolicy(false)} className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold">Close</button>
            </div>
            <div className="space-y-3 text-sm leading-6 text-neutral-200">
              <p>These Terms apply to your use of the MOK Tarot service. By creating an account or using the service, you agree to the following:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>No professional advice: Readings are for entertainment and general guidance only. They are not medical, legal, financial, or psychological advice.</li>
                <li>No illegal or inappropriate content: Do not request, promote, or engage in illegal activities, hate, harassment, explicit sexual content, or exploitation.</li>
                <li>User responsibility: You are solely responsible for your questions and how you use the output. Political persuasion or incitement is not allowed.</li>
                <li>Age: You confirm you are at least 18 years old (or have legal guardian consent) to use this service.</li>
                <li>Data usage: We may store your questions, selected cards, and readings for service improvement, safety, analytics, and research. Aggregated or anonymized data may be used in the future.</li>
                <li>Rate limits and abuse: We may limit usage, suspend, or terminate accounts that violate these rules or attempt to abuse the system.</li>
                <li>No guarantee: We provide the service “as is” without guarantees of accuracy, availability, or fitness for a particular purpose.</li>
                <li>Changes: Policies may change over time. Continuing to use the service means you accept the updated terms.</li>
                <li>Liability: To the maximum extent permitted by law, the developers and platform are not liable for decisions you make based on readings.</li>
              </ul>
              <p className="text-neutral-400">If you do not agree, please do not create an account or use the service.</p>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M1.5 12s4-7 10.5-7 10.5 7 10.5 7-4 7-10.5 7-10.5-7-10.5-7z" />
      <circle cx="12" cy="12" r="3.25" />
    </svg>
  )
}

function EyeOffIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M1.5 12s4-7 10.5-7c2.2 0 4.07.7 5.62 1.68" />
      <path d="M22.5 12s-4 7-10.5 7c-2.27 0-4.2-.75-5.8-1.79" />
      <path d="M9.88 9.88a3.25 3.25 0 004.24 4.24" />
      <line x1="4" y1="4" x2="20" y2="20" />
    </svg>
  )
}

'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Stage = 'email' | 'login' | 'register'

export default function HomePage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('email')
  const [email, setEmail] = useState('')
  const [method, setMethod] = useState<'email'|'phone'>('email')
  const [phoneCode, setPhoneCode] = useState('95')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'male'|'female'|'other'|''>('')
  const [age, setAge] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [agree, setAgree] = useState(false)
  const [showPolicy, setShowPolicy] = useState(false)
  const COUNTRY_CODES = [
    { code: '95', name: 'မြန်မာ' },
    { code: '66', name: 'ထိုင်း' },
    { code: '60', name: 'မလေးရှား' },
    { code: '65', name: 'စင်္ကာပူ' },
    { code: '62', name: 'အင်ဒိုနီးရှား' },
    { code: '84', name: 'ဗီယက်နမ်' },
    { code: '63', name: 'ဖိလစ်ပိုင်' },
    { code: '91', name: 'အိန္ဒိယ' },
    { code: '880', name: 'ဗಾಂಗလားဒေ့ရှ်' },
    { code: '86', name: 'တရုတ်' },
    { code: '81', name: 'ဂျပန်' },
    { code: '82', name: 'ကိုရီးယား (တောင်)' },
    { code: '1', name: 'အမေရိကန်' },
    { code: '44', name: 'ယူကေ' },
    { code: '61', name: 'ဩစတြေးလျ' },
  ]

  async function onCheckEmail(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null); setInfo(null)
    setLoading(true)
    try {
      if (method === 'email') {
        if (!email) { setError('အီးမေးလ်ထည့်ပါ'); return }
        const res = await fetch('/api/auth/check-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
        const data = await res.json()
        if (data.gmailOnly === true) { setError('Gmail (@gmail.com) သာအသုံးပြုခွင့်ရှိသည်'); return }
        if (!data.ok) { setError('မမှန်ကန်သော အီးမေးလ်'); return }
        setStage(data.exists ? 'login' : 'register')
      } else {
        if (!phoneCode || !phoneNumber) { setError('ဖုန်းနံပါတ် ဖြည့်ပါ'); return }
        const res = await fetch('/api/auth/check-phone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneCode, phoneNumber }) })
        const data = await res.json()
        if (!data.ok) { setError('မမှန်ကန်သော ဖုန်း'); return }
        setStage(data.exists ? 'login' : 'register')
      }
    } finally {
      setLoading(false)
    }
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault(); setError(null)
    if (password.length < 6) return setError('စကားဝှက် အနည်းဆုံး ၆ လုံး')
    setLoading(true)
    const body = method === 'email' ? { email, password } : { phoneCode, phoneNumber, password }
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json(); setLoading(false)
    if (res.ok) { window.location.href = '/app/dashboard'; return }
    else setError(data.error || 'ဝင်ရောက်မှု မအောင်မြင်ပါ')
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault(); setError(null)
    if (!name.trim()) return setError('အမည် ထည့်ပါ')
    if (!gender) return setError('ကျား/မ ရွေးချယ်ပါ')
    const ageNum = Number(age)
    if (!Number.isFinite(ageNum) || ageNum <= 0) return setError('အသက် ထည့်ပါ')
    if (password.length < 6) return setError('စကားဝှက် အနည်းဆုံး ၆ လုံး')
    if (!agree) return setError('စည်းကမ်းချက်များကို သဘောတူရန် လိုအပ်ပါသည်')
    setLoading(true)
    const body = method === 'email'
      ? { email, name, password, gender, age: ageNum }
      : { phoneCode, phoneNumber, name, password, gender, age: ageNum }
    const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json(); setLoading(false)
    if (res.ok) { window.location.href = '/app/dashboard'; return }
    else setError(data.error || 'စာရင်းသွင်းမှု မအောင်မြင်ပါ')
  }

  useEffect(() => { setError(null); setInfo(null) }, [stage])

  return (
    <main className="min-h-screen flex items-center justify-center bg-mok-black px-4">
      <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-2xl border border-mok-goldDeep/30 bg-gradient-to-b from-mok-smoke to-mok-black">
        <div className="flex flex-col items-center gap-2 mb-6">
          <Image src="/logo.webp" width={90} height={90} alt="MOK logo" />
          <h1 className="text-2xl font-semibold gold-gradient">MOK Tarot Reading</h1>
        </div>

        {stage === 'email' && (
          <form onSubmit={onCheckEmail} className="space-y-4">
            <div className="flex gap-2 text-sm">
              <button type="button" onClick={()=>setMethod('email')} className={`flex-1 px-3 py-2 rounded-md border ${method==='email'?'border-mok-gold bg-black/40':'border-mok-goldDeep/30'}`}>အီးမေးလ်</button>
              <button type="button" onClick={()=>setMethod('phone')} className={`flex-1 px-3 py-2 rounded-md border ${method==='phone'?'border-mok-gold bg-black/40':'border-mok-goldDeep/30'}`}>ဖုန်း</button>
            </div>
            {method === 'email' ? (
              <div>
                <label className="block mb-1 text-sm text-mok-goldLight">အီးမေးလ် (Gmail)</label>
                <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" placeholder="you@gmail.com" className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold"/>
              </div>
            ) : (
              <div className="grid grid-cols-[1fr_2fr] gap-2">
                <label className="text-sm">
                  <div className="block mb-1 text-mok-goldLight">နိုင်ငံ</div>
                  <select value={phoneCode} onChange={(e)=>setPhoneCode(e.target.value)} className="w-full h-10 rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold">
                    {COUNTRY_CODES.map(c => (
                      <option key={c.code} value={c.code}>{c.name} (+{c.code})</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <div className="block mb-1 text-mok-goldLight">ဖုန်းနံပါတ်</div>
                  <input value={phoneNumber} onChange={(e)=>setPhoneNumber(e.target.value)} placeholder="09…" className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold"/>
                </label>
              </div>
            )}
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {info && <p className="text-green-400 text-sm">{info}</p>}
            <button disabled={loading} className="w-full py-2 rounded-md bg-gold-linear text-black font-medium disabled:opacity-60">{loading ? 'စောင့်ပါ…' : 'ဆက်လုပ်မည်'}</button>
          </form>
        )}

        {stage === 'login' && (
          <form onSubmit={onLogin} className="space-y-4">
            <p className="text-sm text-mok-goldLight">{method==='email' ? email : `+${phoneCode} ${phoneNumber}`}</p>
            <div>
              <label className="block mb-1 text-sm text-mok-goldLight">စကားဝှက်</label>
              <input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold" />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={()=>setStage('email')} className="px-3 py-2 rounded-md border border-mok-goldDeep/40">နောက်သို့</button>
              <button disabled={loading} className="flex-1 py-2 rounded-md bg-gold-linear text-black font-medium disabled:opacity-60">ဝင်မည်</button>
            </div>
          </form>
        )}

        {stage === 'register' && (
          <form onSubmit={onRegister} className="space-y-4">
            <p className="text-sm text-mok-goldLight">{method==='email' ? email : `+${phoneCode} ${phoneNumber}`}</p>
            <div>
              <label className="block mb-1 text-sm text-mok-goldLight">အမည်</label>
              <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold" />
            </div>
            <div>
              <label className="block mb-1 text-sm text-mok-goldLight">ကျား/မ</label>
              <div className="flex items-center gap-3 text-sm">
                <label className="inline-flex items-center gap-1"><input type="radio" name="gender" checked={gender==='male'} onChange={()=>setGender('male')} /> ကျား</label>
                <label className="inline-flex items-center gap-1"><input type="radio" name="gender" checked={gender==='female'} onChange={()=>setGender('female')} /> မ</label>
                <label className="inline-flex items-center gap-1"><input type="radio" name="gender" checked={gender==='other'} onChange={()=>setGender('other')} /> အခြား</label>
              </div>
            </div>
            <div>
              <label className="block mb-1 text-sm text-mok-goldLight">အသက်</label>
              <input value={age} onChange={(e)=>setAge(e.target.value)} type="number" min={1} className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold" />
            </div>
            <div>
              <label className="block mb-1 text-sm text-mok-goldLight">စကားဝှက်</label>
              <input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold" />
            </div>
            <div className="text-xs text-neutral-300 flex items-start gap-2">
              <input id="agree" type="checkbox" checked={agree} onChange={(e)=>setAgree(e.target.checked)} className="mt-0.5" />
              <label htmlFor="agree" className="select-none">
                စည်းကမ်းချက်များနှင့် သဘောတူညီပါသည် —
                <button type="button" onClick={()=>setShowPolicy(true)} className="underline underline-offset-2 text-mok-gold hover:text-mok-goldLight ml-1">ကြည့်ရှုရန်</button>
              </label>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={()=>setStage('email')} className="px-3 py-2 rounded-md border border-mok-goldDeep/40">နောက်သို့</button>
              <button disabled={loading || !agree} className="flex-1 py-2 rounded-md bg-gold-linear text-black font-medium disabled:opacity-60">အကောင့်ဖန်တီးမည်</button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-neutral-400">Email (Gmail) သို့မဟုတ် ဖုန်းနံပါတ်ဖြင့် မှတ်ပုံတင်/ဝင်ရောက်နိုင်သည်</p>
      </div>
      {showPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={()=>setShowPolicy(false)} />
          <div className="relative z-10 w-full max-w-2xl mx-4 rounded-2xl border border-mok-goldDeep/40 bg-mok-black p-5 shadow-xl max-h-[88vh] overflow-y-auto thin-scroll">
            <div className="flex items-center justify-between mb-3">
              <h3 className="gold-gradient font-semibold">Terms of Use and Policies</h3>
              <button onClick={()=>setShowPolicy(false)} className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold">Close</button>
            </div>
            <div className="space-y-3 text-sm leading-6">
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

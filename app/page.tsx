'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Stage = 'email' | 'login' | 'register'

export default function HomePage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('email')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onCheckEmail(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null); setInfo(null)
    if (!email) return setError('အီးမေးလ်ထည့်ပါ')
    setLoading(true)
    const res = await fetch('/api/auth/check-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
    const data = await res.json()
    setLoading(false)
    if (data.gmailOnly === true) {
      setError('Gmail (@gmail.com) သာအသုံးပြုခွင့်ရှိသည်')
      return
    }
    if (!data.ok) { setError('မမှန်ကန်သော အီးမေးလ်') ; return }
    setStage(data.exists ? 'login' : 'register')
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault(); setError(null)
    if (password.length < 6) return setError('စကားဝှက် အနည်းဆုံး ၆ လုံး')
    setLoading(true)
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    const data = await res.json(); setLoading(false)
    if (res.ok) { window.location.href = '/app/dashboard'; return }
    else setError(data.error || 'ဝင်ရောက်မှု မအောင်မြင်ပါ')
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault(); setError(null)
    if (password.length < 6) return setError('စကားဝှက် အနည်းဆုံး ၆ လုံး')
    if (!name.trim()) return setError('အမည် ထည့်ပါ')
    setLoading(true)
    const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, name, password }) })
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
            <div>
              <label className="block mb-1 text-sm text-mok-goldLight">Gmail</label>
              <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" placeholder="you@gmail.com" className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold"/>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {info && <p className="text-green-400 text-sm">{info}</p>}
            <button disabled={loading} className="w-full py-2 rounded-md bg-gold-linear text-black font-medium disabled:opacity-60">{loading ? 'စောင့်ပါ…' : 'ဆက်လုပ်မည်'}</button>
          </form>
        )}

        {stage === 'login' && (
          <form onSubmit={onLogin} className="space-y-4">
            <p className="text-sm text-mok-goldLight">{email}</p>
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
            <p className="text-sm text-mok-goldLight">{email}</p>
            <div>
              <label className="block mb-1 text-sm text-mok-goldLight">အမည်</label>
              <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold" />
            </div>
            <div>
              <label className="block mb-1 text-sm text-mok-goldLight">စကားဝှက်</label>
              <input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold" />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={()=>setStage('email')} className="px-3 py-2 rounded-md border border-mok-goldDeep/40">နောက်သို့</button>
              <button disabled={loading} className="flex-1 py-2 rounded-md bg-gold-linear text-black font-medium disabled:opacity-60">အကောင့်ဖန်တီးမည်</button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-neutral-400">Gmail များကိုသာ ခွင့်ပြုထားသည်</p>
      </div>
    </main>
  )
}

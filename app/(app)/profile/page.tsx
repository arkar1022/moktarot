'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

const presetAvatars = Array.from({ length: 8 }, (_, i) => `/avatars/vector${i + 1}.png`)

export default function ProfilePage() {
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editName, setEditName] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/me')
      if (!res.ok) { setLoading(false); return }
      const data = await res.json()
      setName(data.user?.name || '')
      // Default to vector8 if none set yet
      setAvatar(data.user?.avatar || '/avatars/vector8.png')
      setLoading(false)
    })()
  }, [])

  async function saveName() {
    setErr(null); setMsg(null)
    const res = await fetch('/api/profile/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    const data = await res.json().catch(()=>({}))
    if (res.ok) { setMsg('အမည်ကို ပြင်ဆင်ပြီးပါပြီ'); setEditName(false) }
    else setErr(data.error || 'မအောင်မြင်ပါ')
  }

  async function saveAvatar() {
    setErr(null); setMsg(null)
    const res = await fetch('/api/profile/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ avatar }) })
    const data = await res.json().catch(()=>({}))
    if (res.ok) {
      setMsg('အာဗတာကို ပြောင်းပြီးပါပြီ')
      try { window.dispatchEvent(new CustomEvent('avatar-updated', { detail: avatar })) } catch {}
    } else setErr(data.error || 'မအောင်မြင်ပါ')
  }

  async function changePassword() {
    setErr(null); setMsg(null)
    if (!currentPwd || !newPwd || newPwd !== confirmPwd) {
      setErr('စကားဝှက်များ မတူပါ / မပြည့်စုံပါ'); return
    }
    const res = await fetch('/api/profile/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: currentPwd, password: newPwd }) })
    const data = await res.json().catch(()=>({}))
    if (res.ok) { setMsg('စကားဝှက် ပြောင်းပြီးပါပြီ'); setShowPwd(false); setCurrentPwd(''); setNewPwd(''); setConfirmPwd('') }
    else setErr(data.error || 'မအောင်မြင်ပါ')
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  if (loading) return <p>Loading…</p>

  return (
    <div className="space-y-8 max-w-xl">
      <h2 className="gold-gradient text-lg font-semibold">ပရိုဖိုင်း</h2>

      {/* Name section */}
      <section className="p-4 rounded-xl border border-mok-goldDeep/30 bg-black/40">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-mok-goldLight">လက်ရှိအမည်</div>
            {!editName && <div className="text-lg font-medium">{name || '—'}</div>}
          </div>
          {!editName && (
            <button onClick={()=>setEditName(true)} className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold">ပြင်မည်</button>
          )}
        </div>
        {editName && (
          <div className="mt-3">
            <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold"/>
            <div className="mt-2 flex gap-2">
              <button onClick={saveName} className="px-3 py-2 rounded-md bg-gold-linear text-black font-medium">သိမ်းမည်</button>
              <button onClick={()=>setEditName(false)} className="px-3 py-2 rounded-md border border-mok-goldDeep/40">မလုပ်တော့</button>
            </div>
          </div>
        )}
      </section>

      {/* Avatar section */}
      <section className="p-4 rounded-xl border border-mok-goldDeep/30 bg-black/40">
        <div className="text-sm text-mok-goldLight mb-2">Avatar (vector စုစည်းမှုမှ ရွေးပါ)</div>
        <div className="flex flex-wrap gap-2 items-center">
          {presetAvatars.map((src) => (
            <button key={src} type="button" onClick={()=>setAvatar(src)} className={`p-1 rounded-md border ${avatar===src? 'border-mok-gold ring-2 ring-mok-gold/50': 'border-mok-goldDeep/30'}`} title={src.split('/').pop()||'avatar'}>
              <Image src={src} alt="avatar" width={56} height={56} className="rounded" />
            </button>
          ))}
          <button onClick={saveAvatar} className="ml-auto px-3 py-2 rounded-md bg-gold-linear text-black font-medium">သိမ်းမည်</button>
        </div>
      </section>

      {/* Password section */}
      <section className="p-4 rounded-xl border border-mok-goldDeep/30 bg-black/40">
        <div className="flex items-center justify-between">
          <div className="text-sm text-mok-goldLight">စကားဝှက်</div>
          {!showPwd && (
            <button onClick={()=>setShowPwd(true)} className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold">ပြောင်းမည်</button>
          )}
        </div>
        {showPwd && (
          <div className="mt-3 space-y-3">
            <input value={currentPwd} onChange={(e)=>setCurrentPwd(e.target.value)} type="password" placeholder="လက်ရှိ စကားဝှက်" className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold"/>
            <input value={newPwd} onChange={(e)=>setNewPwd(e.target.value)} type="password" placeholder="စကားဝှက်အသစ် (အနည်းဆုံး ၆)" className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold"/>
            <input value={confirmPwd} onChange={(e)=>setConfirmPwd(e.target.value)} type="password" placeholder="စကားဝှက်အသစ် ထပ်ဝင်" className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold"/>
            <div className="flex gap-2">
              <button onClick={changePassword} className="px-3 py-2 rounded-md bg-gold-linear text-black font-medium">သိမ်းမည်</button>
              <button onClick={()=>{setShowPwd(false); setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')}} className="px-3 py-2 rounded-md border border-mok-goldDeep/40">မလုပ်တော့</button>
            </div>
          </div>
        )}
      </section>

      {(msg || err) && (
        <p className={`text-sm ${msg? 'text-green-400':'text-red-400'}`}>{msg || err}</p>
      )}

      <div className="pt-2">
        <button type="button" onClick={logout} className="px-4 py-2 rounded-md border border-mok-goldDeep/40">ထွက်မည်</button>
      </div>
    </div>
  )
}

'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { readGuestProfile, saveGuestProfile } from '@/lib/browser-storage'
import { isWithoutDbMode } from '@/lib/runtime'

const presetAvatars = Array.from({ length: 8 }, (_, i) => `/avatars/vector${i + 1}.png`)

type Lang = 'my' | 'en'

const COPY = {
  my: {
    title: 'ပရိုဖိုင်း',
    currentName: 'လက်ရှိအမည်',
    edit: 'ပြင်မည်',
    save: 'သိမ်းမည်',
    cancel: 'မလုပ်တော့',
    avatarLabel: 'Avatar (vector စုစည်းမှုမှ ရွေးပါ)',
    password: 'စကားဝှက်',
    changePassword: 'ပြောင်းမည်',
    currentPasswordPh: 'လက်ရှိ စကားဝှက်',
    newPasswordPh: 'စကားဝှက်အသစ် (အနည်းဆုံး ၆)',
    confirmPasswordPh: 'စကားဝှက်အသစ် ထပ်ဝင်',
    logout: 'ထွက်မည်',
    loading: 'Loading…',
    messages: {
      nameSaved: 'အမည်ကို ပြင်ဆင်ပြီးပါပြီ',
      avatarSaved: 'အာဗတာကို ပြောင်းပြီးပါပြီ',
      passwordSaved: 'စကားဝှက် ပြောင်းပြီးပါပြီ',
      passwordMismatch: 'စကားဝှက်များ မတူပါ / မပြည့်စုံပါ',
      error: 'မအောင်မြင်ပါ',
    },
  },
  en: {
    title: 'Profile',
    currentName: 'Current name',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    avatarLabel: 'Avatar (pick from vector set)',
    password: 'Password',
    changePassword: 'Change',
    currentPasswordPh: 'Current password',
    newPasswordPh: 'New password (min 6)',
    confirmPasswordPh: 'Confirm new password',
    logout: 'Log out',
    loading: 'Loading…',
    messages: {
      nameSaved: 'Name updated successfully.',
      avatarSaved: 'Avatar updated successfully.',
      passwordSaved: 'Password changed successfully.',
      passwordMismatch: 'Passwords do not match or are incomplete.',
      error: 'Action failed',
    },
  }
} as const

export default function ProfileClient({ initialLang }: { initialLang: Lang }) {
  const withoutDbMode = isWithoutDbMode()
  const [language, setLanguage] = useState<Lang>(initialLang)
  const copy = COPY[language]
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

  useEffect(() => {
    (async () => {
      if (withoutDbMode) {
        const profile = readGuestProfile()
        setName(profile.name)
        setAvatar(profile.avatar)
        setLoading(false)
        return
      }
      const res = await fetch('/api/me')
      if (!res.ok) { setLoading(false); return }
      const data = await res.json()
      setName(data.user?.name || '')
      setAvatar(data.user?.avatar || '/avatars/vector8.png')
      setLoading(false)
    })()
  }, [withoutDbMode])

  async function saveName() {
    setErr(null); setMsg(null)
    if (withoutDbMode) {
      saveGuestProfile({ name })
      setMsg(copy.messages.nameSaved)
      setEditName(false)
      return
    }
    const res = await fetch('/api/profile/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    const data = await res.json().catch(()=>({}))
    if (res.ok) { setMsg(copy.messages.nameSaved); setEditName(false) }
    else setErr(data.error || copy.messages.error)
  }

  async function saveAvatar() {
    setErr(null); setMsg(null)
    if (withoutDbMode) {
      saveGuestProfile({ avatar: avatar || '/avatars/vector8.png' })
      setMsg(copy.messages.avatarSaved)
      return
    }
    const res = await fetch('/api/profile/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ avatar }) })
    const data = await res.json().catch(()=>({}))
    if (res.ok) {
      setMsg(copy.messages.avatarSaved)
      try { window.dispatchEvent(new CustomEvent('avatar-updated', { detail: avatar })) } catch {}
    } else setErr(data.error || copy.messages.error)
  }

  async function changePassword() {
    setErr(null); setMsg(null)
    if (!currentPwd || !newPwd || newPwd !== confirmPwd) {
      setErr(copy.messages.passwordMismatch); return
    }
    const res = await fetch('/api/profile/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: currentPwd, password: newPwd }) })
    const data = await res.json().catch(()=>({}))
    if (res.ok) { setMsg(copy.messages.passwordSaved); setShowPwd(false); setCurrentPwd(''); setNewPwd(''); setConfirmPwd('') }
    else setErr(data.error || copy.messages.error)
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  if (loading) return <p>{copy.loading}</p>

  return (
    <div className="space-y-8 max-w-xl">
      <h2 className="gold-gradient text-lg font-semibold">{copy.title}</h2>

      <section className="p-4 rounded-xl border border-mok-goldDeep/30 bg-black/40">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-mok-goldLight">{copy.currentName}</div>
            {!editName && <div className="text-lg font-medium">{name || '—'}</div>}
          </div>
          {!editName && (
            <button onClick={()=>setEditName(true)} className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold">{copy.edit}</button>
          )}
        </div>
        {editName && (
          <div className="mt-3">
            <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold"/>
            <div className="mt-2 flex gap-2">
              <button onClick={saveName} className="px-3 py-2 rounded-md bg-gold-linear text-black font-medium">{copy.save}</button>
              <button onClick={()=>setEditName(false)} className="px-3 py-2 rounded-md border border-mok-goldDeep/40">{copy.cancel}</button>
            </div>
          </div>
        )}
      </section>

      <section className="p-4 rounded-xl border border-mok-goldDeep/30 bg-black/40">
        <div className="text-sm text-mok-goldLight mb-2">{copy.avatarLabel}</div>
        <div className="flex flex-wrap gap-2 items-center">
          {presetAvatars.map((src) => (
            <button key={src} type="button" onClick={()=>setAvatar(src)} className={`p-1 rounded-md border ${avatar===src? 'border-mok-gold ring-2 ring-mok-gold/50': 'border-mok-goldDeep/30'}`} title={src.split('/').pop()||'avatar'}>
              <Image src={src} alt="avatar" width={56} height={56} className="rounded" />
            </button>
          ))}
          <button onClick={saveAvatar} className="ml-auto px-3 py-2 rounded-md bg-gold-linear text-black font-medium">{copy.save}</button>
        </div>
      </section>

      {!withoutDbMode && (
        <section className="p-4 rounded-xl border border-mok-goldDeep/30 bg-black/40">
        <div className="flex items-center justify-between">
          <div className="text-sm text-mok-goldLight">{copy.password}</div>
          {!showPwd && (
            <button onClick={()=>setShowPwd(true)} className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold">{copy.changePassword}</button>
          )}
        </div>
        {showPwd && (
          <div className="mt-3 space-y-3">
            <input value={currentPwd} onChange={(e)=>setCurrentPwd(e.target.value)} type="password" placeholder={copy.currentPasswordPh} className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold"/>
            <input value={newPwd} onChange={(e)=>setNewPwd(e.target.value)} type="password" placeholder={copy.newPasswordPh} className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold"/>
            <input value={confirmPwd} onChange={(e)=>setConfirmPwd(e.target.value)} type="password" placeholder={copy.confirmPasswordPh} className="w-full rounded-md bg-black/50 border border-mok-goldDeep/40 px-3 py-2 outline-none focus:border-mok-gold"/>
            <div className="flex gap-2">
              <button onClick={changePassword} className="px-3 py-2 rounded-md bg-gold-linear text-black font-medium">{copy.save}</button>
              <button onClick={()=>{setShowPwd(false); setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')}} className="px-3 py-2 rounded-md border border-mok-goldDeep/40">{copy.cancel}</button>
            </div>
          </div>
        )}
        </section>
      )}

  {(msg || err) && (
        <p className={`text-sm ${msg? 'text-green-400':'text-red-400'}`}>{msg || err}</p>
      )}

      {!withoutDbMode && (
        <div className="pt-2">
          <button type="button" onClick={logout} className="px-4 py-2 rounded-md border border-mok-goldDeep/40">{copy.logout}</button>
        </div>
      )}
    </div>
  )
}

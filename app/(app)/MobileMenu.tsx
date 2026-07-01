'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { readGuestProfile } from '@/lib/browser-storage'
import { isWithoutDbMode } from '@/lib/runtime'

type Lang = 'my' | 'en'

const TEXT: Record<Lang, {
  profile: string
  profileSubtitle: string
  zodiac: string
  natal: string
  guidance: string
  history: string
  goodness: string
  logout: string
}> = {
  my: {
    profile: 'ပရိုဖိုင်း',
    profileSubtitle: 'ပရိုဖိုင်ဆီ သွားရန်',
    zodiac: 'ရာသီခွင်',
    natal: 'မွေးဇာတာ',
    guidance: '၀ိညာဉ်အကြံဉာဏ်',
    history: 'မှတ်တမ်း',
    goodness: 'ကောင်းမှု မှတ်တမ်း',
    logout: 'ထွက်မည်',
  },
  en: {
    profile: 'Profile',
    profileSubtitle: 'Go to profile',
    zodiac: 'Zodiac',
    natal: 'Natal Chart',
    guidance: 'Spiritual Guidance',
    history: 'History',
    goodness: 'Good Deeds',
    logout: 'Sign out',
  }
}

export default function MobileMenu({ lang }: { lang: Lang }) {
  const withoutDbMode = isWithoutDbMode()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState<string>('')
  const [avatar, setAvatar] = useState<string>('/avatars/vector8.png')
  const [role, setRole] = useState<'USER'|'ADMIN'|'UNKNOWN'>('UNKNOWN')
  const copy = TEXT[lang]

  useEffect(() => {
    if (withoutDbMode) {
      const syncGuestProfile = () => {
        const profile = readGuestProfile()
        setName(profile.name)
        setAvatar(profile.avatar)
        setRole('USER')
      }
      syncGuestProfile()
      window.addEventListener('guest-profile-updated', syncGuestProfile)
      return () => window.removeEventListener('guest-profile-updated', syncGuestProfile)
    }

    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json().catch(()=>({}))
        if (!alive) return
        setName(data?.user?.name || '')
        setAvatar(data?.user?.avatar || '/avatars/vector8.png')
        setRole((data?.user?.role || 'USER') as any)
      } catch {}
    })()
    return () => { alive = false }
  }, [withoutDbMode])

  function close() { setOpen(false) }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  return (
    <div className="relative">
      <button
        aria-label="menu"
        onClick={()=>setOpen(v=>!v)}
        className="p-2 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold"
      >
        <span className="block w-6 h-0.5 bg-mok-gold mb-1"/>
        <span className="block w-6 h-0.5 bg-mok-gold mb-1"/>
        <span className="block w-6 h-0.5 bg-mok-gold"/>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div className="absolute right-0 mt-2 z-50 w-56 rounded-xl border border-mok-goldDeep/40 bg-mok-black p-3 shadow-xl">
            <button onClick={()=>{ window.location.href='/app/profile' }} className="w-full text-left flex items-center gap-2 p-2 rounded-md hover:bg-black/40">
              <Image src={avatar} alt="avatar" width={28} height={28} className="rounded-full border border-mok-goldDeep/40" />
              <div>
                <div className="text-sm font-medium">{name || copy.profile}</div>
                <div className="text-xs text-neutral-400">{copy.profileSubtitle}</div>
              </div>
            </button>
            <a href="/app/natal" className="block p-2 text-sm rounded-md hover:bg-black/40">{copy.natal}</a>
            <a href="/app/guidance" className="block p-2 text-sm rounded-md hover:bg-black/40">{copy.guidance}</a>
            <a href="/app/history" className="block p-2 text-sm rounded-md hover:bg-black/40">{copy.history}</a>
            {!withoutDbMode && (
              <>
                <a href="/app/zodiac" className="block p-2 text-sm rounded-md hover:bg-black/40">{copy.zodiac}</a>
                <a href="/app/goodness" className="block p-2 text-sm rounded-md hover:bg-black/40">{copy.goodness}</a>
              </>
            )}
            {role === 'ADMIN' && (
              <a href="/adminmok" className="block p-2 text-sm rounded-md hover:bg-black/40">Admin</a>
            )}
            {!withoutDbMode && (
              <button onClick={signOut} className="mt-1 w-full p-2 text-left text-sm rounded-md hover:bg-black/40">{copy.logout}</button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

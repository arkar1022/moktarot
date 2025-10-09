"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function MobileMenu() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState<string>('')
  const [avatar, setAvatar] = useState<string>('/avatars/vector8.png')
  const [role, setRole] = useState<'USER'|'ADMIN'|'UNKNOWN'>('UNKNOWN')

  useEffect(() => {
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
  }, [])

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
                <div className="text-sm font-medium">{name || 'ပရိုဖိုင်း'}</div>
                <div className="text-xs text-neutral-400">ပရိုဖိုင်ဆီ သွားရန်</div>
              </div>
            </button>
            <a href="/app/zodiac" className="block p-2 text-sm rounded-md hover:bg-black/40">ရာသီခွင်</a>
            <a href="/app/history" className="block p-2 text-sm rounded-md hover:bg-black/40">မှတ်တမ်း</a>
            {role === 'ADMIN' && (
              <a href="/adminmok" className="block p-2 text-sm rounded-md hover:bg-black/40">Admin</a>
            )}
            <button onClick={signOut} className="mt-1 w-full p-2 text-left text-sm rounded-md hover:bg-black/40">ထွက်မည်</button>
          </div>
        </>
      )}
    </div>
  )
}

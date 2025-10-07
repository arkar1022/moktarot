'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function UserAvatar() {
  const [src, setSrc] = useState('/avatars/vector8.png')
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json().catch(() => ({}))
        const s = data?.user?.avatar || '/avatars/vector8.png'
        if (alive) setSrc(s)
      } catch {}
    })()
    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail as string | undefined
      if (detail && typeof detail === 'string') setSrc(detail)
      else {
        // Refetch as fallback
        fetch('/api/me', { cache: 'no-store' }).then(r=>r.json()).then(d=>{
          const s = d?.user?.avatar || '/avatars/vector8.png'
          setSrc(s)
        }).catch(()=>{})
      }
    }
    window.addEventListener('avatar-updated', onUpdated as any)
    return () => { alive = false; window.removeEventListener('avatar-updated', onUpdated as any) }
  }, [])

  return (
    <Image src={src} alt="avatar" width={28} height={28} className="rounded-full border border-mok-goldDeep/40" />
  )
}

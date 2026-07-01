'use client'

import { useEffect } from 'react'
import { isWithoutDbMode } from '@/lib/runtime'

export default function AuthGuard() {
  const withoutDbMode = isWithoutDbMode()

  useEffect(() => {
    if (withoutDbMode) return

    let active = true
    ;(async () => {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' })
        if (!active) return
        if (res.status === 401) {
          window.location.href = '/'
        }
      } catch {
        // On network errors, stay put
      }
    })()
    return () => { active = false }
  }, [withoutDbMode])
  return null
}

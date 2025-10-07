'use client'

import { useEffect } from 'react'

export default function AuthGuard() {
  useEffect(() => {
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
  }, [])
  return null
}


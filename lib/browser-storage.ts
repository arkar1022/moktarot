'use client'

export type GuestProfile = {
  name: string
  avatar: string
}

export type LocalTarotHistoryEntry = {
  id: string
  question: string
  answer: string
  cards: string[] | { name: string }[]
  createdAt: string
}

export type LocalGuidanceHistoryEntry = {
  id: string
  religion: 'BUDDHIST' | 'HINDU' | 'CHRISTIAN' | 'ISLAM'
  question: string
  answer: string
  createdAt: string
}

const GUEST_PROFILE_KEY = 'mok_guest_profile'
const TAROT_HISTORY_KEY = 'mok_local_tarot_history'
const GUIDANCE_HISTORY_KEY = 'mok_local_guidance_history'
const DEFAULT_AVATAR = '/avatars/vector8.png'
const HISTORY_LIMIT = 50

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore storage failures
  }
}

export function readGuestProfile(): GuestProfile {
  const value = readJson<Partial<GuestProfile>>(GUEST_PROFILE_KEY, {})
  return {
    name: typeof value?.name === 'string' ? value.name : '',
    avatar: typeof value?.avatar === 'string' && value.avatar ? value.avatar : DEFAULT_AVATAR
  }
}

export function saveGuestProfile(profile: Partial<GuestProfile>) {
  const next = {
    ...readGuestProfile(),
    ...profile
  }
  writeJson(GUEST_PROFILE_KEY, next)
  try {
    window.dispatchEvent(new CustomEvent('guest-profile-updated', { detail: next }))
    window.dispatchEvent(new CustomEvent('avatar-updated', { detail: next.avatar }))
  } catch {
    // ignore event failures
  }
  return next
}

export function readLocalTarotHistory() {
  return readJson<LocalTarotHistoryEntry[]>(TAROT_HISTORY_KEY, [])
}

export function appendLocalTarotHistory(entry: LocalTarotHistoryEntry) {
  const next = [entry, ...readLocalTarotHistory()].slice(0, HISTORY_LIMIT)
  writeJson(TAROT_HISTORY_KEY, next)
  return next
}

export function readLocalGuidanceHistory() {
  return readJson<LocalGuidanceHistoryEntry[]>(GUIDANCE_HISTORY_KEY, [])
}

export function appendLocalGuidanceHistory(entry: LocalGuidanceHistoryEntry) {
  const next = [entry, ...readLocalGuidanceHistory()].slice(0, HISTORY_LIMIT)
  writeJson(GUIDANCE_HISTORY_KEY, next)
  return next
}

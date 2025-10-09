"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { TAROT_DECK, shuffleDeck, cardImagePath, CARD_BACK_SRC } from '@/lib/tarot'

type User = {
  id: string
  email: string | null
  phoneCode?: string | null
  phoneNumber?: string | null
  name: string
  role: 'USER' | 'ADMIN'
  createdAt: string
  dailyLimit?: number
  extraQuota?: number
}

type Reading = {
  id: string
  userId: string
  question: string
  answer: string
  language: string
  category?: 'LOVE'|'MARRIAGE'|'WORK'|'LIFESTYLE'|'SPIRITUAL'|'EDUCATION'|'HEALTH'|'MONEY' | null
  createdAt: string
  cards?: any
  user?: { id: string; email: string | null; name: string; phoneCode?: string | null; phoneNumber?: string | null }
}

const CATEGORIES = ['LOVE','MARRIAGE','WORK','LIFESTYLE','SPIRITUAL','EDUCATION','HEALTH','MONEY'] as const

export default function AdminDashboard({ users, readings }: { users: User[]; readings: Reading[] }) {
  const [tab, setTab] = useState<'users'|'readings'|'zodiac'>('users')
  const [openUserId, setOpenUserId] = useState<string | null>(null)
  const [usersState, setUsersState] = useState<User[]>(users)
  const [readingsState, setReadingsState] = useState<Reading[]>(readings)
  const [openReading, setOpenReading] = useState<Reading | null>(null)
  

  // Build lastActive map from readings
  const lastActive = useMemo(() => {
    const map: Record<string, string> = {}
    for (const r of readingsState) {
      const cur = map[r.userId]
      if (!cur || new Date(r.createdAt) > new Date(cur)) map[r.userId] = r.createdAt
    }
    return map
  }, [readingsState])

  /* USERS state */
  const [uQuery, setUQuery] = useState('')
  const [uSort, setUSort] = useState<'created_desc'|'created_asc'|'active_desc'|'active_asc'|'name_asc'|'name_desc'>('created_desc')
  const [uCreatedFrom, setUCreatedFrom] = useState('')
  const [uCreatedTo, setUCreatedTo] = useState('')

  const filteredUsers = useMemo(() => {
    const q = uQuery.trim().toLowerCase()
    let arr = usersState.filter(u => {
      const phone = u.phoneCode && u.phoneNumber ? `+${u.phoneCode} ${u.phoneNumber}` : ''
      const okQ = !q || (u.email?.toLowerCase() || '').includes(q) || u.name.toLowerCase().includes(q) || phone.toLowerCase().includes(q)
      const t = new Date(u.createdAt).getTime()
      const fromOk = !uCreatedFrom || t >= new Date(uCreatedFrom).getTime()
      const toOk = !uCreatedTo || t <= new Date(uCreatedTo).getTime() + 86_399_000
      return okQ && fromOk && toOk
    })
    const cmp = (a: User, b: User) => {
      switch (uSort) {
        case 'created_desc': return +new Date(b.createdAt) - +new Date(a.createdAt)
        case 'created_asc': return +new Date(a.createdAt) - +new Date(b.createdAt)
        case 'active_desc': return +new Date(lastActive[b.id] || 0) - +new Date(lastActive[a.id] || 0)
        case 'active_asc': return +new Date(lastActive[a.id] || 0) - +new Date(lastActive[b.id] || 0)
        case 'name_asc': return a.name.localeCompare(b.name)
        case 'name_desc': return b.name.localeCompare(a.name)
      }
    }
    return arr.sort(cmp)
  }, [usersState, uQuery, uSort, uCreatedFrom, uCreatedTo, lastActive])

  /* READINGS state */
  const [rQuery, setRQuery] = useState('')
  const [rSort, setRSort] = useState<'recent'|'oldest'|'longest'|'shortest'>('recent')
  const [rCats, setRCats] = useState<string[]>([])

  const filteredReadings = useMemo(() => {
    const q = rQuery.trim().toLowerCase()
    let arr = readingsState.filter(r => {
      const phone = r.user?.phoneCode && r.user?.phoneNumber ? `+${r.user.phoneCode} ${r.user.phoneNumber}` : ''
      const text = `${r.question} ${r.user?.name || ''} ${r.user?.email || ''} ${phone}`.toLowerCase()
      const okQ = !q || text.includes(q)
      const okC = rCats.length === 0 || (r.category && rCats.includes(r.category))
      return okQ && okC
    })
    arr.sort((a, b) => {
      if (rSort === 'recent') return +new Date(b.createdAt) - +new Date(a.createdAt)
      if (rSort === 'oldest') return +new Date(a.createdAt) - +new Date(b.createdAt)
      if (rSort === 'longest') return (b.answer?.length || 0) - (a.answer?.length || 0)
      return (a.answer?.length || 0) - (b.answer?.length || 0)
    })
    return arr
  }, [readingsState, rQuery, rSort, rCats])

  async function deleteUser(id: string, name: string) {
    if (!confirm(`Delete user "${name}" and all readings? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      setUsersState(prev => prev.filter(u => u.id !== id))
      setReadingsState(prev => prev.filter(r => r.userId !== id))
      if (openUserId === id) setOpenUserId(null)
    } catch (e) {
      alert('Failed to delete user.')
    }
  }

  return (
    <div className="grid grid-cols-[220px_1fr] gap-4">
      <aside className="rounded-lg border border-mok-goldDeep/30 p-3 h-fit sticky top-4">
        <div className="mb-2 text-sm text-neutral-400">Admin</div>
        <nav className="space-y-1">
          <button onClick={() => setTab('users')} className={`w-full text-left px-3 py-2 rounded-md border ${tab==='users'?'border-mok-gold bg-black/40':'border-transparent hover:border-mok-goldDeep/30'}`}>Users</button>
          <button onClick={() => setTab('readings')} className={`w-full text-left px-3 py-2 rounded-md border ${tab==='readings'?'border-mok-gold bg-black/40':'border-transparent hover:border-mok-goldDeep/30'}`}>Readings</button>
          <button onClick={() => setTab('zodiac')} className={`w-full text-left px-3 py-2 rounded-md border ${tab==='zodiac'?'border-mok-gold bg-black/40':'border-transparent hover:border-mok-goldDeep/30'}`}>Zodiac</button>
        </nav>
      </aside>

      <main>
        {tab === 'users' && (
          <section>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <input value={uQuery} onChange={e=>setUQuery(e.target.value)} placeholder="Search name, email or phone" className="h-9 w-64 max-w-full rounded-md bg-black/40 border border-mok-goldDeep/40 px-3 outline-none" />
              <select value={uSort} onChange={e=>setUSort(e.target.value as any)} className="h-9 rounded-md bg-black/40 border border-mok-goldDeep/40 px-2">
                <option value="created_desc">Created · New → Old</option>
                <option value="created_asc">Created · Old → New</option>
                <option value="active_desc">Last active · New → Old</option>
                <option value="active_asc">Last active · Old → New</option>
                <option value="name_asc">Name · A → Z</option>
                <option value="name_desc">Name · Z → A</option>
              </select>
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <span>Created from</span>
                <input type="date" value={uCreatedFrom} onChange={e=>setUCreatedFrom(e.target.value)} className="h-8 rounded bg-black/40 border border-mok-goldDeep/40 px-2"/>
                <span>to</span>
                <input type="date" value={uCreatedTo} onChange={e=>setUCreatedTo(e.target.value)} className="h-8 rounded bg-black/40 border border-mok-goldDeep/40 px-2"/>
              </div>
            </div>

            <div className="mb-2 text-xs text-neutral-400">
              Total users: <span className="text-mok-gold">{usersState.length}</span>
              {filteredUsers.length !== usersState.length && (
                <> · Showing: <span className="text-mok-gold">{filteredUsers.length}</span></>
              )}
            </div>
            <div className="overflow-x-auto border border-mok-goldDeep/30 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-mok-smoke/60">
                  <tr>
                    <th className="p-2 text-left w-12">No.</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Contact</th>
                    <th className="p-2 text-left">Role</th>
                    <th className="p-2 text-left">Created</th>
                    <th className="p-2 text-left">Last active</th>
                    <th className="p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, idx) => (
                    <tr key={u.id} className="border-t border-mok-goldDeep/20 hover:bg-black/30">
                      <td className="p-2 text-neutral-400">{idx + 1}</td>
                      <td className="p-2">{u.name}</td>
                      <td className="p-2">{u.email || (u.phoneCode && u.phoneNumber ? `+${u.phoneCode} ${u.phoneNumber}` : '—')}</td>
                      <td className="p-2">{u.role}</td>
                      <td className="p-2 whitespace-nowrap">{new Date(u.createdAt).toLocaleString()}</td>
                      <td className="p-2 whitespace-nowrap text-neutral-300">{lastActive[u.id] ? new Date(lastActive[u.id]).toLocaleString() : '—'}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <button onClick={()=>setOpenUserId(u.id)} className="px-2 py-1 rounded border border-mok-goldDeep/40 hover:border-mok-gold">View</button>
                          <button onClick={()=>deleteUser(u.id, u.name)} className="px-2 py-1 rounded border border-red-500/40 text-red-300 hover:bg-red-500/10">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* User detail modal */}
            {openUserId && (()=>{
              const u = usersState.find(x=>x.id===openUserId)
              if (!u) return null
              const rs = readingsState.filter(r=>r.userId===u.id)
              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/70" onClick={()=>setOpenUserId(null)} />
                  <div className="relative z-10 w-full max-w-3xl mx-4 rounded-2xl border border-mok-goldDeep/40 bg-mok-black p-4 shadow-xl max-h-[90vh] overflow-y-auto thin-scroll">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="gold-gradient font-semibold text-lg">{u.name}</div>
                        <div className="text-sm text-neutral-400">{u.email || '—'}</div>
                        {u.phoneCode && u.phoneNumber && (
                          <div className="text-sm text-neutral-400">+{u.phoneCode} {u.phoneNumber}</div>
                        )}
                      </div>
                      <button onClick={()=>setOpenUserId(null)} className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold">Close</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                      <div className="p-3 rounded-lg border border-mok-goldDeep/30 bg-black/30">
                        <div className="text-neutral-400">Role</div>
                        <div>{u.role}</div>
                      </div>
                      <div className="p-3 rounded-lg border border-mok-goldDeep/30 bg-black/30">
                        <div className="text-neutral-400">Created</div>
                        <div>{new Date(u.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="p-3 rounded-lg border border-mok-goldDeep/30 bg-black/30">
                        <div className="text-neutral-400">Last active</div>
                        <div>{lastActive[u.id] ? new Date(lastActive[u.id]).toLocaleString() : '—'}</div>
                      </div>
                      <div className="p-3 rounded-lg border border-mok-goldDeep/30 bg-black/30">
                        <div className="text-neutral-400">Password</div>
                        <div>ဒီစနစ်တွင် စကားဝှက်ကို မျက်နှာဖုံးတင်ထားသော hash ပဲ သိမ်းဆည်းထားပြီး မပြန်လည်မြင်နိုင်ပါ။</div>
                      </div>
                    </div>
                    <UserLimitEditor user={u} onClose={()=>setOpenUserId(null)} />
                    <div>
                      <div className="gold-gradient font-medium mb-2">Readings ({rs.length})</div>
                      <div className="space-y-2">
                        {rs.map(r => (
                          <button key={r.id} onClick={()=>setOpenReading(r)} className="text-left w-full p-3 rounded-lg border border-mok-goldDeep/30 bg-black/30 hover:border-mok-gold">
                            <div className="flex items-center justify-between text-xs text-neutral-400">
                              <span>{new Date(r.createdAt).toLocaleString()}</span>
                              <span className="px-2 py-0.5 rounded border border-mok-goldDeep/40">{r.category || '—'}</span>
                            </div>
                            <div className="mt-1 text-sm text-neutral-200">{r.question}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </section>
        )}

        {tab === 'readings' && (
          <section>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <input value={rQuery} onChange={e=>setRQuery(e.target.value)} placeholder="Search question, name, email or phone" className="h-9 w-80 max-w-full rounded-md bg-black/40 border border-mok-goldDeep/40 px-3 outline-none" />
              <select value={rSort} onChange={e=>setRSort(e.target.value as any)} className="h-9 rounded-md bg-black/40 border border-mok-goldDeep/40 px-2">
                <option value="recent">Recent first</option>
                <option value="oldest">Oldest first</option>
                <option value="longest">Longest answer</option>
                <option value="shortest">Shortest answer</option>
              </select>
              <div className="flex items-center gap-1 text-xs">
                {CATEGORIES.map(c => (
                  <label key={c} className={`px-2 py-1 rounded-md border cursor-pointer ${rCats.includes(c)?'border-mok-gold bg-black/40':'border-mok-goldDeep/30 hover:border-mok-gold/50'}`}>
                    <input type="checkbox" className="mr-1 align-middle" checked={rCats.includes(c)} onChange={(e)=>{
                      setRCats(prev => e.target.checked ? [...prev, c] : prev.filter(x=>x!==c))
                    }} />{c}
                  </label>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto border border-mok-goldDeep/30 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-mok-smoke/60">
                  <tr>
                    <th className="p-2 text-left">When</th>
                    <th className="p-2 text-left">User</th>
                    <th className="p-2 text-left">Contact</th>
                    <th className="p-2 text-left">Category</th>
                    <th className="p-2 text-left">Question</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReadings.map(r => (
                    <tr key={r.id} onClick={()=>setOpenReading(r)} className="border-t border-mok-goldDeep/20 align-top hover:bg-black/30 cursor-pointer">
                      <td className="p-2 whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                      <td className="p-2 whitespace-nowrap">{r.user?.name || '—'}</td>
                      <td className="p-2 whitespace-nowrap">{r.user?.email || (r.user?.phoneCode && r.user?.phoneNumber ? `+${r.user.phoneCode} ${r.user.phoneNumber}` : '—')}</td>
                      <td className="p-2"><span className="inline-block px-2 py-0.5 rounded border border-mok-goldDeep/40 text-xs">{r.category || '—'}</span></td>
                      <td className="p-2 max-w-[520px]"><div className="line-clamp-3 text-neutral-200">{r.question}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'zodiac' && (
          <section>
            <ZodiacAdmin />
          </section>
        )}

        {/* Reading detail modal */}
        {openReading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70" onClick={()=>setOpenReading(null)} />
            <div className="relative z-10 w-full max-w-3xl mx-4 rounded-2xl border border-mok-goldDeep/40 bg-mok-black p-4 shadow-xl max-h-[90vh] overflow-y-auto thin-scroll">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="gold-gradient font-semibold">Reading Detail</div>
                  <div className="text-xs text-neutral-400">{new Date(openReading.createdAt).toLocaleString()} {openReading.category ? `· ${openReading.category}` : ''}</div>
                </div>
                <button onClick={()=>setOpenReading(null)} className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold">Close</button>
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-mok-goldDeep/30 bg-black/30">
                  <div className="text-neutral-400 text-sm mb-1">User</div>
                  <div className="text-sm">{openReading.user?.name || '—'} <span className="text-neutral-400">({openReading.user?.email || (openReading.user?.phoneCode && openReading.user?.phoneNumber ? `+${openReading.user.phoneCode} ${openReading.user.phoneNumber}` : '—')})</span></div>
                </div>
                <div className="p-3 rounded-lg border border-mok-goldDeep/30 bg-black/30">
                  <div className="text-neutral-400 text-sm mb-1">Question</div>
                  <div>{openReading.question}</div>
                </div>
                {openReading.cards && (
                  <div className="p-3 rounded-lg border border-mok-goldDeep/30 bg-black/30">
                    <div className="text-neutral-400 text-sm mb-1">Cards</div>
                    <div className="text-sm">{Array.isArray(openReading.cards) ? openReading.cards.map((c:any)=> typeof c === 'string' ? c : (c?.name||'')).filter(Boolean).join(', ') : '—'}</div>
                  </div>
                )}
                <div className="p-3 rounded-lg border border-mok-goldDeep/30 bg-black/30">
                  <div className="text-neutral-400 text-sm mb-1">Answer</div>
                  <div className="whitespace-pre-wrap leading-7">{openReading.answer}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function ReactsButton({ readingId }: { readingId: string }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<any[] | null>(null)
  async function load() {
    setOpen(true); setItems(null)
    try {
      const res = await fetch(`/api/admin/zodiac/${encodeURIComponent(readingId)}/reactions`)
      const data = await res.json().catch(()=>({}))
      if (res.ok) setItems(data.items || [])
    } catch {}
  }
  return (
    <>
      <button onClick={load} className="px-2 py-1 rounded border border-mok-goldDeep/40 hover:border-mok-gold text-xs">Reacts</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={()=>setOpen(false)} />
          <div className="relative z-10 w-full max-w-3xl mx-4 rounded-2xl border border-mok-goldDeep/40 bg-mok-black p-4 shadow-xl max-h-[90vh] overflow-y-auto thin-scroll">
            <div className="flex items-center justify-between mb-3">
              <div className="gold-gradient font-semibold">Reactions</div>
              <button onClick={()=>setOpen(false)} className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold">Close</button>
            </div>
            <div className="overflow-x-auto border border-mok-goldDeep/30 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-mok-smoke/60">
                  <tr>
                    <th className="p-2 text-left">User</th>
                    <th className="p-2 text-left">Contact</th>
                    <th className="p-2 text-left">When</th>
                  </tr>
                </thead>
                <tbody>
                  {(items||[]).map((r:any) => (
                    <tr key={r.id} className="border-t border-mok-goldDeep/20 hover:bg-black/30">
                      <td className="p-2">{r.name || '—'}</td>
                      <td className="p-2">{r.email || (r.phoneCode && r.phoneNumber ? `+${r.phoneCode} ${r.phoneNumber}` : '—')}</td>
                      <td className="p-2 whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!items || items.length===0) && (
                    <tr><td className="p-3 text-neutral-400" colSpan={3}>No reactions yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ViewsModal({ reading, stats, onClose }: { reading: any, stats: any[] | null, onClose: ()=>void }) {
  const total = (stats||[]).reduce((s, v)=> s + (v.count||0), 0)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl mx-4 rounded-2xl border border-mok-goldDeep/40 bg-mok-black p-4 shadow-xl max-h-[90vh] overflow-y-auto thin-scroll">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="gold-gradient font-semibold">{reading.sign} · Views</div>
            <div className="text-xs text-neutral-400">{new Date(reading.startDate).toLocaleDateString()} – {new Date(reading.endDate).toLocaleDateString()} · Total {total} views</div>
          </div>
          <button onClick={onClose} className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold">Close</button>
        </div>
        <div className="overflow-x-auto border border-mok-goldDeep/30 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-mok-smoke/60">
              <tr>
                <th className="p-2 text-left">User</th>
                <th className="p-2 text-left">Contact</th>
                <th className="p-2 text-left">Count</th>
                <th className="p-2 text-left">Last viewed</th>
              </tr>
            </thead>
            <tbody>
              {(stats||[]).map(v => (
                <tr key={v.id} className="border-t border-mok-goldDeep/20 hover:bg-black/30">
                  <td className="p-2">{v.name || '—'}</td>
                  <td className="p-2">{v.email || (v.phoneCode && v.phoneNumber ? `+${v.phoneCode} ${v.phoneNumber}` : '—')}</td>
                  <td className="p-2">{v.count}</td>
                  <td className="p-2 whitespace-nowrap">{new Date(v.lastViewed).toLocaleString()}</td>
                </tr>
              ))}
              {(!stats || stats.length===0) && (
                <tr><td className="p-3 text-neutral-400" colSpan={4}>No views yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function UserLimitEditor({ user, onClose }: { user: any; onClose: ()=>void }) {
  const [dailyLimit, setDailyLimit] = useState<number | ''>((user.dailyLimit ?? 3) as number)
  const [extraQuota, setExtraQuota] = useState<number | ''>((user.extraQuota ?? 0) as number)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function save() {
    try {
      setSaving(true); setMsg(null)
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyLimit: dailyLimit === '' ? undefined : Number(dailyLimit), extraQuota: extraQuota === '' ? undefined : Number(extraQuota) })
      })
      if (!res.ok) throw new Error('Failed')
      setMsg('Saved')
    } catch {
      setMsg('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-3 rounded-lg border border-mok-goldDeep/30 bg-black/30 mb-4">
      <div className="gold-gradient font-medium mb-2">Limits</div>
      <div className="grid grid-cols-2 gap-3 max-w-xl">
        <label className="text-sm">
          <div className="text-neutral-400 mb-1">Daily limit (default 3)</div>
          <input type="number" min={0} value={dailyLimit} onChange={e=>setDailyLimit(e.target.value===''? '' : Number(e.target.value))} className="h-9 w-full rounded-md bg-black/40 border border-mok-goldDeep/40 px-3" />
        </label>
        <label className="text-sm">
          <div className="text-neutral-400 mb-1">Extra questions pool</div>
          <input type="number" min={0} value={extraQuota} onChange={e=>setExtraQuota(e.target.value===''? '' : Number(e.target.value))} className="h-9 w-full rounded-md bg-black/40 border border-mok-goldDeep/40 px-3" />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button onClick={save} disabled={saving} className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
        {msg && <span className="text-xs text-neutral-400">{msg}</span>}
      </div>
      <p className="mt-2 text-xs text-neutral-400">
        Behavior: User can ask up to daily limit per day. After hitting the daily limit, they may continue up to Extra pool; each extra question consumes 1 from the pool.
      </p>
    </div>
  )
}

function ZodiacAdmin() {
  const [sign, setSign] = useState<string>('ARIES')
  const [start, setStart] = useState<string>('')
  const [end, setEnd] = useState<string>('')
  const startRef = useRef<HTMLInputElement | null>(null)
  const endRef = useRef<HTMLInputElement | null>(null)
  const [fakeReactions, setFakeReactions] = useState<number | ''>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deck, setDeck] = useState(TAROT_DECK)
  const [selected, setSelected] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [sections, setSections] = useState<any>({ general:'', relationship:'', workMoney:'', health:'', education:'', warnings:'' })
  const [list, setList] = useState<any[]>([])
  const [statsFor, setStatsFor] = useState<any | null>(null)
  const [stats, setStats] = useState<any[] | null>(null)
  const [showFaces, setShowFaces] = useState(false)

  useEffect(() => { fetchList() }, [])

  async function fetchList() {
    const res = await fetch('/api/admin/zodiac')
    const data = await res.json().catch(()=>({}))
    if (res.ok) setList(data.readings || [])
  }

  function doShuffle() {
    setSelected([])
    setDeck(shuffleDeck(3))
    setShowFaces(false)
  }
  function togglePick(i: number) {
    setSelected(prev => prev.includes(i) ? prev.filter(x=>x!==i) : (prev.length<3 ? [...prev, i] : prev))
    setShowFaces(false)
  }
  const chosen = selected.map(i=>deck[i]).filter(Boolean)

  async function generate() {
    if (!sign || !start || !end || chosen.length !== 3) return
    setLoading(true)
    const cards = chosen.map(c=>c.name)
    const res = await fetch('/api/admin/zodiac/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sign, startDate: start, endDate: end, cards }) })
    const data = await res.json().catch(()=>({}))
    setLoading(false)
    if (res.ok) {
      setSections(data.sections || {})
      if (!data.sections && data.raw) setSections({ general: data.raw, relationship:'', workMoney:'', health:'', education:'', warnings:'' })
      setShowFaces(true)
    } else {
      alert(data.error || 'Failed to generate')
    }
  }

  async function save() {
    const common = { sign, startDate: start, endDate: end, cards: chosen.map(c=>c.name), ...sections }
    const body = fakeReactions === '' ? common : { ...common, fakeReactions: Number(fakeReactions) }
    if (editingId) {
      const res = await fetch(`/api/admin/zodiac/${encodeURIComponent(editingId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json().catch(()=>({}))
      if (res.ok) {
        setList(prev => prev.map(x => x.id === editingId ? data.reading : x))
        alert('Updated')
      } else {
        alert(data.error || 'Update failed')
      }
    } else {
      const res = await fetch('/api/admin/zodiac', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json().catch(()=>({}))
      if (res.ok) {
        setList(prev => [data.reading, ...prev])
        alert('Saved')
      } else {
        alert(data.error || 'Save failed')
      }
    }
  }

  async function openStats(z: any) {
    setStatsFor(z); setStats(null)
    try {
      const res = await fetch(`/api/admin/zodiac/${encodeURIComponent(z.id)}/views`)
      const data = await res.json().catch(()=>({}))
      if (res.ok) setStats(data.views || [])
    } catch {}
  }

  function load(row: any) {
    setSign(row.sign)
    setStart(row.startDate?.slice(0,10) || '')
    setEnd(row.endDate?.slice(0,10) || '')
    setSections({ general: row.general||'', relationship: row.relationship||'', workMoney: row.workMoney||'', health: row.health||'', education: row.education||'', warnings: row.warnings||'' })
    setFakeReactions(typeof row.fakeReactions === 'number' ? row.fakeReactions : '')
    setEditingId(row.id || null)
    const names: string[] = Array.isArray(row.cards) ? row.cards.map((x:any)=> typeof x==='string' ? x : x?.name) : []
    const idxs: number[] = []
    names.forEach(n => {
      const i = deck.findIndex(c => c.name.toLowerCase() === String(n||'').toLowerCase())
      if (i >= 0) idxs.push(i)
    })
    setSelected(idxs.slice(0,3))
  }

  function resetForm() {
    setSign('ARIES'); setStart(''); setEnd(''); setSections({ general:'', relationship:'', workMoney:'', health:'', education:'', warnings:'' }); setSelected([]); setShowFaces(false); setFakeReactions(''); setEditingId(null)
  }

  return (
    <div className="space-y-6">
      <div className="gold-gradient text-lg font-semibold">Zodiac</div>
      <div className="grid md:grid-cols-[1.1fr_1fr] gap-4 items-start">
        <div className="p-3 rounded-xl border border-mok-goldDeep/30 bg-black/30">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="text-neutral-400 mb-1">Sign</div>
              <select value={sign} onChange={e=>setSign(e.target.value)} className="h-10 w-full rounded-md bg-black/40 border border-mok-goldDeep/40 px-2">
                {['ARIES','TAURUS','GEMINI','CANCER','LEO','VIRGO','LIBRA','SCORPIO','SAGITTARIUS','CAPRICORN','AQUARIUS','PISCES'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm">
                <div className="text-neutral-400 mb-1">Start</div>
                <div className="relative">
                  <input
                    ref={startRef}
                    type="date"
                    value={start}
                    onChange={e=>setStart(e.target.value)}
                    className="h-10 w-full rounded-md bg-black/40 border border-mok-goldDeep/40 pl-3 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const el = startRef.current
                      if (!el) return
                      try { (el as any).showPicker?.() } catch {}
                      el.focus()
                    }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-7 w-7 rounded-md border border-transparent hover:border-mok-goldDeep/40 text-neutral-300 hover:text-mok-gold bg-transparent"
                    aria-label="Open start date picker"
                    title="Open calendar"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="3" y="5" width="18" height="16" rx="2" ry="2"/>
                      <path d="M16 3v4M8 3v4M3 11h18"/>
                    </svg>
                  </button>
                </div>
              </label>
              <label className="text-sm">
                <div className="text-neutral-400 mb-1">End</div>
                <div className="relative">
                  <input
                    ref={endRef}
                    type="date"
                    value={end}
                    onChange={e=>setEnd(e.target.value)}
                    className="h-10 w-full rounded-md bg-black/40 border border-mok-goldDeep/40 pl-3 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const el = endRef.current
                      if (!el) return
                      try { (el as any).showPicker?.() } catch {}
                      el.focus()
                    }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-7 w-7 rounded-md border border-transparent hover:border-mok-goldDeep/40 text-neutral-300 hover:text-mok-gold bg-transparent"
                    aria-label="Open end date picker"
                    title="Open calendar"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="3" y="5" width="18" height="16" rx="2" ry="2"/>
                      <path d="M16 3v4M8 3v4M3 11h18"/>
                    </svg>
                  </button>
                </div>
              </label>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-mok-goldLight">ရွေးချယ်မည့် ကတ်များ</div>
              <button onClick={doShuffle} className="px-3 py-1 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold">Shuffle</button>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {deck.map((c, idx) => (
                <button key={c.id} type="button" onClick={()=>togglePick(idx)} className={`relative aspect-[3/5] rounded-md overflow-hidden border ${selected.includes(idx) ? 'border-mok-gold ring-2 ring-mok-gold/40' : 'border-mok-goldDeep/30 hover:border-mok-gold/50'}`}>
                  <Image src={CARD_BACK_SRC} alt="card back" fill className="object-cover" />
                </button>
              ))}
            </div>
            <div className="mt-2 text-xs text-neutral-400">Selected: {chosen.map(c=>c.name).join(', ') || '—'}</div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button onClick={generate} disabled={loading || !sign || !start || !end || chosen.length!==3} className="px-3 py-2 rounded-md bg-gold-linear text-black disabled:opacity-60">{loading ? 'Generating…' : 'Generate Answer'}</button>
            <button onClick={save} className="px-3 py-2 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold">{editingId ? 'Update' : 'Save'}</button>
            {editingId && (
              <button onClick={resetForm} type="button" className="px-3 py-2 rounded-md border border-mok-goldDeep/40 hover:border-mok-gold/80 text-neutral-300">New</button>
            )}
          </div>

          {showFaces && chosen.length === 3 && (
            <div className="mt-4">
              <div className="text-sm text-mok-goldLight mb-2">ရွေးချယ်ရသည့် ကတ်များ</div>
              <div className="grid grid-cols-3 gap-2">
                {chosen.map((c, i) => (
                  <div key={`${c.id}-${i}`} className="relative aspect-[3/5] rounded-lg overflow-hidden border border-mok-gold/40">
                    <Image src={cardImagePath(c)} alt={c.name} fill className="object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 grid md:grid-cols-2 gap-3">
            {(['general','relationship','workMoney','health','education','warnings'] as const).map((k) => (
              <label key={k} className="text-sm">
                <div className="text-neutral-400 mb-1">{k}</div>
                <textarea rows={6} value={sections[k]} onChange={e=>setSections((s:any)=>({ ...s, [k]: e.target.value }))} className="w-full rounded-md bg-black/40 border border-mok-goldDeep/40 px-3 py-2" />
              </label>
            ))}
          </div>
          <div className="mt-3 grid sm:grid-cols-2 gap-3 max-w-lg">
            <label className="text-sm">
              <div className="text-neutral-400 mb-1">Fake reactions (display boost)</div>
              <input type="number" min={0} value={fakeReactions} onChange={e=>setFakeReactions(e.target.value===''? '' : Number(e.target.value))} className="h-10 w-full rounded-md bg-black/40 border border-mok-goldDeep/40 px-3" />
            </label>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-mok-goldDeep/30 bg-black/30">
          <div className="gold-gradient font-medium mb-2">Latest</div>
          <div className="space-y-2 max-h-[72vh] overflow-y-auto thin-scroll pr-1">
            {list.map((z) => (
              <div key={z.id} className="p-3 rounded-lg border border-mok-goldDeep/30 hover:border-mok-gold/60">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>{z.sign}</span>
                  <span>{new Date(z.createdAt).toLocaleString()}</span>
                </div>
                <div className="mt-1 text-sm">{new Date(z.startDate).toLocaleDateString()} – {new Date(z.endDate).toLocaleDateString()}</div>
                <div className="mt-1 text-xs text-neutral-400 line-clamp-2">{z.general}</div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-neutral-400">Fake: <span className="text-mok-gold">{z.fakeReactions ?? 0}</span></span>
                  <button onClick={()=>load(z)} className="px-2 py-1 rounded border border-mok-goldDeep/40 hover:border-mok-gold text-xs">Edit</button>
                  <button onClick={()=>openStats(z)} className="px-2 py-1 rounded border border-mok-goldDeep/40 hover:border-mok-gold text-xs">Views</button>
                  <ReactsButton readingId={z.id} />
                </div>
              </div>
            ))}
            {list.length===0 && <div className="text-sm text-neutral-400">No entries</div>}
          </div>
        </div>
      </div>
      {statsFor && (
        <ViewsModal reading={statsFor} stats={stats} onClose={()=>{ setStatsFor(null); setStats(null) }} />
      )}
    </div>
  )
}

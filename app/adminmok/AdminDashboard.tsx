"use client"

import { useMemo, useState } from 'react'

type User = {
  id: string
  email: string
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
  user?: { id: string; email: string; name: string }
}

const CATEGORIES = ['LOVE','MARRIAGE','WORK','LIFESTYLE','SPIRITUAL','EDUCATION','HEALTH','MONEY'] as const

export default function AdminDashboard({ users, readings }: { users: User[]; readings: Reading[] }) {
  const [tab, setTab] = useState<'users'|'readings'>('users')
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
      const okQ = !q || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
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
      const text = `${r.question} ${r.user?.name || ''} ${r.user?.email || ''}`.toLowerCase()
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
        </nav>
      </aside>

      <main>
        {tab === 'users' && (
          <section>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <input value={uQuery} onChange={e=>setUQuery(e.target.value)} placeholder="Search name or email" className="h-9 w-64 max-w-full rounded-md bg-black/40 border border-mok-goldDeep/40 px-3 outline-none" />
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

            <div className="overflow-x-auto border border-mok-goldDeep/30 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-mok-smoke/60">
                  <tr>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Role</th>
                    <th className="p-2 text-left">Created</th>
                    <th className="p-2 text-left">Last active</th>
                    <th className="p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-t border-mok-goldDeep/20 hover:bg-black/30">
                      <td className="p-2">{u.name}</td>
                      <td className="p-2">{u.email}</td>
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
                        <div className="text-sm text-neutral-400">{u.email}</div>
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
              <input value={rQuery} onChange={e=>setRQuery(e.target.value)} placeholder="Search question, name, email" className="h-9 w-80 max-w-full rounded-md bg-black/40 border border-mok-goldDeep/40 px-3 outline-none" />
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
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Category</th>
                    <th className="p-2 text-left">Question</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReadings.map(r => (
                    <tr key={r.id} onClick={()=>setOpenReading(r)} className="border-t border-mok-goldDeep/20 align-top hover:bg-black/30 cursor-pointer">
                      <td className="p-2 whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                      <td className="p-2 whitespace-nowrap">{r.user?.name || '—'}</td>
                      <td className="p-2 whitespace-nowrap">{r.user?.email || '—'}</td>
                      <td className="p-2"><span className="inline-block px-2 py-0.5 rounded border border-mok-goldDeep/40 text-xs">{r.category || '—'}</span></td>
                      <td className="p-2 max-w-[520px]"><div className="line-clamp-3 text-neutral-200">{r.question}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                  <div className="text-sm">{openReading.user?.name || '—'} <span className="text-neutral-400">({openReading.user?.email || '—'})</span></div>
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

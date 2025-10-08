import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminDashboard from './AdminDashboard'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const token = cookies().get('mok_auth')?.value
  const payload = token ? verifyToken(token) : null
  if (!payload || payload.role !== 'ADMIN') redirect('/')

  const [users, readings] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.reading.findMany({ orderBy: { createdAt: 'desc' }, include: { user: true }, take: 500 })
  ])

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="gold-gradient text-2xl font-semibold mb-4">Admin Dashboard</h1>
      <AdminDashboard
        users={users.map(u=>({ ...u, createdAt: u.createdAt.toISOString() }))}
        readings={readings.map(r=>({
          ...r,
          createdAt: r.createdAt.toISOString(),
          user: r.user ? { id: r.user.id, email: r.user.email || '', name: r.user.name, phoneCode: (r.user as any).phoneCode || null, phoneNumber: (r.user as any).phoneNumber || null } : undefined
        }))}
      />
    </div>
  )
}

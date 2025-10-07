import { PrismaClient } from '@prisma/client'

const email = process.argv[2]
if (!email) {
  console.error('Usage: npm run make:admin -- <email>')
  process.exit(1)
}

const prisma = new PrismaClient()
try {
  const user = await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } })
  console.log('Promoted:', user.email)
} catch (e) {
  console.error('Failed:', e.message)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}


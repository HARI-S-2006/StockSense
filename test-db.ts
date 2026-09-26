import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function test() {
  try {
    const user = await prisma.user.findUnique({ where: { email: 'manager@stocksense.com' } })
    console.log('User found:', user ? 'yes' : 'no')
    if (user) console.log('User:', user.email, user.name)
  } catch (e) {
    console.error('Error:', e)
  } finally {
    await prisma.$disconnect()
  }
}

test()
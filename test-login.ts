import { PrismaClient } from '@prisma/client'
import { verifyPassword, createSession, setSessionCookie } from './src/lib/auth'
import { loginSchema } from './src/lib/validations'

const prisma = new PrismaClient()

async function test() {
  try {
    const email = 'manager@stocksense.com'
    const password = 'Manager@123'

    const validation = loginSchema.safeParse({ email, password })
    if (!validation.success) {
      console.log('Validation failed:', validation.error.flatten().fieldErrors)
      return
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      console.log('User not found')
      return
    }

    console.log('User found:', user.email, user.name, user.role)

    const isValid = await verifyPassword(password, user.passwordHash)
    console.log('Password valid:', isValid)

    if (!isValid) {
      console.log('Invalid password')
      return
    }

    const token = await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    console.log('Token created:', token.substring(0, 20) + '...')

    await setSessionCookie(token)
    console.log('Cookie set successfully')

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
      },
    })
    console.log('Audit log created')

    console.log('TEST PASSED!')
  } catch (e) {
    console.error('Error:', e)
  } finally {
    await prisma.$disconnect()
  }
}

test()
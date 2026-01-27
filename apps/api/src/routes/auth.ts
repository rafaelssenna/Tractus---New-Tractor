import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '@tractus/database'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export async function authRoutes(app: FastifyInstance) {
  // Login
  app.post('/login', async (request, reply) => {
    const { email, password } = loginSchema.parse(request.body)

    const user = await db.user.findUnique({
      where: { email },
      include: { vendedor: true },
    })

    if (!user) {
      return reply.status(401).send({ error: 'Credenciais inválidas' })
    }

    // TODO: Implementar hash de senha com bcrypt
    if (user.password !== password) {
      return reply.status(401).send({ error: 'Credenciais inválidas' })
    }

    const token = app.jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        vendedorId: user.vendedor?.id,
      },
      { expiresIn: '7d' }
    )

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        photo: user.photo,
        vendedorId: user.vendedor?.id,
      },
    }
  })

  // Me (usuário atual)
  app.get('/me', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      return reply.status(401).send({ error: 'Token inválido' })
    }

    const { id } = request.user as { id: string }

    const user = await db.user.findUnique({
      where: { id },
      include: { vendedor: true },
    })

    if (!user) {
      return reply.status(404).send({ error: 'Usuário não encontrado' })
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      photo: user.photo,
      vendedorId: user.vendedor?.id,
    }
  })
}

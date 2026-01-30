import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '@tractus/database'

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'DIRETOR', 'COMERCIAL', 'INSPETOR', 'ORCAMENTO', 'FINANCEIRO', 'PCP', 'PRODUCAO', 'QUALIDADE', 'ALMOXARIFADO', 'RH']),
  photo: z.string().optional(),
})

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'DIRETOR', 'COMERCIAL', 'INSPETOR', 'ORCAMENTO', 'FINANCEIRO', 'PCP', 'PRODUCAO', 'QUALIDADE', 'ALMOXARIFADO', 'RH']).optional(),
  photo: z.string().optional(),
  active: z.boolean().optional(),
})

export async function usersRoutes(app: FastifyInstance) {
  // Listar todos os usuários
  app.get('/', async (request) => {
    const { role, active } = request.query as {
      role?: string
      active?: string
    }

    const users = await db.user.findMany({
      where: {
        ...(role && { role: role as any }),
        ...(active !== undefined && { active: active === 'true' }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        photo: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        vendedor: {
          select: {
            id: true,
          }
        }
      },
      orderBy: { name: 'asc' },
    })

    return users.map(user => ({
      ...user,
      vendedorId: user.vendedor?.id || null,
      vendedor: undefined,
    }))
  })

  // Obter usuário por ID
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        photo: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        vendedor: {
          select: {
            id: true,
          }
        }
      },
    })

    if (!user) {
      return reply.status(404).send({ error: 'Usuário não encontrado' })
    }

    return {
      ...user,
      vendedorId: user.vendedor?.id || null,
      vendedor: undefined,
    }
  })

  // Criar usuário
  app.post('/', async (request, reply) => {
    const data = createUserSchema.parse(request.body)

    // Verificar se email já existe
    const existingUser = await db.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return reply.status(400).send({ error: 'Este email já está em uso' })
    }

    // TODO: Implementar hash de senha com bcrypt
    const user = await db.user.create({
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        photo: true,
        active: true,
        createdAt: true,
      },
    })

    return reply.status(201).send(user)
  })

  // Atualizar usuário
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = updateUserSchema.parse(request.body)

    // Verificar se usuário existe
    const existingUser = await db.user.findUnique({ where: { id } })
    if (!existingUser) {
      return reply.status(404).send({ error: 'Usuário não encontrado' })
    }

    // Verificar se email já está em uso por outro usuário
    if (data.email && data.email !== existingUser.email) {
      const emailInUse = await db.user.findUnique({
        where: { email: data.email },
      })
      if (emailInUse) {
        return reply.status(400).send({ error: 'Este email já está em uso' })
      }
    }

    // TODO: Implementar hash de senha com bcrypt
    const user = await db.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        photo: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return user
  })

  // Deletar usuário
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    // Verificar se usuário existe
    const user = await db.user.findUnique({ where: { id } })
    if (!user) {
      return reply.status(404).send({ error: 'Usuário não encontrado' })
    }

    await db.user.delete({ where: { id } })

    return reply.status(204).send()
  })

  // Transformar usuário em vendedor
  app.post('/:id/vendedor', async (request, reply) => {
    const { id } = request.params as { id: string }

    // Verificar se usuário existe
    const user = await db.user.findUnique({
      where: { id },
      include: { vendedor: true },
    })

    if (!user) {
      return reply.status(404).send({ error: 'Usuário não encontrado' })
    }

    if (user.vendedor) {
      return reply.status(400).send({ error: 'Usuário já é um vendedor' })
    }

    // Criar vendedor vinculado ao usuário
    const vendedor = await db.vendedor.create({
      data: {
        userId: id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    return reply.status(201).send(vendedor)
  })

  // Remover vendedor do usuário
  app.delete('/:id/vendedor', async (request, reply) => {
    const { id } = request.params as { id: string }

    // Verificar se usuário existe
    const user = await db.user.findUnique({
      where: { id },
      include: { vendedor: true },
    })

    if (!user) {
      return reply.status(404).send({ error: 'Usuário não encontrado' })
    }

    if (!user.vendedor) {
      return reply.status(400).send({ error: 'Usuário não é um vendedor' })
    }

    await db.vendedor.delete({ where: { id: user.vendedor.id } })

    return reply.status(204).send()
  })
}

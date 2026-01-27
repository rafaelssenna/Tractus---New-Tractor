import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '@tractus/database'

const clienteSchema = z.object({
  nome: z.string().min(2),
  razaoSocial: z.string().optional(),
  cnpj: z.string().optional(),
  inscricaoEstadual: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email().optional(),
  contatoPrincipal: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  vendedorId: z.string().optional(),
})

export async function clientesRoutes(app: FastifyInstance) {
  // Listar todos os clientes
  app.get('/', async (request) => {
    const clientes = await db.cliente.findMany({
      where: { active: true },
      include: {
        vendedor: {
          include: { user: { select: { name: true } } },
        },
        _count: {
          select: { ordensServico: { where: { status: 'ABERTA' } } },
        },
      },
      orderBy: { nome: 'asc' },
    })

    return clientes.map((cliente) => ({
      ...cliente,
      osAbertas: cliente._count.ordensServico,
    }))
  })

  // Buscar cliente por ID
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const cliente = await db.cliente.findUnique({
      where: { id },
      include: {
        vendedor: { include: { user: true } },
        equipamentos: true,
        ordensServico: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    })

    if (!cliente) {
      return reply.status(404).send({ error: 'Cliente não encontrado' })
    }

    return cliente
  })

  // Criar cliente
  app.post('/', async (request, reply) => {
    const data = clienteSchema.parse(request.body)

    const cliente = await db.cliente.create({
      data,
    })

    return reply.status(201).send(cliente)
  })

  // Atualizar cliente
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = clienteSchema.partial().parse(request.body)

    const cliente = await db.cliente.update({
      where: { id },
      data,
    })

    return cliente
  })

  // Deletar cliente (soft delete)
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    await db.cliente.update({
      where: { id },
      data: { active: false },
    })

    return reply.status(204).send()
  })
}

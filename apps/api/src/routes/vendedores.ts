import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '@tractus/database'

const createVendedorSchema = z.object({
  userId: z.string(),
})

const pixSchema = z.object({
  chavePix: z.string().min(1, 'Chave PIX é obrigatória'),
  tipoChavePix: z.enum(['CPF', 'CNPJ', 'EMAIL', 'TELEFONE', 'ALEATORIA']),
})

export async function vendedoresRoutes(app: FastifyInstance) {
  // Listar todos os vendedores
  app.get('/', async () => {
    const vendedores = await db.vendedor.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, photo: true, role: true },
        },
        _count: {
          select: { clientes: true, propostas: true },
        },
      },
    })

    return vendedores
  })

  // Buscar vendedor por ID
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const vendedor = await db.vendedor.findUnique({
      where: { id },
      include: {
        user: true,
        clientes: { where: { active: true } },
        rotas: { include: { rotaClientes: { include: { cliente: true } } } },
        metas: { where: { ano: new Date().getFullYear() } },
      },
    })

    if (!vendedor) {
      return reply.status(404).send({ error: 'Vendedor não encontrado' })
    }

    return vendedor
  })

  // Listar usuários que podem ser vendedores (não são vendedores ainda)
  app.get('/usuarios-disponiveis', async () => {
    const usuarios = await db.user.findMany({
      where: {
        active: true,
        vendedor: null, // Não tem perfil de vendedor
      },
      select: { id: true, name: true, email: true, role: true },
    })

    return usuarios
  })

  // Criar vendedor a partir de um usuário
  app.post('/', async (request, reply) => {
    const { userId } = createVendedorSchema.parse(request.body)

    // Verificar se o usuário existe
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return reply.status(404).send({ error: 'Usuário não encontrado' })
    }

    // Verificar se já é vendedor
    const existingVendedor = await db.vendedor.findUnique({ where: { userId } })
    if (existingVendedor) {
      return reply.status(400).send({ error: 'Usuário já é um vendedor' })
    }

    const vendedor = await db.vendedor.create({
      data: { userId },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    return reply.status(201).send(vendedor)
  })

  // Remover vendedor
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    await db.vendedor.delete({ where: { id } })

    return reply.status(204).send()
  })

  // Buscar dados PIX do vendedor
  app.get('/:id/pix', async (request, reply) => {
    const { id } = request.params as { id: string }

    const vendedor = await db.vendedor.findUnique({
      where: { id },
      select: { chavePix: true, tipoChavePix: true },
    })

    if (!vendedor) {
      return reply.status(404).send({ error: 'Vendedor não encontrado' })
    }

    return vendedor
  })

  // Atualizar dados PIX do vendedor
  app.put('/:id/pix', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { chavePix, tipoChavePix } = pixSchema.parse(request.body)

    const vendedor = await db.vendedor.update({
      where: { id },
      data: { chavePix, tipoChavePix },
      select: { chavePix: true, tipoChavePix: true },
    })

    return vendedor
  })

  // Dashboard do vendedor (metas e indicadores)
  app.get('/:id/dashboard', async (request, reply) => {
    const { id } = request.params as { id: string }
    const now = new Date()
    const mes = now.getMonth() + 1
    const ano = now.getFullYear()

    const [metas, vendas, propostas] = await Promise.all([
      db.meta.findMany({
        where: { vendedorId: id, mes, ano },
      }),
      db.venda.aggregate({
        where: {
          vendedorId: id,
          data: {
            gte: new Date(ano, mes - 1, 1),
            lt: new Date(ano, mes, 1),
          },
        },
        _sum: { valor: true },
      }),
      db.proposta.groupBy({
        by: ['status'],
        where: { vendedorId: id },
        _count: true,
      }),
    ])

    return {
      metas,
      vendidoMes: vendas._sum.valor || 0,
      propostas,
    }
  })
}

import type { FastifyInstance } from 'fastify'
import { db } from '@tractus/database'

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

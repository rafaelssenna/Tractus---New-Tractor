import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '@tractus/database'

const despesaSchema = z.object({
  vendedorId: z.string(),
  data: z.string().transform((v) => new Date(v)),
  tipo: z.enum(['COMBUSTIVEL', 'TROCA_OLEO', 'REVISAO', 'PNEU_NIVEL', 'PNEU_TROCA', 'OUTROS']),
  descricao: z.string().optional(),
  valor: z.number(),
  kmVeiculo: z.number().optional(),
  comprovante: z.string().optional(),
})

export async function despesasRoutes(app: FastifyInstance) {
  // Listar despesas
  app.get('/', async (request) => {
    const { vendedorId, mes, ano, tipo } = request.query as {
      vendedorId?: string
      mes?: string
      ano?: string
      tipo?: string
    }

    let dataFilter = {}
    if (mes && ano) {
      const mesInt = parseInt(mes)
      const anoInt = parseInt(ano)
      dataFilter = {
        data: {
          gte: new Date(anoInt, mesInt - 1, 1),
          lt: new Date(anoInt, mesInt, 1),
        },
      }
    }

    const despesas = await db.despesa.findMany({
      where: {
        ...(vendedorId && { vendedorId }),
        ...(tipo && { tipo: tipo as any }),
        ...dataFilter,
      },
      include: {
        vendedor: { include: { user: { select: { name: true } } } },
      },
      orderBy: { data: 'desc' },
    })

    return despesas
  })

  // Resumo de despesas por vendedor
  app.get('/resumo', async (request) => {
    const { mes, ano } = request.query as { mes?: string; ano?: string }

    const mesAtual = mes ? parseInt(mes) : new Date().getMonth() + 1
    const anoAtual = ano ? parseInt(ano) : new Date().getFullYear()

    const vendedores = await db.vendedor.findMany({
      include: {
        user: { select: { name: true } },
        despesas: {
          where: {
            data: {
              gte: new Date(anoAtual, mesAtual - 1, 1),
              lt: new Date(anoAtual, mesAtual, 1),
            },
          },
        },
      },
    })

    const resultado = vendedores.map((vendedor) => {
      const totalDespesas = vendedor.despesas.reduce((acc, d) => acc + Number(d.valor), 0)

      // Último km registrado
      const ultimoKm = vendedor.despesas
        .filter((d) => d.kmVeiculo)
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0]?.kmVeiculo

      // Primeiro km do mês
      const primeiroKm = vendedor.despesas
        .filter((d) => d.kmVeiculo)
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())[0]?.kmVeiculo

      const kmRodado = ultimoKm && primeiroKm ? ultimoKm - primeiroKm : 0
      const custoPorKm = kmRodado > 0 ? totalDespesas / kmRodado : 0

      // Por tipo
      const porTipo = ['COMBUSTIVEL', 'TROCA_OLEO', 'REVISAO', 'PNEU_NIVEL', 'PNEU_TROCA', 'OUTROS'].map(
        (tipo) => ({
          tipo,
          total: vendedor.despesas
            .filter((d) => d.tipo === tipo)
            .reduce((acc, d) => acc + Number(d.valor), 0),
        })
      )

      return {
        vendedor: {
          id: vendedor.id,
          name: vendedor.user.name,
        },
        totalDespesas,
        kmRodado,
        custoPorKm,
        porTipo,
      }
    })

    return {
      mes: mesAtual,
      ano: anoAtual,
      vendedores: resultado,
    }
  })

  // Criar despesa
  app.post('/', async (request, reply) => {
    const data = despesaSchema.parse(request.body)

    const despesa = await db.despesa.create({
      data,
    })

    return reply.status(201).send(despesa)
  })

  // Atualizar despesa
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = despesaSchema.partial().parse(request.body)

    const despesa = await db.despesa.update({
      where: { id },
      data,
    })

    return despesa
  })

  // Deletar despesa
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    await db.despesa.delete({ where: { id } })

    return reply.status(204).send()
  })
}

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '@tractus/database'

const metaSchema = z.object({
  vendedorId: z.string(),
  mes: z.number().min(1).max(12),
  ano: z.number(),
  categoria: z.enum(['RODANTE', 'PECA', 'CILINDRO']),
  valorMeta: z.number(),
})

export async function metasRoutes(app: FastifyInstance) {
  // Dashboard de metas geral
  app.get('/dashboard', async (request) => {
    const { mes, ano } = request.query as { mes?: string; ano?: string }

    const mesAtual = mes ? parseInt(mes) : new Date().getMonth() + 1
    const anoAtual = ano ? parseInt(ano) : new Date().getFullYear()

    // Metas por vendedor
    const vendedores = await db.vendedor.findMany({
      include: {
        user: { select: { name: true, photo: true } },
        metas: {
          where: { mes: mesAtual, ano: anoAtual },
        },
        vendas: {
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
      const metaTotal = vendedor.metas.reduce((acc, m) => acc + Number(m.valorMeta), 0)
      const vendidoTotal = vendedor.vendas.reduce((acc, v) => acc + Number(v.valor), 0)

      // Por categoria
      const porCategoria = ['RODANTE', 'PECA', 'CILINDRO'].map((cat) => {
        const meta = vendedor.metas.find((m) => m.categoria === cat)
        const vendido = vendedor.vendas
          .filter((v) => v.categoria === cat)
          .reduce((acc, v) => acc + Number(v.valor), 0)

        return {
          categoria: cat,
          meta: meta ? Number(meta.valorMeta) : 0,
          realizado: vendido,
          percentual: meta ? (vendido / Number(meta.valorMeta)) * 100 : 0,
        }
      })

      // Por semana
      const porSemana = [1, 2, 3, 4].map((semana) => {
        const vendasSemana = vendedor.vendas
          .filter((v) => v.semana === semana)
          .reduce((acc, v) => acc + Number(v.valor), 0)

        return {
          semana,
          realizado: vendasSemana,
        }
      })

      return {
        vendedor: {
          id: vendedor.id,
          name: vendedor.user.name,
          photo: vendedor.user.photo,
        },
        metaTotal,
        vendidoTotal,
        percentualTotal: metaTotal > 0 ? (vendidoTotal / metaTotal) * 100 : 0,
        porCategoria,
        porSemana,
      }
    })

    return {
      mes: mesAtual,
      ano: anoAtual,
      vendedores: resultado,
    }
  })

  // Listar metas
  app.get('/', async (request) => {
    const { vendedorId, mes, ano } = request.query as {
      vendedorId?: string
      mes?: string
      ano?: string
    }

    const metas = await db.meta.findMany({
      where: {
        ...(vendedorId && { vendedorId }),
        ...(mes && { mes: parseInt(mes) }),
        ...(ano && { ano: parseInt(ano) }),
      },
      include: {
        vendedor: { include: { user: { select: { name: true } } } },
      },
    })

    return metas
  })

  // Criar/atualizar meta
  app.post('/', async (request, reply) => {
    const data = metaSchema.parse(request.body)

    const meta = await db.meta.upsert({
      where: {
        vendedorId_mes_ano_categoria: {
          vendedorId: data.vendedorId,
          mes: data.mes,
          ano: data.ano,
          categoria: data.categoria,
        },
      },
      update: { valorMeta: data.valorMeta },
      create: data,
    })

    return reply.status(201).send(meta)
  })
}

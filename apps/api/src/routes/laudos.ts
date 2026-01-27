import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '@tractus/database'

const laudoSchema = z.object({
  equipamentoId: z.string(),
  clienteId: z.string(),
  vendedorId: z.string(),
  visitaId: z.string().optional(),
  data: z.string().transform((v) => new Date(v)),
  inspetor: z.string(),
  local: z.string().optional(),
  condicaoSolo: z.enum(['BAIXO_IMPACTO', 'MEDIO_IMPACTO', 'ALTO_IMPACTO']),
  medicoes: z.any(), // JSON com medições detalhadas
  sumario: z.string().optional(),
})

export async function laudosRoutes(app: FastifyInstance) {
  // Listar laudos
  app.get('/', async (request) => {
    const { status, clienteId, vendedorId } = request.query as {
      status?: string
      clienteId?: string
      vendedorId?: string
    }

    const laudos = await db.laudo.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(clienteId && { clienteId }),
        ...(vendedorId && { vendedorId }),
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        equipamento: { select: { id: true, modelo: true, serie: true, frota: true } },
        vendedor: { include: { user: { select: { name: true } } } },
        _count: { select: { fotos: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return laudos
  })

  // Buscar laudo por ID
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const laudo = await db.laudo.findUnique({
      where: { id },
      include: {
        cliente: true,
        equipamento: true,
        vendedor: { include: { user: true } },
        visita: true,
        fotos: true,
        proposta: true,
      },
    })

    if (!laudo) {
      return reply.status(404).send({ error: 'Laudo não encontrado' })
    }

    return laudo
  })

  // Criar laudo
  app.post('/', async (request, reply) => {
    const data = laudoSchema.parse(request.body)

    // Gerar número do laudo
    const count = await db.laudo.count()
    const numero = `LAU-${String(count + 1).padStart(6, '0')}`

    const laudo = await db.laudo.create({
      data: {
        ...data,
        numero,
        status: 'EM_ELABORACAO',
      },
    })

    return reply.status(201).send(laudo)
  })

  // Atualizar laudo
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = laudoSchema.partial().parse(request.body)

    const laudo = await db.laudo.update({
      where: { id },
      data,
    })

    return laudo
  })

  // Finalizar laudo
  app.post('/:id/finalizar', async (request, reply) => {
    const { id } = request.params as { id: string }

    const laudo = await db.laudo.update({
      where: { id },
      data: { status: 'FINALIZADO' },
    })

    return laudo
  })

  // Gerar proposta a partir do laudo
  app.post('/:id/gerar-proposta', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { valor, categoria } = request.body as { valor: number; categoria?: string }

    const laudo = await db.laudo.findUnique({
      where: { id },
      include: { cliente: true, vendedor: true },
    })

    if (!laudo) {
      return reply.status(404).send({ error: 'Laudo não encontrado' })
    }

    if (laudo.status !== 'FINALIZADO') {
      return reply.status(400).send({ error: 'Laudo precisa estar finalizado' })
    }

    // Gerar número da proposta
    const count = await db.proposta.count()
    const numero = `PROP-${String(count + 1).padStart(6, '0')}`

    const proposta = await db.proposta.create({
      data: {
        numero,
        laudoId: id,
        clienteId: laudo.clienteId,
        vendedorId: laudo.vendedorId,
        valor,
        categoria: (category as any) || 'RODANTE',
        status: 'EM_ABERTO',
      },
    })

    // Atualizar status do laudo
    await db.laudo.update({
      where: { id },
      data: { status: 'CONVERTIDO_PROPOSTA' },
    })

    return reply.status(201).send(proposta)
  })
}

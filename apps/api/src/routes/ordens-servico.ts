import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '@tractus/database'

const ordemServicoSchema = z.object({
  propostaId: z.string().optional(),
  clienteId: z.string(),
  valorTotal: z.number(),
  dataPrevisao: z.string().transform((v) => new Date(v)).optional(),
})

export async function ordensServicoRoutes(app: FastifyInstance) {
  // Listar ordens de serviço
  app.get('/', async (request) => {
    const { status, clienteId } = request.query as {
      status?: string
      clienteId?: string
    }

    const ordens = await db.ordemServico.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(clienteId && { clienteId }),
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        proposta: {
          include: {
            vendedor: { include: { user: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return ordens
  })

  // Buscar OS por ID
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const ordem = await db.ordemServico.findUnique({
      where: { id },
      include: {
        cliente: true,
        proposta: {
          include: {
            vendedor: { include: { user: true } },
            itens: true,
          },
        },
        vendas: true,
      },
    })

    if (!ordem) {
      return reply.status(404).send({ error: 'Ordem de serviço não encontrada' })
    }

    return ordem
  })

  // Criar OS
  app.post('/', async (request, reply) => {
    const data = ordemServicoSchema.parse(request.body)

    // Gerar número
    const count = await db.ordemServico.count()
    const numero = `OS-${String(count + 1).padStart(6, '0')}`

    const ordem = await db.ordemServico.create({
      data: {
        ...data,
        numero,
        status: 'ABERTA',
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        proposta: true,
      },
    })

    return reply.status(201).send(ordem)
  })

  // Criar OS a partir de proposta aprovada
  app.post('/from-proposta/:propostaId', async (request, reply) => {
    const { propostaId } = request.params as { propostaId: string }

    const proposta = await db.proposta.findUnique({
      where: { id: propostaId },
      include: { ordemServico: true },
    })

    if (!proposta) {
      return reply.status(404).send({ error: 'Proposta não encontrada' })
    }

    if (proposta.status !== 'APROVADA') {
      return reply.status(400).send({ error: 'Proposta precisa estar aprovada' })
    }

    if (proposta.ordemServico) {
      return reply.status(400).send({ error: 'Proposta já possui OS vinculada' })
    }

    // Gerar número
    const count = await db.ordemServico.count()
    const numero = `OS-${String(count + 1).padStart(6, '0')}`

    const ordem = await db.ordemServico.create({
      data: {
        numero,
        propostaId,
        clienteId: proposta.clienteId,
        valorTotal: proposta.valor,
        status: 'ABERTA',
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        proposta: {
          include: {
            vendedor: { include: { user: { select: { name: true } } } },
          },
        },
      },
    })

    return reply.status(201).send(ordem)
  })

  // Atualizar status da OS
  app.patch('/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { status } = request.body as { status: string }

    const ordemAtual = await db.ordemServico.findUnique({
      where: { id },
      include: {
        proposta: true,
        vendas: true,
      },
    })

    if (!ordemAtual) {
      return reply.status(404).send({ error: 'Ordem de serviço não encontrada' })
    }

    // Atualizar status
    const updateData: any = {
      status: status as any,
    }

    // Se FINALIZADA ou FATURADA, registrar data de fechamento
    if (status === 'FINALIZADA' || status === 'FATURADA') {
      updateData.dataFechamento = new Date()
    }

    const ordem = await db.ordemServico.update({
      where: { id },
      data: updateData,
      include: {
        cliente: { select: { id: true, nome: true } },
        proposta: {
          include: {
            vendedor: { include: { user: { select: { name: true } } } },
          },
        },
      },
    })

    // Se mudou para FATURADA e ainda não tem venda registrada, criar venda automaticamente
    if (status === 'FATURADA' && ordemAtual.vendas.length === 0) {
      const proposta = ordemAtual.proposta

      if (proposta) {
        // Calcular semana do mês
        const hoje = new Date()
        const semana = Math.ceil(hoje.getDate() / 7)

        // Criar venda automaticamente
        await db.venda.create({
          data: {
            vendedorId: proposta.vendedorId,
            ordemServicoId: id,
            data: hoje,
            valor: ordem.valorTotal,
            categoria: proposta.categoria as any,
            semana: Math.min(semana, 4), // Máximo 4 semanas
          },
        })
      }
    }

    return ordem
  })

  // Atualizar OS
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = ordemServicoSchema.partial().parse(request.body)

    const ordem = await db.ordemServico.update({
      where: { id },
      data,
      include: {
        cliente: { select: { id: true, nome: true } },
        proposta: true,
      },
    })

    return ordem
  })
}

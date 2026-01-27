import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '@tractus/database'

const propostaSchema = z.object({
  clienteId: z.string(),
  vendedorId: z.string(),
  valor: z.number(),
  custoEstimado: z.number().optional(),
  categoria: z.enum(['RODANTE', 'PECA', 'CILINDRO']).default('RODANTE'),
  dataValidade: z.string().transform((v) => new Date(v)).optional(),
})

export async function propostasRoutes(app: FastifyInstance) {
  // Listar propostas
  app.get('/', async (request) => {
    const { status, clienteId, vendedorId } = request.query as {
      status?: string
      clienteId?: string
      vendedorId?: string
    }

    const propostas = await db.proposta.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(clienteId && { clienteId }),
        ...(vendedorId && { vendedorId }),
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        vendedor: { include: { user: { select: { name: true } } } },
        laudo: { select: { id: true, numero: true } },
        liberacaoCusto: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return propostas
  })

  // Buscar proposta por ID
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const proposta = await db.proposta.findUnique({
      where: { id },
      include: {
        cliente: true,
        vendedor: { include: { user: true } },
        laudo: { include: { equipamento: true } },
        itens: true,
        liberacaoCusto: true,
        ordemServico: true,
      },
    })

    if (!proposta) {
      return reply.status(404).send({ error: 'Proposta não encontrada' })
    }

    return proposta
  })

  // Criar proposta
  app.post('/', async (request, reply) => {
    const data = propostaSchema.parse(request.body)

    // Gerar número
    const count = await db.proposta.count()
    const numero = `PROP-${String(count + 1).padStart(6, '0')}`

    // Calcular margem se custo informado
    let margem
    if (data.custoEstimado && data.valor > 0) {
      margem = ((data.valor - data.custoEstimado) / data.valor) * 100
    }

    const proposta = await db.proposta.create({
      data: {
        ...data,
        numero,
        margem,
        status: 'EM_ABERTO',
      },
    })

    return reply.status(201).send(proposta)
  })

  // Atualizar status
  app.patch('/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { status, motivoCancelamento } = request.body as {
      status: string
      motivoCancelamento?: string
    }

    const proposta = await db.proposta.update({
      where: { id },
      data: {
        status: status as any,
        ...(motivoCancelamento && { motivoCancelamento }),
      },
    })

    return proposta
  })

  // Solicitar liberação de custo
  app.post('/:id/liberar-custo', async (request, reply) => {
    const { id } = request.params as { id: string }

    const proposta = await db.proposta.findUnique({ where: { id } })

    if (!proposta) {
      return reply.status(404).send({ error: 'Proposta não encontrada' })
    }

    const liberacao = await db.liberacaoCusto.create({
      data: {
        propostaId: id,
        status: 'EM_ANALISE',
      },
    })

    await db.proposta.update({
      where: { id },
      data: { status: 'AGUARDANDO_APROVACAO' },
    })

    return reply.status(201).send(liberacao)
  })

  // Aprovar/reprovar custo
  app.patch('/:id/liberar-custo', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { status, custoReal, observacoes, aprovadoPor } = request.body as {
      status: 'APROVADO' | 'REPROVADO' | 'AGUARDANDO_AJUSTE'
      custoReal?: number
      observacoes?: string
      aprovadoPor: string
    }

    const proposta = await db.proposta.findUnique({
      where: { id },
      include: { liberacaoCusto: true },
    })

    if (!proposta?.liberacaoCusto) {
      return reply.status(404).send({ error: 'Liberação não encontrada' })
    }

    const liberacao = await db.liberacaoCusto.update({
      where: { id: proposta.liberacaoCusto.id },
      data: {
        status,
        custoReal,
        observacoes,
        aprovadoPor,
        dataAprovacao: status === 'APROVADO' ? new Date() : null,
      },
    })

    // Atualizar status da proposta
    if (status === 'APROVADO') {
      await db.proposta.update({
        where: { id },
        data: { status: 'APROVADA' },
      })
    }

    return liberacao
  })
}

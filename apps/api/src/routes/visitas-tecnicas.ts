import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '@tractus/database'

const visitaTecnicaSchema = z.object({
  vendedorId: z.string(),
  clienteId: z.string(),
  dataVisita: z.string().transform((v) => new Date(v)).optional(),
  equipamentos: z.array(z.string()).min(1, 'Informe pelo menos um equipamento'),
  observacao: z.string().nullable().optional(),
})

const cancelarSchema = z.object({
  motivo: z.string().optional(),
})

export async function visitasTecnicasRoutes(app: FastifyInstance) {
  // Listar visitas técnicas com filtros
  app.get('/', async (request) => {
    const { vendedorId, clienteId, data, dataInicio, dataFim, status, limit, offset } = request.query as {
      vendedorId?: string
      clienteId?: string
      data?: string
      dataInicio?: string
      dataFim?: string
      status?: 'PENDENTE' | 'CONFIRMADA' | 'REALIZADA' | 'CANCELADA'
      limit?: string
      offset?: string
    }

    // Filtro de data
    let dataFilter = {}
    if (data) {
      dataFilter = { dataVisita: new Date(data) }
    } else if (dataInicio || dataFim) {
      dataFilter = {
        dataVisita: {
          ...(dataInicio && { gte: new Date(dataInicio) }),
          ...(dataFim && { lte: new Date(dataFim) }),
        },
      }
    }

    const visitasTecnicas = await db.visitaTecnica.findMany({
      where: {
        ...(vendedorId && { vendedorId }),
        ...(clienteId && { clienteId }),
        ...(status && { status }),
        ...dataFilter,
      },
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
            cidade: true,
            endereco: true,
            telefone: true,
          }
        },
        vendedor: {
          include: {
            user: { select: { id: true, name: true, photo: true } }
          }
        },
      },
      orderBy: { dataVisita: 'asc' },
      ...(limit && { take: parseInt(limit) }),
      ...(offset && { skip: parseInt(offset) }),
    })

    return visitasTecnicas
  })

  // Solicitações pendentes (sem data definida) - ordenadas por ordem de chegada
  app.get('/solicitacoes', async (request) => {
    const visitasTecnicas = await db.visitaTecnica.findMany({
      where: {
        dataVisita: null,
        status: { in: ['PENDENTE', 'CONFIRMADA'] },
      },
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
            cidade: true,
            endereco: true,
            telefone: true,
            estado: true,
          }
        },
        vendedor: {
          include: {
            user: { select: { id: true, name: true, photo: true } }
          }
        },
      },
      orderBy: { createdAt: 'asc' }, // Ordem de chegada
    })

    return {
      solicitacoes: visitasTecnicas,
      total: visitasTecnicas.length,
    }
  })

  // Listar inspetores (usuários com role INSPETOR)
  app.get('/inspetores', async () => {
    const inspetores = await db.user.findMany({
      where: {
        role: 'INSPETOR',
        active: true,
      },
      select: {
        id: true,
        name: true,
        photo: true,
      },
      orderBy: { name: 'asc' },
    })

    return inspetores
  })

  // Agendar visita técnica (admin define a data e o inspetor)
  app.post('/:id/agendar', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { dataVisita, inspetorId } = request.body as { dataVisita: string; inspetorId: string }

    if (!dataVisita) {
      return reply.status(400).send({ error: 'Data da visita é obrigatória' })
    }

    if (!inspetorId) {
      return reply.status(400).send({ error: 'Inspetor é obrigatório' })
    }

    const visitaExistente = await db.visitaTecnica.findUnique({ where: { id } })
    if (!visitaExistente) {
      return reply.status(404).send({ error: 'Visita técnica não encontrada' })
    }

    if (visitaExistente.status === 'REALIZADA' || visitaExistente.status === 'CANCELADA') {
      return reply.status(400).send({ error: 'Não é possível agendar uma visita já realizada ou cancelada' })
    }

    // Verificar se o inspetor existe e tem role INSPETOR
    const inspetor = await db.user.findUnique({ where: { id: inspetorId } })
    if (!inspetor || inspetor.role !== 'INSPETOR') {
      return reply.status(400).send({ error: 'Inspetor inválido' })
    }

    const visitaTecnica = await db.visitaTecnica.update({
      where: { id },
      data: {
        dataVisita: new Date(dataVisita),
        inspetorId,
        status: 'CONFIRMADA', // Quando admin agenda, já confirma
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        vendedor: { include: { user: { select: { name: true } } } },
        inspetor: { select: { id: true, name: true } },
      },
    })

    return visitaTecnica
  })

  // Agenda do técnico (visitas por data)
  app.get('/agenda', async (request) => {
    const { data, dataInicio, dataFim } = request.query as {
      data?: string
      dataInicio?: string
      dataFim?: string
    }

    // Filtro de data
    let dataFilter = {}
    if (data) {
      dataFilter = { dataVisita: new Date(data) }
    } else if (dataInicio || dataFim) {
      dataFilter = {
        dataVisita: {
          ...(dataInicio && { gte: new Date(dataInicio) }),
          ...(dataFim && { lte: new Date(dataFim) }),
        },
      }
    } else {
      // Se não informar data, busca da data atual em diante
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      dataFilter = { dataVisita: { gte: hoje } }
    }

    const visitasTecnicas = await db.visitaTecnica.findMany({
      where: {
        ...dataFilter,
        dataVisita: { not: null }, // Somente visitas com data definida
        status: { in: ['PENDENTE', 'CONFIRMADA'] },
      },
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
            cidade: true,
            endereco: true,
            telefone: true,
            estado: true,
          }
        },
        vendedor: {
          include: {
            user: { select: { id: true, name: true, photo: true } }
          }
        },
        inspetor: {
          select: { id: true, name: true, photo: true }
        },
      },
      orderBy: { dataVisita: 'asc' },
    })

    // Agrupar por data
    const agenda = visitasTecnicas.reduce((acc, vt) => {
      const dataKey = vt.dataVisita!.toISOString().split('T')[0] as string
      if (!acc[dataKey]) {
        acc[dataKey] = []
      }
      acc[dataKey]!.push(vt)
      return acc
    }, {} as Record<string, typeof visitasTecnicas>)

    // Converter para array ordenado
    const agendaArray = Object.entries(agenda)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, visitas]) => ({
        data,
        diaSemana: new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' }),
        totalVisitas: visitas.length,
        pendentes: visitas.filter(v => v.status === 'PENDENTE').length,
        confirmadas: visitas.filter(v => v.status === 'CONFIRMADA').length,
        visitas,
      }))

    return {
      agenda: agendaArray,
      totais: {
        dias: agendaArray.length,
        visitas: visitasTecnicas.length,
        pendentes: visitasTecnicas.filter(v => v.status === 'PENDENTE').length,
        confirmadas: visitasTecnicas.filter(v => v.status === 'CONFIRMADA').length,
      },
    }
  })

  // Obter visita técnica por ID
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const visitaTecnica = await db.visitaTecnica.findUnique({
      where: { id },
      include: {
        cliente: true,
        vendedor: {
          include: {
            user: { select: { id: true, name: true, email: true, photo: true } }
          }
        },
      },
    })

    if (!visitaTecnica) {
      return reply.status(404).send({ error: 'Visita técnica não encontrada' })
    }

    return visitaTecnica
  })

  // Criar visita técnica (solicitação pela vendedora)
  app.post('/', async (request, reply) => {
    const data = visitaTecnicaSchema.parse(request.body)

    // Verificar se cliente existe
    const cliente = await db.cliente.findUnique({ where: { id: data.clienteId } })
    if (!cliente) {
      return reply.status(400).send({ error: 'Cliente não encontrado' })
    }

    // Verificar se vendedor existe
    const vendedor = await db.vendedor.findUnique({ where: { id: data.vendedorId } })
    if (!vendedor) {
      return reply.status(400).send({ error: 'Vendedor não encontrado' })
    }

    const visitaTecnica = await db.visitaTecnica.create({
      data: {
        vendedorId: data.vendedorId,
        clienteId: data.clienteId,
        dataVisita: data.dataVisita,
        equipamentos: data.equipamentos,
        observacao: data.observacao,
        status: 'PENDENTE',
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        vendedor: { include: { user: { select: { name: true } } } },
      },
    })

    return reply.status(201).send(visitaTecnica)
  })

  // Atualizar visita técnica
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = visitaTecnicaSchema.partial().parse(request.body)

    // Verificar se existe e não foi realizada/cancelada
    const visitaExistente = await db.visitaTecnica.findUnique({ where: { id } })
    if (!visitaExistente) {
      return reply.status(404).send({ error: 'Visita técnica não encontrada' })
    }

    if (visitaExistente.status === 'REALIZADA' || visitaExistente.status === 'CANCELADA') {
      return reply.status(400).send({ error: 'Não é possível editar uma visita já realizada ou cancelada' })
    }

    const visitaTecnica = await db.visitaTecnica.update({
      where: { id },
      data,
      include: {
        cliente: { select: { id: true, nome: true } },
        vendedor: { include: { user: { select: { name: true } } } },
      },
    })

    return visitaTecnica
  })

  // Confirmar visita técnica (técnico)
  app.post('/:id/confirmar', async (request, reply) => {
    const { id } = request.params as { id: string }

    const visitaExistente = await db.visitaTecnica.findUnique({ where: { id } })
    if (!visitaExistente) {
      return reply.status(404).send({ error: 'Visita técnica não encontrada' })
    }

    if (visitaExistente.status !== 'PENDENTE') {
      return reply.status(400).send({ error: 'Apenas visitas pendentes podem ser confirmadas' })
    }

    const visitaTecnica = await db.visitaTecnica.update({
      where: { id },
      data: { status: 'CONFIRMADA' },
      include: {
        cliente: { select: { id: true, nome: true } },
        vendedor: { include: { user: { select: { name: true } } } },
      },
    })

    return visitaTecnica
  })

  // Marcar visita técnica como realizada (técnico)
  app.post('/:id/realizar', async (request, reply) => {
    const { id } = request.params as { id: string }

    const visitaExistente = await db.visitaTecnica.findUnique({ where: { id } })
    if (!visitaExistente) {
      return reply.status(404).send({ error: 'Visita técnica não encontrada' })
    }

    if (visitaExistente.status === 'REALIZADA') {
      return reply.status(400).send({ error: 'Visita já foi marcada como realizada' })
    }

    if (visitaExistente.status === 'CANCELADA') {
      return reply.status(400).send({ error: 'Não é possível realizar uma visita cancelada' })
    }

    const visitaTecnica = await db.visitaTecnica.update({
      where: { id },
      data: { status: 'REALIZADA' },
      include: {
        cliente: { select: { id: true, nome: true } },
        vendedor: { include: { user: { select: { name: true } } } },
      },
    })

    return visitaTecnica
  })

  // Cancelar visita técnica
  app.post('/:id/cancelar', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { motivo } = cancelarSchema.parse(request.body || {})

    const visitaExistente = await db.visitaTecnica.findUnique({ where: { id } })
    if (!visitaExistente) {
      return reply.status(404).send({ error: 'Visita técnica não encontrada' })
    }

    if (visitaExistente.status === 'REALIZADA') {
      return reply.status(400).send({ error: 'Não é possível cancelar uma visita já realizada' })
    }

    if (visitaExistente.status === 'CANCELADA') {
      return reply.status(400).send({ error: 'Visita já está cancelada' })
    }

    const visitaTecnica = await db.visitaTecnica.update({
      where: { id },
      data: {
        status: 'CANCELADA',
        motivoCancelamento: motivo,
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        vendedor: { include: { user: { select: { name: true } } } },
      },
    })

    return visitaTecnica
  })

  // Deletar visita técnica (apenas pendentes)
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const visitaExistente = await db.visitaTecnica.findUnique({ where: { id } })
    if (!visitaExistente) {
      return reply.status(404).send({ error: 'Visita técnica não encontrada' })
    }

    if (visitaExistente.status !== 'PENDENTE') {
      return reply.status(400).send({ error: 'Apenas visitas pendentes podem ser excluídas. Use cancelar para as demais.' })
    }

    await db.visitaTecnica.delete({ where: { id } })

    return reply.status(204).send()
  })

  // Resumo de visitas técnicas por período
  app.get('/resumo', async (request) => {
    const { mes, ano } = request.query as {
      mes?: string
      ano?: string
    }

    const mesAtual = mes ? parseInt(mes) : new Date().getMonth() + 1
    const anoAtual = ano ? parseInt(ano) : new Date().getFullYear()

    const dataInicio = new Date(anoAtual, mesAtual - 1, 1)
    const dataFim = new Date(anoAtual, mesAtual, 0, 23, 59, 59)

    const visitasTecnicas = await db.visitaTecnica.findMany({
      where: {
        dataVisita: {
          gte: dataInicio,
          lte: dataFim,
        },
      },
      include: {
        vendedor: { include: { user: { select: { name: true } } } },
      },
    })

    // Agrupar por vendedor (quem solicitou)
    const porVendedor = visitasTecnicas.reduce((acc, vt) => {
      const nome = vt.vendedor.user.name
      if (!acc[nome]) {
        acc[nome] = {
          vendedorId: vt.vendedorId,
          nome,
          total: 0,
          pendentes: 0,
          confirmadas: 0,
          realizadas: 0,
          canceladas: 0,
        }
      }
      acc[nome].total++
      if (vt.status === 'PENDENTE') acc[nome].pendentes++
      if (vt.status === 'CONFIRMADA') acc[nome].confirmadas++
      if (vt.status === 'REALIZADA') acc[nome].realizadas++
      if (vt.status === 'CANCELADA') acc[nome].canceladas++
      return acc
    }, {} as Record<string, any>)

    const totais = {
      total: visitasTecnicas.length,
      pendentes: visitasTecnicas.filter(v => v.status === 'PENDENTE').length,
      confirmadas: visitasTecnicas.filter(v => v.status === 'CONFIRMADA').length,
      realizadas: visitasTecnicas.filter(v => v.status === 'REALIZADA').length,
      canceladas: visitasTecnicas.filter(v => v.status === 'CANCELADA').length,
    }

    return {
      mes: mesAtual,
      ano: anoAtual,
      totais,
      porVendedor: Object.values(porVendedor),
    }
  })
}

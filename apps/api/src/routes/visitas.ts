import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '@tractus/database'

// Função para geocodificação reversa usando OpenStreetMap Nominatim
async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Tractus-ERP/1.0',
          'Accept-Language': 'pt-BR',
        },
      }
    )

    if (!response.ok) {
      console.error('Erro na geocodificação:', response.status)
      return null
    }

    const data = await response.json()
    const address = data.address

    if (!address) return null

    // Montar endereço legível: Rua, Bairro - Cidade
    const parts: string[] = []

    // Rua
    if (address.road) {
      parts.push(address.road)
      if (address.house_number) {
        parts[0] += `, ${address.house_number}`
      }
    }

    // Bairro
    if (address.suburb || address.neighbourhood) {
      parts.push(address.suburb || address.neighbourhood)
    }

    // Cidade
    if (address.city || address.town || address.village) {
      parts.push(address.city || address.town || address.village)
    }

    return parts.length > 0 ? parts.join(' - ') : null
  } catch (error) {
    console.error('Erro ao fazer geocodificação reversa:', error)
    return null
  }
}

const visitaSchema = z.object({
  vendedorId: z.string(),
  clienteId: z.string(),
  data: z.string().transform((v) => new Date(v)),
  observacoes: z.string().optional(),
})

const checkInSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

const checkOutSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  observacoes: z.string().optional(),
})

export async function visitasRoutes(app: FastifyInstance) {
  // Listar visitas com filtros avançados
  app.get('/', async (request) => {
    const { vendedorId, clienteId, data, dataInicio, dataFim, status, limit, offset } = request.query as {
      vendedorId?: string
      clienteId?: string
      data?: string
      dataInicio?: string
      dataFim?: string
      status?: 'agendada' | 'em_andamento' | 'concluida'
      limit?: string
      offset?: string
    }

    // Filtro de data
    let dataFilter = {}
    if (data) {
      dataFilter = { data: new Date(data) }
    } else if (dataInicio || dataFim) {
      dataFilter = {
        data: {
          ...(dataInicio && { gte: new Date(dataInicio) }),
          ...(dataFim && { lte: new Date(dataFim) }),
        },
      }
    }

    // Filtro de status baseado em checkIn/checkOut
    let statusFilter = {}
    if (status === 'agendada') {
      statusFilter = { checkIn: null }
    } else if (status === 'em_andamento') {
      statusFilter = { checkIn: { not: null }, checkOut: null }
    } else if (status === 'concluida') {
      statusFilter = { checkOut: { not: null } }
    }

    const visitas = await db.visita.findMany({
      where: {
        ...(vendedorId && { vendedorId }),
        ...(clienteId && { clienteId }),
        ...dataFilter,
        ...statusFilter,
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
        laudo: { select: { id: true, numero: true, status: true } },
      },
      orderBy: { data: 'desc' },
      ...(limit && { take: parseInt(limit) }),
      ...(offset && { skip: parseInt(offset) }),
    })

    // Adicionar status calculado
    const visitasComStatus = visitas.map(v => ({
      ...v,
      status: v.checkOut ? 'concluida' : v.checkIn ? 'em_andamento' : 'agendada',
      duracao: v.checkIn && v.checkOut
        ? Math.round((new Date(v.checkOut).getTime() - new Date(v.checkIn).getTime()) / 60000)
        : null,
    }))

    return visitasComStatus
  })

  // Obter visita por ID
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const visita = await db.visita.findUnique({
      where: { id },
      include: {
        cliente: true,
        vendedor: {
          include: {
            user: { select: { id: true, name: true, email: true, photo: true } }
          }
        },
        laudo: {
          include: {
            equipamento: true,
            fotos: true,
          }
        },
      },
    })

    if (!visita) {
      return reply.status(404).send({ error: 'Visita não encontrada' })
    }

    return {
      ...visita,
      status: visita.checkOut ? 'concluida' : visita.checkIn ? 'em_andamento' : 'agendada',
      duracao: visita.checkIn && visita.checkOut
        ? Math.round((new Date(visita.checkOut).getTime() - new Date(visita.checkIn).getTime()) / 60000)
        : null,
    }
  })

  // Criar visita (agendar)
  app.post('/', async (request, reply) => {
    const data = visitaSchema.parse(request.body)

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

    const visita = await db.visita.create({
      data,
      include: {
        cliente: { select: { id: true, nome: true } },
        vendedor: { include: { user: { select: { name: true } } } },
      },
    })

    return reply.status(201).send(visita)
  })

  // Atualizar visita
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = visitaSchema.partial().parse(request.body)

    const visita = await db.visita.update({
      where: { id },
      data,
      include: {
        cliente: { select: { id: true, nome: true } },
        vendedor: { include: { user: { select: { name: true } } } },
      },
    })

    return visita
  })

  // Deletar visita
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    // Verificar se visita existe
    const visita = await db.visita.findUnique({ where: { id } })
    if (!visita) {
      return reply.status(404).send({ error: 'Visita não encontrada' })
    }

    // Não permitir deletar visita com check-in realizado
    if (visita.checkIn) {
      return reply.status(400).send({ error: 'Não é possível excluir uma visita já iniciada' })
    }

    await db.visita.delete({ where: { id } })

    return reply.status(204).send()
  })

  // Check-in
  app.post('/:id/checkin', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { latitude, longitude } = checkInSchema.parse(request.body)

    // Verificar se visita existe
    const visitaExistente = await db.visita.findUnique({ where: { id } })
    if (!visitaExistente) {
      return reply.status(404).send({ error: 'Visita não encontrada' })
    }

    if (visitaExistente.checkIn) {
      return reply.status(400).send({ error: 'Check-in já realizado para esta visita' })
    }

    // Buscar endereço via geocodificação reversa (não bloqueia se falhar)
    let enderecoIn: string | null = null
    if (latitude && longitude) {
      enderecoIn = await reverseGeocode(latitude, longitude)
    }

    const visita = await db.visita.update({
      where: { id },
      data: {
        checkIn: new Date(),
        latitudeIn: latitude,
        longitudeIn: longitude,
        enderecoIn,
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        vendedor: { include: { user: { select: { name: true } } } },
      },
    })

    return { ...visita, status: 'em_andamento' }
  })

  // Check-out
  app.post('/:id/checkout', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { latitude, longitude, observacoes } = checkOutSchema.parse(request.body)

    // Verificar se visita existe e tem check-in
    const visitaExistente = await db.visita.findUnique({ where: { id } })
    if (!visitaExistente) {
      return reply.status(404).send({ error: 'Visita não encontrada' })
    }

    if (!visitaExistente.checkIn) {
      return reply.status(400).send({ error: 'É necessário fazer check-in primeiro' })
    }

    if (visitaExistente.checkOut) {
      return reply.status(400).send({ error: 'Check-out já realizado para esta visita' })
    }

    // Buscar endereço via geocodificação reversa (não bloqueia se falhar)
    let enderecoOut: string | null = null
    if (latitude && longitude) {
      enderecoOut = await reverseGeocode(latitude, longitude)
    }

    const visita = await db.visita.update({
      where: { id },
      data: {
        checkOut: new Date(),
        latitudeOut: latitude,
        longitudeOut: longitude,
        enderecoOut,
        ...(observacoes && { observacoes }),
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        vendedor: { include: { user: { select: { name: true } } } },
      },
    })

    const duracao = Math.round((new Date(visita.checkOut!).getTime() - new Date(visita.checkIn!).getTime()) / 60000)

    return { ...visita, status: 'concluida', duracao }
  })

  // Rota do dia (visitas programadas + realizadas)
  app.get('/rota-do-dia', async (request) => {
    const { vendedorId, data } = request.query as { vendedorId: string; data?: string }

    const dataRef = data ? new Date(data) : new Date()
    const diaSemana = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'][
      dataRef.getDay()
    ]

    // Se for domingo, não há rota
    if (diaSemana === 'DOMINGO') {
      return {
        data: dataRef.toISOString().split('T')[0],
        diaSemana,
        clientesProgramados: [],
        visitasRealizadas: [],
        estatisticas: { programadas: 0, realizadas: 0, pendentes: 0 },
      }
    }

    // Buscar rota do vendedor para o dia
    const rota = await db.rota.findFirst({
      where: { vendedorId, active: true },
      include: {
        rotaClientes: {
          where: { diaSemana: diaSemana as any },
          include: {
            cliente: {
              select: {
                id: true,
                nome: true,
                cidade: true,
                endereco: true,
                telefone: true,
              }
            }
          },
          orderBy: { ordem: 'asc' },
        },
      },
    })

    // Data início e fim do dia
    const dataInicio = new Date(dataRef)
    dataInicio.setHours(0, 0, 0, 0)
    const dataFim = new Date(dataRef)
    dataFim.setHours(23, 59, 59, 999)

    // Buscar visitas do dia
    const visitasDoDia = await db.visita.findMany({
      where: {
        vendedorId,
        data: {
          gte: dataInicio,
          lte: dataFim,
        },
      },
      include: {
        cliente: { select: { id: true, nome: true, cidade: true } },
        laudo: { select: { id: true, numero: true } },
      },
      orderBy: { checkIn: 'asc' },
    })

    // Mapear clientes programados com status de visita
    const clientesProgramados = rota?.rotaClientes.map((rc) => {
      const visitaRealizada = visitasDoDia.find(v => v.clienteId === rc.clienteId)
      return {
        ...rc.cliente,
        ordem: rc.ordem,
        visita: visitaRealizada ? {
          id: visitaRealizada.id,
          status: visitaRealizada.checkOut ? 'concluida' : visitaRealizada.checkIn ? 'em_andamento' : 'agendada',
          checkIn: visitaRealizada.checkIn,
          checkOut: visitaRealizada.checkOut,
          laudo: visitaRealizada.laudo,
        } : null,
      }
    }) || []

    // Visitas extras (clientes não programados na rota)
    const clientesProgramadosIds = clientesProgramados.map(c => c.id)
    const visitasExtras = visitasDoDia
      .filter(v => !clientesProgramadosIds.includes(v.clienteId))
      .map(v => ({
        ...v,
        status: v.checkOut ? 'concluida' : v.checkIn ? 'em_andamento' : 'agendada',
      }))

    const realizadas = visitasDoDia.filter(v => v.checkOut).length
    const pendentes = clientesProgramados.filter(c => !c.visita || !c.visita.checkOut).length

    return {
      data: dataRef.toISOString().split('T')[0],
      diaSemana,
      rota: rota ? { id: rota.id, nome: rota.nome } : null,
      clientesProgramados,
      visitasExtras,
      estatisticas: {
        programadas: clientesProgramados.length,
        realizadas,
        pendentes,
        extras: visitasExtras.length,
      },
    }
  })

  // Resumo de visitas por período
  app.get('/resumo', async (request) => {
    const { vendedorId, mes, ano } = request.query as {
      vendedorId?: string
      mes?: string
      ano?: string
    }

    const mesAtual = mes ? parseInt(mes) : new Date().getMonth() + 1
    const anoAtual = ano ? parseInt(ano) : new Date().getFullYear()

    const dataInicio = new Date(anoAtual, mesAtual - 1, 1)
    const dataFim = new Date(anoAtual, mesAtual, 0, 23, 59, 59)

    const visitas = await db.visita.findMany({
      where: {
        ...(vendedorId && { vendedorId }),
        data: {
          gte: dataInicio,
          lte: dataFim,
        },
      },
      include: {
        vendedor: { include: { user: { select: { name: true } } } },
        laudo: { select: { id: true } },
      },
    })

    // Agrupar por vendedor
    const porVendedor = visitas.reduce((acc, v) => {
      const nome = v.vendedor.user.name
      if (!acc[nome]) {
        acc[nome] = {
          vendedorId: v.vendedorId,
          nome,
          total: 0,
          concluidas: 0,
          comLaudo: 0,
          tempoMedioMinutos: 0,
          tempoTotal: 0,
        }
      }
      acc[nome].total++
      if (v.checkOut) {
        acc[nome].concluidas++
        if (v.checkIn) {
          const duracao = (new Date(v.checkOut).getTime() - new Date(v.checkIn).getTime()) / 60000
          acc[nome].tempoTotal += duracao
        }
      }
      if (v.laudo) {
        acc[nome].comLaudo++
      }
      return acc
    }, {} as Record<string, any>)

    // Calcular tempo médio
    Object.values(porVendedor).forEach((v: any) => {
      if (v.concluidas > 0) {
        v.tempoMedioMinutos = Math.round(v.tempoTotal / v.concluidas)
      }
      delete v.tempoTotal
    })

    // Totais gerais
    const totais = {
      total: visitas.length,
      concluidas: visitas.filter(v => v.checkOut).length,
      emAndamento: visitas.filter(v => v.checkIn && !v.checkOut).length,
      agendadas: visitas.filter(v => !v.checkIn).length,
      comLaudo: visitas.filter(v => v.laudo).length,
    }

    return {
      mes: mesAtual,
      ano: anoAtual,
      totais,
      porVendedor: Object.values(porVendedor),
    }
  })
}

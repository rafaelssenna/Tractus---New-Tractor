import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '@tractus/database'

const rotaSchema = z.object({
  nome: z.string().min(1),
  vendedorId: z.string(),
})

const rotaClienteSchema = z.object({
  clienteId: z.string(),
  diaSemana: z.enum(['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO']),
  ordem: z.number().int().min(0).default(0),
})

const diasSemana = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'] as const

export async function rotasRoutes(app: FastifyInstance) {
  // Listar todas as rotas
  app.get('/', async (request) => {
    const { vendedorId, active } = request.query as {
      vendedorId?: string
      active?: string
    }

    const rotas = await db.rota.findMany({
      where: {
        ...(vendedorId && { vendedorId }),
        ...(active !== undefined && { active: active === 'true' }),
      },
      include: {
        vendedor: {
          include: {
            user: { select: { id: true, name: true, photo: true } }
          }
        },
        rotaClientes: {
          include: {
            cliente: {
              select: {
                id: true,
                nome: true,
                cidade: true,
                observacoes: true,
              }
            }
          },
          orderBy: [
            { diaSemana: 'asc' },
            { ordem: 'asc' },
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Agrupar clientes por dia da semana
    const rotasFormatadas = rotas.map(rota => {
      const clientesPorDia = diasSemana.reduce((acc, dia) => {
        acc[dia] = rota.rotaClientes
          .filter(rc => rc.diaSemana === dia)
          .map(rc => ({
            id: rc.id,
            cliente: rc.cliente,
            ordem: rc.ordem,
          }))
        return acc
      }, {} as Record<string, any[]>)

      return {
        id: rota.id,
        nome: rota.nome,
        vendedor: {
          id: rota.vendedor.id,
          userId: rota.vendedor.userId,
          name: rota.vendedor.user.name,
          photo: rota.vendedor.user.photo,
        },
        active: rota.active,
        clientesPorDia,
        totalClientes: rota.rotaClientes.length,
        createdAt: rota.createdAt,
        updatedAt: rota.updatedAt,
      }
    })

    return rotasFormatadas
  })

  // Obter rota por ID
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const rota = await db.rota.findUnique({
      where: { id },
      include: {
        vendedor: {
          include: {
            user: { select: { id: true, name: true, email: true, photo: true } }
          }
        },
        rotaClientes: {
          include: {
            cliente: {
              select: {
                id: true,
                nome: true,
                cidade: true,
                endereco: true,
                telefone: true,
                email: true,
              }
            }
          },
          orderBy: [
            { diaSemana: 'asc' },
            { ordem: 'asc' },
          ],
        },
      },
    })

    if (!rota) {
      return reply.status(404).send({ error: 'Rota não encontrada' })
    }

    // Agrupar clientes por dia da semana
    const clientesPorDia = diasSemana.reduce((acc, dia) => {
      acc[dia] = rota.rotaClientes
        .filter(rc => rc.diaSemana === dia)
        .map(rc => ({
          id: rc.id,
          cliente: rc.cliente,
          ordem: rc.ordem,
        }))
      return acc
    }, {} as Record<string, any[]>)

    return {
      id: rota.id,
      nome: rota.nome,
      vendedor: {
        id: rota.vendedor.id,
        userId: rota.vendedor.userId,
        name: rota.vendedor.user.name,
        email: rota.vendedor.user.email,
        photo: rota.vendedor.user.photo,
      },
      active: rota.active,
      clientesPorDia,
      totalClientes: rota.rotaClientes.length,
      createdAt: rota.createdAt,
      updatedAt: rota.updatedAt,
    }
  })

  // Criar nova rota
  app.post('/', async (request, reply) => {
    const data = rotaSchema.parse(request.body)

    // Verificar se vendedor existe
    const vendedor = await db.vendedor.findUnique({ where: { id: data.vendedorId } })
    if (!vendedor) {
      return reply.status(400).send({ error: 'Vendedor não encontrado' })
    }

    // Verificar se já existe rota ativa para o vendedor
    const rotaExistente = await db.rota.findFirst({
      where: { vendedorId: data.vendedorId, active: true },
    })

    if (rotaExistente) {
      return reply.status(400).send({
        error: 'Já existe uma rota ativa para este vendedor',
        rotaExistenteId: rotaExistente.id,
      })
    }

    const rota = await db.rota.create({
      data,
      include: {
        vendedor: {
          include: {
            user: { select: { name: true } }
          }
        },
      },
    })

    return reply.status(201).send(rota)
  })

  // Atualizar rota
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { nome, active } = request.body as { nome?: string; active?: boolean }

    const rota = await db.rota.update({
      where: { id },
      data: {
        ...(nome && { nome }),
        ...(active !== undefined && { active }),
      },
      include: {
        vendedor: {
          include: {
            user: { select: { name: true } }
          }
        },
      },
    })

    return rota
  })

  // Deletar rota
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    await db.rota.delete({ where: { id } })

    return reply.status(204).send()
  })

  // ==========================================
  // CLIENTES DA ROTA
  // ==========================================

  // Adicionar cliente à rota
  app.post('/:id/clientes', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = rotaClienteSchema.parse(request.body)

    // Verificar se rota existe
    const rota = await db.rota.findUnique({ where: { id } })
    if (!rota) {
      return reply.status(404).send({ error: 'Rota não encontrada' })
    }

    // Verificar se cliente existe
    const cliente = await db.cliente.findUnique({ where: { id: data.clienteId } })
    if (!cliente) {
      return reply.status(400).send({ error: 'Cliente não encontrado' })
    }

    // Verificar se já existe esta combinação
    const existente = await db.rotaCliente.findFirst({
      where: {
        rotaId: id,
        clienteId: data.clienteId,
        diaSemana: data.diaSemana,
      },
    })

    if (existente) {
      return reply.status(400).send({
        error: 'Cliente já está programado para este dia na rota',
      })
    }

    // Se não informou ordem, colocar no final
    if (data.ordem === 0) {
      const ultimaOrdem = await db.rotaCliente.findFirst({
        where: { rotaId: id, diaSemana: data.diaSemana },
        orderBy: { ordem: 'desc' },
      })
      data.ordem = (ultimaOrdem?.ordem || 0) + 1
    }

    const rotaCliente = await db.rotaCliente.create({
      data: {
        rotaId: id,
        ...data,
      },
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
            cidade: true,
          }
        },
      },
    })

    return reply.status(201).send(rotaCliente)
  })

  // Remover cliente da rota
  app.delete('/:id/clientes/:rotaClienteId', async (request, reply) => {
    const { id, rotaClienteId } = request.params as { id: string; rotaClienteId: string }

    // Verificar se rota existe
    const rota = await db.rota.findUnique({ where: { id } })
    if (!rota) {
      return reply.status(404).send({ error: 'Rota não encontrada' })
    }

    await db.rotaCliente.delete({ where: { id: rotaClienteId } })

    return reply.status(204).send()
  })

  // Reordenar clientes de um dia
  app.put('/:id/reordenar', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { diaSemana, clientes } = request.body as {
      diaSemana: string
      clientes: { rotaClienteId: string; ordem: number }[]
    }

    // Verificar se rota existe
    const rota = await db.rota.findUnique({ where: { id } })
    if (!rota) {
      return reply.status(404).send({ error: 'Rota não encontrada' })
    }

    // Atualizar ordens em transação
    await db.$transaction(
      clientes.map((c) =>
        db.rotaCliente.update({
          where: { id: c.rotaClienteId },
          data: { ordem: c.ordem },
        })
      )
    )

    // Retornar rota atualizada
    const rotaAtualizada = await db.rotaCliente.findMany({
      where: { rotaId: id, diaSemana: diaSemana as any },
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
            cidade: true,
          }
        },
      },
      orderBy: { ordem: 'asc' },
    })

    return rotaAtualizada
  })

  // Copiar rota de um dia para outro
  app.post('/:id/copiar-dia', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { diaOrigem, diaDestino } = request.body as {
      diaOrigem: string
      diaDestino: string
    }

    // Verificar se rota existe
    const rota = await db.rota.findUnique({ where: { id } })
    if (!rota) {
      return reply.status(404).send({ error: 'Rota não encontrada' })
    }

    // Buscar clientes do dia de origem
    const clientesOrigem = await db.rotaCliente.findMany({
      where: { rotaId: id, diaSemana: diaOrigem as any },
      orderBy: { ordem: 'asc' },
    })

    if (clientesOrigem.length === 0) {
      return reply.status(400).send({ error: 'Dia de origem não tem clientes' })
    }

    // Verificar clientes existentes no destino
    const clientesDestino = await db.rotaCliente.findMany({
      where: { rotaId: id, diaSemana: diaDestino as any },
    })
    const clientesDestinoIds = clientesDestino.map(c => c.clienteId)

    // Criar apenas clientes que não existem no destino
    const clientesParaCriar = clientesOrigem.filter(
      c => !clientesDestinoIds.includes(c.clienteId)
    )

    if (clientesParaCriar.length === 0) {
      return reply.status(400).send({
        error: 'Todos os clientes já estão programados no dia de destino',
      })
    }

    // Próxima ordem no destino
    const ultimaOrdem = clientesDestino.reduce((max, c) => Math.max(max, c.ordem), 0)

    await db.rotaCliente.createMany({
      data: clientesParaCriar.map((c, index) => ({
        rotaId: id,
        clienteId: c.clienteId,
        diaSemana: diaDestino as any,
        ordem: ultimaOrdem + index + 1,
      })),
    })

    return {
      message: `${clientesParaCriar.length} cliente(s) copiado(s) de ${diaOrigem} para ${diaDestino}`,
      copiados: clientesParaCriar.length,
    }
  })

  // Visão geral da semana (todos os vendedores)
  app.get('/visao-semanal', async (request) => {
    const rotas = await db.rota.findMany({
      where: { active: true },
      include: {
        vendedor: {
          include: {
            user: { select: { name: true, photo: true } }
          }
        },
        rotaClientes: {
          include: {
            cliente: {
              select: {
                id: true,
                nome: true,
                cidade: true,
                observacoes: true,
              }
            }
          },
          orderBy: { ordem: 'asc' },
        },
      },
    })

    const visaoSemanal = rotas.map(rota => ({
      vendedor: {
        id: rota.vendedor.id,
        name: rota.vendedor.user.name,
        photo: rota.vendedor.user.photo,
      },
      rota: {
        id: rota.id,
        nome: rota.nome,
      },
      semana: diasSemana.reduce((acc, dia) => {
        acc[dia] = rota.rotaClientes
          .filter(rc => rc.diaSemana === dia)
          .length
        return acc
      }, {} as Record<string, number>),
      totalClientesSemana: rota.rotaClientes.length,
    }))

    return visaoSemanal
  })
}

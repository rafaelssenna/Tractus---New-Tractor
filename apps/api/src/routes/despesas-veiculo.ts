import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '@tractus/database'

const despesaVeiculoSchema = z.object({
  vendedorId: z.string(),
  data: z.string().transform((v) => new Date(v)),
  tipo: z.enum(['COMBUSTIVEL', 'TROCA_OLEO', 'REVISAO', 'PNEUS_NIVEL', 'PNEUS_TROCA']),
  valor: z.number(),
  km: z.number().int().positive('Quilometragem deve ser positiva'),
  comprovante: z.string().optional(),
  validadoPorIA: z.boolean().optional(),
  valorExtraido: z.number().optional(),
  nomeExtraido: z.string().optional(),
})

// Intervalos padrão de manutenção em km
const INTERVALOS_PADRAO: Record<string, number> = {
  TROCA_OLEO: 5000,
  REVISAO: 10000,
  PNEUS_NIVEL: 2000,
  PNEUS_TROCA: 40000,
}

const TIPO_LABELS: Record<string, string> = {
  COMBUSTIVEL: 'Combustível',
  TROCA_OLEO: 'Troca de Óleo',
  REVISAO: 'Revisão',
  PNEUS_NIVEL: 'Calibragem Pneus',
  PNEUS_TROCA: 'Troca de Pneus',
}

export async function despesasVeiculoRoutes(app: FastifyInstance) {
  // Listar despesas de veículo
  app.get('/', async (request) => {
    const { vendedorId, mes, ano, tipo, status } = request.query as {
      vendedorId?: string
      mes?: string
      ano?: string
      tipo?: string
      status?: string
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

    const despesas = await db.despesaVeiculo.findMany({
      where: {
        ...(vendedorId && { vendedorId }),
        ...(tipo && { tipo: tipo as any }),
        ...(status && { status: status as any }),
        ...dataFilter,
      },
      include: {
        vendedor: { include: { user: { select: { name: true, photo: true } } } },
        aprovadoPor: { select: { name: true } },
      },
      orderBy: { data: 'desc' },
    })

    return despesas
  })

  // Dashboard com indicadores
  app.get('/dashboard', async (request) => {
    const { vendedorId, mes, ano } = request.query as {
      vendedorId?: string
      mes?: string
      ano?: string
    }

    const mesAtual = mes ? parseInt(mes) : new Date().getMonth() + 1
    const anoAtual = ano ? parseInt(ano) : new Date().getFullYear()

    const dataInicio = new Date(anoAtual, mesAtual - 1, 1)
    const dataFim = new Date(anoAtual, mesAtual, 1)

    // Buscar vendedores com suas despesas de veículo
    const vendedores = await db.vendedor.findMany({
      where: vendedorId ? { id: vendedorId } : undefined,
      include: {
        user: { select: { name: true } },
        despesasVeiculo: {
          where: {
            data: {
              gte: dataInicio,
              lt: dataFim,
            },
          },
          orderBy: { km: 'asc' },
        },
      },
    })

    const resultado = vendedores.map((vendedor) => {
      const despesas = vendedor.despesasVeiculo
      const totalDespesas = despesas.reduce((acc, d) => acc + Number(d.valor), 0)

      // Calcular km rodados no período
      let kmRodados = 0
      let custoPorKm = 0
      if (despesas.length >= 2) {
        const kmInicial = despesas[0].km
        const kmFinal = despesas[despesas.length - 1].km
        kmRodados = kmFinal - kmInicial
        if (kmRodados > 0) {
          custoPorKm = totalDespesas / kmRodados
        }
      }

      // Agrupar por tipo
      const porTipo: Record<string, { total: number; quantidade: number }> = {}
      despesas.forEach((d) => {
        if (!porTipo[d.tipo]) {
          porTipo[d.tipo] = { total: 0, quantidade: 0 }
        }
        porTipo[d.tipo].total += Number(d.valor)
        porTipo[d.tipo].quantidade += 1
      })

      // Contagem por status
      const pendentes = despesas.filter((d) => d.status === 'PENDENTE').length
      const aprovadas = despesas.filter((d) => d.status === 'APROVADA').length
      const reprovadas = despesas.filter((d) => d.status === 'REPROVADA').length

      return {
        vendedor: {
          id: vendedor.id,
          name: vendedor.user.name,
        },
        totalDespesas,
        kmRodados,
        custoPorKm,
        porTipo,
        quantidadeDespesas: despesas.length,
        pendentes,
        aprovadas,
        reprovadas,
        ultimoKm: despesas.length > 0 ? despesas[despesas.length - 1].km : null,
      }
    })

    // Totais gerais
    const totalGeral = resultado.reduce((acc, r) => acc + r.totalDespesas, 0)
    const totalPendentes = resultado.reduce((acc, r) => acc + r.pendentes, 0)
    const totalAprovadas = resultado.reduce((acc, r) => acc + r.aprovadas, 0)
    const kmTotalRodado = resultado.reduce((acc, r) => acc + r.kmRodados, 0)
    const custoPorKmGeral = kmTotalRodado > 0 ? totalGeral / kmTotalRodado : 0

    return {
      mes: mesAtual,
      ano: anoAtual,
      totais: {
        despesas: totalGeral,
        pendentes: totalPendentes,
        aprovadas: totalAprovadas,
        kmRodados: kmTotalRodado,
        custoPorKm: custoPorKmGeral,
      },
      vendedores: resultado,
    }
  })

  // Alertas de manutenção
  app.get('/alertas', async (request) => {
    const { vendedorId } = request.query as { vendedorId?: string }

    // Buscar configurações de manutenção
    const configuracoes = await db.configuracaoManutencao.findMany()
    const intervalos: Record<string, number> = { ...INTERVALOS_PADRAO }
    configuracoes.forEach((c) => {
      intervalos[c.tipo] = c.intervaloKm
    })

    // Buscar vendedores
    const vendedores = await db.vendedor.findMany({
      where: vendedorId ? { id: vendedorId } : undefined,
      include: {
        user: { select: { name: true } },
        despesasVeiculo: {
          orderBy: { km: 'desc' },
        },
      },
    })

    const alertas: Array<{
      vendedorId: string
      vendedorNome: string
      tipo: string
      tipoLabel: string
      kmAtual: number
      kmUltimaManutencao: number
      kmProximaManutencao: number
      kmRestantes: number
      percentual: number
      status: 'OK' | 'PROXIMO' | 'VENCIDO'
    }> = []

    vendedores.forEach((vendedor) => {
      const despesas = vendedor.despesasVeiculo
      if (despesas.length === 0) return

      const kmAtual = despesas[0].km // Maior km registrado

      // Para cada tipo de manutenção (exceto combustível)
      const tiposManutencao = ['TROCA_OLEO', 'REVISAO', 'PNEUS_NIVEL', 'PNEUS_TROCA'] as const

      tiposManutencao.forEach((tipo) => {
        const intervalo = intervalos[tipo]
        const ultimaManutencao = despesas.find((d) => d.tipo === tipo)
        const kmUltimaManutencao = ultimaManutencao?.km || 0
        const kmProximaManutencao = kmUltimaManutencao + intervalo
        const kmRestantes = kmProximaManutencao - kmAtual
        const percentual = ((kmAtual - kmUltimaManutencao) / intervalo) * 100

        let status: 'OK' | 'PROXIMO' | 'VENCIDO' = 'OK'
        if (percentual >= 100) {
          status = 'VENCIDO'
        } else if (percentual >= 80) {
          status = 'PROXIMO'
        }

        // Só adicionar se não estiver OK
        if (status !== 'OK') {
          alertas.push({
            vendedorId: vendedor.id,
            vendedorNome: vendedor.user.name,
            tipo,
            tipoLabel: TIPO_LABELS[tipo],
            kmAtual,
            kmUltimaManutencao,
            kmProximaManutencao,
            kmRestantes,
            percentual,
            status,
          })
        }
      })
    })

    // Ordenar por urgência (VENCIDO primeiro, depois PROXIMO)
    alertas.sort((a, b) => {
      if (a.status === 'VENCIDO' && b.status !== 'VENCIDO') return -1
      if (a.status !== 'VENCIDO' && b.status === 'VENCIDO') return 1
      return b.percentual - a.percentual
    })

    return alertas
  })

  // Criar despesa de veículo
  app.post('/', async (request, reply) => {
    const data = despesaVeiculoSchema.parse(request.body)

    // Validar km (deve ser >= último km registrado pelo vendedor)
    const ultimaDespesa = await db.despesaVeiculo.findFirst({
      where: { vendedorId: data.vendedorId },
      orderBy: { km: 'desc' },
    })

    if (ultimaDespesa && data.km < ultimaDespesa.km) {
      return reply.status(400).send({
        error: `Quilometragem inválida. O último registro foi de ${ultimaDespesa.km} km. O valor informado deve ser maior ou igual.`,
      })
    }

    const despesa = await db.despesaVeiculo.create({
      data: {
        vendedorId: data.vendedorId,
        data: data.data,
        tipo: data.tipo,
        valor: data.valor,
        km: data.km,
        comprovante: data.comprovante,
        validadoPorIA: data.validadoPorIA || false,
        valorExtraido: data.valorExtraido,
        nomeExtraido: data.nomeExtraido,
      },
      include: {
        vendedor: { include: { user: { select: { name: true, photo: true } } } },
      },
    })

    return reply.status(201).send(despesa)
  })

  // Atualizar despesa de veículo
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = despesaVeiculoSchema.partial().parse(request.body)

    // Se está atualizando km, validar
    if (data.km !== undefined) {
      const despesaAtual = await db.despesaVeiculo.findUnique({ where: { id } })
      if (!despesaAtual) {
        return reply.status(404).send({ error: 'Despesa não encontrada' })
      }

      const ultimaDespesa = await db.despesaVeiculo.findFirst({
        where: {
          vendedorId: despesaAtual.vendedorId,
          id: { not: id },
        },
        orderBy: { km: 'desc' },
      })

      if (ultimaDespesa && data.km < ultimaDespesa.km) {
        return reply.status(400).send({
          error: `Quilometragem inválida. Existe um registro com ${ultimaDespesa.km} km.`,
        })
      }
    }

    const despesa = await db.despesaVeiculo.update({
      where: { id },
      data,
      include: {
        vendedor: { include: { user: { select: { name: true, photo: true } } } },
      },
    })

    return despesa
  })

  // Deletar despesa de veículo
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    await db.despesaVeiculo.delete({ where: { id } })

    return reply.status(204).send()
  })

  // Aprovar despesa de veículo
  app.post('/:id/aprovar', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { aprovadoPorId } = request.body as { aprovadoPorId: string }

    const despesa = await db.despesaVeiculo.update({
      where: { id },
      data: {
        status: 'APROVADA',
        aprovadoPorId,
        dataAprovacao: new Date(),
      },
      include: {
        vendedor: { include: { user: { select: { name: true } } } },
        aprovadoPor: { select: { name: true } },
      },
    })

    return despesa
  })

  // Reprovar despesa de veículo
  app.post('/:id/reprovar', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { aprovadoPorId, motivoReprovacao } = request.body as {
      aprovadoPorId: string
      motivoReprovacao?: string
    }

    const despesa = await db.despesaVeiculo.update({
      where: { id },
      data: {
        status: 'REPROVADA',
        aprovadoPorId,
        dataAprovacao: new Date(),
        motivoReprovacao,
      },
      include: {
        vendedor: { include: { user: { select: { name: true } } } },
        aprovadoPor: { select: { name: true } },
      },
    })

    return despesa
  })

  // Obter último km do vendedor
  app.get('/ultimo-km/:vendedorId', async (request) => {
    const { vendedorId } = request.params as { vendedorId: string }

    const ultimaDespesa = await db.despesaVeiculo.findFirst({
      where: { vendedorId },
      orderBy: { km: 'desc' },
      select: { km: true, data: true },
    })

    return {
      ultimoKm: ultimaDespesa?.km || null,
      dataUltimoRegistro: ultimaDespesa?.data || null,
    }
  })

  // Configurações de manutenção (CRUD simplificado)
  app.get('/configuracoes', async () => {
    const configuracoes = await db.configuracaoManutencao.findMany()

    // Merge com padrões
    const tiposManutencao = ['TROCA_OLEO', 'REVISAO', 'PNEUS_NIVEL', 'PNEUS_TROCA']
    return tiposManutencao.map((tipo) => {
      const config = configuracoes.find((c) => c.tipo === tipo)
      return {
        tipo,
        tipoLabel: TIPO_LABELS[tipo],
        intervaloKm: config?.intervaloKm || INTERVALOS_PADRAO[tipo],
        id: config?.id || null,
      }
    })
  })

  app.put('/configuracoes/:tipo', async (request) => {
    const { tipo } = request.params as { tipo: string }
    const { intervaloKm } = request.body as { intervaloKm: number }

    const config = await db.configuracaoManutencao.upsert({
      where: { tipo: tipo as any },
      update: { intervaloKm },
      create: { tipo: tipo as any, intervaloKm },
    })

    return config
  })
}

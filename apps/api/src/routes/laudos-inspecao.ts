import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '@tractus/database'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const componenteSchema = z.object({
  nome: z.string().min(1, 'Nome do componente é obrigatório'),
  condicao: z.enum(['BOM', 'REGULAR', 'CRITICO']),
  observacao: z.string().optional(),
  ordem: z.number().optional(),
})

const laudoInspecaoSchema = z.object({
  visitaTecnicaId: z.string(),
  equipamento: z.string().min(1, 'Equipamento é obrigatório'),
  numeroSerie: z.string().min(1, 'Número de série é obrigatório'),
  dataInspecao: z.string().transform((v) => new Date(v)),
  componentes: z.array(componenteSchema).min(1, 'Adicione pelo menos um componente'),
  fotos: z.array(z.string()).max(5, 'Máximo de 5 fotos'),
})

const CONDICAO_LABELS: Record<string, string> = {
  BOM: 'Bom',
  REGULAR: 'Regular',
  CRITICO: 'Crítico',
}

// Gerar número da visita: DD/MM/AAAA-NNNN
async function gerarNumeroVisita(dataVisita: Date): Promise<string> {
  const dia = String(dataVisita.getDate()).padStart(2, '0')
  const mes = String(dataVisita.getMonth() + 1).padStart(2, '0')
  const ano = dataVisita.getFullYear()
  const dataFormatada = `${dia}/${mes}/${ano}`

  // Contar quantas visitas já têm número nessa data
  const count = await db.visitaTecnica.count({
    where: {
      numero: {
        startsWith: dataFormatada,
      },
    },
  })

  const sequencial = String(count + 1).padStart(4, '0')
  return `${dataFormatada}-${sequencial}`
}

// Corrigir texto técnico com IA
async function corrigirTextoTecnico(texto: string): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('[IA] GEMINI_API_KEY não configurada - correção de texto desabilitada')
      return texto
    }

    console.log('[IA] Corrigindo texto:', texto.substring(0, 50) + '...')
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `Você é um especialista em manutenção de equipamentos pesados (tratores, escavadeiras, etc).
Corrija o texto a seguir mantendo o significado original, mas:
1. Corrija erros de português (ortografia, gramática)
2. Use termos técnicos adequados da área de manutenção de máquinas pesadas
3. Mantenha o texto conciso e profissional
4. NÃO adicione informações que não estavam no original
5. Se o texto já estiver correto, retorne-o sem alterações

Texto original: "${texto}"

Retorne APENAS o texto corrigido, sem explicações.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const corrigido = response.text().trim()

    console.log('[IA] Texto corrigido:', corrigido.substring(0, 50) + '...')
    return corrigido || texto
  } catch (error) {
    console.error('[IA] Erro ao corrigir texto:', error)
    return texto
  }
}

export async function laudosInspecaoRoutes(app: FastifyInstance) {
  // Listar laudos de inspeção
  app.get('/', async (request) => {
    const { inspetorId, status, dataInicio, dataFim } = request.query as {
      inspetorId?: string
      status?: string
      dataInicio?: string
      dataFim?: string
    }

    let dataFilter = {}
    if (dataInicio || dataFim) {
      dataFilter = {
        dataInspecao: {
          ...(dataInicio && { gte: new Date(dataInicio) }),
          ...(dataFim && { lte: new Date(dataFim) }),
        },
      }
    }

    const laudos = await db.laudoInspecao.findMany({
      where: {
        ...(inspetorId && { inspetorId }),
        ...(status && { status: status as any }),
        ...dataFilter,
      },
      include: {
        inspetor: {
          select: { id: true, name: true, photo: true },
        },
        visitaTecnica: {
          include: {
            cliente: {
              select: { id: true, nome: true, cidade: true, estado: true },
            },
            vendedor: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
        },
        componentes: {
          orderBy: { ordem: 'asc' },
        },
      },
      orderBy: { dataInspecao: 'desc' },
    })

    return laudos
  })

  // Buscar laudo por ID
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const laudo = await db.laudoInspecao.findUnique({
      where: { id },
      include: {
        inspetor: {
          select: { id: true, name: true, photo: true },
        },
        visitaTecnica: {
          include: {
            cliente: {
              select: { id: true, nome: true, cidade: true, estado: true, endereco: true, telefone: true },
            },
            vendedor: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
        },
        componentes: {
          orderBy: { ordem: 'asc' },
        },
      },
    })

    if (!laudo) {
      return reply.status(404).send({ error: 'Laudo não encontrado' })
    }

    return laudo
  })

  // Buscar laudo por visita técnica
  app.get('/visita/:visitaTecnicaId', async (request, reply) => {
    const { visitaTecnicaId } = request.params as { visitaTecnicaId: string }

    const laudo = await db.laudoInspecao.findUnique({
      where: { visitaTecnicaId },
      include: {
        inspetor: {
          select: { id: true, name: true, photo: true },
        },
        visitaTecnica: {
          include: {
            cliente: {
              select: { id: true, nome: true, cidade: true, estado: true, endereco: true, telefone: true },
            },
            vendedor: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
        },
        componentes: {
          orderBy: { ordem: 'asc' },
        },
      },
    })

    if (!laudo) {
      return reply.status(404).send({ error: 'Laudo não encontrado para esta visita' })
    }

    return laudo
  })

  // Criar laudo de inspeção
  app.post('/', async (request, reply) => {
    const data = laudoInspecaoSchema.parse(request.body)
    const { inspetorId } = request.body as { inspetorId: string }

    if (!inspetorId) {
      return reply.status(400).send({ error: 'ID do inspetor é obrigatório' })
    }

    // Verificar se visita existe e não tem laudo
    const visita = await db.visitaTecnica.findUnique({
      where: { id: data.visitaTecnicaId },
      include: { laudoInspecao: true },
    })

    if (!visita) {
      return reply.status(404).send({ error: 'Visita técnica não encontrada' })
    }

    if (visita.laudoInspecao) {
      return reply.status(400).send({ error: 'Esta visita já possui um laudo' })
    }

    // Gerar número da visita se não tiver
    let numeroVisita = visita.numero
    if (!numeroVisita && visita.dataVisita) {
      numeroVisita = await gerarNumeroVisita(new Date(visita.dataVisita))
      await db.visitaTecnica.update({
        where: { id: data.visitaTecnicaId },
        data: { numero: numeroVisita },
      })
    }

    // Corrigir textos das observações com IA
    const componentesCorrigidos = await Promise.all(
      data.componentes.map(async (comp, index) => ({
        nome: comp.nome,
        condicao: comp.condicao,
        observacao: comp.observacao ? await corrigirTextoTecnico(comp.observacao) : null,
        ordem: comp.ordem ?? index,
      }))
    )

    // Criar laudo
    const laudo = await db.laudoInspecao.create({
      data: {
        visitaTecnicaId: data.visitaTecnicaId,
        inspetorId,
        equipamento: data.equipamento,
        numeroSerie: data.numeroSerie,
        dataInspecao: data.dataInspecao,
        fotos: data.fotos,
        componentes: {
          create: componentesCorrigidos,
        },
      },
      include: {
        inspetor: {
          select: { id: true, name: true, photo: true },
        },
        visitaTecnica: {
          include: {
            cliente: {
              select: { id: true, nome: true, cidade: true, estado: true },
            },
          },
        },
        componentes: {
          orderBy: { ordem: 'asc' },
        },
      },
    })

    return reply.status(201).send(laudo)
  })

  // Atualizar laudo
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = laudoInspecaoSchema.partial().parse(request.body)

    const laudoExistente = await db.laudoInspecao.findUnique({ where: { id } })

    if (!laudoExistente) {
      return reply.status(404).send({ error: 'Laudo não encontrado' })
    }

    if (laudoExistente.status === 'ENVIADO') {
      return reply.status(400).send({ error: 'Laudo já foi enviado e não pode ser alterado' })
    }

    // Se tem componentes, corrigir textos e atualizar
    if (data.componentes) {
      // Deletar componentes existentes
      await db.componenteInspecao.deleteMany({
        where: { laudoInspecaoId: id },
      })

      // Corrigir textos e recriar
      const componentesCorrigidos = await Promise.all(
        data.componentes.map(async (comp, index) => ({
          nome: comp.nome,
          condicao: comp.condicao,
          observacao: comp.observacao ? await corrigirTextoTecnico(comp.observacao) : null,
          ordem: comp.ordem ?? index,
        }))
      )

      await db.componenteInspecao.createMany({
        data: componentesCorrigidos.map((comp) => ({
          laudoInspecaoId: id,
          ...comp,
        })),
      })
    }

    // Atualizar laudo
    const laudo = await db.laudoInspecao.update({
      where: { id },
      data: {
        ...(data.equipamento && { equipamento: data.equipamento }),
        ...(data.numeroSerie && { numeroSerie: data.numeroSerie }),
        ...(data.dataInspecao && { dataInspecao: data.dataInspecao }),
        ...(data.fotos && { fotos: data.fotos }),
      },
      include: {
        inspetor: {
          select: { id: true, name: true, photo: true },
        },
        visitaTecnica: {
          include: {
            cliente: {
              select: { id: true, nome: true, cidade: true, estado: true },
            },
          },
        },
        componentes: {
          orderBy: { ordem: 'asc' },
        },
      },
    })

    return laudo
  })

  // Enviar laudo (finalizar)
  app.post('/:id/enviar', async (request, reply) => {
    const { id } = request.params as { id: string }

    const laudo = await db.laudoInspecao.findUnique({
      where: { id },
      include: { componentes: true },
    })

    if (!laudo) {
      return reply.status(404).send({ error: 'Laudo não encontrado' })
    }

    if (laudo.status === 'ENVIADO') {
      return reply.status(400).send({ error: 'Laudo já foi enviado' })
    }

    if (laudo.componentes.length === 0) {
      return reply.status(400).send({ error: 'Adicione pelo menos um componente antes de enviar' })
    }

    // Atualizar status do laudo e marcar visita como REALIZADA
    const laudoAtualizado = await db.laudoInspecao.update({
      where: { id },
      data: {
        status: 'ENVIADO',
        dataEnvio: new Date(),
      },
      include: {
        inspetor: {
          select: { id: true, name: true },
        },
        visitaTecnica: {
          include: {
            cliente: {
              select: { nome: true },
            },
          },
        },
        componentes: {
          orderBy: { ordem: 'asc' },
        },
      },
    })

    // Marcar a visita técnica como REALIZADA automaticamente
    await db.visitaTecnica.update({
      where: { id: laudo.visitaTecnicaId },
      data: { status: 'REALIZADA' },
    })

    return laudoAtualizado
  })

  // Deletar laudo (só se for rascunho)
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const laudo = await db.laudoInspecao.findUnique({ where: { id } })

    if (!laudo) {
      return reply.status(404).send({ error: 'Laudo não encontrado' })
    }

    if (laudo.status === 'ENVIADO') {
      return reply.status(400).send({ error: 'Não é possível excluir um laudo já enviado' })
    }

    await db.laudoInspecao.delete({ where: { id } })

    return reply.status(204).send()
  })

  // Corrigir texto técnico (endpoint para uso no frontend)
  app.post('/corrigir-texto', async (request) => {
    const { texto } = request.body as { texto: string }

    if (!texto) {
      return { texto: '', corrigido: false }
    }

    const textoCorrigido = await corrigirTextoTecnico(texto)

    return {
      textoOriginal: texto,
      textoCorrigido,
      corrigido: texto !== textoCorrigido,
    }
  })

  // Gerar dados para PDF
  app.get('/:id/pdf-data', async (request, reply) => {
    const { id } = request.params as { id: string }

    const laudo = await db.laudoInspecao.findUnique({
      where: { id },
      include: {
        inspetor: {
          select: { id: true, name: true },
        },
        visitaTecnica: {
          include: {
            cliente: {
              select: { id: true, nome: true, cidade: true, estado: true, endereco: true, telefone: true, cnpj: true },
            },
            vendedor: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
        },
        componentes: {
          orderBy: { ordem: 'asc' },
        },
      },
    })

    if (!laudo) {
      return reply.status(404).send({ error: 'Laudo não encontrado' })
    }

    // Formatar dados para o PDF
    const pdfData = {
      numero: laudo.visitaTecnica.numero || 'N/A',
      dataInspecao: laudo.dataInspecao.toLocaleDateString('pt-BR'),
      inspetor: laudo.inspetor.name,
      cliente: {
        nome: laudo.visitaTecnica.cliente.nome,
        cidade: laudo.visitaTecnica.cliente.cidade,
        estado: laudo.visitaTecnica.cliente.estado,
        endereco: laudo.visitaTecnica.cliente.endereco,
        telefone: laudo.visitaTecnica.cliente.telefone,
        cnpj: laudo.visitaTecnica.cliente.cnpj,
      },
      vendedor: laudo.visitaTecnica.vendedor.user.name,
      equipamento: laudo.equipamento,
      numeroSerie: laudo.numeroSerie,
      componentes: laudo.componentes.map((comp) => ({
        nome: comp.nome,
        condicao: comp.condicao,
        condicaoLabel: CONDICAO_LABELS[comp.condicao],
        observacao: comp.observacao,
      })),
      fotos: laudo.fotos,
      status: laudo.status,
      dataEnvio: laudo.dataEnvio?.toLocaleDateString('pt-BR'),
    }

    return pdfData
  })

  // Histórico de laudos do inspetor (lista simples)
  app.get('/historico/:inspetorId', async (request) => {
    const { inspetorId } = request.params as { inspetorId: string }
    const { dataInicio, dataFim } = request.query as {
      dataInicio?: string
      dataFim?: string
    }

    let dataFilter = {}
    if (dataInicio || dataFim) {
      dataFilter = {
        dataInspecao: {
          ...(dataInicio && { gte: new Date(dataInicio) }),
          ...(dataFim && { lte: new Date(dataFim) }),
        },
      }
    }

    const laudos = await db.laudoInspecao.findMany({
      where: {
        inspetorId,
        ...dataFilter,
      },
      include: {
        visitaTecnica: {
          include: {
            cliente: {
              select: { nome: true, cidade: true, estado: true },
            },
          },
        },
        componentes: {
          select: { id: true, nome: true, condicao: true },
          orderBy: { ordem: 'asc' },
        },
      },
      orderBy: { dataInspecao: 'desc' },
    })

    return laudos.map((laudo) => ({
      id: laudo.id,
      numero: laudo.visitaTecnica.numero || `LAUDO-${laudo.id.slice(0, 8)}`,
      equipamento: laudo.equipamento,
      numeroSerie: laudo.numeroSerie,
      dataInspecao: laudo.dataInspecao.toISOString(),
      status: laudo.status,
      dataEnvio: laudo.dataEnvio?.toISOString() || null,
      componentes: laudo.componentes,
      visitaTecnica: {
        id: laudo.visitaTecnica.id,
        cliente: laudo.visitaTecnica.cliente,
      },
    }))
  })

  // Laudos do inspetor logado (para a aba do inspetor)
  app.get('/meus-laudos/:inspetorId', async (request) => {
    const { inspetorId } = request.params as { inspetorId: string }
    const { dataInicio, dataFim } = request.query as {
      dataInicio?: string
      dataFim?: string
    }

    let dataFilter = {}
    if (dataInicio || dataFim) {
      dataFilter = {
        dataInspecao: {
          ...(dataInicio && { gte: new Date(dataInicio) }),
          ...(dataFim && { lte: new Date(dataFim) }),
        },
      }
    }

    // Buscar visitas agendadas para o inspetor (para criar laudos)
    const visitasAgendadas = await db.visitaTecnica.findMany({
      where: {
        inspetorId,
        status: { in: ['CONFIRMADA', 'REALIZADA'] },
        dataVisita: { not: null },
        ...dataFilter,
      },
      include: {
        cliente: {
          select: { id: true, nome: true, cidade: true, estado: true },
        },
        vendedor: {
          include: {
            user: { select: { name: true } },
          },
        },
        laudoInspecao: {
          include: {
            componentes: {
              orderBy: { ordem: 'asc' },
            },
          },
        },
      },
      orderBy: { dataVisita: 'desc' },
    })

    // Agrupar por data
    const agrupadas: Record<string, typeof visitasAgendadas> = {}
    visitasAgendadas.forEach((visita) => {
      if (visita.dataVisita) {
        const dataKey = visita.dataVisita.toISOString().split('T')[0]!
        if (!agrupadas[dataKey]) {
          agrupadas[dataKey] = []
        }
        agrupadas[dataKey].push(visita)
      }
    })

    // Ordenar datas (mais recente primeiro)
    const resultado = Object.entries(agrupadas)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([data, visitas]) => ({
        data,
        diaSemana: new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' }),
        visitas: visitas.map((v) => ({
          id: v.id,
          numero: v.numero,
          cliente: v.cliente,
          vendedor: v.vendedor,
          equipamentos: v.equipamentos,
          observacao: v.observacao,
          status: v.status,
          temLaudo: !!v.laudoInspecao,
          laudo: v.laudoInspecao,
        })),
      }))

    return resultado
  })
}

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '@tractus/database'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// Tipos de componentes rodantes
const TIPOS_COMPONENTES = [
  'ESTEIRA',
  'SAPATA',
  'ROLETE_INFERIOR',
  'ROLETE_SUPERIOR',
  'RODA_GUIA',
  'RODA_MOTRIZ',
] as const

// Labels para os tipos
const TIPO_LABELS: Record<string, string> = {
  ESTEIRA: 'Esteira',
  SAPATA: 'Sapata',
  ROLETE_INFERIOR: 'Rolete Inferior',
  ROLETE_SUPERIOR: 'Rolete Superior',
  RODA_GUIA: 'Roda Guia',
  RODA_MOTRIZ: 'Roda Motriz',
}

// Labels para status
const STATUS_LABELS: Record<string, string> = {
  DENTRO_PARAMETROS: 'Dentro dos parâmetros',
  VERIFICAR: 'Verificar',
  FORA_PARAMETROS: 'Fora dos parâmetros',
}

// Schema para medição rodante
const medicaoRodanteSchema = z.object({
  tipo: z.enum(TIPOS_COMPONENTES),
  dimensaoStd: z.number().nullable().optional(),
  limiteReparo: z.number().nullable().optional(),
  medicaoLE: z.number().nullable().optional(),
  medicaoLD: z.number().nullable().optional(),
  observacao: z.string().optional(),
})

// Schema para foto de componente
const fotoComponenteSchema = z.object({
  tipo: z.enum(TIPOS_COMPONENTES),
  lado: z.enum(['LE', 'LD', 'AMBOS']).default('AMBOS'),
  url: z.string().url(),
  legenda: z.string().optional(),
})

// Schema principal do laudo
const laudoInspecaoSchema = z.object({
  visitaTecnicaId: z.string(),
  inspetorId: z.string(),
  equipamento: z.string().min(1, 'Equipamento é obrigatório'),
  numeroSerie: z.string().min(1, 'Número de série é obrigatório'),
  frota: z.string().optional(),
  horimetroTotal: z.number().int().nullable().optional(),
  horimetroEsteira: z.number().int().nullable().optional(),
  condicaoSolo: z.enum(['BAIXO_IMPACTO', 'MEDIO_IMPACTO', 'ALTO_IMPACTO']).nullable().optional(),
  dataInspecao: z.string().transform((v) => new Date(v)),
  medicoes: z.array(medicaoRodanteSchema),
  fotos: z.array(fotoComponenteSchema).optional(),
  sumario: z.string().optional(),
})

// Calcular percentual de desgaste
function calcularDesgaste(dimensaoStd: number | null, limiteReparo: number | null, medicao: number | null): { desgaste: number | null; status: string | null } {
  if (!dimensaoStd || !limiteReparo || !medicao) {
    return { desgaste: null, status: null }
  }

  // Fórmula: ((dimensaoStd - medicao) / (dimensaoStd - limiteReparo)) * 100
  const faixaTotal = dimensaoStd - limiteReparo
  if (faixaTotal <= 0) {
    return { desgaste: null, status: null }
  }

  const desgasteAtual = dimensaoStd - medicao
  const percentual = (desgasteAtual / faixaTotal) * 100

  // Determinar status
  // ≤70% = verde (ok), 70-100% = amarelo (verificar), >100% = vermelho (fora do parâmetro)
  let status: string
  if (percentual <= 70) {
    status = 'DENTRO_PARAMETROS'
  } else if (percentual <= 100) {
    status = 'VERIFICAR'
  } else {
    status = 'FORA_PARAMETROS'
  }

  return {
    desgaste: Math.round(percentual * 100) / 100,
    status,
  }
}

// Gerar número da visita: DD/MM/AAAA-NNNN
async function gerarNumeroVisita(dataVisita: Date): Promise<string> {
  const dia = String(dataVisita.getDate()).padStart(2, '0')
  const mes = String(dataVisita.getMonth() + 1).padStart(2, '0')
  const ano = dataVisita.getFullYear()
  const dataFormatada = `${dia}/${mes}/${ano}`

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
        medicoesRodante: {
          orderBy: { ordem: 'asc' },
        },
        fotosComponentes: {
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
        medicoesRodante: {
          orderBy: { ordem: 'asc' },
        },
        fotosComponentes: {
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
        medicoesRodante: {
          orderBy: { ordem: 'asc' },
        },
        fotosComponentes: {
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

    // Processar medições calculando desgaste
    const medicoesProcessadas = data.medicoes.map((med, index) => {
      const calcLE = calcularDesgaste(med.dimensaoStd ?? null, med.limiteReparo ?? null, med.medicaoLE ?? null)
      const calcLD = calcularDesgaste(med.dimensaoStd ?? null, med.limiteReparo ?? null, med.medicaoLD ?? null)

      return {
        tipo: med.tipo as any,
        dimensaoStd: med.dimensaoStd ?? null,
        limiteReparo: med.limiteReparo ?? null,
        medicaoLE: med.medicaoLE ?? null,
        medicaoLD: med.medicaoLD ?? null,
        desgasteLE: calcLE.desgaste,
        desgasteLD: calcLD.desgaste,
        statusLE: calcLE.status as any,
        statusLD: calcLD.status as any,
        observacao: med.observacao || null,
        ordem: index,
      }
    })

    // Criar laudo
    const laudo = await db.laudoInspecao.create({
      data: {
        visitaTecnicaId: data.visitaTecnicaId,
        inspetorId: data.inspetorId,
        equipamento: data.equipamento,
        numeroSerie: data.numeroSerie,
        frota: data.frota || null,
        horimetroTotal: data.horimetroTotal ?? null,
        horimetroEsteira: data.horimetroEsteira ?? null,
        condicaoSolo: data.condicaoSolo ?? null,
        dataInspecao: data.dataInspecao,
        sumario: data.sumario || null,
        medicoesRodante: {
          create: medicoesProcessadas,
        },
        fotosComponentes: data.fotos ? {
          create: data.fotos.map((foto, index) => ({
            tipo: foto.tipo as any,
            lado: foto.lado,
            url: foto.url,
            legenda: foto.legenda || null,
            ordem: index,
          })),
        } : undefined,
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
        medicoesRodante: {
          orderBy: { ordem: 'asc' },
        },
        fotosComponentes: {
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

    // Atualizar medições se fornecidas
    if (data.medicoes) {
      // Deletar medições existentes
      await db.medicaoRodante.deleteMany({
        where: { laudoInspecaoId: id },
      })

      // Criar novas medições
      const medicoesProcessadas = data.medicoes.map((med, index) => {
        const calcLE = calcularDesgaste(med.dimensaoStd ?? null, med.limiteReparo ?? null, med.medicaoLE ?? null)
        const calcLD = calcularDesgaste(med.dimensaoStd ?? null, med.limiteReparo ?? null, med.medicaoLD ?? null)

        return {
          laudoInspecaoId: id,
          tipo: med.tipo as any,
          dimensaoStd: med.dimensaoStd ?? null,
          limiteReparo: med.limiteReparo ?? null,
          medicaoLE: med.medicaoLE ?? null,
          medicaoLD: med.medicaoLD ?? null,
          desgasteLE: calcLE.desgaste,
          desgasteLD: calcLD.desgaste,
          statusLE: calcLE.status as any,
          statusLD: calcLD.status as any,
          observacao: med.observacao || null,
          ordem: index,
        }
      })

      await db.medicaoRodante.createMany({
        data: medicoesProcessadas,
      })
    }

    // Atualizar fotos se fornecidas
    if (data.fotos) {
      await db.fotoComponenteRodante.deleteMany({
        where: { laudoInspecaoId: id },
      })

      if (data.fotos.length > 0) {
        await db.fotoComponenteRodante.createMany({
          data: data.fotos.map((foto, index) => ({
            laudoInspecaoId: id,
            tipo: foto.tipo as any,
            lado: foto.lado,
            url: foto.url,
            legenda: foto.legenda || null,
            ordem: index,
          })),
        })
      }
    }

    // Atualizar laudo
    const laudo = await db.laudoInspecao.update({
      where: { id },
      data: {
        ...(data.equipamento && { equipamento: data.equipamento }),
        ...(data.numeroSerie && { numeroSerie: data.numeroSerie }),
        ...(data.frota !== undefined && { frota: data.frota || null }),
        ...(data.horimetroTotal !== undefined && { horimetroTotal: data.horimetroTotal }),
        ...(data.horimetroEsteira !== undefined && { horimetroEsteira: data.horimetroEsteira }),
        ...(data.condicaoSolo !== undefined && { condicaoSolo: data.condicaoSolo }),
        ...(data.dataInspecao && { dataInspecao: data.dataInspecao }),
        ...(data.sumario !== undefined && { sumario: data.sumario || null }),
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
        medicoesRodante: {
          orderBy: { ordem: 'asc' },
        },
        fotosComponentes: {
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
      include: { medicoesRodante: true },
    })

    if (!laudo) {
      return reply.status(404).send({ error: 'Laudo não encontrado' })
    }

    if (laudo.status === 'ENVIADO') {
      return reply.status(400).send({ error: 'Laudo já foi enviado' })
    }

    if (laudo.medicoesRodante.length === 0) {
      return reply.status(400).send({ error: 'Adicione pelo menos uma medição antes de enviar' })
    }

    // Atualizar status do laudo
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
        medicoesRodante: {
          orderBy: { ordem: 'asc' },
        },
        fotosComponentes: {
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

  // Gerar sumário técnico com IA baseado nas medições
  app.post('/gerar-sumario', async (request) => {
    const { equipamento, medicoes, sumarioAtual } = request.body as {
      equipamento: string
      medicoes: Array<{
        tipo: string
        desgasteLE: number | null
        desgasteLD: number | null
        statusLE: string | null
        statusLD: string | null
      }>
      sumarioAtual?: string
    }

    if (!process.env.GEMINI_API_KEY) {
      return { sumario: sumarioAtual || '', erro: 'IA não configurada' }
    }

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

      // Preparar dados das medições para o prompt
      const medicoesTexto = medicoes
        .filter(m => m.desgasteLE !== null || m.desgasteLD !== null)
        .map(m => {
          const tipoLabel = TIPO_LABELS[m.tipo] || m.tipo
          const statusLELabel = m.statusLE ? STATUS_LABELS[m.statusLE] : 'N/A'
          const statusLDLabel = m.statusLD ? STATUS_LABELS[m.statusLD] : 'N/A'
          return `- ${tipoLabel}: LE ${m.desgasteLE?.toFixed(1) || 'N/A'}% (${statusLELabel}), LD ${m.desgasteLD?.toFixed(1) || 'N/A'}% (${statusLDLabel})`
        })
        .join('\n')

      // Identificar componentes críticos
      const componentesCriticos = medicoes
        .filter(m => m.statusLE === 'FORA_PARAMETROS' || m.statusLD === 'FORA_PARAMETROS')
        .map(m => TIPO_LABELS[m.tipo] || m.tipo)

      const componentesVerificar = medicoes
        .filter(m => (m.statusLE === 'VERIFICAR' || m.statusLD === 'VERIFICAR') && m.statusLE !== 'FORA_PARAMETROS' && m.statusLD !== 'FORA_PARAMETROS')
        .map(m => TIPO_LABELS[m.tipo] || m.tipo)

      const prompt = `Você é um engenheiro mecânico especialista em manutenção de material rodante de equipamentos pesados (escavadeiras, tratores de esteira, etc).

Dados da inspeção do equipamento "${equipamento}":
${medicoesTexto}

${componentesCriticos.length > 0 ? `Componentes FORA DOS PARÂMETROS (críticos): ${componentesCriticos.join(', ')}` : 'Nenhum componente fora dos parâmetros.'}
${componentesVerificar.length > 0 ? `Componentes para VERIFICAR: ${componentesVerificar.join(', ')}` : ''}

${sumarioAtual ? `Sumário atual (para revisar/melhorar): "${sumarioAtual}"` : ''}

Gere um sumário técnico CONCISO (máximo 3-4 frases) em português brasileiro contendo:
1. Estado geral do material rodante
2. Componentes que requerem atenção imediata (se houver)
3. Recomendação de manutenção

Use linguagem técnica profissional. Seja direto e objetivo.
Retorne APENAS o texto do sumário, sem títulos ou explicações.`

      const result = await model.generateContent(prompt)
      const response = await result.response
      const sumarioGerado = response.text().trim()

      return {
        sumario: sumarioGerado,
        gerado: true,
      }
    } catch (error) {
      console.error('[IA] Erro ao gerar sumário:', error)
      return {
        sumario: sumarioAtual || '',
        erro: 'Erro ao gerar sumário com IA',
        gerado: false,
      }
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
        medicoesRodante: {
          orderBy: { ordem: 'asc' },
        },
        fotosComponentes: {
          orderBy: [{ tipo: 'asc' }, { lado: 'asc' }],
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
      frota: laudo.frota,
      horimetroTotal: laudo.horimetroTotal,
      horimetroEsteira: laudo.horimetroEsteira,
      condicaoSolo: laudo.condicaoSolo,
      condicaoSoloLabel: laudo.condicaoSolo ? {
        BAIXO_IMPACTO: 'Baixo Impacto',
        MEDIO_IMPACTO: 'Médio Impacto',
        ALTO_IMPACTO: 'Alto Impacto',
      }[laudo.condicaoSolo] : null,
      medicoes: laudo.medicoesRodante.map((med) => ({
        tipo: med.tipo,
        tipoLabel: TIPO_LABELS[med.tipo],
        dimensaoStd: med.dimensaoStd ? Number(med.dimensaoStd) : null,
        limiteReparo: med.limiteReparo ? Number(med.limiteReparo) : null,
        medicaoLE: med.medicaoLE ? Number(med.medicaoLE) : null,
        medicaoLD: med.medicaoLD ? Number(med.medicaoLD) : null,
        desgasteLE: med.desgasteLE ? Number(med.desgasteLE) : null,
        desgasteLD: med.desgasteLD ? Number(med.desgasteLD) : null,
        statusLE: med.statusLE,
        statusLELabel: med.statusLE ? STATUS_LABELS[med.statusLE] : null,
        statusLD: med.statusLD,
        statusLDLabel: med.statusLD ? STATUS_LABELS[med.statusLD] : null,
        observacao: med.observacao,
      })),
      fotos: laudo.fotosComponentes.map((foto) => ({
        tipo: foto.tipo,
        tipoLabel: TIPO_LABELS[foto.tipo],
        lado: foto.lado,
        ladoLabel: foto.lado === 'LE' ? 'Lado Esquerdo' : foto.lado === 'LD' ? 'Lado Direito' : '',
        url: foto.url,
        legenda: foto.legenda,
      })),
      sumario: laudo.sumario,
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
        medicoesRodante: {
          select: { id: true, tipo: true, desgasteLE: true, desgasteLD: true, statusLE: true, statusLD: true },
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
      frota: laudo.frota,
      dataInspecao: laudo.dataInspecao.toISOString(),
      status: laudo.status,
      dataEnvio: laudo.dataEnvio?.toISOString() || null,
      medicoes: laudo.medicoesRodante,
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
            medicoesRodante: {
              orderBy: { ordem: 'asc' },
            },
            fotosComponentes: {
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

  // Obter valores padrão para componentes por equipamento
  app.get('/valores-padrao/:equipamento', async (request) => {
    const { equipamento } = request.params as { equipamento: string }

    // Valores padrão genéricos para material rodante de escavadeiras
    // Estes podem ser personalizados por modelo de equipamento no futuro
    const valoresPadrao = {
      ESTEIRA: { dimensaoStd: 175.0, limiteReparo: 155.0 },
      SAPATA: { dimensaoStd: 32.0, limiteReparo: 22.0 },
      ROLETE_INFERIOR: { dimensaoStd: 185.0, limiteReparo: 171.0 },
      ROLETE_SUPERIOR: { dimensaoStd: 145.0, limiteReparo: 133.0 },
      RODA_GUIA: { dimensaoStd: 555.0, limiteReparo: 525.0 },
      RODA_MOTRIZ: { dimensaoStd: 225.0, limiteReparo: 210.0 },
    }

    return valoresPadrao
  })
}

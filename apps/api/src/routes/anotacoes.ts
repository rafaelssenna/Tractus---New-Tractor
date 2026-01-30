import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '@tractus/database'

const anotacaoSchema = z.object({
  clienteId: z.string().min(1, 'Cliente é obrigatório'),
  vendedorId: z.string().min(1, 'Vendedor é obrigatório'),
  texto: z.string().min(1, 'Texto é obrigatório'),
})

export async function anotacoesRoutes(app: FastifyInstance) {
  // Listar anotações de um cliente (por vendedor)
  app.get('/', async (request) => {
    const { clienteId, vendedorId } = request.query as { clienteId?: string; vendedorId?: string }

    const where: any = {}
    if (clienteId) where.clienteId = clienteId
    if (vendedorId) where.vendedorId = vendedorId

    const anotacoes = await db.clienteAnotacao.findMany({
      where,
      include: {
        vendedor: {
          include: { user: { select: { name: true, photo: true } } },
        },
        cliente: {
          select: { id: true, nome: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return anotacoes
  })

  // Criar anotação
  app.post('/', async (request, reply) => {
    const data = anotacaoSchema.parse(request.body)

    const anotacao = await db.clienteAnotacao.create({
      data,
      include: {
        vendedor: {
          include: { user: { select: { name: true, photo: true } } },
        },
      },
    })

    return reply.status(201).send(anotacao)
  })

  // Deletar anotação
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    await db.clienteAnotacao.delete({
      where: { id },
    })

    return reply.status(204).send()
  })

  // Resumir anotações com IA
  app.post('/resumir', async (request, reply) => {
    const { clienteId, vendedorId } = request.body as { clienteId: string; vendedorId: string }

    if (!clienteId || !vendedorId) {
      return reply.status(400).send({ error: 'clienteId e vendedorId são obrigatórios' })
    }

    // Buscar todas as anotações do vendedor para este cliente
    const anotacoes = await db.clienteAnotacao.findMany({
      where: { clienteId, vendedorId },
      orderBy: { createdAt: 'asc' },
    })

    if (anotacoes.length === 0) {
      return { resumo: 'Nenhuma anotação encontrada para resumir.', total: 0 }
    }

    // Buscar nome do cliente
    const cliente = await db.cliente.findUnique({
      where: { id: clienteId },
      select: { nome: true },
    })

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY

    if (!GEMINI_API_KEY) {
      return {
        resumo: 'API de IA não configurada. Configure a variável GEMINI_API_KEY.',
        total: anotacoes.length,
        geradoPorIA: false
      }
    }

    try {
      // Formatar anotações para o prompt
      const anotacoesTexto = anotacoes.map((a, i) => {
        const data = new Date(a.createdAt).toLocaleDateString('pt-BR')
        return `[${data}] ${a.texto}`
      }).join('\n\n')

      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Você é um assistente comercial. Analise as anotações abaixo feitas por um representante comercial sobre o cliente "${cliente?.nome || 'desconhecido'}" e faça um resumo executivo em português brasileiro.

O resumo deve:
- Destacar os pontos mais importantes
- Identificar o histórico de relacionamento
- Mencionar produtos/serviços de interesse
- Indicar próximos passos ou oportunidades
- Ser conciso (máximo 3 parágrafos)

Anotações (da mais antiga para a mais recente):

${anotacoesTexto}

Resumo:`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 500,
            },
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Erro na API Gemini:', errorText)
        return {
          resumo: 'Erro ao gerar resumo com IA.',
          total: anotacoes.length,
          geradoPorIA: false,
          erro: errorText
        }
      }

      const data = await response.json()
      const resumo = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

      if (!resumo) {
        return {
          resumo: 'Não foi possível gerar o resumo.',
          total: anotacoes.length,
          geradoPorIA: false
        }
      }

      return {
        resumo,
        total: anotacoes.length,
        geradoPorIA: true
      }
    } catch (error) {
      console.error('Erro ao resumir anotações:', error)
      return {
        resumo: 'Erro ao conectar com a IA.',
        total: anotacoes.length,
        geradoPorIA: false,
        erro: String(error)
      }
    }
  })
}

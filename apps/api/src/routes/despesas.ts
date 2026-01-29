import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '@tractus/database'

const despesaSchema = z.object({
  vendedorId: z.string(),
  data: z.string().transform((v) => new Date(v)),
  tipo: z.string().min(1, 'Tipo é obrigatório'),
  descricao: z.string().optional(),
  valor: z.number(),
  comprovante: z.string().optional(),
  validadoPorIA: z.boolean().optional(),
  valorExtraido: z.number().optional(),
  nomeExtraido: z.string().optional(),
})

const uploadImageSchema = z.object({
  image: z.string().min(1, 'Imagem é obrigatória (base64)'),
})

const analisarComprovanteSchema = z.object({
  imageUrl: z.string().min(1, 'URL da imagem é obrigatória'),
  valorInformado: z.number().min(0, 'Valor informado é obrigatório'),
})

export async function despesasRoutes(app: FastifyInstance) {
  // Upload de imagem para IMGBB
  app.post('/upload', async (request, reply) => {
    const { image } = uploadImageSchema.parse(request.body)

    const IMGBB_API_KEY = process.env.IMGBB_API_KEY

    if (!IMGBB_API_KEY) {
      return reply.status(500).send({ error: 'IMGBB_API_KEY não configurada' })
    }

    try {
      // Remove o prefixo base64 se existir
      const base64Image = image.replace(/^data:image\/\w+;base64,/, '')

      const formData = new URLSearchParams()
      formData.append('key', IMGBB_API_KEY)
      formData.append('image', base64Image)

      const response = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!data.success) {
        console.error('Erro no upload IMGBB:', data)
        return reply.status(400).send({ error: 'Erro ao fazer upload da imagem', details: data })
      }

      return {
        success: true,
        url: data.data.url,
        deleteUrl: data.data.delete_url,
        thumbnail: data.data.thumb?.url,
      }
    } catch (error) {
      console.error('Erro no upload:', error)
      return reply.status(500).send({ error: 'Erro ao fazer upload da imagem' })
    }
  })

  // Analisar comprovante com IA (Gemini)
  app.post('/analisar-comprovante', async (request, reply) => {
    const { imageUrl, valorInformado } = analisarComprovanteSchema.parse(request.body)

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY

    if (!GEMINI_API_KEY) {
      return {
        valido: true,
        mensagem: 'Validação por IA não disponível',
        valorExtraido: null,
        nomeExtraido: null,
        valorConfere: true,
      }
    }

    try {
      // Baixar a imagem e converter para base64
      const imageResponse = await fetch(imageUrl)
      const imageBuffer = await imageResponse.arrayBuffer()
      const base64Image = Buffer.from(imageBuffer).toString('base64')
      const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'

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
                    text: `Analise esta imagem de cupom fiscal ou nota fiscal.

RESPONDA EXATAMENTE no formato JSON abaixo, sem texto adicional:
{
  "ehCupomValido": true ou false,
  "valor": número decimal do valor total (ex: 150.50) ou null se não encontrar,
  "nomeEstabelecimento": "nome do estabelecimento" ou null se não encontrar,
  "motivo": "breve explicação se não for válido"
}

Se NÃO for um cupom/nota fiscal válido, retorne ehCupomValido: false.
Se for um cupom válido, extraia o valor TOTAL e o nome do estabelecimento.`,
                  },
                  {
                    inlineData: {
                      mimeType,
                      data: base64Image,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 500,
            },
          }),
        }
      )

      const responseText = await response.text()

      if (!response.ok) {
        console.error('Erro na API Gemini:', responseText)
        return {
          valido: true,
          mensagem: 'Erro na validação por IA',
          valorExtraido: null,
          nomeExtraido: null,
          valorConfere: true,
        }
      }

      const data = JSON.parse(responseText)
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

      if (!aiResponse) {
        return {
          valido: true,
          mensagem: 'Não foi possível analisar a imagem',
          valorExtraido: null,
          nomeExtraido: null,
          valorConfere: true,
        }
      }

      // Parse da resposta JSON da IA
      let parsed
      try {
        // Remove possíveis marcadores de código markdown
        const jsonString = aiResponse.replace(/```json\n?|\n?```/g, '').trim()
        parsed = JSON.parse(jsonString)
      } catch {
        console.error('Erro ao parsear resposta da IA:', aiResponse)
        return {
          valido: true,
          mensagem: 'Erro ao processar resposta da IA',
          valorExtraido: null,
          nomeExtraido: null,
          valorConfere: true,
        }
      }

      // Verificar se o valor confere (margem de 5%)
      const valorExtraido = parsed.valor
      let valorConfere = true
      let mensagem = ''

      if (!parsed.ehCupomValido) {
        return {
          valido: false,
          mensagem: parsed.motivo || 'A imagem não parece ser um cupom ou nota fiscal válido',
          valorExtraido: null,
          nomeExtraido: null,
          valorConfere: false,
        }
      }

      if (valorExtraido !== null && valorInformado > 0) {
        const diferenca = Math.abs(valorExtraido - valorInformado)
        const margemPermitida = valorInformado * 0.05 // 5% de margem

        if (diferenca > margemPermitida) {
          valorConfere = false
          mensagem = `O valor extraído (R$ ${valorExtraido.toFixed(2)}) difere do valor informado (R$ ${valorInformado.toFixed(2)})`
        } else {
          mensagem = 'Comprovante válido'
        }
      } else {
        mensagem = 'Comprovante analisado'
      }

      return {
        valido: true,
        mensagem,
        valorExtraido,
        nomeExtraido: parsed.nomeEstabelecimento,
        valorConfere,
      }
    } catch (error) {
      console.error('Erro ao analisar comprovante:', error)
      return {
        valido: true,
        mensagem: 'Erro na análise do comprovante',
        valorExtraido: null,
        nomeExtraido: null,
        valorConfere: true,
      }
    }
  })

  // Listar despesas
  app.get('/', async (request) => {
    const { vendedorId, mes, ano, tipo } = request.query as {
      vendedorId?: string
      mes?: string
      ano?: string
      tipo?: string
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

    const despesas = await db.despesa.findMany({
      where: {
        ...(vendedorId && { vendedorId }),
        ...(tipo && { tipo }),
        ...dataFilter,
      },
      include: {
        vendedor: { include: { user: { select: { name: true } } } },
      },
      orderBy: { data: 'desc' },
    })

    return despesas
  })

  // Resumo de despesas por vendedor
  app.get('/resumo', async (request) => {
    const { mes, ano } = request.query as { mes?: string; ano?: string }

    const mesAtual = mes ? parseInt(mes) : new Date().getMonth() + 1
    const anoAtual = ano ? parseInt(ano) : new Date().getFullYear()

    const vendedores = await db.vendedor.findMany({
      include: {
        user: { select: { name: true } },
        despesas: {
          where: {
            data: {
              gte: new Date(anoAtual, mesAtual - 1, 1),
              lt: new Date(anoAtual, mesAtual, 1),
            },
          },
        },
      },
    })

    const resultado = vendedores.map((vendedor) => {
      const totalDespesas = vendedor.despesas.reduce((acc, d) => acc + Number(d.valor), 0)

      // Agrupar por tipo
      const porTipo: Record<string, number> = {}
      vendedor.despesas.forEach((d) => {
        porTipo[d.tipo] = (porTipo[d.tipo] || 0) + Number(d.valor)
      })

      return {
        vendedor: {
          id: vendedor.id,
          name: vendedor.user.name,
        },
        totalDespesas,
        porTipo,
        quantidadeDespesas: vendedor.despesas.length,
      }
    })

    return {
      mes: mesAtual,
      ano: anoAtual,
      vendedores: resultado,
    }
  })

  // Criar despesa
  app.post('/', async (request, reply) => {
    const data = despesaSchema.parse(request.body)

    const despesa = await db.despesa.create({
      data: {
        vendedorId: data.vendedorId,
        data: data.data,
        tipo: data.tipo,
        descricao: data.descricao,
        valor: data.valor,
        comprovante: data.comprovante,
        validadoPorIA: data.validadoPorIA || false,
        valorExtraido: data.valorExtraido,
        nomeExtraido: data.nomeExtraido,
      },
    })

    return reply.status(201).send(despesa)
  })

  // Atualizar despesa
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = despesaSchema.partial().parse(request.body)

    const despesa = await db.despesa.update({
      where: { id },
      data,
    })

    return despesa
  })

  // Deletar despesa
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    await db.despesa.delete({ where: { id } })

    return reply.status(204).send()
  })
}

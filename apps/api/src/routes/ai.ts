import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const corrigirTextoSchema = z.object({
  texto: z.string().min(1, 'Texto é obrigatório'),
})

export async function aiRoutes(app: FastifyInstance) {
  // Corrigir texto com IA (Gemini)
  app.post('/corrigir-texto', async (request, reply) => {
    const { texto } = corrigirTextoSchema.parse(request.body)

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY

    if (!GEMINI_API_KEY) {
      // Se não tiver API key, retorna o texto original
      return { textoCorrigido: texto, corrigido: false }
    }

    try {
      console.log('Chamando Gemini API com key:', GEMINI_API_KEY.substring(0, 10) + '...')

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
                    text: `Corrija a gramática e ortografia do seguinte texto em português brasileiro. Mantenha o significado original e o tom informal se houver. Retorne APENAS o texto corrigido, sem explicações ou comentários adicionais.

Texto: "${texto}"`,
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
      console.log('Gemini response status:', response.status)
      console.log('Gemini response:', responseText.substring(0, 500))

      if (!response.ok) {
        console.error('Erro na API Gemini:', responseText)
        return { textoCorrigido: texto, corrigido: false, erro: responseText }
      }

      const data = JSON.parse(responseText)
      const textoCorrigido = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

      if (!textoCorrigido) {
        console.log('Texto corrigido não encontrado na resposta:', JSON.stringify(data))
        return { textoCorrigido: texto, corrigido: false }
      }

      return { textoCorrigido, corrigido: true }
    } catch (error) {
      console.error('Erro ao corrigir texto:', error)
      return { textoCorrigido: texto, corrigido: false, erro: String(error) }
    }
  })
}

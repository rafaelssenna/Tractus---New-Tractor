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
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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

      if (!response.ok) {
        console.error('Erro na API Gemini:', await response.text())
        return { textoCorrigido: texto, corrigido: false }
      }

      const data = await response.json()
      const textoCorrigido = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

      if (!textoCorrigido) {
        return { textoCorrigido: texto, corrigido: false }
      }

      return { textoCorrigido, corrigido: true }
    } catch (error) {
      console.error('Erro ao corrigir texto:', error)
      return { textoCorrigido: texto, corrigido: false }
    }
  })
}

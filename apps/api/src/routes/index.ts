import type { FastifyInstance } from 'fastify'
import { authRoutes } from './auth'
import { clientesRoutes } from './clientes'
import { vendedoresRoutes } from './vendedores'
import { laudosRoutes } from './laudos'
import { propostasRoutes } from './propostas'
import { visitasRoutes } from './visitas'
import { rotasRoutes } from './rotas'
import { metasRoutes } from './metas'
import { despesasRoutes } from './despesas'

export async function routes(app: FastifyInstance) {
  // API prefix
  app.register(async (api) => {
    api.register(authRoutes, { prefix: '/auth' })
    api.register(clientesRoutes, { prefix: '/clientes' })
    api.register(vendedoresRoutes, { prefix: '/vendedores' })
    api.register(laudosRoutes, { prefix: '/laudos' })
    api.register(propostasRoutes, { prefix: '/propostas' })
    api.register(visitasRoutes, { prefix: '/visitas' })
    api.register(rotasRoutes, { prefix: '/rotas' })
    api.register(metasRoutes, { prefix: '/metas' })
    api.register(despesasRoutes, { prefix: '/despesas' })
  }, { prefix: '/api' })
}

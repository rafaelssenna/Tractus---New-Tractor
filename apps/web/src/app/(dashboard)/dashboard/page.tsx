'use client'

import { useAuth } from '@/contexts/auth-context'
import { AdminDashboard, TecnicoDashboard, ComercialDashboard } from '@/components/dashboard'
import { Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Renderiza o dashboard baseado no perfil do usuário
  switch (user?.role) {
    case 'ADMIN':
    case 'DIRETOR':
      return <AdminDashboard />

    case 'COMERCIAL':
      return <ComercialDashboard />

    case 'TECNICO':
    case 'PRODUCAO':
    case 'QUALIDADE':
      return <TecnicoDashboard />

    case 'PCP':
      // PCP pode ver o dashboard de produção/técnico por enquanto
      return <TecnicoDashboard />

    case 'SUPRIMENTOS':
    case 'ALMOXARIFADO':
      // Suprimentos e almoxarifado podem ver dashboard técnico por enquanto
      return <TecnicoDashboard />

    case 'ORCAMENTO':
      // Orçamento vê o dashboard comercial pois lida com propostas
      return <ComercialDashboard />

    case 'FINANCEIRO':
    case 'RH':
      // Financeiro e RH veem dashboard admin simplificado por enquanto
      return <AdminDashboard />

    default:
      // Fallback para dashboard técnico (mais restrito)
      return <TecnicoDashboard />
  }
}

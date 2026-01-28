'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardList,
  Factory,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wrench,
  ArrowRight,
  Play,
  Pause,
  Timer,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

// Minhas O.S. - dados mockados (viriam da API filtrados pelo técnico logado)
const minhasOS = [
  {
    id: 'OS-1247',
    cliente: 'ARMAC',
    equipamento: 'Escavadeira CAT 320',
    tipo: 'Material Rodante',
    status: 'em_producao',
    prioridade: 'alta',
    previsao: '2 dias',
  },
  {
    id: 'OS-1245',
    cliente: 'Construtora ABC',
    equipamento: 'Retroescavadeira JCB 3CX',
    tipo: 'Manutenção Preventiva',
    status: 'aguardando_pecas',
    prioridade: 'media',
    previsao: '5 dias',
  },
  {
    id: 'OS-1243',
    cliente: 'Mineração XYZ',
    equipamento: 'Pá Carregadeira CAT 966',
    tipo: 'Reparo Hidráulico',
    status: 'em_producao',
    prioridade: 'urgente',
    previsao: '1 dia',
  },
  {
    id: 'OS-1240',
    cliente: 'Locadora Premium',
    equipamento: 'Trator Esteira D6',
    tipo: 'Material Rodante',
    status: 'inspecao',
    prioridade: 'baixa',
    previsao: '3 dias',
  },
]

// Estatísticas do técnico
const stats = [
  {
    title: 'Minhas O.S.',
    value: '4',
    subtitle: 'atribuídas',
    icon: ClipboardList,
    color: 'text-info',
    bgColor: 'bg-info/10',
    borderColor: 'border-info/20',
  },
  {
    title: 'Em Produção',
    value: '2',
    subtitle: 'em andamento',
    icon: Factory,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
  },
  {
    title: 'Aguardando Peças',
    value: '1',
    subtitle: 'pendente',
    icon: AlertTriangle,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/20',
  },
  {
    title: 'Finalizadas (Mês)',
    value: '12',
    subtitle: 'este mês',
    icon: CheckCircle,
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/20',
  },
]

// Inspeções pendentes
const inspecoesPendentes = [
  {
    id: 'INS-089',
    os: 'OS-1240',
    cliente: 'Locadora Premium',
    tipo: 'Inspeção Final',
    prazo: 'Hoje',
  },
  {
    id: 'INS-090',
    os: 'OS-1238',
    cliente: 'ARMAC',
    tipo: 'Teste de Campo',
    prazo: 'Amanhã',
  },
]

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'em_producao':
      return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Em Produção</Badge>
    case 'aguardando_pecas':
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Aguardando Peças</Badge>
    case 'inspecao':
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Inspeção</Badge>
    case 'finalizado':
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Finalizado</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const getPrioridadeBadge = (prioridade: string) => {
  switch (prioridade) {
    case 'urgente':
      return <Badge variant="destructive" className="text-[10px]">URGENTE</Badge>
    case 'alta':
      return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px]">Alta</Badge>
    case 'media':
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">Média</Badge>
    case 'baixa':
      return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-[10px]">Baixa</Badge>
    default:
      return null
  }
}

export function TecnicoDashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meu Painel</h1>
          <p className="text-muted-foreground mt-1">
            Olá, {user?.name || 'Técnico'}! Aqui estão suas O.S. e tarefas
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Atualizado há 2 minutos</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className={`relative overflow-hidden border ${stat.borderColor} ${stat.bgColor} backdrop-blur-sm`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {stat.title}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-bold ${stat.color}`}>{stat.value}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{stat.subtitle}</span>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Minhas O.S. */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                Minhas O.S.
              </CardTitle>
              <button className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todas <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {minhasOS.map((os) => (
                <div
                  key={os.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-primary">{os.id}</span>
                      {getPrioridadeBadge(os.prioridade)}
                    </div>
                    <p className="text-sm font-medium">{os.cliente}</p>
                    <p className="text-xs text-muted-foreground">{os.equipamento}</p>
                    <p className="text-xs text-muted-foreground mt-1">{os.tipo}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(os.status)}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Timer className="w-3 h-3" />
                      <span>{os.previsao}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Inspeções Pendentes */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-info" />
                Inspeções Pendentes
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inspecoesPendentes.map((inspecao) => (
                <div
                  key={inspecao.id}
                  className="p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-info">{inspecao.id}</span>
                    <Badge variant="outline" className="text-xs">
                      {inspecao.prazo}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{inspecao.cliente}</p>
                  <p className="text-xs text-muted-foreground">{inspecao.os}</p>
                  <p className="text-xs text-muted-foreground mt-1">{inspecao.tipo}</p>
                </div>
              ))}
              {inspecoesPendentes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Nenhuma inspeção pendente</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
              <div className="p-3 rounded-full bg-success/10">
                <Play className="w-5 h-5 text-success" />
              </div>
              <span className="text-sm font-medium">Iniciar O.S.</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
              <div className="p-3 rounded-full bg-warning/10">
                <Pause className="w-5 h-5 text-warning" />
              </div>
              <span className="text-sm font-medium">Pausar O.S.</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
              <div className="p-3 rounded-full bg-info/10">
                <CheckCircle className="w-5 h-5 text-info" />
              </div>
              <span className="text-sm font-medium">Registrar Inspeção</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <span className="text-sm font-medium">Reportar Problema</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

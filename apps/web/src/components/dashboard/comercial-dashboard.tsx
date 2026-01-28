'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  FileText,
  MapPin,
  DollarSign,
  Clock,
  ArrowRight,
  Calendar,
  TrendingUp,
  Building2,
  Phone,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// Propostas do vendedor - dados mockados (viriam da API filtrados pelo vendedor logado)
const minhasPropostas = [
  {
    id: 'PROP-2024-089',
    cliente: 'ARMAC Equipamentos',
    valor: 'R$ 45.000,00',
    status: 'aguardando',
    tipo: 'Material Rodante',
    data: '15/01/2025',
  },
  {
    id: 'PROP-2024-088',
    cliente: 'Construtora ABC',
    valor: 'R$ 28.500,00',
    status: 'em_analise',
    tipo: 'Manutenção Preventiva',
    data: '14/01/2025',
  },
  {
    id: 'PROP-2024-087',
    cliente: 'Mineração XYZ',
    valor: 'R$ 72.000,00',
    status: 'aprovada',
    tipo: 'Reforma Completa',
    data: '12/01/2025',
  },
]

// Visitas programadas
const visitasHoje = [
  {
    id: 1,
    cliente: 'Locadora Premium',
    horario: '09:00',
    endereco: 'Av. Industrial, 1500',
    tipo: 'Prospecção',
  },
  {
    id: 2,
    cliente: 'TransLog Ltda',
    horario: '14:00',
    endereco: 'Rod. BR-116, Km 45',
    tipo: 'Follow-up',
  },
  {
    id: 3,
    cliente: 'Agro Norte',
    horario: '16:30',
    endereco: 'Fazenda São João',
    tipo: 'Apresentação',
  },
]

// Meus clientes ativos
const meusClientes = [
  { nome: 'ARMAC Equipamentos', propostas: 3, ultimaVisita: '10/01/2025' },
  { nome: 'Construtora ABC', propostas: 2, ultimaVisita: '08/01/2025' },
  { nome: 'Mineração XYZ', propostas: 1, ultimaVisita: '05/01/2025' },
  { nome: 'Locadora Premium', propostas: 4, ultimaVisita: '03/01/2025' },
]

// Vendas por mês
const vendasPorMes = [
  { mes: 'Ago', valor: 120000 },
  { mes: 'Set', valor: 95000 },
  { mes: 'Out', valor: 145000 },
  { mes: 'Nov', valor: 180000 },
  { mes: 'Dez', valor: 210000 },
  { mes: 'Jan', valor: 85000 },
]

// Estatísticas do vendedor
const stats = [
  {
    title: 'Meus Clientes',
    value: '24',
    subtitle: 'ativos',
    icon: Users,
    color: 'text-info',
    bgColor: 'bg-info/10',
    borderColor: 'border-info/20',
  },
  {
    title: 'Propostas Abertas',
    value: '8',
    subtitle: 'em negociação',
    icon: FileText,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
  },
  {
    title: 'Visitas (Mês)',
    value: '15',
    subtitle: 'realizadas',
    icon: MapPin,
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/20',
  },
  {
    title: 'Faturamento',
    value: 'R$ 85k',
    subtitle: 'este mês',
    icon: DollarSign,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/20',
  },
]

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'aguardando':
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Aguardando</Badge>
    case 'em_analise':
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Em Análise</Badge>
    case 'aprovada':
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Aprovada</Badge>
    case 'recusada':
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Recusada</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function ComercialDashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel Comercial</h1>
          <p className="text-muted-foreground mt-1">
            Olá, {user?.name || 'Vendedor'}! Acompanhe suas vendas e visitas
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
        {/* Minhas Propostas */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Minhas Propostas
              </CardTitle>
              <button className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todas <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {minhasPropostas.map((proposta) => (
                <div
                  key={proposta.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-primary">{proposta.id}</span>
                    </div>
                    <p className="text-sm font-medium">{proposta.cliente}</p>
                    <p className="text-xs text-muted-foreground">{proposta.tipo}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(proposta.status)}
                    <span className="text-sm font-bold text-success">{proposta.valor}</span>
                    <span className="text-xs text-muted-foreground">{proposta.data}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Visitas de Hoje */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-success" />
                Visitas de Hoje
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {visitasHoje.map((visita) => (
                <div
                  key={visita.id}
                  className="p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{visita.cliente}</span>
                    <Badge variant="outline" className="text-xs">
                      {visita.horario}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <MapPin className="w-3 h-3" />
                    <span>{visita.endereco}</span>
                  </div>
                  <Badge className="bg-info/20 text-info border-info/30 text-[10px]">
                    {visita.tipo}
                  </Badge>
                </div>
              ))}
              {visitasHoje.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Nenhuma visita programada para hoje</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Vendas */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-success" />
                Minhas Vendas
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                Últimos 6 meses
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={vendasPorMes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                  <XAxis dataKey="mes" stroke="#71717A" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#71717A"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181B',
                      border: '1px solid #27272A',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Vendas']}
                  />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    stroke="#22C55E"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorVendas)"
                    name="Vendas"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Meus Clientes */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-info" />
                Meus Clientes
              </CardTitle>
              <button className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todos <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {meusClientes.map((cliente, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        {cliente.nome.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{cliente.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {cliente.propostas} propostas
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Última visita</p>
                    <p className="text-xs font-medium">{cliente.ultimaVisita}</p>
                  </div>
                </div>
              ))}
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
              <div className="p-3 rounded-full bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium">Nova Proposta</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
              <div className="p-3 rounded-full bg-success/10">
                <MapPin className="w-5 h-5 text-success" />
              </div>
              <span className="text-sm font-medium">Registrar Visita</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
              <div className="p-3 rounded-full bg-info/10">
                <Users className="w-5 h-5 text-info" />
              </div>
              <span className="text-sm font-medium">Novo Cliente</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
              <div className="p-3 rounded-full bg-warning/10">
                <Phone className="w-5 h-5 text-warning" />
              </div>
              <span className="text-sm font-medium">Agendar Ligação</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

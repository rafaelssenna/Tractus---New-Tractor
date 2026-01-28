'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardList,
  Factory,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  User,
  FileText,
  ArrowRight,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

// Dados para o gráfico de área - O.S. por mês
const osPerMonth = [
  { mes: 'Jul', abertas: 45, finalizadas: 38 },
  { mes: 'Ago', abertas: 52, finalizadas: 45 },
  { mes: 'Set', abertas: 48, finalizadas: 52 },
  { mes: 'Out', abertas: 61, finalizadas: 55 },
  { mes: 'Nov', abertas: 55, finalizadas: 58 },
  { mes: 'Dez', abertas: 67, finalizadas: 62 },
  { mes: 'Jan', abertas: 72, finalizadas: 47 },
]

// Dados para o gráfico de pizza - O.S. por status
const osByStatus = [
  { name: 'Aguardando Peças', value: 8, color: '#EF4444' },
  { name: 'Em Produção', value: 12, color: '#A855F7' },
  { name: 'Finalizado', value: 47, color: '#22C55E' },
  { name: 'Inspeção', value: 6, color: '#3B82F6' },
  { name: 'Orçamento', value: 15, color: '#8B5CF6' },
]

// Dados para barras horizontais - O.S. por setor
const osBySetor = [
  { setor: 'Comercial', quantidade: 8 },
  { setor: 'Suprimentos', quantidade: 12 },
  { setor: 'PCP', quantidade: 14 },
  { setor: 'Produção', quantidade: 18 },
  { setor: 'Qualidade', quantidade: 6 },
]

// Atividades recentes
const recentActivities = [
  {
    id: 1,
    tipo: 'os_criada',
    descricao: 'O.S. #1247 criada para ARMAC',
    tempo: '5 min',
    usuario: 'Roger',
    icon: FileText,
    color: 'text-info',
  },
  {
    id: 2,
    tipo: 'os_finalizada',
    descricao: 'O.S. #1243 finalizada - Material Rodante',
    tempo: '15 min',
    usuario: 'Joviano',
    icon: CheckCircle,
    color: 'text-success',
  },
  {
    id: 3,
    tipo: 'alerta',
    descricao: 'O.S. #1239 aguardando peças há 3 dias',
    tempo: '1 hora',
    usuario: 'Sistema',
    icon: AlertTriangle,
    color: 'text-destructive',
  },
  {
    id: 4,
    tipo: 'producao',
    descricao: 'O.S. #1245 iniciou produção',
    tempo: '2 horas',
    usuario: 'Suelen',
    icon: Factory,
    color: 'text-primary',
  },
]

const stats = [
  {
    title: 'O.S. Abertas',
    value: '24',
    change: '+3',
    changeType: 'increase' as const,
    subtitle: 'hoje',
    icon: ClipboardList,
    color: 'text-info',
    bgColor: 'bg-info/10',
    borderColor: 'border-info/20',
  },
  {
    title: 'Em Produção',
    value: '12',
    change: '5',
    changeType: 'warning' as const,
    subtitle: 'urgentes',
    icon: Factory,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
  },
  {
    title: 'Aguardando Peças',
    value: '8',
    change: '2',
    changeType: 'decrease' as const,
    subtitle: 'críticas',
    icon: AlertTriangle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/20',
  },
  {
    title: 'Finalizadas',
    value: '47',
    change: '+12%',
    changeType: 'increase' as const,
    subtitle: 'este mês',
    icon: CheckCircle,
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/20',
  },
]

const maxQuantidade = Math.max(...osBySetor.map((o) => o.quantidade))

export function AdminDashboard() {
  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Bem-vindo ao Tractus - Visão geral do sistema
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
                  <div className="flex items-center gap-1.5">
                    {stat.changeType === 'increase' && (
                      <TrendingUp className="w-3 h-3 text-success" />
                    )}
                    {stat.changeType === 'decrease' && (
                      <TrendingDown className="w-3 h-3 text-destructive" />
                    )}
                    {stat.changeType === 'warning' && (
                      <AlertTriangle className="w-3 h-3 text-warning" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        stat.changeType === 'increase'
                          ? 'text-success'
                          : stat.changeType === 'decrease'
                            ? 'text-destructive'
                            : 'text-warning'
                      }`}
                    >
                      {stat.change}
                    </span>
                    <span className="text-xs text-muted-foreground">{stat.subtitle}</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* O.S. por Mês - Area Chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">O.S. por Mês</CardTitle>
              <Badge variant="outline" className="text-xs">
                Últimos 7 meses
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={osPerMonth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAbertas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorFinalizadas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                  <XAxis dataKey="mes" stroke="#71717A" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717A" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181B',
                      border: '1px solid #27272A',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                    }}
                    labelStyle={{ color: '#FAFAFA' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="abertas"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorAbertas)"
                    name="Abertas"
                  />
                  <Area
                    type="monotone"
                    dataKey="finalizadas"
                    stroke="#22C55E"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorFinalizadas)"
                    name="Finalizadas"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-info" />
                <span className="text-sm text-muted-foreground">Abertas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success" />
                <span className="text-sm text-muted-foreground">Finalizadas</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* O.S. por Status - Pie Chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">O.S. por Status</CardTitle>
              <Badge variant="outline" className="text-xs">
                Total: 88
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72 flex items-center">
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={osByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {osByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181B',
                        border: '1px solid #27272A',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-3">
                {osByStatus.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* O.S. por Setor */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">O.S. por Setor</CardTitle>
              <Badge variant="outline" className="text-xs">
                Distribuição atual
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {osBySetor.map((item) => (
                <div key={item.setor} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{item.setor}</span>
                    <span className="text-sm font-bold text-primary">{item.quantidade}</span>
                  </div>
                  <div className="h-3 bg-secondary/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-700 ease-out group-hover:from-primary group-hover:to-primary"
                      style={{ width: `${(item.quantidade / maxQuantidade) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Atividades Recentes */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Atividades Recentes</CardTitle>
              <button className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todas <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={`p-2 rounded-lg bg-muted ${activity.color}`}>
                    <activity.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.descricao}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{activity.usuario}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{activity.tempo}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

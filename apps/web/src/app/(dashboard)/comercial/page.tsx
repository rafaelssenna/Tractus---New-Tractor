'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  Plus,
  Search,
  Filter,
  Target,
  Calendar,
  MapPin,
  Phone,
  Mail,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ChevronRight,
  Car,
  Clock,
  CheckCircle,
  AlertCircle,
  Route,
  ExternalLink,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

// Dados de metas por vendedor
const vendedoresMetas = [
  {
    id: 1,
    nome: 'Roger Fumega',
    foto: 'RF',
    metas: {
      rodante: { meta: 200000, realizado: 145000 },
      peca: { meta: 50000, realizado: 42000 },
      cilindro: { meta: 30000, realizado: 28000 },
    },
    visitasMes: 24,
    clientesAtivos: 12,
  },
  {
    id: 2,
    nome: 'Suelen Cerqueira',
    foto: 'SC',
    metas: {
      rodante: { meta: 150000, realizado: 98000 },
      peca: { meta: 40000, realizado: 35000 },
      cilindro: { meta: 0, realizado: 0 },
    },
    visitasMes: 18,
    clientesAtivos: 8,
  },
  {
    id: 3,
    nome: 'Joviano Rodrigues',
    foto: 'JR',
    metas: {
      rodante: { meta: 100000, realizado: 72000 },
      peca: { meta: 0, realizado: 0 },
      cilindro: { meta: 0, realizado: 0 },
    },
    visitasMes: 15,
    clientesAtivos: 6,
  },
]

// Dados para o gráfico de metas
const metasChartData = [
  { categoria: 'Rodante', meta: 450000, realizado: 315000 },
  { categoria: 'Peças', meta: 90000, realizado: 77000 },
  { categoria: 'Cilindros', meta: 30000, realizado: 28000 },
]

// Clientes
const clientes = [
  {
    id: 1,
    nome: 'ARMAC',
    contato: 'João Silva',
    telefone: '(31) 99999-0001',
    email: 'joao@armac.com',
    cidade: 'Belo Horizonte',
    osAbertas: 3,
    ultimaVisita: '2025-01-20',
    status: 'ativo',
    vendedor: 'Roger',
  },
  {
    id: 2,
    nome: 'TSL Engenharia',
    contato: 'Maria Santos',
    telefone: '(31) 99999-0002',
    email: 'maria@tsl.com',
    cidade: 'Contagem',
    osAbertas: 2,
    ultimaVisita: '2025-01-18',
    status: 'ativo',
    vendedor: 'Roger',
  },
  {
    id: 3,
    nome: 'Fagundes Terraplanagem',
    contato: 'Carlos Fagundes',
    telefone: '(31) 99999-0003',
    email: 'carlos@fagundes.com',
    cidade: 'Betim',
    osAbertas: 1,
    ultimaVisita: '2025-01-15',
    status: 'ativo',
    vendedor: 'Suelen',
  },
  {
    id: 4,
    nome: 'MRV Engenharia',
    contato: 'Ana Paula',
    telefone: '(31) 99999-0004',
    email: 'ana@mrv.com',
    cidade: 'Belo Horizonte',
    osAbertas: 4,
    ultimaVisita: '2025-01-22',
    status: 'ativo',
    vendedor: 'Roger',
  },
  {
    id: 5,
    nome: 'Construtora Delta',
    contato: 'Pedro Lima',
    telefone: '(31) 99999-0005',
    email: 'pedro@delta.com',
    cidade: 'Santa Luzia',
    osAbertas: 0,
    ultimaVisita: '2025-01-10',
    status: 'inativo',
    vendedor: 'Joviano',
  },
  {
    id: 6,
    nome: 'IRMEN',
    contato: 'Roberto Costa',
    telefone: '(31) 99999-0006',
    email: 'roberto@irmen.com',
    cidade: 'Ipatinga',
    osAbertas: 2,
    ultimaVisita: '2025-01-19',
    status: 'ativo',
    vendedor: 'Suelen',
  },
]

// Orçamentos pendentes
const orcamentos = [
  {
    id: 'ORC-2025-001',
    cliente: 'ARMAC',
    descricao: 'Material Rodante - Escavadeira CAT 320',
    valor: 85000,
    data: '2025-01-20',
    status: 'pendente',
    vendedor: 'Roger',
  },
  {
    id: 'ORC-2025-002',
    cliente: 'TSL Engenharia',
    descricao: 'Reforma de Caçamba - PC200',
    valor: 32000,
    data: '2025-01-18',
    status: 'aprovado',
    vendedor: 'Roger',
  },
  {
    id: 'ORC-2025-003',
    cliente: 'MRV Engenharia',
    descricao: 'Peças de Reposição',
    valor: 15000,
    data: '2025-01-22',
    status: 'pendente',
    vendedor: 'Suelen',
  },
]

// Visitas da semana
const visitasSemana = [
  { dia: 'Seg', cliente: 'ARMAC', horario: '09:00', vendedor: 'Roger', tipo: 'Prospecção' },
  { dia: 'Seg', cliente: 'TSL', horario: '14:00', vendedor: 'Roger', tipo: 'Laudo' },
  { dia: 'Ter', cliente: 'MRV', horario: '10:00', vendedor: 'Suelen', tipo: 'Entrega' },
  { dia: 'Qua', cliente: 'IRMEN', horario: '08:00', vendedor: 'Suelen', tipo: 'Prospecção' },
  { dia: 'Qui', cliente: 'Fagundes', horario: '11:00', vendedor: 'Joviano', tipo: 'Laudo' },
]

const stats = [
  {
    title: 'Clientes Ativos',
    value: '32',
    change: '+5',
    icon: Users,
    color: 'text-info',
    bgColor: 'bg-info/10',
    borderColor: 'border-info/20',
  },
  {
    title: 'Orçamentos Pendentes',
    value: '8',
    change: '3 urgentes',
    icon: FileText,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
  },
  {
    title: 'Faturamento (Mês)',
    value: 'R$ 420k',
    change: '+18%',
    icon: DollarSign,
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/20',
  },
  {
    title: 'Meta Atingida',
    value: '74%',
    change: 'R$ 570k meta',
    icon: Target,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
  },
]

type TabType = 'overview' | 'clientes' | 'orcamentos' | 'visitas'

export default function ComercialPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [search, setSearch] = useState('')

  const filteredClientes = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.contato.toLowerCase().includes(search.toLowerCase()) ||
      c.cidade.toLowerCase().includes(search.toLowerCase())
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getPercentage = (realizado: number, meta: number) => {
    if (meta === 0) return 0
    return Math.round((realizado / meta) * 100)
  }

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comercial</h1>
          <p className="text-muted-foreground mt-1">
            Gestão de vendas, clientes e metas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Janeiro 2025
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className={`border ${stat.borderColor} ${stat.bgColor} backdrop-blur-sm`}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {[
          { id: 'overview', label: 'Visão Geral', icon: TrendingUp },
          { id: 'clientes', label: 'Clientes', icon: Users },
          { id: 'orcamentos', label: 'Orçamentos', icon: FileText },
          { id: 'visitas', label: 'Visitas', icon: Car },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metas por Vendedor */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-semibold">Metas por Vendedor</h3>
            {vendedoresMetas.map((vendedor) => {
              const totalMeta =
                vendedor.metas.rodante.meta +
                vendedor.metas.peca.meta +
                vendedor.metas.cilindro.meta
              const totalRealizado =
                vendedor.metas.rodante.realizado +
                vendedor.metas.peca.realizado +
                vendedor.metas.cilindro.realizado
              const percentualTotal = getPercentage(totalRealizado, totalMeta)

              return (
                <Card key={vendedor.id} className="border-border/50">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {vendedor.foto}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{vendedor.nome}</h4>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {vendedor.visitasMes} visitas
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {vendedor.clientesAtivos} clientes
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={`text-2xl font-bold ${percentualTotal >= 80 ? 'text-success' : percentualTotal >= 50 ? 'text-primary' : 'text-destructive'}`}
                            >
                              {percentualTotal}%
                            </span>
                            <p className="text-xs text-muted-foreground">da meta</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {vendedor.metas.rodante.meta > 0 && (
                            <div className="flex items-center gap-3">
                              <span className="text-xs w-16 text-muted-foreground">Rodante</span>
                              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full"
                                  style={{
                                    width: `${getPercentage(vendedor.metas.rodante.realizado, vendedor.metas.rodante.meta)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs w-20 text-right">
                                {formatCurrency(vendedor.metas.rodante.realizado)}
                              </span>
                            </div>
                          )}
                          {vendedor.metas.peca.meta > 0 && (
                            <div className="flex items-center gap-3">
                              <span className="text-xs w-16 text-muted-foreground">Peças</span>
                              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-info/80 to-info rounded-full"
                                  style={{
                                    width: `${getPercentage(vendedor.metas.peca.realizado, vendedor.metas.peca.meta)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs w-20 text-right">
                                {formatCurrency(vendedor.metas.peca.realizado)}
                              </span>
                            </div>
                          )}
                          {vendedor.metas.cilindro.meta > 0 && (
                            <div className="flex items-center gap-3">
                              <span className="text-xs w-16 text-muted-foreground">Cilindros</span>
                              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-success/80 to-success rounded-full"
                                  style={{
                                    width: `${getPercentage(vendedor.metas.cilindro.realizado, vendedor.metas.cilindro.meta)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs w-20 text-right">
                                {formatCurrency(vendedor.metas.cilindro.realizado)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Gráfico de Metas */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Meta vs Realizado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={metasChartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                      <XAxis dataKey="categoria" stroke="#71717A" fontSize={11} tickLine={false} />
                      <YAxis stroke="#71717A" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181B',
                          border: '1px solid #27272A',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Bar dataKey="meta" fill="#27272A" radius={[4, 4, 0, 0]} name="Meta" />
                      <Bar dataKey="realizado" fill="#FACC15" radius={[4, 4, 0, 0]} name="Realizado" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Visitas da Semana */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Visitas da Semana</CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs">
                    Ver rota
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {visitasSemana.slice(0, 4).map((visita, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                        <span className="text-[10px] text-primary font-medium">{visita.dia}</span>
                        <span className="text-xs font-bold text-primary">{visita.horario.split(':')[0]}h</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{visita.cliente}</p>
                        <p className="text-xs text-muted-foreground">{visita.tipo}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {visita.vendedor}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'clientes' && (
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar clientes..."
                    className="pl-10 w-72 bg-muted/50"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                </Button>
              </div>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-y border-border bg-muted/30">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Contato
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Cidade
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Vendedor
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      OS Abertas
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredClientes.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium">{cliente.nome}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" />
                            {cliente.email}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-sm">{cliente.contato}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />
                            {cliente.telefone}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          {cliente.cidade}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="outline" className="text-xs">
                          {cliente.vendedor}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <Badge
                          className={`text-xs ${
                            cliente.osAbertas > 2
                              ? 'bg-destructive/20 text-destructive border-destructive/30'
                              : cliente.osAbertas > 0
                                ? 'bg-primary/20 text-primary border-primary/30'
                                : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {cliente.osAbertas}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <Badge
                          className={`text-xs ${
                            cliente.status === 'ativo'
                              ? 'bg-success/20 text-success border-success/30'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {cliente.status === 'ativo' ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Ativo
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Inativo
                            </span>
                          )}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'orcamentos' && (
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar orçamentos..." className="pl-10 w-72 bg-muted/50" />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                </Button>
              </div>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Novo Orçamento
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-y border-border bg-muted/30">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Código
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Data
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orcamentos.map((orc) => (
                    <tr key={orc.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-4">
                        <span className="font-mono text-sm font-medium text-primary">{orc.id}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-medium">{orc.cliente}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-muted-foreground">{orc.descricao}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-semibold">{formatCurrency(orc.valor)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(orc.data).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <Badge
                          className={`text-xs ${
                            orc.status === 'aprovado'
                              ? 'bg-success/20 text-success border-success/30'
                              : orc.status === 'pendente'
                                ? 'bg-primary/20 text-primary border-primary/30'
                                : 'bg-destructive/20 text-destructive border-destructive/30'
                          }`}
                        >
                          {orc.status === 'aprovado' ? 'Aprovado' : orc.status === 'pendente' ? 'Pendente' : 'Reprovado'}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'visitas' && (
        <div className="space-y-6">
          {/* Action buttons */}
          <div className="flex gap-3">
            <Button onClick={() => router.push('/comercial/visitas')}>
              <Car className="w-4 h-4 mr-2" />
              Gerenciar Visitas
              <ExternalLink className="w-3 h-3 ml-2" />
            </Button>
            <Button variant="outline" onClick={() => router.push('/comercial/rotas')}>
              <Route className="w-4 h-4 mr-2" />
              Configurar Rotas
              <ExternalLink className="w-3 h-3 ml-2" />
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].map((dia) => {
              const visitasDia = visitasSemana.filter((v) => v.dia === dia)
              return (
                <Card key={dia} className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-center">{dia}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2">
                    {visitasDia.length > 0 ? (
                      <div className="space-y-2">
                        {visitasDia.map((visita, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-lg bg-primary/10 border border-primary/20"
                          >
                            <p className="text-xs font-medium">{visita.cliente}</p>
                            <p className="text-[10px] text-muted-foreground">{visita.horario}</p>
                            <Badge className="text-[9px] mt-1" variant="outline">
                              {visita.vendedor}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Sem visitas
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
            <Card className="lg:col-span-2 border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Rota Semanal</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => router.push('/comercial/rotas')}
                  >
                    Editar
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {visitasSemana.map((visita, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                        {visita.vendedor[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{visita.cliente}</p>
                        <p className="text-xs text-muted-foreground">
                          {visita.dia} - {visita.horario}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {visita.tipo}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  Loader2,
  CheckCircle,
  Wrench,
  Route,
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

const API_URL = process.env.NEXT_PUBLIC_API_URL

interface Cliente {
  id: string
  nome: string
  cidade: string | null
  observacoes: string | null
}

interface RotaCliente {
  id: string
  cliente: Cliente
  ordem: number
}

interface Rota {
  id: string
  nome: string
  vendedor: {
    id: string
    userId: string
    name: string
  }
  clientesPorDia: {
    SEGUNDA: RotaCliente[]
    TERCA: RotaCliente[]
    QUARTA: RotaCliente[]
    QUINTA: RotaCliente[]
    SEXTA: RotaCliente[]
    SABADO: RotaCliente[]
  }
  totalClientes: number
}

interface Proposta {
  id: string
  numero: string
  cliente: { nome: string }
  valorTotal: number
  status: string
  createdAt: string
}

interface ClienteComPropostas {
  id: string
  nome: string
  cidade: string | null
  observacoes?: string | null
  _count?: { propostas: number }
  propostas?: { createdAt: string }[]
}

// Vendas por mês - dados mockados por enquanto
const vendasPorMes = [
  { mes: 'Ago', valor: 120000 },
  { mes: 'Set', valor: 95000 },
  { mes: 'Out', valor: 145000 },
  { mes: 'Nov', valor: 180000 },
  { mes: 'Dez', valor: 210000 },
  { mes: 'Jan', valor: 85000 },
]

const getDiaSemanaAtual = (): string => {
  const diasMap: Record<number, string> = {
    0: 'DOMINGO',
    1: 'SEGUNDA',
    2: 'TERCA',
    3: 'QUARTA',
    4: 'QUINTA',
    5: 'SEXTA',
    6: 'SABADO',
  }
  return diasMap[new Date().getDay()] || 'DOMINGO'
}

const diasSemanaLabel: Record<string, string> = {
  DOMINGO: 'Domingo',
  SEGUNDA: 'Segunda-feira',
  TERCA: 'Terca-feira',
  QUARTA: 'Quarta-feira',
  QUINTA: 'Quinta-feira',
  SEXTA: 'Sexta-feira',
  SABADO: 'Sabado',
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'AGUARDANDO':
    case 'aguardando':
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Aguardando</Badge>
    case 'EM_ANALISE':
    case 'em_analise':
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Em Analise</Badge>
    case 'APROVADA':
    case 'aprovada':
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Aprovada</Badge>
    case 'RECUSADA':
    case 'recusada':
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Recusada</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function ComercialDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [rota, setRota] = useState<Rota | null>(null)
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [clientes, setClientes] = useState<ClienteComPropostas[]>([])
  const [clientesComInspecao, setClientesComInspecao] = useState<Record<string, string>>({})

  // Clientes visitados hoje (localStorage)
  const [clientesVisitadosHoje, setClientesVisitadosHoje] = useState<string[]>([])

  const diaSemanaAtual = getDiaSemanaAtual()
  const clientesHoje = rota?.clientesPorDia[diaSemanaAtual as keyof typeof rota.clientesPorDia] || []

  useEffect(() => {
    // Carregar visitados do localStorage
    const hoje = new Date().toISOString().split('T')[0]
    const storageKey = `visitados_${hoje}`
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      setClientesVisitadosHoje(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Buscar rota do vendedor
      const rotasRes = await fetch(`${API_URL}/rotas`)
      if (rotasRes.ok) {
        const rotasData = await rotasRes.json()
        const minhaRota = rotasData.find((r: Rota) => r.vendedor.userId === user?.id)
        if (minhaRota) {
          setRota(minhaRota)

          // Buscar inspecoes
          const inspecoesRes = await fetch(`${API_URL}/visitas-tecnicas?vendedorId=${minhaRota.vendedor.id}`)
          if (inspecoesRes.ok) {
            const inspecoesData = await inspecoesRes.json()
            const mapa: Record<string, string> = {}
            inspecoesData.forEach((vt: any) => {
              if (vt.status !== 'CANCELADA') {
                mapa[vt.clienteId] = vt.status
              }
            })
            setClientesComInspecao(mapa)
          }
        }
      }

      // Buscar propostas do vendedor
      const propostasRes = await fetch(`${API_URL}/propostas?limit=5`)
      if (propostasRes.ok) {
        const propostasData = await propostasRes.json()
        // Filtrar por vendedor logado se tiver esse campo
        setPropostas(propostasData.slice(0, 3))
      }

      // Buscar clientes
      const clientesRes = await fetch(`${API_URL}/clientes?limit=10`)
      if (clientesRes.ok) {
        const clientesData = await clientesRes.json()
        setClientes(clientesData.slice(0, 4))
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calcular estatisticas
  const totalClientes = rota?.totalClientes || clientes.length
  const propostasAbertas = propostas.filter(p =>
    p.status === 'AGUARDANDO' || p.status === 'EM_ANALISE' || p.status === 'aguardando' || p.status === 'em_analise'
  ).length
  const visitasHoje = clientesHoje.length
  const visitasRealizadas = clientesVisitadosHoje.length

  const stats = [
    {
      title: 'Meus Clientes',
      value: totalClientes.toString(),
      subtitle: 'na rota',
      icon: Users,
      color: 'text-info',
      bgColor: 'bg-info/10',
      borderColor: 'border-info/20',
    },
    {
      title: 'Propostas Abertas',
      value: propostasAbertas.toString(),
      subtitle: 'em negociacao',
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
    },
    {
      title: 'Visitas Hoje',
      value: `${visitasRealizadas}/${visitasHoje}`,
      subtitle: diaSemanaAtual !== 'DOMINGO' ? diasSemanaLabel[diaSemanaAtual] : 'Sem visitas',
      icon: MapPin,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/20',
    },
    {
      title: 'Faturamento',
      value: 'R$ --',
      subtitle: 'em breve',
      icon: DollarSign,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/20',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel Comercial</h1>
          <p className="text-muted-foreground mt-1">
            Ola, {user?.name || 'Vendedor'}! Acompanhe suas vendas e visitas
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Atualizado agora</span>
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
              <button
                onClick={() => router.push('/comercial/propostas')}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Ver todas <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {propostas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhuma proposta encontrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {propostas.map((proposta) => (
                  <div
                    key={proposta.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-primary">{proposta.numero}</span>
                      </div>
                      <p className="text-sm font-medium">{proposta.cliente?.nome || 'Cliente'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(proposta.status)}
                      <span className="text-sm font-bold text-success">
                        {proposta.valorTotal ? `R$ ${proposta.valorTotal.toLocaleString('pt-BR')}` : '--'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(proposta.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => router.push('/comercial/rotas')}
              >
                <Route className="w-3 h-3 mr-1" />
                Ver Rota
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {diaSemanaAtual === 'DOMINGO' ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Domingo - sem visitas programadas</p>
              </div>
            ) : clientesHoje.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhuma visita programada para hoje</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => router.push('/comercial/rotas')}
                >
                  Configurar Rota
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {clientesHoje.slice(0, 4).map((rc, index) => {
                  const jaVisitou = clientesVisitadosHoje.includes(rc.cliente.id)
                  const statusInspecao = clientesComInspecao[rc.cliente.id]

                  return (
                    <div
                      key={rc.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        jaVisitou
                          ? statusInspecao === 'PENDENTE' ? 'border-[#FACC15]/30 bg-[#FACC15]/5'
                            : 'border-success/30 bg-success/5'
                          : 'border-border/50 hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            jaVisitou ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'
                          }`}>
                            {jaVisitou ? <CheckCircle className="w-3 h-3" /> : index + 1}
                          </div>
                          <span className={`font-medium text-sm ${jaVisitou ? 'line-through text-muted-foreground' : ''}`}>
                            {rc.cliente.nome}
                          </span>
                        </div>
                        {statusInspecao === 'PENDENTE' && (
                          <Badge className="bg-[#FACC15]/20 text-[#FACC15] border-[#FACC15]/30 text-[10px]">
                            <Wrench className="w-2.5 h-2.5 mr-1" />
                            Inspetor
                          </Badge>
                        )}
                      </div>
                      {rc.cliente.cidade && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground ml-8">
                          <MapPin className="w-3 h-3" />
                          <span>{rc.cliente.cidade}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
                {clientesHoje.length > 4 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => router.push('/comercial/rotas')}
                  >
                    Ver mais {clientesHoje.length - 4} clientes
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafico de Vendas */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-success" />
                Minhas Vendas
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                Ultimos 6 meses
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
              <button
                onClick={() => router.push('/comercial/clientes')}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Ver todos <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {clientes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhum cliente encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientes.map((cliente) => (
                  <div
                    key={cliente.id}
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
                          {cliente.cidade || 'Sem cidade'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {cliente._count?.propostas !== undefined ? (
                        <>
                          <p className="text-xs text-muted-foreground">Propostas</p>
                          <p className="text-xs font-medium">{cliente._count.propostas}</p>
                        </>
                      ) : cliente.observacoes ? (
                        <>
                          <p className="text-xs text-muted-foreground">Anotacao</p>
                          <p className="text-xs font-medium text-[#3B82F6] truncate max-w-[100px]">
                            {cliente.observacoes.slice(0, 20)}...
                          </p>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  FileText,
  DollarSign,
  Plus,
  Target,
  Calendar,
  MapPin,
  ChevronRight,
  Loader2,
  Route,
  CheckCircle,
  Circle,
  Clock,
  Building2,
} from 'lucide-react'
import Link from 'next/link'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface Vendedor {
  id: string
  user: { name: string; photo?: string }
  _count: { clientes: number; propostas: number }
}

interface MetaDashboard {
  mes: number
  ano: number
  vendedores: {
    vendedor: { id: string; name: string; photo?: string }
    metaTotal: number
    vendidoTotal: number
    percentualTotal: number
    porCategoria: { categoria: string; meta: number; realizado: number; percentual: number }[]
  }[]
}

interface ClienteRota {
  id: string
  nome: string
  cidade?: string
  ordem: number
  visita: {
    id: string
    status: string
    checkIn?: string
    checkOut?: string
  } | null
}

interface RotaDoDia {
  vendedorId: string
  vendedorNome: string
  diaSemana: string
  clientesProgramados: ClienteRota[]
  estatisticas: {
    programadas: number
    realizadas: number
    pendentes: number
  }
}

interface RotaProximoDia {
  data: Date
  diaSemana: string
  clientes: {
    id: string
    nome: string
    cidade?: string
    vendedorNome: string
  }[]
}

export default function ComercialPage() {
  const [loading, setLoading] = useState(true)
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [clientesCount, setClientesCount] = useState(0)
  const [propostasPendentes, setPropostasPendentes] = useState(0)
  const [metasDashboard, setMetasDashboard] = useState<MetaDashboard | null>(null)
  const [rotasHoje, setRotasHoje] = useState<RotaDoDia[]>([])
  const [proximasRotas, setProximasRotas] = useState<RotaProximoDia[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL

      const hoje = new Date()

      // Buscar dados básicos em paralelo
      const [vendedoresRes, clientesRes, propostasRes, metasRes] = await Promise.all([
        fetch(`${apiUrl}/vendedores`),
        fetch(`${apiUrl}/clientes`),
        fetch(`${apiUrl}/propostas?status=EM_ABERTO`),
        fetch(`${apiUrl}/metas/dashboard`),
      ])

      let vendedoresList: Vendedor[] = []

      if (vendedoresRes.ok) {
        vendedoresList = await vendedoresRes.json()
        setVendedores(vendedoresList)
      }

      if (clientesRes.ok) {
        const data = await clientesRes.json()
        setClientesCount(data.length)
      }

      if (propostasRes.ok) {
        const data = await propostasRes.json()
        setPropostasPendentes(data.length)
      }

      if (metasRes.ok) {
        const data = await metasRes.json()
        setMetasDashboard(data)
      }

      // Buscar rota do dia para cada vendedor
      if (vendedoresList.length > 0) {
        const rotasPromises = vendedoresList.map(async (v) => {
          try {
            const res = await fetch(`${apiUrl}/visitas/rota-do-dia?vendedorId=${v.id}`)
            if (res.ok) {
              const data = await res.json()
              return {
                vendedorId: v.id,
                vendedorNome: v.user.name,
                diaSemana: data.diaSemana,
                clientesProgramados: data.clientesProgramados || [],
                estatisticas: data.estatisticas || { programadas: 0, realizadas: 0, pendentes: 0 },
              }
            }
          } catch (e) {
            console.error(`Erro ao buscar rota do vendedor ${v.id}:`, e)
          }
          return null
        })

        const rotasResults = await Promise.all(rotasPromises)
        const rotasValidas = rotasResults.filter((r): r is RotaDoDia => r !== null && r.clientesProgramados.length > 0)
        setRotasHoje(rotasValidas)

        // Buscar rotas dos próximos dias (amanhã até fim da semana/próximos 5 dias úteis)
        const diasSemanaLabel = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
        const proximasDatas: Date[] = []

        // Pegar os próximos 5 dias úteis (excluindo domingo)
        let diaAtual = new Date(hoje)
        while (proximasDatas.length < 5) {
          diaAtual.setDate(diaAtual.getDate() + 1)
          if (diaAtual.getDay() !== 0) { // Não é domingo
            proximasDatas.push(new Date(diaAtual))
          }
        }

        const rotasProximosDias: RotaProximoDia[] = []

        for (const data of proximasDatas) {
          const dataStr = data.toISOString().split('T')[0]
          const clientesDoDia: { id: string; nome: string; cidade?: string; vendedorNome: string }[] = []

          // Buscar rota de cada vendedor para esse dia
          for (const v of vendedoresList) {
            try {
              const res = await fetch(`${apiUrl}/visitas/rota-do-dia?vendedorId=${v.id}&data=${dataStr}`)
              if (res.ok) {
                const rotaData = await res.json()
                if (rotaData.clientesProgramados?.length > 0) {
                  rotaData.clientesProgramados.forEach((c: ClienteRota) => {
                    clientesDoDia.push({
                      id: c.id,
                      nome: c.nome,
                      cidade: c.cidade,
                      vendedorNome: v.user.name,
                    })
                  })
                }
              }
            } catch (e) {
              // Ignora erro
            }
          }

          if (clientesDoDia.length > 0) {
            rotasProximosDias.push({
              data,
              diaSemana: diasSemanaLabel[data.getDay()] || '',
              clientes: clientesDoDia,
            })
          }
        }

        setProximasRotas(rotasProximosDias)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calcular totais
  const totalClientes = vendedores.reduce((acc, v) => acc + v._count.clientes, 0)
  const faturamentoMes = metasDashboard?.vendedores.reduce((acc, v) => acc + v.vendidoTotal, 0) || 0
  const metaTotal = metasDashboard?.vendedores.reduce((acc, v) => acc + v.metaTotal, 0) || 0
  const percentualMeta = metaTotal > 0 ? Math.round((faturamentoMes / metaTotal) * 100) : 0

  // Totais da rota de hoje
  const totalProgramadas = rotasHoje.reduce((acc, r) => acc + r.estatisticas.programadas, 0)
  const totalRealizadas = rotasHoje.reduce((acc, r) => acc + r.estatisticas.realizadas, 0)

  // Dia da semana atual
  const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
  const hoje = new Date()
  const diaSemanaAtual = diasSemana[hoje.getDay()]

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}k`
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const stats = [
    {
      title: 'Clientes Ativos',
      value: clientesCount > 0 ? clientesCount.toString() : totalClientes.toString(),
      change: `${vendedores.length} vendedores`,
      icon: Users,
      color: 'text-info',
      bgColor: 'bg-info/10',
      borderColor: 'border-info/20',
    },
    {
      title: 'Orçamentos Pendentes',
      value: propostasPendentes.toString(),
      change: 'aguardando resposta',
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
    },
    {
      title: 'Faturamento (Mês)',
      value: formatCurrency(faturamentoMes),
      change: metasDashboard ? `${metasDashboard.mes}/${metasDashboard.ano}` : '-',
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/20',
    },
    {
      title: 'Meta Atingida',
      value: `${percentualMeta}%`,
      change: metaTotal > 0 ? `Meta: ${formatCurrency(metaTotal)}` : 'Sem meta definida',
      icon: Target,
      color: percentualMeta >= 100 ? 'text-success' : percentualMeta >= 70 ? 'text-primary' : 'text-warning',
      bgColor: percentualMeta >= 100 ? 'bg-success/10' : percentualMeta >= 70 ? 'bg-primary/10' : 'bg-warning/10',
      borderColor: percentualMeta >= 100 ? 'border-success/20' : percentualMeta >= 70 ? 'border-primary/20' : 'border-warning/20',
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
          <h1 className="text-3xl font-bold tracking-tight">Comercial</h1>
          <p className="text-muted-foreground mt-1">
            Gestão de vendas, clientes e metas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            {metasDashboard ? `${['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][metasDashboard.mes]} ${metasDashboard.ano}` : 'Janeiro 2025'}
          </Button>
          <Link href="/comercial/clientes">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </Link>
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

      {/* Metas + Gráfico */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metas por Vendedor */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Metas por Vendedor</CardTitle>
                <Link href="/comercial/vendedores">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Ver vendedores
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {vendedores.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center text-center">
                  <Users className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                  <p className="text-muted-foreground">Nenhum vendedor cadastrado</p>
                  <Link href="/comercial/vendedores">
                    <Button variant="outline" size="sm" className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Vendedor
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {metasDashboard?.vendedores.map((v) => (
                    <div key={v.vendedor.id} className="p-4 rounded-lg border border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">
                              {v.vendedor.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{v.vendedor.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Meta: {formatCurrency(v.metaTotal)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-success">
                            {formatCurrency(v.vendidoTotal)}
                          </p>
                          <Badge
                            className={
                              v.percentualTotal >= 100
                                ? 'bg-success/20 text-success'
                                : v.percentualTotal >= 70
                                  ? 'bg-primary/20 text-primary'
                                  : 'bg-warning/20 text-warning'
                            }
                          >
                            {v.percentualTotal.toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                      <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            v.percentualTotal >= 100
                              ? 'bg-success'
                              : v.percentualTotal >= 70
                                ? 'bg-primary'
                                : 'bg-warning'
                          }`}
                          style={{ width: `${Math.min(v.percentualTotal, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {(!metasDashboard || metasDashboard.vendedores.length === 0) && vendedores.length > 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p>Nenhuma meta definida para este mês</p>
                      <p className="text-xs mt-1">Configure as metas dos vendedores</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Metas */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Meta vs Realizado</CardTitle>
          </CardHeader>
          <CardContent>
            {metasDashboard && metasDashboard.vendedores.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={metasDashboard.vendedores.map(v => ({
                      name: v.vendedor.name.split(' ')[0],
                      meta: v.metaTotal / 1000,
                      realizado: v.vendidoTotal / 1000,
                    }))}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                    <XAxis dataKey="name" stroke="#71717A" fontSize={11} tickLine={false} />
                    <YAxis stroke="#71717A" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}k`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181B',
                        border: '1px solid #27272A',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`R$ ${value.toFixed(0)}k`, '']}
                    />
                    <Bar dataKey="meta" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Meta" />
                    <Bar dataKey="realizado" fill="#22C55E" radius={[4, 4, 0, 0]} name="Realizado" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Sem dados para exibir</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rota de Hoje + Próximas Visitas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rota de Hoje */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Route className="w-5 h-5 text-primary" />
                  Rota de Hoje
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{diaSemanaAtual}, {hoje.toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="flex items-center gap-2">
                {totalProgramadas > 0 && (
                  <Badge className="bg-primary/20 text-primary">
                    {totalRealizadas}/{totalProgramadas} visitas
                  </Badge>
                )}
                <Link href="/comercial/rotas">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Ver rotas
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {rotasHoje.length > 0 ? (
              <div className="space-y-4">
                {rotasHoje.map((rota) => (
                  <div key={rota.vendedorId} className="border border-border/50 rounded-lg overflow-hidden">
                    <div className="bg-muted/30 px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">
                            {rota.vendedorNome.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium text-sm">{rota.vendedorNome}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {rota.estatisticas.realizadas}/{rota.estatisticas.programadas}
                      </Badge>
                    </div>
                    <div className="divide-y divide-border/50">
                      {rota.clientesProgramados.map((cliente) => (
                        <div
                          key={cliente.id}
                          className={`px-4 py-3 flex items-center justify-between ${
                            cliente.visita?.status === 'concluida' ? 'bg-success/5' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {cliente.visita?.status === 'concluida' ? (
                              <CheckCircle className="w-5 h-5 text-success" />
                            ) : cliente.visita?.status === 'em_andamento' ? (
                              <Clock className="w-5 h-5 text-primary animate-pulse" />
                            ) : (
                              <Circle className="w-5 h-5 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-medium text-sm">{cliente.nome}</p>
                              {cliente.cidade && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {cliente.cidade}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              cliente.visita?.status === 'concluida'
                                ? 'border-success/50 text-success'
                                : cliente.visita?.status === 'em_andamento'
                                  ? 'border-primary/50 text-primary'
                                  : ''
                            }`}
                          >
                            {cliente.visita?.status === 'concluida'
                              ? 'Concluída'
                              : cliente.visita?.status === 'em_andamento'
                                ? 'Em andamento'
                                : 'Pendente'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Route className="w-12 h-12 text-muted-foreground mb-3 opacity-20" />
                <p className="text-muted-foreground">Nenhuma rota configurada para hoje</p>
                <p className="text-xs text-muted-foreground mt-1">Configure as rotas semanais dos vendedores</p>
                <Link href="/comercial/rotas">
                  <Button variant="outline" size="sm" className="mt-4">
                    Configurar rotas
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximas Rotas */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-info" />
                  Próximas Rotas
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Rotas programadas para os próximos dias</p>
              </div>
              <Link href="/comercial/rotas">
                <Button variant="ghost" size="sm" className="text-xs">
                  Ver rotas
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {proximasRotas.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {proximasRotas.map((rota) => (
                  <div key={rota.data.toISOString()} className="border border-border/50 rounded-lg overflow-hidden">
                    <div className="bg-muted/30 px-4 py-2 flex items-center gap-3">
                      <div className="text-center min-w-[45px]">
                        <p className="text-[10px] text-muted-foreground uppercase">{rota.diaSemana}</p>
                        <p className="text-xl font-bold text-primary">{rota.data.getDate()}</p>
                      </div>
                      <div className="border-l border-border/50 pl-3">
                        <p className="text-sm font-medium">{rota.clientes.length} clientes</p>
                        <p className="text-xs text-muted-foreground">
                          {rota.data.toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="divide-y divide-border/50">
                      {rota.clientes.slice(0, 4).map((cliente, idx) => (
                        <div key={`${cliente.id}-${idx}`} className="px-4 py-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{cliente.nome}</p>
                              {cliente.cidade && (
                                <p className="text-xs text-muted-foreground">{cliente.cidade}</p>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {cliente.vendedorNome.split(' ')[0]}
                          </Badge>
                        </div>
                      ))}
                      {rota.clientes.length > 4 && (
                        <div className="px-4 py-2 text-xs text-muted-foreground text-center">
                          + {rota.clientes.length - 4} clientes
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mb-3 opacity-20" />
                <p className="text-muted-foreground">Nenhuma rota programada</p>
                <p className="text-xs text-muted-foreground mt-1">Configure as rotas semanais</p>
                <Link href="/comercial/rotas">
                  <Button variant="outline" size="sm" className="mt-4">
                    Configurar rotas
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

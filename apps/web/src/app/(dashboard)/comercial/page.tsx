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

interface Visita {
  id: string
  data: string
  status: string
  cliente: { id: string; nome: string; cidade?: string }
  vendedor: { user: { name: string } }
}

export default function ComercialPage() {
  const [loading, setLoading] = useState(true)
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [clientesCount, setClientesCount] = useState(0)
  const [propostasPendentes, setPropostasPendentes] = useState(0)
  const [metasDashboard, setMetasDashboard] = useState<MetaDashboard | null>(null)
  const [visitasSemana, setVisitasSemana] = useState<Visita[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL

      // Calcular início e fim da semana atual
      const hoje = new Date()
      const diaSemana = hoje.getDay()
      const inicioSemana = new Date(hoje)
      inicioSemana.setDate(hoje.getDate() - diaSemana)
      inicioSemana.setHours(0, 0, 0, 0)
      const fimSemana = new Date(inicioSemana)
      fimSemana.setDate(inicioSemana.getDate() + 6)
      fimSemana.setHours(23, 59, 59, 999)

      // Buscar dados em paralelo
      const [vendedoresRes, clientesRes, propostasRes, metasRes, visitasRes] = await Promise.all([
        fetch(`${apiUrl}/vendedores`),
        fetch(`${apiUrl}/clientes`),
        fetch(`${apiUrl}/propostas?status=EM_ABERTO`),
        fetch(`${apiUrl}/metas/dashboard`),
        fetch(`${apiUrl}/visitas?dataInicio=${inicioSemana.toISOString().split('T')[0]}&dataFim=${fimSemana.toISOString().split('T')[0]}&limit=10`),
      ])

      if (vendedoresRes.ok) {
        const data = await vendedoresRes.json()
        setVendedores(data)
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

      if (visitasRes.ok) {
        const data = await visitasRes.json()
        setVisitasSemana(data)
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

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metas por Vendedor */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold">Metas por Vendedor</h3>
          <Card className="border-border/50">
            {vendedores.length === 0 ? (
              <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum vendedor cadastrado</p>
                <Link href="/comercial/vendedores">
                  <Button variant="outline" size="sm" className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Vendedor
                  </Button>
                </Link>
              </CardContent>
            ) : (
              <CardContent className="p-4">
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
              </CardContent>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Gráfico de Metas */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Meta vs Realizado</CardTitle>
            </CardHeader>
            <CardContent>
              {metasDashboard && metasDashboard.vendedores.length > 0 ? (
                <div className="h-48">
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
                <div className="h-48 flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">Sem dados para exibir</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visitas da Semana */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Visitas da Semana</CardTitle>
                <Link href="/comercial/rotas">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Ver rota
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {visitasSemana.length > 0 ? (
                <div className="space-y-3">
                  {visitasSemana.map((visita) => {
                    const visitaDate = new Date(visita.data)
                    const hoje = new Date()
                    const isHoje = visitaDate.toDateString() === hoje.toDateString()
                    return (
                      <div
                        key={visita.id}
                        className={`p-3 rounded-lg border ${isHoje ? 'border-primary/50 bg-primary/5' : 'border-border/50'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{visita.cliente.nome}</span>
                          <Badge
                            variant={isHoje ? 'default' : 'outline'}
                            className={isHoje ? 'bg-primary text-primary-foreground text-[10px]' : 'text-[10px]'}
                          >
                            {isHoje ? 'Hoje' : visitaDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{visita.vendedor.user.name}</p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-center">
                  <MapPin className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-sm">Nenhuma visita esta semana</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Plus,
  Fuel,
  Camera,
  Loader2,
  X,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertCircle,
  Calendar,
  Eye,
  Check,
  XCircle,
  Clock,
  Filter,
  Users,
  Gauge,
  AlertTriangle,
  Wrench,
  CircleDot,
  TrendingUp,
} from 'lucide-react'

interface DespesaVeiculo {
  id: string
  data: string
  tipo: 'COMBUSTIVEL' | 'TROCA_OLEO' | 'REVISAO' | 'PNEUS_NIVEL' | 'PNEUS_TROCA'
  valor: number
  km: number
  comprovante: string | null
  validadoPorIA: boolean
  valorExtraido: number | null
  nomeExtraido: string | null
  createdAt: string
  status: 'PENDENTE' | 'APROVADA' | 'REPROVADA'
  aprovadoPor?: { name: string } | null
  dataAprovacao?: string | null
  motivoReprovacao?: string | null
  vendedor?: {
    id: string
    user: { name: string; photo?: string | null }
  }
}

interface Alerta {
  vendedorId: string
  vendedorNome: string
  tipo: string
  tipoLabel: string
  kmAtual: number
  kmUltimaManutencao: number
  kmProximaManutencao: number
  kmRestantes: number
  percentual: number
  status: 'OK' | 'PROXIMO' | 'VENCIDO'
}

interface Vendedor {
  id: string
  user: { name: string }
}

const TIPO_LABELS: Record<string, string> = {
  COMBUSTIVEL: 'Combustível',
  TROCA_OLEO: 'Troca de Óleo',
  REVISAO: 'Revisão',
  PNEUS_NIVEL: 'Calibragem Pneus',
  PNEUS_TROCA: 'Troca de Pneus',
}

const TIPO_ICONS: Record<string, any> = {
  COMBUSTIVEL: Fuel,
  TROCA_OLEO: CircleDot,
  REVISAO: Wrench,
  PNEUS_NIVEL: Gauge,
  PNEUS_TROCA: Gauge,
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function DespesasVeiculoPage() {
  const router = useRouter()
  const { user, isAdmin, isDiretor } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isGestor = isAdmin || isDiretor

  const [despesas, setDespesas] = useState<DespesaVeiculo[]>([])
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [vendedor, setVendedor] = useState<{ id: string } | null>(null)
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Dashboard
  const [dashboard, setDashboard] = useState<{
    totais: {
      despesas: number
      pendentes: number
      aprovadas: number
      kmRodados: number
      custoPorKm: number
    }
  } | null>(null)

  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>('PENDENTE')
  const [tipoFilter, setTipoFilter] = useState<string>('')
  const [vendedorFilter, setVendedorFilter] = useState<string>('')
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())

  // Modal de reprovar
  const [showReprovarModal, setShowReprovarModal] = useState(false)
  const [despesaParaReprovar, setDespesaParaReprovar] = useState<string | null>(null)
  const [motivoReprovacao, setMotivoReprovacao] = useState('')
  const [aprovando, setAprovando] = useState<string | null>(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    tipo: 'COMBUSTIVEL' as string,
    valor: '',
    km: '',
    comprovante: null as string | null,
    comprovantePreview: null as string | null,
  })
  const [uploadingImage, setUploadingImage] = useState(false)
  const [analisandoComprovante, setAnalisandoComprovante] = useState(false)
  const [analiseResultado, setAnaliseResultado] = useState<{
    valido: boolean
    mensagem: string
    valorExtraido: number | null
    nomeExtraido: string | null
    valorConfere: boolean
  } | null>(null)
  const [ultimoKm, setUltimoKm] = useState<number | null>(null)

  // Modal de visualizacao de imagem
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // Buscar vendedor pelo userId
  const fetchVendedor = async () => {
    if (!user?.id) return
    try {
      const res = await fetch(`${API_URL}/vendedores`)
      if (!res.ok) throw new Error('Erro ao buscar vendedores')
      const vendedores = await res.json()
      const v = vendedores.find((v: any) => v.user.id === user.id)
      if (v) {
        setVendedor({ id: v.id })
        // Buscar último km
        const kmRes = await fetch(`${API_URL}/despesas-veiculo/ultimo-km/${v.id}`)
        if (kmRes.ok) {
          const kmData = await kmRes.json()
          setUltimoKm(kmData.ultimoKm)
        }
      }
    } catch (err: any) {
      console.error('Erro ao buscar vendedor:', err)
    }
  }

  const fetchVendedores = async () => {
    try {
      const res = await fetch(`${API_URL}/vendedores`)
      if (!res.ok) throw new Error('Erro ao buscar vendedores')
      const data = await res.json()
      setVendedores(data)
    } catch (err: any) {
      console.error('Erro ao buscar vendedores:', err)
    }
  }

  const fetchDespesas = async () => {
    if (!isGestor && !vendedor?.id) return

    try {
      setLoading(true)

      const params = new URLSearchParams()
      params.append('mes', mes.toString())
      params.append('ano', ano.toString())

      if (isGestor) {
        if (statusFilter) params.append('status', statusFilter)
        if (tipoFilter) params.append('tipo', tipoFilter)
        if (vendedorFilter) params.append('vendedorId', vendedorFilter)
      } else {
        if (vendedor?.id) params.append('vendedorId', vendedor.id)
      }

      const res = await fetch(`${API_URL}/despesas-veiculo?${params.toString()}`)
      if (!res.ok) throw new Error('Erro ao carregar despesas')
      const data = await res.json()
      setDespesas(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchDashboard = async () => {
    try {
      const params = new URLSearchParams()
      params.append('mes', mes.toString())
      params.append('ano', ano.toString())
      if (vendedorFilter) params.append('vendedorId', vendedorFilter)
      if (!isGestor && vendedor?.id) params.append('vendedorId', vendedor.id)

      const res = await fetch(`${API_URL}/despesas-veiculo/dashboard?${params.toString()}`)
      if (!res.ok) throw new Error('Erro ao carregar dashboard')
      const data = await res.json()
      setDashboard(data)
    } catch (err: any) {
      console.error('Erro ao carregar dashboard:', err)
    }
  }

  const fetchAlertas = async () => {
    try {
      const params = new URLSearchParams()
      if (vendedorFilter) params.append('vendedorId', vendedorFilter)
      if (!isGestor && vendedor?.id) params.append('vendedorId', vendedor.id)

      const res = await fetch(`${API_URL}/despesas-veiculo/alertas?${params.toString()}`)
      if (!res.ok) throw new Error('Erro ao carregar alertas')
      const data = await res.json()
      setAlertas(data)
    } catch (err: any) {
      console.error('Erro ao carregar alertas:', err)
    }
  }

  const handleAprovar = async (despesaId: string) => {
    if (!user?.id) return
    try {
      setAprovando(despesaId)
      const res = await fetch(`${API_URL}/despesas-veiculo/${despesaId}/aprovar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aprovadoPorId: user.id }),
      })
      if (!res.ok) throw new Error('Erro ao aprovar despesa')
      fetchDespesas()
      fetchDashboard()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAprovando(null)
    }
  }

  const handleReprovar = async () => {
    if (!user?.id || !despesaParaReprovar) return
    try {
      setAprovando(despesaParaReprovar)
      const res = await fetch(`${API_URL}/despesas-veiculo/${despesaParaReprovar}/reprovar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aprovadoPorId: user.id,
          motivoReprovacao: motivoReprovacao || undefined,
        }),
      })
      if (!res.ok) throw new Error('Erro ao reprovar despesa')
      setShowReprovarModal(false)
      setDespesaParaReprovar(null)
      setMotivoReprovacao('')
      fetchDespesas()
      fetchDashboard()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAprovando(null)
    }
  }

  useEffect(() => {
    if (isGestor) {
      fetchVendedores()
    }
    fetchVendedor()
  }, [user?.id])

  useEffect(() => {
    if (isGestor || vendedor?.id) {
      fetchDespesas()
      fetchDashboard()
      fetchAlertas()
    }
  }, [vendedor?.id, mes, ano, statusFilter, tipoFilter, vendedorFilter, isGestor])

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string
      setFormData(prev => ({ ...prev, comprovantePreview: base64 }))

      try {
        setUploadingImage(true)
        const res = await fetch(`${API_URL}/despesas/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Erro ao fazer upload')
        }

        const data = await res.json()
        setFormData(prev => ({ ...prev, comprovante: data.url }))

        const valorAtual = formData.valor ? parseFloat(formData.valor) : 0
        await analisarComprovante(data.url, valorAtual)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setUploadingImage(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const analisarComprovante = async (imageUrl: string, valor: number) => {
    try {
      setAnalisandoComprovante(true)
      setAnaliseResultado(null)

      const res = await fetch(`${API_URL}/despesas/analisar-comprovante`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, valorInformado: valor }),
      })

      if (!res.ok) throw new Error('Erro ao analisar comprovante')

      const data = await res.json()
      setAnaliseResultado(data)

      if (data.valorExtraido && !formData.valor) {
        setFormData(prev => ({ ...prev, valor: data.valorExtraido.toString() }))
      }
    } catch (err: any) {
      console.error('Erro ao analisar comprovante:', err)
    } finally {
      setAnalisandoComprovante(false)
    }
  }

  const handleValorChange = async (valor: string) => {
    setFormData(prev => ({ ...prev, valor }))

    if (formData.comprovante && valor) {
      const valorNum = parseFloat(valor)
      if (!isNaN(valorNum) && valorNum > 0) {
        await analisarComprovante(formData.comprovante, valorNum)
      }
    }
  }

  const handleSubmit = async () => {
    if (!vendedor?.id || !formData.tipo || !formData.valor || !formData.km) return

    const kmNum = parseInt(formData.km)
    if (ultimoKm !== null && kmNum < ultimoKm) {
      setError(`Quilometragem deve ser maior ou igual a ${ultimoKm} km (último registro)`)
      return
    }

    try {
      setSaving(true)
      const res = await fetch(`${API_URL}/despesas-veiculo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendedorId: vendedor.id,
          data: new Date().toISOString(),
          tipo: formData.tipo,
          valor: parseFloat(formData.valor),
          km: kmNum,
          comprovante: formData.comprovante,
          validadoPorIA: analiseResultado?.valido || false,
          valorExtraido: analiseResultado?.valorExtraido,
          nomeExtraido: analiseResultado?.nomeExtraido,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar despesa')
      }

      setFormData({
        tipo: 'COMBUSTIVEL',
        valor: '',
        km: '',
        comprovante: null,
        comprovantePreview: null,
      })
      setAnaliseResultado(null)
      setShowForm(false)
      setUltimoKm(kmNum)
      fetchDespesas()
      fetchDashboard()
      fetchAlertas()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDespesa = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) return

    try {
      const res = await fetch(`${API_URL}/despesas-veiculo/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir despesa')
      fetchDespesas()
      fetchDashboard()
      fetchAlertas()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR')
  }

  const formatKm = (km: number) => {
    return km.toLocaleString('pt-BR') + ' km'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDENTE':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>
      case 'APROVADA':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30"><Check className="w-3 h-3 mr-1" />Aprovada</Badge>
      case 'REPROVADA':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30"><XCircle className="w-3 h-3 mr-1" />Reprovada</Badge>
      default:
        return null
    }
  }

  const getAlertaBadge = (status: string) => {
    switch (status) {
      case 'PROXIMO':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><AlertTriangle className="w-3 h-3 mr-1" />Próximo</Badge>
      case 'VENCIDO':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30"><AlertCircle className="w-3 h-3 mr-1" />Vencido</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/comercial')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isGestor ? 'Gestão de Despesas de Veículo' : 'Despesas do Veículo'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isGestor ? 'Aprove despesas e monitore custos dos veículos' : 'Registre despesas de combustível e manutenção'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchDespesas(); fetchDashboard(); fetchAlertas() }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          {!isGestor && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Despesa
            </Button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError('')}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Cards de Estatísticas */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-xl font-bold">{formatCurrency(dashboard.totais.pendentes)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aprovadas</p>
                  <p className="text-xl font-bold">{formatCurrency(dashboard.totais.aprovadas)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Fuel className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Mês</p>
                  <p className="text-xl font-bold">{formatCurrency(dashboard.totais.despesas)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Gauge className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Km Rodados</p>
                  <p className="text-xl font-bold">{formatKm(dashboard.totais.kmRodados)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Custo/Km</p>
                  <p className="text-xl font-bold">
                    {dashboard.totais.custoPorKm > 0
                      ? `R$ ${dashboard.totais.custoPorKm.toFixed(2)}`
                      : '-'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alertas de Manutenção */}
      {alertas.length > 0 && (
        <Card className="border-border/50 border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="w-5 h-5" />
              Alertas de Manutenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {alertas.map((alerta, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    alerta.status === 'VENCIDO'
                      ? 'bg-destructive/10 border-destructive/30'
                      : 'bg-yellow-500/10 border-yellow-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{alerta.tipoLabel}</span>
                    {getAlertaBadge(alerta.status)}
                  </div>
                  {isGestor && (
                    <p className="text-sm text-muted-foreground mb-1">{alerta.vendedorNome}</p>
                  )}
                  <div className="text-xs text-muted-foreground">
                    <p>Km atual: {formatKm(alerta.kmAtual)}</p>
                    <p>Próxima em: {formatKm(alerta.kmProximaManutencao)}</p>
                    <p className={alerta.kmRestantes < 0 ? 'text-destructive font-medium' : ''}>
                      {alerta.kmRestantes < 0
                        ? `Atrasado ${formatKm(Math.abs(alerta.kmRestantes))}`
                        : `Faltam ${formatKm(alerta.kmRestantes)}`
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <select
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
            value={mes}
            onChange={(e) => setMes(parseInt(e.target.value))}
          >
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i, 1).toLocaleDateString('pt-BR', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
            value={ano}
            onChange={(e) => setAno(parseInt(e.target.value))}
          >
            {[2024, 2025, 2026].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
          >
            <option value="">Todos os tipos</option>
            {Object.entries(TIPO_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {isGestor && (
          <>
            <select
              className="h-9 px-3 rounded-md border border-input bg-background text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="PENDENTE">Pendentes</option>
              <option value="APROVADA">Aprovadas</option>
              <option value="REPROVADA">Reprovadas</option>
            </select>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <select
                className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                value={vendedorFilter}
                onChange={(e) => setVendedorFilter(e.target.value)}
              >
                <option value="">Todos os representantes</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.user.name}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {/* Lista de Despesas */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : despesas.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Fuel className="w-12 h-12 mb-4" />
            <p>Nenhuma despesa registrada neste período</p>
            {!isGestor && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Registrar Despesa
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {despesas.map((despesa) => {
            const TipoIcon = TIPO_ICONS[despesa.tipo] || Fuel
            return (
              <Card key={despesa.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar/Icon */}
                    {isGestor && despesa.vendedor ? (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                        {despesa.vendedor.user.photo ? (
                          <img src={despesa.vendedor.user.photo} alt="" className="w-10 h-10 object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-primary">
                            {despesa.vendedor.user.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        despesa.tipo === 'COMBUSTIVEL' ? 'bg-orange-500/20 text-orange-500' :
                        despesa.tipo === 'TROCA_OLEO' ? 'bg-amber-500/20 text-amber-500' :
                        despesa.tipo === 'REVISAO' ? 'bg-blue-500/20 text-blue-500' :
                        'bg-primary/20 text-primary'
                      }`}>
                        <TipoIcon className="w-5 h-5" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{TIPO_LABELS[despesa.tipo]}</p>
                        {despesa.nomeExtraido && (
                          <Badge variant="outline" className="text-[10px]">
                            {despesa.nomeExtraido}
                          </Badge>
                        )}
                        {getStatusBadge(despesa.status)}
                      </div>
                      {isGestor && despesa.vendedor && (
                        <p className="text-sm text-primary font-medium">{despesa.vendedor.user.name}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(despesa.data)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Gauge className="w-3 h-3" />
                          {formatKm(despesa.km)}
                        </span>
                      </div>
                      {despesa.status === 'REPROVADA' && despesa.motivoReprovacao && (
                        <p className="text-xs text-destructive mt-1">Motivo: {despesa.motivoReprovacao}</p>
                      )}
                    </div>

                    {/* Valor */}
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(Number(despesa.valor))}</p>
                      {despesa.valorExtraido && despesa.valorExtraido !== Number(despesa.valor) && (
                        <p className="text-xs text-muted-foreground">
                          IA: {formatCurrency(Number(despesa.valorExtraido))}
                        </p>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-1">
                      {despesa.comprovante && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedImage(despesa.comprovante)
                            setShowImageModal(true)
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}

                      {isGestor && despesa.status === 'PENDENTE' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-success hover:text-success hover:bg-success/10"
                            onClick={() => handleAprovar(despesa.id)}
                            disabled={aprovando === despesa.id}
                          >
                            {aprovando === despesa.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setDespesaParaReprovar(despesa.id)
                              setShowReprovarModal(true)
                            }}
                            disabled={aprovando === despesa.id}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}

                      {!isGestor && despesa.status === 'PENDENTE' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteDespesa(despesa.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <Card className="relative z-10 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Fuel className="w-5 h-5" />
                  Nova Despesa de Veículo
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowForm(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Despesa *</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                >
                  {Object.entries(TIPO_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.valor}
                  onChange={(e) => handleValorChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Quilometragem do Veículo *</Label>
                <Input
                  type="number"
                  placeholder={ultimoKm ? `Mínimo: ${ultimoKm} km` : 'Ex: 45000'}
                  value={formData.km}
                  onChange={(e) => setFormData({ ...formData, km: e.target.value })}
                />
                {ultimoKm !== null && (
                  <p className="text-xs text-muted-foreground">
                    Último registro: {formatKm(ultimoKm)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Comprovante (foto)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                {formData.comprovantePreview ? (
                  <div className="relative">
                    <img
                      src={formData.comprovantePreview}
                      alt="Comprovante"
                      className="w-full h-48 object-cover rounded-lg border border-border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setFormData({ ...formData, comprovante: null, comprovantePreview: null })}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                        <Loader2 className="w-8 h-8 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-32 flex flex-col items-center justify-center gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    <Camera className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Tirar foto ou selecionar</span>
                  </Button>
                )}
              </div>

              {analisandoComprovante && (
                <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Analisando comprovante com IA...</span>
                </div>
              )}

              {analiseResultado && (
                <div className={`p-3 rounded-lg ${
                  analiseResultado.valido && analiseResultado.valorConfere
                    ? 'bg-success/10 border border-success/30'
                    : 'bg-[#F97316]/10 border border-[#F97316]/30'
                }`}>
                  <div className="flex items-start gap-2">
                    {analiseResultado.valido && analiseResultado.valorConfere ? (
                      <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-[#F97316] flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{analiseResultado.mensagem}</p>
                      {analiseResultado.valorExtraido !== null && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Valor extraído: {formatCurrency(analiseResultado.valorExtraido)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={saving || !formData.tipo || !formData.valor || !formData.km}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Salvar Despesa
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowImageModal(false)}
          />
          <div className="relative z-10 max-w-4xl max-h-[90vh] mx-4">
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-10 right-0 text-white hover:bg-white/20"
              onClick={() => setShowImageModal(false)}
            >
              <X className="w-6 h-6" />
            </Button>
            <img
              src={selectedImage}
              alt="Comprovante"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Modal de Reprovar */}
      {showReprovarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowReprovarModal(false)
              setDespesaParaReprovar(null)
              setMotivoReprovacao('')
            }}
          />
          <Card className="relative z-10 w-full max-w-md mx-4 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <XCircle className="w-5 h-5" />
                  Reprovar Despesa
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setShowReprovarModal(false)
                    setDespesaParaReprovar(null)
                    setMotivoReprovacao('')
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Motivo da Reprovação (opcional)</Label>
                <Textarea
                  placeholder="Informe o motivo da reprovação..."
                  value={motivoReprovacao}
                  onChange={(e) => setMotivoReprovacao(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowReprovarModal(false)
                    setDespesaParaReprovar(null)
                    setMotivoReprovacao('')
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleReprovar}
                  disabled={aprovando !== null}
                >
                  {aprovando ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Reprovando...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Reprovar
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

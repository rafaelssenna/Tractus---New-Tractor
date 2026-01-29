'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Wrench,
  ArrowLeft,
  Loader2,
  X,
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Building2,
  AlertCircle,
  FileText,
  CalendarPlus,
} from 'lucide-react'

interface VisitaInspecao {
  id: string
  clienteId: string
  vendedorId: string
  dataVisita: string | null
  equipamentos: string[]
  observacao: string | null
  status: 'PENDENTE' | 'CONFIRMADA' | 'REALIZADA' | 'CANCELADA'
  motivoCancelamento: string | null
  createdAt: string
  cliente: {
    id: string
    nome: string
    cidade: string | null
    estado: string | null
    endereco: string | null
    telefone: string | null
  }
  vendedor: {
    id: string
    user: {
      id: string
      name: string
      photo: string | null
    }
  }
}

interface AgendaDia {
  data: string
  diaSemana: string
  totalVisitas: number
  pendentes: number
  confirmadas: number
  visitas: VisitaInspecao[]
}

interface AgendaResponse {
  agenda: AgendaDia[]
  totais: {
    dias: number
    visitas: number
    pendentes: number
    confirmadas: number
  }
}

interface SolicitacoesResponse {
  solicitacoes: VisitaInspecao[]
  total: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

const STATUS_CONFIG = {
  PENDENTE: {
    label: 'Pendente',
    color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
    icon: Clock,
  },
  CONFIRMADA: {
    label: 'Confirmada',
    color: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
    icon: CheckCircle,
  },
  REALIZADA: {
    label: 'Realizada',
    color: 'bg-green-500/20 text-green-600 border-green-500/30',
    icon: CheckCircle,
  },
  CANCELADA: {
    label: 'Cancelada',
    color: 'bg-red-500/20 text-red-600 border-red-500/30',
    icon: XCircle,
  },
}

export default function AgendaInspetorPage() {
  const router = useRouter()
  const { user, isAdmin, isDiretor } = useAuth()

  // Verificar se é gestor (admin/diretor) ou inspetor (técnico)
  const isGestor = isAdmin || isDiretor
  const isInspetor = user?.role === 'TECNICO'

  // Estados para solicitações (sem data)
  const [solicitacoes, setSolicitacoes] = useState<VisitaInspecao[]>([])
  const [loadingSolicitacoes, setLoadingSolicitacoes] = useState(true)

  // Estados para agenda (com data)
  const [agenda, setAgenda] = useState<AgendaDia[]>([])
  const [totais, setTotais] = useState({ dias: 0, visitas: 0, pendentes: 0, confirmadas: 0 })
  const [loadingAgenda, setLoadingAgenda] = useState(true)

  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Modal de agendamento
  const [showAgendarModal, setShowAgendarModal] = useState(false)
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<VisitaInspecao | null>(null)
  const [dataAgendamento, setDataAgendamento] = useState('')
  const [inspetores, setInspetores] = useState<{ id: string; name: string }[]>([])
  const [selectedInspetorId, setSelectedInspetorId] = useState('')

  // Abas - inspetor começa na agenda, admin nas solicitações
  const [activeTab, setActiveTab] = useState<'solicitacoes' | 'agenda'>('solicitacoes')

  // Inspetor só vê agenda
  useEffect(() => {
    if (isInspetor) {
      setActiveTab('agenda')
    }
  }, [isInspetor])

  // Date range para agenda
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today.toISOString().split('T')[0] as string
  })
  const [endDate, setEndDate] = useState<string>(() => {
    const date = new Date()
    date.setDate(date.getDate() + 14)
    return date.toISOString().split('T')[0] as string
  })

  useEffect(() => {
    fetchSolicitacoes()
    fetchAgenda()
    fetchInspetores()
  }, [])

  useEffect(() => {
    fetchAgenda()
  }, [startDate, endDate])

  const fetchSolicitacoes = async () => {
    try {
      setLoadingSolicitacoes(true)
      const res = await fetch(`${API_URL}/visitas-tecnicas/solicitacoes`)
      if (!res.ok) throw new Error('Erro ao carregar solicitações')
      const data: SolicitacoesResponse = await res.json()
      setSolicitacoes(data.solicitacoes)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingSolicitacoes(false)
    }
  }

  const fetchAgenda = async () => {
    try {
      setLoadingAgenda(true)
      const params = new URLSearchParams({
        dataInicio: startDate,
        dataFim: endDate,
      })

      const res = await fetch(`${API_URL}/visitas-tecnicas/agenda?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar agenda')
      const data: AgendaResponse = await res.json()
      setAgenda(data.agenda)
      setTotais(data.totais)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingAgenda(false)
    }
  }

  const fetchInspetores = async () => {
    try {
      const res = await fetch(`${API_URL}/visitas-tecnicas/inspetores`)
      if (!res.ok) throw new Error('Erro ao carregar inspetores')
      const data: { id: string; name: string }[] = await res.json()
      setInspetores(data)
      // Definir Joviano como padrão se existir
      const joviano = data.find(i => i.name.toLowerCase().includes('joviano'))
      if (joviano) {
        setSelectedInspetorId(joviano.id)
      } else if (data.length > 0 && data[0]) {
        setSelectedInspetorId(data[0].id)
      }
    } catch (err: any) {
      console.error('Erro ao buscar inspetores:', err)
    }
  }

  const handleAgendar = async () => {
    if (!selectedSolicitacao || !dataAgendamento || !selectedInspetorId) return

    try {
      setActionLoading(selectedSolicitacao.id)
      const res = await fetch(`${API_URL}/visitas-tecnicas/${selectedSolicitacao.id}/agendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataVisita: dataAgendamento, inspetorId: selectedInspetorId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao agendar inspeção')
      }

      setShowAgendarModal(false)
      setSelectedSolicitacao(null)
      setDataAgendamento('')
      fetchSolicitacoes()
      fetchAgenda()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRealizar = async (id: string) => {
    try {
      setActionLoading(id)
      const res = await fetch(`${API_URL}/visitas-tecnicas/${id}/realizar`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao marcar inspeção como realizada')
      }

      fetchAgenda()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelar = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta solicitação?')) return

    try {
      setActionLoading(id)
      const res = await fetch(`${API_URL}/visitas-tecnicas/${id}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: 'Cancelado pelo administrador' }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao cancelar solicitação')
      }

      fetchSolicitacoes()
      fetchAgenda()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T12:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const days = direction === 'prev' ? -7 : 7
    const newStart = new Date(startDate)
    const newEnd = new Date(endDate)
    newStart.setDate(newStart.getDate() + days)
    newEnd.setDate(newEnd.getDate() + days)
    setStartDate(newStart.toISOString().split('T')[0] as string)
    setEndDate(newEnd.toISOString().split('T')[0] as string)
  }

  const isToday = (dateString: string) => {
    const today = new Date().toISOString().split('T')[0]
    return dateString === today
  }

  const openAgendarModal = (solicitacao: VisitaInspecao) => {
    setSelectedSolicitacao(solicitacao)
    // Sugerir data de amanhã
    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)
    setDataAgendamento(amanha.toISOString().split('T')[0] as string)
    setShowAgendarModal(true)
  }

  const renderSolicitacaoCard = (visita: VisitaInspecao, showAgendarButton: boolean = true) => {
    const statusConfig = STATUS_CONFIG[visita.status]
    const StatusIcon = statusConfig.icon
    const isLoading = actionLoading === visita.id

    return (
      <div
        key={visita.id}
        className="p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`text-xs ${statusConfig.color}`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Solicitado em {formatDateTime(visita.createdAt)}
              </span>
            </div>

            <div className="flex items-start gap-2 mb-2">
              <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{visita.cliente.nome}</p>
                {visita.cliente.cidade && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {visita.cliente.cidade}{visita.cliente.estado ? `/${visita.cliente.estado}` : ''}
                    {visita.cliente.endereco && ` - ${visita.cliente.endereco}`}
                  </p>
                )}
                {visita.cliente.telefone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {visita.cliente.telefone}
                  </p>
                )}
              </div>
            </div>

            <div className="mb-2">
              <p className="text-xs text-muted-foreground uppercase mb-1">Equipamentos:</p>
              <div className="flex flex-wrap gap-1">
                {visita.equipamentos.map((eq, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {eq}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="w-3 h-3" />
              Solicitado por: {visita.vendedor.user.name}
            </div>

            {visita.observacao && (
              <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                <p className="text-xs text-muted-foreground uppercase mb-1">Observação:</p>
                {visita.observacao}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 ml-4">
            {/* Botão Agendar - apenas para admin em solicitações sem data */}
            {isGestor && showAgendarButton && visita.status !== 'CANCELADA' && visita.status !== 'REALIZADA' && (
              <Button
                size="sm"
                onClick={() => openAgendarModal(visita)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CalendarPlus className="w-4 h-4 mr-1" />
                    Agendar
                  </>
                )}
              </Button>
            )}
            {/* Botão Cancelar - para admin em qualquer visita não finalizada */}
            {isGestor && visita.status !== 'CANCELADA' && visita.status !== 'REALIZADA' && (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => handleCancelar(visita.id)}
                disabled={isLoading}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
            )}
            {/* Botão do Inspetor: Marcar Realizada - para visitas com data (PENDENTE ou CONFIRMADA) */}
            {isInspetor && visita.dataVisita && (visita.status === 'PENDENTE' || visita.status === 'CONFIRMADA') && (
              <Button
                size="sm"
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleRealizar(visita.id)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Marcar Realizada
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/comercial')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isInspetor ? 'Minha Agenda' : 'Agenda do Inspetor'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isInspetor
                ? 'Suas inspeções agendadas'
                : 'Gerencie solicitações e inspeções agendadas'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchSolicitacoes(); fetchAgenda() }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
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

      {/* Stats */}
      <div className={`grid grid-cols-1 gap-4 ${isGestor ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
        {/* Card de Solicitações - apenas para admin/diretor */}
        {isGestor && (
          <Card className={`border-border/50 cursor-pointer transition-all ${activeTab === 'solicitacoes' ? 'ring-2 ring-orange-500' : ''}`} onClick={() => setActiveTab('solicitacoes')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Solicitações Pendentes</p>
                  <p className="text-2xl font-bold text-orange-600">{solicitacoes.length}</p>
                </div>
                <FileText className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        )}
        <Card className={`border-border/50 ${isGestor ? 'cursor-pointer' : ''} transition-all ${activeTab === 'agenda' && isGestor ? 'ring-2 ring-primary' : ''}`} onClick={() => isGestor && setActiveTab('agenda')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Agendadas</p>
                <p className="text-2xl font-bold">{totais.visitas}</p>
              </div>
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dias com Inspeções</p>
                <p className="text-2xl font-bold">{totais.dias}</p>
              </div>
              <Wrench className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confirmadas</p>
                <p className="text-2xl font-bold text-blue-600">{totais.confirmadas}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs - Inspetor só vê Agenda */}
      {isGestor ? (
        <div className="flex gap-2 border-b border-border pb-2">
          <Button
            variant={activeTab === 'solicitacoes' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('solicitacoes')}
            className={activeTab === 'solicitacoes' ? 'bg-orange-600 hover:bg-orange-700' : ''}
          >
            <FileText className="w-4 h-4 mr-2" />
            Solicitações ({solicitacoes.length})
          </Button>
          <Button
            variant={activeTab === 'agenda' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('agenda')}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Agenda ({totais.visitas})
          </Button>
        </div>
      ) : (
        <div className="border-b border-border pb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Minha Agenda de Inspeções
          </h2>
        </div>
      )}

      {/* Content */}
      {activeTab === 'solicitacoes' && isGestor ? (
        // Solicitações - lista por ordem de chegada (apenas admin/diretor)
        <>
          {loadingSolicitacoes ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : solicitacoes.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma solicitação pendente</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Quando as vendedoras solicitarem inspeções, elas aparecerão aqui
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Solicitações ordenadas por ordem de chegada (mais antigas primeiro)
              </p>
              {solicitacoes.map((visita) => renderSolicitacaoCard(visita))}
            </div>
          )}
        </>
      ) : (
        // Agenda - agrupada por dia
        <>
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Semana Anterior
            </Button>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {formatDate(startDate)} - {formatDate(endDate)}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
              Próxima Semana
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {loadingAgenda ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : agenda.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma inspeção agendada para este período</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isGestor
                    ? 'Agende as solicitações pendentes na aba "Solicitações"'
                    : 'Aguarde o agendamento de novas inspeções'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {agenda.map((dia) => (
                <Card key={dia.data} className={`border-border/50 ${isToday(dia.data) ? 'ring-2 ring-primary' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isToday(dia.data) ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          <span className="text-lg font-bold">{new Date(dia.data + 'T12:00:00').getDate()}</span>
                        </div>
                        <div>
                          <CardTitle className="text-lg capitalize">
                            {dia.diaSemana}
                            {isToday(dia.data) && (
                              <Badge className="ml-2 bg-primary text-primary-foreground">Hoje</Badge>
                            )}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground capitalize">
                            {new Date(dia.data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{dia.totalVisitas} inspeção{dia.totalVisitas !== 1 ? 'es' : ''}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {dia.visitas.map((visita) => renderSolicitacaoCard(visita, false))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal de Agendamento */}
      {showAgendarModal && selectedSolicitacao && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarPlus className="w-5 h-5" />
                Agendar Inspeção
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">{selectedSolicitacao.cliente.nome}</p>
                <p className="text-sm text-muted-foreground">
                  Solicitado por: {selectedSolicitacao.vendedor.user.name}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedSolicitacao.equipamentos.map((eq, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {eq}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataAgendamento">Data da Inspeção</Label>
                <Input
                  id="dataAgendamento"
                  type="date"
                  value={dataAgendamento}
                  onChange={(e) => setDataAgendamento(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inspetor">Inspetor</Label>
                <select
                  id="inspetor"
                  value={selectedInspetorId}
                  onChange={(e) => setSelectedInspetorId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Selecione um inspetor</option>
                  {inspetores.map((inspetor) => (
                    <option key={inspetor.id} value={inspetor.id}>
                      {inspetor.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAgendarModal(false)
                    setSelectedSolicitacao(null)
                    setDataAgendamento('')
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAgendar}
                  disabled={!dataAgendamento || !selectedInspetorId || actionLoading === selectedSolicitacao.id}
                >
                  {actionLoading === selectedSolicitacao.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Confirmar Agendamento
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

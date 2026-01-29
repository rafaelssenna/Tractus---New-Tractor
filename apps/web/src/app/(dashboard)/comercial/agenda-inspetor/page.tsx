'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'

interface VisitaInspecao {
  id: string
  clienteId: string
  vendedorId: string
  dataVisita: string
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
  const [agenda, setAgenda] = useState<AgendaDia[]>([])
  const [totais, setTotais] = useState({ dias: 0, visitas: 0, pendentes: 0, confirmadas: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Date range
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today.toISOString().split('T')[0] as string
  })
  const [endDate, setEndDate] = useState<string>(() => {
    const date = new Date()
    date.setDate(date.getDate() + 14) // Proximos 14 dias
    return date.toISOString().split('T')[0] as string
  })

  useEffect(() => {
    fetchAgenda()
  }, [startDate, endDate])

  const fetchAgenda = async () => {
    try {
      setLoading(true)
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
      setLoading(false)
    }
  }

  const handleConfirmar = async (id: string) => {
    try {
      setActionLoading(id)
      const res = await fetch(`${API_URL}/visitas-tecnicas/${id}/confirmar`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao confirmar inspecao')
      }

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
        throw new Error(data.error || 'Erro ao marcar inspecao como realizada')
      }

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

  const formatFullDate = (dateString: string) => {
    return new Date(dateString + 'T12:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
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
            <h1 className="text-3xl font-bold tracking-tight">Agenda do Inspetor</h1>
            <p className="text-muted-foreground mt-1">
              Inspecoes agendadas
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAgenda}>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dias com Inspecoes</p>
                <p className="text-2xl font-bold">{totais.dias}</p>
              </div>
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Inspecoes</p>
                <p className="text-2xl font-bold">{totais.visitas}</p>
              </div>
              <Wrench className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{totais.pendentes}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
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
          Proxima Semana
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Agenda */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : agenda.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma inspecao agendada para este periodo</p>
            <p className="text-sm text-muted-foreground mt-1">
              As vendedoras podem solicitar inspecoes pelo sistema
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
                    <Badge variant="outline">{dia.totalVisitas} inspecao{dia.totalVisitas !== 1 ? 'es' : ''}</Badge>
                    {dia.pendentes > 0 && (
                      <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                        {dia.pendentes} pendente{dia.pendentes !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {dia.visitas.map((visita) => {
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
                                <p className="text-xs text-muted-foreground uppercase mb-1">Observacao:</p>
                                {visita.observacao}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 ml-4">
                            {visita.status === 'PENDENTE' && (
                              <Button
                                size="sm"
                                onClick={() => handleConfirmar(visita.id)}
                                disabled={isLoading}
                              >
                                {isLoading ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Confirmar
                                  </>
                                )}
                              </Button>
                            )}
                            {visita.status === 'CONFIRMADA' && (
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
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

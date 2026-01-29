'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/auth-context'
import {
  ClipboardCheck,
  Search,
  ArrowLeft,
  Loader2,
  X,
  Calendar,
  Clock,
  MapPin,
  Phone,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  Building2,
  Wrench,
} from 'lucide-react'

interface VisitaTecnica {
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

const API_URL = process.env.NEXT_PUBLIC_API_URL

const STATUS_CONFIG = {
  PENDENTE: {
    label: 'Aguardando',
    description: 'Aguardando confirmacao do tecnico',
    color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
    icon: Clock,
  },
  CONFIRMADA: {
    label: 'Confirmada',
    description: 'Tecnico confirmou a visita',
    color: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
    icon: CheckCircle,
  },
  REALIZADA: {
    label: 'Realizada',
    description: 'Visita foi realizada',
    color: 'bg-green-500/20 text-green-600 border-green-500/30',
    icon: CheckCircle,
  },
  CANCELADA: {
    label: 'Cancelada',
    description: 'Visita foi cancelada',
    color: 'bg-red-500/20 text-red-600 border-red-500/30',
    icon: XCircle,
  },
}

export default function MinhasSolicitacoesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [visitas, setVisitas] = useState<VisitaTecnica[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedVisita, setSelectedVisita] = useState<VisitaTecnica | null>(null)
  const [saving, setSaving] = useState(false)
  const [motivoCancelamento, setMotivoCancelamento] = useState('')

  useEffect(() => {
    if (user) {
      fetchMinhasVisitas()
    }
  }, [user, filterStatus])

  const fetchMinhasVisitas = async () => {
    try {
      setLoading(true)
      // Buscar todos os vendedores e encontrar o do usuario atual
      const vendedoresRes = await fetch(`${API_URL}/vendedores`)
      if (!vendedoresRes.ok) {
        setVisitas([])
        setLoading(false)
        return
      }
      const vendedores = await vendedoresRes.json()
      const meuVendedor = vendedores.find((v: any) => v.userId === user?.id)

      if (!meuVendedor) {
        // Usuario nao esta vinculado a nenhum vendedor
        setVisitas([])
        setLoading(false)
        return
      }

      // Buscar visitas do vendedor
      const params = new URLSearchParams()
      params.append('vendedorId', meuVendedor.id)
      if (filterStatus) params.append('status', filterStatus)

      const res = await fetch(`${API_URL}/visitas-tecnicas?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar solicitacoes')
      const data = await res.json()
      setVisitas(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelarVisita = async () => {
    if (!selectedVisita) return

    try {
      setSaving(true)
      setError('')

      const res = await fetch(`${API_URL}/visitas-tecnicas/${selectedVisita.id}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivoCancelamento }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao cancelar solicitacao')
      }

      setShowCancelModal(false)
      setSelectedVisita(null)
      setMotivoCancelamento('')
      fetchMinhasVisitas()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T12:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatDateRelative = (dateString: string) => {
    const date = new Date(dateString + 'T12:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Hoje'
    if (diffDays === 1) return 'Amanha'
    if (diffDays === -1) return 'Ontem'
    if (diffDays > 0 && diffDays <= 7) return `Em ${diffDays} dias`
    if (diffDays < 0) return `Ha ${Math.abs(diffDays)} dias`
    return formatDate(dateString)
  }

  const filteredVisitas = visitas.filter(
    (v) =>
      v.cliente.nome.toLowerCase().includes(search.toLowerCase()) ||
      v.equipamentos.some(e => e.toLowerCase().includes(search.toLowerCase()))
  )

  const stats = {
    total: visitas.length,
    pendentes: visitas.filter((v) => v.status === 'PENDENTE').length,
    confirmadas: visitas.filter((v) => v.status === 'CONFIRMADA').length,
    realizadas: visitas.filter((v) => v.status === 'REALIZADA').length,
  }

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/comercial/rotas')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Minhas Solicitacoes</h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe suas solicitacoes de visita tecnica
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMinhasVisitas}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
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
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <ClipboardCheck className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aguardando</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendentes}</p>
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
                <p className="text-2xl font-bold text-blue-600">{stats.confirmadas}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Realizadas</p>
                <p className="text-2xl font-bold text-green-600">{stats.realizadas}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente ou equipamento..."
                className="pl-10 bg-muted/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-10 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="PENDENTE">Aguardando</option>
              <option value="CONFIRMADA">Confirmadas</option>
              <option value="REALIZADA">Realizadas</option>
              <option value="CANCELADA">Canceladas</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Solicitacoes */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredVisitas.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center">
            <ClipboardCheck className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma solicitacao encontrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Solicite visitas tecnicas pela pagina de Rotas
            </p>
            <Button size="sm" className="mt-4" onClick={() => router.push('/comercial/rotas')}>
              Ir para Rotas
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredVisitas.map((visita) => {
            const statusConfig = STATUS_CONFIG[visita.status]
            const StatusIcon = statusConfig.icon
            const isUpcoming = visita.status === 'CONFIRMADA' || visita.status === 'PENDENTE'

            return (
              <Card
                key={visita.id}
                className={`border-border/50 hover:bg-muted/30 transition-colors ${
                  isUpcoming ? 'border-l-4 border-l-primary' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Status e Data */}
                      <div className="flex items-center gap-3 mb-3">
                        <Badge className={`text-xs ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {statusConfig.description}
                        </span>
                      </div>

                      {/* Cliente */}
                      <div className="flex items-start gap-2 mb-3">
                        <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium text-lg">{visita.cliente.nome}</p>
                          {visita.cliente.cidade && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {visita.cliente.cidade}{visita.cliente.estado ? `/${visita.cliente.estado}` : ''}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Data da Visita */}
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          <strong>{formatDateRelative(visita.dataVisita)}</strong>
                          <span className="text-muted-foreground ml-2">({formatDate(visita.dataVisita)})</span>
                        </span>
                      </div>

                      {/* Equipamentos */}
                      <div className="flex flex-wrap gap-1">
                        {visita.equipamentos.map((eq, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            <Wrench className="w-3 h-3 mr-1" />
                            {eq}
                          </Badge>
                        ))}
                      </div>

                      {/* Observacao */}
                      {visita.observacao && (
                        <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                          <p className="text-xs text-muted-foreground uppercase mb-1">Observacao:</p>
                          {visita.observacao}
                        </div>
                      )}

                      {/* Motivo Cancelamento */}
                      {visita.status === 'CANCELADA' && visita.motivoCancelamento && (
                        <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm">
                          <p className="text-xs text-destructive uppercase mb-1">Motivo do cancelamento:</p>
                          <p className="text-destructive">{visita.motivoCancelamento}</p>
                        </div>
                      )}
                    </div>

                    {/* Acoes */}
                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedVisita(visita)
                          setShowViewModal(true)
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Detalhes
                      </Button>
                      {visita.status === 'PENDENTE' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedVisita(visita)
                            setShowCancelModal(true)
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Cancelar
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

      {/* View Modal */}
      {showViewModal && selectedVisita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowViewModal(false)
              setSelectedVisita(null)
            }}
          />
          <Card className="relative z-10 w-full max-w-lg mx-4 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5" />
                  Detalhes da Solicitacao
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setShowViewModal(false)
                    setSelectedVisita(null)
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={`${STATUS_CONFIG[selectedVisita.status].color}`}>
                  {STATUS_CONFIG[selectedVisita.status].label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Criado em {formatDate(selectedVisita.createdAt.split('T')[0] as string)}
                </span>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase">Data da Visita</p>
                <p className="text-lg font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDateRelative(selectedVisita.dataVisita)}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({formatDate(selectedVisita.dataVisita)})
                  </span>
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase">Cliente</p>
                <p className="text-lg font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {selectedVisita.cliente.nome}
                </p>
                {selectedVisita.cliente.cidade && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {selectedVisita.cliente.cidade}{selectedVisita.cliente.estado ? `/${selectedVisita.cliente.estado}` : ''}
                    {selectedVisita.cliente.endereco && ` - ${selectedVisita.cliente.endereco}`}
                  </p>
                )}
                {selectedVisita.cliente.telefone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" />
                    {selectedVisita.cliente.telefone}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">Equipamentos para Inspecao</p>
                <div className="flex flex-wrap gap-2">
                  {selectedVisita.equipamentos.map((eq, i) => (
                    <Badge key={i} variant="outline">
                      <Wrench className="w-3 h-3 mr-1" />
                      {eq}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedVisita.observacao && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Observacao</p>
                  <p className="text-sm mt-1 p-2 bg-muted/50 rounded">{selectedVisita.observacao}</p>
                </div>
              )}

              {selectedVisita.status === 'CANCELADA' && selectedVisita.motivoCancelamento && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-xs text-destructive uppercase">Motivo do Cancelamento</p>
                  <p className="text-sm text-destructive mt-1">{selectedVisita.motivoCancelamento}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowViewModal(false)
                    setSelectedVisita(null)
                  }}
                >
                  Fechar
                </Button>
                {selectedVisita.status === 'PENDENTE' && (
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      setShowViewModal(false)
                      setShowCancelModal(true)
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancelar Solicitacao
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && selectedVisita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowCancelModal(false)
              setSelectedVisita(null)
              setMotivoCancelamento('')
            }}
          />
          <Card className="relative z-10 w-full max-w-md mx-4 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <XCircle className="w-5 h-5" />
                  Cancelar Solicitacao
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setShowCancelModal(false)
                    setSelectedVisita(null)
                    setMotivoCancelamento('')
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Voce esta cancelando a solicitacao de visita tecnica para <strong>{selectedVisita.cliente.nome}</strong> agendada para <strong>{formatDate(selectedVisita.dataVisita)}</strong>.
              </p>

              <div className="space-y-2">
                <Label>Motivo do cancelamento (opcional)</Label>
                <Textarea
                  placeholder="Informe o motivo do cancelamento..."
                  value={motivoCancelamento}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMotivoCancelamento(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowCancelModal(false)
                    setSelectedVisita(null)
                    setMotivoCancelamento('')
                  }}
                >
                  Voltar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleCancelarVisita}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cancelando...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Confirmar Cancelamento
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

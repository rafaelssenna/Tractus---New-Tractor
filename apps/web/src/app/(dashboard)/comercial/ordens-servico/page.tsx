'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Wrench,
  Plus,
  ArrowLeft,
  Loader2,
  X,
  Eye,
  RefreshCw,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Play,
  Pause,
  Receipt,
  FileText,
} from 'lucide-react'

interface OrdemServico {
  id: string
  numero: string
  status: 'ABERTA' | 'EM_PRODUCAO' | 'AGUARDANDO_PECAS' | 'FINALIZADA' | 'FATURADA' | 'CANCELADA'
  dataAbertura: string
  dataPrevisao: string | null
  dataFechamento: string | null
  valorTotal: number
  cliente: { id: string; nome: string }
  proposta: {
    id: string
    numero: string
    categoria: string
    vendedor: { user: { name: string } }
  } | null
}

interface PropostaAprovada {
  id: string
  numero: string
  valor: number
  categoria: string
  cliente: { id: string; nome: string }
  vendedor: { user: { name: string } }
  ordemServico: any | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

const statusConfig: Record<OrdemServico['status'], { label: string; color: string; icon: React.ElementType }> = {
  ABERTA: { label: 'Aberta', color: 'bg-blue-500/20 text-blue-500 border-blue-500/30', icon: Clock },
  EM_PRODUCAO: { label: 'Em Produção', color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30', icon: Play },
  AGUARDANDO_PECAS: { label: 'Aguardando Peças', color: 'bg-orange-500/20 text-orange-500 border-orange-500/30', icon: Pause },
  FINALIZADA: { label: 'Finalizada', color: 'bg-green-500/20 text-green-500 border-green-500/30', icon: CheckCircle },
  FATURADA: { label: 'Faturada', color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30', icon: Receipt },
  CANCELADA: { label: 'Cancelada', color: 'bg-red-500/20 text-red-500 border-red-500/30', icon: XCircle },
}

const categoriaConfig: Record<string, string> = {
  RODANTE: 'Rodante',
  PECA: 'Peça',
  CILINDRO: 'Cilindro',
}

export default function OrdensServicoPage() {
  const router = useRouter()
  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [propostasAprovadas, setPropostasAprovadas] = useState<PropostaAprovada[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showViewModal, setShowViewModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedOS, setSelectedOS] = useState<OrdemServico | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    fetchOrdens()
    fetchPropostasAprovadas()
  }, [statusFilter])

  const fetchOrdens = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)

      const res = await fetch(`${API_URL}/ordens-servico${params.toString() ? `?${params}` : ''}`)
      if (!res.ok) throw new Error('Erro ao carregar ordens de serviço')
      const data = await res.json()
      setOrdens(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchPropostasAprovadas = async () => {
    try {
      const res = await fetch(`${API_URL}/propostas?status=APROVADA`)
      if (!res.ok) throw new Error('Erro ao carregar propostas')
      const data = await res.json()
      // Filtrar apenas propostas sem OS
      setPropostasAprovadas(data.filter((p: PropostaAprovada) => !p.ordemServico))
    } catch (err: any) {
      console.error('Erro ao carregar propostas aprovadas:', err)
    }
  }

  const handleViewOS = (os: OrdemServico) => {
    setSelectedOS(os)
    setShowViewModal(true)
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      setUpdatingStatus(true)
      const res = await fetch(`${API_URL}/ordens-servico/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!res.ok) throw new Error('Erro ao atualizar status')

      fetchOrdens()
      setShowViewModal(false)
      setSelectedOS(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleCreateFromProposta = async (propostaId: string) => {
    try {
      setUpdatingStatus(true)
      const res = await fetch(`${API_URL}/ordens-servico/from-proposta/${propostaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar OS')
      }

      setShowCreateModal(false)
      fetchOrdens()
      fetchPropostasAprovadas()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  // Stats
  const stats = {
    total: ordens.length,
    abertas: ordens.filter(o => o.status === 'ABERTA').length,
    emProducao: ordens.filter(o => o.status === 'EM_PRODUCAO').length,
    finalizadas: ordens.filter(o => o.status === 'FINALIZADA').length,
    faturadas: ordens.filter(o => o.status === 'FATURADA').length,
    valorFaturado: ordens.filter(o => o.status === 'FATURADA').reduce((acc, o) => acc + Number(o.valorTotal), 0),
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
            <h1 className="text-3xl font-bold tracking-tight">Ordens de Serviço</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie ordens de serviço e faturamento
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchOrdens}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova OS
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
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Wrench className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Abertas</p>
                <p className="text-2xl font-bold">{stats.abertas}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Produção</p>
                <p className="text-2xl font-bold">{stats.emProducao}</p>
              </div>
              <Play className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Finalizadas</p>
                <p className="text-2xl font-bold">{stats.finalizadas}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Faturadas</p>
                <p className="text-2xl font-bold">{stats.faturadas}</p>
              </div>
              <Receipt className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Faturado</p>
                <p className="text-xl font-bold">{formatCurrency(stats.valorFaturado)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <select
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos os Status</option>
          <option value="ABERTA">Abertas</option>
          <option value="EM_PRODUCAO">Em Produção</option>
          <option value="AGUARDANDO_PECAS">Aguardando Peças</option>
          <option value="FINALIZADA">Finalizadas</option>
          <option value="FATURADA">Faturadas</option>
          <option value="CANCELADA">Canceladas</option>
        </select>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Lista de Ordens de Serviço</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : ordens.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Wrench className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma ordem de serviço encontrada</p>
              <Button size="sm" className="mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nova OS
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-y border-border bg-muted/30">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Número
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Proposta
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Representante Comercial
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Abertura
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ordens.map((os) => {
                    const statusInfo = statusConfig[os.status]
                    const StatusIcon = statusInfo.icon
                    return (
                      <tr key={os.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-4 px-4">
                          <span className="font-mono text-sm font-medium">{os.numero}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm">{os.cliente.nome}</span>
                        </td>
                        <td className="py-4 px-4">
                          {os.proposta ? (
                            <span className="font-mono text-xs text-muted-foreground">{os.proposta.numero}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-muted-foreground">
                            {os.proposta?.vendedor.user.name || '-'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="font-medium">{formatCurrency(Number(os.valorTotal))}</span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <Badge className={`gap-1 border ${statusInfo.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-muted-foreground">
                            {formatDate(os.dataAbertura)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleViewOS(os)}
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {os.status === 'ABERTA' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/10"
                                onClick={() => handleUpdateStatus(os.id, 'EM_PRODUCAO')}
                                title="Iniciar Produção"
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                            )}
                            {os.status === 'EM_PRODUCAO' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                                onClick={() => handleUpdateStatus(os.id, 'FINALIZADA')}
                                title="Finalizar"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                            {os.status === 'FINALIZADA' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                                onClick={() => handleUpdateStatus(os.id, 'FATURADA')}
                                title="Faturar"
                              >
                                <Receipt className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create from Proposta Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <Card className="relative z-10 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="w-5 h-5" />
                  Nova Ordem de Serviço
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowCreateModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecione uma proposta aprovada para gerar a OS:
              </p>

              {propostasAprovadas.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">Nenhuma proposta aprovada disponível</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aprove uma proposta primeiro para criar uma OS
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {propostasAprovadas.map((proposta) => (
                    <div
                      key={proposta.id}
                      className="p-4 border border-border/50 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => handleCreateFromProposta(proposta.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-sm font-medium">{proposta.numero}</p>
                          <p className="text-sm text-muted-foreground">{proposta.cliente.nome}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(Number(proposta.valor))}</p>
                          <p className="text-xs text-muted-foreground">
                            {proposta.vendedor.user.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {updatingStatus && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedOS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowViewModal(false); setSelectedOS(null) }}
          />
          <Card className="relative z-10 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="w-5 h-5" />
                  OS {selectedOS.numero}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => { setShowViewModal(false); setSelectedOS(null) }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-center py-2">
                <Badge className={`gap-1 text-sm px-3 py-1 border ${statusConfig[selectedOS.status].color}`}>
                  {React.createElement(statusConfig[selectedOS.status].icon, { className: 'w-4 h-4' })}
                  {statusConfig[selectedOS.status].label}
                </Badge>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedOS.cliente.nome}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Representante Comercial</p>
                  <p className="font-medium">{selectedOS.proposta?.vendedor.user.name || '-'}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Proposta</p>
                  <p className="font-mono font-medium">{selectedOS.proposta?.numero || '-'}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Categoria</p>
                  <p className="font-medium">
                    {selectedOS.proposta ? categoriaConfig[selectedOS.proposta.categoria] : '-'}
                  </p>
                </div>
              </div>

              {/* Valor */}
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Valor Total</span>
                  <span className="text-xl font-bold">{formatCurrency(Number(selectedOS.valorTotal))}</span>
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Abertura</p>
                  <p className="font-medium">{formatDate(selectedOS.dataAbertura)}</p>
                </div>
                {selectedOS.dataFechamento && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Fechamento</p>
                    <p className="font-medium">{formatDate(selectedOS.dataFechamento)}</p>
                  </div>
                )}
              </div>

              {/* Status Actions */}
              {selectedOS.status !== 'CANCELADA' && selectedOS.status !== 'FATURADA' && (
                <div className="space-y-3 pt-4 border-t">
                  <p className="text-sm font-medium">Atualizar Status:</p>

                  {selectedOS.status === 'ABERTA' && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleUpdateStatus(selectedOS.id, 'CANCELADA')}
                        disabled={updatingStatus}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => handleUpdateStatus(selectedOS.id, 'EM_PRODUCAO')}
                        disabled={updatingStatus}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Iniciar Produção
                      </Button>
                    </div>
                  )}

                  {selectedOS.status === 'EM_PRODUCAO' && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleUpdateStatus(selectedOS.id, 'AGUARDANDO_PECAS')}
                        disabled={updatingStatus}
                      >
                        <Pause className="w-4 h-4 mr-2" />
                        Aguardando Peças
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => handleUpdateStatus(selectedOS.id, 'FINALIZADA')}
                        disabled={updatingStatus}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Finalizar
                      </Button>
                    </div>
                  )}

                  {selectedOS.status === 'AGUARDANDO_PECAS' && (
                    <Button
                      className="w-full"
                      onClick={() => handleUpdateStatus(selectedOS.id, 'EM_PRODUCAO')}
                      disabled={updatingStatus}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Retomar Produção
                    </Button>
                  )}

                  {selectedOS.status === 'FINALIZADA' && (
                    <div className="space-y-2">
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                        <p className="text-sm text-emerald-500 font-medium flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Ao faturar, a venda será registrada automaticamente!
                        </p>
                      </div>
                      <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleUpdateStatus(selectedOS.id, 'FATURADA')}
                        disabled={updatingStatus}
                      >
                        {updatingStatus ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Receipt className="w-4 h-4 mr-2" />
                        )}
                        Faturar OS
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {selectedOS.status === 'FATURADA' && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <p className="text-sm text-emerald-500 font-medium flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    OS Faturada - Venda registrada com sucesso!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

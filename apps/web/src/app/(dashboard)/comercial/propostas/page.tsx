'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Plus,
  ArrowLeft,
  Loader2,
  X,
  Eye,
  Edit,
  RefreshCw,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
} from 'lucide-react'

interface Cliente {
  id: string
  nome: string
}

interface Vendedor {
  id: string
  user: {
    name: string
  }
}

interface Proposta {
  id: string
  numero: string
  valor: number
  custoEstimado: number | null
  margem: number | null
  categoria: 'RODANTE' | 'PECA' | 'CILINDRO'
  status: 'EM_ABERTO' | 'AGUARDANDO_APROVACAO' | 'APROVADA' | 'REPROVADA' | 'CANCELADA'
  dataValidade: string | null
  motivoCancelamento: string | null
  createdAt: string
  cliente: { id: string; nome: string }
  vendedor: { id: string; user: { name: string } }
  laudo: { id: string; numero: string } | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

const statusConfig: Record<Proposta['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  EM_ABERTO: { label: 'Em Aberto', variant: 'secondary', icon: Clock },
  AGUARDANDO_APROVACAO: { label: 'Aguardando Aprovação', variant: 'outline', icon: AlertCircle },
  APROVADA: { label: 'Aprovada', variant: 'default', icon: CheckCircle },
  REPROVADA: { label: 'Reprovada', variant: 'destructive', icon: XCircle },
  CANCELADA: { label: 'Cancelada', variant: 'destructive', icon: XCircle },
}

const categoriaConfig: Record<string, string> = {
  RODANTE: 'Rodante',
  PECA: 'Peça',
  CILINDRO: 'Cilindro',
}

export default function PropostasPage() {
  const router = useRouter()
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedProposta, setSelectedProposta] = useState<Proposta | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')

  const [formData, setFormData] = useState({
    clienteId: '',
    vendedorId: '',
    valor: '',
    custoEstimado: '',
    categoria: 'RODANTE' as 'RODANTE' | 'PECA' | 'CILINDRO',
    dataValidade: '',
  })

  useEffect(() => {
    fetchPropostas()
    fetchClientes()
    fetchVendedores()
  }, [statusFilter])

  const fetchPropostas = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)

      const res = await fetch(`${API_URL}/propostas${params.toString() ? `?${params}` : ''}`)
      if (!res.ok) throw new Error('Erro ao carregar propostas')
      const data = await res.json()
      setPropostas(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchClientes = async () => {
    try {
      const res = await fetch(`${API_URL}/clientes`)
      if (!res.ok) throw new Error('Erro ao carregar clientes')
      const data = await res.json()
      setClientes(data)
    } catch (err: any) {
      console.error('Erro ao carregar clientes:', err)
    }
  }

  const fetchVendedores = async () => {
    try {
      const res = await fetch(`${API_URL}/vendedores`)
      if (!res.ok) throw new Error('Erro ao carregar vendedores')
      const data = await res.json()
      setVendedores(data)
    } catch (err: any) {
      console.error('Erro ao carregar vendedores:', err)
    }
  }

  const resetForm = () => {
    setFormData({
      clienteId: '',
      vendedorId: '',
      valor: '',
      custoEstimado: '',
      categoria: 'RODANTE',
      dataValidade: '',
    })
    setEditingId(null)
    setError('')
  }

  const handleSaveProposta = async () => {
    if (!formData.clienteId || !formData.vendedorId || !formData.valor) {
      setError('Preencha os campos obrigatórios')
      return
    }

    try {
      setSaving(true)
      setError('')

      const payload = {
        clienteId: formData.clienteId,
        vendedorId: formData.vendedorId,
        valor: parseFloat(formData.valor),
        custoEstimado: formData.custoEstimado ? parseFloat(formData.custoEstimado) : undefined,
        categoria: formData.categoria,
        dataValidade: formData.dataValidade || undefined,
      }

      const url = editingId
        ? `${API_URL}/propostas/${editingId}`
        : `${API_URL}/propostas`
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar proposta')
      }

      setShowModal(false)
      resetForm()
      fetchPropostas()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleViewProposta = (proposta: Proposta) => {
    setSelectedProposta(proposta)
    setShowViewModal(true)
  }

  const handleEditProposta = (proposta: Proposta) => {
    setEditingId(proposta.id)
    setFormData({
      clienteId: proposta.cliente.id,
      vendedorId: proposta.vendedor.id,
      valor: proposta.valor.toString(),
      custoEstimado: proposta.custoEstimado?.toString() || '',
      categoria: proposta.categoria,
      dataValidade: proposta.dataValidade ? proposta.dataValidade.split('T')[0] ?? '' : '',
    })
    setShowViewModal(false)
    setShowModal(true)
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`${API_URL}/propostas/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!res.ok) throw new Error('Erro ao atualizar status')

      fetchPropostas()
      setShowViewModal(false)
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  // Calcula margem se disponível
  const calcularMargem = (proposta: Proposta): number | null => {
    // Se já tem margem calculada no banco, usa ela
    if (proposta.margem != null && typeof proposta.margem === 'number') {
      return proposta.margem
    }
    // Se tem custo estimado e valor, calcula a margem
    if (proposta.custoEstimado && proposta.valor > 0) {
      return ((proposta.valor - proposta.custoEstimado) / proposta.valor) * 100
    }
    return null
  }

  // Renderiza a margem com cores
  const renderMargem = (margem: number | null) => {
    if (margem === null) {
      return <span className="text-sm text-muted-foreground">-</span>
    }
    return (
      <span className={`text-sm font-medium ${margem >= 20 ? 'text-green-500' : margem >= 10 ? 'text-yellow-500' : 'text-red-500'}`}>
        {margem.toFixed(1)}%
      </span>
    )
  }

  // Stats
  const stats = {
    total: propostas.length,
    emAberto: propostas.filter(p => p.status === 'EM_ABERTO').length,
    aguardando: propostas.filter(p => p.status === 'AGUARDANDO_APROVACAO').length,
    aprovadas: propostas.filter(p => p.status === 'APROVADA').length,
    valorTotal: propostas.filter(p => p.status === 'APROVADA').reduce((acc, p) => acc + p.valor, 0),
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
            <h1 className="text-3xl font-bold tracking-tight">Propostas</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie orçamentos e propostas comerciais
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchPropostas}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setShowModal(true) }}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Proposta
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Aberto</p>
                <p className="text-2xl font-bold">{stats.emAberto}</p>
              </div>
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aguardando</p>
                <p className="text-2xl font-bold">{stats.aguardando}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aprovadas</p>
                <p className="text-2xl font-bold">{stats.aprovadas}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Aprovado</p>
                <p className="text-xl font-bold">{formatCurrency(stats.valorTotal)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
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
          <option value="EM_ABERTO">Em Aberto</option>
          <option value="AGUARDANDO_APROVACAO">Aguardando Aprovação</option>
          <option value="APROVADA">Aprovadas</option>
          <option value="REPROVADA">Reprovadas</option>
          <option value="CANCELADA">Canceladas</option>
        </select>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Lista de Propostas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : propostas.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma proposta encontrada</p>
              <Button size="sm" className="mt-4" onClick={() => { resetForm(); setShowModal(true) }}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Proposta
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
                      Vendedor
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Categoria
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Margem
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Data
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {propostas.map((proposta) => {
                    const statusInfo = statusConfig[proposta.status]
                    const StatusIcon = statusInfo.icon
                    return (
                      <tr key={proposta.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-4 px-4">
                          <span className="font-mono text-sm font-medium">{proposta.numero}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm">{proposta.cliente.nome}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-muted-foreground">
                            {proposta.vendedor.user.name}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant="outline" className="text-xs">
                            {categoriaConfig[proposta.categoria]}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="font-medium">{formatCurrency(proposta.valor)}</span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {renderMargem(calcularMargem(proposta))}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <Badge variant={statusInfo.variant} className="gap-1">
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-muted-foreground">
                            {formatDate(proposta.createdAt)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleViewProposta(proposta)}
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {proposta.status === 'EM_ABERTO' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleEditProposta(proposta)}
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
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

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowModal(false); resetForm() }}
          />
          <Card className="relative z-10 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {editingId ? 'Editar Proposta' : 'Nova Proposta'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => { setShowModal(false); resetForm() }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cliente */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Cliente <span className="text-destructive">*</span>
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formData.clienteId}
                  onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
                >
                  <option value="">Selecione um cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vendedor */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Vendedor <span className="text-destructive">*</span>
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formData.vendedorId}
                  onChange={(e) => setFormData({ ...formData, vendedorId: e.target.value })}
                >
                  <option value="">Selecione um vendedor</option>
                  {vendedores.map((vendedor) => (
                    <option key={vendedor.id} value={vendedor.id}>
                      {vendedor.user.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Categoria</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value as any })}
                >
                  <option value="RODANTE">Rodante</option>
                  <option value="PECA">Peça</option>
                  <option value="CILINDRO">Cilindro</option>
                </select>
              </div>

              {/* Valor e Custo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Valor (R$) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="0,00"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Custo Estimado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="0,00"
                    value={formData.custoEstimado}
                    onChange={(e) => setFormData({ ...formData, custoEstimado: e.target.value })}
                  />
                </div>
              </div>

              {/* Margem Preview */}
              {formData.valor && formData.custoEstimado && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Margem estimada: </span>
                  <span className="text-sm font-medium">
                    {(((parseFloat(formData.valor) - parseFloat(formData.custoEstimado)) / parseFloat(formData.valor)) * 100).toFixed(1)}%
                  </span>
                </div>
              )}

              {/* Data Validade */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Data de Validade</label>
                <input
                  type="date"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formData.dataValidade}
                  onChange={(e) => setFormData({ ...formData, dataValidade: e.target.value })}
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowModal(false); resetForm() }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSaveProposta}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      {editingId ? 'Salvar' : 'Criar Proposta'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedProposta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowViewModal(false); setSelectedProposta(null) }}
          />
          <Card className="relative z-10 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Proposta {selectedProposta.numero}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => { setShowViewModal(false); setSelectedProposta(null) }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-center py-2">
                <Badge variant={statusConfig[selectedProposta.status].variant} className="gap-1 text-sm px-3 py-1">
                  {React.createElement(statusConfig[selectedProposta.status].icon, { className: 'w-4 h-4' })}
                  {statusConfig[selectedProposta.status].label}
                </Badge>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedProposta.cliente.nome}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Vendedor</p>
                  <p className="font-medium">{selectedProposta.vendedor.user.name}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Categoria</p>
                  <p className="font-medium">{categoriaConfig[selectedProposta.categoria]}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="font-medium">{formatDate(selectedProposta.createdAt)}</p>
                </div>
              </div>

              {/* Valores */}
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Valor</span>
                  <span className="text-lg font-bold">{formatCurrency(selectedProposta.valor)}</span>
                </div>
                {selectedProposta.custoEstimado && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Custo Estimado</span>
                    <span className="text-sm">{formatCurrency(selectedProposta.custoEstimado)}</span>
                  </div>
                )}
                {(() => {
                  const margem = calcularMargem(selectedProposta)
                  if (margem === null) return null
                  return (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Margem</span>
                      <span className={`font-medium ${margem >= 20 ? 'text-green-500' : margem >= 10 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {margem.toFixed(1)}%
                      </span>
                    </div>
                  )
                })()}
              </div>

              {/* Laudo */}
              {selectedProposta.laudo && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Laudo Vinculado</p>
                  <p className="font-mono font-medium">{selectedProposta.laudo.numero}</p>
                </div>
              )}

              {/* Validade */}
              {selectedProposta.dataValidade && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Válida até</p>
                  <p className="font-medium">{formatDate(selectedProposta.dataValidade)}</p>
                </div>
              )}

              {/* Actions */}
              {selectedProposta.status === 'EM_ABERTO' && (
                <div className="space-y-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleEditProposta(selectedProposta)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Proposta
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleUpdateStatus(selectedProposta.id, 'CANCELADA')}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleUpdateStatus(selectedProposta.id, 'AGUARDANDO_APROVACAO')}
                    >
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Solicitar Aprovação
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => handleUpdateStatus(selectedProposta.id, 'APROVADA')}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprovar
                    </Button>
                  </div>
                </div>
              )}

              {selectedProposta.status === 'AGUARDANDO_APROVACAO' && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleUpdateStatus(selectedProposta.id, 'REPROVADA')}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reprovar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleUpdateStatus(selectedProposta.id, 'APROVADA')}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aprovar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

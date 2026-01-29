'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Wrench,
  Plus,
  Search,
  Filter,
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
  AlertCircle,
  RefreshCw,
  Eye,
  Trash2,
  Building2,
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

interface Cliente {
  id: string
  nome: string
  cidade: string | null
  telefone: string | null
}

interface Vendedor {
  id: string
  user: {
    id: string
    name: string
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

export default function VisitasTecnicasPage() {
  const router = useRouter()
  const [visitasTecnicas, setVisitasTecnicas] = useState<VisitaTecnica[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedVisita, setSelectedVisita] = useState<VisitaTecnica | null>(null)
  const [saving, setSaving] = useState(false)
  const [motivoCancelamento, setMotivoCancelamento] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    vendedorId: '',
    clienteId: '',
    dataVisita: '',
    equipamentos: [''],
    observacao: '',
  })

  useEffect(() => {
    fetchVisitasTecnicas()
    fetchClientes()
    fetchVendedores()
  }, [filterStatus])

  const fetchVisitasTecnicas = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus) params.append('status', filterStatus)

      const res = await fetch(`${API_URL}/visitas-tecnicas?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar visitas técnicas')
      const data = await res.json()
      setVisitasTecnicas(data)
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
      vendedorId: '',
      clienteId: '',
      dataVisita: '',
      equipamentos: [''],
      observacao: '',
    })
  }

  const addEquipamento = () => {
    setFormData({
      ...formData,
      equipamentos: [...formData.equipamentos, ''],
    })
  }

  const removeEquipamento = (index: number) => {
    if (formData.equipamentos.length > 1) {
      setFormData({
        ...formData,
        equipamentos: formData.equipamentos.filter((_, i) => i !== index),
      })
    }
  }

  const updateEquipamento = (index: number, value: string) => {
    const newEquipamentos = [...formData.equipamentos]
    newEquipamentos[index] = value
    setFormData({ ...formData, equipamentos: newEquipamentos })
  }

  const handleSaveVisita = async () => {
    if (!formData.vendedorId || !formData.clienteId || !formData.dataVisita) {
      setError('Preencha todos os campos obrigatórios')
      return
    }

    const equipamentosFiltrados = formData.equipamentos.filter(e => e.trim() !== '')
    if (equipamentosFiltrados.length === 0) {
      setError('Informe pelo menos um equipamento')
      return
    }

    try {
      setSaving(true)
      setError('')

      // Corrigir observação com IA antes de salvar
      let observacaoFinal = formData.observacao
      if (observacaoFinal && observacaoFinal.trim()) {
        try {
          const aiRes = await fetch(`${API_URL}/ai/corrigir-texto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texto: observacaoFinal }),
          })
          if (aiRes.ok) {
            const aiData = await aiRes.json()
            if (aiData.corrigido && aiData.textoCorrigido) {
              observacaoFinal = aiData.textoCorrigido
            }
          }
        } catch {
          // Se falhar a correção, usa o texto original
        }
      }

      const res = await fetch(`${API_URL}/visitas-tecnicas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          observacao: observacaoFinal,
          equipamentos: equipamentosFiltrados,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar visita técnica')
      }

      setShowModal(false)
      resetForm()
      fetchVisitasTecnicas()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
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
        throw new Error(data.error || 'Erro ao cancelar visita técnica')
      }

      setShowCancelModal(false)
      setSelectedVisita(null)
      setMotivoCancelamento('')
      fetchVisitasTecnicas()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteVisita = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta solicitação?')) return

    try {
      const res = await fetch(`${API_URL}/visitas-tecnicas/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao excluir visita técnica')
      }

      fetchVisitasTecnicas()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const formatDateInput = (dateString: string) => {
    return dateString.split('T')[0]
  }

  const filteredVisitas = visitasTecnicas.filter(
    (v) =>
      v.cliente.nome.toLowerCase().includes(search.toLowerCase()) ||
      v.equipamentos.some(e => e.toLowerCase().includes(search.toLowerCase()))
  )

  const stats = {
    total: visitasTecnicas.length,
    pendentes: visitasTecnicas.filter((v) => v.status === 'PENDENTE').length,
    confirmadas: visitasTecnicas.filter((v) => v.status === 'CONFIRMADA').length,
    realizadas: visitasTecnicas.filter((v) => v.status === 'REALIZADA').length,
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
            <h1 className="text-3xl font-bold tracking-tight">Visitas Tecnicas</h1>
            <p className="text-muted-foreground mt-1">
              Solicitacoes de visita tecnica para inspecao
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchVisitasTecnicas}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Solicitacao
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
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
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

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente ou equipamento..."
                  className="pl-10 w-80 bg-muted/50"
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
                <option value="PENDENTE">Pendentes</option>
                <option value="CONFIRMADA">Confirmadas</option>
                <option value="REALIZADA">Realizadas</option>
                <option value="CANCELADA">Canceladas</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredVisitas.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Wrench className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma visita tecnica encontrada</p>
              <Button size="sm" className="mt-4" onClick={() => setShowModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Solicitacao
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-y border-border bg-muted/30">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Data
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Equipamentos
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Solicitante
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Acoes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredVisitas.map((visita) => {
                    const statusConfig = STATUS_CONFIG[visita.status]
                    const StatusIcon = statusConfig.icon
                    return (
                      <tr key={visita.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{formatDate(visita.dataVisita)}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium">{visita.cliente.nome}</p>
                            {visita.cliente.cidade && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" />
                                {visita.cliente.cidade}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1">
                            {visita.equipamentos.slice(0, 2).map((eq, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {eq}
                              </Badge>
                            ))}
                            {visita.equipamentos.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{visita.equipamentos.length - 2}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{visita.vendedor.user.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge className={`text-xs ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setSelectedVisita(visita)
                                setShowViewModal(true)
                              }}
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {visita.status === 'PENDENTE' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-yellow-600 hover:text-yellow-700"
                                  onClick={() => {
                                    setSelectedVisita(visita)
                                    setShowCancelModal(true)
                                  }}
                                  title="Cancelar"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteVisita(visita.id)}
                                  title="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
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
            onClick={() => {
              setShowModal(false)
              resetForm()
            }}
          />
          <Card className="relative z-10 w-full max-w-xl mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="w-5 h-5" />
                  Nova Solicitacao de Visita Tecnica
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Vendedor Solicitante *</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.vendedorId}
                    onChange={(e) => setFormData({ ...formData, vendedorId: e.target.value })}
                  >
                    <option value="">Selecione o vendedor</option>
                    {vendedores.map((vendedor) => (
                      <option key={vendedor.id} value={vendedor.id}>
                        {vendedor.user.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.clienteId}
                    onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
                  >
                    <option value="">Selecione o cliente</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nome} {cliente.cidade ? `- ${cliente.cidade}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Data da Visita *</Label>
                  <Input
                    type="date"
                    value={formData.dataVisita}
                    onChange={(e) => setFormData({ ...formData, dataVisita: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Equipamentos *</Label>
                  <div className="space-y-2">
                    {formData.equipamentos.map((eq, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder={`Equipamento ${index + 1} (ex: SANY 750H, Caterpillar D6)`}
                          value={eq}
                          onChange={(e) => updateEquipamento(index, e.target.value)}
                        />
                        {formData.equipamentos.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 p-0"
                            onClick={() => removeEquipamento(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addEquipamento}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Equipamento
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observacao</Label>
                  <Textarea
                    placeholder="Observacoes sobre a visita, historico, etc..."
                    value={formData.observacao}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, observacao: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              {/* Error in modal */}
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                    setError('')
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSaveVisita}
                  disabled={saving || !formData.vendedorId || !formData.clienteId || !formData.dataVisita}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Solicitar Visita
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
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
                  <Wrench className="w-5 h-5" />
                  Detalhes da Visita Tecnica
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
                  Criado em {formatDate(selectedVisita.createdAt)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Data da Visita</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(selectedVisita.dataVisita)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Solicitante</p>
                  <p className="text-sm flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {selectedVisita.vendedor.user.name}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase">Cliente</p>
                <p className="text-sm font-medium flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {selectedVisita.cliente.nome}
                </p>
                {selectedVisita.cliente.cidade && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {selectedVisita.cliente.cidade}
                    {selectedVisita.cliente.endereco && ` - ${selectedVisita.cliente.endereco}`}
                  </p>
                )}
                {selectedVisita.cliente.telefone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" />
                    {selectedVisita.cliente.telefone}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">Equipamentos</p>
                <div className="flex flex-wrap gap-2">
                  {selectedVisita.equipamentos.map((eq, i) => (
                    <Badge key={i} variant="outline">
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
                    Cancelar Visita
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
                  Cancelar Visita Tecnica
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
                Voce esta cancelando a visita tecnica para <strong>{selectedVisita.cliente.nome}</strong> agendada para <strong>{formatDate(selectedVisita.dataVisita)}</strong>.
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

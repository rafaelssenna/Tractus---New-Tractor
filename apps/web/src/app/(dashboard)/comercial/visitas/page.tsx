'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  Circle,
  Play,
  User,
  Building2,
  Phone,
  FileText,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Navigation,
  Loader2,
  X,
  RefreshCw,
} from 'lucide-react'

interface Visita {
  id: string
  data: string
  checkIn: string | null
  checkOut: string | null
  observacoes: string | null
  status: 'agendada' | 'em_andamento' | 'concluida'
  duracao: number | null
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
  laudo: {
    id: string
    numero: string
    status: string
  } | null
}

interface Cliente {
  id: string
  nome: string
  cidade: string | null
}

interface Vendedor {
  id: string
  user: {
    id: string
    name: string
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function VisitasPage() {
  const router = useRouter()
  const [visitas, setVisitas] = useState<Visita[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [search, setSearch] = useState('')
  const [filterVendedor, setFilterVendedor] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterData, setFilterData] = useState('')

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedVisita, setSelectedVisita] = useState<Visita | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    clienteId: '',
    vendedorId: '',
    data: new Date().toISOString().split('T')[0],
    observacoes: '',
  })

  // Fetch data
  useEffect(() => {
    fetchVisitas()
    fetchClientes()
    fetchVendedores()
  }, [filterVendedor, filterStatus, filterData])

  const fetchVisitas = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterVendedor) params.append('vendedorId', filterVendedor)
      if (filterStatus) params.append('status', filterStatus)
      if (filterData) params.append('data', filterData)

      const res = await fetch(`${API_URL}/visitas?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar visitas')

      const data = await res.json()
      setVisitas(data)
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
    } catch (err) {
      console.error(err)
    }
  }

  const fetchVendedores = async () => {
    try {
      const res = await fetch(`${API_URL}/vendedores`)
      if (!res.ok) throw new Error('Erro ao carregar vendedores')
      const data = await res.json()
      setVendedores(data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreateVisita = async () => {
    try {
      setSaving(true)
      const res = await fetch(`${API_URL}/visitas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar visita')
      }

      setShowModal(false)
      resetForm()
      fetchVisitas()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCheckIn = async (visitaId: string) => {
    try {
      // Get current location
      let latitude, longitude
      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject)
        }).catch(() => null)

        if (position) {
          latitude = position.coords.latitude
          longitude = position.coords.longitude
        }
      }

      const res = await fetch(`${API_URL}/visitas/${visitaId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao fazer check-in')
      }

      fetchVisitas()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleCheckOut = async (visitaId: string, observacoes?: string) => {
    try {
      let latitude, longitude
      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject)
        }).catch(() => null)

        if (position) {
          latitude = position.coords.latitude
          longitude = position.coords.longitude
        }
      }

      const res = await fetch(`${API_URL}/visitas/${visitaId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, observacoes }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao fazer check-out')
      }

      fetchVisitas()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDeleteVisita = async (visitaId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta visita?')) return

    try {
      const res = await fetch(`${API_URL}/visitas/${visitaId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao excluir visita')
      }

      fetchVisitas()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const resetForm = () => {
    setFormData({
      clienteId: '',
      vendedorId: '',
      data: new Date().toISOString().split('T')[0],
      observacoes: '',
    })
    setSelectedVisita(null)
  }

  const openCreateModal = () => {
    resetForm()
    setModalMode('create')
    setShowModal(true)
  }

  const filteredVisitas = visitas.filter((v) =>
    v.cliente.nome.toLowerCase().includes(search.toLowerCase()) ||
    v.vendedor.user.name.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'concluida':
        return (
          <Badge className="bg-success/20 text-success border-success/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Concluída
          </Badge>
        )
      case 'em_andamento':
        return (
          <Badge className="bg-info/20 text-info border-info/30">
            <Play className="w-3 h-3 mr-1" />
            Em Andamento
          </Badge>
        )
      default:
        return (
          <Badge className="bg-muted text-muted-foreground">
            <Circle className="w-3 h-3 mr-1" />
            Agendada
          </Badge>
        )
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR')
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}min`
    }
    return `${mins}min`
  }

  // Stats
  const stats = {
    total: visitas.length,
    agendadas: visitas.filter(v => v.status === 'agendada').length,
    emAndamento: visitas.filter(v => v.status === 'em_andamento').length,
    concluidas: visitas.filter(v => v.status === 'concluida').length,
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
            <h1 className="text-3xl font-bold tracking-tight">Visitas</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie as visitas do time comercial
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchVisitas}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button size="sm" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Visita
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Agendadas</p>
                <p className="text-2xl font-bold">{stats.agendadas}</p>
              </div>
              <Circle className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-info/20 bg-info/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
                <p className="text-2xl font-bold text-info">{stats.emAndamento}</p>
              </div>
              <Play className="w-8 h-8 text-info" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-success/20 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Concluídas</p>
                <p className="text-2xl font-bold text-success">{stats.concluidas}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>
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

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente ou representante comercial..."
                className="pl-10 bg-muted/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-10 px-3 rounded-md border border-input bg-muted/50 text-sm"
              value={filterVendedor}
              onChange={(e) => setFilterVendedor(e.target.value)}
            >
              <option value="">Todos representantes comerciais</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>{v.user.name}</option>
              ))}
            </select>
            <select
              className="h-10 px-3 rounded-md border border-input bg-muted/50 text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Todos status</option>
              <option value="agendada">Agendada</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="concluida">Concluída</option>
            </select>
            <Input
              type="date"
              className="w-40 bg-muted/50"
              value={filterData}
              onChange={(e) => setFilterData(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Visitas List */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredVisitas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mb-4" />
              <p>Nenhuma visita encontrada</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={openCreateModal}>
                <Plus className="w-4 h-4 mr-2" />
                Agendar Visita
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Data
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Representante Comercial
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Check-in
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Check-out
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Duração
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredVisitas.map((visita) => (
                    <tr key={visita.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{formatDate(visita.data)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium">{visita.cliente.nome}</p>
                          {visita.cliente.cidade && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {visita.cliente.cidade}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            {visita.vendedor.user.photo ? (
                              <img
                                src={visita.vendedor.user.photo}
                                alt={visita.vendedor.user.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-bold text-primary">
                                {visita.vendedor.user.name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <span className="text-sm">{visita.vendedor.user.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {visita.checkIn ? (
                          <span className="text-sm text-success flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(visita.checkIn)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {visita.checkOut ? (
                          <span className="text-sm text-success flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(visita.checkOut)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm">{formatDuration(visita.duracao)}</span>
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(visita.status)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-1">
                          {visita.status === 'agendada' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs text-success border-success/30 hover:bg-success/10"
                              onClick={() => handleCheckIn(visita.id)}
                            >
                              <Navigation className="w-3 h-3 mr-1" />
                              Check-in
                            </Button>
                          )}
                          {visita.status === 'em_andamento' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs text-info border-info/30 hover:bg-info/10"
                              onClick={() => handleCheckOut(visita.id)}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Check-out
                            </Button>
                          )}
                          {visita.laudo && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <FileText className="w-4 h-4 text-primary" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye className="w-4 h-4" />
                          </Button>
                          {visita.status === 'agendada' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive"
                              onClick={() => handleDeleteVisita(visita.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
            onClick={() => setShowModal(false)}
          />
          <Card className="relative z-10 w-full max-w-md mx-4 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle>
                  {modalMode === 'create' ? 'Nova Visita' : 'Editar Visita'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={formData.clienteId}
                  onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
                  required
                >
                  <option value="">Selecione um cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.cidade ? `- ${c.cidade}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Representante Comercial</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={formData.vendedorId}
                  onChange={(e) => setFormData({ ...formData, vendedorId: e.target.value })}
                  required
                >
                  <option value="">Selecione um representante comercial</option>
                  {vendedores.map((v) => (
                    <option key={v.id} value={v.id}>{v.user.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <textarea
                  className="w-full h-24 px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                  placeholder="Notas sobre a visita..."
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreateVisita}
                  disabled={saving || !formData.clienteId || !formData.vendedorId}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Agendar Visita
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

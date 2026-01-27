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
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  User,
  Building2,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  RefreshCw,
  Copy,
  Route,
  Users,
} from 'lucide-react'

interface Cliente {
  id: string
  nome: string
  cidade: string | null
}

interface RotaCliente {
  id: string
  cliente: Cliente
  ordem: number
}

interface Vendedor {
  id: string
  user: {
    id: string
    name: string
    photo: string | null
  }
}

interface Rota {
  id: string
  nome: string
  active: boolean
  vendedor: {
    id: string
    userId: string
    name: string
    photo: string | null
  }
  clientesPorDia: {
    SEGUNDA: RotaCliente[]
    TERCA: RotaCliente[]
    QUARTA: RotaCliente[]
    QUINTA: RotaCliente[]
    SEXTA: RotaCliente[]
    SABADO: RotaCliente[]
  }
  totalClientes: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

const diasSemana = [
  { key: 'SEGUNDA', label: 'Segunda' },
  { key: 'TERCA', label: 'Terça' },
  { key: 'QUARTA', label: 'Quarta' },
  { key: 'QUINTA', label: 'Quinta' },
  { key: 'SEXTA', label: 'Sexta' },
  { key: 'SABADO', label: 'Sábado' },
] as const

export default function RotasPage() {
  const router = useRouter()
  const [rotas, setRotas] = useState<Rota[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Selected rota for editing
  const [selectedRota, setSelectedRota] = useState<Rota | null>(null)

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAddClienteModal, setShowAddClienteModal] = useState(false)
  const [selectedDia, setSelectedDia] = useState<string>('')
  const [saving, setSaving] = useState(false)

  // Form state
  const [newRotaForm, setNewRotaForm] = useState({
    nome: '',
    vendedorId: '',
  })

  const [addClienteForm, setAddClienteForm] = useState({
    clienteId: '',
    diaSemana: '',
  })

  useEffect(() => {
    fetchRotas()
    fetchClientes()
    fetchVendedores()
  }, [])

  const fetchRotas = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/rotas`)
      if (!res.ok) throw new Error('Erro ao carregar rotas')
      const data = await res.json()
      setRotas(data)
      if (data.length > 0 && !selectedRota) {
        setSelectedRota(data[0])
      }
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

  const handleCreateRota = async () => {
    try {
      setSaving(true)
      const res = await fetch(`${API_URL}/rotas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRotaForm),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar rota')
      }

      setShowCreateModal(false)
      setNewRotaForm({ nome: '', vendedorId: '' })
      fetchRotas()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAddCliente = async () => {
    if (!selectedRota) return

    try {
      setSaving(true)
      const res = await fetch(`${API_URL}/rotas/${selectedRota.id}/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: addClienteForm.clienteId,
          diaSemana: addClienteForm.diaSemana,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao adicionar cliente')
      }

      setShowAddClienteModal(false)
      setAddClienteForm({ clienteId: '', diaSemana: '' })
      fetchRotas()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveCliente = async (rotaClienteId: string) => {
    if (!selectedRota) return
    if (!confirm('Remover cliente desta rota?')) return

    try {
      const res = await fetch(`${API_URL}/rotas/${selectedRota.id}/clientes/${rotaClienteId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao remover cliente')
      }

      fetchRotas()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleCopiarDia = async (diaOrigem: string, diaDestino: string) => {
    if (!selectedRota) return

    try {
      const res = await fetch(`${API_URL}/rotas/${selectedRota.id}/copiar-dia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diaOrigem, diaDestino }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao copiar dia')
      }

      fetchRotas()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const openAddClienteModal = (dia: string) => {
    setSelectedDia(dia)
    setAddClienteForm({ clienteId: '', diaSemana: dia })
    setShowAddClienteModal(true)
  }

  // Get available clients (not in current day)
  const getAvailableClientes = (dia: string) => {
    if (!selectedRota) return clientes

    const clientesNoDia = selectedRota.clientesPorDia[dia as keyof typeof selectedRota.clientesPorDia]?.map(
      (rc) => rc.cliente.id
    ) || []

    return clientes.filter((c) => !clientesNoDia.includes(c.id))
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
            <h1 className="text-3xl font-bold tracking-tight">Rotas Semanais</h1>
            <p className="text-muted-foreground mt-1">
              Configure as rotas de visitas do time comercial
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRotas}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Rota
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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : rotas.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Route className="w-12 h-12 mb-4" />
            <p>Nenhuma rota cadastrada</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Rota
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Rotas List */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Vendedores
            </h3>
            {rotas.map((rota) => (
              <Card
                key={rota.id}
                className={`border-border/50 cursor-pointer transition-all hover:border-primary/50 ${
                  selectedRota?.id === rota.id ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => setSelectedRota(rota)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      {rota.vendedor.photo ? (
                        <img
                          src={rota.vendedor.photo}
                          alt={rota.vendedor.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-bold text-primary">
                          {rota.vendedor.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{rota.vendedor.name}</p>
                      <p className="text-xs text-muted-foreground">{rota.nome}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {rota.totalClientes}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Weekly Schedule */}
          {selectedRota && (
            <div className="lg:col-span-3">
              <Card className="border-border/50">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{selectedRota.nome}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedRota.vendedor.name} - {selectedRota.totalClientes} clientes na semana
                      </p>
                    </div>
                    <Badge className={selectedRota.active ? 'bg-success/20 text-success' : 'bg-muted'}>
                      {selectedRota.active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {diasSemana.map((dia) => {
                      const clientesDia =
                        selectedRota.clientesPorDia[dia.key as keyof typeof selectedRota.clientesPorDia] || []

                      return (
                        <div
                          key={dia.key}
                          className="rounded-lg border border-border/50 overflow-hidden"
                        >
                          <div className="bg-muted/50 px-3 py-2 flex items-center justify-between">
                            <span className="text-sm font-semibold">{dia.label}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {clientesDia.length}
                            </Badge>
                          </div>
                          <div className="p-2 space-y-2 min-h-[200px]">
                            {clientesDia.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-4">
                                Sem visitas
                              </p>
                            ) : (
                              clientesDia.map((rc, index) => (
                                <div
                                  key={rc.id}
                                  className="group p-2 rounded-md bg-card border border-border/50 hover:border-primary/30 transition-colors"
                                >
                                  <div className="flex items-start gap-2">
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      {index + 1}.
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate">
                                        {rc.cliente.nome}
                                      </p>
                                      {rc.cliente.cidade && (
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                          <MapPin className="w-2.5 h-2.5" />
                                          {rc.cliente.cidade}
                                        </p>
                                      )}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemoveCliente(rc.id)
                                      }}
                                    >
                                      <X className="w-3 h-3 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              ))
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => openAddClienteModal(dia.key)}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Adicionar
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Create Rota Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <Card className="relative z-10 w-full max-w-md mx-4 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle>Nova Rota</CardTitle>
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
              <div className="space-y-2">
                <Label>Nome da Rota</Label>
                <Input
                  placeholder="Ex: Rota BH Centro"
                  value={newRotaForm.nome}
                  onChange={(e) => setNewRotaForm({ ...newRotaForm, nome: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Vendedor</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={newRotaForm.vendedorId}
                  onChange={(e) => setNewRotaForm({ ...newRotaForm, vendedorId: e.target.value })}
                >
                  <option value="">Selecione um vendedor</option>
                  {vendedores.map((v) => (
                    <option key={v.id} value={v.id}>{v.user.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreateRota}
                  disabled={saving || !newRotaForm.nome || !newRotaForm.vendedorId}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Rota
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Cliente Modal */}
      {showAddClienteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAddClienteModal(false)}
          />
          <Card className="relative z-10 w-full max-w-md mx-4 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle>Adicionar Cliente</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowAddClienteModal(false)}
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
                  value={addClienteForm.clienteId}
                  onChange={(e) => setAddClienteForm({ ...addClienteForm, clienteId: e.target.value })}
                >
                  <option value="">Selecione um cliente</option>
                  {getAvailableClientes(selectedDia).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.cidade ? `- ${c.cidade}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Dia da Semana</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={addClienteForm.diaSemana}
                  onChange={(e) => setAddClienteForm({ ...addClienteForm, diaSemana: e.target.value })}
                >
                  {diasSemana.map((dia) => (
                    <option key={dia.key} value={dia.key}>{dia.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddClienteModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddCliente}
                  disabled={saving || !addClienteForm.clienteId}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adicionando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
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

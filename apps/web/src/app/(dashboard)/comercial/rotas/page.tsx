'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
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
  Wrench,
  Pencil,
  MessageSquare,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

interface Cliente {
  id: string
  nome: string
  cidade: string | null
  observacoes: string | null
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
  const { user } = useAuth()
  const [rotas, setRotas] = useState<Rota[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Verificar se é vendedora (COMERCIAL)
  const isVendedora = user?.role === 'COMERCIAL'

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

  // Solicitar Inspetor modal
  const [showSolicitarInspetorModal, setShowSolicitarInspetorModal] = useState(false)
  const [solicitarInspetorForm, setSolicitarInspetorForm] = useState({
    clienteId: '',
    clienteNome: '',
    equipamentos: [] as string[],
    novoEquipamento: '',
    observacao: '',
  })

  // Editar Observacoes modal
  const [showEditObsModal, setShowEditObsModal] = useState(false)
  const [editObsForm, setEditObsForm] = useState({
    clienteId: '',
    clienteNome: '',
    observacoes: '',
  })
  const [savingObs, setSavingObs] = useState(false)

  // Clientes visitados hoje (localStorage)
  const [clientesVisitadosHoje, setClientesVisitadosHoje] = useState<string[]>([])

  // Carregar clientes visitados do localStorage
  useEffect(() => {
    const hoje = new Date().toISOString().split('T')[0]
    const storageKey = `visitados_${hoje}`
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      setClientesVisitadosHoje(JSON.parse(saved))
    }
    // Limpar dias anteriores
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('visitados_') && key !== storageKey) {
        localStorage.removeItem(key)
      }
    })
  }, [])

  // Helper para pegar o dia da semana atual
  const getDiaSemanaAtual = () => {
    const diasMap: Record<number, string> = {
      0: 'DOMINGO',
      1: 'SEGUNDA',
      2: 'TERCA',
      3: 'QUARTA',
      4: 'QUINTA',
      5: 'SEXTA',
      6: 'SABADO',
    }
    return diasMap[new Date().getDay()]
  }

  const diaSemanaAtual = getDiaSemanaAtual()
  const clientesHoje = selectedRota?.clientesPorDia[diaSemanaAtual as keyof typeof selectedRota.clientesPorDia] || []

  useEffect(() => {
    fetchRotas()
    fetchClientes()
    fetchVendedores()
  }, [user])

  const fetchRotas = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/rotas`)
      if (!res.ok) throw new Error('Erro ao carregar rotas')
      const data = await res.json()

      // Se é vendedora, filtrar só a rota dela
      let rotasFiltradas = data
      if (isVendedora && user?.id) {
        rotasFiltradas = data.filter((r: Rota) => r.vendedor.userId === user.id)
      }

      setRotas(rotasFiltradas)
      if (rotasFiltradas.length > 0 && !selectedRota) {
        setSelectedRota(rotasFiltradas[0])
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

  const openSolicitarInspetorModal = (cliente: Cliente) => {
    setSolicitarInspetorForm({
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      equipamentos: [],
      novoEquipamento: '',
      observacao: '',
    })
    setShowSolicitarInspetorModal(true)
  }

  const openEditObsModal = (cliente: Cliente) => {
    setEditObsForm({
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      observacoes: cliente.observacoes || '',
    })
    setShowEditObsModal(true)
  }

  const handleSaveObservacoes = async () => {
    try {
      setSavingObs(true)
      const res = await fetch(`${API_URL}/clientes/${editObsForm.clienteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observacoes: editObsForm.observacoes || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar observacoes')
      }

      setShowEditObsModal(false)
      // Recarregar rotas para atualizar os dados do cliente
      fetchRotas()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingObs(false)
    }
  }

  const marcarComoVisitado = (clienteId: string) => {
    const hoje = new Date().toISOString().split('T')[0]
    const storageKey = `visitados_${hoje}`
    const novosVisitados = [...clientesVisitadosHoje, clienteId]
    setClientesVisitadosHoje(novosVisitados)
    localStorage.setItem(storageKey, JSON.stringify(novosVisitados))
  }

  const desmarcarComoVisitado = (clienteId: string) => {
    const hoje = new Date().toISOString().split('T')[0]
    const storageKey = `visitados_${hoje}`
    const novosVisitados = clientesVisitadosHoje.filter(id => id !== clienteId)
    setClientesVisitadosHoje(novosVisitados)
    localStorage.setItem(storageKey, JSON.stringify(novosVisitados))
  }

  const handleAddEquipamento = () => {
    if (solicitarInspetorForm.novoEquipamento.trim()) {
      setSolicitarInspetorForm({
        ...solicitarInspetorForm,
        equipamentos: [...solicitarInspetorForm.equipamentos, solicitarInspetorForm.novoEquipamento.trim()],
        novoEquipamento: '',
      })
    }
  }

  const handleRemoveEquipamento = (index: number) => {
    setSolicitarInspetorForm({
      ...solicitarInspetorForm,
      equipamentos: solicitarInspetorForm.equipamentos.filter((_, i) => i !== index),
    })
  }

  const handleSolicitarInspetor = async () => {
    if (!selectedRota) return

    try {
      setSaving(true)
      const res = await fetch(`${API_URL}/visitas-tecnicas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: solicitarInspetorForm.clienteId,
          vendedorId: selectedRota.vendedor.id,
          equipamentos: solicitarInspetorForm.equipamentos,
          observacao: solicitarInspetorForm.observacao || undefined,
          dataVisita: new Date().toISOString(), // Data provisória, inspetor define depois
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao solicitar inspecao')
      }

      setShowSolicitarInspetorModal(false)
      setSolicitarInspetorForm({
        clienteId: '',
        clienteNome: '',
        equipamentos: [],
        novoEquipamento: '',
        observacao: '',
      })
      // Show success message
      alert('Solicitacao enviada com sucesso! O inspetor definira a data.')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
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
            <h1 className="text-3xl font-bold tracking-tight">
              {isVendedora ? 'Minha Rota' : 'Rotas Semanais'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isVendedora ? 'Sua rota de visitas semanal' : 'Configure as rotas de visitas do time comercial'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRotas}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          {!isVendedora && (
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Rota
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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : rotas.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Route className="w-12 h-12 mb-4" />
            <p>{isVendedora ? 'Voce ainda nao tem uma rota configurada' : 'Nenhuma rota cadastrada'}</p>
            {!isVendedora && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Rota
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className={`grid grid-cols-1 ${isVendedora ? '' : 'lg:grid-cols-4'} gap-6`}>
          {/* Rotas List - só mostra se NÃO for vendedora */}
          {!isVendedora && (
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
          )}

          {/* Weekly Schedule */}
          {selectedRota && (
            <div className={isVendedora ? '' : 'lg:col-span-3'}>
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
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0"
                                        title="Solicitar Inspetor"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          openSolicitarInspetorModal(rc.cliente)
                                        }}
                                      >
                                        <Wrench className="w-3 h-3 text-primary" />
                                      </Button>
                                      {!isVendedora && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 w-5 p-0"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleRemoveCliente(rc.id)
                                          }}
                                        >
                                          <X className="w-3 h-3 text-destructive" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                            {!isVendedora && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => openAddClienteModal(dia.key)}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Adicionar
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Visitas de Hoje - só para vendedoras */}
              {isVendedora && (
                <Card className="border-border/50 mt-6">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Calendar className="w-5 h-5" />
                          Visitas de Hoje
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {diasSemana.find(d => d.key === diaSemanaAtual)?.label || 'Hoje'} - {clientesHoje.length} cliente(s)
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {clientesHoje.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhuma visita programada para hoje</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {clientesHoje.map((rc, index) => {
                          const jaVisitou = clientesVisitadosHoje.includes(rc.cliente.id)
                          return (
                            <div
                              key={rc.id}
                              className={`p-4 rounded-lg border transition-colors ${
                                jaVisitou
                                  ? 'border-success/50 bg-success/5'
                                  : 'border-border/50 bg-card hover:border-primary/30'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold ${
                                    jaVisitou
                                      ? 'bg-success/20 text-success'
                                      : 'bg-primary/20 text-primary'
                                  }`}>
                                    {jaVisitou ? <CheckCircle className="w-4 h-4" /> : index + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`font-medium text-base ${jaVisitou ? 'line-through text-muted-foreground' : ''}`}>
                                      {rc.cliente.nome}
                                    </p>
                                    {rc.cliente.cidade && (
                                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <MapPin className="w-3 h-3" />
                                        {rc.cliente.cidade}
                                      </p>
                                    )}
                                    {rc.cliente.observacoes && (
                                      <div className="mt-2 p-2 rounded-md bg-[#3B82F6]/10 border border-[#3B82F6]/20 text-sm max-w-md">
                                        <p className="text-xs text-[#3B82F6] font-medium mb-1 flex items-center gap-1">
                                          <MessageSquare className="w-3 h-3" />
                                          Ultima anotacao:
                                        </p>
                                        <p className="text-foreground line-clamp-3">{rc.cliente.observacoes}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2 flex-shrink-0">
                                  {jaVisitou ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => desmarcarComoVisitado(rc.cliente.id)}
                                      className="text-muted-foreground"
                                    >
                                      <X className="w-4 h-4 mr-2" />
                                      Desfazer
                                    </Button>
                                  ) : (
                                    <>
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => marcarComoVisitado(rc.cliente.id)}
                                        className="bg-success hover:bg-success/90"
                                      >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Ja visitei
                                      </Button>
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => openSolicitarInspetorModal(rc.cliente)}
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                      >
                                        <Wrench className="w-4 h-4 mr-2" />
                                        Solicitar Inspetor
                                      </Button>
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => openEditObsModal(rc.cliente)}
                                        className="bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white"
                                      >
                                        <MessageSquare className="w-4 h-4 mr-2" />
                                        {rc.cliente.observacoes ? 'Editar Anotacao' : 'Adicionar Anotacao'}
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
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

      {/* Solicitar Inspetor Modal */}
      {showSolicitarInspetorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSolicitarInspetorModal(false)}
          />
          <Card className="relative z-10 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="w-5 h-5" />
                    Solicitar Inspecao
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cliente: {solicitarInspetorForm.clienteNome}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowSolicitarInspetorModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                <p>A data da visita sera definida pelo inspetor apos avaliar a solicitacao.</p>
              </div>

              <div className="space-y-2">
                <Label>Equipamentos para Inspecionar</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Trator John Deere 5075E"
                    value={solicitarInspetorForm.novoEquipamento}
                    onChange={(e) => setSolicitarInspetorForm({ ...solicitarInspetorForm, novoEquipamento: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddEquipamento()
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={handleAddEquipamento}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {solicitarInspetorForm.equipamentos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {solicitarInspetorForm.equipamentos.map((eq, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {eq}
                        <button
                          type="button"
                          onClick={() => handleRemoveEquipamento(index)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Observacao (opcional)</Label>
                <Textarea
                  placeholder="Informacoes adicionais para o inspetor..."
                  value={solicitarInspetorForm.observacao}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSolicitarInspetorForm({ ...solicitarInspetorForm, observacao: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowSolicitarInspetorModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSolicitarInspetor}
                  disabled={saving || solicitarInspetorForm.equipamentos.length === 0}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Solicitando...
                    </>
                  ) : (
                    <>
                      <Wrench className="w-4 h-4 mr-2" />
                      Solicitar Inspetor
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Editar Observacoes Modal */}
      {showEditObsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowEditObsModal(false)}
          />
          <Card className="relative z-10 w-full max-w-lg mx-4 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Minhas Anotacoes
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cliente: {editObsForm.clienteNome}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowEditObsModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                <p>Essas anotacoes sao particulares suas sobre o cliente. Use para lembrar detalhes importantes das conversas.</p>
              </div>

              <div className="space-y-2">
                <Label>Anotacoes</Label>
                <Textarea
                  placeholder="Ex: Gosta da cor azul, preferencia por tratores menores, conversar sobre financiamento..."
                  value={editObsForm.observacoes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditObsForm({ ...editObsForm, observacoes: e.target.value })}
                  rows={5}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowEditObsModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSaveObservacoes}
                  disabled={savingObs}
                >
                  {savingObs ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Salvar
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

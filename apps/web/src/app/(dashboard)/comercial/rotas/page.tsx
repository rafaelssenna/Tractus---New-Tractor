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

interface Anotacao {
  id: string
  texto: string
  createdAt: string
  vendedor: {
    user: {
      name: string
      photo: string | null
    }
  }
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

interface VisitaHoje {
  id: string
  clienteId: string
  checkIn: string | null
  checkOut: string | null
  enderecoIn: string | null
  enderecoOut: string | null
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

  // Anotacoes modal (novo sistema por vendedor)
  const [showAnotacoesModal, setShowAnotacoesModal] = useState(false)
  const [anotacoesModalData, setAnotacoesModalData] = useState({
    clienteId: '',
    clienteNome: '',
  })
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([])
  const [novaAnotacao, setNovaAnotacao] = useState('')
  const [loadingAnotacoes, setLoadingAnotacoes] = useState(false)
  const [savingAnotacao, setSavingAnotacao] = useState(false)
  const [resumoIA, setResumoIA] = useState<string | null>(null)
  const [loadingResumo, setLoadingResumo] = useState(false)

  // Visitas de hoje (do banco de dados)
  const [visitasHoje, setVisitasHoje] = useState<VisitaHoje[]>([])
  const [loadingCheckin, setLoadingCheckin] = useState<string | null>(null)

  // Clientes com solicitação de inspetor pendente (por clienteId)
  const [clientesComInspecao, setClientesComInspecao] = useState<Record<string, 'PENDENTE' | 'CONFIRMADA' | 'REALIZADA'>>({})

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

  // Buscar solicitações de inspeção e visitas de hoje quando a rota for selecionada
  useEffect(() => {
    if (selectedRota?.vendedor?.id) {
      fetchInspecoes()
      fetchVisitasHoje()
    }
  }, [selectedRota?.vendedor?.id])

  const fetchVisitasHoje = async () => {
    if (!selectedRota?.vendedor?.id) return
    try {
      const hoje = new Date().toISOString().split('T')[0]
      const res = await fetch(`${API_URL}/visitas?vendedorId=${selectedRota.vendedor.id}&data=${hoje}`)
      if (!res.ok) return
      const data = await res.json()
      setVisitasHoje(data.map((v: any) => ({
        id: v.id,
        clienteId: v.clienteId,
        checkIn: v.checkIn,
        checkOut: v.checkOut,
        enderecoIn: v.enderecoIn,
        enderecoOut: v.enderecoOut,
      })))
    } catch (err) {
      console.error('Erro ao buscar visitas de hoje:', err)
    }
  }

  // Helpers para verificar status de visita
  const getVisitaCliente = (clienteId: string) => visitasHoje.find(v => v.clienteId === clienteId)
  const clienteFezCheckIn = (clienteId: string) => {
    const visita = getVisitaCliente(clienteId)
    return visita?.checkIn != null
  }
  const clienteFezCheckOut = (clienteId: string) => {
    const visita = getVisitaCliente(clienteId)
    return visita?.checkOut != null
  }

  const fetchInspecoes = async () => {
    if (!selectedRota?.vendedor?.id) return
    try {
      const res = await fetch(`${API_URL}/visitas-tecnicas?vendedorId=${selectedRota.vendedor.id}`)
      if (!res.ok) return
      const data = await res.json()
      // Mapear clienteId -> status (apenas não canceladas)
      const mapa: Record<string, 'PENDENTE' | 'CONFIRMADA' | 'REALIZADA'> = {}
      data.forEach((vt: any) => {
        if (vt.status !== 'CANCELADA') {
          // Se já existe, priorizar: REALIZADA > CONFIRMADA > PENDENTE
          const atual = mapa[vt.clienteId]
          if (!atual || vt.status === 'REALIZADA' || (vt.status === 'CONFIRMADA' && atual === 'PENDENTE')) {
            mapa[vt.clienteId] = vt.status
          }
        }
      })
      setClientesComInspecao(mapa)
    } catch (err) {
      console.error('Erro ao buscar inspeções:', err)
    }
  }

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

  const openAnotacoesModal = async (cliente: Cliente) => {
    setAnotacoesModalData({
      clienteId: cliente.id,
      clienteNome: cliente.nome,
    })
    setNovaAnotacao('')
    setResumoIA(null)
    setShowAnotacoesModal(true)
    await fetchAnotacoes(cliente.id)
  }

  const fetchAnotacoes = async (clienteId: string) => {
    if (!selectedRota?.vendedor?.id) return
    setLoadingAnotacoes(true)
    try {
      const res = await fetch(`${API_URL}/anotacoes?clienteId=${clienteId}&vendedorId=${selectedRota.vendedor.id}`)
      if (!res.ok) throw new Error('Erro ao carregar anotacoes')
      const data = await res.json()
      setAnotacoes(data)
    } catch (err) {
      console.error(err)
      setAnotacoes([])
    } finally {
      setLoadingAnotacoes(false)
    }
  }

  const handleAddAnotacao = async () => {
    if (!novaAnotacao.trim() || !selectedRota?.vendedor?.id) return
    setSavingAnotacao(true)
    try {
      // Corrigir texto com IA antes de salvar
      let textoFinal = novaAnotacao
      try {
        const aiRes = await fetch(`${API_URL}/ai/corrigir-texto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texto: textoFinal }),
        })
        if (aiRes.ok) {
          const aiData = await aiRes.json()
          if (aiData.corrigido && aiData.textoCorrigido) {
            textoFinal = aiData.textoCorrigido
          }
        }
      } catch {
        // Se falhar a correção, usa o texto original
      }

      const res = await fetch(`${API_URL}/anotacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: anotacoesModalData.clienteId,
          vendedorId: selectedRota.vendedor.id,
          texto: textoFinal,
        }),
      })

      if (!res.ok) throw new Error('Erro ao salvar anotacao')

      setNovaAnotacao('')
      setResumoIA(null) // Limpa o resumo quando adiciona nova anotação
      await fetchAnotacoes(anotacoesModalData.clienteId)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingAnotacao(false)
    }
  }

  const handleGerarResumo = async () => {
    if (!selectedRota?.vendedor?.id) return
    setLoadingResumo(true)
    try {
      const res = await fetch(`${API_URL}/anotacoes/resumir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: anotacoesModalData.clienteId,
          vendedorId: selectedRota.vendedor.id,
        }),
      })

      if (!res.ok) throw new Error('Erro ao gerar resumo')

      const data = await res.json()
      setResumoIA(data.resumo)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingResumo(false)
    }
  }

  const handleDeleteAnotacao = async (anotacaoId: string) => {
    if (!confirm('Excluir esta anotacao?')) return
    try {
      const res = await fetch(`${API_URL}/anotacoes/${anotacaoId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Erro ao excluir anotacao')

      setResumoIA(null)
      await fetchAnotacoes(anotacoesModalData.clienteId)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Helper para obter geolocalização
  const getGeolocation = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        () => {
          // Se falhar, continua sem geolocalização
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    })
  }

  const handleCheckIn = async (clienteId: string) => {
    if (!selectedRota?.vendedor?.id) return
    setLoadingCheckin(clienteId)
    try {
      const hoje = new Date().toISOString().split('T')[0]

      // Capturar geolocalização
      const geo = await getGeolocation()

      // Primeiro criar a visita
      const createRes = await fetch(`${API_URL}/visitas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendedorId: selectedRota.vendedor.id,
          clienteId,
          data: hoje,
        }),
      })

      if (!createRes.ok) {
        const data = await createRes.json()
        throw new Error(data.error || 'Erro ao criar visita')
      }

      const visita = await createRes.json()

      // Agora fazer o check-in com geolocalização
      const checkInRes = await fetch(`${API_URL}/visitas/${visita.id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: geo?.latitude,
          longitude: geo?.longitude,
        }),
      })

      if (!checkInRes.ok) {
        const data = await checkInRes.json()
        throw new Error(data.error || 'Erro ao fazer check-in')
      }

      const visitaAtualizada = await checkInRes.json()

      // Atualizar estado local
      setVisitasHoje(prev => [...prev, {
        id: visitaAtualizada.id,
        clienteId,
        checkIn: visitaAtualizada.checkIn,
        checkOut: null,
        enderecoIn: visitaAtualizada.enderecoIn,
        enderecoOut: null,
      }])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingCheckin(null)
    }
  }

  const handleCheckOut = async (clienteId: string) => {
    const visita = getVisitaCliente(clienteId)
    if (!visita) return

    setLoadingCheckin(clienteId)
    try {
      // Capturar geolocalização
      const geo = await getGeolocation()

      const res = await fetch(`${API_URL}/visitas/${visita.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: geo?.latitude,
          longitude: geo?.longitude,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao fazer check-out')
      }

      const visitaAtualizada = await res.json()

      // Atualizar estado local
      setVisitasHoje(prev => prev.map(v =>
        v.id === visita.id
          ? { ...v, checkOut: visitaAtualizada.checkOut, enderecoOut: visitaAtualizada.enderecoOut }
          : v
      ))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingCheckin(null)
    }
  }

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
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

      // Corrigir observação com IA antes de salvar
      let observacaoFinal = solicitarInspetorForm.observacao
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
          clienteId: solicitarInspetorForm.clienteId,
          vendedorId: selectedRota.vendedor.id,
          equipamentos: solicitarInspetorForm.equipamentos,
          observacao: observacaoFinal || undefined,
          // Data será definida pelo admin/inspetor posteriormente
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao solicitar inspecao')
      }

      // Fazer check-in automaticamente se ainda não fez
      if (!clienteFezCheckIn(solicitarInspetorForm.clienteId)) {
        await handleCheckIn(solicitarInspetorForm.clienteId)
      }

      // Atualizar mapa de inspeções
      setClientesComInspecao(prev => ({
        ...prev,
        [solicitarInspetorForm.clienteId]: 'PENDENTE'
      }))

      setShowSolicitarInspetorModal(false)
      setSolicitarInspetorForm({
        clienteId: '',
        clienteNome: '',
        equipamentos: [],
        novoEquipamento: '',
        observacao: '',
      })
      // Show success message
      alert('Solicitacao enviada com sucesso! Cliente marcado como visitado.')
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
                Representantes Comerciais
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
                              clientesDia.map((rc, index) => {
                                const statusInspecao = clientesComInspecao[rc.cliente.id]
                                const visita = diaSemanaAtual === dia.key ? getVisitaCliente(rc.cliente.id) : null
                                const fezCheckIn = visita?.checkIn != null
                                const fezCheckOut = visita?.checkOut != null

                                // Cores baseadas no status
                                let cardClass = 'bg-card border-border/50 hover:border-primary/30'
                                let numberClass = 'text-muted-foreground'

                                if (fezCheckOut) {
                                  cardClass = 'bg-success/10 border-success/30'
                                  numberClass = 'text-success'
                                } else if (fezCheckIn) {
                                  cardClass = 'bg-[#F97316]/10 border-[#F97316]/30'
                                  numberClass = 'text-[#F97316]'
                                } else if (statusInspecao === 'PENDENTE') {
                                  cardClass = 'bg-[#FACC15]/10 border-[#FACC15]/30'
                                  numberClass = 'text-[#FACC15]'
                                } else if (statusInspecao === 'CONFIRMADA') {
                                  cardClass = 'bg-[#3B82F6]/10 border-[#3B82F6]/30'
                                  numberClass = 'text-[#3B82F6]'
                                } else if (statusInspecao === 'REALIZADA') {
                                  cardClass = 'bg-success/10 border-success/30'
                                  numberClass = 'text-success'
                                }

                                return (
                                  <div
                                    key={rc.id}
                                    className={`group p-2 rounded-md border transition-colors ${cardClass}`}
                                  >
                                    <div className="flex items-start gap-2">
                                      <span className={`text-[10px] font-mono ${numberClass}`}>
                                        {fezCheckOut ? (
                                          <CheckCircle className="w-3 h-3" />
                                        ) : fezCheckIn ? (
                                          <Clock className="w-3 h-3" />
                                        ) : statusInspecao ? (
                                          statusInspecao === 'PENDENTE' ? <Clock className="w-3 h-3" /> :
                                          statusInspecao === 'CONFIRMADA' ? <Wrench className="w-3 h-3" /> :
                                          <CheckCircle className="w-3 h-3" />
                                        ) : (
                                          `${index + 1}.`
                                        )}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-medium truncate ${fezCheckOut ? 'line-through text-muted-foreground' : ''}`}>
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
                                        {!statusInspecao && (
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
                                        )}
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
                                )
                              })
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
                          const visita = getVisitaCliente(rc.cliente.id)
                          const fezCheckIn = visita?.checkIn != null
                          const fezCheckOut = visita?.checkOut != null
                          const statusInspecao = clientesComInspecao[rc.cliente.id]
                          const isLoading = loadingCheckin === rc.cliente.id

                          // Definir cores baseado no status
                          let borderClass = 'border-border/50 bg-card hover:border-primary/30'
                          let badgeClass = ''
                          let badgeText = ''

                          if (fezCheckOut) {
                            borderClass = 'border-success/50 bg-success/5'
                            if (statusInspecao === 'PENDENTE') {
                              badgeClass = 'bg-[#FACC15]/20 text-[#FACC15] border-[#FACC15]/30'
                              badgeText = 'Inspetor Solicitado'
                            } else if (statusInspecao === 'CONFIRMADA') {
                              badgeClass = 'bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/30'
                              badgeText = 'Inspeção Confirmada'
                            } else if (statusInspecao === 'REALIZADA') {
                              badgeClass = 'bg-success/20 text-success border-success/30'
                              badgeText = 'Inspeção Realizada'
                            }
                          } else if (fezCheckIn) {
                            borderClass = 'border-[#F97316]/50 bg-[#F97316]/5'
                            if (statusInspecao === 'PENDENTE') {
                              badgeClass = 'bg-[#FACC15]/20 text-[#FACC15] border-[#FACC15]/30'
                              badgeText = 'Inspetor Solicitado'
                            }
                          } else if (statusInspecao === 'PENDENTE') {
                            borderClass = 'border-[#FACC15]/30 bg-[#FACC15]/5'
                            badgeClass = 'bg-[#FACC15]/20 text-[#FACC15] border-[#FACC15]/30'
                            badgeText = 'Inspetor Solicitado'
                          }

                          return (
                            <div
                              key={rc.id}
                              className={`p-4 rounded-lg border transition-colors ${borderClass}`}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold ${
                                    fezCheckOut
                                      ? 'bg-success/20 text-success'
                                      : fezCheckIn
                                        ? 'bg-[#F97316]/20 text-[#F97316]'
                                        : statusInspecao === 'PENDENTE'
                                          ? 'bg-[#FACC15]/20 text-[#FACC15]'
                                          : 'bg-primary/20 text-primary'
                                  }`}>
                                    {fezCheckOut ? <CheckCircle className="w-4 h-4" /> : fezCheckIn ? <Clock className="w-4 h-4" /> : statusInspecao ? <Wrench className="w-4 h-4" /> : index + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className={`font-medium text-base ${fezCheckOut ? 'line-through text-muted-foreground' : ''}`}>
                                        {rc.cliente.nome}
                                      </p>
                                      {badgeText && (
                                        <Badge variant="outline" className={`text-[10px] ${badgeClass}`}>
                                          {badgeText}
                                        </Badge>
                                      )}
                                    </div>
                                    {rc.cliente.cidade && (
                                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <MapPin className="w-3 h-3" />
                                        {rc.cliente.cidade}
                                      </p>
                                    )}
                                    {/* Mostrar horários de check-in e check-out */}
                                    {visita && (
                                      <div className="mt-1 text-xs space-y-1">
                                        {visita.checkIn && (
                                          <div className="flex flex-col">
                                            <span className="text-[#F97316] flex items-center gap-1">
                                              <Clock className="w-3 h-3" />
                                              In: {formatTime(visita.checkIn)}
                                            </span>
                                            {visita.enderecoIn && (
                                              <span className="text-muted-foreground ml-4 text-[10px]">
                                                {visita.enderecoIn}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                        {visita.checkOut && (
                                          <div className="flex flex-col">
                                            <span className="text-success flex items-center gap-1">
                                              <CheckCircle className="w-3 h-3" />
                                              Out: {formatTime(visita.checkOut)}
                                            </span>
                                            {visita.enderecoOut && (
                                              <span className="text-muted-foreground ml-4 text-[10px]">
                                                {visita.enderecoOut}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2 flex-shrink-0">
                                  {fezCheckOut ? (
                                    <>
                                      {!statusInspecao && (
                                        <Button
                                          variant="default"
                                          size="sm"
                                          onClick={() => openSolicitarInspetorModal(rc.cliente)}
                                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                        >
                                          <Wrench className="w-4 h-4 mr-2" />
                                          Solicitar Inspetor
                                        </Button>
                                      )}
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => openAnotacoesModal(rc.cliente)}
                                        className="bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white"
                                      >
                                        <MessageSquare className="w-4 h-4 mr-2" />
                                        Anotacoes
                                      </Button>
                                    </>
                                  ) : fezCheckIn ? (
                                    <>
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleCheckOut(rc.cliente.id)}
                                        disabled={isLoading}
                                        className="bg-[#F97316] hover:bg-[#F97316]/90"
                                      >
                                        {isLoading ? (
                                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                          <CheckCircle className="w-4 h-4 mr-2" />
                                        )}
                                        Check-out
                                      </Button>
                                      {!statusInspecao && (
                                        <Button
                                          variant="default"
                                          size="sm"
                                          onClick={() => openSolicitarInspetorModal(rc.cliente)}
                                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                        >
                                          <Wrench className="w-4 h-4 mr-2" />
                                          Solicitar Inspetor
                                        </Button>
                                      )}
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => openAnotacoesModal(rc.cliente)}
                                        className="bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white"
                                      >
                                        <MessageSquare className="w-4 h-4 mr-2" />
                                        Anotacoes
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleCheckIn(rc.cliente.id)}
                                        disabled={isLoading}
                                        className="bg-success hover:bg-success/90"
                                      >
                                        {isLoading ? (
                                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                          <Clock className="w-4 h-4 mr-2" />
                                        )}
                                        Check-in
                                      </Button>
                                      {!statusInspecao && (
                                        <Button
                                          variant="default"
                                          size="sm"
                                          onClick={() => openSolicitarInspetorModal(rc.cliente)}
                                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                        >
                                          <Wrench className="w-4 h-4 mr-2" />
                                          Solicitar Inspetor
                                        </Button>
                                      )}
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => openAnotacoesModal(rc.cliente)}
                                        className="bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white"
                                      >
                                        <MessageSquare className="w-4 h-4 mr-2" />
                                        Anotacoes
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
                <Label>Representante Comercial</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={newRotaForm.vendedorId}
                  onChange={(e) => setNewRotaForm({ ...newRotaForm, vendedorId: e.target.value })}
                >
                  <option value="">Selecione um representante comercial</option>
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

      {/* Anotacoes Modal (novo sistema por vendedor) */}
      {showAnotacoesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAnotacoesModal(false)}
          />
          <Card className="relative z-10 w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="pb-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Minhas Anotacoes
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cliente: {anotacoesModalData.clienteNome}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowAnotacoesModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto flex-1">
              <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                <p>Essas anotacoes sao particulares suas sobre o cliente. Use para lembrar detalhes importantes das conversas.</p>
              </div>

              {/* Botao de Resumo IA */}
              {anotacoes.length > 0 && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGerarResumo}
                    disabled={loadingResumo}
                    className="gap-2"
                  >
                    {loadingResumo ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Gerando resumo...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Resumir com IA
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Resumo IA */}
              {resumoIA && (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm font-medium text-primary mb-2 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Resumo gerado por IA
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{resumoIA}</p>
                </div>
              )}

              {/* Lista de anotacoes */}
              <div className="space-y-3">
                <Label>Historico de Anotacoes</Label>
                {loadingAnotacoes ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : anotacoes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma anotacao ainda</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {anotacoes.map((anotacao) => (
                      <div
                        key={anotacao.id}
                        className="p-3 rounded-lg bg-muted/30 border border-border/50 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{anotacao.texto}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(anotacao.createdAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteAnotacao(anotacao.id)}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Adicionar nova anotacao */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <Label>Nova Anotacao</Label>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Digite sua anotacao..."
                    value={novaAnotacao}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNovaAnotacao(e.target.value)}
                    rows={2}
                    className="flex-1"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleAddAnotacao}
                    disabled={savingAnotacao || !novaAnotacao.trim()}
                  >
                    {savingAnotacao ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

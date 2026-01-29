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
  Users,
  Plus,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  X,
  MapPin,
  Phone,
  Mail,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Building2,
} from 'lucide-react'

interface Cliente {
  id: string
  nome: string
  razaoSocial: string | null
  cnpj: string | null
  telefone: string | null
  email: string | null
  cidade: string | null
  estado: string | null
  active: boolean
  osAbertas: number
  vendedorId: string | null
  vendedor: {
    id: string
    user: {
      name: string
    }
  } | null
}

interface Vendedor {
  id: string
  user: {
    name: string
  }
}

interface CNPJData {
  razao_social: string
  nome_fantasia: string
  cnpj: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  municipio: string
  uf: string
  cep: string
  telefone: string
  email: string
  // Campos adicionais da BrasilAPI
  ddd_telefone_1: string
  ddd_telefone_2: string
  qsa: Array<{
    nome_socio: string
    qualificacao_socio: string
  }>
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function ClientesPage() {
  const router = useRouter()
  const { user, isAdmin, isDiretor } = useAuth()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [meuVendedorId, setMeuVendedorId] = useState<string | null>(null)

  // Verificar se é vendedora (COMERCIAL) - mostra só os clientes dela
  const isVendedora = user?.role === 'COMERCIAL'

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchingCNPJ, setSearchingCNPJ] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    cnpj: '',
    nome: '',
    razaoSocial: '',
    inscricaoEstadual: '',
    telefone: '',
    email: '',
    contatoPrincipal: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    vendedorId: '',
  })

  useEffect(() => {
    if (isVendedora && user?.id) {
      // Se é vendedora, primeiro busca o vendedor e depois os clientes da rota
      fetchMeuVendedor()
    } else {
      // Admin/Diretor vê todos
      fetchClientes()
    }
    fetchVendedores()
  }, [user, isVendedora])

  const fetchMeuVendedor = async () => {
    try {
      setLoading(true)
      // Buscar vendedor pelo userId
      const resVendedores = await fetch(`${API_URL}/vendedores`)
      if (!resVendedores.ok) throw new Error('Erro ao carregar vendedores')
      const vendedoresData = await resVendedores.json()

      const meuVendedor = vendedoresData.find((v: any) => v.userId === user?.id)
      if (meuVendedor) {
        setMeuVendedorId(meuVendedor.id)
        // Buscar rota do vendedor
        const resRotas = await fetch(`${API_URL}/rotas`)
        if (!resRotas.ok) throw new Error('Erro ao carregar rotas')
        const rotasData = await resRotas.json()

        const minhaRota = rotasData.find((r: any) => r.vendedor.id === meuVendedor.id)
        if (minhaRota) {
          // Extrair clientes únicos da rota
          const clientesIds = new Set<string>()
          const clientesDaRota: Cliente[] = []

          for (const dia of ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO']) {
            const clientesDia = minhaRota.clientesPorDia[dia] || []
            for (const rc of clientesDia) {
              if (!clientesIds.has(rc.cliente.id)) {
                clientesIds.add(rc.cliente.id)
                clientesDaRota.push({
                  ...rc.cliente,
                  osAbertas: 0,
                  vendedor: { id: meuVendedor.id, user: { name: user?.name || '' } }
                })
              }
            }
          }
          setClientes(clientesDaRota)
        } else {
          setClientes([])
        }
      } else {
        setClientes([])
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchClientes = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/clientes`)
      if (!res.ok) throw new Error('Erro ao carregar clientes')
      const data = await res.json()
      setClientes(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
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

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18)
  }

  const cleanCNPJ = (value: string) => {
    return value.replace(/\D/g, '')
  }

  const searchCNPJ = async () => {
    const cnpj = cleanCNPJ(formData.cnpj)
    if (cnpj.length !== 14) {
      setError('CNPJ deve ter 14 dígitos')
      return
    }

    try {
      setSearchingCNPJ(true)
      setError('')

      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)

      if (!res.ok) {
        throw new Error('CNPJ não encontrado')
      }

      const data: CNPJData = await res.json()

      // Formatar telefone - pode vir em ddd_telefone_1 ou telefone
      let telefone = ''
      if (data.ddd_telefone_1) {
        telefone = data.ddd_telefone_1
      } else if (data.telefone) {
        telefone = data.telefone
      }

      // Pegar nome do primeiro sócio como contato principal
      let contatoPrincipal = ''
      if (data.qsa && data.qsa.length > 0) {
        contatoPrincipal = data.qsa[0]?.nome_socio || ''
      }

      setFormData({
        ...formData,
        nome: data.nome_fantasia || data.razao_social,
        razaoSocial: data.razao_social,
        endereco: `${data.logradouro}${data.numero ? ', ' + data.numero : ''}${data.complemento ? ' - ' + data.complemento : ''}`,
        cidade: data.municipio,
        estado: data.uf,
        cep: data.cep,
        telefone: telefone,
        email: data.email || '',
        contatoPrincipal: contatoPrincipal,
      })
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar CNPJ')
    } finally {
      setSearchingCNPJ(false)
    }
  }

  const resetForm = () => {
    setFormData({
      cnpj: '',
      nome: '',
      razaoSocial: '',
      inscricaoEstadual: '',
      telefone: '',
      email: '',
      contatoPrincipal: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
      vendedorId: '',
    })
  }

  const handleDeleteCliente = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return

    try {
      const res = await fetch(`${API_URL}/clientes/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Erro ao excluir cliente')
      }

      fetchClientes()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleViewCliente = (cliente: Cliente) => {
    setSelectedCliente(cliente)
    setShowViewModal(true)
  }

  const handleEditCliente = (cliente: Cliente) => {
    setEditingId(cliente.id)
    setFormData({
      cnpj: cliente.cnpj ? formatCNPJ(cliente.cnpj) : '',
      nome: cliente.nome,
      razaoSocial: cliente.razaoSocial || '',
      inscricaoEstadual: '',
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      contatoPrincipal: '',
      endereco: '',
      cidade: cliente.cidade || '',
      estado: cliente.estado || '',
      cep: '',
      vendedorId: cliente.vendedorId || '',
    })
    setShowModal(true)
  }

  const handleSaveCliente = async () => {
    if (!formData.nome) {
      setError('Nome é obrigatório')
      return
    }

    try {
      setSaving(true)
      setError('')

      const url = editingId
        ? `${API_URL}/clientes/${editingId}`
        : `${API_URL}/clientes`

      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          cnpj: cleanCNPJ(formData.cnpj) || null,
          cep: formData.cep.replace(/\D/g, '') || null,
          vendedorId: formData.vendedorId || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar cliente')
      }

      setShowModal(false)
      resetForm()
      setEditingId(null)
      fetchClientes()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const filteredClientes = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.cnpj?.includes(search) ||
      c.cidade?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: clientes.length,
    ativos: clientes.filter((c) => c.active).length,
    inativos: clientes.filter((c) => !c.active).length,
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
              {isVendedora ? 'Meus Clientes' : 'Clientes'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isVendedora ? 'Clientes da sua rota de visitas' : 'Gerencie a carteira de clientes'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={isVendedora ? fetchMeuVendedor : fetchClientes}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          {!isVendedora && (
            <Button size="sm" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-success/20 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold text-success">{stats.ativos}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inativos</p>
                <p className="text-2xl font-bold">{stats.inativos}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
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
                  placeholder="Buscar por nome, CNPJ ou cidade..."
                  className="pl-10 w-80 bg-muted/50"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredClientes.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum cliente encontrado</p>
              <Button size="sm" className="mt-4" onClick={() => setShowModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Cliente
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-y border-border bg-muted/30">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      CNPJ
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Contato
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Cidade
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Vendedor
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      O.S.
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredClientes.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium">{cliente.nome}</p>
                          {cliente.razaoSocial && cliente.razaoSocial !== cliente.nome && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {cliente.razaoSocial}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-mono text-muted-foreground">
                          {cliente.cnpj ? formatCNPJ(cliente.cnpj) : '-'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {cliente.telefone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {cliente.telefone}
                            </p>
                          )}
                          {cliente.email && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {cliente.email}
                            </p>
                          )}
                          {!cliente.telefone && !cliente.email && (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {cliente.cidade ? (
                          <span className="text-sm flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            {cliente.cidade}{cliente.estado ? `/${cliente.estado}` : ''}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {cliente.vendedor ? (
                          <Badge variant="outline" className="text-xs">
                            {cliente.vendedor.user.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <Badge
                          className={`text-xs ${
                            cliente.osAbertas > 2
                              ? 'bg-destructive/20 text-destructive border-destructive/30'
                              : cliente.osAbertas > 0
                                ? 'bg-primary/20 text-primary border-primary/30'
                                : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {cliente.osAbertas}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleViewCliente(cliente)}
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {!isVendedora && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleEditCliente(cliente)}
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteCliente(cliente.id)}
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowModal(false)
              setEditingId(null)
              resetForm()
            }}
          />
          <Card className="relative z-10 w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {editingId ? 'Editar Cliente' : 'Novo Cliente'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setShowModal(false)
                    setEditingId(null)
                    resetForm()
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* CNPJ Search */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <Label className="text-sm font-semibold">Buscar por CNPJ</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="00.000.000/0000-00"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                    className="flex-1"
                  />
                  <Button
                    onClick={searchCNPJ}
                    disabled={searchingCNPJ || cleanCNPJ(formData.cnpj).length !== 14}
                  >
                    {searchingCNPJ ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Digite o CNPJ e clique em buscar para preencher automaticamente
                </p>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Fantasia *</Label>
                  <Input
                    placeholder="Nome da empresa"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Razão Social</Label>
                  <Input
                    placeholder="Razão social"
                    value={formData.razaoSocial}
                    onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Inscrição Estadual</Label>
                  <Input
                    placeholder="Inscrição estadual"
                    value={formData.inscricaoEstadual}
                    onChange={(e) => setFormData({ ...formData, inscricaoEstadual: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Contato Principal</Label>
                  <Input
                    placeholder="Nome do contato"
                    value={formData.contatoPrincipal}
                    onChange={(e) => setFormData({ ...formData, contatoPrincipal: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    placeholder="email@empresa.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Vendedor Responsável</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

                <div className="space-y-2 md:col-span-2">
                  <Label>Endereço</Label>
                  <Input
                    placeholder="Rua, número, complemento"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    placeholder="Cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Input
                      placeholder="UF"
                      maxLength={2}
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <Input
                      placeholder="00000-000"
                      value={formData.cep}
                      onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    />
                  </div>
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
                    setEditingId(null)
                    resetForm()
                    setError('')
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSaveCliente}
                  disabled={saving || !formData.nome}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : editingId ? (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Cadastrar Cliente
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowViewModal(false)
              setSelectedCliente(null)
            }}
          />
          <Card className="relative z-10 w-full max-w-lg mx-4 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {selectedCliente.nome}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setShowViewModal(false)
                    setSelectedCliente(null)
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedCliente.razaoSocial && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Razão Social</p>
                  <p className="text-sm">{selectedCliente.razaoSocial}</p>
                </div>
              )}

              {selectedCliente.cnpj && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase">CNPJ</p>
                  <p className="text-sm font-mono">{formatCNPJ(selectedCliente.cnpj)}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedCliente.telefone && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Telefone</p>
                    <p className="text-sm flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {selectedCliente.telefone}
                    </p>
                  </div>
                )}

                {selectedCliente.email && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">E-mail</p>
                    <p className="text-sm flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {selectedCliente.email}
                    </p>
                  </div>
                )}
              </div>

              {(selectedCliente.cidade || selectedCliente.estado) && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Localização</p>
                  <p className="text-sm flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedCliente.cidade}{selectedCliente.estado ? `/${selectedCliente.estado}` : ''}
                  </p>
                </div>
              )}

              {selectedCliente.vendedor && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Vendedor Responsável</p>
                  <p className="text-sm">{selectedCliente.vendedor.user.name}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground uppercase">Ordens de Serviço Abertas</p>
                <Badge
                  className={`text-xs mt-1 ${
                    selectedCliente.osAbertas > 2
                      ? 'bg-destructive/20 text-destructive border-destructive/30'
                      : selectedCliente.osAbertas > 0
                        ? 'bg-primary/20 text-primary border-primary/30'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {selectedCliente.osAbertas} O.S. abertas
                </Badge>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowViewModal(false)
                    setSelectedCliente(null)
                  }}
                >
                  Fechar
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setShowViewModal(false)
                    handleEditCliente(selectedCliente)
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

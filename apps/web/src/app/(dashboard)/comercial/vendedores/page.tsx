'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  UserCheck,
  Plus,
  ArrowLeft,
  Loader2,
  X,
  Trash2,
  Users,
  FileText,
  RefreshCw,
} from 'lucide-react'

interface Vendedor {
  id: string
  user: {
    id: string
    name: string
    email: string
    photo: string | null
    role: string
  }
  _count: {
    clientes: number
    propostas: number
  }
}

interface Usuario {
  id: string
  name: string
  email: string
  role: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function VendedoresPage() {
  const router = useRouter()
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')

  useEffect(() => {
    fetchVendedores()
    fetchUsuariosDisponiveis()
  }, [])

  const fetchVendedores = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/vendedores`)
      if (!res.ok) throw new Error('Erro ao carregar vendedores')
      const data = await res.json()
      setVendedores(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsuariosDisponiveis = async () => {
    try {
      const res = await fetch(`${API_URL}/vendedores/usuarios-disponiveis`)
      if (!res.ok) throw new Error('Erro ao carregar usuários')
      const data = await res.json()
      setUsuariosDisponiveis(data)
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err)
    }
  }

  const handleCreateVendedor = async () => {
    if (!selectedUserId) {
      setError('Selecione um usuário')
      return
    }

    try {
      setSaving(true)
      setError('')

      const res = await fetch(`${API_URL}/vendedores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar vendedor')
      }

      setShowModal(false)
      setSelectedUserId('')
      fetchVendedores()
      fetchUsuariosDisponiveis()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteVendedor = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este vendedor?')) return

    try {
      const res = await fetch(`${API_URL}/vendedores/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Erro ao remover vendedor')
      }

      fetchVendedores()
      fetchUsuariosDisponiveis()
    } catch (err: any) {
      setError(err.message)
    }
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
            <h1 className="text-3xl font-bold tracking-tight">Vendedores</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie a equipe comercial
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchVendedores}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Vendedor
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Vendedores</p>
                <p className="text-2xl font-bold">{vendedores.length}</p>
              </div>
              <UserCheck className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Usuários Disponíveis</p>
                <p className="text-2xl font-bold">{usuariosDisponiveis.length}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Equipe Comercial</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : vendedores.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <UserCheck className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum vendedor cadastrado</p>
              <Button size="sm" className="mt-4" onClick={() => setShowModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Vendedor
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-y border-border bg-muted/30">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Vendedor
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      E-mail
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Cargo
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Clientes
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Propostas
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {vendedores.map((vendedor) => (
                    <tr key={vendedor.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">
                              {vendedor.user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{vendedor.user.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-muted-foreground">
                          {vendedor.user.email}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="outline" className="text-xs">
                          {vendedor.user.role}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{vendedor._count.clientes}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{vendedor._count.propostas}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteVendedor(vendedor.id)}
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowModal(false)
              setSelectedUserId('')
            }}
          />
          <Card className="relative z-10 w-full max-w-md mx-4 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Adicionar Vendedor
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setShowModal(false)
                    setSelectedUserId('')
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecione um usuário existente para torná-lo vendedor.
                Apenas usuários que ainda não são vendedores aparecem na lista.
              </p>

              {usuariosDisponiveis.length === 0 ? (
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    Não há usuários disponíveis para serem vendedores.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Crie novos usuários no sistema primeiro.
                  </p>
                </div>
              ) : (
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">Selecione um usuário</option>
                  {usuariosDisponiveis.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.name} ({usuario.email})
                    </option>
                  ))}
                </select>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowModal(false)
                    setSelectedUserId('')
                    setError('')
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreateVendedor}
                  disabled={saving || !selectedUserId}
                >
                  {saving ? (
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

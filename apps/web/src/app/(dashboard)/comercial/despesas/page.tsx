'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Plus,
  Receipt,
  Camera,
  Loader2,
  X,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertCircle,
  CreditCard,
  ImageIcon,
  Calendar,
  Eye,
} from 'lucide-react'

interface Despesa {
  id: string
  data: string
  tipo: string
  descricao: string | null
  valor: number
  comprovante: string | null
  validadoPorIA: boolean
  valorExtraido: number | null
  nomeExtraido: string | null
  createdAt: string
}

interface Vendedor {
  id: string
  chavePix: string | null
  tipoChavePix: string | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function DespesasPage() {
  const router = useRouter()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [vendedor, setVendedor] = useState<Vendedor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    tipo: '',
    descricao: '',
    valor: '',
    comprovante: null as string | null,
    comprovantePreview: null as string | null,
  })
  const [uploadingImage, setUploadingImage] = useState(false)
  const [analisandoComprovante, setAnalisandoComprovante] = useState(false)
  const [analiseResultado, setAnaliseResultado] = useState<{
    valido: boolean
    mensagem: string
    valorExtraido: number | null
    nomeExtraido: string | null
    tipoExtraido: string | null
    dataExtraida: string | null
    horarioExtraido: string | null
    cnpjExtraido: string | null
    valorConfere: boolean
  } | null>(null)

  // PIX modal state
  const [showPixModal, setShowPixModal] = useState(false)
  const [pixForm, setPixForm] = useState({
    chavePix: '',
    tipoChavePix: 'CPF',
  })
  const [savingPix, setSavingPix] = useState(false)

  // Filtro de mes/ano
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())

  // Modal de visualizacao de imagem
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // Buscar vendedor pelo userId
  const fetchVendedor = async () => {
    if (!user?.id) return
    try {
      const res = await fetch(`${API_URL}/vendedores`)
      if (!res.ok) throw new Error('Erro ao buscar vendedores')
      const vendedores = await res.json()
      const v = vendedores.find((v: any) => v.user.id === user.id)
      if (v) {
        setVendedor({ id: v.id, chavePix: v.chavePix, tipoChavePix: v.tipoChavePix })
        // Buscar dados do PIX
        const pixRes = await fetch(`${API_URL}/vendedores/${v.id}/pix`)
        if (pixRes.ok) {
          const pixData = await pixRes.json()
          setVendedor({ id: v.id, ...pixData })
        }
      }
    } catch (err: any) {
      console.error('Erro ao buscar vendedor:', err)
    }
  }

  const fetchDespesas = async () => {
    if (!vendedor?.id) return
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/despesas?vendedorId=${vendedor.id}&mes=${mes}&ano=${ano}`)
      if (!res.ok) throw new Error('Erro ao carregar despesas')
      const data = await res.json()
      setDespesas(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVendedor()
  }, [user?.id])

  useEffect(() => {
    if (vendedor?.id) {
      fetchDespesas()
    }
  }, [vendedor?.id, mes, ano])

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Criar preview
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string
      setFormData(prev => ({ ...prev, comprovantePreview: base64 }))

      // Fazer upload para IMGBB
      try {
        setUploadingImage(true)
        const res = await fetch(`${API_URL}/despesas/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Erro ao fazer upload')
        }

        const data = await res.json()
        setFormData(prev => ({ ...prev, comprovante: data.url }))

        // Analisar comprovante com IA (sempre, para extrair informações)
        const valorAtual = formData.valor ? parseFloat(formData.valor) : 0
        await analisarComprovante(data.url, valorAtual)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setUploadingImage(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const analisarComprovante = async (imageUrl: string, valor: number) => {
    try {
      setAnalisandoComprovante(true)
      setAnaliseResultado(null)

      const res = await fetch(`${API_URL}/despesas/analisar-comprovante`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, valorInformado: valor }),
      })

      if (!res.ok) throw new Error('Erro ao analisar comprovante')

      const data = await res.json()
      setAnaliseResultado(data)

      // Preencher tipo automaticamente se a IA extraiu e o campo está vazio
      if (data.tipoExtraido && !formData.tipo) {
        setFormData(prev => ({ ...prev, tipo: data.tipoExtraido }))
      }

      // Preencher valor automaticamente se a IA extraiu e o campo está vazio
      if (data.valorExtraido && !formData.valor) {
        setFormData(prev => ({ ...prev, valor: data.valorExtraido.toString() }))
      }
    } catch (err: any) {
      console.error('Erro ao analisar comprovante:', err)
    } finally {
      setAnalisandoComprovante(false)
    }
  }

  const handleValorChange = async (valor: string) => {
    setFormData(prev => ({ ...prev, valor }))

    // Se ja tem comprovante e valor, analisar
    if (formData.comprovante && valor) {
      const valorNum = parseFloat(valor)
      if (!isNaN(valorNum) && valorNum > 0) {
        await analisarComprovante(formData.comprovante, valorNum)
      }
    }
  }

  const handleSubmit = async () => {
    if (!vendedor?.id || !formData.tipo || !formData.valor) return

    try {
      setSaving(true)
      const res = await fetch(`${API_URL}/despesas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendedorId: vendedor.id,
          data: new Date().toISOString(),
          tipo: formData.tipo,
          descricao: formData.descricao || undefined,
          valor: parseFloat(formData.valor),
          comprovante: formData.comprovante,
          validadoPorIA: analiseResultado?.valido || false,
          valorExtraido: analiseResultado?.valorExtraido,
          nomeExtraido: analiseResultado?.nomeExtraido,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar despesa')
      }

      // Limpar form e atualizar lista
      setFormData({
        tipo: '',
        descricao: '',
        valor: '',
        comprovante: null,
        comprovantePreview: null,
      })
      setAnaliseResultado(null)
      setShowForm(false)
      fetchDespesas()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDespesa = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) return

    try {
      const res = await fetch(`${API_URL}/despesas/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir despesa')
      fetchDespesas()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleSavePix = async () => {
    if (!vendedor?.id || !pixForm.chavePix) return

    try {
      setSavingPix(true)
      const res = await fetch(`${API_URL}/vendedores/${vendedor.id}/pix`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pixForm),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar PIX')
      }

      const data = await res.json()
      setVendedor(prev => prev ? { ...prev, ...data } : null)
      setShowPixModal(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingPix(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR')
  }

  const totalMes = despesas.reduce((acc, d) => acc + Number(d.valor), 0)

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/comercial/rotas')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Minhas Despesas</h1>
            <p className="text-muted-foreground mt-1">Registre suas despesas para reembolso</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchDespesas()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Despesa
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

      {/* PIX Card */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Chave PIX para Reembolso
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => {
              setPixForm({
                chavePix: vendedor?.chavePix || '',
                tipoChavePix: vendedor?.tipoChavePix || 'CPF',
              })
              setShowPixModal(true)
            }}>
              {vendedor?.chavePix ? 'Editar' : 'Cadastrar'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {vendedor?.chavePix ? (
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-xs">
                {vendedor.tipoChavePix}
              </Badge>
              <span className="text-sm font-mono">{vendedor.chavePix}</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Cadastre sua chave PIX para receber os reembolsos
            </p>
          )}
        </CardContent>
      </Card>

      {/* Filtro e Resumo */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <select
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
            value={mes}
            onChange={(e) => setMes(parseInt(e.target.value))}
          >
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i, 1).toLocaleDateString('pt-BR', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
            value={ano}
            onChange={(e) => setAno(parseInt(e.target.value))}
          >
            {[2024, 2025, 2026].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="flex-1" />
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total do mes</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(totalMes)}</p>
        </div>
      </div>

      {/* Lista de Despesas */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : despesas.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Receipt className="w-12 h-12 mb-4" />
            <p>Nenhuma despesa registrada neste periodo</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Registrar Despesa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {despesas.map((despesa) => (
            <Card key={despesa.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    despesa.validadoPorIA ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'
                  }`}>
                    {despesa.validadoPorIA ? <CheckCircle className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{despesa.tipo}</p>
                      {despesa.nomeExtraido && (
                        <Badge variant="outline" className="text-[10px]">
                          {despesa.nomeExtraido}
                        </Badge>
                      )}
                    </div>
                    {despesa.descricao && (
                      <p className="text-sm text-muted-foreground truncate">{despesa.descricao}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {formatDate(despesa.data)}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatCurrency(Number(despesa.valor))}</p>
                    {despesa.valorExtraido && despesa.valorExtraido !== Number(despesa.valor) && (
                      <p className="text-xs text-muted-foreground">
                        IA: {formatCurrency(despesa.valorExtraido)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {despesa.comprovante && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedImage(despesa.comprovante)
                          setShowImageModal(true)
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteDespesa(despesa.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <Card className="relative z-10 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Nova Despesa
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowForm(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Despesa *</Label>
                <Input
                  placeholder="Ex: Combustivel, Alimentacao, Pedágio..."
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.valor}
                  onChange={(e) => handleValorChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Descricao (opcional)</Label>
                <Textarea
                  placeholder="Detalhes adicionais..."
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Comprovante (foto)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                {formData.comprovantePreview ? (
                  <div className="relative">
                    <img
                      src={formData.comprovantePreview}
                      alt="Comprovante"
                      className="w-full h-48 object-cover rounded-lg border border-border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setFormData({ ...formData, comprovante: null, comprovantePreview: null })}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                        <Loader2 className="w-8 h-8 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-32 flex flex-col items-center justify-center gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    <Camera className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Tirar foto ou selecionar</span>
                  </Button>
                )}
              </div>

              {/* Resultado da analise IA */}
              {analisandoComprovante && (
                <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Analisando comprovante com IA...</span>
                </div>
              )}

              {analiseResultado && (
                <div className={`p-3 rounded-lg ${
                  analiseResultado.valido && analiseResultado.valorConfere
                    ? 'bg-success/10 border border-success/30'
                    : 'bg-[#F97316]/10 border border-[#F97316]/30'
                }`}>
                  <div className="flex items-start gap-2">
                    {analiseResultado.valido && analiseResultado.valorConfere ? (
                      <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-[#F97316] flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{analiseResultado.mensagem}</p>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {analiseResultado.nomeExtraido && (
                          <p><span className="font-medium">Estabelecimento:</span> {analiseResultado.nomeExtraido}</p>
                        )}
                        {analiseResultado.tipoExtraido && (
                          <p><span className="font-medium">Tipo:</span> {analiseResultado.tipoExtraido}</p>
                        )}
                        {analiseResultado.valorExtraido !== null && (
                          <p><span className="font-medium">Valor:</span> {formatCurrency(analiseResultado.valorExtraido)}</p>
                        )}
                        {analiseResultado.dataExtraida && (
                          <p><span className="font-medium">Data:</span> {analiseResultado.dataExtraida}</p>
                        )}
                        {analiseResultado.horarioExtraido && (
                          <p><span className="font-medium">Horário:</span> {analiseResultado.horarioExtraido}</p>
                        )}
                        {analiseResultado.cnpjExtraido && (
                          <p><span className="font-medium">CNPJ:</span> {analiseResultado.cnpjExtraido}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Aviso de bloqueio se comprovante inválido ou valor não confere */}
              {analiseResultado && (!analiseResultado.valido || !analiseResultado.valorConfere) && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <p className="text-sm text-destructive font-medium">
                    {!analiseResultado.valido
                      ? 'Não é possível salvar: a imagem não é um comprovante válido.'
                      : 'Não é possível salvar: o valor informado não confere com o comprovante.'}
                  </p>
                  <p className="text-xs text-destructive/80 mt-1">
                    {!analiseResultado.valido
                      ? 'Envie uma foto de um cupom fiscal ou nota fiscal.'
                      : 'Corrija o valor para continuar.'}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={saving || !formData.tipo || !formData.valor || !!(analiseResultado && (!analiseResultado.valido || !analiseResultado.valorConfere))}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Salvar Despesa
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PIX Modal */}
      {showPixModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPixModal(false)}
          />
          <Card className="relative z-10 w-full max-w-md mx-4 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Chave PIX
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowPixModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo da Chave</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={pixForm.tipoChavePix}
                  onChange={(e) => setPixForm({ ...pixForm, tipoChavePix: e.target.value })}
                >
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="EMAIL">E-mail</option>
                  <option value="TELEFONE">Telefone</option>
                  <option value="ALEATORIA">Chave Aleatória</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Chave PIX</Label>
                <Input
                  placeholder={
                    pixForm.tipoChavePix === 'CPF' ? '000.000.000-00' :
                    pixForm.tipoChavePix === 'CNPJ' ? '00.000.000/0000-00' :
                    pixForm.tipoChavePix === 'EMAIL' ? 'email@exemplo.com' :
                    pixForm.tipoChavePix === 'TELEFONE' ? '+55 11 99999-9999' :
                    'Chave aleatória'
                  }
                  value={pixForm.chavePix}
                  onChange={(e) => setPixForm({ ...pixForm, chavePix: e.target.value })}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowPixModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSavePix}
                  disabled={savingPix || !pixForm.chavePix}
                >
                  {savingPix ? (
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

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowImageModal(false)}
          />
          <div className="relative z-10 max-w-4xl max-h-[90vh] mx-4">
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-10 right-0 text-white hover:bg-white/20"
              onClick={() => setShowImageModal(false)}
            >
              <X className="w-6 h-6" />
            </Button>
            <img
              src={selectedImage}
              alt="Comprovante"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  )
}

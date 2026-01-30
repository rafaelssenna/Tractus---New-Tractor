'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ClipboardCheck,
  ArrowLeft,
  Loader2,
  X,
  Plus,
  Trash2,
  Camera,
  FileText,
  Send,
  CheckCircle,
  Sparkles,
  Save,
  Building2,
  MapPin,
  User,
} from 'lucide-react'

interface ComponenteForm {
  id?: string
  nome: string
  condicao: 'BOM' | 'REGULAR' | 'CRITICO'
  observacao: string
}

interface Laudo {
  id: string
  equipamento: string
  numeroSerie: string
  dataInspecao: string
  fotos: string[]
  status: 'RASCUNHO' | 'ENVIADO'
  componentes: {
    id: string
    nome: string
    condicao: 'BOM' | 'REGULAR' | 'CRITICO'
    observacao: string | null
  }[]
}

interface VisitaTecnica {
  id: string
  numero: string | null
  cliente: {
    id: string
    nome: string
    cidade: string | null
    estado: string | null
  }
  vendedor: {
    user: {
      name: string
    }
  }
  equipamentos: string[]
  observacao: string | null
  dataVisita: string
  laudoInspecao: Laudo | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

const CONDICAO_CONFIG = {
  BOM: { label: 'Bom', color: 'bg-green-500/20 text-green-600 border-green-500/30' },
  REGULAR: { label: 'Regular', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
  CRITICO: { label: 'Crítico', color: 'bg-red-500/20 text-red-600 border-red-500/30' },
}

export default function EditarLaudoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const visitaId = searchParams.get('visita')
  const { user } = useAuth()

  const [visita, setVisita] = useState<VisitaTecnica | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')

  // Form do laudo
  const [laudoForm, setLaudoForm] = useState({
    equipamento: '',
    numeroSerie: '',
    dataInspecao: new Date().toISOString().split('T')[0],
  })
  const [componentes, setComponentes] = useState<ComponenteForm[]>([])
  const [fotos, setFotos] = useState<string[]>([])
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [laudoId, setLaudoId] = useState<string | null>(null)
  const [corrigindoTexto, setCorrigindoTexto] = useState<number | null>(null)

  const fotoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (visitaId) {
      fetchVisita()
    }
  }, [visitaId])

  const fetchVisita = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/visitas-tecnicas/${visitaId}`)
      if (!res.ok) throw new Error('Visita não encontrada')
      const data: VisitaTecnica = await res.json()
      setVisita(data)

      // Se já tem laudo, carregar dados
      if (data.laudoInspecao) {
        const laudo = data.laudoInspecao
        setLaudoId(laudo.id)
        setLaudoForm({
          equipamento: laudo.equipamento,
          numeroSerie: laudo.numeroSerie,
          dataInspecao: laudo.dataInspecao.split('T')[0],
        })
        setComponentes(
          laudo.componentes.map((c) => ({
            id: c.id,
            nome: c.nome,
            condicao: c.condicao,
            observacao: c.observacao || '',
          }))
        )
        setFotos(laudo.fotos || [])
      } else {
        // Preencher com dados da visita
        setLaudoForm({
          equipamento: data.equipamentos[0] || '',
          numeroSerie: '',
          dataInspecao: data.dataVisita?.split('T')[0] || new Date().toISOString().split('T')[0],
        })
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const addComponente = () => {
    setComponentes([
      ...componentes,
      { nome: '', condicao: 'BOM', observacao: '' },
    ])
  }

  const removeComponente = (index: number) => {
    setComponentes(componentes.filter((_, i) => i !== index))
  }

  const updateComponente = (index: number, field: keyof ComponenteForm, value: string) => {
    const updated = [...componentes]
    updated[index] = { ...updated[index]!, [field]: value }
    setComponentes(updated)
  }

  const corrigirTextoIA = async (index: number) => {
    const comp = componentes[index]
    if (!comp?.observacao) return

    setCorrigindoTexto(index)
    try {
      const res = await fetch(`${API_URL}/laudos-inspecao/corrigir-texto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: comp.observacao }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.corrigido) {
          updateComponente(index, 'observacao', data.textoCorrigido)
        }
      }
    } catch (err) {
      console.error('Erro ao corrigir texto:', err)
    } finally {
      setCorrigindoTexto(null)
    }
  }

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (fotos.length >= 5) {
      setError('Máximo de 5 fotos permitidas')
      return
    }

    setUploadingFoto(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      const res = await fetch(
        `https://api.imgbb.com/1/upload?key=${process.env.NEXT_PUBLIC_IMGBB_API_KEY}`,
        {
          method: 'POST',
          body: formData,
        }
      )

      if (!res.ok) throw new Error('Erro ao fazer upload da foto')

      const data = await res.json()
      setFotos([...fotos, data.data.url])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploadingFoto(false)
      if (fotoInputRef.current) {
        fotoInputRef.current.value = ''
      }
    }
  }

  const removeFoto = (index: number) => {
    setFotos(fotos.filter((_, i) => i !== index))
  }

  const salvarLaudo = async () => {
    if (!visita || !user?.id) return

    if (!laudoForm.equipamento || !laudoForm.numeroSerie) {
      setError('Preencha equipamento e número de série')
      return
    }

    if (componentes.length === 0) {
      setError('Adicione pelo menos um componente')
      return
    }

    const componentesInvalidos = componentes.some((c) => !c.nome)
    if (componentesInvalidos) {
      setError('Preencha o nome de todos os componentes')
      return
    }

    setSaving(true)
    setError('')
    try {
      const payload = {
        visitaTecnicaId: visita.id,
        inspetorId: user.id,
        equipamento: laudoForm.equipamento,
        numeroSerie: laudoForm.numeroSerie,
        dataInspecao: laudoForm.dataInspecao,
        componentes: componentes.map((c, i) => ({
          nome: c.nome,
          condicao: c.condicao,
          observacao: c.observacao || undefined,
          ordem: i,
        })),
        fotos,
      }

      let res
      if (laudoId) {
        res = await fetch(`${API_URL}/laudos-inspecao/${laudoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`${API_URL}/laudos-inspecao`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar laudo')
      }

      const laudo = await res.json()
      setLaudoId(laudo.id)
      setSavedMessage('Laudo salvo com sucesso!')
      setTimeout(() => setSavedMessage(''), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const finalizarLaudo = async () => {
    // Salvar primeiro se necessário
    if (!laudoId) {
      await salvarLaudo()
    }

    if (!laudoId) {
      setError('Salve o laudo antes de finalizar')
      return
    }

    setEnviando(true)
    try {
      const res = await fetch(`${API_URL}/laudos-inspecao/${laudoId}/enviar`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao finalizar laudo')
      }

      router.push('/comercial/laudos-inspetor')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!visita) {
    return (
      <div className="p-6">
        <Card className="border-destructive/50">
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Visita não encontrada</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push('/comercial/agenda-inspetor')}
            >
              Voltar para Agenda
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isEnviado = visita.laudoInspecao?.status === 'ENVIADO'

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/comercial/agenda-inspetor')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isEnviado ? 'Visualizar Laudo' : laudoId ? 'Editar Laudo' : 'Novo Laudo'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {visita.numero ? `Visita Nº ${visita.numero}` : 'Laudo de Inspeção Técnica'}
            </p>
          </div>
        </div>
        {savedMessage && (
          <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            {savedMessage}
          </Badge>
        )}
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

      {/* Info da Visita */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg">{visita.cliente.nome}</p>
              {visita.cliente.cidade && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {visita.cliente.cidade}{visita.cliente.estado ? `/${visita.cliente.estado}` : ''}
                </p>
              )}
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <User className="w-3 h-3" />
                Solicitado por: {visita.vendedor.user.name}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {visita.equipamentos.map((eq, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {eq}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário do Laudo */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" />
            Dados do Equipamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="equipamento">Equipamento *</Label>
              <Input
                id="equipamento"
                value={laudoForm.equipamento}
                onChange={(e) => setLaudoForm({ ...laudoForm, equipamento: e.target.value })}
                placeholder="Ex: Escavadeira SANY SY215C"
                disabled={isEnviado}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numeroSerie">Nº de Série *</Label>
              <Input
                id="numeroSerie"
                value={laudoForm.numeroSerie}
                onChange={(e) => setLaudoForm({ ...laudoForm, numeroSerie: e.target.value })}
                placeholder="Ex: SY215C12345"
                disabled={isEnviado}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataInspecao">Data da Inspeção</Label>
            <Input
              id="dataInspecao"
              type="date"
              value={laudoForm.dataInspecao}
              onChange={(e) => setLaudoForm({ ...laudoForm, dataInspecao: e.target.value })}
              disabled={isEnviado}
              className="w-full md:w-auto"
            />
          </div>
        </CardContent>
      </Card>

      {/* Componentes */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Componentes Avaliados *</CardTitle>
            {!isEnviado && (
              <Button size="sm" variant="outline" onClick={addComponente}>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar Componente
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {componentes.length === 0 ? (
            <div className="p-8 rounded-lg bg-muted/50 text-center text-muted-foreground">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum componente adicionado</p>
              <p className="text-sm mt-1">Clique em "Adicionar Componente" para avaliar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {componentes.map((comp, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border border-border bg-muted/20 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <Input
                        placeholder="Nome do componente (ex: Motor, Sistema Hidráulico)"
                        value={comp.nome}
                        onChange={(e) => updateComponente(index, 'nome', e.target.value)}
                        disabled={isEnviado}
                      />
                    </div>
                    <select
                      value={comp.condicao}
                      onChange={(e) => updateComponente(index, 'condicao', e.target.value as any)}
                      disabled={isEnviado}
                      className={`h-10 px-3 rounded-md border text-sm font-medium ${CONDICAO_CONFIG[comp.condicao].color}`}
                    >
                      <option value="BOM">Bom</option>
                      <option value="REGULAR">Regular</option>
                      <option value="CRITICO">Crítico</option>
                    </select>
                    {!isEnviado && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeComponente(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2 ml-11">
                    <Textarea
                      placeholder="Observação técnica..."
                      value={comp.observacao}
                      onChange={(e) => updateComponente(index, 'observacao', e.target.value)}
                      rows={2}
                      className="flex-1"
                      disabled={isEnviado}
                    />
                    {!isEnviado && comp.observacao && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => corrigirTextoIA(index)}
                        disabled={corrigindoTexto === index}
                        className="h-auto"
                        title="Corrigir texto com IA"
                      >
                        {corrigindoTexto === index ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fotos */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Fotos ({fotos.length}/5)</CardTitle>
            {!isEnviado && fotos.length < 5 && (
              <>
                <input
                  ref={fotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFotoUpload}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fotoInputRef.current?.click()}
                  disabled={uploadingFoto}
                >
                  {uploadingFoto ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 mr-1" />
                  )}
                  Adicionar Foto
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {fotos.length === 0 ? (
            <div className="p-8 rounded-lg bg-muted/50 text-center text-muted-foreground">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma foto adicionada</p>
              <p className="text-sm mt-1">Adicione fotos do equipamento inspecionado</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {fotos.map((foto, index) => (
                <div key={index} className="relative group">
                  <img
                    src={foto}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border border-border"
                  />
                  {!isEnviado && (
                    <button
                      onClick={() => removeFoto(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      {!isEnviado && (
        <div className="flex justify-end gap-3 sticky bottom-4 bg-background/80 backdrop-blur-sm p-4 rounded-lg border border-border">
          <Button
            variant="outline"
            onClick={() => router.push('/comercial/agenda-inspetor')}
          >
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={salvarLaudo}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar
          </Button>
          <Button
            onClick={finalizarLaudo}
            disabled={enviando || componentes.length === 0}
          >
            {enviando ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Finalizar Laudo
          </Button>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
  Calendar,
  Building2,
  Plus,
  Trash2,
  Camera,
  FileText,
  Send,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Eye,
  Edit,
  Sparkles,
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
  dataEnvio: string | null
  componentes: {
    id: string
    nome: string
    condicao: 'BOM' | 'REGULAR' | 'CRITICO'
    observacao: string | null
  }[]
}

interface VisitaAgendada {
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
  status: 'CONFIRMADA' | 'REALIZADA'
  temLaudo: boolean
  laudo: Laudo | null
}

interface DiaAgendado {
  data: string
  diaSemana: string
  visitas: VisitaAgendada[]
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

const CONDICAO_CONFIG = {
  BOM: { label: 'Bom', color: 'bg-green-500/20 text-green-600 border-green-500/30' },
  REGULAR: { label: 'Regular', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
  CRITICO: { label: 'Crítico', color: 'bg-red-500/20 text-red-600 border-red-500/30' },
}

export default function LaudosInspetorPage() {
  const router = useRouter()
  const { user, isAdmin, isDiretor } = useAuth()

  const isGestor = isAdmin || isDiretor
  const isInspetor = user?.role === 'TECNICO'

  const [diasAgendados, setDiasAgendados] = useState<DiaAgendado[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal de laudo
  const [showLaudoModal, setShowLaudoModal] = useState(false)
  const [selectedVisita, setSelectedVisita] = useState<VisitaAgendada | null>(null)
  const [saving, setSaving] = useState(false)
  const [enviando, setEnviando] = useState(false)

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

  // Navegação de datas
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().split('T')[0] as string
  })
  const [endDate, setEndDate] = useState<string>(() => {
    const date = new Date()
    date.setDate(date.getDate() + 7)
    return date.toISOString().split('T')[0] as string
  })

  // Ref para input de foto
  const fotoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user?.id) {
      fetchLaudos()
    }
  }, [user?.id, startDate, endDate])

  const fetchLaudos = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        dataInicio: startDate,
        dataFim: endDate,
      })

      const res = await fetch(`${API_URL}/laudos-inspecao/meus-laudos/${user?.id}?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar laudos')
      const data: DiaAgendado[] = await res.json()
      setDiasAgendados(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const days = direction === 'prev' ? -7 : 7
    const newStart = new Date(startDate)
    const newEnd = new Date(endDate)
    newStart.setDate(newStart.getDate() + days)
    newEnd.setDate(newEnd.getDate() + days)
    setStartDate(newStart.toISOString().split('T')[0] as string)
    setEndDate(newEnd.toISOString().split('T')[0] as string)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T12:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    })
  }

  const isToday = (dateString: string) => {
    const today = new Date().toISOString().split('T')[0]
    return dateString === today
  }

  const openLaudoModal = (visita: VisitaAgendada) => {
    setSelectedVisita(visita)

    if (visita.laudo) {
      // Editar laudo existente
      setLaudoId(visita.laudo.id)
      setLaudoForm({
        equipamento: visita.laudo.equipamento,
        numeroSerie: visita.laudo.numeroSerie,
        dataInspecao: visita.laudo.dataInspecao.split('T')[0],
      })
      setComponentes(
        visita.laudo.componentes.map((c) => ({
          id: c.id,
          nome: c.nome,
          condicao: c.condicao,
          observacao: c.observacao || '',
        }))
      )
      setFotos(visita.laudo.fotos || [])
    } else {
      // Novo laudo
      setLaudoId(null)
      setLaudoForm({
        equipamento: visita.equipamentos[0] || '',
        numeroSerie: '',
        dataInspecao: new Date().toISOString().split('T')[0],
      })
      setComponentes([])
      setFotos([])
    }

    setShowLaudoModal(true)
  }

  const closeLaudoModal = () => {
    setShowLaudoModal(false)
    setSelectedVisita(null)
    setLaudoId(null)
    setLaudoForm({
      equipamento: '',
      numeroSerie: '',
      dataInspecao: new Date().toISOString().split('T')[0],
    })
    setComponentes([])
    setFotos([])
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
    if (!selectedVisita || !user?.id) return

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
    try {
      const payload = {
        visitaTecnicaId: selectedVisita.id,
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
        // Atualizar
        res = await fetch(`${API_URL}/laudos-inspecao/${laudoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        // Criar
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

      // Atualizar lista
      fetchLaudos()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const enviarLaudo = async () => {
    if (!laudoId) {
      // Salvar primeiro
      await salvarLaudo()
    }

    if (!laudoId) {
      setError('Salve o laudo antes de enviar')
      return
    }

    setEnviando(true)
    try {
      const res = await fetch(`${API_URL}/laudos-inspecao/${laudoId}/enviar`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao enviar laudo')
      }

      closeLaudoModal()
      fetchLaudos()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  const gerarPDF = async (laudoIdParam: string) => {
    try {
      const res = await fetch(`${API_URL}/laudos-inspecao/${laudoIdParam}/pdf-data`)
      if (!res.ok) throw new Error('Erro ao carregar dados do laudo')

      const data = await res.json()

      // Criar PDF no cliente usando a API do browser
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        throw new Error('Popup bloqueado. Permita popups para gerar o PDF.')
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Laudo de Inspeção - ${data.numero}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
            .logo { height: 60px; }
            .title { text-align: center; flex: 1; }
            .title h1 { font-size: 20px; margin-bottom: 5px; }
            .title p { font-size: 12px; color: #666; }
            .info-section { margin-bottom: 20px; }
            .info-section h2 { font-size: 14px; background: #f0f0f0; padding: 8px; margin-bottom: 10px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 0 10px; }
            .info-item { font-size: 12px; }
            .info-item strong { display: block; color: #666; font-size: 10px; text-transform: uppercase; }
            .components-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .components-table th, .components-table td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            .components-table th { background: #f0f0f0; }
            .condicao-bom { color: #22c55e; font-weight: bold; }
            .condicao-regular { color: #eab308; font-weight: bold; }
            .condicao-critico { color: #ef4444; font-weight: bold; }
            .photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 20px; }
            .photos img { width: 100%; height: 150px; object-fit: cover; border: 1px solid #ddd; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 10px; color: #666; text-align: center; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/logo.png" alt="New Tractor" class="logo" />
            <div class="title">
              <h1>LAUDO DE INSPEÇÃO TÉCNICA</h1>
              <p>Nº ${data.numero}</p>
            </div>
            <div style="width: 100px; text-align: right; font-size: 12px;">
              <strong>Data:</strong><br>${data.dataInspecao}
            </div>
          </div>

          <div class="info-section">
            <h2>DADOS DO CLIENTE</h2>
            <div class="info-grid">
              <div class="info-item"><strong>Cliente</strong>${data.cliente.nome}</div>
              <div class="info-item"><strong>CNPJ</strong>${data.cliente.cnpj || 'N/A'}</div>
              <div class="info-item"><strong>Cidade/UF</strong>${data.cliente.cidade || ''}${data.cliente.estado ? '/' + data.cliente.estado : ''}</div>
              <div class="info-item"><strong>Telefone</strong>${data.cliente.telefone || 'N/A'}</div>
            </div>
          </div>

          <div class="info-section">
            <h2>DADOS DO EQUIPAMENTO</h2>
            <div class="info-grid">
              <div class="info-item"><strong>Equipamento</strong>${data.equipamento}</div>
              <div class="info-item"><strong>Nº de Série</strong>${data.numeroSerie}</div>
              <div class="info-item"><strong>Inspetor</strong>${data.inspetor}</div>
              <div class="info-item"><strong>Representante</strong>${data.vendedor}</div>
            </div>
          </div>

          <div class="info-section">
            <h2>COMPONENTES AVALIADOS</h2>
            <table class="components-table">
              <thead>
                <tr>
                  <th style="width: 25%;">Componente</th>
                  <th style="width: 15%;">Condição</th>
                  <th>Observação Técnica</th>
                </tr>
              </thead>
              <tbody>
                ${data.componentes.map((c: any) => `
                  <tr>
                    <td>${c.nome}</td>
                    <td class="condicao-${c.condicao.toLowerCase()}">${c.condicaoLabel}</td>
                    <td>${c.observacao || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          ${data.fotos && data.fotos.length > 0 ? `
            <div class="info-section">
              <h2>REGISTRO FOTOGRÁFICO</h2>
              <div class="photos">
                ${data.fotos.map((foto: string) => `<img src="${foto}" alt="Foto do equipamento" />`).join('')}
              </div>
            </div>
          ` : ''}

          <div class="footer">
            <p>New Tractor - Soluções em Equipamentos Pesados</p>
            <p>Este documento foi gerado automaticamente pelo sistema Tractus em ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </body>
        </html>
      `

      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.onload = () => {
        printWindow.print()
      }
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
            onClick={() => router.push('/comercial/agenda-inspetor')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Laudos de Inspeção</h1>
            <p className="text-muted-foreground mt-1">
              Crie e gerencie os laudos das inspeções técnicas
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLaudos}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
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

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Semana Anterior
        </Button>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {formatDate(startDate)} - {formatDate(endDate)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
          Próxima Semana
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Lista de dias */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : diasAgendados.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center">
            <ClipboardCheck className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma visita agendada neste período</p>
            <p className="text-sm text-muted-foreground mt-1">
              As visitas confirmadas aparecerão aqui para você criar os laudos
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {diasAgendados.map((dia) => (
            <Card key={dia.data} className={`border-border/50 ${isToday(dia.data) ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isToday(dia.data) ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <span className="text-lg font-bold">{new Date(dia.data + 'T12:00:00').getDate()}</span>
                    </div>
                    <div>
                      <CardTitle className="text-lg capitalize">
                        {dia.diaSemana}
                        {isToday(dia.data) && (
                          <Badge className="ml-2 bg-primary text-primary-foreground">Hoje</Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground capitalize">
                        {new Date(dia.data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{dia.visitas.length} visita{dia.visitas.length !== 1 ? 's' : ''}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {dia.visitas.map((visita) => (
                    <div
                      key={visita.id}
                      className="p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {visita.temLaudo ? (
                              visita.laudo?.status === 'ENVIADO' ? (
                                <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Laudo Enviado
                                </Badge>
                              ) : (
                                <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                                  <Edit className="w-3 h-3 mr-1" />
                                  Rascunho
                                </Badge>
                              )
                            ) : (
                              <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Sem Laudo
                              </Badge>
                            )}
                            {visita.numero && (
                              <span className="text-xs text-muted-foreground">
                                Nº {visita.numero}
                              </span>
                            )}
                          </div>

                          <div className="flex items-start gap-2 mb-2">
                            <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="font-medium">{visita.cliente.nome}</p>
                              {visita.cliente.cidade && (
                                <p className="text-sm text-muted-foreground">
                                  {visita.cliente.cidade}{visita.cliente.estado ? `/${visita.cliente.estado}` : ''}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="mb-2">
                            <p className="text-xs text-muted-foreground uppercase mb-1">Equipamentos:</p>
                            <div className="flex flex-wrap gap-1">
                              {visita.equipamentos.map((eq, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {eq}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {visita.laudo && visita.laudo.componentes.length > 0 && (
                            <div className="mt-2 p-2 bg-muted/30 rounded-lg">
                              <p className="text-xs text-muted-foreground uppercase mb-1">
                                Componentes avaliados ({visita.laudo.componentes.length}):
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {visita.laudo.componentes.slice(0, 3).map((comp, i) => (
                                  <Badge
                                    key={i}
                                    className={`text-xs ${CONDICAO_CONFIG[comp.condicao].color}`}
                                  >
                                    {comp.nome}
                                  </Badge>
                                ))}
                                {visita.laudo.componentes.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{visita.laudo.componentes.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          {visita.temLaudo && visita.laudo?.status === 'ENVIADO' ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openLaudoModal(visita)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Visualizar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => gerarPDF(visita.laudo!.id)}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                PDF
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => openLaudoModal(visita)}
                            >
                              {visita.temLaudo ? (
                                <>
                                  <Edit className="w-4 h-4 mr-1" />
                                  Continuar
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 mr-1" />
                                  Criar Laudo
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Laudo */}
      {showLaudoModal && selectedVisita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeLaudoModal}
          />
          <Card className="relative z-10 w-full max-w-3xl mx-4 shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="pb-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5" />
                    {selectedVisita.laudo?.status === 'ENVIADO' ? 'Visualizar Laudo' : 'Laudo de Inspeção'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cliente: {selectedVisita.cliente.nome}
                    {selectedVisita.numero && ` | Nº ${selectedVisita.numero}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={closeLaudoModal}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 overflow-y-auto flex-1 pb-4">
              {/* Dados do Equipamento */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="equipamento">Equipamento *</Label>
                  <Input
                    id="equipamento"
                    value={laudoForm.equipamento}
                    onChange={(e) => setLaudoForm({ ...laudoForm, equipamento: e.target.value })}
                    placeholder="Ex: Escavadeira SANY SY215C"
                    disabled={selectedVisita.laudo?.status === 'ENVIADO'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numeroSerie">Nº de Série *</Label>
                  <Input
                    id="numeroSerie"
                    value={laudoForm.numeroSerie}
                    onChange={(e) => setLaudoForm({ ...laudoForm, numeroSerie: e.target.value })}
                    placeholder="Ex: SY215C12345"
                    disabled={selectedVisita.laudo?.status === 'ENVIADO'}
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
                  disabled={selectedVisita.laudo?.status === 'ENVIADO'}
                />
              </div>

              {/* Componentes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Componentes Avaliados *</Label>
                  {selectedVisita.laudo?.status !== 'ENVIADO' && (
                    <Button size="sm" variant="outline" onClick={addComponente}>
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  )}
                </div>

                {componentes.length === 0 ? (
                  <div className="p-4 rounded-lg bg-muted/50 text-center text-muted-foreground">
                    <p className="text-sm">Nenhum componente adicionado</p>
                    <p className="text-xs mt-1">Clique em "Adicionar" para avaliar um componente</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {componentes.map((comp, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg border border-border bg-muted/20 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 space-y-2">
                            <Input
                              placeholder="Nome do componente (ex: Motor, Sistema Hidráulico)"
                              value={comp.nome}
                              onChange={(e) => updateComponente(index, 'nome', e.target.value)}
                              disabled={selectedVisita.laudo?.status === 'ENVIADO'}
                            />
                          </div>
                          <select
                            value={comp.condicao}
                            onChange={(e) => updateComponente(index, 'condicao', e.target.value as any)}
                            disabled={selectedVisita.laudo?.status === 'ENVIADO'}
                            className={`h-10 px-3 rounded-md border text-sm ${CONDICAO_CONFIG[comp.condicao].color}`}
                          >
                            <option value="BOM">Bom</option>
                            <option value="REGULAR">Regular</option>
                            <option value="CRITICO">Crítico</option>
                          </select>
                          {selectedVisita.laudo?.status !== 'ENVIADO' && (
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

                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Observação técnica..."
                            value={comp.observacao}
                            onChange={(e) => updateComponente(index, 'observacao', e.target.value)}
                            rows={2}
                            className="flex-1"
                            disabled={selectedVisita.laudo?.status === 'ENVIADO'}
                          />
                          {selectedVisita.laudo?.status !== 'ENVIADO' && comp.observacao && (
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
              </div>

              {/* Fotos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Fotos ({fotos.length}/5)</Label>
                  {selectedVisita.laudo?.status !== 'ENVIADO' && fotos.length < 5 && (
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

                {fotos.length === 0 ? (
                  <div className="p-4 rounded-lg bg-muted/50 text-center text-muted-foreground">
                    <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma foto adicionada</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-2">
                    {fotos.map((foto, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={foto}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg border border-border"
                        />
                        {selectedVisita.laudo?.status !== 'ENVIADO' && (
                          <button
                            onClick={() => removeFoto(index)}
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>

            {/* Footer com botões */}
            {selectedVisita.laudo?.status !== 'ENVIADO' && (
              <div className="p-4 border-t flex justify-end gap-2">
                <Button variant="outline" onClick={closeLaudoModal}>
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
                    <FileText className="w-4 h-4 mr-2" />
                  )}
                  Salvar Rascunho
                </Button>
                <Button
                  onClick={enviarLaudo}
                  disabled={enviando || componentes.length === 0}
                >
                  {enviando ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Enviar Laudo
                </Button>
              </div>
            )}

            {/* Footer para laudo enviado */}
            {selectedVisita.laudo?.status === 'ENVIADO' && (
              <div className="p-4 border-t flex justify-end gap-2">
                <Button variant="outline" onClick={closeLaudoModal}>
                  Fechar
                </Button>
                <Button onClick={() => gerarPDF(selectedVisita.laudo!.id)}>
                  <Download className="w-4 h-4 mr-2" />
                  Gerar PDF
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardCheck,
  ArrowLeft,
  Loader2,
  X,
  Building2,
  CheckCircle,
  Edit,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Eye,
  Calendar,
  FileText,
  AlertTriangle,
  AlertCircle,
  Check,
} from 'lucide-react'

// Tipos de componentes rodantes
const TIPO_LABELS: Record<string, string> = {
  ESTEIRA: 'Esteira',
  SAPATA: 'Sapata',
  ROLETE_INFERIOR: 'Rolete Inferior',
  ROLETE_SUPERIOR: 'Rolete Superior',
  RODA_GUIA: 'Roda Guia',
  RODA_MOTRIZ: 'Roda Motriz',
}

const STATUS_CONFIG = {
  DENTRO_PARAMETROS: { label: 'OK', color: 'bg-green-500/20 text-green-600 border-green-500/30', icon: Check },
  VERIFICAR: { label: 'Verificar', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30', icon: AlertTriangle },
  FORA_PARAMETROS: { label: 'Fora', color: 'bg-red-500/20 text-red-600 border-red-500/30', icon: AlertCircle },
}

interface Medicao {
  id: string
  tipo: string
  desgasteLE: string | null
  desgasteLD: string | null
  statusLE: string | null
  statusLD: string | null
}

interface Laudo {
  id: string
  numero: string
  equipamento: string
  numeroSerie: string
  frota: string | null
  dataInspecao: string
  status: 'RASCUNHO' | 'ENVIADO'
  dataEnvio: string | null
  medicoes: Medicao[]
  visitaTecnica: {
    id: string
    cliente: {
      nome: string
      cidade: string | null
      estado: string | null
    }
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function LaudosInspetorPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [laudos, setLaudos] = useState<Laudo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filtros
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'RASCUNHO' | 'ENVIADO'>('TODOS')

  // Navegação de datas
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date.toISOString().split('T')[0] as string
  })
  const [endDate, setEndDate] = useState<string>(() => {
    const date = new Date()
    return date.toISOString().split('T')[0] as string
  })

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

      const res = await fetch(`${API_URL}/laudos-inspecao/historico/${user?.id}?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar laudos')
      const data: Laudo[] = await res.json()
      setLaudos(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const months = direction === 'prev' ? -1 : 1
    const newStart = new Date(startDate)
    const newEnd = new Date(endDate)
    newStart.setMonth(newStart.getMonth() + months)
    newEnd.setMonth(newEnd.getMonth() + months)
    setStartDate(newStart.toISOString().split('T')[0] as string)
    setEndDate(newEnd.toISOString().split('T')[0] as string)
  }

  const formatDate = (dateString: string) => {
    // Se já é uma data ISO completa, usa direto. Senão, adiciona T12:00:00
    const date = dateString.includes('T') ? new Date(dateString) : new Date(dateString + 'T12:00:00')
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const gerarPDF = async (laudoId: string) => {
    try {
      const res = await fetch(`${API_URL}/laudos-inspecao/${laudoId}/pdf-data`)
      if (!res.ok) throw new Error('Erro ao carregar dados do laudo')

      const data = await res.json()

      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        throw new Error('Popup bloqueado. Permita popups para gerar o PDF.')
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Inspeção de Desgaste - ${data.numero}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; font-size: 11px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
            .logo { height: 50px; width: auto; }
            .title { text-align: center; flex: 1; }
            .title h1 { font-size: 16px; margin-bottom: 5px; text-transform: uppercase; }
            .title p { font-size: 11px; color: #666; }
            .info-section { margin-bottom: 15px; }
            .info-section h2 { font-size: 12px; background: #1e3a5f; color: white; padding: 6px 10px; margin-bottom: 8px; text-transform: uppercase; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; padding: 0 10px; }
            .info-item { font-size: 11px; }
            .info-item strong { display: block; color: #666; font-size: 9px; text-transform: uppercase; margin-bottom: 2px; }
            .measurements-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .measurements-table th, .measurements-table td { border: 1px solid #000; padding: 6px 4px; text-align: center; font-size: 10px; }
            .measurements-table th { background: #1e3a5f; color: white; font-weight: bold; }
            .measurements-table td:first-child { text-align: left; font-weight: bold; padding-left: 8px; }
            .status-ok { background: #d4edda !important; color: #155724 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .status-verificar { background: #fff3cd !important; color: #856404 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .status-fora { background: #f8d7da !important; color: #721c24 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .photos-section { page-break-before: always; }
            .photos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px; }
            .photo-item { border: 1px solid #ddd; padding: 8px; }
            .photo-item img { width: 100%; height: 200px; object-fit: cover; }
            .photo-item .label { background: #1e3a5f; color: white; padding: 4px 8px; font-size: 10px; margin-top: 8px; text-align: center; }
            .summary-section { margin-top: 20px; padding: 15px; border: 1px solid #ddd; background: #f9f9f9; }
            .summary-section h3 { font-size: 12px; margin-bottom: 10px; color: #1e3a5f; }
            .summary-section p { font-size: 11px; line-height: 1.5; white-space: pre-wrap; }
            .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 9px; color: #666; text-align: center; }
            .legend { margin-top: 10px; display: flex; gap: 20px; font-size: 9px; }
            .legend-item { display: flex; align-items: center; gap: 5px; }
            .legend-color { width: 12px; height: 12px; border: 1px solid #999; }
            @media print {
              body { padding: 10px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              .photos-section { page-break-before: always; }
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/newtractor-logo.png" alt="New Tractor" class="logo" />
            <div class="title">
              <h1>Inspeção de Desgaste de Material Rodante</h1>
              <p>Laudo Nº ${data.numero}</p>
            </div>
            <div style="width: 100px; text-align: right; font-size: 11px;">
              <strong>Data:</strong><br>${data.dataInspecao}
            </div>
          </div>

          <div class="info-section">
            <h2>Dados do Cliente</h2>
            <div class="info-grid">
              <div class="info-item"><strong>Cliente</strong>${data.cliente.nome}</div>
              <div class="info-item"><strong>Cidade/UF</strong>${data.cliente.cidade || ''}${data.cliente.estado ? '/' + data.cliente.estado : ''}</div>
              <div class="info-item"><strong>Representante</strong>${data.vendedor}</div>
            </div>
          </div>

          <div class="info-section">
            <h2>Dados do Equipamento</h2>
            <div class="info-grid">
              <div class="info-item"><strong>Equipamento</strong>${data.equipamento}</div>
              <div class="info-item"><strong>Nº de Série</strong>${data.numeroSerie}</div>
              <div class="info-item"><strong>Frota</strong>${data.frota || 'N/A'}</div>
              <div class="info-item"><strong>Horímetro Total</strong>${data.horimetroTotal ? data.horimetroTotal + 'h' : 'N/A'}</div>
              <div class="info-item"><strong>Horímetro Esteira</strong>${data.horimetroEsteira ? data.horimetroEsteira + 'h' : 'N/A'}</div>
              <div class="info-item"><strong>Condição do Solo</strong>${data.condicaoSoloLabel || 'N/A'}</div>
            </div>
          </div>

          <div class="info-section">
            <h2>Medições de Componentes (mm)</h2>
            <table class="measurements-table">
              <thead>
                <tr>
                  <th style="width: 15%;">Componente</th>
                  <th style="width: 10%;">Dim. Std</th>
                  <th style="width: 10%;">Lim. Reparo</th>
                  <th style="width: 10%;">Medição LE</th>
                  <th style="width: 10%;">Medição LD</th>
                  <th style="width: 9%;">% Desg. LE</th>
                  <th style="width: 9%;">% Desg. LD</th>
                  <th style="width: 27%;">NOTA</th>
                </tr>
              </thead>
              <tbody>
                ${data.medicoes.map((med: any) => {
                  const getStatusClass = (status: string | null) => {
                    if (!status) return ''
                    if (status === 'DENTRO_PARAMETROS') return 'status-ok'
                    if (status === 'VERIFICAR') return 'status-verificar'
                    return 'status-fora'
                  }
                  const maxStatus = (le: string | null, ld: string | null) => {
                    const priority: Record<string, number> = { 'FORA_PARAMETROS': 3, 'VERIFICAR': 2, 'DENTRO_PARAMETROS': 1 }
                    const pLE = priority[le || ''] || 0
                    const pLD = priority[ld || ''] || 0
                    if (pLE >= pLD) return le
                    return ld
                  }
                  const status = maxStatus(med.statusLE, med.statusLD)
                  // Nota com texto completo como no documento de referência
                  const notaClass = status === 'FORA_PARAMETROS' ? 'status-fora' : (status === 'VERIFICAR' ? 'status-verificar' : 'status-ok')
                  const notaText = status === 'FORA_PARAMETROS' ? 'FORA DOS PARÂMETROS DE DESGASTE' : 'DENTRO DOS PARÂMETROS DE DESGASTE'

                  return `
                    <tr>
                      <td>${med.tipoLabel}</td>
                      <td>${med.dimensaoStd !== null ? med.dimensaoStd.toFixed(2) : '-'}</td>
                      <td>${med.limiteReparo !== null ? med.limiteReparo.toFixed(2) : '-'}</td>
                      <td>${med.medicaoLE !== null ? med.medicaoLE.toFixed(2) : '-'}</td>
                      <td>${med.medicaoLD !== null ? med.medicaoLD.toFixed(2) : '-'}</td>
                      <td class="${getStatusClass(med.statusLE)}">${med.desgasteLE !== null ? med.desgasteLE.toFixed(1) + '%' : '-'}</td>
                      <td class="${getStatusClass(med.statusLD)}">${med.desgasteLD !== null ? med.desgasteLD.toFixed(1) + '%' : '-'}</td>
                      <td class="${notaClass}" style="font-size: 8px; font-weight: bold;">${notaText}</td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
            <div class="legend">
              <div class="legend-item"><div class="legend-color" style="background: #d4edda;"></div> Dentro dos parâmetros (≤70%)</div>
              <div class="legend-item"><div class="legend-color" style="background: #fff3cd;"></div> Verificar (70-100%)</div>
              <div class="legend-item"><div class="legend-color" style="background: #f8d7da;"></div> Fora dos parâmetros (>100%)</div>
            </div>
          </div>

          ${data.sumario ? `
            <div class="summary-section">
              <h3>Sumário Técnico / Observações</h3>
              <p>${data.sumario}</p>
            </div>
          ` : ''}

          ${data.fotos && data.fotos.length > 0 ? `
            <div class="photos-section">
              <div class="info-section">
                <h2>Registro Fotográfico</h2>
                <div class="photos">
                  ${data.fotos.map((foto: any) => `
                    <div class="photo-item">
                      <img src="${foto.url}" alt="${foto.tipoLabel}" />
                      <div class="label">${foto.tipoLabel}${foto.ladoLabel ? ' - ' + foto.ladoLabel : ''}${foto.legenda ? ': ' + foto.legenda : ''}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          ` : ''}

          <div class="footer">
            <p><strong>New Tractor</strong> - Soluções em Material Rodante para Equipamentos Pesados</p>
            <p>Inspetor: ${data.inspetor} | Documento gerado pelo sistema Tractus em ${new Date().toLocaleDateString('pt-BR')}</p>
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

  // Filtrar laudos
  const filteredLaudos = laudos.filter(laudo => {
    if (statusFilter === 'TODOS') return true
    return laudo.status === statusFilter
  })

  // Contar por status
  const totalRascunhos = laudos.filter(l => l.status === 'RASCUNHO').length
  const totalEnviados = laudos.filter(l => l.status === 'ENVIADO').length

  // Obter o pior status de um laudo
  const getWorstStatus = (medicoes: Medicao[]) => {
    let worst: string | null = null
    for (const m of medicoes) {
      if (m.statusLE === 'FORA_PARAMETROS' || m.statusLD === 'FORA_PARAMETROS') return 'FORA_PARAMETROS'
      if (m.statusLE === 'VERIFICAR' || m.statusLD === 'VERIFICAR') worst = 'VERIFICAR'
      if (!worst && (m.statusLE === 'DENTRO_PARAMETROS' || m.statusLD === 'DENTRO_PARAMETROS')) worst = 'DENTRO_PARAMETROS'
    }
    return worst
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
            <h1 className="text-3xl font-bold tracking-tight">Meus Laudos</h1>
            <p className="text-muted-foreground mt-1">
              Histórico de laudos de inspeção de material rodante
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className={`border-border/50 cursor-pointer transition-all ${statusFilter === 'TODOS' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setStatusFilter('TODOS')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{laudos.length}</p>
              </div>
              <ClipboardCheck className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card
          className={`border-yellow-500/20 bg-yellow-500/5 cursor-pointer transition-all ${statusFilter === 'RASCUNHO' ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => setStatusFilter('RASCUNHO')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rascunhos</p>
                <p className="text-2xl font-bold text-yellow-600">{totalRascunhos}</p>
              </div>
              <Edit className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card
          className={`border-green-500/20 bg-green-500/5 cursor-pointer transition-all ${statusFilter === 'ENVIADO' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setStatusFilter('ENVIADO')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Finalizados</p>
                <p className="text-2xl font-bold text-green-600">{totalEnviados}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Mês Anterior
        </Button>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {formatDate(startDate)} - {formatDate(endDate)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
          Próximo Mês
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Lista de Laudos */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredLaudos.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {statusFilter === 'TODOS'
                ? 'Nenhum laudo encontrado neste período'
                : `Nenhum laudo ${statusFilter === 'RASCUNHO' ? 'em rascunho' : 'finalizado'} neste período`
              }
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Acesse a Agenda para criar novos laudos
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLaudos.map((laudo) => {
            const worstStatus = getWorstStatus(laudo.medicoes)
            const statusConfig = worstStatus ? STATUS_CONFIG[worstStatus as keyof typeof STATUS_CONFIG] : null

            return (
              <Card key={laudo.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {laudo.status === 'ENVIADO' ? (
                          <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Finalizado
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                            <Edit className="w-3 h-3 mr-1" />
                            Rascunho
                          </Badge>
                        )}
                        {statusConfig && laudo.status === 'ENVIADO' && (
                          <Badge className={statusConfig.color}>
                            {worstStatus === 'DENTRO_PARAMETROS' && <Check className="w-3 h-3 mr-1" />}
                            {worstStatus === 'VERIFICAR' && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {worstStatus === 'FORA_PARAMETROS' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {statusConfig.label}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Nº {laudo.numero}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          | {formatDate(laudo.dataInspecao)}
                        </span>
                      </div>

                      <div className="flex items-start gap-2 mb-2">
                        <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">{laudo.visitaTecnica.cliente.nome}</p>
                          {laudo.visitaTecnica.cliente.cidade && (
                            <p className="text-sm text-muted-foreground">
                              {laudo.visitaTecnica.cliente.cidade}{laudo.visitaTecnica.cliente.estado ? `/${laudo.visitaTecnica.cliente.estado}` : ''}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mb-2">
                        <p className="text-sm">
                          <span className="text-muted-foreground">Equipamento:</span>{' '}
                          <span className="font-medium">{laudo.equipamento}</span>
                          {laudo.numeroSerie && (
                            <span className="text-muted-foreground"> | Série: {laudo.numeroSerie}</span>
                          )}
                          {laudo.frota && (
                            <span className="text-muted-foreground"> | Frota: {laudo.frota}</span>
                          )}
                        </p>
                      </div>

                      {laudo.medicoes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {laudo.medicoes.slice(0, 6).map((med, i) => {
                            const medStatus = med.statusLE === 'FORA_PARAMETROS' || med.statusLD === 'FORA_PARAMETROS'
                              ? 'FORA_PARAMETROS'
                              : med.statusLE === 'VERIFICAR' || med.statusLD === 'VERIFICAR'
                                ? 'VERIFICAR'
                                : 'DENTRO_PARAMETROS'
                            const medConfig = STATUS_CONFIG[medStatus as keyof typeof STATUS_CONFIG]

                            return (
                              <Badge
                                key={i}
                                className={`text-xs ${medConfig?.color || ''}`}
                              >
                                {TIPO_LABELS[med.tipo] || med.tipo}
                              </Badge>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      {laudo.status === 'ENVIADO' ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/comercial/laudos-inspetor/editar?visita=${laudo.visitaTecnica.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Visualizar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => gerarPDF(laudo.id)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            PDF
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => router.push(`/comercial/laudos-inspetor/editar?visita=${laudo.visitaTecnica.id}`)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Continuar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

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
} from 'lucide-react'

interface Laudo {
  id: string
  numero: string
  equipamento: string
  numeroSerie: string
  dataInspecao: string
  status: 'RASCUNHO' | 'ENVIADO'
  dataEnvio: string | null
  componentes: {
    id: string
    nome: string
    condicao: 'BOM' | 'REGULAR' | 'CRITICO'
  }[]
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

const CONDICAO_CONFIG = {
  BOM: { label: 'Bom', color: 'bg-green-500/20 text-green-600 border-green-500/30' },
  REGULAR: { label: 'Regular', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
  CRITICO: { label: 'Crítico', color: 'bg-red-500/20 text-red-600 border-red-500/30' },
}

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
    return new Date(dateString + 'T12:00:00').toLocaleDateString('pt-BR', {
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

  // Filtrar laudos
  const filteredLaudos = laudos.filter(laudo => {
    if (statusFilter === 'TODOS') return true
    return laudo.status === statusFilter
  })

  // Contar por status
  const totalRascunhos = laudos.filter(l => l.status === 'RASCUNHO').length
  const totalEnviados = laudos.filter(l => l.status === 'ENVIADO').length

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
              Histórico de laudos de inspeção
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
          {filteredLaudos.map((laudo) => (
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
                      </p>
                    </div>

                    {laudo.componentes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {laudo.componentes.slice(0, 4).map((comp, i) => (
                          <Badge
                            key={i}
                            className={`text-xs ${CONDICAO_CONFIG[comp.condicao].color}`}
                          >
                            {comp.nome}
                          </Badge>
                        ))}
                        {laudo.componentes.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{laudo.componentes.length - 4}
                          </Badge>
                        )}
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
          ))}
        </div>
      )}
    </div>
  )
}

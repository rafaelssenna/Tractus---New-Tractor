'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
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
  Camera,
  Send,
  CheckCircle,
  Save,
  Building2,
  MapPin,
  User,
  Gauge,
  Ruler,
  AlertTriangle,
  AlertCircle,
  Check,
  Trash2,
} from 'lucide-react'

// Tipos de componentes rodantes
const TIPOS_COMPONENTES = [
  { tipo: 'ESTEIRA', label: 'Esteira' },
  { tipo: 'SAPATA', label: 'Sapata' },
  { tipo: 'ROLETE_INFERIOR', label: 'Rolete Inferior' },
  { tipo: 'ROLETE_SUPERIOR', label: 'Rolete Superior' },
  { tipo: 'RODA_GUIA', label: 'Roda Guia' },
  { tipo: 'RODA_MOTRIZ', label: 'Roda Motriz' },
] as const

type TipoComponente = typeof TIPOS_COMPONENTES[number]['tipo']

interface MedicaoForm {
  tipo: TipoComponente
  dimensaoStd: number | null
  limiteReparo: number | null
  medicaoLE: number | null
  medicaoLD: number | null
  desgasteLE: number | null
  desgasteLD: number | null
  statusLE: string | null
  statusLD: string | null
  observacao: string
}

interface FotoForm {
  tipo: TipoComponente
  lado: 'LE' | 'LD' | 'AMBOS'
  url: string
  legenda: string
}

interface Laudo {
  id: string
  equipamento: string
  numeroSerie: string
  frota: string | null
  horimetroTotal: number | null
  horimetroEsteira: number | null
  condicaoSolo: string | null
  dataInspecao: string
  sumario: string | null
  status: 'RASCUNHO' | 'ENVIADO'
  medicoesRodante: {
    id: string
    tipo: TipoComponente
    dimensaoStd: string | null
    limiteReparo: string | null
    medicaoLE: string | null
    medicaoLD: string | null
    desgasteLE: string | null
    desgasteLD: string | null
    statusLE: string | null
    statusLD: string | null
    observacao: string | null
  }[]
  fotosComponentes: {
    id: string
    tipo: TipoComponente
    lado: string
    url: string
    legenda: string | null
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

// Valores padrão para cada tipo de componente
const VALORES_PADRAO: Record<TipoComponente, { dimensaoStd: number; limiteReparo: number }> = {
  ESTEIRA: { dimensaoStd: 175.0, limiteReparo: 155.0 },
  SAPATA: { dimensaoStd: 32.0, limiteReparo: 22.0 },
  ROLETE_INFERIOR: { dimensaoStd: 185.0, limiteReparo: 171.0 },
  ROLETE_SUPERIOR: { dimensaoStd: 145.0, limiteReparo: 133.0 },
  RODA_GUIA: { dimensaoStd: 555.0, limiteReparo: 525.0 },
  RODA_MOTRIZ: { dimensaoStd: 225.0, limiteReparo: 210.0 },
}

const STATUS_CONFIG = {
  DENTRO_PARAMETROS: { label: 'Dentro dos parâmetros', color: 'bg-green-500/20 text-green-600 border-green-500/30', icon: Check },
  VERIFICAR: { label: 'Verificar', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30', icon: AlertTriangle },
  FORA_PARAMETROS: { label: 'Fora dos parâmetros', color: 'bg-red-500/20 text-red-600 border-red-500/30', icon: AlertCircle },
}

const CONDICAO_SOLO_OPTIONS = [
  { value: 'BAIXO_IMPACTO', label: 'Baixo Impacto' },
  { value: 'MEDIO_IMPACTO', label: 'Médio Impacto' },
  { value: 'ALTO_IMPACTO', label: 'Alto Impacto' },
]

// Calcular percentual de desgaste
function calcularDesgaste(dimensaoStd: number | null, limiteReparo: number | null, medicao: number | null): { desgaste: number | null; status: string | null } {
  if (!dimensaoStd || !limiteReparo || !medicao) {
    return { desgaste: null, status: null }
  }

  const faixaTotal = dimensaoStd - limiteReparo
  if (faixaTotal <= 0) {
    return { desgaste: null, status: null }
  }

  const desgasteAtual = dimensaoStd - medicao
  const percentual = (desgasteAtual / faixaTotal) * 100

  let status: string
  if (percentual <= 70) {
    status = 'DENTRO_PARAMETROS'
  } else if (percentual <= 90) {
    status = 'VERIFICAR'
  } else {
    status = 'FORA_PARAMETROS'
  }

  return {
    desgaste: Math.round(percentual * 100) / 100,
    status,
  }
}

export default function EditarLaudoPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <EditarLaudoContent />
    </Suspense>
  )
}

function EditarLaudoContent() {
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
    frota: '',
    horimetroTotal: '' as string | number,
    horimetroEsteira: '' as string | number,
    condicaoSolo: '' as string,
    dataInspecao: new Date().toISOString().split('T')[0],
    sumario: '',
  })

  // Medições
  const [medicoes, setMedicoes] = useState<MedicaoForm[]>([])

  // Fotos
  const [fotos, setFotos] = useState<FotoForm[]>([])
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [fotoTipoSelecionado, setFotoTipoSelecionado] = useState<TipoComponente>('ESTEIRA')
  const [fotoLadoSelecionado, setFotoLadoSelecionado] = useState<'LE' | 'LD' | 'AMBOS'>('AMBOS')

  const [laudoId, setLaudoId] = useState<string | null>(null)

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
          frota: laudo.frota || '',
          horimetroTotal: laudo.horimetroTotal || '',
          horimetroEsteira: laudo.horimetroEsteira || '',
          condicaoSolo: laudo.condicaoSolo || '',
          dataInspecao: laudo.dataInspecao.split('T')[0],
          sumario: laudo.sumario || '',
        })

        // Carregar medições
        if (laudo.medicoesRodante && laudo.medicoesRodante.length > 0) {
          setMedicoes(
            laudo.medicoesRodante.map((m) => ({
              tipo: m.tipo,
              dimensaoStd: m.dimensaoStd ? parseFloat(m.dimensaoStd) : null,
              limiteReparo: m.limiteReparo ? parseFloat(m.limiteReparo) : null,
              medicaoLE: m.medicaoLE ? parseFloat(m.medicaoLE) : null,
              medicaoLD: m.medicaoLD ? parseFloat(m.medicaoLD) : null,
              desgasteLE: m.desgasteLE ? parseFloat(m.desgasteLE) : null,
              desgasteLD: m.desgasteLD ? parseFloat(m.desgasteLD) : null,
              statusLE: m.statusLE,
              statusLD: m.statusLD,
              observacao: m.observacao || '',
            }))
          )
        } else {
          // Inicializar medições com valores padrão
          inicializarMedicoes()
        }

        // Carregar fotos
        if (laudo.fotosComponentes) {
          setFotos(
            laudo.fotosComponentes.map((f) => ({
              tipo: f.tipo,
              lado: f.lado as 'LE' | 'LD' | 'AMBOS',
              url: f.url,
              legenda: f.legenda || '',
            }))
          )
        }
      } else {
        // Preencher com dados da visita
        setLaudoForm({
          equipamento: data.equipamentos[0] || '',
          numeroSerie: '',
          frota: '',
          horimetroTotal: '',
          horimetroEsteira: '',
          condicaoSolo: '',
          dataInspecao: data.dataVisita?.split('T')[0] || new Date().toISOString().split('T')[0],
          sumario: '',
        })
        // Inicializar medições
        inicializarMedicoes()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inicializarMedicoes = () => {
    const medicoesIniciais: MedicaoForm[] = TIPOS_COMPONENTES.map(({ tipo }) => ({
      tipo,
      dimensaoStd: VALORES_PADRAO[tipo].dimensaoStd,
      limiteReparo: VALORES_PADRAO[tipo].limiteReparo,
      medicaoLE: null,
      medicaoLD: null,
      desgasteLE: null,
      desgasteLD: null,
      statusLE: null,
      statusLD: null,
      observacao: '',
    }))
    setMedicoes(medicoesIniciais)
  }

  const updateMedicao = (tipo: TipoComponente, field: keyof MedicaoForm, value: any) => {
    setMedicoes(prev => {
      const updated = prev.map(m => {
        if (m.tipo !== tipo) return m

        const newMedicao = { ...m, [field]: value }

        // Recalcular desgaste se mudar medição
        if (field === 'medicaoLE' || field === 'dimensaoStd' || field === 'limiteReparo') {
          const calcLE = calcularDesgaste(
            field === 'dimensaoStd' ? value : newMedicao.dimensaoStd,
            field === 'limiteReparo' ? value : newMedicao.limiteReparo,
            field === 'medicaoLE' ? value : newMedicao.medicaoLE
          )
          newMedicao.desgasteLE = calcLE.desgaste
          newMedicao.statusLE = calcLE.status
        }

        if (field === 'medicaoLD' || field === 'dimensaoStd' || field === 'limiteReparo') {
          const calcLD = calcularDesgaste(
            field === 'dimensaoStd' ? value : newMedicao.dimensaoStd,
            field === 'limiteReparo' ? value : newMedicao.limiteReparo,
            field === 'medicaoLD' ? value : newMedicao.medicaoLD
          )
          newMedicao.desgasteLD = calcLD.desgaste
          newMedicao.statusLD = calcLD.status
        }

        return newMedicao
      })
      return updated
    })
  }

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFoto(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const base64 = reader.result as string

          const res = await fetch(`${API_URL}/despesas/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64 }),
          })

          if (!res.ok) throw new Error('Erro ao fazer upload da foto')

          const data = await res.json()
          setFotos([...fotos, {
            tipo: fotoTipoSelecionado,
            lado: fotoLadoSelecionado,
            url: data.url,
            legenda: '',
          }])
        } catch (err: any) {
          setError(err.message)
        } finally {
          setUploadingFoto(false)
          if (fotoInputRef.current) {
            fotoInputRef.current.value = ''
          }
        }
      }
      reader.onerror = () => {
        setError('Erro ao ler arquivo')
        setUploadingFoto(false)
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      setError(err.message)
      setUploadingFoto(false)
    }
  }

  const removeFoto = (index: number) => {
    setFotos(fotos.filter((_, i) => i !== index))
  }

  const updateFotoLegenda = (index: number, legenda: string) => {
    const updated = [...fotos]
    updated[index] = { ...updated[index]!, legenda }
    setFotos(updated)
  }

  const salvarLaudo = async () => {
    if (!visita || !user?.id) return

    if (!laudoForm.equipamento || !laudoForm.numeroSerie) {
      setError('Preencha equipamento e número de série')
      return
    }

    // Verificar se há pelo menos uma medição preenchida
    const medicoesPreenchidas = medicoes.filter(m => m.medicaoLE !== null || m.medicaoLD !== null)
    if (medicoesPreenchidas.length === 0) {
      setError('Preencha pelo menos uma medição')
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
        frota: laudoForm.frota || undefined,
        horimetroTotal: laudoForm.horimetroTotal ? Number(laudoForm.horimetroTotal) : null,
        horimetroEsteira: laudoForm.horimetroEsteira ? Number(laudoForm.horimetroEsteira) : null,
        condicaoSolo: laudoForm.condicaoSolo || null,
        dataInspecao: laudoForm.dataInspecao,
        sumario: laudoForm.sumario || undefined,
        medicoes: medicoes.map(m => ({
          tipo: m.tipo,
          dimensaoStd: m.dimensaoStd,
          limiteReparo: m.limiteReparo,
          medicaoLE: m.medicaoLE,
          medicaoLD: m.medicaoLD,
          observacao: m.observacao || undefined,
        })),
        fotos: fotos.map(f => ({
          tipo: f.tipo,
          lado: f.lado,
          url: f.url,
          legenda: f.legenda || undefined,
        })),
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
              Inspeção de Desgaste - Material Rodante
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

      {/* Dados do Equipamento */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" />
            Dados do Equipamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="frota">Código da Frota</Label>
              <Input
                id="frota"
                value={laudoForm.frota}
                onChange={(e) => setLaudoForm({ ...laudoForm, frota: e.target.value })}
                placeholder="Ex: EX-001"
                disabled={isEnviado}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="horimetroTotal">Horímetro Total</Label>
              <div className="relative">
                <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="horimetroTotal"
                  type="number"
                  value={laudoForm.horimetroTotal}
                  onChange={(e) => setLaudoForm({ ...laudoForm, horimetroTotal: e.target.value })}
                  placeholder="0"
                  className="pl-10"
                  disabled={isEnviado}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="horimetroEsteira">Horímetro Esteira</Label>
              <div className="relative">
                <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="horimetroEsteira"
                  type="number"
                  value={laudoForm.horimetroEsteira}
                  onChange={(e) => setLaudoForm({ ...laudoForm, horimetroEsteira: e.target.value })}
                  placeholder="0"
                  className="pl-10"
                  disabled={isEnviado}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="condicaoSolo">Condição do Solo</Label>
              <select
                id="condicaoSolo"
                value={laudoForm.condicaoSolo}
                onChange={(e) => setLaudoForm({ ...laudoForm, condicaoSolo: e.target.value })}
                disabled={isEnviado}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Selecione...</option>
                {CONDICAO_SOLO_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataInspecao">Data da Inspeção</Label>
              <Input
                id="dataInspecao"
                type="date"
                value={laudoForm.dataInspecao}
                onChange={(e) => setLaudoForm({ ...laudoForm, dataInspecao: e.target.value })}
                disabled={isEnviado}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Medições */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ruler className="w-5 h-5" />
            Medições de Componentes (mm)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border border-border px-3 py-2 text-left font-medium">Componente</th>
                  <th className="border border-border px-3 py-2 text-center font-medium">Dimensão Std</th>
                  <th className="border border-border px-3 py-2 text-center font-medium">Limite Reparo</th>
                  <th className="border border-border px-3 py-2 text-center font-medium" colSpan={2}>Medição LE</th>
                  <th className="border border-border px-3 py-2 text-center font-medium" colSpan={2}>Medição LD</th>
                  <th className="border border-border px-3 py-2 text-center font-medium">% Desg. LE</th>
                  <th className="border border-border px-3 py-2 text-center font-medium">% Desg. LD</th>
                </tr>
              </thead>
              <tbody>
                {medicoes.map((med) => {
                  const tipoInfo = TIPOS_COMPONENTES.find(t => t.tipo === med.tipo)
                  const statusLEConfig = med.statusLE ? STATUS_CONFIG[med.statusLE as keyof typeof STATUS_CONFIG] : null
                  const statusLDConfig = med.statusLD ? STATUS_CONFIG[med.statusLD as keyof typeof STATUS_CONFIG] : null

                  return (
                    <tr key={med.tipo}>
                      <td className="border border-border px-3 py-2 font-medium">
                        {tipoInfo?.label}
                      </td>
                      <td className="border border-border px-2 py-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={med.dimensaoStd ?? ''}
                          onChange={(e) => updateMedicao(med.tipo, 'dimensaoStd', e.target.value ? parseFloat(e.target.value) : null)}
                          className="h-8 text-center"
                          disabled={isEnviado}
                        />
                      </td>
                      <td className="border border-border px-2 py-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={med.limiteReparo ?? ''}
                          onChange={(e) => updateMedicao(med.tipo, 'limiteReparo', e.target.value ? parseFloat(e.target.value) : null)}
                          className="h-8 text-center"
                          disabled={isEnviado}
                        />
                      </td>
                      <td className="border border-border px-2 py-1" colSpan={2}>
                        <Input
                          type="number"
                          step="0.01"
                          value={med.medicaoLE ?? ''}
                          onChange={(e) => updateMedicao(med.tipo, 'medicaoLE', e.target.value ? parseFloat(e.target.value) : null)}
                          className="h-8 text-center"
                          placeholder="Medição"
                          disabled={isEnviado}
                        />
                      </td>
                      <td className="border border-border px-2 py-1" colSpan={2}>
                        <Input
                          type="number"
                          step="0.01"
                          value={med.medicaoLD ?? ''}
                          onChange={(e) => updateMedicao(med.tipo, 'medicaoLD', e.target.value ? parseFloat(e.target.value) : null)}
                          className="h-8 text-center"
                          placeholder="Medição"
                          disabled={isEnviado}
                        />
                      </td>
                      <td className={`border border-border px-2 py-1 text-center ${statusLEConfig ? statusLEConfig.color : ''}`}>
                        {med.desgasteLE !== null ? `${med.desgasteLE}%` : '-'}
                      </td>
                      <td className={`border border-border px-2 py-1 text-center ${statusLDConfig ? statusLDConfig.color : ''}`}>
                        {med.desgasteLD !== null ? `${med.desgasteLD}%` : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/30" />
              <span>Dentro dos parâmetros (≤70%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500/20 border border-yellow-500/30" />
              <span>Verificar (70-90%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/30" />
              <span>Fora dos parâmetros (≥90%)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fotos dos Componentes */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Fotos dos Componentes
            </CardTitle>
            {!isEnviado && (
              <div className="flex items-center gap-2">
                <select
                  value={fotoTipoSelecionado}
                  onChange={(e) => setFotoTipoSelecionado(e.target.value as TipoComponente)}
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {TIPOS_COMPONENTES.map(t => (
                    <option key={t.tipo} value={t.tipo}>{t.label}</option>
                  ))}
                </select>
                <select
                  value={fotoLadoSelecionado}
                  onChange={(e) => setFotoLadoSelecionado(e.target.value as 'LE' | 'LD' | 'AMBOS')}
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="LE">Lado Esquerdo</option>
                  <option value="LD">Lado Direito</option>
                  <option value="AMBOS">Geral</option>
                </select>
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
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {fotos.length === 0 ? (
            <div className="p-8 rounded-lg bg-muted/50 text-center text-muted-foreground">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma foto adicionada</p>
              <p className="text-sm mt-1">Adicione fotos dos componentes inspecionados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fotos.map((foto, index) => {
                const tipoLabel = TIPOS_COMPONENTES.find(t => t.tipo === foto.tipo)?.label
                const ladoLabel = foto.lado === 'LE' ? 'Lado Esquerdo' : foto.lado === 'LD' ? 'Lado Direito' : 'Geral'

                return (
                  <div key={index} className="relative border border-border rounded-lg overflow-hidden">
                    <img
                      src={foto.url}
                      alt={`${tipoLabel} - ${ladoLabel}`}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-2 bg-muted/50">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-xs">
                          {tipoLabel} - {ladoLabel}
                        </Badge>
                        {!isEnviado && (
                          <button
                            onClick={() => removeFoto(index)}
                            className="p-1 rounded hover:bg-destructive/20 text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <Input
                        placeholder="Legenda da foto..."
                        value={foto.legenda}
                        onChange={(e) => updateFotoLegenda(index, e.target.value)}
                        className="h-8 text-xs"
                        disabled={isEnviado}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sumário / Observações */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Sumário Técnico / Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Escreva um resumo técnico da inspeção, recomendações de manutenção, etc..."
            value={laudoForm.sumario}
            onChange={(e) => setLaudoForm({ ...laudoForm, sumario: e.target.value })}
            rows={4}
            disabled={isEnviado}
          />
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
            Salvar Rascunho
          </Button>
          <Button
            onClick={finalizarLaudo}
            disabled={enviando || medicoes.filter(m => m.medicaoLE !== null || m.medicaoLD !== null).length === 0}
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

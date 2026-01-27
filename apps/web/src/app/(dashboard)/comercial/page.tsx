'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  FileText,
  DollarSign,
  Plus,
  Target,
  Calendar,
  MapPin,
  ChevronRight,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const stats = [
  {
    title: 'Clientes Ativos',
    value: '0',
    change: '-',
    icon: Users,
    color: 'text-info',
    bgColor: 'bg-info/10',
    borderColor: 'border-info/20',
  },
  {
    title: 'Orçamentos Pendentes',
    value: '0',
    change: '-',
    icon: FileText,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
  },
  {
    title: 'Faturamento (Mês)',
    value: 'R$ 0',
    change: '-',
    icon: DollarSign,
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/20',
  },
  {
    title: 'Meta Atingida',
    value: '0%',
    change: '-',
    icon: Target,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
  },
]

export default function ComercialPage() {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comercial</h1>
          <p className="text-muted-foreground mt-1">
            Gestão de vendas, clientes e metas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Janeiro 2025
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className={`border ${stat.borderColor} ${stat.bgColor} backdrop-blur-sm`}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metas por Vendedor */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold">Metas por Vendedor</h3>
          <Card className="border-border/50">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum vendedor cadastrado</p>
              <Button variant="outline" size="sm" className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Vendedor
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Gráfico de Metas */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Meta vs Realizado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Sem dados para exibir</p>
              </div>
            </CardContent>
          </Card>

          {/* Visitas da Semana */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Visitas da Semana</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs">
                  Ver rota
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <MapPin className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">Nenhuma visita agendada</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

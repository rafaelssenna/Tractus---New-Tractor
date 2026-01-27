'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardList, Clock, Truck, Calendar } from 'lucide-react'

const stats = [
  { title: 'OS em Planejamento', value: '5', icon: ClipboardList, color: 'text-info', bgColor: 'bg-info/20' },
  { title: 'Aguardando Início', value: '3', icon: Clock, color: 'text-primary', bgColor: 'bg-primary/20' },
  { title: 'Fretes Programados', value: '2', icon: Truck, color: 'text-success', bgColor: 'bg-success/20' },
  { title: 'Previsão Semana', value: '8', icon: Calendar, color: 'text-warning', bgColor: 'bg-warning/20' },
]

export default function PCPPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PCP</h1>
        <p className="text-muted-foreground">Planejamento e Controle de Produção</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cronograma de Produção</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center text-muted-foreground">
            <p>Módulo em desenvolvimento - Fase 2</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

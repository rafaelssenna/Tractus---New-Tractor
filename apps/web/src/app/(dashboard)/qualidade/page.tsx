'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, AlertTriangle, FileCheck, ClipboardCheck } from 'lucide-react'

const stats = [
  { title: 'Inspeções Pendentes', value: '4', icon: ClipboardCheck, color: 'text-info', bgColor: 'bg-info/20' },
  { title: 'Aprovadas (Mês)', value: '23', icon: CheckCircle, color: 'text-success', bgColor: 'bg-success/20' },
  { title: 'RNCs Abertas', value: '2', icon: AlertTriangle, color: 'text-destructive', bgColor: 'bg-destructive/20' },
  { title: 'Laudos Emitidos', value: '18', icon: FileCheck, color: 'text-primary', bgColor: 'bg-primary/20' },
]

export default function QualidadePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Qualidade</h1>
        <p className="text-muted-foreground">Inspeção e controle</p>
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
          <CardTitle>Controle de Qualidade</CardTitle>
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

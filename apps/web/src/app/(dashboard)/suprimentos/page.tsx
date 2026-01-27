'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Package, AlertTriangle, ShoppingCart, TrendingDown, Plus, Search, Filter } from 'lucide-react'

const stats = [
  {
    title: 'Itens em Estoque',
    value: '6',
    icon: Package,
    color: 'text-info',
    bgColor: 'bg-info/20',
  },
  {
    title: 'Abaixo do Mínimo',
    value: '2',
    icon: TrendingDown,
    color: 'text-primary',
    bgColor: 'bg-primary/20',
  },
  {
    title: 'Itens Críticos',
    value: '1',
    icon: AlertTriangle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/20',
  },
  {
    title: 'Pedidos em Aberto',
    value: '2',
    icon: ShoppingCart,
    color: 'text-success',
    bgColor: 'bg-success/20',
  },
]

const mockEstoque = [
  { codigo: 'ROL-6205', descricao: 'Rolamento 6205', qtd: 15, minimo: 10, unidade: 'UN', localizacao: 'A1-01', status: 'OK' },
  { codigo: 'ROL-6305', descricao: 'Rolamento 6305', qtd: 3, minimo: 10, unidade: 'UN', localizacao: 'A1-02', status: 'Baixo' },
  { codigo: 'PIN-CAT', descricao: 'Pino Caterpillar D6', qtd: 8, minimo: 5, unidade: 'UN', localizacao: 'B2-01', status: 'OK' },
  { codigo: 'CHP-12MM', descricao: 'Chapa Aço 12mm', qtd: 2, minimo: 5, unidade: 'M²', localizacao: 'C1-01', status: 'Crítico' },
  { codigo: 'PAR-HID', descricao: 'Parafuso Hidráulico M16', qtd: 50, minimo: 20, unidade: 'UN', localizacao: 'A2-03', status: 'OK' },
  { codigo: 'VED-CIL', descricao: 'Vedação Cilindro Hidr.', qtd: 12, minimo: 8, unidade: 'KIT', localizacao: 'D1-02', status: 'OK' },
]

export default function SuprimentosPage() {
  const [tab, setTab] = useState<'estoque' | 'pedidos'>('estoque')
  const [search, setSearch] = useState('')

  const filteredEstoque = mockEstoque.filter(
    (item) =>
      item.codigo.toLowerCase().includes(search.toLowerCase()) ||
      item.descricao.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OK':
        return <Badge variant="success">OK</Badge>
      case 'Baixo':
        return <Badge variant="warning">Baixo</Badge>
      case 'Crítico':
        return <Badge variant="critical">Crítico</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Suprimentos</h1>
        <p className="text-muted-foreground">Estoque e compras</p>
      </div>

      {/* Stats */}
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

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={tab === 'estoque' ? 'default' : 'outline'}
          onClick={() => setTab('estoque')}
          size="sm"
        >
          <Package className="w-4 h-4 mr-2" />
          Estoque
        </Button>
        <Button
          variant={tab === 'pedidos' ? 'default' : 'outline'}
          onClick={() => setTab('pedidos')}
          size="sm"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Pedidos de Compra
        </Button>
      </div>

      {/* Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar peças..."
                className="pl-10 w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filtrar
            </Button>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Novo Item
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">CÓDIGO</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">DESCRIÇÃO</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">QTD.</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">MÍNIMO</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">UNIDADE</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">LOCALIZAÇÃO</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">STATUS</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {filteredEstoque.map((item) => (
                  <tr key={item.codigo} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{item.codigo}</td>
                    <td className="py-3 px-4">{item.descricao}</td>
                    <td className={`py-3 px-4 ${item.qtd < item.minimo ? 'text-destructive font-medium' : ''}`}>
                      {item.qtd}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{item.minimo}</td>
                    <td className="py-3 px-4">{item.unidade}</td>
                    <td className="py-3 px-4">{item.localizacao}</td>
                    <td className="py-3 px-4">{getStatusBadge(item.status)}</td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm">
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

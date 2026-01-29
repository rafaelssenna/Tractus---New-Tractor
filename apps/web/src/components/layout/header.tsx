'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Bell, Search, Settings, LogOut, User, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface UserData {
  name: string
  email: string
  role: string
  photo?: string
}

const pageTitles: Record<string, { title: string; breadcrumb: string[] }> = {
  '/dashboard': { title: 'Dashboard', breadcrumb: ['Início', 'Dashboard'] },
  '/comercial': { title: 'Comercial', breadcrumb: ['Início', 'Comercial'] },
  '/comercial/visitas': { title: 'Visitas', breadcrumb: ['Início', 'Comercial', 'Visitas'] },
  '/comercial/rotas': { title: 'Rotas', breadcrumb: ['Início', 'Comercial', 'Rotas'] },
  '/suprimentos': { title: 'Suprimentos', breadcrumb: ['Início', 'Suprimentos'] },
  '/pcp': { title: 'PCP', breadcrumb: ['Início', 'PCP'] },
  '/producao': { title: 'Produção', breadcrumb: ['Início', 'Produção'] },
  '/qualidade': { title: 'Qualidade', breadcrumb: ['Início', 'Qualidade'] },
  '/configuracoes': { title: 'Configurações', breadcrumb: ['Início', 'Configurações'] },
}

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserData | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [notifications] = useState(3)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrador',
    DIRETOR: 'Diretor',
    COMERCIAL: 'Comercial',
    TECNICO: 'Inspetor',
    ORCAMENTO: 'Orçamento',
    FINANCEIRO: 'Financeiro',
    PCP: 'PCP',
    PRODUCAO: 'Produção',
    QUALIDADE: 'Qualidade',
    ALMOXARIFADO: 'Almoxarifado',
    RH: 'RH',
  }

  const currentPage = pageTitles[pathname] || { title: 'Dashboard', breadcrumb: ['Início'] }

  return (
    <header className="h-16 bg-card/50 backdrop-blur-sm border-b border-border flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <nav className="flex items-center gap-1 text-sm">
          {currentPage.breadcrumb.map((item, index) => (
            <div key={item} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              <span
                className={
                  index === currentPage.breadcrumb.length - 1
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground cursor-pointer transition-colors'
                }
              >
                {item}
              </span>
            </div>
          ))}
        </nav>
      </div>

      {/* Center - Search */}
      <div className="hidden md:flex items-center gap-4 flex-1 max-w-md mx-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar O.S., cliente, peça..."
            className="pl-10 bg-muted/50 border-transparent focus:border-primary/50 transition-colors"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="w-5 h-5" />
          {notifications > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full">
              {notifications}
            </span>
          )}
        </button>

        {/* Settings */}
        <button
          onClick={() => router.push('/configuracoes')}
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-border mx-2" />

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-3 p-1.5 pr-3 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              {user?.photo ? (
                <img src={user.photo} alt={user.name} className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <span className="text-sm font-bold text-primary">
                  {user?.name?.charAt(0) || 'A'}
                </span>
              )}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-sm font-medium leading-none">{user?.name || 'Operador'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {user?.role ? roleLabels[user.role] || user.role : 'Administrador'}
              </p>
            </div>
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 border-b border-border mb-2">
                  <p className="text-sm font-medium">{user?.name || 'Operador'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email || 'admin@tractus.com'}</p>
                </div>
                <button
                  onClick={() => {
                    router.push('/perfil')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <User className="w-4 h-4" />
                  Meu Perfil
                </button>
                <button
                  onClick={() => {
                    router.push('/configuracoes')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Configurações
                </button>
                <hr className="my-2 border-border" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sair do Sistema
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

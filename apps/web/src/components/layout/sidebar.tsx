'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ClipboardList,
  Factory,
  CheckCircle,
  ChevronLeft,
  ChevronDown,
  Settings,
  LogOut,
  Bell,
  User,
  BarChart3,
  Users,
  MapPin,
  Route,
  UserCheck,
  FileText,
  Wrench,
  Calendar,
  ClipboardCheck,
  Receipt,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth, canAccessRoute } from '@/contexts/auth-context'

type MenuItem = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  submenu?: { title: string; href: string; icon: React.ComponentType<{ className?: string }> }[]
}

const allMenuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Comercial',
    href: '/comercial',
    icon: ShoppingCart,
    submenu: [
      { title: 'Visão Geral', href: '/comercial', icon: BarChart3 },
      { title: 'Clientes', href: '/comercial/clientes', icon: Users },
      { title: 'Representantes Comerciais', href: '/comercial/vendedores', icon: UserCheck },
      { title: 'Rotas', href: '/comercial/rotas', icon: Route },
      { title: 'Despesas', href: '/comercial/despesas', icon: Receipt },
      { title: 'Agenda do Inspetor', href: '/comercial/agenda-inspetor', icon: Calendar },
    ],
  },
  {
    title: 'Suprimentos',
    href: '/suprimentos',
    icon: Package,
  },
  {
    title: 'PCP',
    href: '/pcp',
    icon: ClipboardList,
  },
  {
    title: 'Produção',
    href: '/producao',
    icon: Factory,
  },
  {
    title: 'Qualidade',
    href: '/qualidade',
    icon: CheckCircle,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])
  const { user, logout, isAdmin, isDiretor } = useAuth()
  const isVendedora = user?.role === 'COMERCIAL'

  // Filtrar menus baseado no perfil do usuário
  let menuItems = allMenuItems.filter(item => {
    if (!user) return false
    return canAccessRoute(user.role, item.href)
  }).map(item => {
    // Filtrar submenus também
    if (item.submenu) {
      let filteredSubmenu = item.submenu.filter(sub => canAccessRoute(user?.role, sub.href))

      // Para vendedoras, esconder "Visão Geral", "Vendedores" e "Agenda do Inspetor"
      if (isVendedora) {
        filteredSubmenu = filteredSubmenu.filter(sub =>
          sub.href !== '/comercial' &&
          sub.href !== '/comercial/vendedores' &&
          sub.href !== '/comercial/agenda-inspetor'
        )
        // Adicionar "Minhas Solicitações" no início para vendedoras
        filteredSubmenu = [
          { title: 'Minhas Solicitações', href: '/comercial/minhas-solicitacoes', icon: ClipboardCheck },
          ...filteredSubmenu
        ]
      }

      return {
        ...item,
        submenu: filteredSubmenu
      }
    }
    return item
  })

  // Para vendedoras, transformar submenu do Comercial em itens diretos
  if (isVendedora) {
    const newMenuItems: MenuItem[] = []
    menuItems.forEach(item => {
      if (item.href === '/comercial' && item.submenu) {
        // Adicionar itens do submenu diretamente
        item.submenu.forEach(sub => {
          newMenuItems.push({
            title: sub.title,
            href: sub.href,
            icon: sub.icon,
          })
        })
      } else {
        newMenuItems.push(item)
      }
    })
    menuItems = newMenuItems
  }

  // Verificar se pode ver link de Usuários (só ADMIN, DIRETOR e RH)
  const canSeeUsers = isAdmin || isDiretor || user?.role === 'RH'

  const toggleSubmenu = (href: string) => {
    setExpandedMenus((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    )
  }

  // Auto-expand menu if current path is in submenu
  const isInSubmenu = (item: MenuItem) => {
    if (!item.submenu) return false
    return item.submenu.some((sub) => pathname === sub.href || pathname.startsWith(sub.href + '/'))
  }

  return (
    <aside
      className={cn(
        'h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 relative',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center justify-center border-b border-sidebar-border",
        collapsed ? "h-20 px-2" : "h-40 px-3"
      )}>
        <Link href="/dashboard" className={cn(
          "flex items-center justify-center",
          collapsed && "w-12 h-12 overflow-hidden rounded-lg"
        )}>
          <Image
            src="/logo.png"
            alt="Tractus Logo"
            width={240}
            height={140}
            className={cn(
              collapsed ? "h-12 w-auto max-w-none" : "h-32 w-auto"
            )}
            priority
          />
        </Link>
      </div>

      {/* Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          'absolute -right-3 top-20 w-6 h-6 rounded-full bg-sidebar border border-sidebar-border flex items-center justify-center hover:bg-sidebar-accent transition-all z-10',
          collapsed && 'rotate-180'
        )}
      >
        <ChevronLeft className="w-3 h-3" />
      </button>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className={cn('mb-4', collapsed ? 'px-0' : 'px-3')}>
          {!collapsed && (
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Menu Principal
            </span>
          )}
        </div>
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const hasSubmenu = item.submenu && item.submenu.length > 0
          const isExpanded = expandedMenus.includes(item.href) || isInSubmenu(item)

          if (hasSubmenu) {
            return (
              <div key={item.href}>
                <button
                  onClick={() => toggleSubmenu(item.href)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                  )}
                  <item.icon
                    className={cn(
                      'w-5 h-5 shrink-0 transition-colors',
                      isActive ? 'text-primary' : 'group-hover:text-foreground'
                    )}
                  />
                  {!collapsed && (
                    <>
                      <span className="text-sm font-medium flex-1 text-left">{item.title}</span>
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 transition-transform',
                          isExpanded && 'rotate-180'
                        )}
                      />
                    </>
                  )}
                </button>
                {/* Submenu */}
                {!collapsed && isExpanded && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                    {item.submenu?.map((subItem) => {
                      const isSubActive = pathname === subItem.href
                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm',
                            isSubActive
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
                          )}
                        >
                          <subItem.icon className="w-4 h-4" />
                          <span>{subItem.title}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
              )}
              <item.icon
                className={cn(
                  'w-5 h-5 shrink-0 transition-colors',
                  isActive ? 'text-primary' : 'group-hover:text-foreground'
                )}
              />
              {!collapsed && (
                <span className="text-sm font-medium">{item.title}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-sidebar-border">
        {!collapsed ? (
          <div className="space-y-2">
            {canSeeUsers && (
              <Link
                href="/configuracoes/usuarios"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-colors"
              >
                <Users className="w-5 h-5" />
                <span className="text-sm">Usuários</span>
              </Link>
            )}
            <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-muted/30">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                {user?.photo ? (
                  <img src={user.photo} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-primary">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || 'Usuário'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
                title="Sair"
              >
                <LogOut className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {canSeeUsers && (
              <Link
                href="/configuracoes/usuarios"
                className="flex items-center justify-center p-2.5 rounded-lg text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-colors"
              >
                <Users className="w-5 h-5" />
              </Link>
            )}
            <div className="flex items-center justify-center p-2">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                {user?.photo ? (
                  <img src={user.photo} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-primary">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center justify-center p-2.5 rounded-lg text-muted-foreground hover:bg-sidebar-accent/50 hover:text-destructive transition-colors w-full"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

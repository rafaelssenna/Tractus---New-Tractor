'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export interface User {
  id: string
  name: string
  email: string
  role: string
  photo?: string
  vendedorId?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAdmin: boolean
  isComercial: boolean
  isDiretor: boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Rotas que cada perfil pode acessar
const rolePermissions: Record<string, string[]> = {
  ADMIN: ['*'], // Acesso total
  DIRETOR: ['*'], // Acesso total
  COMERCIAL: [
    '/dashboard',
    '/comercial',
    '/comercial/clientes',
    '/comercial/vendedores',
    '/comercial/propostas',
    '/comercial/visitas',
    '/comercial/rotas',
  ],
  TECNICO: [
    '/dashboard',
    '/producao',
    '/qualidade',
  ],
  PCP: [
    '/dashboard',
    '/pcp',
    '/producao',
  ],
  PRODUCAO: [
    '/dashboard',
    '/producao',
  ],
  QUALIDADE: [
    '/dashboard',
    '/qualidade',
  ],
  ORCAMENTO: [
    '/dashboard',
    '/comercial/propostas',
  ],
  SUPRIMENTOS: [
    '/dashboard',
    '/suprimentos',
  ],
  ALMOXARIFADO: [
    '/dashboard',
    '/suprimentos',
  ],
  FINANCEIRO: [
    '/dashboard',
  ],
  RH: [
    '/dashboard',
    '/configuracoes/usuarios',
  ],
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Carregar usuário do localStorage
    const storedUser = localStorage.getItem('user')
    const token = localStorage.getItem('token')

    if (storedUser && token) {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    // Verificar permissão de acesso à rota atual
    if (!isLoading && user && pathname !== '/login') {
      const allowedRoutes = rolePermissions[user.role] || []

      // Se tem acesso total, permite tudo
      if (allowedRoutes.includes('*')) return

      // Verifica se a rota atual é permitida
      const hasAccess = allowedRoutes.some(route =>
        pathname === route || pathname.startsWith(route + '/')
      )

      if (!hasAccess) {
        // Redireciona para o dashboard se não tem acesso
        router.push('/dashboard')
      }
    }
  }, [user, pathname, isLoading, router])

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    router.push('/login')
  }

  const isAdmin = user?.role === 'ADMIN'
  const isDiretor = user?.role === 'DIRETOR'
  const isComercial = user?.role === 'COMERCIAL'

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAdmin,
      isDiretor,
      isComercial,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper para verificar se o usuário pode ver um menu
export function canAccessRoute(role: string | undefined, route: string): boolean {
  if (!role) return false

  const allowedRoutes = rolePermissions[role] || []

  // Acesso total
  if (allowedRoutes.includes('*')) return true

  // Verifica se a rota é permitida
  return allowedRoutes.some(r => route === r || route.startsWith(r + '/'))
}

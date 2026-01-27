'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogIn, Eye, EyeOff, Loader2, Truck, Wrench, Settings2, BarChart3 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao fazer login')
      }

      const data = await res.json()
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = () => {
    setEmail('admin@tractus.com')
    setPassword('admin123')
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-gradient-to-br from-primary/10 via-background to-background relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FACC15' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-24">
          {/* Logo */}
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <Image
                src="/logo.png"
                alt="Tractus Logo"
                width={200}
                height={80}
                className="h-20 w-auto"
                priority
              />
            </div>
            <p className="text-xl text-muted-foreground max-w-md">
              Sistema integrado de gestão para serviços de máquinas pesadas e material rodante
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-6 max-w-lg">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-primary/10">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Material Rodante</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Monitoramento e laudos</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-success/10">
                <Wrench className="w-5 h-5 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Manutenção</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Gestão de ordens de serviço</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-info/10">
                <Settings2 className="w-5 h-5 text-info" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Produção</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Controle completo</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-destructive/10">
                <BarChart3 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Relatórios</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Indicadores em tempo real</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 text-sm text-muted-foreground">
            <p>© 2025 Tractus - New Tractor</p>
            <p className="text-xs mt-1">Especialistas em máquinas pesadas</p>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-primary/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-bl from-info/10 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Image
              src="/logo.png"
              alt="Tractus Logo"
              width={160}
              height={64}
              className="h-16 w-auto mx-auto"
              priority
            />
          </div>

          <Card className="border-border/50 shadow-lg">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold">Bem-vindo</CardTitle>
              <CardDescription>
                Entre com suas credenciais para acessar o sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 bg-muted/50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                    <a href="#" className="text-xs text-primary hover:underline">
                      Esqueceu a senha?
                    </a>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 bg-muted/50 pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-border bg-muted accent-primary"
                  />
                  <span className="text-sm text-muted-foreground">Lembrar-me neste dispositivo</span>
                </label>

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Entrar
                    </>
                  )}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground">Acesso rápido</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-xs text-muted-foreground text-center mb-3">
                    Use as credenciais de demonstração:
                  </p>
                  <div className="flex flex-col items-center gap-2">
                    <code className="text-sm bg-background px-3 py-1 rounded border border-border">
                      admin@tractus.com
                    </code>
                    <code className="text-sm bg-background px-3 py-1 rounded border border-border">
                      admin123
                    </code>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDemoLogin}
                    className="w-full mt-3"
                  >
                    Preencher automaticamente
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Ao entrar, você concorda com os{' '}
            <a href="#" className="text-primary hover:underline">Termos de Uso</a>
            {' '}e{' '}
            <a href="#" className="text-primary hover:underline">Política de Privacidade</a>
          </p>
        </div>
      </div>
    </div>
  )
}

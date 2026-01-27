import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Criar usuário admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tractus.com' },
    update: {},
    create: {
      email: 'admin@tractus.com',
      name: 'Administrador',
      password: 'admin123', // Em produção, usar hash
      role: 'ADMIN',
    },
  })
  console.log('✅ Admin criado:', admin.email)

  // Criar vendedores
  const rogerUser = await prisma.user.upsert({
    where: { email: 'roger@newtractor.com.br' },
    update: {},
    create: {
      email: 'roger@newtractor.com.br',
      name: 'Roger Fumega',
      password: '123456',
      role: 'COMERCIAL',
    },
  })

  const suelenUser = await prisma.user.upsert({
    where: { email: 'suelen@newtractor.com.br' },
    update: {},
    create: {
      email: 'suelen@newtractor.com.br',
      name: 'Suelen Cerqueira',
      password: '123456',
      role: 'COMERCIAL',
    },
  })

  const jovianoUser = await prisma.user.upsert({
    where: { email: 'joviano@newtractor.com.br' },
    update: {},
    create: {
      email: 'joviano@newtractor.com.br',
      name: 'Joviano Rodrigues',
      password: '123456',
      role: 'TECNICO',
    },
  })

  // Criar vendedores
  const roger = await prisma.vendedor.upsert({
    where: { userId: rogerUser.id },
    update: {},
    create: { userId: rogerUser.id },
  })

  const suelen = await prisma.vendedor.upsert({
    where: { userId: suelenUser.id },
    update: {},
    create: { userId: suelenUser.id },
  })

  const joviano = await prisma.vendedor.upsert({
    where: { userId: jovianoUser.id },
    update: {},
    create: { userId: jovianoUser.id },
  })

  console.log('✅ Vendedores criados')

  // Criar clientes
  const clientes = [
    { nome: 'ARMAC', cnpj: '12.345.678/0001-01', telefone: '(31) 99999-0001', email: 'contato@armac.com', contatoPrincipal: 'João Silva' },
    { nome: 'TSL Engenharia', cnpj: '23.456.789/0001-02', telefone: '(31) 99999-0002', email: 'contato@tsl.com', contatoPrincipal: 'Maria Santos' },
    { nome: 'Fagundes Terraplanagem', cnpj: '34.567.890/0001-03', telefone: '(31) 99999-0003', email: 'contato@fagundes.com', contatoPrincipal: 'Carlos Fagundes' },
    { nome: 'MRV Engenharia', cnpj: '45.678.901/0001-04', telefone: '(31) 99999-0004', email: 'contato@mrv.com', contatoPrincipal: 'Ana Paula' },
    { nome: 'Construtora Delta', cnpj: '56.789.012/0001-05', telefone: '(31) 99999-0005', email: 'contato@delta.com', contatoPrincipal: 'Pedro Lima' },
    { nome: 'IRMEN', cnpj: '67.890.123/0001-06', telefone: '(31) 99999-0006', email: 'contato@irmen.com', contatoPrincipal: 'Roberto Costa' },
    { nome: 'Suzano', cnpj: '78.901.234/0001-07', telefone: '(31) 99999-0007', email: 'contato@suzano.com', contatoPrincipal: 'Fernanda Lima' },
    { nome: 'Toniolo', cnpj: '89.012.345/0001-08', telefone: '(31) 99999-0008', email: 'contato@toniolo.com', contatoPrincipal: 'Marcos Silva' },
  ]

  for (const clienteData of clientes) {
    await prisma.cliente.upsert({
      where: { cnpj: clienteData.cnpj },
      update: {},
      create: {
        ...clienteData,
        vendedorId: roger.id,
        cidade: 'Belo Horizonte',
        estado: 'MG',
      },
    })
  }
  console.log('✅ Clientes criados')

  // Criar metas para os vendedores
  const mesAtual = new Date().getMonth() + 1
  const anoAtual = new Date().getFullYear()

  const metas = [
    { vendedorId: roger.id, mes: mesAtual, ano: anoAtual, categoria: 'RODANTE' as const, valorMeta: 200000 },
    { vendedorId: roger.id, mes: mesAtual, ano: anoAtual, categoria: 'PECA' as const, valorMeta: 50000 },
    { vendedorId: roger.id, mes: mesAtual, ano: anoAtual, categoria: 'CILINDRO' as const, valorMeta: 30000 },
    { vendedorId: suelen.id, mes: mesAtual, ano: anoAtual, categoria: 'RODANTE' as const, valorMeta: 150000 },
    { vendedorId: suelen.id, mes: mesAtual, ano: anoAtual, categoria: 'PECA' as const, valorMeta: 40000 },
    { vendedorId: joviano.id, mes: mesAtual, ano: anoAtual, categoria: 'RODANTE' as const, valorMeta: 100000 },
  ]

  for (const meta of metas) {
    await prisma.meta.upsert({
      where: {
        vendedorId_mes_ano_categoria: {
          vendedorId: meta.vendedorId,
          mes: meta.mes,
          ano: meta.ano,
          categoria: meta.categoria,
        },
      },
      update: { valorMeta: meta.valorMeta },
      create: meta,
    })
  }
  console.log('✅ Metas criadas')

  console.log('🎉 Seed concluído!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

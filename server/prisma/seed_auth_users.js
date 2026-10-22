import bcrypt from 'bcryptjs'
import prisma from '../src/config/db.js'

async function updateUsers() {
  const adminHash = await bcrypt.hash('Admin@123', 10)
  const agentHash = await bcrypt.hash('Agent@123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: { passwordHash: adminHash, role: 'ADMIN', name: 'Executive Administrator' },
    create: {
      email: 'admin@gmail.com',
      passwordHash: adminHash,
      name: 'Executive Administrator',
      role: 'ADMIN',
      phone: '+91 98200 45678',
      isActive: true,
    },
  })

  const agent = await prisma.user.upsert({
    where: { email: 'agent@gmail.com' },
    update: { passwordHash: agentHash, role: 'AGENT', name: 'Rajesh Kapoor (Agent)' },
    create: {
      email: 'agent@gmail.com',
      passwordHash: agentHash,
      name: 'Rajesh Kapoor (Agent)',
      role: 'AGENT',
      phone: '+91 98201 11223',
      isActive: true,
    },
  })

  console.log('SUCCESS: Seeded user admin@gmail.com and agent@gmail.com')
  console.log('Admin:', admin.email, 'Role:', admin.role)
  console.log('Agent:', agent.email, 'Role:', agent.role)
}

updateUsers()
  .catch((err) => {
    console.error('Error updating users:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

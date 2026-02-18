import { PrismaClient, Role, TransactionType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const username = 'admin';
  const email = 'admin@essensgruppe.de';
  const password = 'Admin1234!';

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });

  if (existing) {
    console.log('⚠️  Admin user already exists — updating role to ADMIN');
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: Role.ADMIN, status: 'ACTIVE' },
    });
    console.log(`✅ Role updated for user: ${existing.username}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      role: Role.ADMIN,
      balance: 1000,
      transactions: {
        create: {
          amount: 1000,
          type: TransactionType.INITIAL_BALANCE,
        },
      },
    },
  });

  console.log('✅ Admin user created!');
  console.log(`   Username : ${username}`);
  console.log(`   Email    : ${email}`);
  console.log(`   Password : ${password}`);
  console.log(`   Role     : ${user.role}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

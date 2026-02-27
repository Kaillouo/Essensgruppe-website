import { PrismaClient, Role, TransactionType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const username = 'admin';
  const email = 'chef@essensgruppe.de';
  const password = 'Admin1234!';

  // Upsert admin user
  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });

  if (existing) {
    console.log('⚠️  Admin user already exists — updating role, email and emailVerified');
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        email,
        role: Role.ADMIN,
        status: 'ACTIVE',
        emailVerified: true,
      },
    });
    console.log(`✅ Admin updated: ${existing.username}`);
  } else {
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        role: Role.ADMIN,
        status: 'ACTIVE',
        emailVerified: true,
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

  // Seed default app settings
  await prisma.appSetting.upsert({
    where: { key: 'REGISTRATION_OPEN' },
    update: {},
    create: { key: 'REGISTRATION_OPEN', value: 'true' },
  });

  console.log('✅ App settings seeded (REGISTRATION_OPEN = true)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

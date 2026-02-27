import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdmin() {
  const admin = await prisma.user.findFirst({
    where: { username: 'admin' }
  });
  
  if (admin) {
    console.log('Admin user found:');
    console.log(`  Username: ${admin.username}`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Role: ${admin.role}`);
    console.log(`  Status: ${admin.status}`);
    
    if (admin.status !== 'ACTIVE') {
      console.log('\n⚠️  Status is not ACTIVE. Updating to ACTIVE...');
      const updated = await prisma.user.update({
        where: { id: admin.id },
        data: { status: 'ACTIVE' }
      });
      console.log(`✅ Updated! New status: ${updated.status}`);
    } else {
      console.log('✅ Already ACTIVE and ready to login!');
    }
  } else {
    console.log('❌ Admin user not found');
  }
  
  await prisma.$disconnect();
}

checkAdmin();

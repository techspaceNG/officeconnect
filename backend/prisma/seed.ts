import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Check if any user exists
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    const hashedPassword = await argon2.hash('admin123');
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        fullName: 'System Administrator',
        role: Role.SUPER_ADMIN,
      },
    });
    console.log('Created initial Super Administrator user:', admin.username);
  } else {
    console.log('Database already has users. Skipping seed.');
  }

  // Create a default general chat channel
  const generalChannel = await prisma.channel.findFirst({
    where: { name: 'General Chat', isGroup: true },
  });

  if (!generalChannel) {
    const allUsers = await prisma.user.findMany({ select: { id: true } });
    await prisma.channel.create({
      data: {
        name: 'General Chat',
        isGroup: true,
        members: {
          connect: allUsers.map((u) => ({ id: u.id })),
        },
      },
    });
    console.log('Created default General Chat channel');
  }

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

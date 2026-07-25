import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Check if any user exists
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    const adminPassword = await argon2.hash('admin123');
    const directorPassword = await argon2.hash('director123');
    const staffPassword = await argon2.hash('aliyu123');

    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        password: adminPassword,
        fullName: 'System Administrator',
        role: Role.SUPER_ADMIN,
      },
    });

    const director = await prisma.user.create({
      data: {
        username: 'director',
        password: directorPassword,
        fullName: 'ICT Director (FCET Bichi)',
        role: Role.DIRECTOR,
      },
    });

    const staff = await prisma.user.create({
      data: {
        username: 'aliyu',
        password: staffPassword,
        fullName: 'Aliyu Mohammed',
        role: Role.STAFF,
      },
    });

    console.log('Created initial users: admin, director, aliyu');
  } else {
    console.log('Database already has users. Skipping user creation.');
  }

  // Create a default general chat channel
  const generalChannel = await prisma.channel.findFirst({
    where: { name: 'General Discussion', isGroup: true },
  });

  if (!generalChannel) {
    const allUsers = await prisma.user.findMany({ select: { id: true } });
    if (allUsers.length > 0) {
      await prisma.channel.create({
        data: {
          name: 'General Discussion',
          isGroup: true,
          members: {
            connect: allUsers.map((u) => ({ id: u.id })),
          },
        },
      });
      console.log('Created default General Discussion channel');
    }
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

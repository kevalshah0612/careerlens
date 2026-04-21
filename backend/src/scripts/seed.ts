import { prisma } from '../config/database';

async function seed() {
  console.log(' Seeding database...');

  // Create default tenant
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'default' },
    update: {},
    create: {
      name: 'Default Job Board',
      subdomain: 'default',
      config: {
        colors: {
          primary: '#3B82F6',
          secondary: '#8B5CF6',
        },
        features: {
          semanticSearch: true,
          h1bFilter: true,
        },
      },
    },
  });

  console.log(` Created tenant: ${tenant.name} (${tenant.id})`);

  // Create a few sample tenants for multi-tenant demo
  const universities = [
    { name: 'MIT Career Services', subdomain: 'mit' },
    { name: 'Stanford Job Board', subdomain: 'stanford' },
    { name: 'Berkeley Careers', subdomain: 'berkeley' },
  ];

  for (const uni of universities) {
    await prisma.tenant.upsert({
      where: { subdomain: uni.subdomain },
      update: {},
      create: {
        name: uni.name,
        subdomain: uni.subdomain,
        config: {},
      },
    });
    console.log(` Created tenant: ${uni.name}`);
  }

  console.log('\n Seeding complete!\n');
  console.log('Tenant IDs:');
  const tenants = await prisma.tenant.findMany();
  tenants.forEach(t => {
    console.log(`  ${t.name}: ${t.id}`);
  });
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

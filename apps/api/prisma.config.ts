import { defineConfig } from 'prisma/config';

const connectionString =
  'postgresql://hcelm_admin:hcelm_secure_2026@localhost:5432/hcelm_dev?schema=public';

export default defineConfig({
  datasource: {
    url: connectionString,
  },
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
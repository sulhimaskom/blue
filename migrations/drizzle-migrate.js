import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

const migrationSql = neon(process.env.DATABASE_URL);
const migrationDb = drizzle(migrationSql);

async function main() {
  console.log('🚀 Running Drizzle migrations...');

  try {
    await migrate(migrationDb, { migrationsFolder: './migrations/drizzle' });
    console.log('✅ Drizzle migrations completed successfully');
  } catch (error) {
    console.error('❌ Drizzle migration failed:', error);
    process.exit(1);
  }
}

main();

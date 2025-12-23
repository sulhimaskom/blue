import { sql } from "drizzle-orm";
import { db } from "./index";
import { logger } from "../logger";

type RLSVerificationResult = Record<string, unknown> & {
  rows?: Array<{ rowsecurity: boolean }>;
};

/**
 * Row Level Security (RLS) Policies for Multi-Tenant Data Isolation
 *
 * These policies ensure that users can only access their own data and maintain
 * proper data isolation in a multi-tenant environment.
 */

export async function enableRLS() {
  const database = db();

  try {
    // Enable RLS on all tables
    await database.execute(sql`ALTER TABLE users ENABLE ROW LEVEL SECURITY;`);
    await database.execute(
      sql`ALTER TABLE projects ENABLE ROW LEVEL SECURITY;`,
    );
    await database.execute(
      sql`ALTER TABLE blueprints ENABLE ROW LEVEL SECURITY;`,
    );
    await database.execute(
      sql`ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;`,
    );

    logger.info("RLS enabled on all tables");
    return true;
  } catch (error) {
    logger.error("Failed to enable RLS:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function createRLSPolicies() {
  const database = db();

  try {
    // Users table policies
    // Users can only read/update their own record
    await database.execute(sql`
      DROP POLICY IF EXISTS users_select_own ON users;
      CREATE POLICY users_select_own ON users
        FOR SELECT USING (clerk_id = current_setting('app.current_clerk_id', true));
    `);

    await database.execute(sql`
      DROP POLICY IF EXISTS users_update_own ON users;
      CREATE POLICY users_update_own ON users
        FOR UPDATE USING (clerk_id = current_setting('app.current_clerk_id', true));
    `);

    // Projects table policies
    // Users can only access their own projects
    await database.execute(sql`
      DROP POLICY IF EXISTS projects_select_own ON projects;
      CREATE POLICY projects_select_own ON projects
        FOR SELECT USING (owner_id = (
          SELECT id FROM users WHERE clerk_id = current_setting('app.current_clerk_id', true)
        ));
    `);

    await database.execute(sql`
      DROP POLICY IF EXISTS projects_insert_own ON projects;
      CREATE POLICY projects_insert_own ON projects
        FOR INSERT WITH CHECK (owner_id = (
          SELECT id FROM users WHERE clerk_id = current_setting('app.current_clerk_id', true)
        ));
    `);

    await database.execute(sql`
      DROP POLICY IF EXISTS projects_update_own ON projects;
      CREATE POLICY projects_update_own ON projects
        FOR UPDATE USING (owner_id = (
          SELECT id FROM users WHERE clerk_id = current_setting('app.current_clerk_id', true)
        ));
    `);

    await database.execute(sql`
      DROP POLICY IF EXISTS projects_delete_own ON projects;
      CREATE POLICY projects_delete_own ON projects
        FOR DELETE USING (owner_id = (
          SELECT id FROM users WHERE clerk_id = current_setting('app.current_clerk_id', true)
        ));
    `);

    // Blueprints table policies
    // Users can only access blueprints of their own projects
    await database.execute(sql`
      DROP POLICY IF EXISTS blueprints_select_own ON blueprints;
      CREATE POLICY blueprints_select_own ON blueprints
        FOR SELECT USING (project_id IN (
          SELECT id FROM projects WHERE owner_id = (
            SELECT id FROM users WHERE clerk_id = current_setting('app.current_clerk_id', true)
          )
        ));
    `);

    await database.execute(sql`
      DROP POLICY IF EXISTS blueprints_insert_own ON blueprints;
      CREATE POLICY blueprints_insert_own ON blueprints
        FOR INSERT WITH CHECK (project_id IN (
          SELECT id FROM projects WHERE owner_id = (
            SELECT id FROM users WHERE clerk_id = current_setting('app.current_clerk_id', true)
          )
        ));
    `);

    await database.execute(sql`
      DROP POLICY IF EXISTS blueprints_update_own ON blueprints;
      CREATE POLICY blueprints_update_own ON blueprints
        FOR UPDATE USING (project_id IN (
          SELECT id FROM projects WHERE owner_id = (
            SELECT id FROM users WHERE clerk_id = current_setting('app.current_clerk_id', true)
          )
        ));
    `);

    await database.execute(sql`
      DROP POLICY IF EXISTS blueprints_delete_own ON blueprints;
      CREATE POLICY blueprints_delete_own ON blueprints
        FOR DELETE USING (project_id IN (
          SELECT id FROM projects WHERE owner_id = (
            SELECT id FROM users WHERE clerk_id = current_setting('app.current_clerk_id', true)
          )
        ));
    `);

    // Transactions table policies
    // Users can only access their own transactions
    await database.execute(sql`
      DROP POLICY IF EXISTS transactions_select_own ON transactions;
      CREATE POLICY transactions_select_own ON transactions
        FOR SELECT USING (user_id = (
          SELECT id FROM users WHERE clerk_id = current_setting('app.current_clerk_id', true)
        ));
    `);

    await database.execute(sql`
      DROP POLICY IF EXISTS transactions_insert_own ON transactions;
      CREATE POLICY transactions_insert_own ON transactions
        FOR INSERT WITH CHECK (user_id = (
          SELECT id FROM users WHERE clerk_id = current_setting('app.current_clerk_id', true)
        ));
    `);

    logger.info("RLS policies created successfully");
    return true;
  } catch (error) {
    logger.error("Failed to create RLS policies:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Set the clerk_id context for RLS policies
 * This should be called at the beginning of each authenticated database session
 */
export async function setRLSContext(clerkId: string): Promise<void> {
  const database = db();

  try {
    await database.execute(sql`SET LOCAL app.current_clerk_id = ${clerkId};`);
  } catch (error) {
    logger.error("Failed to set RLS context:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Initialize RLS for the entire database
 * This should be run once during database setup
 */
export async function initializeRLS(): Promise<void> {
  try {
    await enableRLS();
    await createRLSPolicies();
    logger.info("RLS initialization completed successfully");
  } catch (error) {
    logger.error("RLS initialization failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Utility function to check if RLS is properly configured
 */
export async function verifyRLSConfiguration(): Promise<boolean> {
  const database = db();

  try {
    // Check if RLS is enabled on tables
    const usersRLS = await database.execute<RLSVerificationResult>(sql`
      SELECT rowsecurity FROM pg_tables WHERE tablename = 'users';
    `);

    const projectsRLS = await database.execute<RLSVerificationResult>(sql`
      SELECT rowsecurity FROM pg_tables WHERE tablename = 'projects';
    `);

    const blueprintsRLS = await database.execute<RLSVerificationResult>(sql`
      SELECT rowsecurity FROM pg_tables WHERE tablename = 'blueprints';
    `);

    const transactionsRLS = await database.execute<RLSVerificationResult>(sql`
      SELECT rowsecurity FROM pg_tables WHERE tablename = 'transactions';
    `);

    return (
      usersRLS.rows?.[0]?.rowsecurity === true &&
      projectsRLS.rows?.[0]?.rowsecurity === true &&
      blueprintsRLS.rows?.[0]?.rowsecurity === true &&
      transactionsRLS.rows?.[0]?.rowsecurity === true
    );
  } catch (error) {
    logger.error("Failed to verify RLS configuration:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

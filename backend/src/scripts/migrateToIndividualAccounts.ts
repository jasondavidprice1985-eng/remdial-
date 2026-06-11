/**
 * One-time migration: creates an admin account and deactivates
 * the shared manager/office accounts (if they exist).
 *
 * Usage:
 *   npx tsx backend/src/scripts/migrateToIndividualAccounts.ts
 *
 * Requires ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_DISPLAY_NAME env vars.
 * Set them in backend/.env or pass them inline.
 */
import dotenv from 'dotenv';
dotenv.config();
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

async function main(): Promise<void> {
  const connString = process.env.DATABASE_URL;
  if (!connString) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: connString });

  try {
    // 1. Apply schema migrations
    console.log('Applying schema migrations...');
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100) NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false`);
    await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
    await pool.query(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('manager','office','admin'))`);
    console.log('Schema migrations applied.');

    // 2. Create admin account
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_DISPLAY_NAME || 'Administrator';

    if (!adminPass || adminPass === 'admin') {
      console.warn('WARNING: ADMIN_PASSWORD not set or is still the default "admin".');
      console.warn('Please set a strong ADMIN_PASSWORD in backend/.env before running this script.');
      process.exit(1);
    }

    const existing = await pool.query('SELECT id FROM users WHERE username=$1', [adminUser]);
    if (existing.rowCount === 0) {
      const hash = await bcrypt.hash(adminPass, BCRYPT_ROUNDS);
      await pool.query(
        `INSERT INTO users (username, password_hash, display_name, role, active, must_change_password)
         VALUES ($1,$2,$3,'admin',true,false)`,
        [adminUser, hash, adminName]
      );
      console.log(`Created admin user: ${adminUser}`);
    } else {
      console.log(`Admin user '${adminUser}' already exists — skipping.`);
    }

    // 3. Deactivate shared accounts
    const shared = ['manager', 'office'];
    for (const name of shared) {
      const r = await pool.query('SELECT id FROM users WHERE username=$1 AND active=true', [name]);
      if (r.rowCount && r.rowCount > 0) {
        await pool.query('UPDATE users SET active=false WHERE username=$1', [name]);
        console.log(`Deactivated shared account: ${name}`);
      }
    }

    // 4. Print next steps
    console.log('\n=== Migration complete ===');
    console.log('Next steps:');
    console.log('  1. Create individual accounts for each team member:');
    console.log('     POST /api/v1/users  (admin-only, from the app or via API)');
    console.log('  2. Give each person their username + temporary password');
    console.log('  3. Each person signs in — they will be prompted to set their own password');
    console.log('  4. Verify in the users list that the shared accounts are deactivated');
    console.log('  5. Remove MANAGER_USERNAME, MANAGER_PASSWORD, OFFICE_USERNAME, OFFICE_PASSWORD from backend/.env');
    console.log('');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

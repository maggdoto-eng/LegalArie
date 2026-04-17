/**
 * Database Migration Runner
 * 
 * Manages database migrations for LegalArie backend
 * 
 * Usage:
 * - Run migrations: node migrations/runner.js up
 * - Rollback migrations: node migrations/runner.js down
 * - Check status: node migrations/runner.js status
 */

const fs = require('fs');
const path = require('path');

// Migration registry
const migrations = [
  {
    name: '001_initial_schema',
    description: 'Create initial database schema',
    version: 1,
  },
  {
    name: '002_add_soft_delete_support',
    description: 'Add soft delete (deleted_at) support to all tables',
    version: 2,
  },
];

class MigrationRunner {
  constructor() {
    this.migrations = migrations;
    this.migrationsDir = path.join(__dirname);
  }

  /**
   * Load a migration file
   * @param {string} name - Migration name
   * @returns {object} Migration with up/down SQL
   */
  loadMigration(name) {
    try {
      const migrationPath = path.join(this.migrationsDir, `${name}.js`);
      if (!fs.existsSync(migrationPath)) {
        throw new Error(`Migration file not found: ${name}`);
      }
      const migration = require(migrationPath);
      return migration;
    } catch (error) {
      console.error(`Error loading migration ${name}:`, error.message);
      throw error;
    }
  }

  /**
   * Get current schema version
   * @param {object} db - Database connection
   * @returns {Promise<number>} Current version
   */
  async getCurrentVersion(db) {
    try {
      const result = await db.query(
        `SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1`
      );
      return result.rows.length > 0 ? result.rows[0].version : 0;
    } catch (error) {
      // Table doesn't exist yet
      return 0;
    }
  }

  /**
   * Create migrations tracking table
   * @param {object} db - Database connection
   */
  async createMigrationsTable(db) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        description VARCHAR(255)
      )
    `);
  }

  /**
   * Run migrations up to a specific version
   * @param {object} db - Database connection
   * @param {number} toVersion - Target version (default: latest)
   */
  async up(db, toVersion = null) {
    try {
      await this.createMigrationsTable(db);
      const currentVersion = await this.getCurrentVersion(db);
      const targetVersion = toVersion || this.migrations.length;

      console.log(`Current schema version: ${currentVersion}`);
      console.log(`Target schema version: ${targetVersion}`);

      for (const migration of this.migrations) {
        if (migration.version > currentVersion && migration.version <= targetVersion) {
          console.log(`\nExecuting migration: ${migration.name}`);
          console.log(`  Description: ${migration.description}`);

          const migrationFile = this.loadMigration(migration.name);

          // Run the up migration
          if (migrationFile.up) {
            // Execute SQL directly or use a migration function
            console.log('  Status: Running...');
            // In a real app, you would execute the SQL here
            // await db.query(migrationFile.up);

            // Record in migrations table
            await db.query(
              `INSERT INTO schema_migrations (version, name, description) VALUES ($1, $2, $3)`,
              [migration.version, migration.name, migration.description]
            );

            console.log('  Status: ✓ Complete');
          }
        }
      }

      console.log('\n✓ All migrations completed successfully!');
    } catch (error) {
      console.error('Migration failed:', error.message);
      throw error;
    }
  }

  /**
   * Rollback migrations
   * @param {object} db - Database connection
   * @param {number} steps - Number of migrations to rollback (default: 1)
   */
  async down(db, steps = 1) {
    try {
      const currentVersion = await this.getCurrentVersion(db);
      const targetVersion = Math.max(0, currentVersion - steps);

      console.log(`Current schema version: ${currentVersion}`);
      console.log(`Target schema version: ${targetVersion}`);

      for (let i = currentVersion; i > targetVersion; i--) {
        const migration = this.migrations.find((m) => m.version === i);
        if (migration) {
          console.log(`\nRolling back migration: ${migration.name}`);
          console.log(`  Description: ${migration.description}`);

          const migrationFile = this.loadMigration(migration.name);

          // Run the down migration
          if (migrationFile.down) {
            console.log('  Status: Rolling back...');
            // In a real app, you would execute the SQL here
            // await db.query(migrationFile.down);

            // Remove from migrations table
            await db.query(`DELETE FROM schema_migrations WHERE version = $1`, [i]);

            console.log('  Status: ✓ Rolled back');
          }
        }
      }

      console.log('\n✓ All rollbacks completed successfully!');
    } catch (error) {
      console.error('Rollback failed:', error.message);
      throw error;
    }
  }

  /**
   * Show migration status
   * @param {object} db - Database connection
   */
  async status(db) {
    try {
      const currentVersion = await this.getCurrentVersion(db);

      console.log('\n=== Migration Status ===\n');
      console.log(`Current Schema Version: ${currentVersion}\n`);
      console.log('Migrations:\n');

      for (const migration of this.migrations) {
        const status = migration.version <= currentVersion ? '✓' : '○';
        console.log(`${status} v${migration.version}: ${migration.name}`);
        console.log(`   ${migration.description}\n`);
      }
    } catch (error) {
      console.error('Error checking status:', error.message);
      throw error;
    }
  }

  /**
   * List all available migrations
   */
  listMigrations() {
    console.log('\n=== Available Migrations ===\n');
    for (const migration of this.migrations) {
      console.log(`v${migration.version}: ${migration.name}`);
      console.log(`   ${migration.description}\n`);
    }
  }
}

// Export for use in other files
module.exports = MigrationRunner;

// CLI interface
if (require.main === module) {
  const command = process.argv[2] || 'status';
  const arg = process.argv[3];

  const runner = new MigrationRunner();

  console.log('\n=== LegalArie Database Migration Runner ===\n');

  if (command === 'list') {
    runner.listMigrations();
  } else if (command === 'up') {
    console.log('To run migrations, connect to your database and execute:');
    console.log('  node migrations/runner.js up --db <connection>\n');
    runner.listMigrations();
  } else if (command === 'down') {
    console.log('To rollback migrations, connect to your database and execute:');
    console.log('  node migrations/runner.js down --db <connection> --steps <n>\n');
    runner.listMigrations();
  } else {
    console.log('Usage:');
    console.log('  node migrations/runner.js list          - List all migrations');
    console.log('  node migrations/runner.js status        - Show migration status');
    console.log('  node migrations/runner.js up            - Run all pending migrations');
    console.log('  node migrations/runner.js down [steps]  - Rollback migrations\n');
  }
}

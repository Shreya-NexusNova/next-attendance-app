import { sql } from '@vercel/postgres';

// Vercel Postgres database operations
export class VercelDB {
  // Initialize database tables
  static async initializeDatabase() {
    try {
      console.log('🚀 Initializing Vercel Postgres database...');

      // Create users table
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'manager',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Create projects table
      await sql`
        CREATE TABLE IF NOT EXISTS projects (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE NOT NULL,
          description TEXT,
          status VARCHAR(50) DEFAULT 'ongoing',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Create contractors table
      await sql`
        CREATE TABLE IF NOT EXISTS contractors (
          id SERIAL PRIMARY KEY,
          project_id INTEGER NOT NULL,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
      `;

      // Create attendance table
      await sql`
        CREATE TABLE IF NOT EXISTS attendance (
          id SERIAL PRIMARY KEY,
          contractor_id INTEGER NOT NULL,
          project_id INTEGER NOT NULL,
          date DATE NOT NULL,
          status VARCHAR(50) NOT NULL,
          overtime_hours DECIMAL(4,2) DEFAULT 0,
          work_time VARCHAR(50),
          overtime_start_time TIME,
          overtime_end_time TIME,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          UNIQUE(contractor_id, date)
        )
      `;

      // Insert default admin user if not exists
      const existingAdmin = await sql`
        SELECT id FROM users WHERE email = 'admin@gmail.com'
      `;

      if (existingAdmin.rows.length === 0) {
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        await sql`
          INSERT INTO users (email, password, role) 
          VALUES ('admin@gmail.com', ${hashedPassword}, 'admin')
        `;
        console.log('✅ Default admin user created: admin@gmail.com / admin123');
      } else {
        console.log('✅ Admin user already exists');
      }

      console.log('✅ Vercel Postgres database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      throw error;
    }
  }

  // Get database status
  static async getDatabaseStatus() {
    try {
      const tables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;

      const tableNames = tables.rows.map(row => row.table_name);
      const tableDetails: Record<string, any> = {};

      for (const tableName of tableNames) {
        const columns = await sql`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = ${tableName}
        `;
        
        const count = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`;
        
        tableDetails[tableName] = {
          columns: columns.rows,
          rowCount: parseInt(count.rows[0].count)
        };
      }

      return {
        status: 'connected',
        database: 'vercel_postgres',
        tables: tableNames,
        tableDetails: tableDetails,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Database status check failed:', error);
      throw error;
    }
  }
}

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
  try {
    console.log('Setting up database...');
    
    // Create connection to MySQL server (without database)
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // Add your MySQL password here if you have one
    });

    // Create database if it doesn't exist
    await connection.query('CREATE DATABASE IF NOT EXISTS attendance_app');
    await connection.query('USE attendance_app');

    // Create tables
    console.log('Creating tables...');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'manager') DEFAULT 'manager',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        status ENUM('ongoing', 'completed', 'paused') DEFAULT 'ongoing',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS contractors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contractor_id INT NOT NULL,
        project_id INT NOT NULL,
        date DATE NOT NULL,
        status ENUM('present', 'absent') NOT NULL,
        overtime_hours DECIMAL(4,2) DEFAULT 0,
        work_time VARCHAR(50),
        overtime_start_time TIME,
        overtime_end_time TIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        UNIQUE KEY unique_attendance (contractor_id, date)
      )
    `);

    // Insert default admin user if not exists
    const [existingAdmin] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      ['admin@gmail.com']
    );

    if (!Array.isArray(existingAdmin) || existingAdmin.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await connection.query(
        'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
        ['admin@gmail.com', hashedPassword, 'admin']
      );
      console.log('✅ Default admin user created: admin@gmail.com / admin123');
    } else {
      console.log('✅ Admin user already exists');
    }

    await connection.end();
    console.log('✅ Database setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: npm run dev');
    console.log('2. Visit: http://localhost:3000');
    console.log('3. Login with: admin@gmail.com / admin123');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();

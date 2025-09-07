import { NextResponse } from 'next/server';
import pool from '@/lib/db';

interface TableInfo {
  [key: string]: {
    columns: unknown[];
    rowCount: number;
  };
}

interface DatabaseInfo {
  current_db: string;
}

export async function GET() {
  try {
    console.log('🔍 Checking database status...');
    
    // Test basic connection
    const connection = await pool.getConnection();
    
    // Get database info
    const [dbInfo] = await connection.query('SELECT DATABASE() as current_db');
    
    // Get list of tables
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = (tables as Record<string, unknown>[]).map(table => Object.values(table)[0] as string);
    
    // Get table details
    const tableDetails: TableInfo = {};
    for (const tableName of tableNames) {
      const [columns] = await connection.query(`DESCRIBE ${tableName}`);
      const [count] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      tableDetails[tableName] = {
        columns: columns as unknown[],
        rowCount: (count as { count: number }[])[0].count
      };
    }
    
    connection.release();
    
    return NextResponse.json({
      status: 'connected',
      database: (dbInfo as DatabaseInfo[])[0].current_db,
      tables: tableNames,
      tableDetails: tableDetails,
      timestamp: new Date().toISOString(),
      environment: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        database: process.env.DB_NAME
      }
    });
    
  } catch (error) {
    console.error('❌ Database status check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

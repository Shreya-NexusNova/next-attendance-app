import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db';

export async function GET() {
  try {
    console.log('🚀 Starting database initialization...');
    console.log('Environment check:');
    console.log('- DB_HOST:', process.env.DB_HOST ? '✅ Set' : '❌ Missing');
    console.log('- DB_USER:', process.env.DB_USER ? '✅ Set' : '❌ Missing');
    console.log('- DB_NAME:', process.env.DB_NAME ? '✅ Set' : '❌ Missing');
    console.log('- DB_PASSWORD:', process.env.DB_PASSWORD ? '✅ Set' : '❌ Missing');
    
    await initializeDatabase();
    
    return NextResponse.json({ 
      message: 'Database initialized successfully',
      timestamp: new Date().toISOString(),
      environment: {
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        user: process.env.DB_USER
      }
    });
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    return NextResponse.json(
      { 
        error: 'Database initialization failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}


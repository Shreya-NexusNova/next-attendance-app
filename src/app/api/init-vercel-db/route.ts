import { NextResponse } from 'next/server';
import { VercelDB } from '@/lib/db-vercel';

export async function GET() {
  try {
    console.log('🚀 Starting Vercel Postgres database initialization...');
    
    await VercelDB.initializeDatabase();
    
    return NextResponse.json({ 
      message: 'Vercel Postgres database initialized successfully',
      timestamp: new Date().toISOString(),
      database: 'vercel_postgres'
    });
  } catch (error) {
    console.error('❌ Vercel Postgres initialization error:', error);
    return NextResponse.json(
      { 
        error: 'Vercel Postgres initialization failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

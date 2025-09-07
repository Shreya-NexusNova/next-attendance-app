import { NextResponse } from 'next/server';
import { VercelDB } from '@/lib/db-vercel';

export async function GET() {
  try {
    console.log('🔍 Checking Vercel Postgres database status...');
    
    const status = await VercelDB.getDatabaseStatus();
    
    return NextResponse.json(status);
    
  } catch (error) {
    console.error('❌ Vercel Postgres status check failed:', error);
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

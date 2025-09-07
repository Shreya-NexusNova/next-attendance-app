import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db';

export async function GET() {
  try {
    console.log('🚀 Starting MongoDB database initialization...');
    console.log('Environment check:');
    console.log('- MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing');
    console.log('- MONGODB_DB:', process.env.MONGODB_DB ? '✅ Set' : '❌ Missing');
    
    await initializeDatabase();
    
    return NextResponse.json({ 
      message: 'MongoDB database initialized successfully',
      timestamp: new Date().toISOString(),
      environment: {
        uri: process.env.MONGODB_URI ? 'Set' : 'Missing',
        database: process.env.MONGODB_DB || 'attendance_app'
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


import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

interface CollectionInfo {
  [key: string]: {
    indexes: unknown[];
    documentCount: number;
  };
}

export async function GET() {
  try {
    console.log('🔍 Checking MongoDB database status...');
    
    // Test basic connection
    const db = await getDatabase();
    
    // Get database name
    const dbName = db.databaseName;
    
    // Get list of collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);
    
    // Get collection details
    const collectionDetails: CollectionInfo = {};
    for (const collectionName of collectionNames) {
      const collection = db.collection(collectionName);
      const indexes = await collection.indexes();
      const documentCount = await collection.countDocuments();
      
      collectionDetails[collectionName] = {
        indexes: indexes,
        documentCount: documentCount
      };
    }
    
    return NextResponse.json({
      status: 'connected',
      database: dbName,
      collections: collectionNames,
      collectionDetails: collectionDetails,
      timestamp: new Date().toISOString(),
      environment: {
        uri: process.env.MONGODB_URI ? 'Set' : 'Missing',
        database: process.env.MONGODB_DB || 'attendance_app'
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

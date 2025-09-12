import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { verifyTokenEdge } from '@/lib/auth-edge';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyTokenEdge(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const db = await getDatabase();
    
    // Get all contractors with string project_id
    const contractors = await db.collection('contractors').find({}).toArray();
    
    let updatedCount = 0;
    const errors: Array<{ contractor_id: ObjectId; project_id: string | ObjectId; error: string }> = [];
    
    for (const contractor of contractors) {
      try {
        // Check if project_id is a string
        if (typeof contractor.project_id === 'string') {
          // Convert string to ObjectId
          const objectId = new ObjectId(contractor.project_id);
          
          // Update the contractor
          await db.collection('contractors').updateOne(
            { _id: contractor._id },
            { $set: { project_id: objectId } }
          );
          
          updatedCount++;
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({
          contractor_id: contractor._id,
          project_id: contractor.project_id,
          error: errorMessage
        });
      }
    }
    
    return NextResponse.json({
      message: 'Migration completed',
      updatedCount,
      errors,
      totalContractors: contractors.length
    });
  } catch (error) {
    console.error('Error migrating contractors:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

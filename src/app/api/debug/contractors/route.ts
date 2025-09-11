import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { verifyTokenEdge } from '@/lib/auth-edge';

export async function GET(request: NextRequest) {
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
    
    // Get all contractors to see their structure
    const contractors = await db.collection('contractors').find({}).toArray();
    
    // Get all projects to see their IDs
    const projects = await db.collection('projects').find({}).toArray();
    
    return NextResponse.json({ 
      contractors: contractors.map(c => ({
        _id: c._id,
        project_id: c.project_id,
        project_id_type: typeof c.project_id,
        name: c.name
      })),
      projects: projects.map(p => ({
        _id: p._id,
        name: p.name
      }))
    });
  } catch (error) {
    console.error('Error debugging contractors:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

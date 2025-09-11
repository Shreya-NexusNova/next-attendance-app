import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { verifyTokenEdge } from '@/lib/auth-edge';
import { Contractor } from '@/types/database';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyTokenEdge(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id: projectId } = await params;

    const db = await getDatabase();

    // Try both ObjectId and string project_id to handle existing data
    let contractors = await db.collection('contractors')
      .find({ project_id: new ObjectId(projectId) })
      .sort({ name: 1 })
      .toArray();
    
    // If no contractors found with ObjectId, try with string
    if (contractors.length === 0) {
      contractors = await db.collection('contractors')
        .find({ project_id: projectId })
        .sort({ name: 1 })
        .toArray();
    }

    return NextResponse.json({ contractors });
  } catch (error) {
    console.error('Error fetching contractors:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyTokenEdge(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { name, email, phone } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Contractor name is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    const contractorData = {
      project_id: new ObjectId(projectId),
      name,
      email,
      phone,
      created_at: new Date()
    };

    const result = await db.collection('contractors').insertOne(contractorData);

    // Fetch the created contractor
    const contractor = await db.collection('contractors').findOne({ _id: result.insertedId }) as unknown as Contractor;

    return NextResponse.json(
      { message: 'Contractor added successfully', contractor },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding contractor:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

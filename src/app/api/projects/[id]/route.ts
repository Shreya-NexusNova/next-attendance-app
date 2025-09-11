import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { verifyTokenEdge } from '@/lib/auth-edge';
import { Project } from '@/types/database';
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

    // Get project details
    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) }) as unknown as Project;
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get contractors for this project - try both ObjectId and string
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

    return NextResponse.json({
      project,
      contractors
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const { name, description, status } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      { 
        $set: { 
          name, 
          description, 
          status,
          updated_at: new Date()
        } 
      }
    );

    // Fetch updated project
    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) }) as unknown as Project;

    return NextResponse.json({
      message: 'Project updated successfully',
      project
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await db.collection('projects').deleteOne({ _id: new ObjectId(projectId) });

    return NextResponse.json({
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

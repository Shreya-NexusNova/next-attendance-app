import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyTokenEdge } from '@/lib/auth-edge';

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

    // Get project details
    const [projectRows] = await pool.execute(
      'SELECT * FROM projects WHERE id = ?',
      [projectId]
    );

    const projects = projectRows as any[];
    if (projects.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get contractors for this project
    const [contractorRows] = await pool.execute(
      'SELECT * FROM contractors WHERE project_id = ? ORDER BY name',
      [projectId]
    );

    return NextResponse.json({
      project: projects[0],
      contractors: contractorRows
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

    await pool.execute(
      'UPDATE projects SET name = ?, description = ?, status = ? WHERE id = ?',
      [name, description, status, projectId]
    );

    // Fetch updated project
    const [rows] = await pool.execute(
      'SELECT * FROM projects WHERE id = ?',
      [projectId]
    );

    return NextResponse.json({
      message: 'Project updated successfully',
      project: (rows as any[])[0]
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

    await pool.execute('DELETE FROM projects WHERE id = ?', [projectId]);

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

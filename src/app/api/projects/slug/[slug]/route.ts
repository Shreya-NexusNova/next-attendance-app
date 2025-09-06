import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyTokenEdge } from '@/lib/auth-edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
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

    const { slug } = await params;

    // Get project details by slug
    const [projectRows] = await pool.execute(
      'SELECT * FROM projects WHERE slug = ?',
      [slug]
    );

    const projects = projectRows as any[];
    if (projects.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const project = projects[0];

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Error fetching project by slug:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


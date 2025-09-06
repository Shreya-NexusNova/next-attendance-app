import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyTokenEdge } from '@/lib/auth-edge';
import { generateSlug } from '@/lib/slug';

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

    const [rows] = await pool.execute(
      'SELECT p.*, COUNT(c.id) as contractor_count FROM projects p LEFT JOIN contractors c ON p.id = c.project_id GROUP BY p.id ORDER BY p.created_at DESC'
    );

    return NextResponse.json({ projects: rows });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const { name, description, status = 'ongoing' } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    // Generate slug from project name
    let slug = generateSlug(name);
    
    // Ensure slug is unique
    let counter = 1;
    while (true) {
      const [existing] = await pool.execute(
        'SELECT id FROM projects WHERE slug = ?',
        [slug]
      );
      
      if (existing.length === 0) {
        break;
      }
      
      slug = `${generateSlug(name)}-${counter}`;
      counter++;
    }

    const [result] = await pool.execute(
      'INSERT INTO projects (name, slug, description, status) VALUES (?, ?, ?, ?)',
      [name, slug, description, status]
    );

    const insertResult = result as any;
    const projectId = insertResult.insertId;

    // Fetch the created project
    const [rows] = await pool.execute(
      'SELECT * FROM projects WHERE id = ?',
      [projectId]
    );

    return NextResponse.json(
      { message: 'Project created successfully', project: (rows as any[])[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

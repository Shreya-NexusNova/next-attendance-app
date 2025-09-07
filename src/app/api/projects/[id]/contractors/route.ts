import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyTokenEdge } from '@/lib/auth-edge';
import { Contractor, DatabaseResult } from '@/types/database';

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

    const [rows] = await pool.execute(
      'SELECT * FROM contractors WHERE project_id = ? ORDER BY name',
      [projectId]
    );

    return NextResponse.json({ contractors: rows });
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

    const [result] = await pool.execute(
      'INSERT INTO contractors (project_id, name, email, phone) VALUES (?, ?, ?, ?)',
      [projectId, name, email, phone]
    );

    const insertResult = result as DatabaseResult;
    const contractorId = insertResult.insertId;

    // Fetch the created contractor
    const [rows] = await pool.execute(
      'SELECT * FROM contractors WHERE id = ?',
      [contractorId]
    );

    return NextResponse.json(
      { message: 'Contractor added successfully', contractor: (rows as Contractor[])[0] },
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

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyTokenEdge } from '@/lib/auth-edge';

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

    const { id: contractorId } = await params;
    const { name, email, phone } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Contractor name is required' },
        { status: 400 }
      );
    }

    await pool.execute(
      'UPDATE contractors SET name = ?, email = ?, phone = ? WHERE id = ?',
      [name, email, phone, contractorId]
    );

    // Fetch updated contractor
    const [rows] = await pool.execute(
      'SELECT * FROM contractors WHERE id = ?',
      [contractorId]
    );

    return NextResponse.json({
      message: 'Contractor updated successfully',
      contractor: (rows as any[])[0]
    });
  } catch (error) {
    console.error('Error updating contractor:', error);
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

    const { id: contractorId } = await params;

    await pool.execute('DELETE FROM contractors WHERE id = ?', [contractorId]);

    return NextResponse.json({
      message: 'Contractor deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting contractor:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyTokenEdge } from '@/lib/auth-edge';
import { Contractor, AttendanceRecord } from '@/types/database';

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

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const date = searchParams.get('date');

    if (!projectId || !date) {
      return NextResponse.json(
        { error: 'Project ID and date are required' },
        { status: 400 }
      );
    }

    // Get contractors for the project
    const [contractors] = await pool.execute(
      'SELECT * FROM contractors WHERE project_id = ? ORDER BY name',
      [projectId]
    );

    // Get attendance records for the date
    const [attendance] = await pool.execute(
      `SELECT a.*, c.name as contractor_name 
       FROM attendance a 
       JOIN contractors c ON a.contractor_id = c.id 
       WHERE a.project_id = ? AND a.date = ?`,
      [projectId, date]
    );

    // Create a map of attendance records by contractor_id
    const attendanceMap = new Map();
    (attendance as AttendanceRecord[]).forEach(record => {
      attendanceMap.set(record.contractor_id, record);
    });

    // Combine contractors with their attendance records
    const result = (contractors as Contractor[]).map(contractor => ({
      contractor,
      attendance: attendanceMap.get(contractor.id) || null
    }));

    return NextResponse.json({ attendance: result });
  } catch (error) {
    console.error('Error fetching attendance:', error);
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

    const { projectId, date, attendanceRecords } = await request.json();

    if (!projectId || !date || !attendanceRecords) {
      return NextResponse.json(
        { error: 'Project ID, date, and attendance records are required' },
        { status: 400 }
      );
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Delete existing attendance records for this date and project
      await connection.execute(
        'DELETE FROM attendance WHERE project_id = ? AND date = ?',
        [projectId, date]
      );

      // Insert new attendance records
      for (const record of attendanceRecords) {
        if (record.contractorId && record.status) {
          await connection.execute(
            `INSERT INTO attendance (contractor_id, project_id, date, status, overtime_hours, work_time) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              record.contractorId,
              projectId,
              date,
              record.status,
              record.overtimeHours || 0,
              record.workTime || null
            ]
          );
        }
      }

      await connection.commit();
      return NextResponse.json({ message: 'Attendance saved successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error saving attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

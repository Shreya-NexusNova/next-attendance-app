import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { DatabaseResult } from '@/types/database';

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { contractorId, projectId, date, startTime, endTime } = await request.json();

    if (!contractorId || !projectId || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Calculate overtime hours
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    // Handle case where end time is next day (e.g., 23:00 to 01:00)
    if (end < start) {
      end.setDate(end.getDate() + 1);
    }
    
    const diffMs = end.getTime() - start.getTime();
    const overtimeHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places

    // Update attendance record with overtime times and calculated hours
    const [result] = await pool.execute(
      `UPDATE attendance 
       SET overtime_start_time = ?, overtime_end_time = ?, overtime_hours = ?
       WHERE contractor_id = ? AND project_id = ? AND date = ?`,
      [startTime, endTime, overtimeHours, contractorId, projectId, date]
    );

    if ((result as DatabaseResult).affectedRows === 0) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      overtimeHours,
      message: 'Overtime updated successfully' 
    });

  } catch (error) {
    console.error('Error updating overtime:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

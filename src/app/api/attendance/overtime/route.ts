import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { verifyTokenEdge } from '@/lib/auth-edge';
import { ObjectId } from 'mongodb';

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyTokenEdge(token);
    if (!user) {
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

    const db = await getDatabase();

    // Update attendance record with overtime times and calculated hours
    const result = await db.collection('attendance').updateOne(
      { 
        contractor_id: new ObjectId(contractorId), 
        project_id: new ObjectId(projectId), 
        date: date 
      },
      { 
        $set: { 
          overtime_start_time: startTime, 
          overtime_end_time: endTime, 
          overtime_hours: overtimeHours,
          updated_at: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
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

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getClient } from '@/lib/db';
import { verifyTokenEdge } from '@/lib/auth-edge';
import { Contractor, AttendanceRecord } from '@/types/database';
import { ObjectId } from 'mongodb';

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

    const db = await getDatabase();

    // Get contractors for the project
    const contractors = await db.collection('contractors')
      .find({ project_id: projectId })
      .sort({ name: 1 })
      .toArray() as unknown as Contractor[];

    // Get attendance records for the date
    const attendance = await db.collection('attendance')
      .aggregate([
        {
          $match: {
            project_id: projectId,
            date: date
          }
        },
        {
          $lookup: {
            from: 'contractors',
            localField: 'contractor_id',
            foreignField: '_id',
            as: 'contractor'
          }
        },
        {
          $unwind: '$contractor'
        },
        {
          $addFields: {
            contractor_name: '$contractor.name'
          }
        }
      ])
      .toArray() as unknown as AttendanceRecord[];

    // Create a map of attendance records by contractor_id
    const attendanceMap = new Map();
    attendance.forEach(record => {
      attendanceMap.set(record.contractor_id.toString(), record);
    });

    // Combine contractors with their attendance records
    const result = contractors.map(contractor => ({
      contractor,
      attendance: attendanceMap.get(contractor._id?.toString()) || null
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

    const db = await getDatabase();
    const client = await getClient();

    // Start a session for transaction
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        // Delete existing attendance records for this date and project
        await db.collection('attendance').deleteMany(
          { project_id: projectId, date: date },
          { session }
        );

        // Insert new attendance records
        const recordsToInsert = [];
        for (const record of attendanceRecords) {
          if (record.contractorId && record.status) {
            recordsToInsert.push({
              contractor_id: new ObjectId(record.contractorId),
              project_id: projectId,
              date: date,
              status: record.status,
              overtime_hours: record.overtimeHours || 0,
              work_time: record.workTime || null,
              created_at: new Date(),
              updated_at: new Date()
            });
          }
        }

        if (recordsToInsert.length > 0) {
          await db.collection('attendance').insertMany(recordsToInsert, { session });
        }
      });

      return NextResponse.json({ message: 'Attendance saved successfully' });
    } catch (error) {
      throw error;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error('Error saving attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

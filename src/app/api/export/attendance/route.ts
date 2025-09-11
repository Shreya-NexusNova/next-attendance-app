import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { verifyTokenEdge } from '@/lib/auth-edge';
import * as XLSX from 'xlsx';
import { Project, Contractor, AttendanceRecord } from '@/types/database';
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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!projectId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Project ID, start date, and end date are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Get project details
    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) }) as unknown as Project;
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get contractors for the project - try both ObjectId and string
    let contractors = await db.collection('contractors')
      .find({ project_id: new ObjectId(projectId) })
      .sort({ name: 1 })
      .toArray() as unknown as Contractor[];
    
    // If no contractors found with ObjectId, try with string
    if (contractors.length === 0) {
      contractors = await db.collection('contractors')
        .find({ project_id: projectId })
        .sort({ name: 1 })
        .toArray() as unknown as Contractor[];
    }

    // Get attendance records for the date range
    const attendance = await db.collection('attendance')
      .aggregate([
        {
          $match: {
            project_id: new ObjectId(projectId),
            date: { $gte: startDate, $lte: endDate }
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
        },
        {
          $sort: { date: 1, 'contractor.name': 1 }
        }
      ])
      .toArray() as unknown as AttendanceRecord[];

    // Generate date range to include all days in the range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0]);
    }

    // Create attendance matrix with requested data
    const attendanceMatrix = (contractors as Contractor[]).map(contractor => {
      // Get attendance records for this contractor
      const contractorAttendanceRecords = (attendance as AttendanceRecord[]).filter(
        record => record.contractor_id.toString() === contractor._id?.toString()
      );

      // Calculate totals
      const presentDays = contractorAttendanceRecords.filter(
        record => record.status === 'present'
      ).length;

      const totalOvertimeHours = contractorAttendanceRecords.reduce((total, record) => {
        return total + (record.overtime_hours || 0);
      }, 0);

      // Get overtime start and end times (from the most recent record with overtime)
      const latestRecord = contractorAttendanceRecords
        .filter(record => record.overtime_hours > 0)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      const overtimeStartTime = latestRecord?.overtime_start_time || '';
      const overtimeEndTime = latestRecord?.overtime_end_time || '';

      const contractorData = {
        'Name': contractor.name,
        'Email': contractor.email || '',
        'Phone': contractor.phone || '',
        'Present or Absent': presentDays > 0 ? 'Present' : 'Absent',
        'Total Overtime Hours': totalOvertimeHours,
        'Overtime Start Time': overtimeStartTime,
        'Overtime End Time': overtimeEndTime
      };

      return contractorData;
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Add date information to the attendance matrix
    const attendanceMatrixWithDate = [
      ['Project Name', project.name],
      ['Export Date', startDate],
      ['Total Contractors', (contractors as Contractor[]).length],
      ['', ''], // Empty row for spacing
      ['Name', 'Email', 'Phone', 'Present or Absent', 'Total Overtime Hours', 'Overtime Start Time', 'Overtime End Time'], // Header row
      ...attendanceMatrix.map(item => [
        item['Name'],
        item['Email'],
        item['Phone'],
        item['Present or Absent'],
        item['Total Overtime Hours'],
        item['Overtime Start Time'],
        item['Overtime End Time']
      ])
    ];

    // Create main attendance sheet
    const attendanceSheet = XLSX.utils.aoa_to_sheet(attendanceMatrixWithDate);
    XLSX.utils.book_append_sheet(workbook, attendanceSheet, 'Attendance');

    // Create summary sheet
    const summaryData = [
      ['Project Name', project.name],
      ['Project Description', project.description || ''],
      ['Export Date', startDate], // Use the selected date instead of range
      ['Total Contractors', (contractors as Contractor[]).length],
      ['Export Generated', new Date().toISOString().split('T')[0]],
      ['', ''],
      ['Contractor Summary', ''],
      ['Name', 'Email', 'Phone', 'Present or Absent', 'Total Overtime Hours', 'Overtime Start Time', 'Overtime End Time']
    ];

    (contractors as Contractor[]).forEach(contractor => {
      const contractorAttendanceRecords = (attendance as AttendanceRecord[]).filter(
        record => record.contractor_id.toString() === contractor._id?.toString()
      );

      const presentDays = contractorAttendanceRecords.filter(
        record => record.status === 'present'
      ).length;

      const totalOvertimeHours = contractorAttendanceRecords.reduce((total, record) => {
        return total + (record.overtime_hours || 0);
      }, 0);

      const latestRecord = contractorAttendanceRecords
        .filter(record => record.overtime_hours > 0)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      const overtimeStartTime = latestRecord?.overtime_start_time || '';
      const overtimeEndTime = latestRecord?.overtime_end_time || '';

      summaryData.push([
        contractor.name,
        contractor.email || '',
        contractor.phone || '',
        presentDays > 0 ? 'Present' : 'Absent',
        totalOvertimeHours,
        overtimeStartTime,
        overtimeEndTime
      ]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Create response with Excel file
    const response = new NextResponse(excelBuffer);
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.headers.set('Content-Disposition', `attachment; filename="${project.name.replace(/[^a-z0-9]/gi, '_')}_attendance_${startDate}.xlsx"`);

    return response;
  } catch (error) {
    console.error('Error exporting attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

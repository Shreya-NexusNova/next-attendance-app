import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyTokenEdge } from '@/lib/auth-edge';
import * as XLSX from 'xlsx';

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

    const project = projects[0];

    // Get contractors for the project
    const [contractors] = await pool.execute(
      'SELECT * FROM contractors WHERE project_id = ? ORDER BY name',
      [projectId]
    );

    // Get attendance records for the date range
    const [attendance] = await pool.execute(
      `SELECT a.*, c.name as contractor_name 
       FROM attendance a 
       JOIN contractors c ON a.contractor_id = c.id 
       WHERE a.project_id = ? AND a.date BETWEEN ? AND ?
       ORDER BY a.date, c.name`,
      [projectId, startDate, endDate]
    );

    // Generate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0]);
    }

    // Create attendance matrix with requested data
    const attendanceMatrix = (contractors as any[]).map(contractor => {
      // Get attendance records for this contractor
      const contractorAttendanceRecords = (attendance as any[]).filter(
        record => record.contractor_id === contractor.id
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
      ['Total Contractors', (contractors as any[]).length],
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
      ['Total Contractors', (contractors as any[]).length],
      ['Export Generated', new Date().toISOString().split('T')[0]],
      ['', ''],
      ['Contractor Summary', ''],
      ['Name', 'Email', 'Phone', 'Present or Absent', 'Total Overtime Hours', 'Overtime Start Time', 'Overtime End Time']
    ];

    (contractors as any[]).forEach(contractor => {
      const contractorAttendanceRecords = (attendance as any[]).filter(
        record => record.contractor_id === contractor.id
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

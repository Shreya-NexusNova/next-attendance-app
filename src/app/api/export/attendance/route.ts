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

    // Create attendance matrix
    const attendanceMatrix = (contractors as any[]).map(contractor => {
      const contractorAttendance: any = {
        'Contractor Name': contractor.name,
        'Email': contractor.email || '',
        'Phone': contractor.phone || ''
      };

      // Initialize all dates as absent
      dates.forEach(date => {
        contractorAttendance[date] = 'Absent';
      });

      // Fill in actual attendance
      (attendance as any[]).forEach(record => {
        if (record.contractor_id === contractor.id) {
          const dateStr = record.date;
          if (dates.includes(dateStr)) {
            if (record.status === 'present') {
              contractorAttendance[dateStr] = record.work_time || 'Present';
            } else {
              contractorAttendance[dateStr] = 'Absent';
            }
          }
        }
      });

      // Calculate totals
      const presentDays = (attendance as any[]).filter(
        record => record.contractor_id === contractor.id && record.status === 'present'
      ).length;

      const overtimeHours = (attendance as any[]).reduce((total, record) => {
        if (record.contractor_id === contractor.id) {
          return total + (record.overtime_hours || 0);
        }
        return total;
      }, 0);

      contractorAttendance['Total Present Days'] = presentDays;
      contractorAttendance['Total Overtime Hours'] = overtimeHours;
      contractorAttendance['Total Including Overtime'] = presentDays + overtimeHours;

      return contractorAttendance;
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Create main attendance sheet
    const attendanceSheet = XLSX.utils.json_to_sheet(attendanceMatrix);
    XLSX.utils.book_append_sheet(workbook, attendanceSheet, 'Attendance');

    // Create summary sheet
    const summaryData = [
      ['Project Name', project.name],
      ['Project Description', project.description || ''],
      ['Export Date Range', `${startDate} to ${endDate}`],
      ['Total Contractors', contractors.length],
      ['Export Date', new Date().toISOString().split('T')[0]],
      ['', ''],
      ['Contractor Summary', ''],
      ['Name', 'Total Present Days', 'Total Overtime Hours', 'Total Including Overtime']
    ];

    (contractors as any[]).forEach(contractor => {
      const presentDays = (attendance as any[]).filter(
        record => record.contractor_id === contractor.id && record.status === 'present'
      ).length;

      const overtimeHours = (attendance as any[]).reduce((total, record) => {
        if (record.contractor_id === contractor.id) {
          return total + (record.overtime_hours || 0);
        }
        return total;
      }, 0);

      summaryData.push([
        contractor.name,
        presentDays,
        overtimeHours,
        presentDays + overtimeHours
      ]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Create response with Excel file
    const response = new NextResponse(excelBuffer);
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.headers.set('Content-Disposition', `attachment; filename="${project.name.replace(/[^a-z0-9]/gi, '_')}_attendance_${startDate}_to_${endDate}.xlsx"`);

    return response;
  } catch (error) {
    console.error('Error exporting attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

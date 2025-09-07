export interface Project {
  id: number;
  name: string;
  slug: string;
  description: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface Contractor {
  id: number;
  project_id: number;
  name: string;
  email: string;
  phone: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: number;
  contractor_id: number;
  project_id: number;
  date: string;
  status: string;
  overtime_hours: number;
  work_time: string | null;
  overtime_start_time: string | null;
  overtime_end_time: string | null;
  created_at: string;
  updated_at: string;
  contractor_name?: string;
}

export interface User {
  id: number;
  email: string;
  password: string;
  role: 'admin' | 'manager' | string;
  created_at: string;
}

export interface DatabaseResult {
  insertId?: number;
  affectedRows?: number;
  changedRows?: number;
}

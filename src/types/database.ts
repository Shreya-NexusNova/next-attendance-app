export interface Project {
  _id?: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  created_at: Date;
  updated_at?: Date;
}

export interface Contractor {
  _id?: string;
  project_id: string;
  name: string;
  email: string;
  phone: string;
  created_at: Date;
}

export interface AttendanceRecord {
  _id?: string;
  contractor_id: string;
  project_id: string;
  date: string;
  status: string;
  overtime_hours: number;
  work_time: string | null;
  overtime_start_time: string | null;
  overtime_end_time: string | null;
  created_at: Date;
  updated_at: Date;
  contractor_name?: string;
}

export interface User {
  _id?: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | string;
  created_at: Date;
}

export interface DatabaseResult {
  insertedId?: string;
  modifiedCount?: number;
  matchedCount?: number;
  acknowledged?: boolean;
}

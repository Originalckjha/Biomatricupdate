export interface Employee {
  id: string;
  name: string;
  department?: string;
  card?: string;
}

export type PunchType = 'IN' | 'OUT' | 'CHECK' | 'UNKNOWN';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  timestamp: string;
  punchType: PunchType;
  verifyType?: string;
  deviceSN?: string;
}

export interface DashboardStats {
  total: number;
  in: number;
  out: number;
}

export interface Config {
  mode: 'push' | 'pull';
  pullUrl?: string;
  pollInterval?: number;
}

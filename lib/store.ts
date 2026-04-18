import type { AttendanceRecord, Employee, DashboardStats } from './types';

interface Store {
  records: AttendanceRecord[];
  employees: Map<string, Employee>;
  lastUpdated: number;
}

function getStore(): Store {
  const g = globalThis as Record<string, unknown>;
  if (!g.__bioStore) {
    g.__bioStore = {
      records: [] as AttendanceRecord[],
      employees: new Map<string, Employee>(),
      lastUpdated: Date.now(),
    };
  }
  return g.__bioStore as Store;
}

export function addRecord(record: AttendanceRecord): void {
  const store = getStore();
  const key = `${record.employeeId}-${record.timestamp}`;
  if (store.records.some(r => `${r.employeeId}-${r.timestamp}` === key)) return;
  store.records.unshift(record);
  if (store.records.length > 500) store.records = store.records.slice(0, 500);
  store.lastUpdated = Date.now();
}

export function addEmployee(employee: Employee): void {
  getStore().employees.set(employee.id, employee);
}

export function getEmployee(id: string): Employee | undefined {
  return getStore().employees.get(id);
}

export function getRecords(limit = 100, since?: number): AttendanceRecord[] {
  const store = getStore();
  if (since) {
    return store.records
      .filter(r => new Date(r.timestamp).getTime() > since)
      .slice(0, limit);
  }
  return store.records.slice(0, limit);
}

export function getStats(): DashboardStats {
  const store = getStore();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayRecords = store.records.filter(r => new Date(r.timestamp) >= today);
  return {
    total: todayRecords.length,
    in: todayRecords.filter(r => r.punchType === 'IN').length,
    out: todayRecords.filter(r => r.punchType === 'OUT').length,
  };
}

export function getLastUpdated(): number {
  return getStore().lastUpdated;
}

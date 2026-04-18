import type { Employee, AttendanceRecord, PunchType } from './types';

function parsePunchType(status: number): PunchType {
  switch (status) {
    case 0: return 'IN';
    case 1: return 'OUT';
    case 2:
    case 3: return 'CHECK';
    case 4: return 'IN';
    case 5: return 'OUT';
    default: return 'UNKNOWN';
  }
}

function parseZKDateTime(dt: string): string {
  try {
    return new Date(dt.replace(' ', 'T')).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

// ATTLOG format: PIN\tDATETIME\tSTATUS\tVERIFY\tWORKCODE
export function parseAttendanceLog(
  data: string,
  deviceSN?: string
): Partial<AttendanceRecord>[] {
  return data
    .trim()
    .split('\n')
    .flatMap(line => {
      const parts = line.trim().split('\t');
      if (parts.length < 2) return [];
      const [pin, datetime, status, verify] = parts;
      return [{
        employeeId: pin?.trim(),
        timestamp: parseZKDateTime(datetime?.trim() || ''),
        punchType: parsePunchType(parseInt(status || '0', 10)),
        verifyType: verify?.trim(),
        deviceSN,
      }];
    });
}

// USERTABLE format: PIN\tName\tPrimary\tPrivilege\tPassword\tCard\t...
export function parseUserTable(data: string): Employee[] {
  return data
    .trim()
    .split('\n')
    .flatMap(line => {
      const parts = line.trim().split('\t');
      if (parts.length < 2) return [];
      const [pin, name, , , , card] = parts;
      if (!pin?.trim()) return [];
      return [{
        id: pin.trim(),
        name: name?.trim() || `Employee ${pin.trim()}`,
        card: card?.trim() || undefined,
      }];
    });
}

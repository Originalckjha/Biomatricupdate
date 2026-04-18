import { NextResponse } from 'next/server';
import { addRecord, addEmployee } from '@/lib/store';
import type { PunchType } from '@/lib/types';

const DEMO_EMPLOYEES = [
  { id: '001', name: 'James Carter',   department: 'Engineering' },
  { id: '002', name: 'Emily Johnson',  department: 'HR' },
  { id: '003', name: 'David Smith',    department: 'Sales' },
  { id: '004', name: 'Laura Williams', department: 'Finance' },
  { id: '005', name: 'Robert Brown',   department: 'IT' },
  { id: '006', name: 'Susan Taylor',   department: 'Operations' },
];

export async function POST() {
  DEMO_EMPLOYEES.forEach(addEmployee);

  const emp = DEMO_EMPLOYEES[Math.floor(Math.random() * DEMO_EMPLOYEES.length)];
  const punchType: PunchType = Math.random() > 0.4 ? 'IN' : 'OUT';

  addRecord({
    id: crypto.randomUUID(),
    employeeId: emp.id,
    employeeName: emp.name,
    timestamp: new Date().toISOString(),
    punchType,
    verifyType: 'FP',
    deviceSN: 'DEMO-N9-001',
  });

  return NextResponse.json({
    success: true,
    message: `${emp.name} — ${punchType}`,
  });
}

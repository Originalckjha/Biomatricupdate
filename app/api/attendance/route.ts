import { NextRequest, NextResponse } from 'next/server';
import { getRecords, getStats, getLastUpdated, addRecord, addEmployee, clearStore } from '@/lib/store';

export async function GET(request: NextRequest) {
  const since = request.nextUrl.searchParams.get('since');
  return NextResponse.json({
    records: getRecords(100, since ? parseInt(since) : undefined),
    stats: getStats(),
    lastUpdated: getLastUpdated(),
    timestamp: Date.now(),
  });
}

// Manual push for custom integrations or testing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (Array.isArray(body.employees)) body.employees.forEach(addEmployee);
    if (body.record) {
      addRecord({
        id: crypto.randomUUID(),
        employeeId: body.record.employeeId || 'UNKNOWN',
        employeeName: body.record.employeeName || 'Unknown Employee',
        timestamp: body.record.timestamp || new Date().toISOString(),
        punchType: body.record.punchType || 'UNKNOWN',
        verifyType: body.record.verifyType,
        deviceSN: body.record.deviceSN,
      });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// Clear all records from memory
export async function DELETE() {
  clearStore();
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { addRecord, addEmployee, getEmployee } from '@/lib/store';
import { parseAttendanceLog, parseUserTable } from '@/lib/zkparser';

function serverTime(): string {
  const n = new Date();
  const p = (v: number) => String(v).padStart(2, '0');
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())} ${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`;
}

// ZKTeco ADMS device handshake
export async function GET(request: NextRequest) {
  const sn = request.nextUrl.searchParams.get('SN') || '';
  const body = [
    `GET OPTION FROM: ${sn}`,
    'ATTSTAMPSOPTIONetwork=256',
    'ErrorDelay=30',
    'Delay=10',
    'TransTimes=00:00;23:59',
    'TransInterval=1',
    'TransFlag=TransData AttLog\tUserInfo',
    'Realtime=1',
    'Encrypt=None',
    `ServerVer=2.4.1 ${serverTime()}`,
    'PushProtVer=2.4.1',
    '',
  ].join('\r\n');

  return new NextResponse(body, { headers: { 'Content-Type': 'text/plain' } });
}

// ZKTeco ADMS device posts attendance/user data here
export async function POST(request: NextRequest) {
  const sn = request.nextUrl.searchParams.get('SN') || '';
  const text = await request.text();
  const params = new URLSearchParams(text);
  const table = params.get('table') || request.nextUrl.searchParams.get('table') || '';
  const data = params.get('Data') || '';

  if (table === 'USERTABLE' || table === 'USER') {
    parseUserTable(data).forEach(addEmployee);
    return new NextResponse('OK', { headers: { 'Content-Type': 'text/plain' } });
  }

  if (table === 'ATTLOG' || table === 'ATT') {
    parseAttendanceLog(data, sn).forEach(partial => {
      if (!partial.employeeId) return;
      const emp = getEmployee(partial.employeeId);
      addRecord({
        id: crypto.randomUUID(),
        employeeId: partial.employeeId,
        employeeName: emp?.name || `ID: ${partial.employeeId}`,
        timestamp: partial.timestamp || new Date().toISOString(),
        punchType: partial.punchType || 'UNKNOWN',
        verifyType: partial.verifyType,
        deviceSN: sn,
      });
    });
    return new NextResponse('OK', { headers: { 'Content-Type': 'text/plain' } });
  }

  return new NextResponse('OK', { headers: { 'Content-Type': 'text/plain' } });
}

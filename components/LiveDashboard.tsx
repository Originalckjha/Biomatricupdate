'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Settings, Wifi, WifiOff, RefreshCw, Users, LogIn, LogOut,
  FlaskConical, Download, Volume2, VolumeX, X,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import clsx from 'clsx';
import type { AttendanceRecord, DashboardStats, Config, PunchType } from '@/lib/types';
import SettingsModal from './SettingsModal';

const DEFAULT_CONFIG: Config = { mode: 'push', pollInterval: 3000 };

// ── Utilities ──────────────────────────────────────────────────────────

function avatarColor(name: string): string {
  const palette = [
    'from-violet-500 to-purple-700',
    'from-blue-500 to-indigo-700',
    'from-emerald-500 to-teal-700',
    'from-orange-500 to-amber-700',
    'from-pink-500 to-rose-700',
    'from-cyan-500 to-blue-700',
  ];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % palette.length;
  return palette[h];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getCurrentlyInside(records: AttendanceRecord[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastPunch = new Map<string, PunchType>();
  // records are newest-first, so first occurrence per employee = most recent punch
  records
    .filter(r => new Date(r.timestamp) >= today)
    .forEach(r => {
      if (!lastPunch.has(r.employeeId) && (r.punchType === 'IN' || r.punchType === 'OUT')) {
        lastPunch.set(r.employeeId, r.punchType);
      }
    });
  return [...lastPunch.values()].filter(t => t === 'IN').length;
}

// ── Small components ───────────────────────────────────────────────────

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-9 h-9 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-16 h-16 text-xl' };
  return (
    <div
      className={clsx(
        'rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 bg-gradient-to-br',
        avatarColor(name),
        sizes[size],
      )}
    >
      {getInitials(name)}
    </div>
  );
}

function PunchBadge({ type, size = 'sm' }: { type: PunchType; size?: 'sm' | 'lg' }) {
  const conf: Record<PunchType, { cls: string; label: string; Icon: typeof LogIn }> = {
    IN:      { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'CHECK IN',  Icon: LogIn },
    OUT:     { cls: 'bg-red-500/15 text-red-400 border-red-500/30',             label: 'CHECK OUT', Icon: LogOut },
    CHECK:   { cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30',          label: 'CHECK',     Icon: RefreshCw },
    UNKNOWN: { cls: 'bg-gray-600/20 text-gray-400 border-gray-600/30',          label: 'SCAN',      Icon: Users },
  };
  const { cls, label, Icon } = conf[type] ?? conf.UNKNOWN;
  const pad = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-md border font-semibold tracking-wide', cls, pad)}>
      <Icon size={size === 'lg' ? 14 : 11} />
      {label}
    </span>
  );
}

function StatCard({
  label, value, icon, colorBg, colorText, highlight,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorBg: string;
  colorText: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={clsx(
        'rounded-xl p-4 flex items-center gap-3 border transition-all',
        highlight
          ? 'bg-emerald-900/20 border-emerald-500/30'
          : 'bg-gray-800/40 border-gray-700/40',
      )}
    >
      <div className={clsx('p-2.5 rounded-lg', colorBg)}>
        <span className={colorText}>{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
        <div className="text-gray-400 text-xs">{label}</div>
      </div>
    </div>
  );
}

// Hero card — most recent scan, full-width prominent display
function HeroScan({ record, isNew }: { record: AttendanceRecord; isNew: boolean }) {
  const isIn = record.punchType === 'IN';
  const t = new Date(record.timestamp);
  return (
    <div
      className={clsx(
        'rounded-2xl p-5 border-2 transition-all duration-500',
        isNew && 'scale-[1.005]',
        isIn
          ? 'bg-gradient-to-r from-emerald-950/70 via-gray-900/60 to-gray-900/60 border-emerald-500/50'
          : 'bg-gradient-to-r from-red-950/70 via-gray-900/60 to-gray-900/60 border-red-500/50',
      )}
    >
      <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-3">
        Latest Scan
      </p>
      <div className="flex items-center gap-4">
        <Avatar name={record.employeeName} size="lg" />

        <div className="flex-1 min-w-0">
          <h2 className="text-white text-2xl font-bold leading-tight truncate">
            {record.employeeName}
          </h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-gray-400 font-mono text-sm">#{record.employeeId}</span>
            <PunchBadge type={record.punchType} size="lg" />
          </div>
          <p className="text-gray-600 text-xs mt-1.5">
            {formatDistanceToNow(t, { addSuffix: true })}
            {record.deviceSN && <span> · {record.deviceSN}</span>}
          </p>
        </div>

        <div className="text-right flex-shrink-0 hidden sm:block">
          <div
            className={clsx(
              'text-5xl font-mono font-bold tabular-nums leading-none',
              isIn ? 'text-emerald-400' : 'text-red-400',
            )}
          >
            {format(t, 'HH:mm')}
          </div>
          <div className={clsx('text-2xl font-mono tabular-nums mt-0.5', isIn ? 'text-emerald-700' : 'text-red-700')}>
            :{format(t, 'ss')}
          </div>
          <div className="text-gray-600 text-xs mt-1">{format(t, 'dd MMM yyyy')}</div>
        </div>
      </div>

      {/* Mobile time */}
      <div className="sm:hidden mt-3 pt-3 border-t border-gray-700/40 flex items-center justify-between">
        <span className={clsx('font-mono text-2xl font-bold tabular-nums', isIn ? 'text-emerald-400' : 'text-red-400')}>
          {format(t, 'HH:mm:ss')}
        </span>
        <span className="text-gray-500 text-sm">{format(t, 'dd MMM yyyy')}</span>
      </div>
    </div>
  );
}

// Compact row card for IN/OUT columns
function CompactCard({ record, isNew }: { record: AttendanceRecord; isNew: boolean }) {
  const t = new Date(record.timestamp);
  const justNow = Date.now() - t.getTime() < 30_000;
  return (
    <div
      className={clsx(
        'flex items-center gap-3 p-3 rounded-xl border transition-all duration-200',
        'bg-gray-800/30 border-gray-700/30 hover:bg-gray-800/60 hover:border-gray-700/60',
        isNew && 'new-record',
      )}
    >
      <Avatar name={record.employeeName} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-white font-semibold text-sm truncate">{record.employeeName}</span>
          {justNow && (
            <span className="flex-shrink-0 px-1.5 rounded text-xs bg-yellow-500/20 text-yellow-400 font-bold">
              NOW
            </span>
          )}
        </div>
        <span className="text-gray-500 text-xs font-mono">#{record.employeeId}</span>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-white font-mono text-sm font-semibold tabular-nums">
          {format(t, 'HH:mm:ss')}
        </div>
        <div className="text-gray-600 text-xs">{formatDistanceToNow(t, { addSuffix: true })}</div>
      </div>
    </div>
  );
}

// Toast notification for new scans
function Toast({ record, onRemove }: { record: AttendanceRecord; onRemove: () => void }) {
  useEffect(() => {
    const t = setTimeout(onRemove, 4500);
    return () => clearTimeout(t);
  }, [onRemove]);

  const isIn = record.punchType === 'IN';
  return (
    <div
      className={clsx(
        'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl min-w-[220px] max-w-[280px]',
        'toast-in cursor-pointer select-none',
        isIn
          ? 'bg-emerald-950/97 border-emerald-500/60'
          : 'bg-red-950/97 border-red-500/60',
      )}
      onClick={onRemove}
    >
      <Avatar name={record.employeeName} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="text-white font-semibold text-sm truncate">{record.employeeName}</div>
        <div className={clsx('text-xs font-medium', isIn ? 'text-emerald-400' : 'text-red-400')}>
          {isIn ? '↑ Checked In' : '↓ Checked Out'} · {format(new Date(record.timestamp), 'HH:mm:ss')}
        </div>
      </div>
      <button className="text-gray-600 hover:text-gray-400 flex-shrink-0" onClick={onRemove}>
        <X size={13} />
      </button>
    </div>
  );
}

// Column panel header
function ColumnHeader({
  label, count, icon, colorText, colorBg, colorCount,
}: {
  label: string; count: number; icon: React.ReactNode;
  colorText: string; colorBg: string; colorCount: string;
}) {
  return (
    <div className={clsx('flex items-center justify-between px-4 py-3 border-b border-gray-700/40', colorBg)}>
      <div className="flex items-center gap-2">
        <span className={colorText}>{icon}</span>
        <h3 className={clsx('font-bold text-sm uppercase tracking-wider', colorText)}>{label}</h3>
      </div>
      <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-bold', colorCount)}>{count}</span>
    </div>
  );
}

function LiveClock() {
  const [t, setT] = useState('');
  useEffect(() => {
    const tick = () => setT(format(new Date(), 'HH:mm:ss'));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono tabular-nums text-gray-300 text-sm hidden sm:inline">{t}</span>;
}

// ── Main Dashboard ─────────────────────────────────────────────────────

export default function LiveDashboard() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ total: 0, in: 0, out: 0 });
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [showSettings, setShowSettings] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Array<AttendanceRecord & { toastId: string }>>([]);
  const [mobileTab, setMobileTab] = useState<'in' | 'out'>('in');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  const knownIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);
  const soundRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Derived: today's IN/OUT records + inside count
  const todayStart = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const inRecords = useMemo(
    () => records.filter(r => r.punchType === 'IN' && new Date(r.timestamp) >= todayStart),
    [records, todayStart],
  );
  const outRecords = useMemo(
    () => records.filter(r => r.punchType === 'OUT' && new Date(r.timestamp) >= todayStart),
    [records, todayStart],
  );
  const insideCount = useMemo(() => getCurrentlyInside(records), [records]);

  // Sync sound ref so fetchData callback doesn't need to re-bind
  useEffect(() => { soundRef.current = soundEnabled; }, [soundEnabled]);

  useEffect(() => {
    const cfg = localStorage.getItem('bio-config');
    if (cfg) try { setConfig(JSON.parse(cfg)); } catch {}
    if (localStorage.getItem('bio-sound') === '1') {
      setSoundEnabled(true);
      soundRef.current = true;
    }
  }, []);

  const saveConfig = useCallback((c: Config) => {
    setConfig(c);
    localStorage.setItem('bio-config', JSON.stringify(c));
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('bio-sound', next ? '1' : '0');
  };

  function playBeep(type: PunchType) {
    if (!soundRef.current) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = type === 'IN' ? 880 : 550;
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }

  const fetchData = useCallback(async () => {
    try {
      const url =
        config.mode === 'pull' && config.pullUrl
          ? `/api/proxy?url=${encodeURIComponent(config.pullUrl)}`
          : '/api/attendance';

      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const fetched: AttendanceRecord[] = data.records ?? [];

      const fresh: AttendanceRecord[] = [];
      fetched.forEach(r => {
        if (!knownIds.current.has(r.id)) {
          fresh.push(r);
          knownIds.current.add(r.id);
        }
      });

      if (fresh.length > 0) {
        setNewIds(new Set(fresh.map(r => r.id)));
        setTimeout(() => setNewIds(new Set()), 2500);

        if (!isFirstLoad.current) {
          fresh.slice(0, 3).forEach(r => {
            playBeep(r.punchType);
            setToasts(prev => [
              ...prev.slice(-4),
              { ...r, toastId: `${r.id}-${Date.now()}` },
            ]);
          });
        }
      }

      isFirstLoad.current = false;
      setRecords(fetched);
      if (data.stats) setStats(data.stats);
      setIsConnected(true);
      setLastPoll(new Date());
      setError(null);
    } catch (e) {
      setIsConnected(false);
      setError(e instanceof Error ? e.message : 'Connection error');
    }
  }, [config]);

  useEffect(() => {
    fetchData();
    timerRef.current = setInterval(fetchData, config.pollInterval ?? 3000);
    return () => clearInterval(timerRef.current);
  }, [fetchData, config.pollInterval]);

  const addTestRecord = async () => {
    setTestLoading(true);
    await fetch('/api/test', { method: 'POST' });
    await fetchData();
    setTestLoading(false);
  };

  const clearData = async () => {
    await fetch('/api/attendance', { method: 'DELETE' });
    knownIds.current = new Set();
    isFirstLoad.current = true;
    setRecords([]);
    setStats({ total: 0, in: 0, out: 0 });
    setToasts([]);
  };

  const exportCSV = () => {
    const header = 'Employee ID,Employee Name,Punch Type,Time,Date,Device\n';
    const rows = records
      .map(r => {
        const t = new Date(r.timestamp);
        return `${r.employeeId},"${r.employeeName}",${r.punchType},${format(t, 'HH:mm:ss')},${format(t, 'yyyy-MM-dd')},${r.deviceSN ?? ''}`;
      })
      .join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([header + rows], { type: 'text/csv' })),
      download: `attendance-${format(new Date(), 'yyyy-MM-dd')}.csv`,
    });
    a.click();
  };

  const isEmpty = inRecords.length === 0 && outRecords.length === 0;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-gray-950/95 backdrop-blur-md border-b border-gray-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <div className={clsx('w-2.5 h-2.5 rounded-full', isConnected ? 'bg-emerald-500' : 'bg-red-500')} />
              {isConnected && (
                <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-50" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-bold text-base leading-none">N9 Biometric Live</h1>
              <p className="text-gray-500 text-xs mt-0.5 truncate">
                {isConnected
                  ? lastPoll && `Updated ${formatDistanceToNow(lastPoll, { addSuffix: true })}`
                  : error ?? 'Connecting…'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <LiveClock />
            <div className="w-px h-5 bg-gray-700 mx-1 hidden sm:block" />
            <button
              onClick={toggleSound}
              title={soundEnabled ? 'Mute alerts' : 'Sound alerts'}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
            <button
              onClick={addTestRecord}
              disabled={testLoading}
              title="Add demo record"
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-40"
            >
              <FlaskConical size={17} />
            </button>
            <button
              onClick={exportCSV}
              disabled={records.length === 0}
              title="Export CSV"
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-40"
            >
              <Download size={17} />
            </button>
            <button
              onClick={fetchData}
              title="Refresh"
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <RefreshCw size={17} />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500
                text-white rounded-lg transition-colors text-sm font-semibold ml-1"
            >
              <Settings size={15} />
              <span className="hidden sm:inline">Configure</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-5 flex flex-col gap-5">

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Today Total"  value={stats.total}  colorBg="bg-blue-500/10"    colorText="text-blue-400"    icon={<Users   size={20} />} />
          <StatCard label="Check In"     value={stats.in}     colorBg="bg-emerald-500/10" colorText="text-emerald-400" icon={<LogIn   size={20} />} />
          <StatCard label="Check Out"    value={stats.out}    colorBg="bg-red-500/10"     colorText="text-red-400"     icon={<LogOut  size={20} />} />
          <StatCard
            label="Inside Now"
            value={insideCount}
            colorBg="bg-purple-500/10"
            colorText="text-purple-400"
            icon={<Users size={20} />}
            highlight={insideCount > 0}
          />
        </div>

        {/* Hero latest scan */}
        {records[0] ? (
          <HeroScan key={records[0].id} record={records[0]} isNew={newIds.has(records[0].id)} />
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-gray-700/50 p-10 text-center">
            <Users size={36} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 font-semibold text-lg mb-1">Waiting for scans…</p>
            <p className="text-gray-600 text-sm mb-5">
              {config.mode === 'push'
                ? 'Configure your N9 device to push to this server, or try a demo record.'
                : 'Enter your device URL in Configure to start fetching records.'}
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              <button
                onClick={addTestRecord}
                disabled={testLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm
                  font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <FlaskConical size={15} />
                {testLoading ? 'Adding…' : 'Add Demo Record'}
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white
                  rounded-lg text-sm font-semibold transition-colors"
              >
                Configure Device
              </button>
            </div>
          </div>
        )}

        {/* Connection mode badge */}
        <div className="flex items-center gap-2 text-sm">
          {isConnected ? <Wifi size={14} className="text-emerald-400" /> : <WifiOff size={14} className="text-red-400" />}
          <span className="text-gray-500">
            {config.mode === 'push' ? 'Push mode — device sends data here' : `Pull mode — ${config.pullUrl ?? 'no URL set'}`}
          </span>
          <span className="text-gray-700">·</span>
          <span className="text-gray-600">{records.length} records loaded</span>
        </div>

        {/* Mobile tab bar (hidden on lg) */}
        {!isEmpty && (
          <div className="flex lg:hidden bg-gray-800/50 rounded-xl p-1 gap-1">
            {([
              ['in',  'Check In',  stats.in,  'text-emerald-400'],
              ['out', 'Check Out', stats.out, 'text-red-400'],
            ] as const).map(([tab, label, count, color]) => (
              <button
                key={tab}
                onClick={() => setMobileTab(tab)}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all',
                  mobileTab === tab ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300',
                )}
              >
                {label}
                <span className={clsx('text-xs font-bold', mobileTab === tab ? color : 'text-gray-600')}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* IN / OUT columns */}
        {!isEmpty && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* ── Check IN ── */}
            <div className={clsx(mobileTab === 'out' ? 'hidden lg:block' : '')}>
              <div className="bg-gray-900/50 border border-gray-700/40 rounded-2xl overflow-hidden">
                <ColumnHeader
                  label="Check In"
                  count={inRecords.length}
                  icon={<LogIn size={16} />}
                  colorText="text-emerald-400"
                  colorBg="bg-emerald-950/40"
                  colorCount="bg-emerald-500/15 text-emerald-400"
                />
                <div className="p-3 space-y-2 max-h-[56vh] overflow-y-auto">
                  {inRecords.length > 0 ? (
                    inRecords.map(r => (
                      <CompactCard key={r.id} record={r} isNew={newIds.has(r.id)} />
                    ))
                  ) : (
                    <div className="py-10 text-center">
                      <LogIn size={24} className="text-emerald-900 mx-auto mb-2" />
                      <p className="text-gray-600 text-sm">No check-ins today</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Check OUT ── */}
            <div className={clsx(mobileTab === 'in' ? 'hidden lg:block' : '')}>
              <div className="bg-gray-900/50 border border-gray-700/40 rounded-2xl overflow-hidden">
                <ColumnHeader
                  label="Check Out"
                  count={outRecords.length}
                  icon={<LogOut size={16} />}
                  colorText="text-red-400"
                  colorBg="bg-red-950/40"
                  colorCount="bg-red-500/15 text-red-400"
                />
                <div className="p-3 space-y-2 max-h-[56vh] overflow-y-auto">
                  {outRecords.length > 0 ? (
                    outRecords.map(r => (
                      <CompactCard key={r.id} record={r} isNew={newIds.has(r.id)} />
                    ))
                  ) : (
                    <div className="py-10 text-center">
                      <LogOut size={24} className="text-red-900 mx-auto mb-2" />
                      <p className="text-gray-600 text-sm">No check-outs today</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Toast notifications (bottom-right) ── */}
      <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map(t => (
          <div key={t.toastId} className="pointer-events-auto">
            <Toast
              record={t}
              onRemove={() => setToasts(prev => prev.filter(x => x.toastId !== t.toastId))}
            />
          </div>
        ))}
      </div>

      {showSettings && (
        <SettingsModal
          config={config}
          onSave={saveConfig}
          onClose={() => setShowSettings(false)}
          onClear={clearData}
        />
      )}
    </div>
  );
}

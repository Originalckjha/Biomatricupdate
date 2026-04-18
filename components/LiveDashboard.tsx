'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Settings, Wifi, WifiOff, RefreshCw, Users, LogIn, LogOut,
  FlaskConical, Download, Volume2, VolumeX, X, HelpCircle,
  CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import clsx from 'clsx';
import type { AttendanceRecord, DashboardStats, Config, PunchType } from '@/lib/types';
import SettingsModal from './SettingsModal';
import SetupWizard from './SetupWizard';

const DEFAULT_CONFIG: Config = { mode: 'push', pollInterval: 3000 };

// ── Utilities ──────────────────────────────────────────────────────────

function avatarGradient(name: string): string {
  const p = [
    'from-violet-500 to-purple-700', 'from-blue-500 to-indigo-700',
    'from-emerald-500 to-teal-700',  'from-orange-500 to-amber-700',
    'from-pink-500 to-rose-700',     'from-cyan-500 to-sky-700',
  ];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % p.length;
  return p[h];
}

function initials(name: string) {
  return name.split(' ').map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase();
}

function getCurrentlyInside(records: AttendanceRecord[]): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const last = new Map<string, PunchType>();
  records
    .filter(r => new Date(r.timestamp) >= today)
    .forEach(r => {
      if (!last.has(r.employeeId) && (r.punchType === 'IN' || r.punchType === 'OUT'))
        last.set(r.employeeId, r.punchType);
    });
  return Array.from(last.values()).filter(t => t === 'IN').length;
}

// ── UI primitives ──────────────────────────────────────────────────────

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = { sm: 'w-9 h-9 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-16 h-16 text-xl' };
  return (
    <div className={clsx(
      'rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 bg-gradient-to-br',
      avatarGradient(name), sz[size],
    )}>
      {initials(name)}
    </div>
  );
}

function PunchBadge({ type, size = 'sm' }: { type: PunchType; size?: 'sm' | 'lg' }) {
  const map: Record<PunchType, { cls: string; label: string; Icon: typeof LogIn }> = {
    IN:      { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'CHECK IN',  Icon: LogIn },
    OUT:     { cls: 'bg-red-500/15 text-red-400 border-red-500/30',             label: 'CHECK OUT', Icon: LogOut },
    CHECK:   { cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30',          label: 'CHECK',     Icon: Clock },
    UNKNOWN: { cls: 'bg-gray-600/20 text-gray-400 border-gray-600/30',          label: 'SCAN',      Icon: Users },
  };
  const { cls, label, Icon } = map[type] ?? map.UNKNOWN;
  const pad = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-md border font-semibold tracking-wide', cls, pad)}>
      <Icon size={size === 'lg' ? 14 : 11} />
      {label}
    </span>
  );
}

function StatCard({
  label, value, icon, colorBg, colorText, pulse,
}: {
  label: string; value: number; icon: React.ReactNode; colorBg: string; colorText: string; pulse?: boolean;
}) {
  return (
    <div className={clsx(
      'rounded-xl p-4 flex items-center gap-3 border transition-all',
      pulse ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-gray-800/40 border-gray-700/40',
    )}>
      <div className={clsx('p-2.5 rounded-lg flex-shrink-0', colorBg)}>
        <span className={colorText}>{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
        <div className="text-gray-400 text-xs">{label}</div>
      </div>
    </div>
  );
}

// Hero card — latest scan, full width
function HeroScan({ record, isNew }: { record: AttendanceRecord; isNew: boolean }) {
  const isIn = record.punchType === 'IN';
  const t = new Date(record.timestamp);
  return (
    <div className={clsx(
      'rounded-2xl p-5 border-2 transition-all duration-500',
      isNew && 'scale-[1.005]',
      isIn
        ? 'bg-gradient-to-r from-emerald-950/70 via-gray-900/50 to-gray-900/50 border-emerald-500/50'
        : 'bg-gradient-to-r from-red-950/70 via-gray-900/50 to-gray-900/50 border-red-500/50',
    )}>
      <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-3">Latest Scan</p>
      <div className="flex items-center gap-4">
        <Avatar name={record.employeeName} size="lg" />
        <div className="flex-1 min-w-0">
          <h2 className="text-white text-2xl font-bold leading-tight truncate">{record.employeeName}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-gray-400 font-mono text-sm">#{record.employeeId}</span>
            <PunchBadge type={record.punchType} size="lg" />
          </div>
          <p className="text-gray-600 text-xs mt-1.5">
            {formatDistanceToNow(t, { addSuffix: true })}
            {record.deviceSN && <> · Device: {record.deviceSN}</>}
          </p>
        </div>
        <div className="text-right flex-shrink-0 hidden sm:block">
          <div className={clsx('text-5xl font-mono font-bold tabular-nums leading-none', isIn ? 'text-emerald-400' : 'text-red-400')}>
            {format(t, 'HH:mm')}
          </div>
          <div className={clsx('text-2xl font-mono tabular-nums mt-0.5', isIn ? 'text-emerald-700' : 'text-red-700')}>
            :{format(t, 'ss')}
          </div>
          <div className="text-gray-500 text-xs mt-1">{format(t, 'dd MMM yyyy')}</div>
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
    <div className={clsx(
      'flex items-center gap-3 p-3 rounded-xl border transition-all duration-200',
      'bg-gray-800/30 border-gray-700/30 hover:bg-gray-800/60 hover:border-gray-700/60',
      isNew && 'new-record',
    )}>
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
        <div className="text-white font-mono text-sm font-semibold tabular-nums">{format(t, 'HH:mm:ss')}</div>
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
        isIn ? 'bg-emerald-950/97 border-emerald-500/60' : 'bg-red-950/97 border-red-500/60',
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
      <X size={13} className="text-gray-600 flex-shrink-0" />
    </div>
  );
}

function ColumnHeader({
  label, count, icon, colorText, colorBg, colorBadge,
}: {
  label: string; count: number; icon: React.ReactNode;
  colorText: string; colorBg: string; colorBadge: string;
}) {
  return (
    <div className={clsx('flex items-center justify-between px-4 py-3 border-b border-gray-700/40', colorBg)}>
      <div className="flex items-center gap-2">
        <span className={colorText}>{icon}</span>
        <h3 className={clsx('font-bold text-sm uppercase tracking-wider', colorText)}>{label}</h3>
      </div>
      <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-bold', colorBadge)}>{count}</span>
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

// Status banner shown when records are empty but device is configured
function WaitingBanner({
  mode, onGuide, onDemo, loading,
}: { mode: 'push' | 'pull'; onGuide: () => void; onDemo: () => void; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-700/60 p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
        <Wifi size={28} className="text-indigo-400" />
      </div>
      <h3 className="text-white font-bold text-xl mb-2">Waiting for first scan…</h3>
      <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
        {mode === 'push'
          ? 'Your dashboard is live. As soon as someone scans their finger or card, it will appear here.'
          : 'The dashboard is fetching data. Make sure the device URL is correct.'}
      </p>
      <div className="flex justify-center gap-3 flex-wrap">
        <button
          onClick={onDemo}
          disabled={loading}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300
            hover:text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <FlaskConical size={15} />
          {loading ? 'Adding…' : 'Try a demo scan'}
        </button>
        <button
          onClick={onGuide}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm
            font-medium transition-colors flex items-center gap-2"
        >
          <HelpCircle size={15} />
          Setup guide
        </button>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────

export default function LiveDashboard() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ total: 0, in: 0, out: 0 });
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [showSettings, setShowSettings] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [firstVisit, setFirstVisit] = useState(false);
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

  const todayStart = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const inRecords  = useMemo(() => records.filter(r => r.punchType === 'IN'  && new Date(r.timestamp) >= todayStart), [records, todayStart]);
  const outRecords = useMemo(() => records.filter(r => r.punchType === 'OUT' && new Date(r.timestamp) >= todayStart), [records, todayStart]);
  const insideCount = useMemo(() => getCurrentlyInside(records), [records]);

  useEffect(() => { soundRef.current = soundEnabled; }, [soundEnabled]);

  useEffect(() => {
    const cfg = localStorage.getItem('bio-config');
    if (cfg) {
      try { setConfig(JSON.parse(cfg)); } catch {}
    } else {
      // First visit — show wizard
      setFirstVisit(true);
      setShowWizard(true);
    }
    if (localStorage.getItem('bio-sound') === '1') {
      setSoundEnabled(true); soundRef.current = true;
    }
  }, []);

  const saveConfig = useCallback((c: Config) => {
    setConfig(c);
    localStorage.setItem('bio-config', JSON.stringify(c));
  }, []);

  const handleWizardComplete = (c: Config) => {
    saveConfig(c);
    setFirstVisit(false);
    setShowWizard(false);
  };

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
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = type === 'IN' ? 880 : 550;
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(); osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }

  const fetchData = useCallback(async () => {
    try {
      const url = config.mode === 'pull' && config.pullUrl
        ? `/api/proxy?url=${encodeURIComponent(config.pullUrl)}`
        : '/api/attendance';
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const fetched: AttendanceRecord[] = data.records ?? [];

      const fresh: AttendanceRecord[] = [];
      fetched.forEach(r => {
        if (!knownIds.current.has(r.id)) { fresh.push(r); knownIds.current.add(r.id); }
      });

      if (fresh.length > 0) {
        setNewIds(new Set(fresh.map(r => r.id)));
        setTimeout(() => setNewIds(new Set()), 2500);
        if (!isFirstLoad.current) {
          fresh.slice(0, 3).forEach(r => {
            playBeep(r.punchType);
            setToasts(prev => [...prev.slice(-4), { ...r, toastId: `${r.id}-${Date.now()}` }]);
          });
        }
      }
      isFirstLoad.current = false;
      setRecords(fetched);
      if (data.stats) setStats(data.stats);
      setIsConnected(true); setLastPoll(new Date()); setError(null);
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
    setRecords([]); setStats({ total: 0, in: 0, out: 0 }); setToasts([]);
  };

  const exportCSV = () => {
    const header = 'Employee ID,Employee Name,Punch Type,Time,Date,Device\n';
    const rows = records.map(r => {
      const t = new Date(r.timestamp);
      return `${r.employeeId},"${r.employeeName}",${r.punchType},${format(t, 'HH:mm:ss')},${format(t, 'yyyy-MM-dd')},${r.deviceSN ?? ''}`;
    }).join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([header + rows], { type: 'text/csv' })),
      download: `attendance-${format(new Date(), 'yyyy-MM-dd')}.csv`,
    });
    a.click();
  };

  const isEmpty = inRecords.length === 0 && outRecords.length === 0;

  // ── Render ─────────────────────────────────────────────────────────

  if (showWizard) {
    return <SetupWizard onComplete={handleWizardComplete} />;
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-gray-950/95 backdrop-blur-md border-b border-gray-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">

          {/* Brand + live dot */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <div className={clsx('w-2.5 h-2.5 rounded-full', isConnected ? 'bg-emerald-500' : 'bg-red-400')} />
              {isConnected && <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-50" />}
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-bold text-base leading-none">N9 Biometric Live</h1>
              <p className={clsx('text-xs mt-0.5 truncate', isConnected ? 'text-gray-500' : 'text-red-400/80')}>
                {isConnected
                  ? lastPoll && `Last updated ${formatDistanceToNow(lastPoll, { addSuffix: true })}`
                  : error ? `Error: ${error}` : 'Connecting…'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <LiveClock />
            <div className="w-px h-5 bg-gray-700/70 mx-1 hidden sm:block" />

            <button onClick={toggleSound} title={soundEnabled ? 'Mute alerts' : 'Enable sound alerts'}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
              {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
            <button onClick={addTestRecord} disabled={testLoading} title="Add a demo scan"
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-40">
              <FlaskConical size={17} />
            </button>
            <button onClick={exportCSV} disabled={records.length === 0} title="Download CSV"
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-40">
              <Download size={17} />
            </button>
            <button onClick={fetchData} title="Refresh now"
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
              <RefreshCw size={17} />
            </button>

            <div className="w-px h-5 bg-gray-700/70 mx-1 hidden sm:block" />

            <button onClick={() => setShowWizard(true)} title="Setup guide"
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors hidden sm:flex">
              <HelpCircle size={17} />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500
                text-white rounded-lg transition-colors text-sm font-semibold"
            >
              <Settings size={15} />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Error banner ── */}
      {!isConnected && error && (
        <div className="bg-red-900/30 border-b border-red-900/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3">
            <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">
              <strong>Connection problem:</strong> {error}.
              {config.mode === 'pull' && ' Check that the device URL is correct and accessible.'}
              {config.mode === 'push' && ' Make sure this server is reachable from the device.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Main ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-5 flex flex-col gap-5">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Today Total"  value={stats.total}   colorBg="bg-blue-500/10"    colorText="text-blue-400"    icon={<Users  size={20} />} />
          <StatCard label="Checked In"   value={stats.in}      colorBg="bg-emerald-500/10" colorText="text-emerald-400" icon={<LogIn  size={20} />} />
          <StatCard label="Checked Out"  value={stats.out}     colorBg="bg-red-500/10"     colorText="text-red-400"     icon={<LogOut size={20} />} />
          <StatCard label="Inside Now"   value={insideCount}   colorBg="bg-purple-500/10"  colorText="text-purple-400"  icon={<Users  size={20} />} pulse={insideCount > 0} />
        </div>

        {/* Latest scan hero — or waiting state */}
        {records[0] ? (
          <HeroScan key={records[0].id} record={records[0]} isNew={newIds.has(records[0].id)} />
        ) : (
          <WaitingBanner
            mode={config.mode}
            onGuide={() => setShowWizard(true)}
            onDemo={addTestRecord}
            loading={testLoading}
          />
        )}

        {/* Connection mode indicator */}
        <div className="flex items-center gap-2 text-xs text-gray-600">
          {isConnected
            ? <CheckCircle2 size={13} className="text-emerald-600" />
            : <WifiOff size={13} className="text-red-600" />}
          <span>
            {config.mode === 'push'
              ? 'Push mode — N9 device sends data here'
              : `Pull mode — fetching from ${config.pullUrl ?? 'no URL set'}`}
          </span>
          <span>·</span>
          <span>{records.length} records loaded · refreshes every {((config.pollInterval ?? 3000) / 1000)}s</span>
          <button
            onClick={() => setShowWizard(true)}
            className="ml-auto text-indigo-500 hover:text-indigo-400 transition-colors font-medium hidden sm:inline"
          >
            Setup guide →
          </button>
        </div>

        {/* Mobile tab bar */}
        {!isEmpty && (
          <div className="flex lg:hidden bg-gray-800/50 rounded-xl p-1 gap-1">
            {([
              ['in',  'Check In',  stats.in,  'text-emerald-400'] as const,
              ['out', 'Check Out', stats.out, 'text-red-400'] as const,
            ]).map(([tab, label, count, color]) => (
              <button
                key={tab}
                onClick={() => setMobileTab(tab)}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all',
                  mobileTab === tab ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300',
                )}
              >
                {label}
                <span className={clsx('text-xs font-bold', mobileTab === tab ? color : 'text-gray-600')}>{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* IN / OUT columns */}
        {!isEmpty && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Check IN */}
            <div className={clsx(mobileTab === 'out' ? 'hidden lg:block' : '')}>
              <div className="bg-gray-900/50 border border-gray-700/40 rounded-2xl overflow-hidden">
                <ColumnHeader
                  label="Check In" count={inRecords.length}
                  icon={<LogIn size={16} />}
                  colorText="text-emerald-400" colorBg="bg-emerald-950/40"
                  colorBadge="bg-emerald-500/15 text-emerald-400"
                />
                <div className="p-3 space-y-2 max-h-[58vh] overflow-y-auto">
                  {inRecords.map(r => <CompactCard key={r.id} record={r} isNew={newIds.has(r.id)} />)}
                </div>
              </div>
            </div>

            {/* Check OUT */}
            <div className={clsx(mobileTab === 'in' ? 'hidden lg:block' : '')}>
              <div className="bg-gray-900/50 border border-gray-700/40 rounded-2xl overflow-hidden">
                <ColumnHeader
                  label="Check Out" count={outRecords.length}
                  icon={<LogOut size={16} />}
                  colorText="text-red-400" colorBg="bg-red-950/40"
                  colorBadge="bg-red-500/15 text-red-400"
                />
                <div className="p-3 space-y-2 max-h-[58vh] overflow-y-auto">
                  {outRecords.map(r => <CompactCard key={r.id} record={r} isNew={newIds.has(r.id)} />)}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Toasts ── */}
      <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map(t => (
          <div key={t.toastId} className="pointer-events-auto">
            <Toast record={t} onRemove={() => setToasts(prev => prev.filter(x => x.toastId !== t.toastId))} />
          </div>
        ))}
      </div>

      {showSettings && (
        <SettingsModal config={config} onSave={saveConfig} onClose={() => setShowSettings(false)} onClear={clearData} />
      )}
    </div>
  );
}

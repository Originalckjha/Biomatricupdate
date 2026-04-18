'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Settings, Wifi, WifiOff, RefreshCw, Users, LogIn, LogOut,
  Clock, Search, FlaskConical,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import clsx from 'clsx';
import type { AttendanceRecord, DashboardStats, Config } from '@/lib/types';
import SettingsModal from './SettingsModal';

const DEFAULT_CONFIG: Config = { mode: 'push', pollInterval: 3000 };

function avatarColor(name: string): string {
  const palette = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-red-500',
    'from-pink-500 to-rose-600',
    'from-amber-500 to-orange-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % palette.length;
  return palette[hash];
}

function PunchBadge({ type }: { type: AttendanceRecord['punchType'] }) {
  const map = {
    IN:      { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'CHECK IN',  Icon: LogIn },
    OUT:     { cls: 'bg-red-500/15 text-red-400 border-red-500/30',             label: 'CHECK OUT', Icon: LogOut },
    CHECK:   { cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30',          label: 'CHECK',     Icon: Clock },
    UNKNOWN: { cls: 'bg-gray-500/15 text-gray-400 border-gray-600/30',          label: 'SCAN',      Icon: Clock },
  };
  const { cls, label, Icon } = map[type] ?? map.UNKNOWN;
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-semibold tracking-wide', cls)}>
      <Icon size={11} />
      {label}
    </span>
  );
}

function RecordCard({ record, isNew }: { record: AttendanceRecord; isNew: boolean }) {
  const t = new Date(record.timestamp);
  const initials = record.employeeName
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className={clsx(
      'flex items-center gap-4 bg-gray-800/50 border border-gray-700/50 rounded-xl p-4',
      'hover:bg-gray-800/80 transition-all duration-200',
      isNew && 'new-record',
    )}>
      {/* Avatar */}
      <div className={clsx(
        'w-12 h-12 rounded-full flex items-center justify-center',
        'text-white font-bold text-base flex-shrink-0 bg-gradient-to-br',
        avatarColor(record.employeeName),
      )}>
        {initials}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-white">{record.employeeName}</span>
          <span className="text-gray-500 text-sm font-mono">#{record.employeeId}</span>
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <PunchBadge type={record.punchType} />
          {record.deviceSN && (
            <span className="text-gray-600 text-xs">· {record.deviceSN}</span>
          )}
        </div>
      </div>

      {/* Time */}
      <div className="text-right flex-shrink-0">
        <div className="text-white font-mono text-xl font-semibold tabular-nums">
          {format(t, 'HH:mm:ss')}
        </div>
        <div className="text-gray-500 text-xs mt-0.5">{format(t, 'dd MMM yyyy')}</div>
        <div className="text-gray-600 text-xs mt-0.5">
          {formatDistanceToNow(t, { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon, colorBg, colorText,
}: {
  label: string; value: number | string; icon: React.ReactNode; colorBg: string; colorText: string;
}) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex items-center gap-3">
      <div className={clsx('p-2.5 rounded-lg', colorBg)}>
        <span className={colorText}>{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
        <div className="text-gray-400 text-sm">{label}</div>
      </div>
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(format(new Date(), 'HH:mm:ss'));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono tabular-nums text-gray-300">{time}</span>;
}

export default function LiveDashboard() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ total: 0, in: 0, out: 0 });
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [showSettings, setShowSettings] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const knownIds = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const saved = localStorage.getItem('bio-config');
    if (saved) {
      try { setConfig(JSON.parse(saved)); } catch {}
    }
  }, []);

  const saveConfig = useCallback((c: Config) => {
    setConfig(c);
    localStorage.setItem('bio-config', JSON.stringify(c));
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const url = config.mode === 'pull' && config.pullUrl
        ? `/api/proxy?url=${encodeURIComponent(config.pullUrl)}`
        : '/api/attendance';

      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const fetched: AttendanceRecord[] = data.records ?? [];
      const fresh = new Set<string>();
      fetched.forEach(r => {
        if (!knownIds.current.has(r.id)) {
          fresh.add(r.id);
          knownIds.current.add(r.id);
        }
      });

      if (fresh.size > 0) {
        setNewIds(fresh);
        setTimeout(() => setNewIds(new Set()), 2500);
      }

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

  const filtered = search.trim()
    ? records.filter(r =>
        r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
        r.employeeId.toLowerCase().includes(search.toLowerCase()),
      )
    : records;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand + status */}
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className={clsx(
                'w-3 h-3 rounded-full',
                isConnected ? 'bg-emerald-500' : 'bg-red-500',
              )} />
              {isConnected && (
                <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
              )}
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-none">N9 Biometric Live</h1>
              <p className="text-gray-500 text-xs mt-0.5">
                {isConnected
                  ? <>Live · {lastPoll && formatDistanceToNow(lastPoll, { addSuffix: true })}</>
                  : error ?? 'Connecting…'}
              </p>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <LiveClock />
            <button
              onClick={addTestRecord}
              disabled={testLoading}
              title="Inject a demo attendance record"
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-40"
            >
              <FlaskConical size={18} />
            </button>
            <button
              onClick={fetchData}
              title="Refresh now"
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <RefreshCw size={18} />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700
                text-gray-300 hover:text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Settings size={15} />
              Configure
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Today Total"  value={stats.total}    colorBg="bg-blue-500/10"    colorText="text-blue-400"    icon={<Users   size={20} />} />
          <StatCard label="Check In"     value={stats.in}       colorBg="bg-emerald-500/10" colorText="text-emerald-400" icon={<LogIn   size={20} />} />
          <StatCard label="Check Out"    value={stats.out}      colorBg="bg-red-500/10"     colorText="text-red-400"     icon={<LogOut  size={20} />} />
          <StatCard label="Loaded"       value={records.length} colorBg="bg-purple-500/10"  colorText="text-purple-400"  icon={<RefreshCw size={20} />} />
        </div>

        {/* Mode badge + search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/70 rounded-lg text-sm flex-shrink-0">
            {isConnected
              ? <Wifi size={14} className="text-emerald-400" />
              : <WifiOff size={14} className="text-red-400" />}
            <span className="text-gray-400">
              Mode: <span className="text-white font-medium capitalize">{config.mode}</span>
              {config.mode === 'push' && <span className="text-gray-600 ml-1">· device pushes here</span>}
              {config.mode === 'pull' && config.pullUrl && (
                <span className="text-gray-600 ml-1 truncate max-w-xs">· {config.pullUrl}</span>
              )}
            </span>
          </div>

          <div className="relative flex-1 w-full sm:w-auto">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name or ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg pl-9 pr-3 py-1.5
                text-white text-sm placeholder-gray-600 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Feed */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
              <Users size={30} className="text-gray-600" />
            </div>
            <h3 className="text-gray-300 font-semibold text-lg mb-2">No records yet</h3>
            <p className="text-gray-600 text-sm max-w-sm mb-6">
              {search
                ? 'No records match your search.'
                : config.mode === 'push'
                ? 'Point your N9 device at this server, or click the flask icon to inject demo data.'
                : 'Set a pull URL in Configure to fetch live data from your device.'}
            </p>
            {!search && (
              <div className="flex gap-3">
                <button
                  onClick={addTestRecord}
                  disabled={testLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm
                    font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <FlaskConical size={16} />
                  {testLoading ? 'Adding…' : 'Add Demo Record'}
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm
                    font-medium transition-colors"
                >
                  Configure Device
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(record => (
              <RecordCard key={record.id} record={record} isNew={newIds.has(record.id)} />
            ))}
          </div>
        )}
      </main>

      {showSettings && (
        <SettingsModal
          config={config}
          onSave={saveConfig}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

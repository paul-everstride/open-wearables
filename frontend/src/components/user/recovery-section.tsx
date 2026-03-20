import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';
import { Heart, Activity, Waves, Thermometer, Droplets } from 'lucide-react';
import { useAllTimeSeries } from '@/hooks/api/use-health';
import { useDateRange } from '@/hooks/use-date-range';
import type { DateRangeValue } from '@/components/ui/date-range-selector';
import { MetricCard } from '@/components/common/metric-card';
import { SectionHeader } from '@/components/common/section-header';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

interface RecoverySectionProps {
  userId: string;
  dateRange: DateRangeValue;
  onDateRangeChange: (value: DateRangeValue) => void;
}

type ChartMetric = 'recovery' | 'hrv' | 'rhr';

// WHOOP colour zones for recovery score
function getRecoveryStyle(score: number | null | undefined) {
  if (score == null) return { text: 'text-zinc-400', bg: 'bg-zinc-500/10' };
  if (score >= 67) return { text: 'text-emerald-400', bg: 'bg-emerald-500/10' };
  if (score >= 34) return { text: 'text-yellow-400', bg: 'bg-yellow-500/10' };
  return { text: 'text-rose-400', bg: 'bg-rose-500/10' };
}

interface DayRecord {
  date: string;
  recovery_score?: number;
  heart_rate_variability_rmssd?: number;
  resting_heart_rate?: number;
  oxygen_saturation?: number;
  skin_temperature?: number;
}

// Merge flat timeseries samples into one record per calendar day
function pivotByDay(
  samples: Array<{ timestamp: string; type: string; value: number }>
): DayRecord[] {
  const byDay: Record<string, Record<string, number>> = {};
  for (const s of samples) {
    const day = s.timestamp.slice(0, 10); // "YYYY-MM-DD"
    if (!byDay[day]) byDay[day] = {};
    byDay[day][s.type] = s.value;
  }
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, metrics]) => ({ date, ...metrics } as DayRecord));
}

function avg(values: number[]): number | null {
  return values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : null;
}

function fmt1(n: number | undefined) {
  return n !== undefined ? (Math.round(n * 10) / 10).toFixed(1) : null;
}

// Skeleton loader — matches existing sections
function RecoverySectionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 border border-zinc-800 rounded-lg bg-zinc-900/30"
          >
            <div className="h-5 w-5 bg-zinc-800 rounded animate-pulse mb-3" />
            <div className="h-7 w-20 bg-zinc-800 rounded animate-pulse mb-1" />
            <div className="h-4 w-24 bg-zinc-800/50 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecoverySection({
  userId,
  dateRange,
  onDateRangeChange,
}: RecoverySectionProps) {
  const { startDate, endDate } = useDateRange(dateRange);

  // Two auto-paginating fetches — each keeps requesting the next cursor until
  // all pages are loaded. Calls go to our local backend (no external rate limits).
  const { data: coreData, isLoading: coreLoading } = useAllTimeSeries(userId, {
    start_time: startDate,
    end_time: endDate,
    types: [
      'recovery_score',
      'heart_rate_variability_rmssd',
      'resting_heart_rate',
    ],
  });

  const { data: secondaryData, isLoading: secondaryLoading } = useAllTimeSeries(
    userId,
    {
      start_time: startDate,
      end_time: endDate,
      types: ['oxygen_saturation', 'skin_temperature'],
    }
  );

  const isLoading = coreLoading || secondaryLoading;

  // Merge both batches and pivot to one row per day
  const days = useMemo<DayRecord[]>(() => {
    const all = [...coreData, ...secondaryData];
    return pivotByDay(all);
  }, [coreData, secondaryData]);

  // Aggregate stats for the summary cards
  const stats = useMemo(() => {
    if (!days.length) return null;
    const scores = days
      .map((d) => d.recovery_score)
      .filter((v): v is number => v !== undefined);
    const hrvs = days
      .map((d) => d.heart_rate_variability_rmssd)
      .filter((v): v is number => v !== undefined);
    const rhrs = days
      .map((d) => d.resting_heart_rate)
      .filter((v): v is number => v !== undefined);
    const spo2s = days
      .map((d) => d.oxygen_saturation)
      .filter((v): v is number => v !== undefined);
    return {
      avgRecovery: avg(scores),
      avgHrv: avg(hrvs),
      avgRhr: avg(rhrs),
      avgSpo2: avg(spo2s),
      daysTracked: days.length,
      greenDays: scores.filter((s) => s >= 67).length,
      yellowDays: scores.filter((s) => s >= 34 && s < 67).length,
      redDays: scores.filter((s) => s < 34).length,
    };
  }, [days]);

  // Chart data, chronological
  const chartData = useMemo(
    () =>
      days.map((d) => ({
        date: format(parseISO(d.date), 'MMM d'),
        recovery: d.recovery_score ?? null,
        hrv: d.heart_rate_variability_rmssd != null
          ? Math.round(d.heart_rate_variability_rmssd)
          : null,
        rhr: d.resting_heart_rate ?? null,
      })),
    [days]
  );

  // Table rows — newest first
  const tableRows = useMemo(() => [...days].reverse(), [days]);

  const [selectedChart, setSelectedChart] = useState<ChartMetric>('recovery');

  const chartConfig: Record<
    ChartMetric,
    { label: string; color: string; unit: string; domain?: [number, number] }
  > = {
    recovery: {
      label: 'Recovery Score',
      color: '#10b981',
      unit: '%',
      domain: [0, 100],
    },
    hrv: { label: 'HRV (RMSSD)', color: '#818cf8', unit: ' ms' },
    rhr: { label: 'Resting Heart Rate', color: '#f43f5e', unit: ' bpm' },
  };

  const current = chartConfig[selectedChart];
  const recoveryStyle = getRecoveryStyle(stats?.avgRecovery);

  return (
    <div className="space-y-6">
      {/* ── Summary ────────────────────────────────────────── */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <SectionHeader
          title="Recovery Summary"
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
        />

        <div className="p-6">
          {isLoading ? (
            <RecoverySectionSkeleton />
          ) : !stats ? (
            <p className="text-sm text-zinc-500 text-center py-8">
              No recovery data in this period
            </p>
          ) : (
            <div className="space-y-6">
              {/* Metric cards — clicking one switches the chart below */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  icon={Activity}
                  iconColor={recoveryStyle.text}
                  iconBgColor={recoveryStyle.bg}
                  value={
                    stats.avgRecovery != null
                      ? `${Math.round(stats.avgRecovery)}%`
                      : '—'
                  }
                  label="Avg Recovery Score"
                  isClickable
                  isSelected={selectedChart === 'recovery'}
                  glowColor="shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                  onClick={() => setSelectedChart('recovery')}
                />
                <MetricCard
                  icon={Waves}
                  iconColor="text-indigo-400"
                  iconBgColor="bg-indigo-500/10"
                  value={
                    stats.avgHrv != null
                      ? `${Math.round(stats.avgHrv)} ms`
                      : '—'
                  }
                  label="Avg HRV (RMSSD)"
                  isClickable
                  isSelected={selectedChart === 'hrv'}
                  glowColor="shadow-[0_0_15px_rgba(129,140,248,0.4)]"
                  onClick={() => setSelectedChart('hrv')}
                />
                <MetricCard
                  icon={Heart}
                  iconColor="text-rose-400"
                  iconBgColor="bg-rose-500/10"
                  value={
                    stats.avgRhr != null
                      ? `${Math.round(stats.avgRhr)} bpm`
                      : '—'
                  }
                  label="Avg Resting HR"
                  isClickable
                  isSelected={selectedChart === 'rhr'}
                  glowColor="shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                  onClick={() => setSelectedChart('rhr')}
                />
                <MetricCard
                  icon={Activity}
                  iconColor="text-sky-400"
                  iconBgColor="bg-sky-500/10"
                  value={String(stats.daysTracked)}
                  label="Days Tracked"
                />
              </div>

              {/* Recovery zone pill summary */}
              <div className="flex flex-wrap gap-4 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-zinc-400">
                    {stats.greenDays} green
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-xs text-zinc-400">
                    {stats.yellowDays} yellow
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-xs text-zinc-400">
                    {stats.redDays} red
                  </span>
                </div>
                {stats.avgSpo2 != null && (
                  <div className="flex items-center gap-2 ml-4">
                    <Droplets className="h-3 w-3 text-sky-400" />
                    <span className="text-xs text-zinc-400">
                      Avg SpO₂ {fmt1(stats.avgSpo2)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Dynamic chart — switches when you click a metric card */}
              {chartData.length > 1 && (
                <div className="pt-4 border-t border-zinc-800">
                  <h4 className="text-sm font-medium text-white mb-4">
                    Daily {current.label}
                  </h4>
                  <ChartContainer
                    config={{
                      [selectedChart]: {
                        label: current.label,
                        color: current.color,
                      },
                    }}
                    className="h-[220px] w-full"
                  >
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient
                          id={`grad-${selectedChart}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={current.color}
                            stopOpacity={0.25}
                          />
                          <stop
                            offset="95%"
                            stopColor={current.color}
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="3 3"
                        stroke="#27272a"
                      />
                      {/* Recovery zone guide lines */}
                      {selectedChart === 'recovery' && (
                        <>
                          <ReferenceLine
                            y={67}
                            stroke="#10b981"
                            strokeDasharray="4 4"
                            strokeOpacity={0.35}
                            label={{ value: 'Green', fill: '#10b981', fontSize: 10, position: 'right' }}
                          />
                          <ReferenceLine
                            y={34}
                            stroke="#eab308"
                            strokeDasharray="4 4"
                            strokeOpacity={0.35}
                            label={{ value: 'Yellow', fill: '#eab308', fontSize: 10, position: 'right' }}
                          />
                        </>
                      )}
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        interval="preserveStartEnd"
                        tick={{ fill: '#71717a', fontSize: 11 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tick={{ fill: '#71717a', fontSize: 11 }}
                        domain={current.domain ?? ['auto', 'auto']}
                        tickFormatter={(v) =>
                          selectedChart === 'recovery' ? `${v}%` : String(v)
                        }
                      />
                      <ChartTooltip
                        cursor={{
                          stroke: 'rgba(255,255,255,0.08)',
                          strokeWidth: 1,
                        }}
                        content={<ChartTooltipContent />}
                      />
                      <Area
                        type="monotone"
                        dataKey={selectedChart}
                        stroke={current.color}
                        strokeWidth={2}
                        fill={`url(#grad-${selectedChart})`}
                        connectNulls={false}
                        dot={false}
                        activeDot={{ r: 4, fill: current.color, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ChartContainer>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Daily Breakdown Table ───────────────────────────── */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <SectionHeader title="Daily Breakdown" />

        <div className="p-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="px-4 py-3 border border-zinc-800 rounded-lg bg-zinc-900/30"
                >
                  <div className="h-4 w-full bg-zinc-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : tableRows.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">
              No recovery data available
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                    <th className="text-left pb-3 pr-6 font-medium">Date</th>
                    <th className="text-left pb-3 pr-6 font-medium">Recovery</th>
                    <th className="text-left pb-3 pr-6 font-medium">
                      HRV (ms)
                    </th>
                    <th className="text-left pb-3 pr-6 font-medium">
                      Resting HR
                    </th>
                    <th className="text-left pb-3 pr-6 font-medium">SpO₂</th>
                    <th className="text-left pb-3 font-medium">Skin Temp</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((day) => {
                    const zone = getRecoveryStyle(day.recovery_score);
                    return (
                      <tr
                        key={day.date}
                        className="border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors"
                      >
                        <td className="py-3 pr-6 text-white font-medium">
                          {format(parseISO(day.date), 'EEE, MMM d')}
                        </td>
                        <td className="py-3 pr-6">
                          {day.recovery_score !== undefined ? (
                            <span
                              className={`font-semibold ${zone.text}`}
                            >
                              {Math.round(day.recovery_score)}%
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-6 text-zinc-300">
                          {day.heart_rate_variability_rmssd !== undefined ? (
                            Math.round(day.heart_rate_variability_rmssd)
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-6 text-zinc-300">
                          {day.resting_heart_rate !== undefined ? (
                            `${Math.round(day.resting_heart_rate)} bpm`
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-6 text-zinc-300">
                          {day.oxygen_saturation !== undefined ? (
                            `${fmt1(day.oxygen_saturation)}%`
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="py-3 text-zinc-300">
                          {day.skin_temperature !== undefined ? (
                            `${fmt1(day.skin_temperature)}°C`
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

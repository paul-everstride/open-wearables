import { cn } from '@/lib/utils';

// 0 is a special sentinel meaning "all time"
export type DateRangeValue = 7 | 30 | 90 | 365 | 0;

interface DateRangeSelectorProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  className?: string;
}

const RANGE_OPTIONS: { value: DateRangeValue; label: string }[] = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
  { value: 365, label: '365d' },
  { value: 0, label: 'All' },
];

export function DateRangeSelector({
  value,
  onChange,
  className,
}: DateRangeSelectorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 bg-zinc-800/50 p-1 rounded-lg',
        className
      )}
    >
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-2 py-1 text-xs font-medium rounded-md transition-colors',
            value === opt.value
              ? 'bg-zinc-700 text-white'
              : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

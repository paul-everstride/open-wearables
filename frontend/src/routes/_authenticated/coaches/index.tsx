import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { ChevronDown, ChevronRight, UserCheck, Shield, Loader2 } from 'lucide-react';
import { useCoaches, useCoachTeams } from '@/hooks/api/use-teams-api';
import type { CoachRead } from '@/hooks/api/use-teams-api';

export const Route = createFileRoute('/_authenticated/coaches/')({
  component: CoachesPage,
});

function CoachRow({ coach }: { coach: CoachRead }) {
  const [expanded, setExpanded] = useState(false);
  const { data: teams, isLoading } = useCoachTeams(expanded ? coach.email : null);

  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-900/50 transition-colors"
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-zinc-500 shrink-0" /> : <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />}
        <UserCheck className="h-4 w-4 text-zinc-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200 truncate">{coach.name ?? coach.email}</p>
          {coach.name && <p className="text-xs text-zinc-500 truncate">{coach.email}</p>}
        </div>
        <span className="ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
          {coach.team_count} {coach.team_count === 1 ? 'team' : 'teams'}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800 px-4 py-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-zinc-500 text-sm py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading teams…
            </div>
          ) : !teams || teams.length === 0 ? (
            <p className="text-sm text-zinc-600 py-1">No teams yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {teams.map(t => (
                <li key={t.id} className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                  <span className="text-sm text-zinc-300">{t.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function CoachesPage() {
  const { data: coaches, isLoading, isError, error } = useCoaches();

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Coaches</h1>
        <p className="text-sm text-zinc-500 mt-1">All coaches registered via Everstride.</p>
      </div>

      {isError && (
        <div className="rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400 mb-4">
          Failed to load coaches: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : !coaches || coaches.length === 0 ? (
        <p className="text-sm text-zinc-600">No coaches yet.</p>
      ) : (
        <div className="space-y-2">
          {coaches.map(coach => (
            <CoachRow key={coach.id} coach={coach} />
          ))}
        </div>
      )}
    </div>
  );
}

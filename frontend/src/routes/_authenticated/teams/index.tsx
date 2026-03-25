import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { Shield, ChevronDown, ChevronRight, Loader2, Plus } from 'lucide-react';
import { useTeamsApi, useTeamMembers, useCreateTeam } from '@/hooks/api/use-teams-api';
import type { TeamRead } from '@/hooks/api/use-teams-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const Route = createFileRoute('/_authenticated/teams/')({
  component: TeamsPage,
});

function TeamRow({ team }: { team: TeamRead }) {
  const [expanded, setExpanded] = useState(false);
  const { data: members, isLoading } = useTeamMembers(expanded ? team.id : null);

  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-900/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-zinc-500 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
        )}
        <Shield className="h-4 w-4 text-zinc-500 shrink-0" />
        <span className="text-sm font-medium text-zinc-200">{team.name}</span>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800 px-4 py-3">
          {team.coach_email && (
            <p className="text-xs text-zinc-500 mb-3">
              Coach: <span className="text-zinc-400">{team.coach_email}</span>
            </p>
          )}
          {isLoading ? (
            <div className="flex items-center gap-2 text-zinc-500 text-sm py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading members…
            </div>
          ) : !members || members.length === 0 ? (
            <p className="text-sm text-zinc-600 py-1">No members yet.</p>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-400 shrink-0">
                    {(m.first_name?.[0] ?? m.email?.[0] ?? '?').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm text-zinc-300">
                      {[m.first_name, m.last_name].filter(Boolean).join(' ') || 'Unnamed'}
                    </p>
                    <p className="text-xs text-zinc-600">{m.email ?? '—'}</p>
                  </div>
                  {m.external_user_id && (
                    <span className="ml-auto text-xs font-mono text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded">
                      {m.external_user_id}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function TeamsPage() {
  const { data: teams, isLoading, error, isError } = useTeamsApi();
  const createTeam = useCreateTeam();
  const [newName, setNewName] = useState('');

  async function handleCreate() {
    if (!newName.trim()) return;
    await createTeam.mutateAsync(newName.trim());
    setNewName('');
  }

  const groupedTeams = useMemo(() => {
    if (!teams) return [];
    const map = new Map<string, { label: string; teams: typeof teams }>();
    for (const team of teams) {
      const key = team.coach_email ?? '__unassigned__';
      const label = team.coach_email ?? 'Unassigned';
      if (!map.has(key)) map.set(key, { label, teams: [] });
      map.get(key)!.teams.push(team);
    }
    // Put unassigned last
    const entries = [...map.entries()].sort(([a], [b]) => {
      if (a === '__unassigned__') return 1;
      if (b === '__unassigned__') return -1;
      return a.localeCompare(b);
    });
    return entries.map(([, v]) => v);
  }, [teams]);

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Teams</h1>
        <p className="text-sm text-zinc-500 mt-1">
          All teams and their members.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Team name…"
          className="bg-zinc-900 border-zinc-800 text-zinc-200"
        />
        <Button
          onClick={handleCreate}
          disabled={createTeam.isPending || !newName.trim()}
          className="gap-1.5"
        >
          {createTeam.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Create
        </Button>
      </div>

      {isError && (
        <div className="rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          Failed to load teams: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : !teams || teams.length === 0 ? (
        <p className="text-sm text-zinc-600">No teams yet.</p>
      ) : (
        <div className="space-y-6">
          {groupedTeams.map((group) => (
            <div key={group.label}>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide mb-2">
                Coach: <span className="text-zinc-400 normal-case tracking-normal">{group.label}</span>
              </p>
              <div className="space-y-2">
                {group.teams.map((team) => (
                  <TeamRow key={team.id} team={team} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

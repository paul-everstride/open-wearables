/**
 * Teams are stored in localStorage as two entries:
 *   ow_teams         → JSON array of team names, e.g. ["Test Team", "Pro Squad"]
 *   ow_user_teams    → JSON object mapping userId → teamName
 */

import { useState, useCallback } from "react";

const TEAMS_KEY = "ow_teams";
const USER_TEAMS_KEY = "ow_user_teams";

function loadTeams(): string[] {
  try {
    const raw = localStorage.getItem(TEAMS_KEY);
    return raw ? JSON.parse(raw) : ["Test Team"];
  } catch {
    return ["Test Team"];
  }
}

function loadUserTeams(): Record<string, string> {
  try {
    const raw = localStorage.getItem(USER_TEAMS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function useTeams() {
  const [teams, setTeamsState] = useState<string[]>(loadTeams);
  const [userTeams, setUserTeamsState] = useState<Record<string, string>>(loadUserTeams);

  const addTeam = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setTeamsState(prev => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      localStorage.setItem(TEAMS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setUserTeam = useCallback((userId: string, team: string) => {
    setUserTeamsState(prev => {
      const next = { ...prev, [userId]: team };
      localStorage.setItem(USER_TEAMS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const getUserTeam = useCallback((userId: string): string => {
    return userTeams[userId] ?? "";
  }, [userTeams]);

  return { teams, userTeams, addTeam, setUserTeam, getUserTeam };
}

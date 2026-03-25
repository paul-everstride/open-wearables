import { useState, useEffect } from 'react';
import { Link as LinkIcon, Check, Copy, Pencil } from 'lucide-react';
import { useUserConnections } from '@/hooks/api/use-health';
import { useUser, useUpdateUser } from '@/hooks/api/use-users';
import {
  useTeamMemberships,
  useTeamsApi,
  useAddTeamMember,
  useRemoveTeamMember,
} from '@/hooks/api/use-teams-api';
import { getTeamColor } from '@/lib/utils/team-colors';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDate, truncateId } from '@/lib/utils/format';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { ConnectionCard } from '@/components/user/connection-card';

interface ProfileSectionProps {
  userId: string;
}

export function ProfileSection({ userId }: ProfileSectionProps) {
  const { data: user, isLoading: userLoading } = useUser(userId);
  const { data: connections, isLoading: connectionsLoading } = useUserConnections(userId);
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser();

  const { data: memberships } = useTeamMemberships();
  const { data: teams } = useTeamsApi();
  const addTeamMember = useAddTeamMember();
  const removeTeamMember = useRemoveTeamMember();

  const userTeam = memberships?.find(m => m.user_id === userId);

  const [copied, setCopied] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isChangingTeam, setIsChangingTeam] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    external_user_id: '',
  });
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  useEffect(() => {
    if (user) {
      setEditForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        external_user_id: user.external_user_id || '',
      });
    }
  }, [user]);

  useEffect(() => {
    setSelectedTeamId(userTeam?.team_id ?? '');
  }, [userTeam]);

  const handleCopyUserId = async () => {
    const success = await copyToClipboard(userId, 'User ID copied to clipboard');
    if (success) { setCopiedUserId(true); setTimeout(() => setCopiedUserId(false), 2000); }
  };

  const handleCopyPairLink = async () => {
    const pairLink = `${window.location.origin}/users/${userId}/pair`;
    const success = await copyToClipboard(pairLink, 'Pairing link copied to clipboard');
    if (success) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const handleEditSubmit = async () => {
    updateUser({
      id: userId,
      data: {
        first_name: editForm.first_name || null,
        last_name: editForm.last_name || null,
        email: editForm.email || null,
        external_user_id: editForm.external_user_id || null,
      },
    });

    if (selectedTeamId !== (userTeam?.team_id ?? '')) {
      setIsChangingTeam(true);
      if (userTeam) {
        await removeTeamMember.mutateAsync({ teamId: userTeam.team_id, userId });
      }
      if (selectedTeamId) {
        await addTeamMember.mutateAsync({ teamId: selectedTeamId, userId });
      }
      setIsChangingTeam(false);
    }

    setIsEditDialogOpen(false);
  };

  const teamColor = userTeam ? getTeamColor(userTeam.team_id, 'dark') : null;

  return (
    <>
      <div className="space-y-6">
        {/* User Information */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">User Information</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
              className="text-zinc-400 hover:text-white"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
          <div className="p-6">
            {userLoading ? (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="h-4 w-16 bg-zinc-800/50 rounded animate-pulse" />
                  <div className="h-5 w-48 bg-zinc-800 rounded animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-16 bg-zinc-800/50 rounded animate-pulse" />
                  <div className="h-5 w-32 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">User ID</p>
                  <div className="flex items-center gap-1.5">
                    <code className="font-mono text-sm text-zinc-300 bg-zinc-800 px-2 py-1 rounded">
                      {truncateId(user?.id ?? '')}
                    </code>
                    <Button variant="ghost" size="icon-sm" onClick={handleCopyUserId}>
                      {copiedUserId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">External User ID</p>
                  <code className="font-mono text-sm text-zinc-300 bg-zinc-800 px-2 py-1 rounded">
                    {user?.external_user_id || '—'}
                  </code>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Email</p>
                  <p className="text-sm text-zinc-300">{user?.email || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Created</p>
                  <p className="text-sm text-zinc-300">{formatDate(user?.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Team</p>
                  {userTeam && teamColor ? (
                    <span
                      className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                      style={{ backgroundColor: teamColor.bg, color: teamColor.text, border: `1px solid ${teamColor.border}` }}
                    >
                      {userTeam.team_name}
                    </span>
                  ) : (
                    <p className="text-sm text-zinc-500">—</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Connected Providers */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-white">Connected Providers</h2>
            <p className="text-xs text-zinc-500 mt-1">
              Wearable devices and health platforms connected to this user
            </p>
          </div>
          <div className="p-6">
            {connectionsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <div key={i} className="p-4 border border-zinc-800 rounded-lg space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-24 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-5 w-16 bg-zinc-800/50 rounded animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-40 bg-zinc-800/50 rounded animate-pulse" />
                      <div className="h-4 w-36 bg-zinc-800/50 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : connections && connections.length > 0 ? (
              <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(400px,1fr))]">
                {connections.map((connection) => (
                  <ConnectionCard key={connection.id} connection={connection} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-zinc-500 mb-4">No providers connected yet</p>
                <Button variant="outline" onClick={handleCopyPairLink}>
                  {copied ? (
                    <><Check className="h-4 w-4 text-emerald-500" />Link Copied!</>
                  ) : (
                    <><LinkIcon className="h-4 w-4" />Copy Pairing Link</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-zinc-300">First Name</Label>
                <Input id="first_name" value={editForm.first_name}
                  onChange={e => setEditForm({ ...editForm, first_name: e.target.value })}
                  placeholder="John" className="bg-zinc-800 border-zinc-700" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-zinc-300">Last Name</Label>
                <Input id="last_name" value={editForm.last_name}
                  onChange={e => setEditForm({ ...editForm, last_name: e.target.value })}
                  placeholder="Doe" className="bg-zinc-800 border-zinc-700" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
              <Input id="email" type="email" value={editForm.email}
                onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="john@example.com" className="bg-zinc-800 border-zinc-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="external_user_id" className="text-zinc-300">External User ID</Label>
              <Input id="external_user_id" value={editForm.external_user_id}
                onChange={e => setEditForm({ ...editForm, external_user_id: e.target.value })}
                placeholder="external-123" className="bg-zinc-800 border-zinc-700" />
              <p className="text-xs text-zinc-500">Optional identifier from your system</p>
            </div>

            {/* Team selector */}
            <div className="space-y-2">
              <Label className="text-zinc-300">Team</Label>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                <button type="button" onClick={() => setSelectedTeamId('')}
                  className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                    selectedTeamId === ''
                      ? 'border-zinc-500 bg-zinc-800 text-white'
                      : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300'
                  }`}>
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-600 shrink-0" />
                  No team
                  {selectedTeamId === '' && <Check className="h-3.5 w-3.5 ml-auto text-zinc-300" />}
                </button>
                {teams?.map(team => {
                  const color = getTeamColor(team.id, 'dark');
                  const isSelected = selectedTeamId === team.id;
                  return (
                    <button key={team.id} type="button" onClick={() => setSelectedTeamId(team.id)}
                      className="w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition hover:opacity-90"
                      style={{
                        backgroundColor: isSelected ? color.bg : 'transparent',
                        color: isSelected ? color.text : '#a1a1aa',
                        borderColor: isSelected ? color.border : '#27272a',
                      }}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color.text }} />
                      {team.name}
                      {isSelected && <Check className="h-3.5 w-3.5 ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={isUpdating || isChangingTeam}>
              {(isUpdating || isChangingTeam) ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

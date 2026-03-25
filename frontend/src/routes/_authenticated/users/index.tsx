import { createFileRoute } from '@tanstack/react-router';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, Users as UsersIcon, Copy, Check, ExternalLink } from 'lucide-react';
import { useUsers, useDeleteUser, useCreateUser } from '@/hooks/api/use-users';
import type { UserCreate, UserQueryParams } from '@/lib/api/types';
import { UsersTable } from '@/components/users/users-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTeams } from '@/hooks/use-teams';

const initialFormState: UserCreate = {
  external_user_id: '',
  first_name: '',
  last_name: '',
  email: '',
};

const DEFAULT_PAGE_SIZE = 9;

export const Route = createFileRoute('/_authenticated/users/')({
  component: UsersPage,
});

function UsersPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserCreate>(initialFormState);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [pairingLink, setPairingLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [queryParams, setQueryParams] = useState<UserQueryParams>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const [teamFilter, setTeamFilter] = useState('');

  const { teams, userTeams, addTeam, setUserTeam, getUserTeam } = useTeams();
  const [newUserTeam, setNewUserTeam] = useState<string>(() => teams[0] ?? 'Test Team');
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [newTeamInput, setNewTeamInput] = useState('');

  const { data, isLoading, isFetching, error, refetch } = useUsers(queryParams);
  const deleteUser = useDeleteUser();
  const createUser = useCreateUser();

  // Pre-populate existing users with "Test Team" on first load
  const didPrePopulate = useRef(false);
  useEffect(() => {
    if (didPrePopulate.current) return;
    const users = data?.items;
    if (!users) return;
    didPrePopulate.current = true;
    for (const user of users) {
      if (getUserTeam(user.id) === '') {
        setUserTeam(user.id, 'Test Team');
      }
    }
  }, [data?.items, getUserTeam, setUserTeam]);

  const handleQueryChange = useCallback((params: UserQueryParams) => {
    setQueryParams(params);
  }, []);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.external_user_id?.trim()) {
      errors.external_user_id = 'External User ID is required';
    } else if (formData.external_user_id.length > 255) {
      errors.external_user_id = 'External User ID must be 255 characters or less';
    }

    if (!formData.first_name?.trim()) {
      errors.first_name = 'First name is required';
    } else if (formData.first_name.length > 100) {
      errors.first_name = 'First name must be 100 characters or less';
    }

    if (!formData.last_name?.trim()) {
      errors.last_name = 'Last name is required';
    } else if (formData.last_name.length > 100) {
      errors.last_name = 'Last name must be 100 characters or less';
    }

    if (!formData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUser = () => {
    if (!validateForm()) return;

    const payload: UserCreate = {
      external_user_id: formData.external_user_id?.trim() || null,
      first_name: formData.first_name?.trim() || null,
      last_name: formData.last_name?.trim() || null,
      email: formData.email?.trim() || null,
    };

    const teamToAssign = newUserTeam;

    createUser.mutate(payload, {
      onSuccess: (newUser) => {
        setFormData(initialFormState);
        setFormErrors({});
        // Assign team
        setUserTeam(newUser.id, teamToAssign);
        // Generate pairing URL
        const baseUrl = window.location.origin;
        const url = `${baseUrl}/users/${newUser.id}/pair`;
        setPairingLink(url);
      },
    });
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setFormData(initialFormState);
    setFormErrors({});
    setPairingLink(null);
    setLinkCopied(false);
    setIsAddingTeam(false);
    setNewTeamInput('');
    setNewUserTeam(teams[0] ?? 'Test Team');
  };

  const handleDeleteUser = () => {
    if (deleteUserId) {
      deleteUser.mutate(deleteUserId, {
        onSuccess: () => {
          setDeleteUserId(null);
        },
      });
    }
  };

  const handleAddNewTeam = () => {
    const trimmed = newTeamInput.trim();
    if (!trimmed) return;
    addTeam(trimmed);
    setNewUserTeam(trimmed);
    setIsAddingTeam(false);
    setNewTeamInput('');
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-medium text-white">Users</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage your platform users
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-zinc-800 rounded-md w-full" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-zinc-800/50 rounded-md" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 text-center">
          <p className="text-zinc-400 mb-4">
            Failed to load users. Please try again.
          </p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  const users = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = data?.pages ?? 0;

  // Filter by team if a team filter is selected
  const filteredUsers = teamFilter
    ? users.filter((u) => getUserTeam(u.id) === teamFilter)
    : users;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-medium text-white">Users</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage your platform users and their wearable connections
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Team filter */}
      {(total > 0 || queryParams.search) && (
        <div className="mb-4">
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-600"
          >
            <option value="">All teams</option>
            {teams.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      )}

      {total > 0 || queryParams.search ? (
        <UsersTable
          data={filteredUsers}
          total={teamFilter ? filteredUsers.length : total}
          page={queryParams.page ?? 1}
          pageSize={queryParams.limit ?? DEFAULT_PAGE_SIZE}
          pageCount={pageCount}
          isLoading={isFetching}
          onDelete={setDeleteUserId}
          isDeleting={deleteUser.isPending}
          onQueryChange={handleQueryChange}
          teamMap={userTeams}
        />
      ) : (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
          <UsersIcon className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400 mb-2">No users found</p>
          <Button
            variant="outline"
            onClick={() => setIsCreateDialogOpen(true)}
            className="mt-4"
          >
            <Plus className="h-4 w-4" />
            Create First User
          </Button>
        </div>
      )}

      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseCreateDialog();
          } else {
            setIsCreateDialogOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-md">
          {pairingLink ? (
            <>
              <DialogHeader>
                <DialogTitle>User Created!</DialogTitle>
                <DialogDescription>
                  Send this link to your athlete. They can use it to connect
                  their WHOOP or other supported devices.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Label className="text-zinc-300">Athlete pairing link</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={pairingLink}
                    className="bg-zinc-800 border-zinc-700 font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={async () => {
                      await navigator.clipboard.writeText(pairingLink);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    }}
                  >
                    {linkCopied ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => window.open(pairingLink, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Once the athlete connects, historical data will be fetched
                  automatically.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={handleCloseCreateDialog}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Create a new user to connect wearable devices and collect
                  health data.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="external_user_id" className="text-zinc-300">
                    External User ID
                  </Label>
                  <Input
                    id="external_user_id"
                    type="text"
                    placeholder="e.g., user_12345 or external system ID"
                    value={formData.external_user_id || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        external_user_id: e.target.value,
                      })
                    }
                    maxLength={255}
                    className="bg-zinc-800 border-zinc-700"
                  />
                  {formErrors.external_user_id && (
                    <p className="text-xs text-red-500">
                      {formErrors.external_user_id}
                    </p>
                  )}
                  <p className="text-[10px] text-zinc-600">
                    Your unique identifier for this user (max 255 characters)
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="first_name" className="text-zinc-300">
                      First Name
                    </Label>
                    <Input
                      id="first_name"
                      type="text"
                      placeholder="John"
                      value={formData.first_name || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, first_name: e.target.value })
                      }
                      maxLength={100}
                      className="bg-zinc-800 border-zinc-700"
                    />
                    {formErrors.first_name && (
                      <p className="text-xs text-red-500">
                        {formErrors.first_name}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="last_name" className="text-zinc-300">
                      Last Name
                    </Label>
                    <Input
                      id="last_name"
                      type="text"
                      placeholder="Doe"
                      value={formData.last_name || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, last_name: e.target.value })
                      }
                      maxLength={100}
                      className="bg-zinc-800 border-zinc-700"
                    />
                    {formErrors.last_name && (
                      <p className="text-xs text-red-500">
                        {formErrors.last_name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-zinc-300">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.doe@example.com"
                    value={formData.email || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="bg-zinc-800 border-zinc-700"
                  />
                  {formErrors.email && (
                    <p className="text-xs text-red-500">{formErrors.email}</p>
                  )}
                </div>
                {/* Team selection */}
                <div className="space-y-1.5">
                  <Label htmlFor="team" className="text-zinc-300">
                    Team
                  </Label>
                  {isAddingTeam ? (
                    <div className="flex items-center gap-2">
                      <Input
                        autoFocus
                        type="text"
                        placeholder="New team name..."
                        value={newTeamInput}
                        onChange={(e) => setNewTeamInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddNewTeam();
                          if (e.key === 'Escape') {
                            setIsAddingTeam(false);
                            setNewTeamInput('');
                          }
                        }}
                        className="bg-zinc-800 border-zinc-700 text-sm"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddNewTeam}
                      >
                        Add
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsAddingTeam(false);
                          setNewTeamInput('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <select
                      id="team"
                      value={newUserTeam}
                      onChange={(e) => {
                        if (e.target.value === '__new__') {
                          setIsAddingTeam(true);
                        } else {
                          setNewUserTeam(e.target.value);
                        }
                      }}
                      className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                    >
                      {teams.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                      <option value="__new__">＋ New team…</option>
                    </select>
                  )}
                </div>
              </div>
              <DialogFooter className="gap-3">
                <Button variant="outline" onClick={handleCloseCreateDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateUser}
                  disabled={createUser.isPending}
                >
                  {createUser.isPending ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteUserId}
        onOpenChange={(open) => !open && setDeleteUserId(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete User?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              user and all associated data including:
            </DialogDescription>
          </DialogHeader>
          <div>
            <ul className="list-disc list-inside text-sm text-zinc-500 space-y-1">
              <li>All wearable device connections</li>
              <li>All health data (sleep, activity)</li>
              <li>All automation triggers for this user</li>
            </ul>
            <div className="mt-4 p-3 bg-zinc-800 rounded-md">
              <p className="text-xs text-zinc-500">User ID:</p>
              <code className="font-mono text-sm text-zinc-300">
                {deleteUserId}
              </code>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setDeleteUserId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

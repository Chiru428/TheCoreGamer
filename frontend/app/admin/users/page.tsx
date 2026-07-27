'use client';

import { useState } from 'react';import { Spinner } from '@/components/ui/Spinner';

import Link from 'next/link';
import useSWR from 'swr';
import { fetchAdminUsers, updateUserRole, deactivateUser } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { formatDate, getInitials } from '@/lib/utils';
import { Search, UserX, BarChart3 } from 'lucide-react';
import { Role, type User } from '@/types';

const roleBadge: Record<string, string> = { ADMIN: 'danger', EDITOR: 'purple', AUTHOR: 'info', USER: 'default', VISITOR: 'default' };

const ROLE_ORDER: Role[] = [Role.ADMIN, Role.EDITOR, Role.AUTHOR, Role.USER, Role.VISITOR];

export default function AdminUsersPage() {
  const { addToast } = useUIStore();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'AUTHORS' | 'USERS'>('AUTHORS');
  const [userToDeactivate, setUserToDeactivate] = useState<{ id: string; displayName: string } | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const { data, mutate, isLoading } = useSWR(['admin-users', search], () => fetchAdminUsers({ search: search || undefined }));
  const users = data?.data || [];

  const handleRoleChange = async (userId: string, role: string) => {
    const res = await updateUserRole(userId, role);
    if (res.success) { addToast({ type: 'success', message: 'Role updated' }); mutate(); }
    else addToast({ type: 'error', message: res.error || 'Failed' });
  };

  const handleDeactivate = async () => {
    if (!userToDeactivate) return;
    setIsDeactivating(true);
    const res = await deactivateUser(userToDeactivate.id, 'Admin deactivation');
    setIsDeactivating(false);
    if (res.success) {
      addToast({ type: 'success', message: `${userToDeactivate.displayName} has been deactivated.` });
      mutate();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to deactivate user' });
    }
    setUserToDeactivate(null);
  };

  const visibleRoles = activeTab === 'AUTHORS' ? [Role.ADMIN, Role.EDITOR, Role.AUTHOR] : [Role.USER, Role.VISITOR];
  const groups = visibleRoles.map((role) => ({
    role,
    users: users.filter((u) => u.role === role),
  })).filter((g) => g.users.length > 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Users</h1>
      <div className="flex items-center gap-2 mb-6 bg-bg-elevated rounded-lg border border-border px-3">
        <Search className="w-4 h-4 text-text-dim" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="flex-1 py-2.5 bg-transparent text-sm text-text-primary outline-none" />
      </div>

      <div className="flex gap-6 mb-6 border-b border-border">
        <button
          onClick={() => setActiveTab('AUTHORS')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'AUTHORS' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-primary'}`}
        >
          Staff & Authors
        </button>
        <button
          onClick={() => setActiveTab('USERS')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'USERS' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-primary'}`}
        >
          Regular Users
        </button>
      </div>

      {isLoading && (
        <div className="p-12 flex flex-col items-center justify-center text-text-muted rounded-xl border border-border">
          <Spinner className="w-8 h-8 animate-spin mb-4 text-accent" />
          <p>Loading users...</p>
        </div>
      )}

      {!isLoading && users.length === 0 && (
        <div className="p-8 text-center text-text-muted rounded-xl border border-border">No users found</div>
      )}

      {!isLoading && groups.map(({ role, users: roleUsers }) => (
        <div key={role} className="mb-6 rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-bg-elevated border-b border-border">
            <Badge variant={roleBadge[role] as 'danger' | 'purple' | 'info' | 'default'}>{role}</Badge>
            <span className="text-sm text-text-muted">{roleUsers.length} {roleUsers.length === 1 ? 'user' : 'users'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated/50">
                <tr>
                  <th className="px-4 py-3 text-left text-text-muted font-medium">User</th>
                  <th className="hidden lg:table-cell px-4 py-3 text-left text-text-muted font-medium">Email</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-text-muted font-medium">Joined</th>
                  <th className="px-4 py-3 text-center text-text-muted font-medium">Change Role</th>
                  <th className="px-4 py-3 text-center text-text-muted font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {roleUsers.map(u => (
                  <UserRow key={u.id} u={u} onRoleChange={handleRoleChange} onDeactivate={setUserToDeactivate} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <Modal isOpen={!!userToDeactivate} onClose={() => setUserToDeactivate(null)} title="Deactivate User">
        <p className="text-text-muted mb-2">
          Are you sure you want to deactivate <strong className="text-text-primary">{userToDeactivate?.displayName}</strong>?
        </p>
        <p className="text-sm text-text-muted mb-6">
          This will reset their role to USER, clear their credentials, and issue a severity-3 strike. This action is logged to the moderation log.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setUserToDeactivate(null)}>Cancel</Button>
          <Button variant="danger" loading={isDeactivating} onClick={handleDeactivate}>Deactivate</Button>
        </div>
      </Modal>
    </div>
  );
}

function UserRow({
  u,
  onRoleChange,
  onDeactivate,
}: {
  u: User;
  onRoleChange: (userId: string, role: string) => void;
  onDeactivate: (target: { id: string; displayName: string }) => void;
}) {
  return (
    <tr className="hover:bg-bg-elevated/50">
      <td className="px-4 py-3">
        <Link href={`/admin/users/${u.id}`} className="flex items-center gap-2 min-w-[120px] hover:text-accent transition-colors">
          {u.avatarUrl ? <img src={u.avatarUrl} alt={u.displayName} className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent-light">{getInitials(u.displayName)}</div>}
          <div className="min-w-0">
            <p className="font-medium text-text-primary truncate max-w-[100px] sm:max-w-none">{u.displayName}</p>
            <p className="text-xs text-text-dim truncate">@{u.username}</p>
          </div>
        </Link>
      </td>
      <td className="hidden lg:table-cell px-4 py-3 text-text-muted">{u.email}</td>
      <td className="hidden md:table-cell px-4 py-3 text-text-muted whitespace-nowrap">{formatDate(u.createdAt)}</td>
      <td className="px-4 py-3 text-center">
        <select value={u.role} onChange={e => onRoleChange(u.id, e.target.value)} className="px-2 py-1 bg-bg-primary border border-border rounded text-xs text-text-primary outline-none focus:border-accent">
          {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          {['ADMIN', 'EDITOR', 'AUTHOR'].includes(u.role) && (
            <Link
              href={`/admin/analytics/authors/${u.id}`}
              title="View Performance"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-bg-elevated border border-border text-text-muted text-xs font-medium hover:border-accent hover:text-accent transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              View Performance
            </Link>
          )}
          <button
            onClick={() => onDeactivate({ id: u.id, displayName: u.displayName })}
            title="Deactivate user"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-danger/10 text-danger text-xs font-medium hover:bg-danger/20 transition-colors"
          >
            <UserX className="w-3.5 h-3.5" />
            Deactivate
          </button>
        </div>
      </td>
    </tr>
  );
}

'use client';

import { useState } from 'react';import { Spinner } from '@/components/ui/Spinner';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetchAdminUserDetail, issueUserStrike, removeUserStrike } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { formatDate, getInitials } from '@/lib/utils';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';

const severityLabels: Record<number, string> = { 1: 'Warning', 2: 'Restriction', 3: 'Ban' };
const severityVariant: Record<number, 'warning' | 'danger' | 'info'> = { 1: 'warning', 2: 'info', 3: 'danger' };

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { addToast } = useUIStore();
  const [reason, setReason] = useState('');
  const [severity, setSeverity] = useState(1);
  const [expiresAt, setExpiresAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { data, mutate, isLoading } = useSWR(['admin-user', id], () => fetchAdminUserDetail(id).then(r => r.data));

  const handleIssueStrike = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setIsSubmitting(true);
    const res = await issueUserStrike(id, {
      reason: reason.trim(),
      severity,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    });
    setIsSubmitting(false);
    if (res.success) {
      addToast({ type: 'success', message: 'Strike issued' });
      setReason('');
      setSeverity(1);
      setExpiresAt('');
      mutate();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to issue strike' });
    }
  };

  const handleRemoveStrike = async (strikeId: string) => {
    setRemovingId(strikeId);
    const res = await removeUserStrike(id, strikeId);
    setRemovingId(null);
    if (res.success) {
      addToast({ type: 'success', message: 'Strike removed' });
      mutate();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to remove strike' });
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-text-muted">
        <Spinner className="w-8 h-8 animate-spin mb-4 text-accent" />
        <p>Loading user...</p>
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-center text-text-muted">User not found</div>;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        {data.avatarUrl ? (
          <img src={data.avatarUrl} alt={data.displayName} className="w-12 h-12 rounded-full" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent-light">
            {getInitials(data.displayName)}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{data.displayName}</h1>
          <p className="text-sm text-text-muted">@{data.username} &middot; {data.email}</p>
        </div>
        <Badge variant="purple" className="ml-auto">{data.role}</Badge>
      </div>

      {data.lockUntil && new Date(data.lockUntil) > new Date() && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20 mb-6">
          <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
          <p className="text-sm font-medium text-text-primary">
            Account restricted until {formatDate(data.lockUntil)}
          </p>
        </div>
      )}

      <section className="bg-bg-surface border border-border rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-text-primary mb-4">Strikes</h2>
        {data.strikes.length === 0 ? (
          <p className="text-sm text-text-muted mb-4">No strikes on this account.</p>
        ) : (
          <ul className="space-y-3 mb-4">
            {data.strikes.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-3 p-4 rounded-xl bg-bg-elevated border border-border">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={severityVariant[s.severity] || 'default'}>{severityLabels[s.severity] || `Severity ${s.severity}`}</Badge>
                    <p className="text-xs text-text-muted">
                      Issued {formatDate(s.issuedAt)}{s.IssuedBy ? ` by ${s.IssuedBy.displayName}` : ''}
                    </p>
                  </div>
                  <p className="text-sm text-text-primary">{s.reason}</p>
                  {s.expiresAt && <p className="text-xs text-text-muted mt-1">Expires {formatDate(s.expiresAt)}</p>}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  loading={removingId === s.id}
                  onClick={() => handleRemoveStrike(s.id)}
                  className="shrink-0"
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleIssueStrike} className="space-y-3 pt-4 border-t border-border">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Issue Strike</h3>
          <div>
            <label className="text-sm font-medium text-text-primary mb-1 block">Reason</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              required
              className="w-full bg-bg-elevated border border-border focus:border-accent rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none resize-y"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-text-primary mb-1 block">Severity</label>
              <select
                value={severity}
                onChange={e => setSeverity(Number(e.target.value))}
                className="w-full bg-bg-elevated border border-border focus:border-accent rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none"
              >
                <option value={1}>1 - Warning</option>
                <option value={2}>2 - Restriction</option>
                <option value={3}>3 - Ban</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary mb-1 block">Expiry (optional)</label>
              <input
                type="date"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                className="w-full bg-bg-elevated border border-border focus:border-accent rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none"
              />
            </div>
          </div>
          <Button type="submit" variant="primary" loading={isSubmitting} disabled={!reason.trim()}>Issue Strike</Button>
        </form>
      </section>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, signIn } from 'next-auth/react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  fetchUserProfile, fetchUserSessions, revokeAllSessions, revokeSession,
  exportUserData, deleteAccount, forgotPassword, changePassword, unlinkProvider, fetchUserStrikes,
} from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { formatDate, formatRelativeDate, maskIpDisplay } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import TwoFactorModal from '@/components/auth/TwoFactorModal';
import {
  ShieldCheck, ShieldOff, Monitor, Smartphone, Tablet, LogOut, X,
  Mail, Link2, Shield, Download, Trash2, CheckCircle2, AlertTriangle, ChevronDown,
} from 'lucide-react';
import { FaGoogle, FaDiscord, FaSteam } from 'react-icons/fa';

const OAUTH_PROVIDERS = [
  { id: 'google', label: 'Google', Icon: FaGoogle, color: '#EA4335', enabled: true },
  { id: 'discord', label: 'Discord', Icon: FaDiscord, color: '#5865F2', enabled: true },
  { id: 'steam', label: 'Steam', Icon: FaSteam, color: '#c6d4df', enabled: process.env.NEXT_PUBLIC_STEAM_ENABLED === 'true' },
] as const;

export default function SecuritySettingsPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const { addToast } = useUIStore();
  const router = useRouter();

  const [showConfirm, setShowConfirm] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [tfaEnabled, setTfaEnabled] = useState(false);
  const [tfaLoading, setTfaLoading] = useState(true);
  const [is2faModalOpen, setIs2faModalOpen] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);
  const pendingLinkRef = useRef<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Change password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isPasswordExpanded, setIsPasswordExpanded] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/auth/login?callbackUrl=/settings/security');
      return;
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/user/profile`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        setTfaEnabled(json?.data?.twoFactorEnabled ?? false);
        setTfaLoading(false);
      })
      .catch(() => setTfaLoading(false));
  }, [isLoading, isAuthenticated, router]);

  const { data: sessions, isLoading: sessionsLoading, mutate: mutateSessions } = useSWR(
    isAuthenticated ? 'user-sessions' : null,
    () => fetchUserSessions().then((r) => r.data ?? [])
  );

  const { data: profile, mutate: mutateProfile, isLoading: profileLoading } = useSWR(
    isAuthenticated ? 'profile' : null,
    () => fetchUserProfile().then((r) => r.data)
  );

  const { data: strikes } = useSWR(
    isAuthenticated ? 'user-strikes' : null,
    () => fetchUserStrikes().then((r) => r.data)
  );

  useEffect(() => {
    pendingLinkRef.current = sessionStorage.getItem('tcg_pending_link');
    if (pendingLinkRef.current) sessionStorage.removeItem('tcg_pending_link');
  }, []);

  useEffect(() => {
    if (!pendingLinkRef.current || !profile) return;
    const pending = pendingLinkRef.current;
    pendingLinkRef.current = null;
    const label = OAUTH_PROVIDERS.find((p) => p.id === pending)?.label || pending;
    if (profile.oauthProvider === pending) {
      addToast({ type: 'success', message: `${label} account connected` });
    } else {
      addToast({ type: 'error', message: `Couldn't connect ${label} — that account may already be linked to a different user.` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  if (!isAuthenticated || !user) return null;

  const handleLinkProvider = async (provider: typeof OAUTH_PROVIDERS[number]['id']) => {
    setLinkingProvider(provider);
    try {
      sessionStorage.setItem('tcg_pending_link', provider);
      if (provider === 'steam') {
        window.location.href = '/api/auth/steam';
      } else {
        await signIn(provider, { callbackUrl: '/settings/security' });
      }
    } catch {
      sessionStorage.removeItem('tcg_pending_link');
      addToast({ type: 'error', message: `Failed to connect ${provider}` });
      setLinkingProvider(null);
    }
  };

  const handleSendPasswordReset = async () => {
    setSendingReset(true);
    const res = await forgotPassword(user.email);
    setSendingReset(false);
    if (res.success) {
      addToast({ type: 'success', message: `Password reset link sent to ${user.email}` });
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to send reset link' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      addToast({ type: 'error', message: 'New password must be at least 8 characters long.' });
      return;
    }
    setIsChangingPassword(true);
    const res = await changePassword(currentPassword, newPassword);
    setIsChangingPassword(false);
    if (res.success) {
      addToast({ type: 'success', message: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      mutateProfile();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to change password.' });
    }
  };

  const handleUnlinkProvider = async () => {
    setIsUnlinking(true);
    const res = await unlinkProvider();
    setIsUnlinking(false);
    if (res.success) {
      addToast({ type: 'success', message: res.message || 'Account disconnected' });
      mutateProfile();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to disconnect account' });
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportUserData();
      const text = await blob.text();
      const jsonData = JSON.parse(text);
      const { generateExportHtml } = await import('@/lib/exportTemplate');
      const htmlStr = generateExportHtml(jsonData);
      const htmlBlob = new Blob([htmlStr], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(htmlBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'thecoregamer-data.html';
      a.click();
      URL.revokeObjectURL(url);
      addToast({ type: 'success', message: 'Data exported' });
    } catch (err) {
      console.error('Export failed', err);
      addToast({ type: 'error', message: 'Failed to export data' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText.trim() !== 'DELETE') {
      addToast({ type: 'error', message: 'Please type DELETE to confirm' });
      return;
    }
    setIsDeleting(true);
    const res = await deleteAccount(deletePassword);
    setIsDeleting(false);
    if (res.success) {
      setShowDeleteModal(false);
      addToast({ type: 'success', message: 'Your account has been deleted.' });
      await signOut({ callbackUrl: '/' });
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to delete account' });
    }
  };

  const handleRevokeDevice = async (id: string) => {
    setRevokingId(id);
    const res = await revokeSession(id);
    setRevokingId(null);
    if (res.success) {
      addToast({ type: 'success', message: 'Device signed out' });
      mutateSessions();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to sign out device' });
    }
  };

  const handleSignOutEverywhere = async () => {
    setIsRevoking(true);
    const res = await revokeAllSessions();
    setIsRevoking(false);
    setShowConfirm(false);
    if (res.success) {
      addToast({ type: 'success', message: 'Signed out of all devices.' });
      await signOut({ callbackUrl: '/auth/login' });
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to sign out everywhere' });
    }
  };

  // ── Shared styles ──────────────────────────────────────────────────────────
  const inputCls = 'w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 text-black dark:text-white rounded-xl pl-4 pr-4 py-3 text-[15px] outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-[#555]';
  // Each row inside a grouped container
  const rowCls = 'flex items-center gap-4 px-5 py-4 border-b border-border dark:border-white/[0.07] last:border-0';

  return (
    <div className="space-y-10 w-full" style={{ fontFamily: "'Gibson', sans-serif" }}>

      {/* ── Account Standing ── */}
      <div>
        <div className="mb-4">
          <h3 className="text-[18px] font-bold text-text-primary">Account Standing</h3>
          <p className="text-[13px] text-text-muted mt-0.5">Your current moderation status on TheCoreGamer.</p>
        </div>
        <div className="rounded-xl border border-border dark:border-white/[0.08] overflow-hidden">
          {!strikes || strikes.length === 0 ? (
            <div className={rowCls}>
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-text-primary">Good Standing</p>
                <p className="text-[13px] text-text-muted mt-0.5">Your account has no active warnings or strikes.</p>
              </div>
              <span className="text-[12px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5 shrink-0">
                Active
              </span>
            </div>
          ) : (
            <>
              <div className={rowCls}>
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-text-primary">
                    {strikes.length} active {strikes.length === 1 ? 'warning' : 'warnings'}
                  </p>
                  <p className="text-[13px] text-text-muted mt-0.5">
                    Think this is a mistake?{' '}
                    <Link href="/contact" className="text-accent hover:underline">Appeal this decision</Link>.
                  </p>
                </div>
              </div>
              {strikes.map((s) => (
                <div key={s.id} className={rowCls}>
                  <div className="w-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-text-primary">{s.reason}</p>
                    <p className="text-[13px] text-text-muted mt-0.5">
                      Issued {formatDate(s.issuedAt)}
                      {s.expiresAt && <> · Expires {formatDate(s.expiresAt)}</>}
                    </p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Authentication ── */}
      <div>
        <div className="mb-4">
          <h3 className="text-[18px] font-bold text-text-primary">Authentication</h3>
          <p className="text-[13px] text-text-muted mt-0.5">Manage your password and two-factor authentication.</p>
        </div>
        <div className="rounded-xl border border-border dark:border-white/[0.08] overflow-hidden">
          {/* Password Section */}
          <div className="border-b border-border dark:border-white/[0.07] p-5">
            <button 
              type="button"
              onClick={() => setIsPasswordExpanded(!isPasswordExpanded)}
              className="w-full flex items-start gap-4 text-left group"
            >
              <Shield className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-text-primary transition-colors">Password</p>
                <p className="text-[13px] text-text-muted mt-0.5">
                  {profile?.hasPassword 
                    ? 'Update your password or request a reset link.' 
                    : 'You haven\'t set a password yet. Send a setup link to your email to create one.'}
                </p>
              </div>
              <ChevronDown className={`w-5 h-5 text-text-muted transition-transform shrink-0 mt-0.5 ${isPasswordExpanded ? 'rotate-180' : ''}`} />
            </button>

            {isPasswordExpanded && (
              <div className="pl-9 space-y-4 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                {profile?.hasPassword ? (
                  <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
                    <div>
                      <input
                        type="password"
                        placeholder="Current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className={inputCls}
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="password"
                        placeholder="New password (min. 8 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={inputCls}
                        required
                        minLength={8}
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <Button type="submit" variant="auth" size="sm" loading={isChangingPassword}>
                        Change Password
                      </Button>
                      <Button type="button" variant="ghost" size="sm" loading={sendingReset} onClick={handleSendPasswordReset}>
                        Send reset link
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button variant="outline" size="sm" loading={sendingReset} onClick={handleSendPasswordReset}>
                    Send Setup Link
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* 2FA row */}
          {tfaLoading ? (
            <div className={rowCls}>
              <div className="w-5 h-5 shimmer rounded shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-44 shimmer rounded" />
                <div className="h-3 w-56 shimmer rounded" />
              </div>
              <div className="h-7 w-24 shimmer rounded-full" />
            </div>
          ) : (
            <div className={rowCls}>
              {tfaEnabled
                ? <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                : <ShieldOff className="w-5 h-5 text-text-muted shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-text-primary">Two-Factor Authentication</p>
                <p className="text-[13px] text-text-muted mt-0.5">
                  {tfaEnabled ? 'Enabled — your account has an extra layer of protection.' : 'Not enabled — add an extra layer of protection.'}
                </p>
              </div>
              <Button variant={tfaEnabled ? 'outline' : 'auth'} size="sm" onClick={() => setIs2faModalOpen(true)}>
                {tfaEnabled ? 'Manage' : 'Enable 2FA'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Social Accounts ── */}
      <div>
        <div className="mb-4">
          <h3 className="text-[18px] font-bold text-text-primary">Social Accounts</h3>
          <p className="text-[13px] text-text-muted mt-0.5">
            {profile?.oauthProvider && !profile?.hasPassword
              ? 'To disconnect, first set a password above — otherwise your account would become unreachable.'
              : 'Connect a social account to sign in faster. Connecting a new provider replaces the current one.'}
          </p>
        </div>
        <div className="rounded-xl border border-border dark:border-white/[0.08] overflow-hidden">
          {profileLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={rowCls}>
                <div className="w-5 h-5 shimmer rounded shrink-0" />
                <div className="flex-1 h-4 shimmer rounded" />
                <div className="h-7 w-20 shimmer rounded-full" />
              </div>
            ))
          ) : OAUTH_PROVIDERS.filter((p) => p.enabled).map(({ id, label, Icon, color }) => {
            const connected = profile?.oauthProvider === id;
            return (
              <div key={id} className={rowCls}>
                <Icon
                  className={`w-5 h-5 shrink-0 ${id === 'steam' ? 'text-[#171a21] dark:text-[#c6d4df]' : ''}`}
                  style={id === 'steam' ? undefined : { color }}
                />
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <p className="text-[15px] font-medium text-text-primary">{label}</p>
                  {connected && (
                    <span className="text-[12px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                      Connected
                    </span>
                  )}
                </div>
                {connected ? (
                  <Button variant="danger" size="sm" loading={isUnlinking} disabled={!profile?.hasPassword} onClick={handleUnlinkProvider}>
                    Disconnect
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" loading={linkingProvider === id} disabled={linkingProvider !== null} onClick={() => handleLinkProvider(id)}>
                    Connect
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Devices & Sign-ins ── */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-[18px] font-bold text-text-primary">Devices & Sign-ins</h3>
            <p className="text-[13px] text-text-muted mt-0.5">Devices that have recently accessed your account.</p>
          </div>
          <Button variant="outline" size="sm" icon={<LogOut className="w-4 h-4" />} onClick={() => setShowConfirm(true)} className="hover:!text-red-500 hover:!border-red-500 shrink-0 whitespace-nowrap">
            Sign out everywhere
          </Button>
        </div>

        {sessionsLoading ? (
          <div className="rounded-xl border border-border dark:border-white/[0.08] overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={rowCls}>
                <div className="w-5 h-5 shimmer rounded shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-40 shimmer rounded" />
                  <div className="h-3 w-56 shimmer rounded" />
                </div>
                <div className="h-7 w-16 shimmer rounded-full" />
              </div>
            ))}
          </div>
        ) : !sessions || sessions.length === 0 ? (
          <div className="rounded-xl border border-border dark:border-white/[0.08] py-10 text-center">
            <p className="text-[15px] text-text-muted">No device history yet.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border dark:border-white/[0.08] overflow-hidden">
            {sessions.map((s) => {
              const DeviceIcon = s.deviceType === 'mobile' ? Smartphone : s.deviceType === 'tablet' ? Tablet : Monitor;
              return (
                <div key={s.id} className={rowCls}>
                  <DeviceIcon className="w-5 h-5 text-text-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[15px] font-medium text-text-primary capitalize">{s.deviceType}</p>
                      {s.isCurrent && (
                        <span className="text-[12px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                          This device
                        </span>
                      )}
                      {s.revoked && (
                        <span className="text-[12px] font-medium text-text-muted border border-border rounded-full px-2 py-0.5">
                          Signed out
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-text-muted mt-0.5">
                      {s.browser}{s.browserVersion ? ` ${s.browserVersion}` : ''}
                      {s.location ? ` · ${s.location}` : ''}
                      {' · '}
                      {s.isCurrent ? 'Active now' : formatRelativeDate(s.lastSeenAt)}
                    </p>
                  </div>
                  {!s.revoked && (
                    <Button variant="outline" size="sm" loading={revokingId === s.id} onClick={() => handleRevokeDevice(s.id)} className="hover:!text-red-500 hover:!border-red-500 shrink-0 whitespace-nowrap">
                      Sign out
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Data & Privacy ── */}
      <div>
        <div className="mb-4">
          <h3 className="text-[18px] font-bold text-text-primary">Data & Privacy</h3>
          <p className="text-[13px] text-text-muted mt-0.5">
            Download a copy of all the data we hold — profile, comments, reviews, bookmarks, and reading lists.
          </p>
        </div>
        <div className="rounded-xl border border-border dark:border-white/[0.08] overflow-hidden">
          <div className={rowCls}>
            <Download className="w-5 h-5 text-text-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-medium text-text-primary">Download My Data</p>
              <p className="text-[13px] text-text-muted mt-0.5">Exported as a structured HTML file.</p>
            </div>
            <Button variant="outline" size="sm" loading={isExporting} onClick={handleExport}>
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* ── Danger Zone ── */}
      <div>
        <div className="mb-4">
          <h3 className="text-[18px] font-bold text-danger">Danger Zone</h3>
          <p className="text-[13px] text-text-muted mt-0.5">Irreversible actions. Please proceed with caution.</p>
        </div>
        <div className="rounded-xl border border-red-500/30 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-red-500/5 transition-colors group"
          >
            <Trash2 className="w-5 h-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[15px] font-medium text-danger">Delete Account</p>
              <p className="text-[13px] text-text-muted mt-0.5">
                Permanently deletes your profile, bookmarks, and reading lists. Comments are anonymised.
              </p>
            </div>
            <X className="w-4 h-4 text-danger opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
          </button>
        </div>
      </div>

      {/* ── Sign out everywhere modal ── */}
      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Sign out everywhere">
        <p className="text-[16px] text-text-muted mb-4">
          This will immediately end all active sessions on every device, including this one. You'll need to sign in again.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setShowConfirm(false)}>Cancel</Button>
          <Button variant="danger" size="sm" loading={isRevoking} onClick={handleSignOutEverywhere}>
            Sign out everywhere
          </Button>
        </div>
      </Modal>

      {/* ── Delete account modal ── */}
      <Modal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteConfirmText(''); setDeletePassword(''); }} title="Delete Account">
        <p className="text-[16px] text-text-muted mb-3">This action is permanent and cannot be undone.</p>
        <p className="text-[16px] text-text-primary mb-2">
          Type <span className="font-semibold">DELETE</span> to confirm:
        </p>
        <input
          type="text"
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          className={`${inputCls} mb-4`}
          placeholder="DELETE"
          autoComplete="off"
        />
        <p className="text-[16px] text-text-primary mb-2">Enter your current password:</p>
        <input
          type="password"
          value={deletePassword}
          onChange={(e) => setDeletePassword(e.target.value)}
          className={`${inputCls} mb-4`}
          placeholder="Current password"
          autoComplete="current-password"
        />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); setDeletePassword(''); }}>Cancel</Button>
          <Button variant="danger" size="sm" loading={isDeleting} disabled={deleteConfirmText.trim() !== 'DELETE' || !deletePassword} onClick={handleDelete}>
            Delete My Account
          </Button>
        </div>
      </Modal>

      <TwoFactorModal
        isOpen={is2faModalOpen}
        onClose={() => setIs2faModalOpen(false)}
        isEnabled={tfaEnabled}
        onStatusChange={(enabled) => {
          setTfaEnabled(enabled);
          mutateProfile();
        }}
      />
    </div>
  );
}

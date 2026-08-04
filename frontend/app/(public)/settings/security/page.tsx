'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, signIn } from 'next-auth/react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  fetchUserProfile, fetchUserSessions, revokeAllSessions, revokeSession,
  exportUserData, deleteAccount, forgotPassword, unlinkProvider, fetchUserStrikes,
} from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { formatDate, formatRelativeDate, maskIpDisplay } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import {
  ShieldCheck, ShieldOff, Monitor, Smartphone, Tablet, LogOut, X,
  Mail, Link2, Shield, Download, Trash2, CheckCircle2, AlertTriangle,
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
  const [sendingReset, setSendingReset] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);
  const pendingLinkRef = useRef<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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

  // signIn() for OAuth providers does a full-page redirect, so we can't read the
  // result of a "Connect" click directly — stash which provider we attempted in
  // sessionStorage and diff the profile against it once we're back on this page.
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

  const inputCls = 'w-full bg-gray-50 dark:bg-[#222222] border border-gray-200 dark:border-white/[0.06] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-black dark:text-white rounded-xl pl-4 pr-4 py-3 text-[15px] outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-[#555]';

  return (
    <div className="space-y-8 w-full" style={{ fontFamily: "'Gibson', sans-serif" }}>


      {/* Account Standing */}
      <section className="bg-bg-surface dark:bg-[#3A3F4A] border border-border rounded-2xl p-6">
        <h3 className="text-[20px] font-bold text-text-primary mb-4">Account Standing</h3>
        {!strikes || strikes.length === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-600/10 dark:bg-emerald-400/10 border border-emerald-600/20 dark:border-emerald-400/20">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-[16px] font-medium text-text-primary">Your account is in good standing</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-600/10 dark:bg-amber-400/10 border border-amber-600/20 dark:border-amber-400/20">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-[16px] font-medium text-text-primary">
                {strikes.length} active {strikes.length === 1 ? 'warning' : 'warnings'} on your account
              </p>
            </div>
            <ul className="space-y-2">
              {strikes.map((s) => (
                <li key={s.id} className="p-4 rounded-xl dark:bg-[#3A3F4A] border border-border dark:border-white/20">
                  <p className="text-[16px] text-text-primary">{s.reason}</p>
                  <p className="text-[14px] text-text-muted mt-1">
                    Issued {formatDate(s.issuedAt)}
                    {s.expiresAt && <> &middot; Expires {formatDate(s.expiresAt)}</>}
                  </p>
                </li>
              ))}
            </ul>
            <p className="text-[16px] text-text-muted">
              Think this is a mistake?{' '}
              <Link href="/contact" className="text-accent hover:underline">Appeal this decision</Link>.
            </p>
          </div>
        )}
      </section>

      {/* Change Password + Two-Factor Authentication */}
      <section className="bg-bg-surface dark:bg-[#3A3F4A] border border-border rounded-2xl p-6">
        <h3 className="text-[20px] font-bold text-text-primary mb-5">Authentication</h3>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 p-4 rounded-xl dark:bg-[#3A3F4A] border border-border dark:border-white/20">
            <div>
              <p className="text-[16px] font-medium text-text-primary flex items-center gap-2"><Mail className="w-4 h-4" /> Change Password</p>
              <p className="text-[14px] text-text-muted mt-0.5">We'll email you a secure link to set a new password.</p>
            </div>
            <Button variant="outline" size="sm" loading={sendingReset} onClick={handleSendPasswordReset}>
              Send Reset Link
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 p-4 rounded-xl dark:bg-[#3A3F4A] border border-border dark:border-white/20">
            {tfaLoading ? (
              <div className="flex-1 space-y-2 w-full">
                <div className="h-5 w-48 shimmer rounded" />
                <div className="h-4 w-64 shimmer rounded" />
              </div>
            ) : (
              <>
                <div>
                  <p className="text-[16px] font-medium text-text-primary flex items-center gap-2">
                    {tfaEnabled ? <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <ShieldOff className="w-4 h-4 text-text-muted" />}
                    Two-Factor Authentication
                  </p>
                  <p className="text-[14px] text-text-muted mt-0.5">
                    {tfaEnabled ? 'Enabled — your account has an extra layer of protection.' : 'Not enabled — add an extra layer of protection.'}
                  </p>
                </div>
                <Link href="/settings/profile/2fa">
                  <Button variant={tfaEnabled ? 'outline' : 'auth'} size="sm">
                    {tfaEnabled ? 'Manage' : 'Enable 2FA'}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Linked Accounts */}
      <section className="bg-bg-surface dark:bg-[#3A3F4A] border border-border rounded-2xl p-6">
        <h3 className="text-[20px] font-bold text-text-primary mb-5 flex items-center gap-2">
          <Link2 className="w-5 h-5" /> Linked Accounts
        </h3>
        <div className="space-y-3">
          {profileLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[72px] shimmer rounded-xl w-full" />
            ))
          ) : OAUTH_PROVIDERS.filter((p) => p.enabled).map(({ id, label, Icon, color }) => {
            const connected = profile?.oauthProvider === id;
            return (
              <div key={id} className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 p-4 rounded-xl dark:bg-[#3A3F4A] border border-border dark:border-white/20">
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 shrink-0 ${id === 'steam' ? 'text-[#171a21] dark:text-[#c6d4df]' : ''}`} style={id === 'steam' ? undefined : { color }} />
                  <p className="text-[16px] font-medium text-text-primary">{label}</p>
                  {connected && (
                    <span className="text-[14px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-600/10 dark:bg-emerald-400/10 border border-emerald-600/20 dark:border-emerald-400/20 rounded-full px-2.5 py-0.5">
                      Connected
                    </span>
                  )}
                </div>
                {connected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    loading={isUnlinking}
                    disabled={!profile?.hasPassword}
                    onClick={handleUnlinkProvider}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    loading={linkingProvider === id}
                    disabled={linkingProvider !== null}
                    onClick={() => handleLinkProvider(id)}
                  >
                    Connect
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[14px] text-text-muted mt-4">
          {profile?.oauthProvider && !profile?.hasPassword
            ? 'To disconnect, first set a password using "Send Reset Link" above — otherwise your account would become unreachable.'
            : 'Connecting a new provider replaces whichever one is currently linked.'}
        </p>
      </section>

      {/* Devices & Sign-ins */}
      <section className="bg-bg-surface dark:bg-[#3A3F4A] border border-border rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-5">
          <h3 className="text-[20px] font-bold text-text-primary">Devices & Sign-ins</h3>
          <Button variant="danger" size="sm" icon={<LogOut className="w-4 h-4" />} onClick={() => setShowConfirm(true)}>
            Sign out everywhere
          </Button>
        </div>
        <p className="text-[16px] text-text-muted mb-4">
          Devices that have signed into your account. "Sign out everywhere" ends all active sessions including this one.
        </p>

        {sessionsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 shimmer rounded-xl" />
            ))}
          </div>
        ) : !sessions || sessions.length === 0 ? (
          <p className="text-[16px] text-text-muted text-center py-8">No device history yet.</p>
        ) : (
          <div className="rounded-2xl overflow-hidden border border-border">
            {sessions.map((s, i) => {
              const Icon = s.deviceType === 'mobile' ? Smartphone : s.deviceType === 'tablet' ? Tablet : Monitor;
              return (
                <div
                  key={s.id}
                  className={`flex flex-col gap-4 px-5 py-5 dark:bg-[#3A3F4A] ${i < sessions.length - 1 ? 'border-b border-border dark:border-white/20' : ''}`}
                >
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-5 h-5 text-text-primary shrink-0" />
                      {s.isCurrent && (
                        <span className="text-[14px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-600/10 dark:bg-emerald-400/10 border border-emerald-600/20 dark:border-emerald-400/20 rounded-full px-2 py-0.5 shrink-0">
                          This device
                        </span>
                      )}
                      {s.revoked && (
                        <span className="text-[14px] font-medium text-text-muted bg-bg-surface border border-border rounded-full px-2.5 py-1 shrink-0">
                          Signed out
                        </span>
                      )}
                    </div>
                    
                    <p className="text-[15px] text-text-primary">
                      <span className="font-semibold w-32 inline-block">Device type</span> 
                      <span className="capitalize">{s.deviceType}</span>
                    </p>
                    
                    <p className="text-[15px] text-text-primary">
                      <span className="font-semibold w-32 inline-block">Browser</span> 
                      {s.browser} {s.browserVersion || ''}
                    </p>
                    
                    <p className="text-[15px] text-text-primary">
                      <span className="font-semibold w-32 inline-block">First logged in</span> 
                      {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} @ {new Date(s.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })} (UTC)
                    </p>

                    <p className="text-[15px] text-text-primary">
                      <span className="font-semibold w-32 inline-block">Last active</span> 
                      {s.isCurrent ? "Right now" : (
                        <>{new Date(s.lastSeenAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} @ {new Date(s.lastSeenAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })} (UTC)</>
                      )}
                    </p>
                    
                    {s.location && (
                      <p className="text-[15px] text-text-primary">
                        <span className="font-semibold w-32 inline-block">Location</span> 
                        {s.location}
                      </p>
                    )}
                  </div>
                  
                  {!s.revoked && (
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        loading={revokingId === s.id}
                        onClick={() => handleRevokeDevice(s.id)}
                      >
                        Sign out
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Data & Privacy */}
      <section className="bg-bg-surface dark:bg-[#3A3F4A] border border-border rounded-2xl p-6">
        <h3 className="text-[20px] font-bold text-text-primary mb-2 flex items-center gap-2">
          <Shield className="w-5 h-5" /> Data & Privacy
        </h3>
        <p className="text-[16px] text-text-muted mb-4">
          Download a copy of all the data we hold about your account — profile, comments, reviews, bookmarks, and reading lists.
        </p>
        <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />} loading={isExporting} onClick={handleExport}>
          Download My Data
        </Button>
      </section>

      {/* Delete Account */}
      <section className="bg-bg-surface dark:bg-[#3A3F4A] border border-red-500 rounded-2xl p-6">
        <h3 className="text-[20px] font-bold text-danger mb-2">Delete Account</h3>
        <p className="text-[16px] text-text-muted mb-4">This action is permanent and cannot be undone.</p>
        <ul className="text-[16px] text-text-muted mb-4 space-y-1.5 list-disc pl-5">
          <li><span className="text-text-primary font-medium">Deleted:</span> bookmarks, reading lists, and push subscriptions.</li>
          <li><span className="text-text-primary font-medium">Cleared:</span> your profile (name, username, avatar, bio, email, password) and any comments — threads remain intact but are no longer linked to you.</li>
        </ul>
        <Button variant="danger" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => setShowDeleteModal(true)}>
          Delete Account
        </Button>
      </section>

      {/* Sign out everywhere modal */}
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

      {/* Delete account modal */}
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
    </div>
  );
}

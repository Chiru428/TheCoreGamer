'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useSWR from 'swr';
import {
  fetchUserProfile, updateUserProfile, uploadImage,
} from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useProfileModalStore } from '@/store/profileModalStore';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { Camera, Upload, Edit2, Globe, Lock, ExternalLink } from 'lucide-react';
import { FaXTwitter, FaLinkedin } from 'react-icons/fa6';

const ROLE_BADGE_VARIANT: Record<string, 'danger' | 'purple' | 'info'> = {
  ADMIN: 'danger',
  EDITOR: 'purple',
  AUTHOR: 'info',
};

function obfuscateEmail(email: string) {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  const obfuscatedLocal = local.replace(/\d+/g, '****');
  return `${obfuscatedLocal}@${domain}`;
}

const profileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  username: z.string().min(3, 'Min 3 characters').regex(/^[a-zA-Z0-9_-]+$/, 'Letters, numbers, hyphens only'),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().optional(),
  authorBio: z.string().max(1000).optional(),
  expertise: z.string().optional(),
  yearsExperience: z.union([z.number(), z.string()]).optional().transform(val => val === '' || val === undefined ? null : Number(val)),
  twitterHandle: z.string().max(100).optional().nullable(),
  linkedinUrl: z.union([z.string().url(), z.literal('')]).optional().nullable(),
});



export default function AccountSettingsPage() {
  const { user, setUser, isAuthenticated, isLoading } = useAuthStore();
  const { addToast } = useUIStore();
  const openProfile = useProfileModalStore((s) => s.openProfile);
  const router = useRouter();
  const { update: updateSession } = useSession();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/login?callbackUrl=/settings/profile');
    }
  }, [isLoading, isAuthenticated, router]);

  const { data: profile, mutate: mutateProfile, isLoading: isProfileLoading } = useSWR(
    isAuthenticated ? 'profile' : null,
    () => fetchUserProfile().then((r) => r.data)
  );

  const { register, handleSubmit, setError, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(profileSchema),
    values: profile ? {
      displayName: profile.displayName,
      username: profile.username,
      bio: profile.bio || '',
      avatarUrl: profile.avatarUrl || '',
      authorBio: profile.authorBio || '',
      expertise: profile.expertise ? profile.expertise.join(', ') : '',
      yearsExperience: profile.yearsExperience ?? '',
      twitterHandle: profile.twitterHandle || '',
      linkedinUrl: profile.linkedinUrl || '',
    } : undefined,
  });

  const currentAvatarUrl = watch('avatarUrl');
  const isStaffUser = ['ADMIN', 'EDITOR', 'AUTHOR'].includes(user?.role || '');
  const latestVisibilityRef = useRef<'PUBLIC' | 'PRIVATE' | null>(null);

  const handleVisibilityChange = async (value: 'PUBLIC' | 'PRIVATE') => {
    if (!profile || profile.profileVisibility === value) return;
    latestVisibilityRef.current = value;
    const previous = profile;
    mutateProfile({ ...profile, profileVisibility: value }, { revalidate: false });
    const res = await updateUserProfile({ profileVisibility: value });
    if (latestVisibilityRef.current !== value) return;
    if (res.success && res.data) {
      mutateProfile(res.data, { revalidate: false });
    } else {
      mutateProfile(previous, { revalidate: false });
      addToast({ type: 'error', message: res.error || 'Failed to update privacy setting' });
    }
  };

  const usernameCooldownUntil = profile?.usernameCooldownUntil
    ? new Date(profile.usernameCooldownUntil)
    : null;
  const usernameLocked = !!usernameCooldownUntil && usernameCooldownUntil > new Date();

  if (!isAuthenticated || !user) return null;

  const onSubmitProfile = async (data: any) => {
    const payload = { ...data };
    if (typeof payload.expertise === 'string') {
      payload.expertise = payload.expertise.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    const res = await updateUserProfile(payload);
    if (res.success && res.data) {
      mutateProfile();
      await updateSession({ avatarUrl: res.data.avatarUrl, displayName: res.data.displayName, username: res.data.username });
      setUser(res.data as any);
      addToast({ type: 'success', message: 'Profile updated' });
      setIsEditingProfile(false);
    } else {
      if ((res as { nextAllowedAt?: string }).nextAllowedAt) {
        setError('username', { type: 'server', message: res.error });
        mutateProfile();
      } else if (res.fieldErrors) {
        Object.entries(res.fieldErrors).forEach(([field, messages]) => {
          setError(field as any, { type: 'server', message: messages[0] });
        });
      } else {
        addToast({ type: 'error', message: res.error || 'Failed to update profile' });
      }
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const res = await uploadImage(file);
    setUploadingAvatar(false);
    if (res.success && res.data?.url) {
      setValue('avatarUrl', res.data.url, { shouldDirty: true });
      addToast({ type: 'success', message: 'Image uploaded' });
    } else {
      addToast({ type: 'error', message: res.error || 'Upload failed' });
    }
  };

  const publicUsername = profile?.username ?? user?.username ?? '';

  // Shared classes
  const inputCls = 'w-full bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 text-black dark:text-white rounded-xl pl-4 pr-4 py-3 text-[15px] outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-[#555]';
  const rowCls = 'flex items-center gap-4 px-5 py-4 border-b border-border dark:border-white/[0.07] last:border-0 transition-colors';

  // ── Loading skeleton ──────────────────────────────────────────────
  if (isProfileLoading) {
    return (
      <div className="space-y-10 w-full animate-pulse" style={{ fontFamily: "'Gibson', sans-serif" }}>
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="w-24 h-6 bg-gray-200 dark:bg-white/[0.06] rounded-md mb-1" />
              <div className="w-48 h-4 bg-gray-200 dark:bg-white/[0.06] rounded-md" />
            </div>
            <div className="w-28 h-8 bg-gray-200 dark:bg-white/[0.06] rounded-full" />
          </div>
          <div className="rounded-xl border border-border dark:border-white/[0.08] overflow-hidden">
            <div className={rowCls}>
              <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-white/[0.06] shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="w-48 h-6 bg-gray-200 dark:bg-white/[0.06] rounded-md" />
                <div className="w-32 h-4 bg-gray-200 dark:bg-white/[0.06] rounded-full" />
              </div>
            </div>
            {[1, 2].map(i => (
              <div key={i} className={rowCls}>
                <div className="w-5 h-5 bg-gray-200 dark:bg-white/[0.06] rounded shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="w-16 h-3 bg-gray-200 dark:bg-white/[0.06] rounded-md" />
                  <div className="w-44 h-4 bg-gray-200 dark:bg-white/[0.06] rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────
  return (
    <div className="space-y-10 w-full" style={{ fontFamily: "'Gibson', sans-serif" }}>

      {/* ── Profile Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[18px] font-bold text-text-primary">Profile Details</h3>
          <p className="text-[13px] text-text-muted mt-0.5">Manage your personal information and public presence.</p>
        </div>
        {!isEditingProfile && (
          <Button
            variant="outline"
            size="sm"
            icon={<Edit2 className="w-3.5 h-3.5" />}
            onClick={() => setIsEditingProfile(true)}
            className="shrink-0 whitespace-nowrap"
          >
            Edit Profile
          </Button>
        )}
      </div>

      {/* ── VIEW MODE ── */}
      {!isEditingProfile ? (
        <div className="space-y-8">
          
          <div className="rounded-xl border border-border dark:border-white/[0.08] overflow-hidden">
            
            {/* Avatar + name hero row */}
            <div className={rowCls}>
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden shrink-0"
                style={{ boxShadow: '0 0 0 2px rgba(29,132,245,0.45)' }}
              >
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-2xl">
                    {profile?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <h4 className="text-[18px] sm:text-[20px] font-bold text-text-primary truncate">
                    {profile?.displayName}
                  </h4>
                  {profile?.role && ROLE_BADGE_VARIANT[profile.role] && (
                    <Badge variant={ROLE_BADGE_VARIANT[profile.role]}>{profile.role}</Badge>
                  )}
                </div>
                <p className="text-[14px] text-text-muted">@{profile?.username}</p>
                {(profile?.twitterHandle || profile?.linkedinUrl) && (
                  <div className="flex items-center gap-3 mt-2">
                    {profile?.twitterHandle && (
                      <a
                        href={`https://twitter.com/${profile.twitterHandle.replace(/^@/, '')}`}
                        target="_blank" rel="noreferrer"
                        aria-label={`@${profile.twitterHandle.replace(/^@/, '')} on X`}
                        className="text-black dark:text-white hover:opacity-70 transition-opacity"
                      >
                        <FaXTwitter className="w-4 h-4" />
                      </a>
                    )}
                    {profile?.linkedinUrl && (
                      <a
                        href={profile.linkedinUrl}
                        target="_blank" rel="noreferrer"
                        aria-label="LinkedIn"
                        className="hover:opacity-70 transition-opacity"
                        style={{ color: '#0A66C2' }}
                      >
                        <FaLinkedin className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Email row */}
            {user?.email && (
              <div className={rowCls}>
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-text-primary">Email Address</p>
                  <p className="text-[13px] text-text-muted mt-0.5 break-all">{obfuscateEmail(user.email)}</p>
                </div>
              </div>
            )}

            {/* Bio row */}
            <div className={rowCls}>
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-text-primary">About Me</p>
                <p className="text-[13px] text-text-muted mt-0.5 whitespace-pre-wrap">
                  {profile?.bio || <span className="italic">No bio provided.</span>}
                </p>
              </div>
            </div>

            {/* Expertise tags row */}
            {profile?.expertise && profile.expertise.length > 0 && (
              <div className={rowCls}>
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-text-primary mb-1.5">Expertise</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.expertise.map((tag) => (
                      <span key={tag} className="text-[12px] px-2.5 py-0.5 rounded-full border border-border dark:border-white/[0.12] dark:bg-white/[0.05] text-text-primary font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Public Profile Link row */}
            <div className={rowCls}>
              <ExternalLink className="w-5 h-5 text-text-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-text-primary">Public Profile</p>
                <p className="text-[13px] text-text-muted mt-0.5">
                  {!isStaffUser && profile?.profileVisibility === 'PRIVATE'
                    ? 'Private — others see a brief preview.'
                    : 'Visible to others when they click your name.'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isStaffUser) {
                    router.push(`/authors/${publicUsername}`);
                  } else {
                    openProfile(publicUsername);
                  }
                }}
              >
                View
              </Button>
            </div>
            
          </div>

          {/* ── Privacy — regular users only ── */}
          {!isStaffUser && (
            <div>
              <div className="mb-4">
                <h3 className="text-[18px] font-bold text-text-primary">Privacy</h3>
                <p className="text-[13px] text-text-muted mt-0.5">Control who can see your full profile.</p>
              </div>
              <div className="rounded-xl border border-border dark:border-white/[0.08] overflow-hidden flex flex-col sm:flex-row">
                {(['PUBLIC', 'PRIVATE'] as const).map((option) => {
                  const isActive = (profile?.profileVisibility || 'PUBLIC') === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleVisibilityChange(option)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 px-4 py-4 text-[15px] font-semibold transition-all duration-200 border-b sm:border-b-0 sm:border-r border-border dark:border-white/[0.08] last:border-0',
                        isActive
                          ? 'bg-[rgba(29,132,245,0.08)] text-[#3b9cfb]'
                          : 'text-text-muted hover:bg-black/5 dark:hover:bg-white/[0.03]'
                      )}
                    >
                      {option === 'PUBLIC'
                        ? <><Globe className="w-4 h-4" /> Public</>
                        : <><Lock className="w-4 h-4" /> Private</>
                      }
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
        </div>
      ) : (

        // ── EDIT MODE ──
        <form onSubmit={handleSubmit(onSubmitProfile as never)} className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          
          <div className="rounded-xl border border-border dark:border-white/[0.08] p-5 sm:p-6 space-y-6">
            {/* Avatar upload zone */}
            <div
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-border dark:border-white/[0.12] dark:bg-white/[0.02] cursor-pointer hover:border-blue-500/50 hover:dark:bg-white/[0.04] transition-all group"
              onClick={() => avatarInputRef.current?.click()}
            >
              <div className="relative">
                <div
                  className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/[0.12] group-hover:border-blue-500/50 transition-colors"
                  style={{ boxShadow: '0 0 16px rgba(29,132,245,0.15)' }}
                >
                  {currentAvatarUrl ? (
                    <img src={currentAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-2xl">
                      {profile?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingAvatar ? <Upload className="w-5 h-5 text-white animate-pulse" /> : <Camera className="w-5 h-5 text-white" />}
                </div>
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-text-primary">
                  {uploadingAvatar ? 'Uploading…' : 'Click to change photo'}
                </p>
                <p className="text-[12px] text-text-muted mt-0.5">JPG, PNG or GIF · Max 5 MB</p>
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>

            {/* Display Name + Username — 2 col */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[14px] font-medium text-text-primary mb-1.5 block">Display Name</label>
                <input {...register('displayName')} className={inputCls} placeholder="Your name" />
                {errors.displayName && <p className="text-xs text-danger mt-1">{errors.displayName.message as string}</p>}
              </div>
              <div>
                <label className="text-[14px] font-medium text-text-primary mb-1.5 block">Username</label>
                <input {...register('username')} disabled={usernameLocked} className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`} placeholder="username" />
                {usernameLocked && usernameCooldownUntil && (
                  <p className="text-xs text-text-muted mt-1">
                    Can change again on {usernameCooldownUntil.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}.
                  </p>
                )}
                {errors.username && <p className="text-xs text-danger mt-1">{errors.username.message as string}</p>}
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="text-[14px] font-medium text-text-primary mb-1.5 block">Bio</label>
              <textarea {...register('bio')} rows={3} className={`${inputCls} resize-y`} placeholder="Tell others a little about yourself…" />
              {errors.bio && <p className="text-xs text-danger mt-1">{errors.bio.message as string}</p>}
            </div>

            {/* Social links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[14px] font-medium text-text-primary mb-1.5 block">Twitter / X Handle</label>
                <input {...register('twitterHandle')} placeholder="@username" className={inputCls} />
                {errors.twitterHandle && <p className="text-xs text-danger mt-1">{errors.twitterHandle.message as string}</p>}
              </div>
              <div>
                <label className="text-[14px] font-medium text-text-primary mb-1.5 block">LinkedIn URL</label>
                <input {...register('linkedinUrl')} placeholder="https://linkedin.com/in/…" className={inputCls} />
                {errors.linkedinUrl && <p className="text-xs text-danger mt-1">{errors.linkedinUrl.message as string}</p>}
              </div>
            </div>

            {/* Author-only fields */}
            {isStaffUser && (
              <div className="pt-4 mt-2 border-t border-border dark:border-white/[0.08] space-y-4">
                <div>
                  <h4 className="text-[15px] font-bold text-[#3b9cfb]">Author Profile</h4>
                  <p className="text-[13px] text-text-muted mt-0.5">These fields appear on your public author page.</p>
                </div>

                <div>
                  <label className="text-[14px] font-medium text-text-primary mb-1.5 block">Author Bio</label>
                  <textarea {...register('authorBio')} rows={4} placeholder="Expanded bio for your author page…" className={`${inputCls} resize-y`} />
                  {errors.authorBio && <p className="text-xs text-danger mt-1">{errors.authorBio.message as string}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[14px] font-medium text-text-primary mb-1.5 block">Expertise Tags</label>
                    <input {...register('expertise')} placeholder="e.g. RPGs, Hardware, Indie" className={inputCls} />
                    <p className="text-[12px] text-text-muted mt-1">Comma separated</p>
                    {errors.expertise && <p className="text-xs text-danger mt-1">{errors.expertise.message as string}</p>}
                  </div>
                  <div>
                    <label className="text-[14px] font-medium text-text-primary mb-1.5 block">Years of Experience</label>
                    <input type="number" {...register('yearsExperience')} className={inputCls} />
                    {errors.yearsExperience && <p className="text-xs text-danger mt-1">{errors.yearsExperience.message as string}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="submit" variant="auth" loading={isSubmitting}>Save Changes</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditingProfile(false);
                setValue('displayName', profile?.displayName || '');
                setValue('username', profile?.username || '');
                setValue('bio', profile?.bio || '');
                setValue('avatarUrl', profile?.avatarUrl || '');
                setValue('authorBio', profile?.authorBio || '');
                setValue('expertise', profile?.expertise ? profile.expertise.join(', ') : '');
                setValue('yearsExperience', profile?.yearsExperience ?? '');
                setValue('twitterHandle', profile?.twitterHandle || '');
                setValue('linkedinUrl', profile?.linkedinUrl || '');
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

    </div>
  );
}

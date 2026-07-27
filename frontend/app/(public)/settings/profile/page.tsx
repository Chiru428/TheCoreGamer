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
import { Camera, Upload, Edit2 } from 'lucide-react';
import { FaXTwitter, FaLinkedin } from 'react-icons/fa6';

const ROLE_BADGE_VARIANT: Record<string, 'danger' | 'purple' | 'info'> = {
  ADMIN: 'danger',
  EDITOR: 'purple',
  AUTHOR: 'info',
};

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
    // Update the UI instantly and reconcile with the server in the background —
    // waiting on the round trip made repeated toggles feel sluggish.
    mutateProfile({ ...profile, profileVisibility: value }, { revalidate: false });
    const res = await updateUserProfile({ profileVisibility: value });
    if (latestVisibilityRef.current !== value) return; // superseded by a later click
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

  const inputCls = 'w-full bg-gray-50 dark:bg-[#222222] border border-gray-200 dark:border-white/[0.06] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-black dark:text-white rounded-xl pl-4 pr-4 py-3 text-[13px] outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-[#555]';

  if (isProfileLoading) {
    return (
      <div className="space-y-8 w-full animate-pulse" style={{ fontFamily: "'Rubik', sans-serif" }}>
        <section className="bg-bg-surface dark:bg-[#3A3F4A] border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="w-24 h-6 bg-gray-200 dark:bg-gray-700/50 rounded-md"></div>
            <div className="w-28 h-8 bg-gray-200 dark:bg-gray-700/50 rounded-md"></div>
          </div>
          
          <div className="space-y-6">
            {/* Avatar + Name Skeleton */}
            <div className="flex flex-row items-center gap-4 sm:gap-6">
              <div className="w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] rounded-full bg-gray-200 dark:bg-gray-700/50 shrink-0"></div>
              <div className="flex-1 min-w-0 space-y-3">
                <div className="w-48 h-8 bg-gray-200 dark:bg-gray-700/50 rounded-md"></div>
                <div className="w-32 h-6 bg-gray-200 dark:bg-gray-700/50 rounded-full"></div>
              </div>
            </div>

            {/* Email Skeleton */}
            <div className="dark:bg-[#3A3F4A] rounded-xl p-5 border border-border dark:border-white/20 space-y-3">
              <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700/50 rounded-md mb-3"></div>
              <div className="w-56 h-5 bg-gray-200 dark:bg-gray-700/50 rounded-md"></div>
            </div>

            {/* Bio Skeleton */}
            <div className="dark:bg-[#3A3F4A] rounded-xl p-5 border border-border dark:border-white/20 space-y-3">
              <div className="w-20 h-3 bg-gray-200 dark:bg-gray-700/50 rounded-md mb-3"></div>
              <div className="w-full h-4 bg-gray-200 dark:bg-gray-700/50 rounded-md"></div>
              <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700/50 rounded-md"></div>
            </div>
            
            <hr className="border-border dark:border-white/20 my-6" />
            
            {/* Public Profile Skeleton */}
            <div className="w-32 h-6 bg-gray-200 dark:bg-gray-700/50 rounded-md mb-4"></div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 p-4 rounded-xl dark:bg-[#3A3F4A] border border-border dark:border-white/20">
              <div className="space-y-3 w-full">
                <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700/50 rounded-md"></div>
                <div className="w-64 h-3 bg-gray-200 dark:bg-gray-700/50 rounded-md"></div>
              </div>
              <div className="w-24 h-8 bg-gray-200 dark:bg-gray-700/50 rounded-md shrink-0"></div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full" style={{ fontFamily: "'Rubik', sans-serif" }}>


      {/* Profile card + edit form */}
      <section className="bg-bg-surface dark:bg-[#3A3F4A] border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[20px] font-bold text-text-primary">Profile</h3>
          {!isEditingProfile && (
            <Button variant="outline" size="sm" icon={<Edit2 className="w-4 h-4" />} onClick={() => setIsEditingProfile(true)}>
              Edit Profile
            </Button>
          )}
        </div>

        {!isEditingProfile ? (
          <div className="space-y-6">
            {/* Avatar + name */}
            <div className="flex flex-row items-center gap-4 sm:gap-6">
              <div className="w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] rounded-full bg-border overflow-hidden border-[3px] border-bg-elevated shadow-xl shrink-0">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-2xl sm:text-3xl">
                    {profile?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-xl sm:text-[28px] font-bold text-text-primary truncate">{profile?.displayName}</h4>
                  {profile?.role && ROLE_BADGE_VARIANT[profile.role] && (
                    <Badge variant={ROLE_BADGE_VARIANT[profile.role]}>{profile.role}</Badge>
                  )}
                </div>
                <p className="text-sm sm:text-[16px] font-medium text-text-muted inline-block px-3 py-1 rounded-full border border-border dark:border-white/20 truncate max-w-full">@{profile?.username}</p>
                {(profile?.twitterHandle || profile?.linkedinUrl) && (
                  <div className="flex items-center gap-3 mt-2">
                    {profile?.twitterHandle && (
                      <a
                        href={`https://twitter.com/${profile.twitterHandle.replace(/^@/, '')}`}
                        target="_blank" rel="noreferrer"
                        aria-label={`@${profile.twitterHandle.replace(/^@/, '')} on X`}
                        className="text-black dark:text-white hover:opacity-80 transition-opacity"
                      >
                        <FaXTwitter className="w-5 h-5" />
                      </a>
                    )}
                    {profile?.linkedinUrl && (
                      <a
                        href={profile.linkedinUrl}
                        target="_blank" rel="noreferrer"
                        aria-label="LinkedIn"
                        className="hover:opacity-80 transition-opacity"
                        style={{ color: '#0A66C2' }}
                      >
                        <FaLinkedin className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Email */}
            {user?.email && (
              <div className="dark:bg-[#3A3F4A] rounded-xl p-5 border border-border dark:border-white/20">
                <h5 className="text-[14px] uppercase tracking-wider text-text-muted font-bold mb-3">Email</h5>
                <div className="flex items-center gap-2">
                  <span className="text-[16px] text-text-primary">{user.email}</span>
                </div>
              </div>
            )}

            {/* Bio */}
            <div className="dark:bg-[#3A3F4A] rounded-xl p-5 border border-border dark:border-white/20">
              <h5 className="text-[14px] uppercase tracking-wider text-text-muted font-bold mb-3">About Me</h5>
              <p className="text-[16px] leading-relaxed text-text-primary whitespace-pre-wrap">
                {profile?.bio || <span className="text-text-muted italic">No bio provided.</span>}
              </p>
            </div>

            {/* Expertise tags (view) */}
            {profile?.expertise && profile.expertise.length > 0 && (
              <div className="dark:bg-[#3A3F4A] rounded-xl p-5 border border-border dark:border-white/20">
                <h5 className="text-xs uppercase tracking-wider text-text-muted font-bold mb-3">Expertise</h5>
                <div className="flex flex-wrap gap-1.5">
                  {profile.expertise.map((tag) => (
                    <span key={tag} className="text-[12px] px-3 py-1 rounded-full border border-gray-700 bg-gray-800 text-gray-100 font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmitProfile as never)} className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Avatar upload */}
            <div className="flex flex-row items-center gap-4 sm:gap-6 p-4 rounded-xl border border-border dark:bg-[#3A3F4A]">
              <div className="relative group cursor-pointer shrink-0" onClick={() => avatarInputRef.current?.click()}>
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-border overflow-hidden border-2 border-transparent group-hover:border-accent transition-colors">
                  {currentAvatarUrl ? (
                    <img src={currentAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xl sm:text-2xl">
                      {profile?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingAvatar ? <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-pulse" /> : <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
                </div>
              </div>
              <div className="flex-1 text-sm text-text-muted min-w-0">
                <p className="font-semibold text-text-primary mb-0.5 sm:mb-1 truncate">Profile Picture</p>
                <p className="text-xs sm:text-sm truncate">Click avatar to upload image.</p>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-text-primary mb-1 block">Display Name</label>
              <input {...register('displayName')} className={inputCls} />
              {errors.displayName && <p className="text-xs text-danger mt-1">{errors.displayName.message as string}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-text-primary mb-1 block">Username</label>
              <input {...register('username')} disabled={usernameLocked} className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`} />
              {usernameLocked && usernameCooldownUntil && (
                <p className="text-xs text-text-muted mt-1">
                  Usernames can only be changed once every 30 days. You can change yours again on{' '}
                  {usernameCooldownUntil.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}.
                </p>
              )}
              {errors.username && <p className="text-xs text-danger mt-1">{errors.username.message as string}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-text-primary mb-1 block">Bio</label>
              <textarea {...register('bio')} rows={3} className={`${inputCls} resize-y`} />
              {errors.bio && <p className="text-xs text-danger mt-1">{errors.bio.message as string}</p>}
            </div>

            {/* Social links — all users */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-text-primary mb-1 block">Twitter/X Handle</label>
                <input {...register('twitterHandle')} placeholder="@username" className={inputCls} />
                {errors.twitterHandle && <p className="text-xs text-danger mt-1">{errors.twitterHandle.message as string}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-text-primary mb-1 block">LinkedIn URL</label>
                <input {...register('linkedinUrl')} placeholder="https://linkedin.com/in/..." className={inputCls} />
                {errors.linkedinUrl && <p className="text-xs text-danger mt-1">{errors.linkedinUrl.message as string}</p>}
              </div>
            </div>

            {/* Author-only fields */}
            {isStaffUser && (
              <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl space-y-4">
                <h4 className="text-sm font-bold text-accent">Author Profile Information</h4>
                <p className="text-xs text-text-muted">These fields appear on your public author page.</p>

                <div>
                  <label className="text-sm font-medium text-text-primary mb-1 block">Author Bio</label>
                  <textarea {...register('authorBio')} rows={4} placeholder="Expanded bio for your author page..." className={`${inputCls} resize-y`} />
                  {errors.authorBio && <p className="text-xs text-danger mt-1">{errors.authorBio.message as string}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-text-primary mb-1 block">Expertise Tags</label>
                    <input {...register('expertise')} placeholder="e.g. RPGs, Hardware, Indie" className={inputCls} />
                    <p className="text-[10px] text-text-muted mt-1">Comma separated</p>
                    {errors.expertise && <p className="text-xs text-danger mt-1">{errors.expertise.message as string}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-primary mb-1 block">Years of Experience</label>
                    <input type="number" {...register('yearsExperience')} className={inputCls} />
                    {errors.yearsExperience && <p className="text-xs text-danger mt-1">{errors.yearsExperience.message as string}</p>}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" variant="auth" loading={isSubmitting}>Save Changes</Button>
              <Button type="button" variant="outline" onClick={() => {
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
              }} disabled={isSubmitting}>Cancel</Button>
            </div>
          </form>
        )}

        {/* Public Profile — merged into same card */}
        <hr className="border-border dark:border-white/20 my-6" />
        <h3 className="text-[20px] font-bold text-text-primary mb-4">Public Profile</h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 p-4 rounded-xl dark:bg-[#3A3F4A] border border-border dark:border-white/20">
          <div>
            <p className="text-[16px] font-medium text-text-primary">Your public profile</p>
            <p className="text-[14px] text-text-muted mt-0.5">
              {!isStaffUser && profile?.profileVisibility === 'PRIVATE'
                ? 'Private — others only see a brief preview when they click your name'
                : 'Visible to others when they click your name'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            if (isStaffUser) {
              router.push(`/authors/${publicUsername}`);
            } else {
              openProfile(publicUsername);
            }
          }}>
            View Profile
          </Button>
        </div>
      </section>

      {/* Privacy — regular users only; author/editor/admin profiles always stay public */}
      {!isStaffUser && (
        <section className="bg-bg-surface dark:bg-[#3A3F4A] border border-border rounded-2xl p-6">
          <h3 className="text-lg font-bold text-text-primary mb-2">Privacy</h3>
          <p className="text-sm text-text-muted mb-4">
            Public profiles can be opened by anyone who clicks your name. Private profiles only show a brief preview (avatar, name, likes/comments) — your full profile stays hidden.
          </p>
          <div className="flex gap-3">
            {(['PUBLIC', 'PRIVATE'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleVisibilityChange(option)}
                className={cn(
                  'flex-1 text-center px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors',
                  (profile?.profileVisibility || 'PUBLIC') === option
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-text-muted hover:border-text-dim'
                )}
              >
                {option === 'PUBLIC' ? 'Public' : 'Private'}
              </button>
            ))}
          </div>
        </section>
      )}


    </div>
  );
}

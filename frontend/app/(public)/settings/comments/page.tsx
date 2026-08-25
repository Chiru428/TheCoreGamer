'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetchUserComments } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { MessageSquare, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { renderCommentBody } from '@/components/blog/renderCommentBody';

export default function CommentsSettingsPage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/login?callbackUrl=/settings/comments');
    }
  }, [isLoading, isAuthenticated, router]);

  const { data: comments, isLoading: isSWRLoading } = useSWR(isAuthenticated ? 'user-comments' : null, () => fetchUserComments().then(r => r.data || []));

  if (!isAuthenticated) return null;

  // Shared row class
  const rowCls = 'flex flex-col gap-2 px-5 py-5 border-b border-border dark:border-white/[0.07] last:border-0 transition-colors';

  return (
    <div className="w-full space-y-6" style={{ fontFamily: "'Gibson', sans-serif" }}>

      <div className="mb-6">
        <h3 className="text-[18px] font-bold text-text-primary">Comments</h3>
        <p className="text-[13px] text-text-muted mt-0.5">Your recent comments across articles and games.</p>
      </div>
      
      {isSWRLoading ? (
        <div className="rounded-xl border border-border dark:border-white/[0.08] overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={rowCls}>
              <div className="h-4 w-64 rounded bg-gray-200 dark:bg-white/[0.06] animate-pulse mb-2" />
              <div className="h-3 w-48 rounded bg-gray-200 dark:bg-white/[0.06] animate-pulse" />
            </div>
          ))}
        </div>
      ) : comments?.length ? (
        <div className="rounded-xl border border-border dark:border-white/[0.08] overflow-hidden">
          {comments.map(c => {
            if (!c.article) return null;
            const contentTypeToPath: Record<string, string> = { 
              REVIEW: '/reviews', 
              MOD_GUIDE: '/mod-guides',
              NEWS: '/news',
              GUIDE: '/guides',
              OPINION: '/opinions',
              LISTICLE: '/listicles',
              DEAL: '/deals',
              POLL: '/polls',
            };
            const link = `${contentTypeToPath[c.article.contentType] ?? '/articles'}/${c.article.slug}`;
            return (
              <div key={c.id} className={rowCls + ' hover:bg-black/5 dark:hover:bg-white/[0.02]'}>
                <p className="text-[14px] text-text-muted">
                  On <Link href={link} className="text-accent hover:underline font-medium">{c.article.title}</Link>:
                </p>
                {c.gifUrl && (
                  <div className="mt-1">
                    <img
                      src={c.gifUrl}
                      alt="GIF"
                      className="rounded-lg object-contain border border-border dark:border-white/[0.08]"
                      style={{ maxWidth: '160px', width: '100%', height: 'auto' }}
                    />
                  </div>
                )}
                {(!c.gifUrl || (c.body.trim() && c.body.trim() !== '[GIF]')) && (
                  <p className="text-[15px] text-text-primary whitespace-pre-wrap mt-1">{renderCommentBody(c.body)}</p>
                )}
                <p className="text-[12px] text-text-muted mt-2">{new Date(c.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-border dark:border-white/[0.08] py-16 text-center">
          <MessageSquare className="w-12 h-12 text-text-muted mb-4 mx-auto" />
          <p className="text-[16px] font-semibold text-text-primary">No comments yet</p>
          <p className="text-[14px] text-text-muted mt-1">Join the discussion on our articles.</p>
        </div>
      )}
    </div>
  );
}

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

  return (
    <div className="space-y-8 w-full" style={{ fontFamily: "'Rubik', sans-serif" }}>

      
      {isSWRLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      ) : comments?.length ? (
        <div className="space-y-4">
          {comments.map(c => {
            if (!c.article) return null;
            const contentTypeToPath: Record<string, string> = { 
              NEWS: '/news', 
              REVIEW: '/reviews', 
              MOD_GUIDE: '/mod-guides', 
              WALKTHROUGH: '/articles', 
              OPINION: '/articles', 
              DEAL: '/deals' 
            };
            const link = `${contentTypeToPath[c.article.contentType] ?? '/articles'}/${c.article.slug}`;
            return (
              <div key={c.id} className="bg-bg-surface dark:bg-[#3A3F4A] border border-border rounded-2xl p-5">
                <p className="text-[16px] text-text-muted mb-3">
                  On <Link href={link} className="text-accent-light hover:underline font-medium">{c.article.title}</Link>:
                </p>
                {c.gifUrl && (
                  <div className="mb-2">
                    <img
                      src={c.gifUrl}
                      alt="GIF"
                      className="rounded-lg object-contain border border-border"
                      style={{ maxWidth: '160px', width: '100%', height: 'auto' }}
                    />
                  </div>
                )}
                {(!c.gifUrl || (c.body.trim() && c.body.trim() !== '[GIF]')) && (
                  <p className="text-[16px] text-text-primary whitespace-pre-wrap">{renderCommentBody(c.body)}</p>
                )}
                <p className="text-[14px] text-text-muted mt-3">{new Date(c.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-bg-surface dark:bg-[#3A3F4A] border border-border rounded-2xl">
          <MessageSquare className="w-16 h-16 text-border mb-4" />
          <h3 className="text-[22px] font-semibold text-text-primary mb-2">No comments yet</h3>
          <p className="text-[18px] text-text-muted">Join the discussion on our articles</p>
        </div>
      )}
    </div>
  );
}

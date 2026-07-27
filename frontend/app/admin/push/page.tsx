'use client';

import { useState } from 'react';
import { sendPushNotification } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import Button from '@/components/ui/Button';
import { Bell, Send } from 'lucide-react';

export default function AdminPushPage() {
  const { addToast } = useUIStore();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      addToast({ type: 'error', message: 'Title and body are required.' });
      return;
    }
    setIsSending(true);
    const res = await sendPushNotification({ title: title.trim(), body: body.trim(), url: url.trim() || undefined });
    setIsSending(false);
    if (res.success) {
      addToast({ type: 'success', message: 'Push notification queued for delivery!' });
      setTitle('');
      setBody('');
      setUrl('');
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to send push notification' });
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-text-primary mb-2 flex items-center gap-2">
        <Bell className="w-6 h-6 text-accent" /> Push Notifications
      </h1>
      <p className="text-sm text-text-muted mb-8">
        Broadcast a push notification to all subscribed users. Notifications are queued via BullMQ and delivered immediately.
      </p>

      <div className="rounded-2xl bg-bg-surface border border-border p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Title *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={60}
            placeholder="e.g. New Article: Black Myth Wukong Chapter 2 Guide"
            className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border text-text-primary text-sm outline-none focus:border-accent"
          />
          <p className="text-xs text-text-dim mt-1 text-right">{title.length}/60</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Body *</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            maxLength={180}
            rows={3}
            placeholder="Short notification message…"
            className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border text-text-primary text-sm outline-none focus:border-accent resize-none"
          />
          <p className="text-xs text-text-dim mt-1 text-right">{body.length}/180</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Link URL (optional)</label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://thecoregamer.com/articles/…"
            className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border text-text-primary text-sm outline-none focus:border-accent"
          />
          <p className="text-xs text-text-dim mt-1">Where tapping the notification will take the user.</p>
        </div>

        {/* Preview */}
        {(title || body) && (
          <div className="rounded-xl border border-border bg-bg-elevated p-4">
            <p className="text-xs text-text-dim mb-2 font-medium uppercase tracking-wider">Preview</p>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">{title || 'Notification title'}</p>
                <p className="text-xs text-text-muted">{body || 'Notification body text'}</p>
              </div>
            </div>
          </div>
        )}

        <Button
          variant="primary"
          className="w-full"
          loading={isSending}
          disabled={!title.trim() || !body.trim()}
          onClick={handleSend}
          icon={<Send className="w-4 h-4" />}
        >
          Send Push Notification
        </Button>
      </div>
    </div>
  );
}

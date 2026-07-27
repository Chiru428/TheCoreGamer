'use client';

import { useState, useEffect, useRef } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

function getOrCreateSessionId(): string {
  const key = 'frh_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

interface VoteState {
  helpfulCount: number;
  notHelpfulCount: number;
  userVote: 1 | -1 | null;
}

interface Props {
  slug: string;
}

export default function ModGuideVoteBar({ slug }: Props) {
  const { addToast } = useUIStore();
  const [state, setState] = useState<VoteState | null>(null);
  const voteRequestId = useRef(0);

  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    fetch(`/api/mod-guides/${slug}/vote`, {
      headers: { 'x-session-id': sessionId },
    })
      .then(r => r.json())
      .then(json => { if (json.success) setState(json.data); })
      .catch(() => {});
  }, [slug]);

  const handleVote = async (value: 1 | -1) => {
    if (!state) return;
    // Toggle off if clicking the already-active vote
    const newValue = state.userVote === value ? 0 : value;

    // Apply the toggle instantly so rapid clicks feel responsive — the
    // request-id ref below discards any stale response if the user
    // toggles again before this one comes back.
    const prevState = state;
    setState({
      helpfulCount: state.helpfulCount + (newValue === 1 ? 1 : 0) - (state.userVote === 1 ? 1 : 0),
      notHelpfulCount: state.notHelpfulCount + (newValue === -1 ? 1 : 0) - (state.userVote === -1 ? 1 : 0),
      userVote: newValue === 0 ? null : newValue,
    });

    const requestId = ++voteRequestId.current;
    const sessionId = getOrCreateSessionId();
    try {
      const res = await fetch(`/api/mod-guides/${slug}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
        body: JSON.stringify({ value: newValue }),
      });
      const json = await res.json();
      if (requestId !== voteRequestId.current) return;

      if (json.success) {
        setState(json.data);
        if (newValue !== 0) {
          addToast({ type: 'success', message: 'Thanks for your feedback!' });
        }
      } else {
        setState(prevState);
        addToast({ type: 'error', message: json.error || 'Failed to submit vote' });
      }
    } catch {
      if (requestId !== voteRequestId.current) return;
      setState(prevState);
      addToast({ type: 'error', message: 'Failed to submit vote' });
    }
  };

  if (!state) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-text-primary">
        {state.userVote !== null ? 'Thanks for your feedback!' : 'Was this guide helpful?'}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleVote(1)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 ${
            state.userVote === 1
              ? 'bg-accent text-white border-accent'
              : 'border-border text-text-muted hover:border-accent/50 hover:text-accent'
          }`}
        >
          <ThumbsUp className="w-4 h-4" />
          Yes, helpful ({Math.max(0, state.helpfulCount)})
        </button>
        <button
          onClick={() => handleVote(-1)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 ${
            state.userVote === -1
              ? 'bg-red-500/10 text-red-400 border-red-500/30'
              : 'border-border text-text-muted hover:border-red-500/30 hover:text-red-400'
          }`}
        >
          <ThumbsDown className="w-4 h-4" />
          No ({Math.max(0, state.notHelpfulCount)})
        </button>
      </div>
    </div>
  );
}

'use client';

import useSWR from 'swr';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { fetchPoll } from '@/lib/api';
import type { Poll, PollOption } from '@/types';
import { Loader2, Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/* -- Persistent anonymous session ID ------------------- */
function usePollSessionId() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  useEffect(() => {
    let id = localStorage.getItem('poll_session_id');
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('poll_session_id', id);
    }
    setSessionId(id);
  }, []);
  return sessionId;
}

/* -- Result bar ---------------------------------------- */
function ResultBar({ option, total, isChosen, onViewAnswers, answerCount = 0 }: { option: PollOption; total: number; isChosen: boolean; onViewAnswers?: () => void; answerCount?: number }) {
  const pct = total > 0 ? Math.round((option.voteCount / total) * 100) : 0;
  const [displayPct, setDisplayPct] = useState(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      // Double rAF: first frame paints width:0, second frame triggers the transition
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setDisplayPct(pct));
      });
      return () => cancelAnimationFrame(id);
    }
    setDisplayPct(pct);
  }, [pct]);

  return (
    <div className="py-1">
      {/* Row: circle + label + percentage */}
      <div className="flex items-center gap-3">
        <span className={cn(
          'w-5 h-5 rounded-full border-2 shrink-0',
          isChosen ? 'border-[#00e5a0]' : 'border-border'
        )} />
        <span className="flex-1 text-base font-medium text-text-primary">{option.text}</span>
        <span className={cn('text-sm font-bold shrink-0', isChosen ? 'text-[#00e5a0]' : 'text-text-muted')}>
          {pct}%
        </span>
      </div>
      {/* Progress bar — indented to align with text */}
      <div className="ml-8 mt-1.5 h-[8px] overflow-hidden">
        <div
          className="h-full rounded-r-full"
          style={{ width: `${displayPct}%`, background: 'var(--brand-green)', transition: 'width 4s ease-in-out' }}
        />
      </div>
      {/* View answers button */}
      {onViewAnswers && answerCount > 0 && (
        <div className="ml-8 mt-2 flex justify-start">
          <button
            onClick={onViewAnswers}
            className="text-[11px] font-semibold text-text-muted hover:text-[#00e5a0] transition-colors flex items-center gap-1.5 bg-bg-surface px-2.5 py-1.5 rounded-md border border-border"
          >
            💬 Read {answerCount} response{answerCount !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
}

/* -- Main widget --------------------------------------- */
function PollWidgetInner({ pollId }: { pollId: string }) {
  const { data: session } = useSession();
  const sessionId = usePollSessionId();
  const [voting, setVoting] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<string[]>([]);
  const [customText, setCustomText] = useState<Record<string, string>>({});
  const [viewingCustomAnswersFor, setViewingCustomAnswersFor] = useState<string | null>(null);
  // Persisted anonymous votes — survives page reload without needing the server
  const [localVotes, setLocalVotes] = useState<string[]>([]);

  useEffect(() => {
    if (session?.user) return;
    try {
      const stored = localStorage.getItem(`poll-voted-${pollId}`);
      if (stored) setLocalVotes(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [pollId, session?.user]);

  const { data: poll, isLoading, mutate } = useSWR<Poll | null>(
    `poll-${pollId}`,
    () => fetchPoll(pollId).then((r) => r.data ?? null),
    { revalidateOnFocus: false }
  );

  if (isLoading || poll === undefined) return <div className="h-24 bg-bg-surface border border-border rounded-xl animate-pulse" />;
  if (poll === null) return null;

  // For anonymous users, merge localStorage votes with server votes so reload shows results
  const effectiveUserVotes = session?.user ? poll.userVotes : [...poll.userVotes, ...localVotes];
  const hasVoted = effectiveUserVotes.length > 0;
  const showResults = hasVoted || !poll.isActive;
  const isExpired = poll.expiresAt ? new Date(poll.expiresAt) < new Date() : false;
  const canVote = !voting && !hasVoted && poll.isActive && !isExpired && (!!session?.user || !!sessionId);

  // On reload, if the server doesn't reflect our anonymous vote (voteCount === 0 for our option),
  // apply a +1 adjustment so counts match what the user saw when they voted.
  const displayOptions = (!session?.user && localVotes.length > 0)
    ? poll.Options.map((opt) => {
        const weVotedForThis = localVotes.includes(opt.id);
        const serverAlreadyCounted = opt.voteCount > 0;
        return weVotedForThis && !serverAlreadyCounted
          ? { ...opt, voteCount: opt.voteCount + 1 }
          : opt;
      })
    : poll.Options;
  const displayTotalVotes = (!session?.user && localVotes.length > 0 && displayOptions.some((o, i) => o.voteCount !== poll.Options[i].voteCount))
    ? poll.totalVotes + 1
    : poll.totalVotes;
  const totalOptionVotes = displayOptions.reduce((sum, o) => sum + o.voteCount, 0);

  const saveAnonVote = (optionIds: string[]) => {
    try {
      localStorage.setItem(`poll-voted-${pollId}`, JSON.stringify(optionIds));
    } catch { /* ignore */ }
    setLocalVotes(optionIds);
  };

  const submitVote = async (optionIds: string[]) => {
    if (!canVote || optionIds.length === 0) return;
    setVoting(true);

    // Optimistic update — show results immediately without waiting for API
    const optimisticPoll: Poll = {
      ...poll,
      userVotes: optionIds,
      totalVotes: poll.totalVotes + 1,
      Options: poll.Options.map((opt) => ({
        ...opt,
        voteCount: optionIds.includes(opt.id) ? opt.voteCount + 1 : opt.voteCount,
      })),
    };
    mutate(optimisticPoll, false);
    setPendingSelection([]);

    try {
      // Find custom text for selected options (if any allows it)
      const selectedCustomText = optionIds
        .map(id => customText[id])
        .filter(text => !!text?.trim())[0] || undefined;

      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          optionIds, 
          sessionId: session?.user ? undefined : sessionId ?? undefined,
          customText: selectedCustomText
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        // Vote counted — persist locally and use real server data
        if (!session?.user) saveAnonVote(optionIds);
        mutate(data.data, false);
      } else if (data.error === 'You have already voted on this poll') {
        // Already counted before — persist so reload still shows results
        if (!session?.user) saveAnonVote(optionIds);
      } else {
        mutate(); // revert on unexpected errors
      }
    } catch {
      mutate(); // revert on network failure
    } finally {
      setVoting(false);
    }
  };

  const toggleSelection = (optionId: string) => {
    if (poll.allowMultiple) {
      setPendingSelection((prev) => {
        const next = prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId];
        return next;
      });
    } else {
      // Radio behaviour — only one selection at a time
      setPendingSelection((prev) => (prev[0] === optionId ? [] : [optionId]));
    }
  };

  return (
    <div className="p-6 border-2 border-black dark:border-white rounded-xl bg-[var(--bg)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <h3 className="font-bold text-text-primary leading-snug !text-[16px] md:!text-[20px]">{poll.question}</h3>
        <span className="text-sm text-text-muted shrink-0 whitespace-nowrap">
          {displayTotalVotes.toLocaleString()} votes
        </span>
      </div>

      {/* Options or results */}
      <div className="space-y-3 relative overflow-hidden">
        {viewingCustomAnswersFor ? (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <button
              onClick={() => setViewingCustomAnswersFor(null)}
              className="mb-4 px-3 py-1.5 text-xs font-bold text-text-primary bg-bg-surface border border-border rounded-full hover:border-[#00e5a0] hover:text-[#00e5a0] transition-all flex items-center gap-1.5 shadow-sm w-fit"
            >
              Back to Results
            </button>
            <ul className="max-h-[300px] overflow-y-auto pr-2 space-y-2 list-disc list-inside">
              {poll.publicCustomAnswers?.filter(a => a.optionId === viewingCustomAnswersFor).length ? (
                poll.publicCustomAnswers.filter(a => a.optionId === viewingCustomAnswersFor).map((ans, i) => (
                  <li key={i} className="text-sm font-medium text-text-primary">
                    {ans.customText}
                  </li>
                ))
              ) : (
                <p className="text-sm text-text-muted italic">No custom answers yet.</p>
              )}
            </ul>
          </div>
        ) : showResults ? (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-3">
            {displayOptions.map((opt) => {
              const answersCount = poll.publicCustomAnswers?.filter(a => a.optionId === opt.id).length || 0;
              return (
                <ResultBar
                  key={opt.id}
                  option={opt}
                  total={totalOptionVotes}
                  isChosen={effectiveUserVotes.includes(opt.id)}
                  onViewAnswers={opt.allowCustomInput ? () => setViewingCustomAnswersFor(opt.id) : undefined}
                  answerCount={answersCount}
                />
              );
            })}
          </div>
        ) : (
          poll.Options.map((opt) => {
            const selected = pendingSelection.includes(opt.id);
            return (
              <div key={opt.id} className="flex flex-col">
                <button
                  onClick={() => toggleSelection(opt.id)}
                  disabled={voting}
                  className="group w-full text-left flex items-center gap-3 py-1 font-medium text-text-primary transition-colors"
                >
                  {/* Circle indicator — radio for single, checkbox-circle for multi */}
                  <span className={cn(
                    'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                    selected
                      ? 'border-[#00e5a0] shadow-[0_0_8px_rgba(0,229,160,0.5)]'
                      : 'border-border group-hover:border-[#00e5a0] group-hover:shadow-[0_0_8px_rgba(0,229,160,0.5)]'
                  )}>
                    {selected && <span className="w-2.5 h-2.5 rounded-full bg-[#00e5a0]" />}
                  </span>
                  <span className="text-base transition-all group-hover:text-[#00e5a0] group-hover:[text-shadow:0_0_10px_rgba(0,229,160,0.4)]">
                    {opt.text}
                  </span>
                </button>
                {selected && opt.allowCustomInput && (
                  <div className="ml-8 mt-2 pr-4">
                    <input
                      type="text"
                      placeholder="Please specify..."
                      value={customText[opt.id] || ''}
                      onChange={(e) => setCustomText(prev => ({ ...prev, [opt.id]: e.target.value }))}
                      className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-sm text-text-primary outline-none focus:border-[#00e5a0]"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Vote button */}
      {!showResults && !viewingCustomAnswersFor && (
        <button
          onClick={() => submitVote(pendingSelection)}
          disabled={voting || pendingSelection.length === 0}
          className="w-full mt-6 py-2.5 rounded-full text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
          style={{ background: 'var(--brand-green)' }}
        >
          {voting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Vote'}
        </button>
      )}

      {/* Already-voted banner — prominent and centered */}
      {hasVoted && (
        <div
          className="flex items-center justify-center gap-2 mt-6 py-2.5 rounded-full text-sm font-bold"
          style={{ background: 'rgba(0,229,160,0.12)', color: 'var(--brand-green)' }}
        >
          <Check className="w-4 h-4" /> You&apos;ve already voted
        </div>
      )}

      {/* Footer — status only, vote count is already in the header */}
      {(poll.expiresAt || !poll.isActive || isExpired) && !viewingCustomAnswersFor && (
        <div className="flex items-center mt-4 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            {!poll.isActive || isExpired ? (
              <>Poll closed</>
            ) : poll.expiresAt ? (
              <><Clock className="w-3 h-3" /> Closes {new Date(poll.expiresAt).toLocaleDateString()}</>
            ) : null}
          </span>
        </div>
      )}
    </div>
  );
}

/* -- Public export ------------------------------------- */
export default function PollWidget({ pollId }: { pollId: string }) {
  // Deferred render avoids hydration mismatch from localStorage sessionId
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-32 bg-bg-surface border border-border rounded-xl animate-pulse" />;
  return <PollWidgetInner pollId={pollId} />;
}

'use client';

import { useState, useCallback, useRef } from 'react';import { Spinner } from '@/components/ui/Spinner';

import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Calendar, Plus, GripVertical, Clock,
  X, ExternalLink, AlertCircle
} from 'lucide-react';
import {
  fetchAdminCalendar, scheduleArticle,
  type ArticleSummary,
} from '@/lib/api';
import { CONTENT_TYPE_COLORS, CONTENT_TYPE_LABELS, ARTICLE_STATUS_LABELS } from '@/lib/constants';
import { useUIStore } from '@/store/uiStore';

// --- Types --------------------------------------------------------------------
type DragState = {
  articleId: string;
  article: ArticleSummary;
  sourceDate: string | null;
} | null;

// --- Utilities ----------------------------------------------------------------
function toYYYYMM(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function toYYYYMMDD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatMonthYear(d: Date): string {
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function formatDateLabel(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDaysInMonth(year: number, month: number): { date: Date; dateKey: string }[] {
  const result: { date: Date; dateKey: string }[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Find Monday start for the first week (Mon=0 ... Sun=6)
  const startOffset = (firstDay.getDay() + 6) % 7;
  for (let i = -startOffset; i < 0; i++) {
    const d = new Date(year, month, i + 1);
    result.push({ date: d, dateKey: toYYYYMMDD(d) });
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(year, month, i);
    result.push({ date: d, dateKey: toYYYYMMDD(d) });
  }
  // Fill trailing days to complete last week row
  const remaining = (7 - (result.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    result.push({ date: d, dateKey: toYYYYMMDD(d) });
  }
  return result;
}

// --- Status Pill --------------------------------------------------------------
function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; style: string }> = {
    DRAFT:     { label: 'Draft',     style: 'background:rgba(100,116,139,0.18);color:#94a3b8' },
    IN_REVIEW: { label: 'Review',    style: 'background:rgba(234,179,8,0.15);color:#eab308' },
    APPROVED:  { label: 'Approved',  style: 'background:rgba(34,197,94,0.15);color:#22c55e' },
    PUBLISHED: { label: 'Published', style: 'background:rgba(59,130,246,0.18);color:#60a5fa' },
    IN_PROGRESS:{ label: 'WIP',      style: 'background:rgba(251,146,60,0.15);color:#fb923c' },
    ARCHIVED:  { label: 'Archived',  style: 'background:rgba(239,68,68,0.12);color:#f87171' },
  };
  const s = map[status] || { label: status, style: 'background:rgba(100,116,139,0.15);color:#94a3b8' };
  return (
    <span style={{ ...Object.fromEntries(s.style.split(';').map(p => { const [k, v] = p.split(':'); return [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]; })), fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, padding: '1px 5px', borderRadius: 4 }}>
      {s.label}
    </span>
  );
}

// --- Article Pill (on calendar) -----------------------------------------------
function ArticlePill({
  article,
  onDragStart,
  onClick,
  isDragging,
}: {
  article: ArticleSummary;
  onDragStart: (e: React.DragEvent) => void;
  onClick: () => void;
  isDragging: boolean;
}) {
  const colors = CONTENT_TYPE_COLORS[article.contentType] || { bg: '#3b82f6', color: '#fff' };
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      title={article.title}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 5,
        padding: '4px 6px',
        borderRadius: 6,
        backgroundColor: colors.bg + '22',
        borderLeft: `3px solid ${colors.bg}`,
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        transition: 'opacity 0.15s',
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: colors.bg, flexShrink: 0, paddingTop: 1 }}>
        {(CONTENT_TYPE_LABELS[article.contentType] || article.contentType).slice(0, 3)}
      </span>
      <span style={{
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--text)',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        lineHeight: 1.35,
        flex: 1,
        minWidth: 0,
      }}>
        {article.title}
      </span>
    </div>
  );
}

// --- Quick Edit Modal ---------------------------------------------------------
function QuickEditModal({
  article,
  onClose,
  onSaved,
}: {
  article: ArticleSummary;
  onClose: () => void;
  onSaved: (updated: ArticleSummary) => void;
}) {
  const { addToast } = useUIStore();
  const colors = CONTENT_TYPE_COLORS[article.contentType] || { bg: '#3b82f6', color: '#fff' };
  const [scheduledAt, setScheduledAt] = useState<string>(
    article.scheduledAt
      ? new Date(article.scheduledAt).toISOString().slice(0, 16)
      : ''
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const isoVal = scheduledAt ? new Date(scheduledAt).toISOString() : null;
    const res = await scheduleArticle(article.id, isoVal);
    setSaving(false);
    if (res.success && res.data) {
      addToast({ type: 'success', message: 'Schedule updated' });
      onSaved(res.data);
      onClose();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to update schedule' });
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 16, width: '100%', maxWidth: 480, padding: '24px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 6, background: colors.bg + '22', color: colors.bg }}>
                {CONTENT_TYPE_LABELS[article.contentType] || article.contentType}
              </span>
              <StatusPill status={article.status} />
            </div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
              {article.title}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>
              by {article.authorDisplayName}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4, flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* Scheduled At Field */}
        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
            <Clock size={12} /> Scheduled For
          </span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', fontSize: 14,
              background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text)', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </label>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1, padding: '10px 20px', borderRadius: 8,
              background: 'var(--accent)', color: '#fff', border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700,
              fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: saving ? 0.7 : 1, transition: 'opacity 0.15s',
            }}
          >
            {saving && <Spinner size={14} className="animate-spin" />}
            Save Schedule
          </button>
          <Link
            href={`/admin/posts/${article.slug}/edit`}
            style={{
              padding: '10px 16px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg3)',
              color: 'var(--text)', fontWeight: 600, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none',
            }}
          >
            <ExternalLink size={13} /> Full Edit
          </Link>
        </div>

        {scheduledAt && (
          <button
            onClick={() => setScheduledAt('')}
            style={{
              marginTop: 10, width: '100%', padding: '8px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8, color: '#f87171', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            }}
          >
            Remove Schedule
          </button>
        )}
      </div>
    </div>
  );
}

// --- Schedule Popover ---------------------------------------------------------
function SchedulePopover({
  article,
  onClose,
  onSaved,
}: {
  article: ArticleSummary;
  onClose: () => void;
  onSaved: (updated: ArticleSummary) => void;
}) {
  const { addToast } = useUIStore();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSchedule = async () => {
    if (!value) return;
    setSaving(true);
    const res = await scheduleArticle(article.id, new Date(value).toISOString());
    setSaving(false);
    if (res.success && res.data) {
      addToast({ type: 'success', message: 'Scheduled!' });
      onSaved(res.data);
      onClose();
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to schedule' });
    }
  };

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, width: 240, boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
      <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pick date &amp; time</p>
      <input
        type="datetime-local"
        value={value}
        onChange={e => setValue(e.target.value)}
        style={{ width: '100%', padding: '8px 10px', fontSize: 13, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)', marginBottom: 10, boxSizing: 'border-box', outline: 'none' }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleSchedule}
          disabled={!value || saving}
          style={{
            flex: 1, padding: '7px 12px', background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 7, cursor: value && !saving ? 'pointer' : 'not-allowed',
            fontWeight: 700, fontSize: 12, opacity: (!value || saving) ? 0.5 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          {saving && <Spinner size={12} className="animate-spin" />}
          Schedule
        </button>
        <button
          onClick={onClose}
          style={{ padding: '7px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// --- Unscheduled Item ---------------------------------------------------------
function UnscheduledItem({
  article,
  onDragStart,
  onSaved,
}: {
  article: ArticleSummary;
  onDragStart: (e: React.DragEvent) => void;
  onSaved: (updated: ArticleSummary) => void;
}) {
  const colors = CONTENT_TYPE_COLORS[article.contentType] || { bg: '#3b82f6', color: '#fff' };
  const [showPopover, setShowPopover] = useState(false);

  return (
    <div
      style={{
        position: 'relative',
        padding: '10px 12px',
        borderRadius: 10,
        background: 'var(--bg3)',
        border: '1px solid var(--border)',
        transition: 'border-color 0.15s',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div
          draggable
          onDragStart={onDragStart}
          style={{ cursor: 'grab', color: 'var(--muted)', flexShrink: 0, paddingTop: 2 }}
        >
          <GripVertical size={14} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '1px 6px', borderRadius: 4, background: colors.bg + '22', color: colors.bg }}>
              {CONTENT_TYPE_LABELS[article.contentType] || article.contentType}
            </span>
            <StatusPill status={article.status} />
          </div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text)', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
            {article.title}
          </p>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--muted)' }}>{article.authorDisplayName}</p>
        </div>
      </div>
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setShowPopover(true)}
          style={{
            padding: '4px 10px', fontSize: 11, fontWeight: 700, color: 'var(--accent)',
            background: 'rgba(var(--accent-rgb, 0 153 184) / 0.1)', border: '1px solid rgba(var(--accent-rgb, 0 153 184) / 0.25)',
            borderRadius: 6, cursor: 'pointer',
          }}
        >
          Schedule
        </button>
      </div>
      {showPopover && (
        <div style={{ position: 'absolute', right: 0, bottom: '110%', zIndex: 100 }}>
          <SchedulePopover article={article} onClose={() => setShowPopover(false)} onSaved={onSaved} />
        </div>
      )}
    </div>
  );
}

// --- Main Calendar Page -------------------------------------------------------
export default function AdminCalendarPage() {
  const { addToast } = useUIStore();
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [dragState, setDragState] = useState<DragState>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [quickEditArticle, setQuickEditArticle] = useState<ArticleSummary | null>(null);

  const monthKey = toYYYYMM(currentDate);
  const swrKey = `admin-calendar-${monthKey}`;

  const { data, error, isLoading, mutate: mutateCalendar } = useSWR(
    swrKey,
    () => fetchAdminCalendar(monthKey).then(r => r.data),
    { revalidateOnFocus: false }
  );

  const days = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const todayKey = toYYYYMMDD(today);

  // --- Navigation -------------------------------------------------
  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday = () => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));

  // --- Drag & Drop -------------------------------------------------
  const handleDragStart = useCallback((e: React.DragEvent, article: ArticleSummary, sourceDate: string | null) => {
    setDragState({ articleId: article.id, article, sourceDate });
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(dateKey);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    setDropTarget(null);

    if (!dragState) return;
    if (dragState.sourceDate === dateKey) return;

    const [year, month, day] = dateKey.split('-').map(Number);
    // Set time to noon of that day (if no existing time)
    const newScheduledAt = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();

    // Optimistic update
    mutateCalendar(current => {
      if (!current) return current;
      const next = JSON.parse(JSON.stringify(current)) as typeof current;

      // Remove from source
      if (dragState.sourceDate && next.byDate[dragState.sourceDate]) {
        next.byDate[dragState.sourceDate] = next.byDate[dragState.sourceDate].filter(a => a.id !== dragState.articleId);
        if (next.byDate[dragState.sourceDate].length === 0) delete next.byDate[dragState.sourceDate];
      } else {
        next.unscheduled = next.unscheduled.filter(a => a.id !== dragState.articleId);
      }

      // Add to target
      const updatedArticle: ArticleSummary = { ...dragState.article, scheduledAt: newScheduledAt };
      if (!next.byDate[dateKey]) next.byDate[dateKey] = [];
      next.byDate[dateKey].push(updatedArticle);

      return next;
    }, { revalidate: false });

    // API call
    const res = await scheduleArticle(dragState.articleId, newScheduledAt);
    if (!res.success) {
      addToast({ type: 'error', message: res.error || 'Failed to reschedule' });
      mutateCalendar(); // revert
    } else {
      addToast({ type: 'success', message: `Rescheduled to ${formatDateLabel(dateKey)}` });
      mutateCalendar(); // confirm with fresh data
    }

    setDragState(null);
  }, [dragState, mutateCalendar, addToast]);

  const handleDragEnd = useCallback(() => {
    setDragState(null);
    setDropTarget(null);
  }, []);

  // --- Quick Edit save handler -------------------------------------
  const handleQuickSaved = useCallback((updated: ArticleSummary) => {
    mutateCalendar();
    setQuickEditArticle(null);
  }, [mutateCalendar]);

  // --- Unscheduled item saved --------------------------------------
  const handleUnscheduledSaved = useCallback(() => {
    mutateCalendar();
  }, [mutateCalendar]);

  // --- Toggle expand day -------------------------------------------
  const toggleExpand = (dateKey: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

  const DAY_HEADERS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const OVERFLOW_LIMIT = 3;

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* -- Quick Edit Modal -- */}
      {quickEditArticle && (
        <QuickEditModal
          article={quickEditArticle}
          onClose={() => setQuickEditArticle(null)}
          onSaved={handleQuickSaved}
        />
      )}

      {/* -- Page Header -- */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={20} style={{ color: 'var(--accent)' }} />
            <h1 style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text)' }}>
              Editorial Calendar
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
            <button onClick={prevMonth} style={{ padding: '6px 8px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center' }}>
              <ChevronLeft size={14} />
            </button>
            <button onClick={goToday} style={{ padding: '6px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
              Today
            </button>
            <button onClick={nextMonth} style={{ padding: '6px 8px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center' }}>
              <ChevronRight size={14} />
            </button>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginLeft: 4 }}>
              {formatMonthYear(currentDate)}
            </span>
          </div>
        </div>
      </div>

      {/* -- Two-column layout -- */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* -- Calendar Grid (70%) -- */}
        <div style={{ flex: '0 0 70%', minWidth: 0 }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
            {DAY_HEADERS.map(h => (
              <div key={h} style={{ textAlign: 'center', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', padding: '6px 0' }}>
                {h}
              </div>
            ))}
          </div>

          {/* Loading / Error */}
          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 10, color: 'var(--muted)' }}>
              <Spinner size={20} className="animate-spin" /> Loading calendar…
            </div>
          )}
          {error && !isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 8, color: '#f87171' }}>
              <AlertCircle size={16} /> Failed to load calendar
            </div>
          )}

          {/* Day cells */}
          {!isLoading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {days.map(({ date, dateKey }) => {
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                const isToday = dateKey === todayKey;
                const articlesOnDay = (data?.byDate[dateKey] || []);
                const isExpanded = expandedDays.has(dateKey);
                const isDropping = dropTarget === dateKey;
                const visibleArticles = isExpanded ? articlesOnDay : articlesOnDay.slice(0, OVERFLOW_LIMIT);
                const overflow = articlesOnDay.length - OVERFLOW_LIMIT;

                return (
                  <div
                    key={dateKey}
                    onDragOver={e => handleDragOver(e, dateKey)}
                    onDragLeave={handleDragLeave}
                    onDrop={e => handleDrop(e, dateKey)}
                    style={{
                      minHeight: 100,
                      padding: '6px 6px 8px',
                      borderRadius: 8,
                      background: isToday ? 'var(--bg2)' : 'var(--bg3)',
                      border: isToday
                        ? '2px solid var(--accent)'
                        : isDropping
                        ? '2px solid var(--accent)'
                        : '1px solid var(--border)',
                      opacity: isCurrentMonth ? 1 : 0.45,
                      transition: 'border-color 0.12s, background 0.12s',
                      backgroundColor: isDropping ? 'color-mix(in srgb, var(--accent) 8%, var(--bg3))' : undefined,
                      position: 'relative',
                    }}
                  >
                    {/* Day number */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{
                        fontSize: 11, fontWeight: isToday ? 800 : 600,
                        color: isToday ? 'var(--accent)' : 'var(--muted)',
                        lineHeight: 1,
                      }}>
                        {date.getDate()}
                      </span>
                      {isToday && (
                        <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 15%, transparent)', padding: '1px 5px', borderRadius: 4 }}>
                          TODAY
                        </span>
                      )}
                    </div>

                    {/* Article pills */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {visibleArticles.map(article => (
                        <ArticlePill
                          key={article.id}
                          article={article}
                          isDragging={dragState?.articleId === article.id}
                          onDragStart={e => handleDragStart(e, article, dateKey)}
                          onClick={() => setQuickEditArticle(article)}
                        />
                      ))}
                    </div>

                    {/* Overflow button */}
                    {!isExpanded && overflow > 0 && (
                      <button
                        onClick={() => toggleExpand(dateKey)}
                        style={{
                          marginTop: 3, width: '100%', padding: '2px 4px',
                          fontSize: 10, fontWeight: 700, color: 'var(--accent)',
                          background: 'rgba(0,153,184,0.08)', border: '1px solid rgba(0,153,184,0.2)',
                          borderRadius: 4, cursor: 'pointer',
                        }}
                      >
                        +{overflow} more
                      </button>
                    )}
                    {isExpanded && articlesOnDay.length > OVERFLOW_LIMIT && (
                      <button
                        onClick={() => toggleExpand(dateKey)}
                        style={{
                          marginTop: 3, width: '100%', padding: '2px 4px',
                          fontSize: 10, fontWeight: 700, color: 'var(--muted)',
                          background: 'var(--bg3)', border: '1px solid var(--border)',
                          borderRadius: 4, cursor: 'pointer',
                        }}
                      >
                        Show less
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* -- Unscheduled Sidebar (30%) -- */}
        <div
          style={{
            flex: '0 0 28%', minWidth: 0,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px',
            position: 'sticky', top: 24, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Unscheduled
            </h2>
            <Link
              href="/admin/posts/new"
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                background: 'var(--accent)', color: '#fff', borderRadius: 7,
                textDecoration: 'none', fontSize: 11, fontWeight: 700,
              }}
            >
              <Plus size={12} /> New Post
            </Link>
          </div>

          {isLoading && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)' }}>
              <Spinner size={16} className="animate-spin" />
            </div>
          )}

          {!isLoading && data?.unscheduled && data.unscheduled.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '20px 0', margin: 0 }}>
              All articles are scheduled 🎉
            </p>
          )}

          {!isLoading && data?.unscheduled && data.unscheduled.length > 0 && (
            <>
              {/* Group by status */}
              {(['DRAFT', 'IN_PROGRESS', 'IN_REVIEW', 'APPROVED'] as const).map(status => {
                const items = data.unscheduled.filter(a => a.status === status);
                if (items.length === 0) return null;
                const statusInfo = ARTICLE_STATUS_LABELS[status];
                return (
                  <div key={status} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
                      {statusInfo?.label || status} ({items.length})
                    </div>
                    {items.map(article => (
                      <UnscheduledItem
                        key={article.id}
                        article={article}
                        onDragStart={e => handleDragStart(e, article, null)}
                        onSaved={() => handleUnscheduledSaved()}
                      />
                    ))}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* -- Mobile List View -- */}
      <style>{`
        @media (max-width: 768px) {
          .cal-grid-wrapper { display: none !important; }
          .cal-mobile-list { display: block !important; }
          .cal-two-col { flex-direction: column !important; }
          .cal-sidebar { position: static !important; max-height: none !important; }
        }
        @media (min-width: 769px) {
          .cal-mobile-list { display: none !important; }
        }
      `}</style>
    </div>
  );
}

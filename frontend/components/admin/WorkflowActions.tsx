'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Button from '@/components/ui/Button';
import { useUIStore } from '@/store/uiStore';
import Modal from '@/components/ui/Modal';
import { Send, CheckCircle, XCircle, Globe, EyeOff, Calendar, ShieldCheck, ShieldOff, Trash2, AlertOctagon, RefreshCw } from 'lucide-react';
import { validateForPublish, PublishValidationInput, ValidationCheck } from '@/lib/publish-validation';
import { requestPostDeletion, cancelPostDeletionRequest, deletePost } from '@/lib/api';
import PublishGate from './PublishGate';
import EmbargoCountdown from './EmbargoCountdown';

interface WorkflowActionsProps {
  articleSlug: string;
  contentType?: string;
  currentStatus: string;
  onStatusChange?: () => void;
  validationData?: PublishValidationInput;
  embargoUntil?: string; // ISO string
  scheduledAt?: string; // ISO string
  deletionRequestedAt?: string | null;
  deletionRequestedByName?: string | null;
  deletionRequestReason?: string | null;
}

export default function WorkflowActions({ articleSlug, contentType, currentStatus, onStatusChange, validationData, embargoUntil, scheduledAt, deletionRequestedAt, deletionRequestedByName, deletionRequestReason }: WorkflowActionsProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Rejection modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Deletion request modal state
  const [isDeletionRequestModalOpen, setIsDeletionRequestModalOpen] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');

  // Delete confirm modal state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteActionToConfirm, setDeleteActionToConfirm] = useState<'discard' | 'fulfill' | null>(null);

  // Schedule modal state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');

  // Embargo modal state
  const [isEmbargoModalOpen, setIsEmbargoModalOpen] = useState(false);
  const [embargoDate, setEmbargoDate] = useState('');
  const [currentEmbargo, setCurrentEmbargo] = useState(embargoUntil || '');
  const [currentSchedule, setCurrentSchedule] = useState(scheduledAt || '');

  // Publish validation state
  const [isPublishGateOpen, setIsPublishGateOpen] = useState(false);
  const [validationChecks, setValidationChecks] = useState<ValidationCheck[]>([]);

  const isAuthor = user?.role === 'AUTHOR';
  const isEditorOrAdmin = user?.role === 'EDITOR' || user?.role === 'ADMIN';
  const isAdminRole = user?.role === 'ADMIN';
  // DRAFT/IN_REVIEW are self-deletable (nothing public depends on them yet);
  // anything further along needs the request-deletion flow below.
  const isDraftOrInReview = currentStatus === 'DRAFT' || currentStatus === 'IN_REVIEW';

  const handleAction = async (action: string, endpoint: string, body?: any) => {
    setLoadingAction(action);
    try {
      const res = await fetch(`/api/posts/${articleSlug}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...(body && { body: JSON.stringify(body) }),
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || `Failed to ${action}`);

      addToast({ message: `Article ${action} successfully`, type: 'success' });
      if (onStatusChange) onStatusChange();
      setIsRejectModalOpen(false);
      setIsPublishGateOpen(false);
      setRejectionReason('');
    } catch (err: any) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  const attemptPublish = () => {
    if (validationData) {
      const checks = validateForPublish(validationData);
      if (checks.length > 0) {
        setValidationChecks(checks);
        setIsPublishGateOpen(true);
        return;
      }
    }
    // Proceed if no checks or no validation data provided
    handleAction('published', 'publish');
  };

  const confirmPublish = () => {
    handleAction('published', 'publish');
  };

  const submitRejection = () => {
    if (!rejectionReason.trim()) {
      addToast({ message: 'Rejection reason is required', type: 'error' });
      return;
    }
    handleAction('rejected', 'reject', { reason: rejectionReason });
  };

  // Author discards their own DRAFT/IN_REVIEW article directly — no review needed
  // since nothing public depends on it yet.
  const discardDraft = async () => {
    setLoadingAction('discarded');
    const res = await deletePost(articleSlug);
    setLoadingAction(null);
    if (res.success) {
      addToast({ message: 'Draft deleted', type: 'success' });
      const redirectMap: Record<string, string> = {
        GUIDE: '/admin/guides',
        REVIEW: '/admin/reviews',
        NEWS: '/admin/news',
        DEAL: '/admin/deals',
        FEATURE: '/admin/features',
        OPINION: '/admin/opinions',
        LISTICLE: '/admin/listicles',
      };
      router.push(redirectMap[contentType || ''] || '/admin');
    } else {
      addToast({ message: res.error || 'Failed to delete draft', type: 'error' });
    }
  };

  const submitDeletionRequest = async () => {
    if (deletionReason.trim().length < 10) {
      addToast({ message: 'Please provide a reason (at least 10 characters)', type: 'error' });
      return;
    }
    setLoadingAction('deletion-requested');
    const res = await requestPostDeletion(articleSlug, deletionReason.trim());
    setLoadingAction(null);
    if (res.success) {
      addToast({ message: 'Deletion requested — an editor or admin will review it', type: 'success' });
      setIsDeletionRequestModalOpen(false);
      setDeletionReason('');
      if (onStatusChange) onStatusChange();
    } else {
      addToast({ message: res.error || 'Failed to request deletion', type: 'error' });
    }
  };

  const cancelDeletionRequest = async () => {
    setLoadingAction('deletion-cancelled');
    const res = await cancelPostDeletionRequest(articleSlug);
    setLoadingAction(null);
    if (res.success) {
      addToast({ message: 'Deletion request withdrawn', type: 'success' });
      if (onStatusChange) onStatusChange();
    } else {
      addToast({ message: res.error || 'Failed to withdraw request', type: 'error' });
    }
  };

  // ADMIN fulfils a pending deletion request — the actual hard delete.
  const fulfillDeletion = async () => {
    setLoadingAction('deletion-fulfilled');
    const res = await deletePost(articleSlug);
    setLoadingAction(null);
    if (res.success) {
      addToast({ message: 'Article deleted', type: 'success' });
      const redirectMap: Record<string, string> = {
        GUIDE: '/admin/guides',
        REVIEW: '/admin/reviews',
        NEWS: '/admin/news',
        DEAL: '/admin/deals',
        FEATURE: '/admin/features',
        OPINION: '/admin/opinions',
        LISTICLE: '/admin/listicles',
      };
      router.push(redirectMap[contentType || ''] || '/admin');
    } else {
      addToast({ message: res.error || 'Failed to delete article', type: 'error' });
    }
  };

  const confirmDeleteAction = () => {
    setIsDeleteConfirmOpen(false);
    if (deleteActionToConfirm === 'discard') discardDraft();
    if (deleteActionToConfirm === 'fulfill') fulfillDeletion();
  };

  const renderStatusBadge = () => {
    const statusColors: Record<string, string> = {
      DRAFT: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
      IN_PROGRESS: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
      IN_REVIEW: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
      APPROVED: 'bg-blue-500/20 text-blue-500 border-blue-500/50',
      PUBLISHED: 'bg-green-500/20 text-green-500 border-green-500/50',
      ARCHIVED: 'bg-red-500/20 text-red-500 border-red-500/50',
    };

    const colorClass = statusColors[currentStatus] || statusColors.DRAFT;

    return (
      <div className="flex flex-col gap-2 mb-4">
        <span className="text-sm font-medium text-text-muted">Current Status:</span>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border w-fit ${colorClass}`}>
          {currentStatus.replace('_', ' ')}
        </span>
      </div>
    );
  };

  const submitSchedule = () => {
    if (!scheduleDate) {
      addToast({ message: 'Please select a date and time', type: 'error' });
      return;
    }
    const selectedDate = new Date(scheduleDate);
    if (selectedDate <= new Date()) {
      addToast({ message: 'Schedule date must be in the future', type: 'error' });
      return;
    }
    handleAction('scheduled', 'schedule', { scheduledAt: selectedDate.toISOString() }).then(() => {
      setCurrentSchedule(selectedDate.toISOString());
      setIsScheduleModalOpen(false);
      setScheduleDate('');
    });
  };

  const submitEmbargo = async () => {
    if (!embargoDate) {
      addToast({ message: 'Please select an embargo date and time', type: 'error' });
      return;
    }
    const selectedDate = new Date(embargoDate);
    if (selectedDate <= new Date()) {
      addToast({ message: 'Embargo date must be in the future', type: 'error' });
      return;
    }
    setLoadingAction('embargo');
    try {
      const res = await fetch(`/api/posts/${articleSlug}/embargo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embargoUntil: selectedDate.toISOString() }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to set embargo');
      setCurrentEmbargo(selectedDate.toISOString());
      addToast({ message: 'Embargo set successfully', type: 'success' });
      setIsEmbargoModalOpen(false);
      setEmbargoDate('');
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  const clearEmbargo = async () => {
    setLoadingAction('clearEmbargo');
    try {
      const res = await fetch(`/api/posts/${articleSlug}/embargo`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to clear embargo');
      setCurrentEmbargo('');
      addToast({ message: 'Embargo cleared', type: 'success' });
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  const clearSchedule = async () => {
    setLoadingAction('clearSchedule');
    try {
      const res = await fetch(`/api/posts/${articleSlug}/schedule`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (!res.ok) {
        // Fallback to POST with null if DELETE doesn't exist
        const res2 = await fetch(`/api/posts/${articleSlug}/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduledAt: null }),
        });
        const result2 = await res2.json();
        if (!res2.ok) throw new Error(result2.error || 'Failed to clear schedule');
      }
      setCurrentSchedule('');
      addToast({ message: 'Schedule cleared', type: 'success' });
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="bg-bg-surface border border-border rounded-xl p-4 flex flex-col">
      {renderStatusBadge()}

      {deletionRequestedAt && (isAuthor || isEditorOrAdmin) && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-400">
            <AlertOctagon className="w-4 h-4" /> Deletion Requested
          </div>
          <p className="text-xs text-text-muted">
            {deletionRequestedByName ? `Requested by ${deletionRequestedByName}` : 'Requested'} on{' '}
            {new Date(deletionRequestedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
          {deletionRequestReason && (
            <p className="text-xs text-text-primary bg-bg-primary rounded px-2 py-1.5 border border-border">&quot;{deletionRequestReason}&quot;</p>
          )}
          <div className="flex flex-col gap-2 pt-1">
            <Button
              onClick={cancelDeletionRequest}
              loading={loadingAction === 'deletion-cancelled'}
              className="w-full gap-1.5 justify-center"
              variant="outline"
              size="sm"
            >
              <XCircle className="w-3.5 h-3.5" /> Cancel Request
            </Button>
            {isAdminRole && (
              <Button
                onClick={() => { setDeleteActionToConfirm('fulfill'); setIsDeleteConfirmOpen(true); }}
                loading={loadingAction === 'deletion-fulfilled'}
                className="w-full gap-1.5 justify-center bg-red-600 hover:bg-red-700 text-white"
                size="sm"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Now
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 mt-2">
        {/* Author Actions */}
        {isAuthor && currentStatus === 'DRAFT' && (
          <Button
            onClick={() => handleAction('submitted for review', 'submit')}
            loading={loadingAction === 'submitted for review'}
            className="w-full gap-2 justify-center"
            variant="outline"
          >
            <Send className="w-4 h-4" /> Submit for Review
          </Button>
        )}

        {isAuthor && isDraftOrInReview && !deletionRequestedAt && (
          <Button
            onClick={() => { setDeleteActionToConfirm('discard'); setIsDeleteConfirmOpen(true); }}
            loading={loadingAction === 'discarded'}
            className="w-full gap-2 justify-center bg-red-600/10 hover:bg-red-600/20 text-red-400"
            variant="ghost"
          >
            <Trash2 className="w-4 h-4" /> Discard Draft
          </Button>
        )}

        {isAuthor && !isDraftOrInReview && !deletionRequestedAt && (
          <Button
            onClick={() => setIsDeletionRequestModalOpen(true)}
            className="w-full gap-2 justify-center bg-red-600/10 hover:bg-red-600/20 text-red-400"
            variant="ghost"
          >
            <Trash2 className="w-4 h-4" /> Request Deletion
          </Button>
        )}

        {/* Editor/Admin Actions */}
        {isEditorOrAdmin && currentStatus === 'IN_REVIEW' && (
          <>
            <Button
              onClick={() => handleAction('approved', 'approve')}
              loading={loadingAction === 'approved'}
              className="w-full gap-2 justify-center bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CheckCircle className="w-4 h-4" /> Approve
            </Button>
            <Button
              onClick={() => setIsRejectModalOpen(true)}
              className="w-full gap-2 justify-center bg-red-600/20 hover:bg-red-600/30 text-red-500"
              variant="ghost"
            >
              <XCircle className="w-4 h-4" /> Reject
            </Button>
          </>
        )}

        {isEditorOrAdmin && currentStatus === 'APPROVED' && (
          <div className="flex flex-col gap-2">
            <Button
              onClick={attemptPublish}
              loading={loadingAction === 'published'}
              className="w-full gap-2 justify-center bg-green-600 hover:bg-green-700 text-white"
            >
              <Globe className="w-4 h-4" /> Publish Now
            </Button>
          </div>
        )}

        {isEditorOrAdmin && currentStatus === 'PUBLISHED' && (
          <>
            <Button
              onClick={() => handleAction('unpublished', 'unpublish')}
              loading={loadingAction === 'unpublished'}
              className="w-full gap-2 justify-center"
              variant="outline"
            >
              <EyeOff className="w-4 h-4" /> Unpublish
            </Button>
            <Button
              onClick={() => handleAction('cache synced', 'sync-cache')}
              loading={loadingAction === 'cache synced'}
              className="w-full gap-2 justify-center"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4" /> Sync Cache
            </Button>
          </>
        )}
      </div>

      {/* Scheduled Publish section — editor/admin only */}
      {isEditorOrAdmin && (
        <div className="mt-4 pt-4 border-t border-border space-y-2">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Scheduled Publish</span>
          {currentSchedule && new Date(currentSchedule) > new Date() ? (
            <>
              <div className="flex flex-col gap-1 rounded-lg border border-border bg-bg-primary px-3 py-2">
                <span className="text-[10px] uppercase font-bold text-text-muted">Scheduled for</span>
                <div className="flex items-center gap-2 text-sm text-text-primary font-medium">
                  <Calendar className="w-4 h-4 text-accent" />
                  <span>
                    {new Date(currentSchedule).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={clearSchedule}
                disabled={loadingAction === 'clearSchedule'}
                className="w-full flex items-center justify-center gap-2 text-xs text-red-400 hover:text-red-300 border border-red-500/20 rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                {loadingAction === 'clearSchedule' ? 'Clearing...' : 'Clear Schedule'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 text-xs text-text-muted hover:text-text-primary border border-border rounded-lg px-3 py-2 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              Set Schedule
            </button>
          )}
        </div>
      )}

      {/* Embargo section — editor/admin only */}
      {isEditorOrAdmin && (
        <div className="mt-4 pt-4 border-t border-border space-y-2">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Embargo</span>
          {currentEmbargo && new Date(currentEmbargo) > new Date() ? (
            <>
              <EmbargoCountdown embargoUntil={currentEmbargo} />
              <button
                type="button"
                onClick={clearEmbargo}
                disabled={loadingAction === 'clearEmbargo'}
                className="w-full flex items-center justify-center gap-2 text-xs text-red-400 hover:text-red-300 border border-red-500/20 rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
              >
                <ShieldOff className="w-3.5 h-3.5" />
                {loadingAction === 'clearEmbargo' ? 'Clearing...' : 'Clear Embargo'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEmbargoModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 text-xs text-text-muted hover:text-text-primary border border-border rounded-lg px-3 py-2 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Set Embargo
            </button>
          )}
        </div>
      )}

      {/* Publish Validation Gate */}
      <PublishGate 
        isOpen={isPublishGateOpen}
        onClose={() => setIsPublishGateOpen(false)}
        onConfirm={confirmPublish}
        checks={validationChecks}
      />

      {/* Reject Modal */}
      <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} title="Reject Article">
        <div className="space-y-4 pt-4">
          <p className="text-sm text-text-muted">Please provide a reason for rejecting this article. This will be sent to the author.</p>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="w-full bg-bg-primary border border-border rounded-lg px-4 py-3 focus:outline-none focus:border-accent-light"
            rows={4}
            placeholder="Rejection reason..."
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)}>Cancel</Button>
            <Button
              onClick={submitRejection}
              loading={loadingAction === 'rejected'}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deletion Request Modal */}
      <Modal isOpen={isDeletionRequestModalOpen} onClose={() => setIsDeletionRequestModalOpen(false)} title="Request Deletion">
        <div className="space-y-4 pt-4">
          <p className="text-sm text-text-muted">
            This article is {currentStatus.toLowerCase().replace('_', ' ')} — an editor or admin needs to approve permanent deletion. Explain why it should be removed.
          </p>
          <textarea
            value={deletionReason}
            onChange={(e) => setDeletionReason(e.target.value)}
            className="w-full bg-bg-primary border border-border rounded-lg px-4 py-3 focus:outline-none focus:border-accent-light"
            rows={4}
            placeholder="Reason for deletion..."
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsDeletionRequestModalOpen(false)}>Cancel</Button>
            <Button
              onClick={submitDeletionRequest}
              loading={loadingAction === 'deletion-requested'}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Submit Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* Schedule Modal */}
      <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} title="Schedule Article Publish">
        <div className="space-y-4 pt-4">
          <p className="text-sm text-text-muted">Select a future date and time to automatically publish this article.</p>
          <input
            type="datetime-local"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="w-full bg-bg-primary border border-border rounded-lg px-4 py-3 focus:outline-none focus:border-accent-light"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsScheduleModalOpen(false)}>Cancel</Button>
            <Button
              onClick={submitSchedule}
              loading={loadingAction === 'scheduled'}
              className="bg-accent hover:bg-accent-light text-white"
            >
              Confirm Schedule
            </Button>
          </div>
        </div>
      </Modal>

      {/* Embargo Modal */}
      <Modal isOpen={isEmbargoModalOpen} onClose={() => setIsEmbargoModalOpen(false)} title="Set Embargo">
        <div className="space-y-4 pt-4">
          <p className="text-sm text-text-muted">
            Embargoed articles cannot be accessed by the public until the embargo date passes.
            Editors and admins can always view embargoed content.
          </p>
          <input
            type="datetime-local"
            value={embargoDate}
            onChange={(e) => setEmbargoDate(e.target.value)}
            className="w-full bg-bg-primary border border-border rounded-lg px-4 py-3 focus:outline-none focus:border-accent-light"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsEmbargoModalOpen(false)}>Cancel</Button>
            <Button
              onClick={submitEmbargo}
              loading={loadingAction === 'embargo'}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Set Embargo
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title="Confirm Deletion">
        <div className="space-y-4 pt-4">
          <p className="text-sm text-text-muted">
            Permanently delete this article? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
            <Button
              onClick={confirmDeleteAction}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Now
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

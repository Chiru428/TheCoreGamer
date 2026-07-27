'use client';

import { useEffect, useState, useRef } from 'react';
import { Shield, Trash2, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { useUIStore } from '@/store/uiStore';

export default function ModerationLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearDropdown, setShowClearDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { addToast } = useUIStore();

  useEffect(() => {
    fetchLogs();
    
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowClearDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchLogs = () => {
    setLoading(true);
    fetch('/api/admin/moderation-log')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLogs(data.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleClearLogs = async () => {
    setIsClearing(true);
    setShowClearDropdown(false);
    try {
      const res = await fetch('/api/admin/moderation-log', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setLogs([]);
        addToast({ type: 'success', message: 'Moderation logs cleared successfully' });
      } else {
        addToast({ type: 'error', message: data.error || 'Failed to clear logs' });
      }
    } catch (error) {
      addToast({ type: 'error', message: 'An error occurred while clearing logs' });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="w-full py-8 px-4">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-border relative">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-accent" />
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Moderation Log</h1>
            <p className="text-sm text-text-muted mt-1">Audit trail of admin and moderator actions.</p>
          </div>
        </div>
        
        <div className="relative" ref={dropdownRef}>
          <Button 
            variant="danger" 
            icon={<Trash2 className="w-4 h-4" />} 
            loading={isClearing}
            onClick={() => setShowClearDropdown(!showClearDropdown)}
            disabled={logs.length === 0}
          >
            Clear Logs
          </Button>
          
          {showClearDropdown && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-3 border-b border-border bg-bg-elevated/50 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                <p className="text-sm text-text-primary font-medium leading-snug">
                  Are you sure you want to clear all moderation logs? This action cannot be undone.
                </p>
              </div>
              <div className="p-2 flex flex-col gap-1">
                <button
                  onClick={handleClearLogs}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10 rounded-lg transition-colors"
                >
                  Confirm Clear All Logs
                </button>
                <button
                  onClick={() => setShowClearDropdown(false)}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-text-primary hover:bg-bg-elevated rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-bg-surface rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-muted">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-text-muted">No moderation logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-bg-elevated text-text-muted font-medium border-b border-border">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Target Type</th>
                  <th className="px-6 py-4">Target ID</th>
                  <th className="px-6 py-4">Moderator</th>
                  <th className="px-6 py-4">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-bg-elevated/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-text-muted">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-text-primary">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 text-text-muted">
                      {log.targetType}
                    </td>
                    <td className="px-6 py-4 text-text-dim truncate max-w-[120px]" title={log.targetId}>
                      {log.targetId}
                    </td>
                    <td className="px-6 py-4">
                      {log.Moderator ? (
                        <span className="font-medium text-accent">{log.Moderator.displayName}</span>
                      ) : (
                        <span className="text-text-dim">System</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-text-muted">
                      {log.reason || <span className="text-text-dim italic">None</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

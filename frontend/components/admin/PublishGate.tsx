'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { ValidationCheck } from '@/lib/publish-validation';
import { AlertCircle, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PublishGateProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  checks: ValidationCheck[];
  isPublishing?: boolean;
}

export default function PublishGate({ isOpen, onClose, onConfirm, checks, isPublishing }: PublishGateProps) {
  const errors = checks.filter(c => c.severity === 'error');
  const warnings = checks.filter(c => c.severity === 'warning');
  const hasErrors = errors.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pre-Publication Checklist"
      size="lg"
    >
      <div className="space-y-6">
        <div className="text-sm text-text-muted">
          {hasErrors 
            ? "We found some critical issues that must be resolved before this article can be published."
            : "Review these optional improvements before publishing your article."
          }
        </div>

        <div className="space-y-4">
          {/* Errors Section */}
          {errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-danger flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Critical Issues
              </h4>
              <div className="space-y-2">
                {errors.map(check => (
                  <div key={check.id} className="p-3 rounded-lg bg-danger/5 border border-danger/20 flex gap-3">
                    <div className="shrink-0 mt-0.5">
                      <div className="w-5 h-5 rounded-full bg-danger/20 flex items-center justify-center text-danger text-[10px] font-bold">!</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-text-primary">{check.message}</div>
                      {check.detail && <div className="text-xs text-text-muted mt-0.5">{check.detail}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings Section */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-warning flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Recommended Fixes
              </h4>
              <div className="space-y-2">
                {warnings.map(check => (
                  <div key={check.id} className="p-3 rounded-lg bg-warning/5 border border-warning/20 flex gap-3">
                    <div className="shrink-0 mt-0.5 text-warning">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-text-primary">{check.message}</div>
                      {check.detail && <div className="text-xs text-text-muted mt-0.5">{check.detail}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {checks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <div className="text-lg font-bold text-text-primary">All checks passed!</div>
                <div className="text-sm text-text-muted">Your article is ready for the world.</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Back to Editor
          </Button>
          
          {!hasErrors ? (
            <Button 
              type="button"
              onClick={onConfirm}
              loading={isPublishing}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              Publish Anyway <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button type="button" disabled className="opacity-50 cursor-not-allowed">
              Fix Critical Issues to Publish
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

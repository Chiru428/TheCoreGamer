import { AlertTriangle, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';

interface Props {
  gameVersion: string;
  lastVerifiedAt?: string | null;
  lastVerifiedVersion?: string | null;
  compatibilityNotes?: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / DAY_MS);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

type Tier = 'green' | 'amber' | 'red';

function verificationTier(lastVerifiedAt?: string | null): Tier {
  if (!lastVerifiedAt) return 'red';
  const days = (Date.now() - new Date(lastVerifiedAt).getTime()) / DAY_MS;
  if (days <= 90) return 'green';
  if (days <= 180) return 'amber';
  return 'red';
}

const TIER_STYLES: Record<Tier, { badge: string; icon: typeof ShieldCheck; label: string }> = {
  green: { badge: 'bg-accent-green/10 text-accent-green border-accent-green/20', icon: ShieldCheck, label: 'Recently verified' },
  amber: { badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: ShieldAlert, label: 'Verification aging' },
  red: { badge: 'bg-red-500/10 text-red-400 border-red-500/20', icon: ShieldQuestion, label: 'Needs verification' },
};

export default function CompatibilityWarning({ gameVersion, lastVerifiedAt, lastVerifiedVersion, compatibilityNotes }: Props) {
  const tier = verificationTier(lastVerifiedAt);
  const { badge, icon: TierIcon, label } = TIER_STYLES[tier];
  const verifiedAgainstDifferentVersion = !!lastVerifiedVersion && lastVerifiedVersion !== gameVersion;

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-6">
      <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-yellow-400 mb-1">Compatibility Warning</h4>
        <p className="text-sm text-text-muted mb-2">
          Written for version <strong className="text-text-primary">{gameVersion}</strong>. Some steps may no longer work with the latest game update.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${badge}`}>
            <TierIcon className="w-3.5 h-3.5" />
            {label} — {lastVerifiedAt ? `Last verified: ${relativeTime(lastVerifiedAt)}` : 'Never verified'}
          </span>
        </div>

        {verifiedAgainstDifferentVersion && (
          <p className="text-sm text-text-muted mt-2">
            Verified against version <strong className="text-text-primary">{lastVerifiedVersion}</strong> — the game is now on <strong className="text-text-primary">{gameVersion}</strong>.
          </p>
        )}

        {compatibilityNotes && (
          <p className="text-sm text-text-muted mt-2 italic">{compatibilityNotes}</p>
        )}
      </div>
    </div>
  );
}

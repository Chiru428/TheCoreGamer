import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import { getDifficultyDisplay } from '@/lib/utils';
import { Clock, Link as LinkIcon, ListChecks } from 'lucide-react';
import type { ModGuideData, ModPrerequisite } from '@/types';

export default function ModGuideHero({ guide }: { guide: ModGuideData }) {
  const diff = getDifficultyDisplay(guide.difficulty);
  const gameSlug = guide.game?.slug;

  // prerequisiteList can be stored as plain strings OR structured objects — normalize both
  const prereqs: ModPrerequisite[] = (guide.prerequisiteList || []).map((p: unknown) =>
    typeof p === 'string' ? { name: p, required: true } : p as ModPrerequisite
  );

  return (
    <div className="flex flex-col md:flex-row md:gap-8">
      <div className="flex-1 min-w-0">
        {gameSlug ? (
          <Link href={`/games/${gameSlug}`} className="text-[20px] font-semibold text-accent-light hover:underline">
            {guide.gameName}
          </Link>
        ) : (
          <span className="text-[20px] font-semibold text-text-muted">{guide.gameName}</span>
        )}

        <h2 className="text-xl font-bold text-text-primary mt-2 mb-1">{guide.modName}</h2>
        <p className="text-sm text-text-muted mb-4">Game Version: {guide.gameVersion}{guide.gameVersionNotes ? ` — ${guide.gameVersionNotes}` : ''}</p>

        <div className="flex flex-wrap gap-2">
          <Badge className={diff.color}>{diff.label}</Badge>
          <Badge variant="info"><Clock className="w-3 h-3 mr-1" />{guide.estimatedInstallMinutes} min install</Badge>
        </div>
      </div>

      {prereqs.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border md:mt-0 md:pt-0 md:border-t-0 md:border-l md:pl-8 md:w-64 md:shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-text-dim mb-3">
            <ListChecks className="w-3.5 h-3.5" />
            Prerequisites
          </div>
          <ul className="space-y-2">
            {prereqs.map((p, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-text-muted">
                <span className={p.required ? 'text-red-400' : 'text-text-dim'}>{p.required ? '●' : '○'}</span>
                {p.url ? <a href={p.url} target="_blank" rel="noopener" className="text-accent-light hover:underline flex items-center gap-1">{p.name}<LinkIcon className="w-3 h-3" /></a> : p.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

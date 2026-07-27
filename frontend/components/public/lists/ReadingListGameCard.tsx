import Link from 'next/link';
import Image from 'next/image';
import { Gamepad2, Star } from 'lucide-react';
import type { ReadingListGameItem } from '@/types';

export default function ReadingListGameCard({ game }: { game: ReadingListGameItem }) {
  return (
    <Link href={`/games/${game.slug}`} className="card-list-item">
      <div className="relative w-20 h-14 shrink-0 overflow-hidden rounded" style={{ background: 'var(--bg4)' }}>
        {game.coverImageUrl ? (
          <Image src={game.coverImageUrl} alt={game.title} fill className="object-cover" sizes="80px" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gamepad2 className="w-5 h-5" style={{ color: 'var(--muted3)' }} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1 justify-center">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Game</span>
        <p className="line-clamp-2 text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>{game.title}</p>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted2)' }}>
          {game.platforms?.slice(0, 3).map((p) => <span key={p}>{p}</span>)}
          {game.rating != null && (
            <span className="flex items-center gap-1"><Star className="w-3 h-3" />{game.rating.toFixed(1)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

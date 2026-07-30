'use client';

import Image from 'next/image';
import { ExternalLink, ShoppingCart, Package } from 'lucide-react';
import type { GameHubData, GameMediaEntry } from '@/types';
import styles from './gamehub.module.css';

function MediaCard({ entry, gameTitle }: { entry: GameMediaEntry | any; gameTitle: string }) {
  const coverUrl = entry.coverUrl || (entry.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${entry.cover.image_id}.jpg` : null);

  return (
    <a href={`https://store.steampowered.com/search/?term=${encodeURIComponent(`${gameTitle} ${entry.name ?? ''}`)}`} target="_blank" rel="noopener noreferrer" className={`${styles.dlcCard} hover:border-primary transition-colors group`}>
      <div className={styles.dlcCardImage}>
        {coverUrl ? (
          <Image src={coverUrl} alt={entry.name || gameTitle} fill unoptimized className="object-cover" sizes="(max-width: 640px) 50vw, 20vw" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <Package size={32} />
          </div>
        )}
      </div>
      <div className={styles.dlcCardContent}>
        <span className="text-[13px] font-bold leading-snug line-clamp-2" style={{ color: 'var(--text-strong)' }}>{entry.name}</span>
        <div className="mt-auto pt-2 flex items-center justify-between text-xs" style={{ color: 'var(--muted2)' }}>
          <span>{entry.category || 'DLC'}</span>
          {entry.releaseDate && <span>{new Date(entry.releaseDate).getFullYear()}</span>}
        </div>
      </div>
    </a>
  );
}

// Order sections the way IGDB groups them: Seasons, then Editions, then DLC/Packs/Bundles, then Expansions.
const CATEGORY_ORDER = ["Season", "Edition", "DLC", "Pack", "Bundle"] as const;
const CATEGORY_LABELS: Record<string, string> = {
  Season: "Seasons",
  Edition: "Editions",
  DLC: "DLC",
  Pack: "Packs/Addons",
  Bundle: "Bundles",
};

// Order expansion-type sections the way IGDB groups them.
const EXPANSION_CATEGORY_ORDER = ["Expansion", "Standalone Expansion", "Remake", "Remaster", "Expanded Game"] as const;
const EXPANSION_CATEGORY_LABELS: Record<string, string> = {
  Expansion: "Expansions",
  "Standalone Expansion": "Standalone Expansions",
  Remake: "Remakes",
  Remaster: "Remasters",
  "Expanded Game": "Expanded Games",
};

export default function DlcTab({ game }: { game: GameHubData }) {
  const linkedEditions = game.dlcs ?? [];
  const dlcsJson = (game.dlcsJson ?? []).filter(e => !/promod/i.test(e.name || ''));
  const expansionsJson = (game.expansionsJson ?? []).filter(e => !/promod/i.test(e.name || ''));

  const hasNothing =
    linkedEditions.length === 0 && dlcsJson.length === 0 && expansionsJson.length === 0;

  if (hasNothing) {
    return <div className={styles.emptyState}>No DLC tracked yet for {game.title}.</div>;
  }

  const groupedDlc = CATEGORY_ORDER.map((category) => ({
    category,
    entries: dlcsJson.filter((entry) => (entry.category ?? "DLC") === category),
  })).filter((group) => group.entries.length > 0);

  const groupedExpansions = EXPANSION_CATEGORY_ORDER.map((category) => ({
    category,
    entries: expansionsJson.filter((entry) => (entry.category ?? "Expansion") === category),
  })).filter((group) => group.entries.length > 0);

  return (
    <div>
      {linkedEditions.length > 0 && (
        <div className="mb-8">
          <div className="section-title-bar">Editions on TheCoreGamer ({linkedEditions.length})</div>
          <div className={styles.dlcGrid}>
            {linkedEditions.map((dlc) => (
              <a key={dlc.id} href={`/games/${dlc.slug}`} className={`${styles.dlcCard} hover:border-primary transition-colors group`}>
                <div className={styles.dlcCardImage}>
                  {dlc.coverImageUrl ? (
                    <Image src={dlc.coverImageUrl} alt={dlc.title} fill unoptimized className="object-cover" sizes="(max-width: 640px) 50vw, 20vw" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center opacity-30">
                      <Package size={32} />
                    </div>
                  )}
                </div>
                <div className={styles.dlcCardContent}>
                  <span className="text-[13px] font-bold leading-snug line-clamp-2" style={{ color: 'var(--text-strong)' }}>{dlc.title}</span>
                  <div className="mt-auto pt-2 flex items-center justify-between text-xs" style={{ color: 'var(--muted2)' }}>
                    <span>{dlc.gameEdition?.replace('_', ' ')}</span>
                    {dlc.releaseDate && <span>{new Date(dlc.releaseDate).getFullYear()}</span>}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {groupedExpansions.map(({ category, entries }) => (
        <div className="mb-8" key={category}>
          <div className="section-title-bar">{EXPANSION_CATEGORY_LABELS[category]} ({entries.length})</div>
          <div className={styles.dlcGrid}>
            {entries.map((entry, i) => (
              <MediaCard key={`${category}-${i}`} entry={entry} gameTitle={game.title} />
            ))}
          </div>
        </div>
      ))}

      {groupedDlc.map(({ category, entries }) => (
        <div className="mb-8" key={category}>
          <div className="section-title-bar">{CATEGORY_LABELS[category]} ({entries.length})</div>
          <div className={styles.dlcGrid}>
            {entries.map((entry, i) => (
              <MediaCard key={`${category}-${i}`} entry={entry} gameTitle={game.title} />
            ))}
          </div>
        </div>
      ))}

    </div>
  );
}

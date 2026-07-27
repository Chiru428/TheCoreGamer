'use client';

import { useState, useRef, useLayoutEffect } from 'react';
import Link from 'next/link';
import { Cpu, Users, Layers, Languages } from 'lucide-react';
import { slugify } from '@/lib/utils';
import type { GameHubData, GameReleaseDateEntry } from '@/types';
import PlatformIcon from './PlatformIcon';
import PublisherGames from './PublisherGames';
import styles from './gamehub.module.css';

const MULTIPLAYER_LABELS: Record<string, string> = {
  onlineCoop: 'Online Co-op',
  lanCoop: 'LAN Co-op',
  offlineCoop: 'Offline Co-op',
  splitscreen: 'Splitscreen',
};

function CollapsibleSection({ title, content, className }: { title: string; content: string; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [collapsible, setCollapsible] = useState(false);
  const contentRef = useRef<HTMLParagraphElement>(null);

  // line-clamp is a no-op when content already fits, so it's safe to keep
  // applied while measuring — only flag as collapsible if it actually overflows.
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el || expanded) return;
    
    const checkOverflow = () => {
      const clampedHeight = el.clientHeight;
      
      // Temporarily remove the clamp constraint inline to measure full height
      el.style.webkitLineClamp = 'unset';
      el.style.setProperty('line-clamp', 'unset');
      
      const fullHeight = el.scrollHeight;
      
      // Restore CSS class control
      el.style.webkitLineClamp = '';
      el.style.removeProperty('line-clamp');
      
      // 5px tolerance for subpixel rendering differences between block vs box
      setCollapsible(fullHeight > clampedHeight + 5);
    };

    checkOverflow();
    
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [content, expanded]);

  if (!content) return null;

  return (
    <div className={`${styles.contentCard} ${className || ''}`}>
      <div className="section-title-bar">{title}</div>
      <p ref={contentRef} className={`${styles.synopsis} ${!expanded ? styles.synopsisClamped : ''}`}>
        {content}
      </p>
      {collapsible && (
        <button type="button" className={styles.readMoreBtn} onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

export default function OverviewTab({ game, onWriteReview }: { game: GameHubData; onWriteReview?: () => void }) {

  const websites = game.websitesJson || {};
  
  const officialSite = websites.official || game.website;
  const redditLink = websites.reddit || game.redditUrl;

  // Real brand logos live in public/icons/links/. Wikipedia's mark ships
  // with no background fill, so it gets a white chip behind it for contrast.
  const sidebarLinks = [
    websites.steam && { label: 'Steam', href: websites.steam, group: 'store' as const, icon: { kind: 'image' as const, src: '/icons/links/steam.svg' } },
    websites.gog && { label: 'GOG', href: websites.gog, group: 'store' as const, icon: { kind: 'image' as const, src: '/icons/links/gog.svg' } },
    websites.epicgames && { label: 'Epic Games', href: websites.epicgames, group: 'store' as const, icon: { kind: 'image' as const, src: '/icons/links/epicgames.svg' } },
    websites.itch && { label: 'itch.io', href: websites.itch, group: 'store' as const, icon: { kind: 'image' as const, src: '/icons/links/itchio.svg' } },
    websites.xbox && { label: 'Xbox', href: websites.xbox, group: 'store' as const, icon: { kind: 'image' as const, src: '/icons/links/xbox.svg' } },
    websites.playstation && { label: 'PlayStation Store', href: websites.playstation, group: 'store' as const, icon: { kind: 'image' as const, src: '/icons/links/playstation.svg' } },
    officialSite && { label: 'Official Site', href: officialSite, group: 'other' as const, icon: { kind: 'image' as const, src: '/icons/links/official-website.svg' } },
    websites.wikia && { label: 'Wikia', href: websites.wikia, group: 'other' as const, icon: { kind: 'image' as const, src: '/icons/links/fandom.svg' } },
    websites.wikipedia && { label: 'Wikipedia', href: websites.wikipedia, group: 'other' as const, icon: { kind: 'image' as const, src: '/icons/links/wikipedia.svg' } },
    websites.facebook && { label: 'Facebook', href: websites.facebook, group: 'other' as const, icon: { kind: 'image' as const, src: '/icons/links/facebook.svg' } },
    websites.twitter && { label: 'Twitter / X', href: websites.twitter, group: 'other' as const, icon: { kind: 'image' as const, src: '/icons/links/twitter.svg' } },
    websites.twitch && { label: 'Twitch', href: websites.twitch, group: 'other' as const, icon: { kind: 'image' as const, src: '/icons/links/twitch.svg' } },
    websites.instagram && { label: 'Instagram', href: websites.instagram, group: 'other' as const, icon: { kind: 'image' as const, src: '/icons/links/instagram.svg' } },
    websites.youtube && { label: 'YouTube', href: websites.youtube, group: 'other' as const, icon: { kind: 'image' as const, src: '/icons/links/youtube.svg' } },
    redditLink && { label: 'Reddit', href: redditLink, group: 'other' as const, icon: { kind: 'image' as const, src: '/icons/links/reddit.svg' } },
    websites.discord && { label: 'Discord', href: websites.discord, group: 'other' as const, icon: { kind: 'image' as const, src: '/icons/links/discord.svg' } },
    game.metacritic && { label: `Metacritic (${game.metacritic})`, href: `https://www.metacritic.com/search/${game.title}`, group: 'other' as const, icon: { kind: 'image' as const, src: '/icons/links/metacritic.svg' } },
    game.igdbUrl && { label: 'IGDB Entry', href: game.igdbUrl, group: 'other' as const, icon: { kind: 'image' as const, src: '/icons/links/igdb.svg' } },
  ].filter(Boolean) as Array<{
    label: string;
    href: string;
    group: 'store' | 'other';
    icon: { kind: 'image'; src: string };
  }>;

  const storeLinks = sidebarLinks.filter((l) => l.group === 'store');
  const otherLinks = sidebarLinks.filter((l) => l.group === 'other');

  // -- Ratings (IGDB critic + TheCoreGamer editorial + site user ratings) --
  const review = game.GameReview?.[0] ?? null;
  const editorialScore = review ? Number(review.reviewScore) : null;
  const ratingBadges = [
    {
      label: 'Critic Rating',
      sub: game.aggregatedRating != null ? `${game.aggregatedRatingCount ?? 0} critics` : 'No critic score yet',
      value: game.aggregatedRating != null ? Math.round(game.aggregatedRating) : 'N/A',
    },
    {
      label: 'Editorial Score',
      sub: editorialScore != null ? 'TheCoreGamer' : 'No review yet',
      value: editorialScore != null ? Math.round(editorialScore * 10) : 'N/A',
    },
    {
      label: 'User Rating',
      sub: game.userRatings.count > 0 ? `${game.userRatings.count} ratings` : 'No ratings yet',
      value: game.userRatings.count > 0 ? Math.round(game.userRatings.average * 10) : 'N/A',
    },
  ] as Array<{ label: string; sub: string; value: number | string }>;

  // -- Multiplayer support grid --------------------------------------------
  const mp = game.multiplayerModesJson;
  const multiplayerEntries = mp
    ? (Object.entries(MULTIPLAYER_LABELS) as Array<[keyof typeof MULTIPLAYER_LABELS, string]>)
        .filter(([key]) => mp[key as keyof typeof mp])
        .map(([key, label]) => ({
          label,
          max: key === 'onlineCoop' ? mp.onlineCoopMax : key === 'offlineCoop' ? mp.offlineCoopMax : undefined,
        }))
    : [];

  // -- Release dates by platform -------------------------------------------
  // IGDB lists a separate row per release status (Early Access, Full Release,
  // etc.) and region, so the same platform shows up repeatedly. Keep only
  // Worldwide rows, collapsed to the single earliest date per platform.
  const releaseDates = Object.values(
    (game.releaseDatesByPlatformJson ?? [])
      .filter((rd) => rd.region === 'Worldwide')
      .reduce<Record<string, GameReleaseDateEntry>>((acc, rd) => {
        const key = rd.platform || 'Unknown Platform';
        const existing = acc[key];
        if (!existing || (rd.date && (!existing.date || rd.date < existing.date))) {
          acc[key] = rd;
        }
        return acc;
      }, {})
  );

  // -- Language support, grouped by language ------------------------------
  const languageSupports = game.languageSupportsJson ?? [];
  const languageGroups = languageSupports.reduce<Record<string, string[]>>((acc, ls) => {
    if (!ls.language) return acc;
    if (!acc[ls.language]) acc[ls.language] = [];
    if (ls.type) acc[ls.language].push(ls.type);
    return acc;
  }, {});

  // -- Companies --------------------------------------------------------
  const companies = game.allCompaniesJson ?? [];
  const developers = companies.filter((c) => c.role === 'Developer').map((c) => c.name);
  const publishers = companies.filter((c) => c.role === 'Publisher').map((c) => c.name);
  const portingStudios = companies.filter((c) => c.role === 'Porting').map((c) => c.name);
  const supportingStudios = companies.filter((c) => c.role === 'Supporting').map((c) => c.name);

  const displayDevelopers = game.developer || (developers.length > 0 ? developers.join(', ') : null);
  const displayPublishers = game.publisher || (publishers.length > 0 ? publishers.join(', ') : null);

  return (
    <>
      <div className={styles.overviewLayout}>
        {/* Desktop: a real grid column, so its own content (long synopsis, etc.)
            never affects the sidebar column's height. Mobile: unwrapped via
            `display: contents` so these children can be freely reordered. */}
        <div className={styles.mainCol}>
        {/* -- About the Game & Storyline --------------------------------- */}
        <CollapsibleSection 
          title="About the Game" 
          content={game.description || ''} 
          className={styles.orderSynopsis} 
        />
        <CollapsibleSection 
          title="Storyline" 
          content={game.storyline || ''} 
          className={styles.orderSynopsis} 
        />

      <div className={styles.orderDetails}>
        {/* -- Key details ---------------------------------------------- */}
        <div className={styles.contentCard}>
          <div className="section-title-bar">Details</div>
          <div className={styles.detailsColumns}>
            {displayDevelopers && (
              <div className={styles.detailsColumnItem}>
                <div className={styles.detailLabel}>Developer</div>
                <div className={styles.detailValue}>{displayDevelopers}</div>
              </div>
            )}
            {displayPublishers && (
              <div className={styles.detailsColumnItem}>
                <div className={styles.detailLabel}>Publisher</div>
                <div className={styles.detailValue}>{displayPublishers}</div>
              </div>
            )}
            {portingStudios.length > 0 && (
              <div className={styles.detailsColumnItem}>
                <div className={styles.detailLabel}>Porting</div>
                <div className={styles.detailValue}>{portingStudios.join(', ')}</div>
              </div>
            )}
            {supportingStudios.length > 0 && (
              <div className={styles.detailsColumnItem}>
                <div className={styles.detailLabel}>Supporting</div>
                <div className={styles.detailValue}>{supportingStudios.join(', ')}</div>
              </div>
            )}
            {game.releaseDate && (
              <div className={styles.detailsColumnItem}>
                <div className={styles.detailLabel}>Release Date</div>
                <div className={styles.detailValue}>
                  {new Date(game.releaseDate).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
            )}
            {game.playtime != null && game.playtime > 0 && (
              <div className={styles.detailsColumnItem}>
                <div className={styles.detailLabel}>Playtime</div>
                <div className={styles.detailValue}>{game.playtime} Hours</div>
              </div>
            )}
            {(game.esrbRating || game.pegiRating) && (
              <div className={styles.detailsColumnItem}>
                <div className={styles.detailLabel}>Age Rating</div>
                <div className={styles.detailValue}>
                  {[game.esrbRating && `ESRB ${game.esrbRating}`, game.pegiRating && `PEGI ${game.pegiRating}`]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
            )}
            {game.gameEngine && (
              <div className={styles.detailsColumnItem}>
                <div className={styles.detailLabel}>Game Engine</div>
                <div className={styles.detailValue}>
                  <span className="inline-flex items-center gap-1.5">
                    <Cpu size={14} style={{ color: 'var(--accent)' }} />
                    {game.gameEngine}
                  </span>
                </div>
              </div>
            )}
            {game.collectionName && (
              <div className={styles.detailsColumnItem}>
                <div className={styles.detailLabel}>Collection</div>
                <div className={styles.detailValue}>
                  <Link
                    href={`/games?collection=${encodeURIComponent(game.collectionName)}`}
                    className="inline-flex items-center gap-1.5 hover:text-accent transition-colors"
                  >
                    <Layers size={14} style={{ color: 'var(--accent)' }} />
                    {game.collectionName}
                  </Link>
                </div>
              </div>
            )}
            {game.genres?.length > 0 && (
              <div className={styles.detailsColumnItem}>
                <div className={styles.detailLabel}>Genres</div>
                <div className={`${styles.detailValue} flex flex-wrap gap-1.5 mt-1.5`}>
                  {game.genres.map((g) => (
                    <Link key={g} href={`/games?genres=${encodeURIComponent(g)}`} className="px-2 py-0.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 transition-all">
                      {g}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {game.platforms?.length > 0 && (
              <div className={styles.detailsColumnItem}>
                <div className={styles.detailLabel}>Platforms</div>
                <div className={styles.detailValue}>{game.platforms.join(', ')}</div>
              </div>
            )}
            {game.themes && (
              <div className={styles.detailsColumnItem}>
                <div className={styles.detailLabel}>Themes</div>
                <div className={`${styles.detailValue} flex flex-wrap gap-1.5 mt-1.5`}>
                  {game.themes.split(/,\s*(?![^()]*\))/).map((t) => t.trim()).filter(Boolean).map((t) => (
                    <Link key={t} href={`/games?themes=${encodeURIComponent(t)}`} className="px-2 py-0.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 transition-all">
                      {t}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {(game.gameModes?.length ?? 0) > 0 && (
              <div className={styles.detailsColumnItem}>
                <div className={styles.detailLabel}>Game Modes</div>
                <div className={`${styles.detailValue} flex flex-wrap gap-1.5 mt-1.5`}>
                  {game.gameModes!.map((m) => (
                    <Link key={m} href={`/games?gameModes=${encodeURIComponent(m)}`} className="px-2 py-0.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 transition-all">
                      {m}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {(game.playerPerspectives?.length ?? 0) > 0 && (
              <div className={styles.detailsColumnItem}>
                <div className={styles.detailLabel}>Player Perspectives</div>
                <div className={`${styles.detailValue} flex flex-wrap gap-1.5 mt-1.5`}>
                  {game.playerPerspectives!.map((p) => (
                    <Link key={p} href={`/games?perspectives=${encodeURIComponent(p)}`} className="px-2 py-0.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 transition-all">
                      {p}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {multiplayerEntries.length > 0 && (
            <div className={styles.detailsColumns} style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              {multiplayerEntries.map((mpEntry) => (
                <div key={mpEntry.label} className={styles.detailsColumnItem}>
                  <div className={styles.detailLabel}>{mpEntry.label}</div>
                  <div className={styles.detailValue}>
                    {mpEntry.max ? `Up to ${mpEntry.max} players` : 'Supported'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* -- Release dates by platform ------------------------------- */}
      {releaseDates.length > 0 && (
        <div className={`widget ${styles.orderReleaseDates}`}>
          <div className="section-title-bar">Release Dates</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4" style={{ marginTop: 16 }}>
            {releaseDates.map((rd, i) => (
              <div key={`${rd.platform}-${rd.region}-${i}`} className="flex flex-col gap-1 text-sm">
                <span className={`${styles.detailValue} inline-flex items-center gap-1.5`}>
                  <PlatformIcon platform={rd.platform || ''} />
                  {rd.platform || 'Unknown Platform'}
                </span>
                <span className="flex items-center gap-2" style={{ color: 'var(--muted2)', fontSize: 'calc(0.8rem + 1px)' }}>
                  <span>{rd.region}</span>
                  <span>·</span>
                  <span>
                    {rd.date
                      ? new Date(rd.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                      : 'TBA'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.orderRest2}>
        {/* -- Language support ---------------------------------------- */}
        {Object.keys(languageGroups).length > 0 && (
          <div className={styles.contentCard}>
            <div className="section-title-bar">
              <span className="inline-flex items-center gap-2">
                <Languages size={16} /> Language Support ({Object.keys(languageGroups).length})
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4" style={{ marginTop: 16 }}>
              {Object.entries(languageGroups).map(([language, types]) => (
                <div key={language}>
                  <div className={styles.detailValue}>{language}</div>
                  {types.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {types.map((t) => (
                        <span key={t} className="gh-tag gh-tag-outline">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Desktop: a real grid column, independent of mainCol's height.
          Mobile: unwrapped via `display: contents`, same as mainCol. */}
      <aside className={styles.asideCol}>
        {/* -- Links ---------------------------------------------------- */}
        <div className={styles.orderLinks}>
          {sidebarLinks.length > 0 && (
            <div className="widget">
              <div className="section-title-bar">Links</div>
              {storeLinks.length > 0 && (
                <div className={styles.linkIconGrid}>
                  {storeLinks.map(({ label, href, icon }) => (
                    <a key={label} href={href} target="_blank" rel="noopener noreferrer" title={label} className={styles.linkIconTile}>
                      <img src={icon.src} alt={label} />
                    </a>
                  ))}
                </div>
              )}
              {storeLinks.length > 0 && otherLinks.length > 0 && <div className={styles.linkDivider} />}
              {otherLinks.length > 0 && (
                <div className={styles.linkIconGrid}>
                  {otherLinks.map(({ label, href, icon }) => (
                    <a key={label} href={href} target="_blank" rel="noopener noreferrer" title={label} className={styles.linkIconTile}>
                      <img src={icon.src} alt={label} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>


      </aside>
    </div>

      {game.publisher && (
        <PublisherGames publisher={game.publisher} excludeSlug={game.slug} />
      )}
    </>
  );
}

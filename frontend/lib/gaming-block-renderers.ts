/**
 * gaming-block-renderers.ts
 * Pure HTML renderers for gaming blocks.
 * These functions must remain deterministic and have no dependencies on DOM or Editor.
 *
 * CHANGELOG (FAQ):
 *  - Removed per-item emoji icons (replaced by a clean numbered indicator)
 *  - All items are closed by default (changed from first open)
 *  - Removed filter row entirely — pure accordion only
 *  - Improved open-state styling hooks via CSS classes
 */

export interface MentionedGameAttrs {
  title: string;
  developer: string;
  publisher: string;
  genres: string;
  releaseDate: string;
  platforms: string;
  coverImageUrl?: string;
  slug?: string;
}

export interface ReviewCardAttrs {
  title: string;
  score: number;
  platform: string;
  gameplay: number;
  graphics: number;
  story: number;
  audio: number;
  summary?: string;
  pros?: string[];
  cons?: string[];
}

export interface BenchmarkCardAttrs {
  title: string;
  benchmarks: Array<{ label: string; value: string; percentage: number }>;
}

export interface PatchNotesAttrs {
  version: string;
  date: string;
  notes: Array<{ type: 'added' | 'fixed' | 'changed' | 'removed'; text: string }>;
}

export interface SystemRequirementsAttrs {
  minimum: Record<string, string>;
  recommended: Record<string, string>;
}

export interface ProsConsAttrs {
  pros: string[];
  cons: string[];
}

export interface DealCardAttrs {
  store: string;
  product: string;
  price: string;
  originalPrice?: string;
  url: string;
  expiryDate?: string;
  platform?: string;
  dealScore?: number;
}

export interface SpoilerBlockAttrs {
  label: string;
  content: string;
}

export interface CorrectionNoticeAttrs {
  originalText: string;
  correctionText: string;
  correctedAt: string;
  disclosureLabel: string;
}

export interface PullQuoteAttrs {
  quote: string;
  attribution: string;
  role: string;
}

export interface TimelineAttrs {
  title: string;
  items: Array<{ label: string; title: string; description: string }>;
}

export interface FAQAttrs {
  items: Array<{ question: string; answer: string }>;
}

export interface ChangelogAttrs {
  title: string;
  changes: Array<{ version: string; text: string; type: 'added' | 'fixed' | 'changed' | 'removed'; }>;
}

export interface VersionCompareAttrs {
  versionA: string;
  featuresA: string[];
  versionB: string;
  featuresB: string[];
}

export interface BossCardAttrs {
  name: string;
  subtitle?: string;
  imageUrl?: string;
  hp?: string;
  reward?: string;
  location?: string;
  weaknesses?: string;
  resistances?: string;
  attacks?: string;
  difficulty: number;
  strategy?: string;
}

export interface BuildCardAttrs {
  buildName: string;
  gameName: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  playstyle?: string;
  stats?: string;
  equipment?: string;
  description?: string;
  imageUrl?: string;
  patchVersion?: string;
}

// --- Renderers ----------------------------------------------------------------

export function renderMentionedGame(attrs: MentionedGameAttrs): string {
  const { title, developer, publisher, genres, releaseDate, platforms, coverImageUrl, slug } = attrs;
  
  const renderPlatforms = () => {
    if (!platforms) return '';
    return platforms.split(',').map(p => {
      const pClean = p.trim();
      let colorClass = 'background:#374151;color:#f3f4f6;'; // Default gray
      const pLower = pClean.toLowerCase();
      if (pLower.includes('ps') || pLower.includes('playstation')) colorClass = 'background:#1e3a8a;color:#ffffff;'; // Dark blue
      else if (pLower.includes('xbox')) colorClass = 'background:#3f6212;color:#ffffff;'; // Dark green
      else if (pLower.includes('switch') || pLower.includes('nintendo')) colorClass = 'background:#991b1b;color:#ffffff;'; // Dark red
      else if (pLower.includes('pc') || pLower.includes('windows')) colorClass = 'background:#334155;color:#ffffff;'; // Slate
      
      return `<div style="${colorClass}padding:4px 10px !important;font-size:13px;font-weight:700;border-radius:6px;line-height:1;">${pClean}</div>`;
    }).join('');
  };

  const imageHtml = coverImageUrl 
    ? `<img src="${coverImageUrl}" alt="${title} cover" style="width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);" loading="lazy" />`
    : `<div style="width:100%;aspect-ratio:2/3;background:var(--gc-elevated);border-radius:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--gc-muted);font-size:12px;padding:8px;"><svg style="width:32px;height:32px;margin-bottom:8px;opacity:0.5;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>No Cover</div>`;

  return `
    <div class="not-prose my-10 md:h-[300px]" data-type="mentioned-game" style="background:transparent;border:1px solid var(--gc-text);border-radius:0;overflow:hidden;position:relative;">
      
      <div class="flex flex-col md:flex-row gap-6 p-5 h-full" style="font-family:'acumin-pro', sans-serif;">
        <!-- Cover Image (Left) -->
        <div class="w-full max-w-[170px] shrink-0 mx-auto md:mx-0 flex items-center">
          ${imageHtml}
        </div>
        
        <!-- Details (Right) -->
        <div class="flex-1 flex flex-col justify-center py-1">
          <h3 style="font-family:'acumin-pro', sans-serif;font-size:22px;font-weight:900;color:var(--gc-text);margin:0 0 16px;line-height:1.2;letter-spacing:-0.02em;">
            ${slug ? `<a href="/games/${slug}" class="hover:underline" style="color:inherit;text-decoration-thickness:2px;text-underline-offset:4px;">${title || 'Game Title'}</a>` : `${title || 'Game Title'}`}
          </h3>
          
          <div style="display:grid;grid-template-columns:110px 1fr;row-gap:12px;column-gap:16px;align-items:center;">
            ${developer ? `<div style="font-size:15px;color:var(--gc-muted);">Developer</div><div style="font-size:15px;color:var(--gc-text);font-weight:700;">${developer}</div>` : ''}
            ${publisher ? `<div style="font-size:15px;color:var(--gc-muted);">Publisher</div><div style="font-size:15px;color:var(--gc-text);font-weight:700;">${publisher}</div>` : ''}
            ${genres ? `<div style="font-size:15px;color:var(--gc-muted);">Genre</div><div style="font-size:15px;color:var(--gc-text);font-weight:700;">${genres}</div>` : ''}
            ${releaseDate ? `<div style="font-size:15px;color:var(--gc-muted);">Released</div><div style="font-size:15px;color:var(--gc-text);font-weight:700;">${releaseDate}</div>` : ''}
            ${platforms ? `<div style="font-size:15px;color:var(--gc-muted);">Platforms</div><div class="flex flex-wrap gap-2 items-center" style="font-family:'acumin-pro', sans-serif;">${renderPlatforms()}</div>` : ''}
          </div>
        </div>
      </div>
    </div>
  `.trim();
}

export function renderReviewCard(attrs: ReviewCardAttrs): string {
  const {
    title = 'Game Title',
    score = 8.5,
    platform = 'PC',
    gameplay = 8.0,
    graphics = 8.0,
    story = 8.0,
    audio = 8.0,
    summary = 'Write your review summary here. Describe the overall experience, standout moments, and who this game is for.',
    pros = ['Excellent gameplay loop', 'Stunning visuals'],
    cons = ['Short campaign', 'Limited customization'],
  } = attrs;

  const pct = (score / 10) * 100;
  const color = score >= 8 ? 'var(--gc-accent)' : score >= 6 ? 'var(--gc-warning)' : 'var(--gc-danger)';
  const verdict = score >= 9 ? 'Must-Play' : score >= 8 ? 'Outstanding' : score >= 6 ? 'Good' : 'Mediocre';

  return `<div class="review-score-card" data-type="review-score-card" style="background:var(--gc-surface);border:1px solid var(--gc-border);border-radius:16px;overflow:hidden;margin:24px 0">
    <div class="rsc-header" style="display:flex;align-items:center;gap:16px;padding:20px;border-bottom:1px solid var(--gc-border)">
      <div style="flex:1">
        <div style="font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:var(--gc-accent-dim);margin-bottom:4px">Review</div>
        <h3 class="rsc-title" style="font-family:var(--gc-font-heading);font-size:22px;font-weight:700;color:var(--gc-text);margin:0 0 8px">${title}</h3>
        <span class="rsc-platform" style="font-size:10px;padding:2px 10px;border-radius:20px;background:color-mix(in srgb, var(--gc-accent) 8%, transparent);color:var(--gc-accent);border:1px solid var(--gc-border)">${platform}</span>
      </div>
      <div class="rsc-score" style="text-align:center;background:var(--gc-elevated);border:1px solid var(--gc-border);border-radius:12px;padding:12px 16px">
        <div class="rsc-score-value" style="font-family:var(--gc-font-heading);font-size:36px;font-weight:700;color:${color}">${score}</div>
        <div class="rsc-score-max" style="font-size:9px;letter-spacing:0.15em;color:var(--gc-border);text-transform:uppercase">/ 10</div>
      </div>
    </div>
    <div class="review-categories" style="padding:16px 20px;border-bottom:1px solid var(--gc-border);display:grid;grid-template-columns:1fr 1fr;gap:12px 24px">
      ${renderCategory('Gameplay', gameplay)}
      ${renderCategory('Graphics', graphics)}
      ${renderCategory('Story', story)}
      ${renderCategory('Audio', audio)}
    </div>
    <div class="rsc-summary" style="padding:16px 20px;border-bottom:1px solid var(--gc-border)">
      <p style="color:var(--gc-muted);font-size:14px;line-height:1.7;margin:0">${summary}</p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--gc-border)">
      <div style="padding:16px 20px;border-right:1px solid var(--gc-border)">
        <div style="font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:var(--gc-success);margin-bottom:8px">Pros</div>
        ${pros.map(p => `<div style="font-size:12px;color:var(--gc-success)">+ ${p}</div>`).join('')}
      </div>
      <div style="padding:16px 20px">
        <div style="font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:var(--gc-danger);margin-bottom:8px">Cons</div>
        ${cons.map(c => `<div style="font-size:12px;color:var(--gc-danger)">− ${c}</div>`).join('')}
      </div>
    </div>
    <div class="rsc-verdict" style="padding:12px 20px;background:var(--gc-elevated);display:flex;align-items:center;justify-content:space-between">
      <span class="rsc-verdict-label" style="font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--gc-accent-dim)">The Verdict</span>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="rsc-verdict-bar" style="height:4px;width:100px;border-radius:2px;background:var(--gc-elevated);overflow:hidden">
          <div class="rsc-verdict-fill" style="height:100%;width:${pct}%;border-radius:2px;background:var(--gc-accent)"></div>
        </div>
        <span style="font-size:11px;font-weight:700;color:${color}">${verdict}</span>
      </div>
    </div>
  </div>`;
}

export function renderBenchmarkCard(attrs: BenchmarkCardAttrs): string {
  const { title, benchmarks } = attrs;
  return `<div class="benchmark-card" data-type="benchmark-card">
    <h4>${title}</h4>
    ${benchmarks.map(b => `
      <div class="benchmark-row">
        <span class="label">${b.label}</span>
        <div class="bar-track">
          <div class="bar-fill" style="width:${b.percentage}%"></div>
        </div>
        <span class="value">${b.value}</span>
      </div>
    `).join('')}
  </div>`;
}

export function renderPatchNotes(attrs: PatchNotesAttrs): string {
  const { version, date, notes } = attrs;
  return `<div class="patch-notes-block" data-type="patch-notes">
    <div class="patch-version">
      <span>Patch ${version}</span>
      <span class="patch-date">${date}</span>
    </div>
    <div class="patch-body">
      ${notes.map(n => `
        <p><span class="patch-tag ${n.type}">${n.type.charAt(0).toUpperCase() + n.type.slice(1)}</span> ${n.text}</p>
      `).join('')}
    </div>
  </div>`;
}

export function renderSystemRequirements(attrs: SystemRequirementsAttrs): string {
  const { minimum, recommended } = attrs;

  const renderCol = (title: string, type: string, reqs: Record<string, string>) => `
    <div class="req-col ${type}">
      <div class="req-col-title">${title}</div>
      ${Object.entries(reqs).map(([key, val]) => `
        <div class="req-row"><span class="req-key">${key}</span><span class="req-val">${val}</span></div>
      `).join('')}
    </div>
  `;

  return `<div class="system-req-block" data-type="system-req">
    <div class="req-header">System Requirements</div>
    <div class="req-grid">
      ${renderCol('Minimum', 'minimum', minimum)}
      ${renderCol('Recommended', 'recommended', recommended)}
    </div>
  </div>`;
}

export function renderProsCons(attrs: ProsConsAttrs): string {
  const { pros, cons } = attrs;
  return `<div class="pros-cons-block" data-type="pros-cons-block">
    <div class="pros">
      <h4>✦ Pros</h4>
      <ul>${pros.map(p => `<li>${p}</li>`).join('')}</ul>
    </div>
    <div class="cons">
      <h4>✦ Cons</h4>
      <ul>${cons.map(c => `<li>${c}</li>`).join('')}</ul>
    </div>
  </div>`;
}


export function renderDealCard(attrs: DealCardAttrs): string {
  const { store, product, price, originalPrice, url, expiryDate, platform, dealScore } = attrs;

  // Deal score color
  const scoreColor = (dealScore ?? 0) >= 8 ? 'var(--gc-success)' : (dealScore ?? 0) >= 5 ? 'var(--gc-warning)' : 'var(--gc-danger)';

  // Expiry countdown
  let expiryHtml = '';
  if (expiryDate) {
    const exp = new Date(expiryDate);
    const now = new Date();
    const diff = exp.getTime() - now.getTime();
    if (diff > 0) {
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      expiryHtml = `<span class="deal-expiry" style="font-size:10px;color:var(--gc-warning);font-weight:600">⏰ Expires in ${days > 0 ? `${days}d ` : ''}${hours}h</span>`;
    } else {
      expiryHtml = `<span class="deal-expiry" style="font-size:10px;color:var(--gc-danger);font-weight:600">⏰ Expired</span>`;
    }
  }

  const platformBadge = platform ? `<span class="deal-platform-badge" style="font-size:10px;padding:2px 8px;border-radius:4px;background:var(--gc-elevated);border:1px solid var(--gc-border);color:var(--gc-muted)">${platform}</span>` : '';
  const scoreBadge = dealScore !== undefined && dealScore !== null ? `<span class="deal-score-badge" style="font-size:11px;font-weight:700;color:${scoreColor};padding:2px 8px;background:color-mix(in srgb, ${scoreColor} 10%, transparent);border:1px solid color-mix(in srgb, ${scoreColor} 25%, transparent);border-radius:4px">${dealScore}/10</span>` : '';
  const originalPriceHtml = originalPrice ? `<span class="deal-original-price" style="font-size:13px;color:var(--gc-muted);text-decoration:line-through;margin-right:8px">${originalPrice}</span>` : '';

  return `<div class="deal-card-block" data-type="deal-card" style="background:var(--gc-surface);border:1px solid var(--gc-border);border-radius:16px;overflow:hidden;margin:24px 0">
    <div class="deal-card-header" style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:var(--gc-elevated);border-bottom:1px solid var(--gc-border)">
      <div style="display:flex;align-items:center;gap:8px">
        <span class="deal-store-badge" style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--gc-accent);padding:3px 10px;background:color-mix(in srgb, var(--gc-accent) 10%, transparent);border:1px solid color-mix(in srgb, var(--gc-accent) 25%, transparent);border-radius:20px">${store}</span>
        ${platformBadge}
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        ${scoreBadge}
        ${expiryHtml}
      </div>
    </div>
    <div class="deal-card-body" style="padding:20px">
      <h4 class="deal-product-title" style="font-family:var(--gc-font-heading);font-size:20px;font-weight:700;color:var(--gc-text);margin:0 0 16px">${product}</h4>
      <div class="deal-price-cta" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div style="display:flex;align-items:baseline;gap:4px">
          ${originalPriceHtml}
          <span class="deal-price" style="font-family:var(--gc-font-heading);font-size:28px;font-weight:700;color:var(--gc-success)">${price}</span>
        </div>
        <a href="${url}" target="_blank" rel="noopener noreferrer nofollow" class="deal-cta-btn" data-deal-url="${url}" style="display:inline-flex;align-items:center;gap:8px;padding:10px 24px;background:var(--gc-accent);color:#fff;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;margin-left:auto">Get Deal →</a>
      </div>
    </div>
    <div class="deal-disclosure" style="padding:10px 20px;font-size:10px;color:var(--gc-muted);border-top:1px solid var(--gc-border)">
      * Affiliate Disclosure: We may earn a commission at no extra cost to you.
    </div>
  </div>`;
}

export function renderTimeline(attrs: TimelineAttrs): string {
  const { title = 'Timeline', items = [] } = attrs;
  return `<div class="toc-block" data-type="timeline" style="padding:20px">
    <h4 style="color:var(--gc-accent);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 16px">${title}</h4>
    <div style="position:relative;padding-left:24px;border-left:2px solid #1a2540">
      ${items.map((item, i) => `
        <div style="margin-bottom:16px;position:relative">
          <div style="position:absolute;left:-29px;width:10px;height:10px;border-radius:50%;background:${i === 0 ? '#00E5FF' : '#3a4558'};border:2px solid #0a0f1e"></div>
          <div style="font-size:0.75rem;color:var(--gc-muted);margin-bottom:4px">${item.label}</div>
          <div style="font-size:0.9rem;color:var(--gc-text);font-weight:600">${item.title}</div>
          <div style="font-size:0.85rem;color:var(--gc-muted)">${item.description}</div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

/**
 * renderFAQ
 *
 * Renders a clean, no-filter accordion FAQ block.
 * – No horizontal category pill row
 * – First item open by default
 * – Numbered indicator badge instead of raw emoji
 * – Compatible with ArticleBody accordion event delegation (gc-accordion-item / gc-accordion-header)
 */
export function renderFAQ(attrs: FAQAttrs): string {
  const { items = [] } = attrs;

  if (items.length === 0) return '';

  /**
   * Convert an answer string into HTML.
   * Lines starting with `-` or `•` become <li> items inside a <ul>.
   * Consecutive bullet lines share a single <ul>.
   * Other non-empty lines become <p> paragraphs.
   */
  function renderAnswer(answer: string): string {
    const lines = answer.split('\n');
    const parts: string[] = [];
    let bulletBuffer: string[] = [];

    const flushBullets = () => {
      if (bulletBuffer.length === 0) return;
      parts.push(
        `<ul class="faq-answer-list">${bulletBuffer.map(b => `<li>${b}</li>`).join('')}</ul>`
      );
      bulletBuffer = [];
    };

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) { flushBullets(); continue; }
      const m = line.match(/^[-\u2022]\s+(.*)/);
      if (m) {
        bulletBuffer.push(m[1]);
      } else {
        flushBullets();
        parts.push(`<p>${line}</p>`);
      }
    }
    flushBullets();

    return parts.join('') || `<p>${answer}</p>`;
  }

  const itemsHtml = items.map((item, i) => {
    const num = String(i + 1).padStart(2, '0');
    return `
      <div class="faq-item gc-accordion-item">
        <button class="faq-trigger gc-accordion-header" type="button" aria-expanded="false">
          <div class="faq-trigger-icon faq-num-badge">${num}</div>
          <span class="faq-q">${item.question}</span>
          <div class="faq-toggle" aria-hidden="true">+</div>
        </button>
        <div
          class="faq-body gc-accordion-body"
          style="max-height: 0;"
        >
          <div class="faq-body-inner">
            ${renderAnswer(item.answer)}
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `<div class="faq-list" data-type="faq">${itemsHtml}</div>`;
}


export function renderChangelog(attrs: ChangelogAttrs): string {
  const { title = 'Changelog', changes = [] } = attrs;
  return `<div class="patch-notes-block" data-type="changelog">
    <div class="patch-version"><span>${title}</span></div>
    <div class="patch-body">
      ${changes.map(c => `
        <p><span class="patch-tag ${c.type}">${c.version}</span> ${c.text}</p>
      `).join('')}
    </div>
  </div>`;
}

export function renderVersionCompare(attrs: VersionCompareAttrs): string {
  const { versionA, featuresA, versionB, featuresB } = attrs;
  return `<div class="gc-comparison" data-type="version-compare">
    <div class="side-a">
      <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.15em;color:var(--gc-warning);margin-bottom:8px">${versionA}</div>
      <ul style="padding-left:1.2rem;margin:0;font-size:0.875rem;color:var(--gc-muted)">
        ${featuresA.map(f => `<li>${f}</li>`).join('')}
      </ul>
    </div>
    <div class="vs-divider">VS</div>
    <div class="side-b">
      <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.15em;color:var(--gc-success);margin-bottom:8px">${versionB}</div>
      <ul style="padding-left:1.2rem;margin:0;font-size:0.875rem;color:var(--gc-muted)">
        ${featuresB.map(f => `<li>${f}</li>`).join('')}
      </ul>
    </div>
  </div>`;
}

// -- Difficulty badge helper --------------------------------------------------
function getDifficultyBadge(difficulty: number): string {
  const map: Record<number, string> = {
    0: 'UNKNOWN',
    1: 'EASY',
    2: 'NORMAL',
    3: 'HARD',
    4: 'VERY HARD',
    5: 'EXTREME',
  };
  const label = map[difficulty] ?? map[0];
  return `<span class="boss-threat-badge boss-threat-badge--${difficulty}">${label}</span>`;
}

export function renderBossCard(attrs: BossCardAttrs): string {
  const {
    name = 'Boss Name',
    subtitle,
    imageUrl,
    hp,
    reward,
    location,
    weaknesses,
    resistances,
    attacks,
    difficulty = 0,
    strategy,
  } = attrs;

  // Segmented danger meter (5 segments)
  const difficultyMeter = difficulty > 0
    ? Array.from({ length: 5 }, (_, i) => {
        const filled = i < difficulty;
        const intensity = difficulty >= 5 ? '#c0392b' : difficulty >= 4 ? '#e67e22' : difficulty >= 3 ? '#e6b822' : difficulty >= 2 ? '#27ae60' : '#2980b9';
        return `<span class="boss-threat-seg${filled ? ' filled' : ''}" style="${filled ? `background:${intensity};box-shadow:0 0 6px ${intensity}60;` : ''}"></span>`;
      }).join('')
    : '<span class="boss-threat-unknown">—</span>';

  const difficultyLabel = ['', 'Easy', 'Normal', 'Hard', 'Very Hard', 'Legendary'][difficulty] ?? 'Unknown';

  const renderTags = (list?: string, cssClass?: string) => {
    if (!list) return '';
    const items = list.split(',').map(s => s.trim()).filter(Boolean);
    if (items.length === 0) return '';
    return items.map(item => `<span class="boss-tag ${cssClass ?? ''}">${item}</span>`).join('');
  };

  const attackItems = attacks ? attacks.split(',').map(s => s.trim()).filter(Boolean) : [];

  const hasMeta = hp || reward || location;
  const hasWeakRes = weaknesses || resistances;

  return `<div class="boss-card" data-type="boss-card">
    ${imageUrl ? `<div class="boss-cinematic-bg" aria-hidden="true"><img src="${imageUrl}" alt="" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" /><div class="boss-bg-overlay"></div><div class="boss-bg-vignette"></div></div>` : ''}
    <div class="boss-card-inner">

      <!-- -- HERO HEADER ---------------------------------------- -->
      <div class="boss-hero">
        <div class="boss-hero-content">
          ${subtitle ? `<div class="boss-eyebrow">${subtitle}</div>` : ''}
          <h3 class="boss-name">${name}</h3>
          ${difficulty > 0 ? `
          <div class="boss-threat-row">
            <span class="boss-threat-label">Threat Level</span>
            <div class="boss-threat-meter">${difficultyMeter}</div>
            ${getDifficultyBadge(difficulty)}
          </div>` : ''}
        </div>
        ${imageUrl ? `
        <div class="boss-portrait">
          <img src="${imageUrl}" alt="${name}" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" />
        </div>` : `
        <div class="boss-portrait boss-portrait--empty" aria-hidden="true">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/><line x1="8" y1="12" x2="8" y2="16"/><line x1="16" y1="12" x2="16" y2="16"/></svg>
        </div>`}
      </div>

      ${hasMeta ? `
      <!-- -- METADATA STRIP ------------------------------------ -->
      <div class="boss-meta-strip">
        ${hp ? `<div class="boss-meta-item item-hp"><span class="boss-meta-label">HP</span><span class="boss-meta-value" style="font-size:12px;line-height:1.4">${hp}</span></div>` : ''}
        ${location ? `<div class="boss-meta-item item-loc"><span class="boss-meta-label">Location</span><span class="boss-meta-value" style="font-size:12px;line-height:1.4">${location}</span></div>` : ''}
        ${reward ? `<div class="boss-meta-item item-reward"><span class="boss-meta-label">Reward</span><span class="boss-meta-value" style="font-size:12px;line-height:1.4">${reward}</span></div>` : ''}
      </div>` : ''}

      ${hasWeakRes ? `
      <!-- -- WEAKNESSES / RESISTANCES -------------------------- -->
      <div class="boss-combat-intel">
        ${weaknesses ? `
        <div class="boss-intel-col">
          <div class="boss-intel-header boss-intel-header--weak">
            <span class="boss-intel-dot"></span>
            Weaknesses
          </div>
          <div class="boss-tags-row">${renderTags(weaknesses, 'boss-tag--weak')}</div>
        </div>` : ''}
        ${resistances ? `
        <div class="boss-intel-col">
          <div class="boss-intel-header boss-intel-header--resist">
            <span class="boss-intel-dot boss-intel-dot--resist"></span>
            Resistances
          </div>
          <div class="boss-tags-row">${renderTags(resistances, 'boss-tag--resist')}</div>
        </div>` : ''}
      </div>` : ''}

      ${attackItems.length > 0 ? `
      <!-- -- ATTACK PATTERNS ----------------------------------- -->
      <div class="boss-attacks">
        <div class="boss-section-label">Attack Patterns</div>
        <ul class="boss-attack-list">
          ${attackItems.map(a => `<li class="boss-attack-item"><span class="boss-attack-bullet" aria-hidden="true">›</span>${a}</li>`).join('')}
        </ul>
      </div>` : ''}

      ${strategy ? `
      <!-- -- STRATEGY ------------------------------------------ -->
      <div class="boss-strategy" style="padding:10px 20px 14px 20px;margin-top:0">
        <div class="boss-strategy-header">
          <span class="boss-strategy-icon" aria-hidden="true">◈</span>
          <span class="boss-section-label">Tactical Strategy</span>
        </div>
        <p class="boss-strategy-text">${strategy}</p>
      </div>` : ''}

    </div>
  </div>`;
}

export function renderBuildCard(attrs: BuildCardAttrs): string {
  const {
    buildName = 'Build Name',
    gameName = 'Game Name',
    difficulty = 'Intermediate',
    playstyle,
    stats,
    equipment,
    description,
    imageUrl,
    patchVersion,
  } = attrs;

  let parsedStats: { key: string; value: string }[] = [];
  try {
    if (stats) parsedStats = JSON.parse(stats);
  } catch (e) {
    console.warn('[renderBuildCard] Failed to parse stats JSON', e);
  }

  let parsedEquip: { slot: string; name: string }[] = [];
  try {
    if (equipment) parsedEquip = JSON.parse(equipment);
  } catch (e) {
    console.warn('[renderBuildCard] Failed to parse equipment JSON', e);
  }

  const tags = playstyle ? playstyle.split(',').map(s => s.trim()).filter(Boolean) : [];

  const diffColor = difficulty === 'Beginner' ? 'var(--gc-success)' :
    difficulty === 'Intermediate' ? 'var(--gc-accent)' :
      difficulty === 'Advanced' ? 'var(--gc-warning)' : 'var(--gc-danger)';

  return `<div class="build-card" data-type="build-card" style="background:var(--gc-surface);border:1px solid var(--gc-border);border-radius:16px;overflow:hidden;margin:24px 0">
    <div class="build-header" style="display:flex;align-items:flex-start;gap:20px;padding:24px;border-bottom:1px solid var(--gc-border)">
      ${imageUrl ? `
        <div class="build-image" style="width:100px;height:100px;border-radius:12px;overflow:hidden;background:var(--gc-elevated);border:1px solid var(--gc-border);flex-shrink:0">
          <img src="${imageUrl}" alt="${buildName}" style="width:100%;height:100%;object-fit:cover" loading="lazy" />
        </div>` : ''}
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px">
           <span style="font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:var(--gc-accent-dim)">${gameName}</span>
           ${patchVersion ? `<span style="font-size:9px;padding:2px 8px;background:color-mix(in srgb, var(--gc-accent) 8%, transparent);color:var(--gc-accent);border-radius:4px;border:1px solid var(--gc-border)">Ver ${patchVersion}</span>` : ''}
        </div>
        <h3 class="build-name" style="font-family:var(--gc-font-heading);font-size:24px;font-weight:700;color:var(--gc-text);margin:0 0 8px;line-height:1.1">${buildName}</h3>
        <div style="display:flex;gap:8px;align-items:center">
          <span style="font-size:10px;font-weight:700;color:${diffColor};text-transform:uppercase;letter-spacing:0.05em;padding:2px 8px;background:color-mix(in srgb, ${diffColor} 10%, transparent);border:1px solid color-mix(in srgb, ${diffColor} 20%, transparent);border-radius:4px">${difficulty}</span>
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${tags.map(t => `<span style="font-size:10px;color:var(--gc-muted);background:var(--gc-elevated);padding:2px 6px;border-radius:4px">#${t}</span>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0;border-bottom:1px solid var(--gc-border)">
      <div style="padding:20px;border-right:1px solid var(--gc-border)">
        <label style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:var(--gc-accent-dim);margin-bottom:16px">Primary Stats</label>
        ${parsedStats.length > 0 ? `
          <div style="display:grid;grid-template-columns:1fr auto;gap:8px 16px">
            ${parsedStats.map(s => `
              <div style="font-size:13px;color:var(--gc-muted)">${s.key}</div>
              <div style="font-size:13px;color:var(--gc-accent);font-weight:700;font-family:var(--gc-font-mono)">${s.value}</div>
            `).join('')}
          </div>
        ` : `<div style="font-size:12px;color:var(--gc-border);font-style:italic">(No stats specified)</div>`}
      </div>

      <div style="padding:20px">
        <label style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:var(--gc-accent-dim);margin-bottom:16px">Gear & Equipment</label>
        ${parsedEquip.length > 0 ? `
          <div style="display:flex;flex-direction:column;gap:10px">
            ${parsedEquip.map(e => `
              <div style="display:flex;gap:12px;align-items:baseline">
                <span style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--gc-muted);width:70px;flex-shrink:0">${e.slot}</span>
                <span style="font-size:13px;color:var(--gc-text);font-weight:500">${e.name}</span>
              </div>
            `).join('')}
          </div>
        ` : `<div style="font-size:12px;color:var(--gc-border);font-style:italic">(No equipment specified)</div>`}
      </div>
    </div>

    ${description ? `
      <div style="padding:20px;background:var(--gc-elevated)">
        <label style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:var(--gc-accent-dim);margin-bottom:8px">Build Overview</label>
        <p style="font-size:13px;color:var(--gc-muted);line-height:1.7;margin:0">${description}</p>
      </div>
    ` : ''}
  </div>`;
}

// -- New block renderers ------------------------------------------------------

export function renderSpoilerBlock(attrs: SpoilerBlockAttrs): string {
  const { label = '⚠ Spoiler — tap to reveal', content = '' } = attrs;
  return `<div class="spoiler-block" data-type="spoiler-block">
    <details>
      <summary class="spoiler-summary">
        <span class="spoiler-icon">⚠</span>
        <span class="spoiler-label">${label}</span>
        <span class="spoiler-arrow">▼</span>
      </summary>
      <div class="spoiler-content">${content}</div>
    </details>
  </div>`;
}

export function renderCorrectionNotice(attrs: CorrectionNoticeAttrs): string {
  const { originalText, correctionText, correctedAt, disclosureLabel } = attrs;
  const displayDate = correctedAt
    ? new Date(correctedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';
  return `<div class="correction-notice" data-type="correction-notice" data-corrected-at="${correctedAt}">
    <div class="correction-header">
      <span class="correction-icon">⚠</span>
      <span class="correction-label">Correction</span>
      <span class="correction-timestamp">${displayDate}</span>
    </div>
    ${originalText ? `<div class="correction-row">
      <span class="correction-row-label">Previously stated:</span>
      <p class="correction-original">${originalText}</p>
    </div>` : ''}
    ${correctionText ? `<div class="correction-row">
      <span class="correction-row-label">Corrected to:</span>
      <p class="correction-text">${correctionText}</p>
    </div>` : ''}
    ${disclosureLabel ? `<p class="correction-disclosure">${disclosureLabel}</p>` : ''}
  </div>`;
}

export function renderPullQuote(attrs: PullQuoteAttrs): string {
  const { quote = '', attribution = '', role = '' } = attrs;
  return `<blockquote class="pull-quote" data-type="pull-quote">
    <p class="pull-quote-text">${quote}</p>
    ${attribution || role ? `<footer class="pull-quote-footer">
      ${attribution ? `<cite class="pull-quote-attribution">${attribution}</cite>` : ''}
      ${role ? `<span class="pull-quote-role">${role}</span>` : ''}
    </footer>` : ''}
  </blockquote>`;
}

function renderCategory(label: string, score: number): string {
  return `<div class="review-category-row">
    <div class="review-category-header" style="display:flex;justify-content:space-between;align-items:center;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">
      <span class="review-category-label" style="color:var(--gc-muted);font-weight:600">${label}</span>
      <span class="review-category-score" style="color:var(--gc-accent);font-weight:700">${score}</span>
    </div>
    <div class="review-category-bar" style="height:6px;background:var(--gc-elevated);border-radius:3px;overflow:hidden">
      <div class="review-category-fill" style="width:${score * 10}%;height:100%;background:linear-gradient(90deg,#00E5FF,#00B8D9);border-radius:3px"></div>
    </div>
  </div>`;
}

// -- Block 1: Award Badge -----------------------------------------------------

export interface AwardBadgeAttrs {
  award: 'Game of the Year' | "Editor's Choice" | 'Best Story' | 'Best Visuals' | 'Best Audio' | 'Best Multiplayer' | 'Best Indie' | 'Must Play';
  year: string;
  category: string;
  publisher?: string;
}

export function renderAwardBadge(attrs: AwardBadgeAttrs): string {
  const {
    award = 'Game of the Year',
    year = new Date().getFullYear().toString(),
    category = '',
    publisher,
  } = attrs;

  const awardIcons: Record<string, string> = {
    'Game of the Year': '🏆',
    "Editor's Choice": '✦',
    'Best Story': '📖',
    'Best Visuals': '🎨',
    'Best Audio': '🎵',
    'Best Multiplayer': '🎮',
    'Best Indie': '💎',
    'Must Play': '⚡',
  };
  const icon = awardIcons[award] ?? '🏆';

  const publisherHtml = publisher
    ? `<div class="gc-award-publisher">
        <span class="gc-award-pub-label">Publisher</span>
        <span class="gc-award-pub-value">${publisher}</span>
      </div>`
    : '';

  return `<div class="gc-award-badge" data-type="award-badge">
    <div class="gc-award-left">
      <div class="gc-award-icon" aria-hidden="true">${icon}</div>
      <div class="gc-award-body">
        <div class="gc-award-eyebrow">TheCoreGamer Award · ${year}</div>
        <div class="gc-award-name">${award}</div>
        <div class="gc-award-meta">
          <span class="gc-award-category">${category}</span>
        </div>
      </div>
    </div>
    <div class="gc-award-right">
      ${publisherHtml}
      <div class="gc-award-stamp" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="22" stroke="#f5c518" stroke-width="2" stroke-dasharray="4 2" opacity="0.6"/>
          <circle cx="24" cy="24" r="16" stroke="#f5c518" stroke-width="1.5" opacity="0.4"/>
          <text x="24" y="29" text-anchor="middle" font-size="18" fill="#f5c518" font-family="serif">★</text>
        </svg>
      </div>
    </div>
  </div>`;
}

// -- Block 2: Stat Comparison Table ------------------------------------------

export interface StatCompareAttrs {
  title?: string;
  headers: string[];
  rows: Array<{ label: string; values: string[]; winnerIndex?: number }>;
  highlightWinner: boolean;
}

/** Safely parse a value that might be a JSON string or already an array. */
function safeParseArray<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val as T[];
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T[]; } catch { /* fall through */ }
  }
  return [];
}

export function renderStatCompare(attrs: StatCompareAttrs): string {
  const {
    title,
    highlightWinner = true,
  } = attrs;

  const headers = safeParseArray<string>(attrs.headers);
  const rows = safeParseArray<{ label: string; values: string[]; winnerIndex?: number }>(attrs.rows);

  const colCount = headers.length + 1; // +1 for row label column
  const gridCols = `1fr ${headers.map(() => '1fr').join(' ')}`;

  const titleHtml = title
    ? `<div class="gc-stat-compare-title">${title}</div>`
    : '';

  // Header row
  const headerCells = headers.map((h, hi) => {
    // Check if this header column has any winner
    const isWinnerCol = highlightWinner && rows.some(r => r.winnerIndex === hi);
    return `<div class="gc-stat-compare-th${isWinnerCol ? ' gc-stat-winner-header' : ''}">${h}</div>`;
  }).join('');
  const headerRow = `<div class="gc-stat-compare-row gc-stat-compare-head" style="grid-template-columns:${gridCols}">
    <div class="gc-stat-compare-th gc-stat-label-head"></div>
    ${headerCells}
  </div>`;

  // Data rows
  const dataRows = rows.map((row, ri) => {
    const isEven = ri % 2 === 0;
    const cells = row.values.map((val, vi) => {
      const isWinner = highlightWinner && row.winnerIndex === vi;
      return `<div class="gc-stat-compare-td${isWinner ? ' gc-stat-winner-cell' : ''}">
        ${isWinner ? '<span class="gc-stat-winner-indicator" aria-label="Winner">▲</span>' : ''}
        ${val}
      </div>`;
    }).join('');
    return `<div class="gc-stat-compare-row${isEven ? ' gc-stat-row-even' : ' gc-stat-row-odd'}" style="grid-template-columns:${gridCols}">
      <div class="gc-stat-compare-label">${row.label}</div>
      ${cells}
    </div>`;
  }).join('');

  const legendHtml = highlightWinner
    ? `<div class="gc-stat-compare-legend"><span class="gc-stat-winner-indicator">▲</span> Winner in this category</div>`
    : '';

  return `<div class="gc-stat-compare" data-type="stat-compare">
    ${titleHtml}
    <div class="gc-stat-compare-table">
      ${headerRow}
      ${dataRows}
    </div>
    ${legendHtml}
  </div>`;
}

// -- Block 3: Loot / Drop Table -----------------------------------------------

export interface LootTableAttrs {
  gameName?: string;
  areaName?: string;
  items: Array<{
    name: string;
    source: string;
    dropRate: string;
    rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Unique';
    notes?: string;
  }>;
}

export function renderLootTable(attrs: LootTableAttrs): string {
  const { gameName, areaName } = attrs;
  const items = safeParseArray<{ name: string; source: string; dropRate: string; rarity: string; notes?: string }>(attrs.items);

  const rarityColors: Record<string, string> = {
    Common:    '#6b7280',
    Uncommon:  '#22c55e',
    Rare:      '#3b82f6',
    Epic:      '#a855f7',
    Legendary: '#f59e0b',
    Unique:    '#ef4444',
  };

  const headerHtml = (gameName || areaName) ? `<div class="gc-loot-header">
    ${gameName ? `<span class="gc-loot-game">${gameName}</span>` : ''}
    ${areaName ? `<span class="gc-loot-area">${areaName}</span>` : ''}
  </div>` : '';

  const renderDropRate = (rate: string): string => {
    if (rate.toLowerCase() === 'guaranteed') {
      return `<span class="gc-loot-rate gc-loot-rate--guaranteed">${rate}</span>`;
    }
    const num = parseFloat(rate);
    if (!isNaN(num) && num < 5) {
      return `<span class="gc-loot-rate gc-loot-rate--low">${rate}</span>`;
    }
    return `<span class="gc-loot-rate gc-loot-rate--normal">${rate}</span>`;
  };

  const rows = items.map((item, i) => {
    const color = rarityColors[item.rarity] ?? '#6b7280';
    const isEven = i % 2 === 0;
    const notesCell = item.notes
      ? `<td class="gc-loot-td gc-loot-notes">${item.notes}</td>`
      : `<td class="gc-loot-td gc-loot-notes"></td>`;
    return `<tr class="${isEven ? 'gc-loot-row-even' : 'gc-loot-row-odd'}">
      <td class="gc-loot-td gc-loot-name">${item.name}</td>
      <td class="gc-loot-td gc-loot-source">${item.source}</td>
      <td class="gc-loot-td gc-loot-rate-cell">${renderDropRate(item.dropRate)}</td>
      <td class="gc-loot-td">
        <span class="gc-loot-rarity-pill" style="background:${color}20;color:${color};border:1px solid ${color}40">${item.rarity}</span>
      </td>
      ${notesCell}
    </tr>`;
  }).join('');

  return `<div class="gc-loot-table-wrap" data-type="loot-table">
    ${headerHtml}
    <div class="gc-loot-scroll">
      <table class="gc-loot-table">
        <thead>
          <tr class="gc-loot-thead-row">
            <th class="gc-loot-th">Item</th>
            <th class="gc-loot-th">Source</th>
            <th class="gc-loot-th">Drop Rate</th>
            <th class="gc-loot-th">Rarity</th>
            <th class="gc-loot-th">Notes</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

// -- Block 4: Inline Poll Widget ----------------------------------------------

export interface InlinePollAttrs {
  pollId: string;
  headline?: string;
  displayStyle: 'bar' | 'minimal';
}

export function renderInlinePoll(attrs: InlinePollAttrs): string {
  const { pollId = '', headline, displayStyle = 'bar' } = attrs;
  const displayLabel = headline || pollId;

  return `<div class="gc-inline-poll" data-poll-id="${pollId}" data-display-style="${displayStyle}" data-type="inline-poll">
    <div class="gc-inline-poll-placeholder">
      <div class="gc-inline-poll-icon">📊</div>
      <div class="gc-inline-poll-info">
        <div class="gc-inline-poll-label">Poll</div>
        <div class="gc-inline-poll-question">${displayLabel}</div>
        <div class="gc-inline-poll-hint">${pollId ? 'Loading poll…' : 'Poll coming soon'}</div>
      </div>
    </div>
    <div class="gc-inline-poll-results" style="display:none"></div>
  </div>`;
}

// -- Block 6: Mod Card ---------------------------------------------------------

export interface ModCardAttrs {
  modName: string;
  author: string;
  version: string;
  gameVersion: string;
  downloadUrl: string;
  downloadCount?: string;
  lastUpdated?: string;
  fileSizeMB?: string;
  compatibility: 'Verified' | 'Untested' | 'Broken' | 'Outdated';
  description?: string;
  tags?: string[];
}

export function renderModCard(attrs: ModCardAttrs): string {
  const {
    modName = 'Mod Name',
    author = 'Unknown',
    version = '1.0.0',
    gameVersion = '',
    downloadUrl = '#',
    downloadCount,
    lastUpdated,
    fileSizeMB,
    compatibility = 'Untested',
    description,
  } = attrs;

  const tags = safeParseArray<string>(attrs.tags ?? []);

  const compatColors: Record<string, string> = {
    Verified: 'var(--gc-success)',
    Untested: 'var(--gc-warning)',
    Broken: 'var(--gc-danger)',
    Outdated: 'var(--gc-danger)',
  };
  const compatIcons: Record<string, string> = { Verified: '✓', Untested: '?', Broken: '✕', Outdated: '⚠' };
  const compatColor = compatColors[compatibility] ?? 'var(--gc-warning)';
  const compatIcon = compatIcons[compatibility] ?? '?';

  const metaParts: string[] = [];
  if (version) metaParts.push(`<span class="gc-mc-meta-pill"><span class="gc-mc-meta-key">v${version}</span></span>`);
  if (gameVersion) metaParts.push(`<span class="gc-mc-meta-pill"><span class="gc-mc-meta-key">Game</span> ${gameVersion}</span>`);
  if (fileSizeMB) metaParts.push(`<span class="gc-mc-meta-pill">${fileSizeMB} MB</span>`);
  if (lastUpdated) {
    let dateLabel = lastUpdated;
    try {
      const d = new Date(lastUpdated);
      if (!isNaN(d.getTime())) dateLabel = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { /* keep raw value */ }
    metaParts.push(`<span class="gc-mc-meta-pill">Updated ${dateLabel}</span>`);
  }

  return `<div class="gc-mod-card" data-type="mod-card">
    <div class="gc-mc-inner">
      <div class="gc-mc-left">
        <div class="gc-mc-kicker">🔧 Mod</div>
        <h3 class="gc-mc-name">${modName}</h3>
        <div class="gc-mc-author">by <strong>${author}</strong></div>
        ${description ? `<p class="gc-mc-desc">${description}</p>` : ''}
        ${metaParts.length ? `<div class="gc-mc-meta">${metaParts.join('')}</div>` : ''}
        ${tags.length ? `<div class="gc-mc-tags">${tags.map(t => `<span class="gc-mc-tag">${t}</span>`).join('')}</div>` : ''}
      </div>
      <div class="gc-mc-right">
        <a href="${downloadUrl}" class="gc-mc-dl-btn" target="_blank" rel="nofollow noopener">
          <span class="gc-mc-dl-icon">↓</span>
          <span class="gc-mc-dl-label">Download</span>
          ${downloadCount ? `<span class="gc-mc-dl-count">${downloadCount} DL</span>` : ''}
        </a>
        <div class="gc-mc-compat" style="color:${compatColor};background:color-mix(in srgb,${compatColor} 10%,transparent);border:1px solid color-mix(in srgb,${compatColor} 25%,transparent)">
          <span>${compatIcon}</span><span>${compatibility}</span>
        </div>
      </div>
    </div>
  </div>`;
}

// -- Block 7: Video Timestamp Marker -------------------------------------------

export interface VideoTimestampAttrs {
  embedType: 'youtube' | 'mux';
  embedId: string;
  timestamp: number;
  label: string;
  thumbnailUrl?: string;
}

function formatTimestamp(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export function renderVideoTimestamp(attrs: VideoTimestampAttrs): string {
  const { embedType = 'youtube', embedId = '', timestamp = 0, label = '', thumbnailUrl } = attrs;
  const timeStr = formatTimestamp(Number(timestamp));
  const isYT = embedType === 'youtube';
  const href = isYT ? `https://www.youtube.com/watch?v=${embedId}&t=${timestamp}s` : '#';
  const muxAttr = !isYT ? ` data-mux-seek="true" data-mux-id="${embedId}" data-mux-t="${timestamp}"` : '';
  const targetAttr = isYT ? ' target="_blank" rel="noopener"' : '';

  return `<div class="gc-vtimestamp" data-type="video-timestamp">
    <a class="gc-vtm-link" href="${href}"${targetAttr}${muxAttr}>
      ${thumbnailUrl ? `<img class="gc-vtm-thumb" src="${thumbnailUrl}" alt="" loading="lazy" />` : ''}
      <span class="gc-vtm-play">▶</span>
      <span class="gc-vtm-time">${timeStr}</span>
      <span class="gc-vtm-label">${label}</span>
      <span class="gc-vtm-ext">↗</span>
    </a>
  </div>`;
}

// -- Block 8: Social Embed -----------------------------------------------------

export type SocialPlatform = 'twitter' | 'reddit' | 'bluesky';

export interface SocialEmbedAttrs {
  platform: SocialPlatform;
  url: string;
  authorName?: string;
  authorHandle?: string;
  authorUrl?: string;
  content?: string;
  postDate?: string;
  avatarUrl?: string;
  mediaUrl?: string;
  /** Raw oEmbed HTML (Twitter/Reddit) captured from the oEmbed API, used as the primary reader-mode embed when present */
  embedHtml?: string;
}

const SOCIAL_PLATFORM_META: Record<SocialPlatform, { color: string; label: string; linkLabel: string; svg: string }> = {
  twitter: {
    color: '#1d9bf0',
    label: 'X (Twitter)',
    linkLabel: 'View on X (Twitter)',
    svg: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  },
  reddit: {
    color: '#ff4500',
    label: 'Reddit',
    linkLabel: 'View on Reddit',
    svg: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>`,
  },
  bluesky: {
    color: '#1185fe',
    label: 'Bluesky',
    linkLabel: 'View on Bluesky',
    svg: `<svg viewBox="0 0 600 530" width="14" height="14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M135.72 44.03C202.216 93.951 273.74 195.17 300 249.49c26.262-54.316 97.782-155.54 164.28-205.46C512.26 8.601 590-19.404 590 70.342c0 17.937-10.337 150.799-16.405 172.34-21.085 75.769-97.985 95.111-166.32 83.379 119.488 20.346 149.93 87.43 84.234 154.514-124.713 128.048-179.215-32.18-193.16-73.282-2.554-7.516-3.752-11.034-3.749-8.044-.003-2.99-1.201.528-3.755 8.044-13.945 41.102-68.447 201.33-193.16 73.282-65.696-67.084-35.254-134.168 84.234-154.514-68.336 11.732-145.236-7.61-166.32-83.379C20.337 221.141 10 88.279 10 70.342 10-19.404 87.74 8.6 135.72 44.03z"/></svg>`,
  },
};

export function renderSocialEmbed(attrs: SocialEmbedAttrs): string {
  const { platform = 'twitter', url = '#', authorName, authorHandle, authorUrl, content, postDate, avatarUrl, mediaUrl, embedHtml } = attrs;
  const meta = SOCIAL_PLATFORM_META[platform] || SOCIAL_PLATFORM_META.twitter;

  const badgeHtml = `<div class="gc-social-badge" style="background:${meta.color}1a;color:${meta.color}">${meta.svg}<span>${meta.label}</span></div>`;
  const linkHtml = `<a class="gc-social-link" href="${escHtml(url)}" target="_blank" rel="noopener nofollow" style="color:${meta.color}">${meta.linkLabel} ↗</a>`;

  // Twitter/Reddit: prefer the native oEmbed HTML when available, fall back to the styled card below
  if ((platform === 'twitter' || platform === 'reddit') && embedHtml) {
    return `<div class="gc-social-embed gc-social-embed--${platform} gc-social-embed--native" data-type="social-embed">
      ${badgeHtml}
      <div class="gc-social-embed-html">${embedHtml}</div>
      <div class="gc-social-footer">${linkHtml}</div>
    </div>`;
  }

  const avatarHtml = avatarUrl
    ? `<img class="gc-social-avatar" src="${escHtml(avatarUrl)}" alt="" />`
    : `<div class="gc-social-avatar gc-social-avatar--placeholder" style="background:${meta.color}22;color:${meta.color}">${escHtml((authorName || meta.label).charAt(0).toUpperCase())}</div>`;

  let dateHtml = '';
  if (postDate) {
    let dateLabel = postDate;
    try {
      const d = new Date(postDate);
      if (!isNaN(d.getTime())) dateLabel = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { /* keep raw value */ }
    dateHtml = `<span class="gc-social-date">${escHtml(dateLabel)}</span>`;
  }

  const authorNameHtml = authorName
    ? (authorUrl
      ? `<a class="gc-social-name" href="${escHtml(authorUrl)}" target="_blank" rel="noopener nofollow">${escHtml(authorName)}</a>`
      : `<span class="gc-social-name">${escHtml(authorName)}</span>`)
    : '';

  return `<div class="gc-social-embed gc-social-embed--${platform}" data-type="social-embed">
    <div class="gc-social-header">
      ${avatarHtml}
      <div class="gc-social-author-info">
        ${authorNameHtml}
        ${authorHandle ? `<span class="gc-social-handle" style="color:${meta.color}">@${escHtml(authorHandle)}</span>` : ''}
      </div>
      ${badgeHtml}
    </div>
    ${content ? `<div class="gc-social-content">${escHtml(content)}</div>` : ''}
    ${mediaUrl ? `<div class="gc-social-media-wrap"><img class="gc-social-media" src="${escHtml(mediaUrl)}" alt="" loading="lazy" /></div>` : ''}
    <div class="gc-social-footer">
      ${dateHtml}
      ${linkHtml}
    </div>
  </div>`;
}

// -- Block 9: Newsletter CTA Block ---------------------------------------------

export interface NewsletterCtaAttrs {
  headline?: string;
  description?: string;
  ctaLabel?: string;
  variant?: 'card' | 'minimal';
}

export function renderNewsletterCta(attrs: NewsletterCtaAttrs): string {
  const {
    headline = 'Subscribe to Our Newsletter',
    description = 'Get the latest gaming news, reviews, and exclusive guides delivered directly to your inbox.',
    ctaLabel = 'Subscribe',
    variant = 'card',
  } = attrs;

  if (variant === 'minimal') {
    return `<div class="gc-newsletter-cta gc-newsletter-cta--minimal" data-type="newsletter-cta">
      <p class="gc-newsletter-minimal-text">${description} <a href="/newsletter" class="gc-newsletter-minimal-link">→ ${ctaLabel}</a></p>
    </div>`;
  }

  return `<div class="gc-newsletter-cta gc-newsletter-cta--card" data-newsletter-cta="true" data-type="newsletter-cta">
    <div class="gc-newsletter-head">
      <div class="gc-newsletter-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg></div>
      <h3 class="gc-newsletter-headline">${headline}</h3>
    </div>
    <p class="gc-newsletter-desc">${description}</p>
    <form class="gc-newsletter-form" action="/api/newsletter/subscribe" method="POST">
      <input type="email" name="email" placeholder="email address" class="gc-newsletter-input" required autocomplete="email" />
      <button type="submit" class="gc-newsletter-btn">${ctaLabel}</button>
    </form>
    <div class="gc-newsletter-success" style="display:none">✓ You're in! Check your inbox.</div>
  </div>`;
}

// -- Block 10: Related Articles Block ------------------------------------------

export interface RelatedArticlesAttrs {
  headline?: string;
  articles: Array<{
    slug: string;
    title: string;
    imageUrl?: string;
    contentType: string;
  }>;
}

export function renderRelatedArticles(attrs: RelatedArticlesAttrs): string {
  const { headline = 'Related' } = attrs;
  const articles = safeParseArray<{ slug: string; title: string; imageUrl?: string; contentType: string }>(attrs.articles ?? []);
  if (articles.length === 0) return `<div class="gc-related-articles" data-type="related-articles"></div>`;

  const contentTypeToPath: Record<string, string> = {
    REVIEW: 'reviews',
    MOD_GUIDE: 'mod-guides',
  };

  const rows = articles.slice(0, 20).map(article => {
    const articlePath = contentTypeToPath[article.contentType] ?? 'articles';
    const imgHtml = article.imageUrl
      ? `<div class="gc-ra-row-img-wrap"><img class="gc-ra-row-img" src="${article.imageUrl}" alt="${article.title}" loading="lazy" /></div>`
      : `<div class="gc-ra-row-img-wrap gc-ra-img-placeholder"></div>`;
    return `<a class="gc-ra-row" href="/${articlePath}/${article.slug}">
      ${imgHtml}
      <div class="gc-ra-row-text">
        <h4 class="gc-ra-row-title">${article.title}</h4>
      </div>
    </a>`;
  }).join('');

  return `<div class="gc-related-articles" data-type="related-articles">
    <span class="gc-ra-tag">${headline}</span>
    <div class="gc-ra-rows">${rows}</div>
  </div>`;
}

// --- BLOCK 11 — Hardware Spec Card -------------------------------------------

export interface HardwareSpecAttrs {
  productName: string;
  category: 'GPU' | 'CPU' | 'Monitor' | 'Headset' | 'Mouse' | 'Keyboard' | 'Controller' | 'SSD' | 'RAM' | 'Motherboard';
  imageUrl?: string;
  msrp?: string;
  verdict?: 'Buy' | 'Consider' | 'Skip';
  verdictReason?: string;
  specs: Array<{ label: string; value: string }>;
  pros?: string[];
  cons?: string[];
  score?: number;
}

export function renderHardwareSpec(attrs: HardwareSpecAttrs): string {
  const { productName, category, imageUrl, msrp, verdict, verdictReason } = attrs;
  const score = attrs.score !== undefined && attrs.score !== null ? Number(attrs.score) : undefined;
  const specs = safeParseArray<{ label: string; value: string }>(attrs.specs ?? []);
  const pros  = safeParseArray<string>(attrs.pros ?? []);
  const cons  = safeParseArray<string>(attrs.cons ?? []);

  const vColor: Record<string, string> = {
    Buy: 'var(--gc-success)', Consider: 'var(--gc-warning)', Skip: 'var(--gc-danger)',
  };
  const vIcon: Record<string, string> = { Buy: '✓', Consider: '~', Skip: '✗' };

  const imgHtml = imageUrl
    ? `<div class="gc-hs-img-wrap"><img class="gc-hs-img" src="${escHtml(imageUrl)}" alt="${escHtml(productName)}" loading="lazy" /><span class="gc-hs-cat-badge">${escHtml(category)}</span></div>`
    : `<div class="gc-hs-img-wrap gc-hs-no-img"><span class="gc-hs-cat-badge">${escHtml(category)}</span></div>`;

  const specRows = specs.map((s, i) =>
    `<div class="gc-hs-spec-row ${i % 2 === 0 ? 'gc-hs-spec-even' : 'gc-hs-spec-odd'}">
      <span class="gc-hs-spec-label">${escHtml(s.label)}</span>
      <span class="gc-hs-spec-value">${escHtml(s.value)}</span>
    </div>`
  ).join('');

  const prosHtml = pros.length
    ? `<div class="gc-hs-pc-col gc-hs-pros-col"><p class="gc-hs-pc-head">Pros</p><ul class="gc-hs-pc-list">${pros.map(p => `<li class="gc-hs-pro">${escHtml(p)}</li>`).join('')}</ul></div>`
    : '';
  const consHtml = cons.length
    ? `<div class="gc-hs-pc-col gc-hs-cons-col"><p class="gc-hs-pc-head">Cons</p><ul class="gc-hs-pc-list">${cons.map(c => `<li class="gc-hs-con">${escHtml(c)}</li>`).join('')}</ul></div>`
    : '';
  const pcHtml = (pros.length || cons.length) ? `<div class="gc-hs-pc-grid">${prosHtml}${consHtml}</div>` : '';

  const verdictHtml = verdict
    ? `<div class="gc-hs-footer">
        <span class="gc-hs-verdict" style="color:${vColor[verdict] ?? '#888'};background:color-mix(in srgb,${vColor[verdict] ?? '#888'} 12%,transparent);border-color:color-mix(in srgb,${vColor[verdict] ?? '#888'} 35%,transparent)">${vIcon[verdict] ?? ''} ${verdict}</span>
        ${verdictReason ? `<span class="gc-hs-verdict-reason">${escHtml(verdictReason)}</span>` : ''}
        ${score !== undefined ? `<span class="gc-hs-score">${score}<span class="gc-hs-score-denom">/10</span></span>` : ''}
      </div>`
    : '';

  return `<div class="gc-hardware-spec" data-type="hardware-spec">
  <div class="gc-hs-body">
    ${imgHtml}
    <div class="gc-hs-info">
      <div class="gc-hs-header"><h3 class="gc-hs-name">${escHtml(productName)}</h3>${msrp ? `<span class="gc-hs-msrp">${escHtml(msrp)}</span>` : ''}</div>
      ${specRows ? `<div class="gc-hs-specs">${specRows}</div>` : ''}
    </div>
  </div>
  ${pcHtml}${verdictHtml}
</div>`;
}

// --- BLOCK 12 — Price History Sparkline --------------------------------------

export interface PriceHistoryAttrs {
  gameSlug: string;
  gameName: string;
  currentPrice?: string;
  allTimeLow?: string;
  storeName?: string;
}

export function renderPriceHistory(attrs: PriceHistoryAttrs): string {
  const { gameSlug, gameName, currentPrice, allTimeLow, storeName } = attrs;
  const itadUrl = `https://www.isthereanydeal.com/search/?q=${encodeURIComponent(gameName)}`;
  return `<div class="gc-price-history" data-widget="price-history" data-game-slug="${escHtml(gameSlug)}" data-store-name="${escHtml(storeName ?? '')}">
  <div class="gc-ph-header">
    <span class="gc-ph-icon" aria-hidden="true">📈</span>
    <div class="gc-ph-title-wrap">
      <h4 class="gc-ph-title">Price History</h4>
      <p class="gc-ph-game">${escHtml(gameName)}</p>
    </div>
    ${currentPrice ? `<span class="gc-ph-current">${escHtml(currentPrice)}</span>` : ''}
  </div>
  <div class="gc-ph-chart" data-sparkline-target="true">
    <svg class="gc-ph-svg-placeholder" viewBox="0 0 200 50" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <line x1="0" y1="25" x2="200" y2="25" stroke="var(--gc-border)" stroke-width="1" stroke-dasharray="4 4"/>
    </svg>
  </div>
  <div class="gc-ph-meta">
    ${allTimeLow ? `<span class="gc-ph-atl"><span class="gc-ph-atl-arrow">▼</span> All-time low: <strong>${escHtml(allTimeLow)}</strong></span>` : ''}
    ${storeName ? `<a class="gc-ph-check-link" href="${itadUrl}" target="_blank" rel="nofollow noopener">Check current price ↗</a>` : ''}
  </div>
</div>`;
}

// --- BLOCK 14 — Mod Load Order ------------------------------------------------

export interface ModLoadOrderAttrs {
  title?: string;
  gameVersion?: string;
  totalMods?: number;
  entries: Array<{
    position: number;
    modName: string;
    author?: string;
    notes?: string;
    conflictWarning?: string;
    required: boolean;
  }>;
}

export function renderModLoadOrder(attrs: ModLoadOrderAttrs): string {
  const { title = 'Mod Load Order', gameVersion } = attrs;
  const entries = safeParseArray<{
    position: number; modName: string; author?: string;
    notes?: string; conflictWarning?: string; required: boolean;
  }>(attrs.entries ?? []);
  const countDisplay = attrs.totalMods ?? entries.length;

  const rows = entries.map(e =>
    `<div class="gc-mlo-row${e.conflictWarning ? ' gc-mlo-has-conflict' : ''}" data-conflict-tip="${escHtml(e.conflictWarning ?? '')}">
      <span class="gc-mlo-pos">${e.position}</span>
      <div class="gc-mlo-meta">
        <span class="gc-mlo-name">${escHtml(e.modName)}</span>
        ${e.author ? `<span class="gc-mlo-author">${escHtml(e.author)}</span>` : ''}
        ${e.notes ? `<span class="gc-mlo-notes">${escHtml(e.notes)}</span>` : ''}
      </div>
      <div class="gc-mlo-badges">
        ${e.conflictWarning ? `<span class="gc-mlo-conflict" title="${escHtml(e.conflictWarning)}">⚠</span>` : ''}
        ${e.required ? `<span class="gc-mlo-required">Required</span>` : ''}
      </div>
    </div>`
  ).join('');

  return `<div class="gc-mod-load-order" data-type="mod-load-order">
  <div class="gc-mlo-header">
    <div class="gc-mlo-header-left">
      <span class="gc-mlo-icon" aria-hidden="true">📋</span>
      <h4 class="gc-mlo-title">${escHtml(title)}</h4>
      ${gameVersion ? `<span class="gc-mlo-version">${escHtml(gameVersion)}</span>` : ''}
    </div>
    <div class="gc-mlo-header-right">
      <span class="gc-mlo-count">${countDisplay} mods</span>
      <button class="gc-mlo-copy-btn" data-copy-list="true" type="button">Copy List</button>
    </div>
  </div>
  <div class="gc-mlo-list">${rows}</div>
</div>`;
}

// --- BLOCK 15 — Controversy / Community Reaction Block -----------------------

export interface ControversyBlockAttrs {
  title: string;
  summary?: string;
  events: Array<{
    date: string;
    actor: string;
    actorType: 'developer' | 'publisher' | 'community' | 'press' | 'regulator';
    description: string;
    sentiment: 'neutral' | 'negative' | 'positive' | 'resolution';
  }>;
  outcome?: string;
  outcomeSentiment?: 'positive' | 'negative' | 'mixed' | 'ongoing';
}

export function renderControversyBlock(attrs: ControversyBlockAttrs): string {
  const { title, summary, outcome, outcomeSentiment = 'mixed' } = attrs;
  const events = safeParseArray<{
    date: string; actor: string; actorType: string; description: string; sentiment: string;
  }>(attrs.events ?? []);

  const actorColor: Record<string, string> = {
    developer: '#3b82f6', publisher: '#8b5cf6',
    community: '#f59e0b', press: '#6b7280', regulator: '#ef4444',
  };
  const sentimentBorder: Record<string, string> = {
    neutral: 'var(--gc-border)', negative: 'var(--gc-danger)',
    positive: 'var(--gc-success)', resolution: 'var(--gc-accent)',
  };
  const outcomeColor: Record<string, string> = {
    positive: 'var(--gc-success)', negative: 'var(--gc-danger)',
    mixed: 'var(--gc-warning)', ongoing: 'var(--gc-accent)',
  };

  const eventNodes = events.map(e => {
    const dot = actorColor[e.actorType] ?? '#6b7280';
    const border = sentimentBorder[e.sentiment] ?? 'var(--gc-border)';
    return `<div class="gc-cb-event" style="border-left-color:${border}">
      <div class="gc-cb-event-meta">
        <span class="gc-cb-dot" style="background:${dot}"></span>
        <span class="gc-cb-date">${escHtml(e.date)}</span>
        <span class="gc-cb-actor" style="color:${dot}">${escHtml(e.actor)}</span>
      </div>
      <p class="gc-cb-desc">${escHtml(e.description)}</p>
    </div>`;
  }).join('');

  const outcomeHtml = outcome
    ? `<div class="gc-cb-outcome" style="border-left-color:${outcomeColor[outcomeSentiment] ?? 'var(--gc-warning)'}">
        <span class="gc-cb-outcome-label">Outcome</span>
        <p class="gc-cb-outcome-text">${escHtml(outcome)}</p>
      </div>`
    : '';

  return `<div class="gc-controversy-block" data-type="controversy-block">
  <div class="gc-cb-header">
    <span class="gc-cb-icon" aria-hidden="true">⚡</span>
    <h3 class="gc-cb-title">${escHtml(title)}</h3>
  </div>
  ${summary ? `<p class="gc-cb-summary">${escHtml(summary)}</p>` : ''}
  <div class="gc-cb-timeline">${eventNodes}</div>
  ${outcomeHtml}
</div>`;
}

// --- BLOCK 16 — Tier List -----------------------------------------------------

export type TierLabel = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface TierItem {
  id: string;
  name: string;
  imageUrl?: string;
  note?: string;
}

export interface TierRow {
  label: TierLabel;
  color: string;
  items: TierItem[];
}

export interface TierListAttrs {
  title: string;
  tiers: TierRow[];
}

export const DEFAULT_TIER_LIST: TierListAttrs = {
  title: 'Tier List',
  tiers: [
    { label: 'S', color: '#e11d48', items: [] },
    { label: 'A', color: '#e85a1a', items: [] },
    { label: 'B', color: '#f59e0b', items: [] },
    { label: 'C', color: '#3b82f6', items: [] },
    { label: 'D', color: '#22c55e', items: [] },
  ],
};

export function renderTierList(attrs: TierListAttrs): string {
  const { title = 'Tier List', tiers = [] } = attrs;

  const rows = tiers.map(tier => {
    const items = tier.items.length
      ? tier.items.map(item => {
          if (item.imageUrl) {
            return `<div class="gc-tl-chip gc-tl-chip--img" title="${escHtml(item.name)}">
              <img class="gc-tl-chip-img" src="${escHtml(item.imageUrl)}" alt="${escHtml(item.name)}" loading="lazy" />
            </div>`;
          }
          return `<div class="gc-tl-chip"><span class="gc-tl-chip-name">${escHtml(item.name)}</span></div>`;
        }).join('')
      : `<div class="gc-tl-empty">—</div>`;

    return `<div class="gc-tl-row">
      <div class="gc-tl-label" style="background:${escHtml(tier.color)}">${escHtml(tier.label)}</div>
      <div class="gc-tl-items">${items}</div>
    </div>`;
  }).join('');

  return `<div class="gc-tier-list" data-type="tier-list">
    ${title ? `<div class="gc-tl-header"><h3 class="gc-tl-title">${escHtml(title)}</h3></div>` : ''}
    <div class="gc-tl-rows">${rows}</div>
  </div>`;
}

// --- BLOCK 17 — Interactive Map -----------------------------------------------

export type PinCategory = 'COLLECTIBLE' | 'LOCATION' | 'BOSS' | 'SECRET' | 'FAST_TRAVEL' | 'VENDOR';

export interface MapPin {
  id: string;
  x: number;
  y: number;
  label: string;
  description: string;
  category: PinCategory;
  icon?: string;
}

export interface InteractiveMapAttrs {
  mapImageUrl: string;
  title: string;
  pins: MapPin[];
}

export const PIN_CATEGORY_COLORS: Record<PinCategory, string> = {
  COLLECTIBLE: '#f59e0b',
  LOCATION: '#3b82f6',
  BOSS: '#e11d48',
  SECRET: '#7b5cfa',
  FAST_TRAVEL: '#22c55e',
  VENDOR: '#06b6d4',
};

export const PIN_CATEGORIES: PinCategory[] = ['COLLECTIBLE', 'LOCATION', 'BOSS', 'SECRET', 'FAST_TRAVEL', 'VENDOR'];

export const DEFAULT_INTERACTIVE_MAP: InteractiveMapAttrs = {
  mapImageUrl: '',
  title: 'World Map',
  pins: [],
};

/**
 * Renders a placeholder + embedded JSON payload for the interactive map.
 * The actual interactive UI (pan/zoom/pins/filters) is hydrated client-side
 * via a React portal into `.gc-im-mount` — see InteractiveMapRenderer.
 */
export function renderInteractiveMap(attrs: InteractiveMapAttrs): string {
  const { mapImageUrl = '', title = 'World Map' } = attrs;
  const pins = Array.isArray(attrs.pins) ? attrs.pins : [];

  if (!mapImageUrl) return '';

  const payload = JSON.stringify({ mapImageUrl, title, pins }).replace(/<\/script/gi, '<\\/script');

  return `<div class="gc-interactive-map" data-type="interactive-map">
    <script type="application/json" class="gc-im-data">${payload}</script>
    <div class="gc-im-mount"></div>
  </div>`;
}

function escHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- BLOCK 18 — Comparison Table (N-column) ----------------------------------

export interface ComparisonCell {
  columnId: string;
  value: string;
  isWinner?: boolean;
}

export interface ComparisonColumn {
  id: string;
  label: string;
  imageUrl?: string;
  isWinner?: boolean;
}

export interface ComparisonRow {
  id: string;
  label: string;
  values: ComparisonCell[];
  winnerColumnId?: string;
}

export interface ComparisonTableAttrs {
  title: string;
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
}

export const DEFAULT_COMPARISON_TABLE: ComparisonTableAttrs = {
  title: 'Comparison',
  columns: [
    { id: 'col-a', label: 'Option A' },
    { id: 'col-b', label: 'Option B' },
  ],
  rows: [
    {
      id: 'row-1',
      label: 'Feature',
      values: [
        { columnId: 'col-a', value: '' },
        { columnId: 'col-b', value: '' },
      ],
    },
  ],
};

export function renderComparisonTable(attrs: ComparisonTableAttrs): string {
  const { title = '', columns = [], rows = [] } = attrs;
  if (columns.length === 0) return '';

  const gridCols = `1fr ${columns.map(() => '1fr').join(' ')}`;

  const headerCells = columns.map(col => `
    <div class="gc-ct-th${col.isWinner ? ' gc-ct-th-winner' : ''}">
      ${col.imageUrl ? `<img class="gc-ct-th-img" src="${escHtml(col.imageUrl)}" alt="${escHtml(col.label)}" loading="lazy" />` : ''}
      <span class="gc-ct-th-label">${escHtml(col.label)}</span>
    </div>`).join('');

  const bodyRows = rows.map(row => {
    const cells = columns.map(col => {
      const cell = row.values.find(v => v.columnId === col.id);
      const isWinner = !!(cell?.isWinner || (row.winnerColumnId && row.winnerColumnId === col.id));
      return `<div class="gc-ct-td${isWinner ? ' gc-ct-td-winner' : ''}">
        ${isWinner ? '<span class="gc-ct-check" aria-hidden="true">✓</span>' : ''}
        <span class="gc-ct-td-value">${escHtml(cell?.value ?? '')}</span>
      </div>`;
    }).join('');
    return `<div class="gc-ct-row" style="grid-template-columns:${gridCols}">
      <div class="gc-ct-row-label">${escHtml(row.label)}</div>
      ${cells}
    </div>`;
  }).join('');

  return `<div class="gc-comparison-table" data-type="comparison-table">
    ${title ? `<div class="gc-ct-title">${escHtml(title)}</div>` : ''}
    <div class="gc-ct-scroll">
      <div class="gc-ct-table">
        <div class="gc-ct-row gc-ct-row-header" style="grid-template-columns:${gridCols}">
          <div class="gc-ct-th gc-ct-corner"></div>
          ${headerCells}
        </div>
        ${bodyRows}
      </div>
    </div>
  </div>`;
}

// --- BLOCK 19 — Achievement / Trophy -----------------------------------------

export type TrophyType = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface AchievementBlockAttrs {
  trophyType: TrophyType;
  name: string;
  description: string;
  difficulty: number;
  xpValue: number;
  tips: string;
  hasSpoiler: boolean;
}

export const TROPHY_ICONS: Record<TrophyType, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  platinum: '💎',
};

export const TROPHY_COLORS: Record<TrophyType, string> = {
  bronze: '#cd7f32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#8B5CF6',
};

export const DEFAULT_ACHIEVEMENT_BLOCK: AchievementBlockAttrs = {
  trophyType: 'bronze',
  name: 'Trophy Name',
  description: '',
  difficulty: 1,
  xpValue: 0,
  tips: '',
  hasSpoiler: false,
};

export function renderAchievementBlock(attrs: AchievementBlockAttrs): string {
  const {
    trophyType = 'bronze',
    name = 'Trophy Name',
    description = '',
    difficulty = 1,
    xpValue = 0,
    tips = '',
    hasSpoiler = false,
  } = attrs;

  const icon = TROPHY_ICONS[trophyType] ?? TROPHY_ICONS.bronze;
  const color = TROPHY_COLORS[trophyType] ?? TROPHY_COLORS.bronze;

  const stars = Array.from({ length: 5 }, (_, i) =>
    `<span class="gc-ach-star${i < difficulty ? ' filled' : ''}" aria-hidden="true">★</span>`
  ).join('');

  const tipsHtml = tips
    ? hasSpoiler
      ? `<details class="gc-ach-spoiler">
          <summary class="gc-ach-spoiler-toggle">⚠️ Spoiler — Tips</summary>
          <div class="gc-ach-tips">${escHtml(tips)}</div>
        </details>`
      : `<div class="gc-ach-tips-section">
          <div class="gc-ach-tips-label">Tips</div>
          <div class="gc-ach-tips">${escHtml(tips)}</div>
        </div>`
    : '';

  return `<div class="gc-achievement" data-type="achievement-block" data-trophy="${escHtml(trophyType)}">
    <div class="gc-ach-icon" style="color:${color}" aria-hidden="true">${icon}</div>
    <div class="gc-ach-body">
      <div class="gc-ach-header">
        <span class="gc-ach-badge" style="background:color-mix(in srgb, ${color} 18%, transparent);color:${color};border-color:color-mix(in srgb, ${color} 40%, transparent)">${escHtml(trophyType)}</span>
        ${xpValue ? `<span class="gc-ach-xp">+${xpValue} XP</span>` : ''}
      </div>
      <h4 class="gc-ach-name">${escHtml(name)}</h4>
      ${description ? `<p class="gc-ach-desc">${escHtml(description)}</p>` : ''}
      <div class="gc-ach-stars" aria-label="Difficulty ${difficulty} of 5">${stars}</div>
      ${tipsHtml}
    </div>
  </div>`;
}

// --- BLOCK 20 — Price Comparison Table ---------------------------------------

export interface PriceCompareTableAttrs {
  gameId: string;
  gameTitle: string;
  itadId?: string;
}

export const DEFAULT_PRICE_COMPARE_TABLE: PriceCompareTableAttrs = {
  gameId: '',
  gameTitle: '',
  itadId: '',
};

/**
 * Renders a placeholder + embedded JSON payload for the price comparison table.
 * The live price table (fetch/sort/highlight/buy-links) is hydrated client-side
 * via a React portal into `.gc-pct-mount` — see PriceCompareTableRenderer.
 */
export function renderPriceCompareTable(attrs: PriceCompareTableAttrs): string {
  const { gameId = '', gameTitle = '', itadId = '' } = attrs;
  if (!gameId) return '';

  const payload = JSON.stringify({ gameId, gameTitle, itadId }).replace(/<\/script/gi, '<\\/script');

  return `<div class="gc-price-compare" data-type="price-compare-table">
    <script type="application/json" class="gc-pct-data">${payload}</script>
    <div class="gc-pct-mount"></div>
  </div>`;
}

// --- BLOCK 22 — MapGenie Embed -------------------------------------------------

export interface MapGenieEmbedAttrs {
  url: string;
  title?: string;
}

/**
 * Validates that a URL is a legitimate mapgenie.io map link.
 * Security boundary — only mapgenie.io URLs may ever be rendered as an iframe
 * src. Never relax this to allow arbitrary domains.
 */
export function isValidMapGenieUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === 'https:') &&
      (parsed.hostname === 'mapgenie.io' || parsed.hostname === 'www.mapgenie.io')
    );
  } catch {
    return false;
  }
}

/**
 * Normalizes a mapgenie.io URL into its light embed form by ensuring
 * the `embed=light` query param is present regardless of what the writer pasted.
 */
export function toEmbedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'mapgenie.io' && parsed.hostname !== 'www.mapgenie.io') return url;
    parsed.searchParams.set('embed', 'light');
    return parsed.toString();
  } catch {
    return url;
  }
}

export function renderMapGenieEmbed(attrs: MapGenieEmbedAttrs): string {
  const { url, title = '' } = attrs;

  if (!url || !isValidMapGenieUrl(url)) {
    return `<div class="gc-mapgenie-embed gc-mapgenie-embed--empty" data-type="mapgenie-embed">
      <p class="gc-mapgenie-empty">No MapGenie map configured yet.</p>
    </div>`;
  }

  const safeUrl = escHtml(toEmbedUrl(url));
  const safeTitle = escHtml(title || 'Interactive Map');

  return `<div class="gc-mapgenie-embed" data-type="mapgenie-embed">
    ${title ? `<div class="gc-mapgenie-header"><span class="gc-mapgenie-icon">🗺️</span><span class="gc-mapgenie-title">${safeTitle}</span></div>` : ''}
    <div class="gc-mapgenie-frame-wrap">
      <iframe
        src="${safeUrl}"
        title="${safeTitle}"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-popups"
        referrerpolicy="strict-origin-when-cross-origin"
      ></iframe>
    </div>
    <div class="gc-mapgenie-attribution">Map data via <a href="https://mapgenie.io" target="_blank" rel="noopener noreferrer nofollow">MapGenie</a></div>
  </div>`;
}
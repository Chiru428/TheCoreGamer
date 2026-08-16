'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { SessionProvider } from 'next-auth/react';
import dynamic from 'next/dynamic';
import PollWidget from '@/components/blog/PollWidget';
import GalleryLightbox from '@/components/blog/GalleryLightbox';
import '@/styles/gaming-content.css';

// Heavy, conditionally-rendered blocks — code-split out of the main article bundle.
const InteractiveMapRenderer = dynamic(() => import('@/components/public/blocks/InteractiveMapRenderer'), {
  ssr: false,
  loading: () => <div className="shimmer" style={{ height: 400 }} />,
});
const PriceCompareTableRenderer = dynamic(() => import('@/components/public/blocks/PriceCompareTableRenderer'), {
  ssr: false,
  loading: () => <div className="shimmer" style={{ height: 300 }} />,
});
const AdSlot = dynamic(() => import('@/components/monetization/AdSlot'), { ssr: false });
import {
  renderReviewCard,
  renderMentionedGame,
  renderBenchmarkCard,
  renderPatchNotes,
  renderSystemRequirements,
  renderProsCons,
  renderDealCard,
  renderTimeline,
  renderFAQ,
  renderChangelog,
  renderVersionCompare,
  ReviewCardAttrs,
  MentionedGameAttrs,
  BenchmarkCardAttrs,
  PatchNotesAttrs,
  SystemRequirementsAttrs,
  ProsConsAttrs,
  DealCardAttrs,
  TimelineAttrs,
  FAQAttrs,
  ChangelogAttrs,
  VersionCompareAttrs,
  BossCardAttrs,
  BuildCardAttrs,
  renderBossCard,
  renderBuildCard,
  renderAwardBadge,
  renderStatCompare,
  renderLootTable,
  AwardBadgeAttrs,
  StatCompareAttrs,
  LootTableAttrs,
  renderInlinePoll,
  InlinePollAttrs,
  renderModCard,
  renderVideoTimestamp,
  renderSocialEmbed,
  renderNewsletterCta,
  renderRelatedArticles,
  ModCardAttrs,
  VideoTimestampAttrs,
  SocialEmbedAttrs,
  NewsletterCtaAttrs,
  RelatedArticlesAttrs,
  renderHardwareSpec,
  renderPriceHistory,
  renderModLoadOrder,
  renderControversyBlock,
  renderTierList,
  renderInteractiveMap,
  HardwareSpecAttrs,
  PriceHistoryAttrs,
  ModLoadOrderAttrs,
  ControversyBlockAttrs,
  TierListAttrs,
  InteractiveMapAttrs,
  renderComparisonTable,
  renderAchievementBlock,
  renderPriceCompareTable,
  ComparisonTableAttrs,
  AchievementBlockAttrs,
  PriceCompareTableAttrs,
} from '../../lib/gaming-block-renderers';
import { generateHeadingId, slugifyLegacy } from '../../lib/heading-id';

interface TipTapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TipTapNode[];
  text?: string;
  marks?: any[];
}

interface ArticleBodyProps {
  content: TipTapNode | any;
  className?: string;
  slug?: string;
}

interface HeadingInfo {
  text: string;
  level: number;
  id: string;
}

const StaticContent = React.memo(React.forwardRef<HTMLDivElement, { html: string, className: string }>(
  ({ html, className }, ref) => (
    <div
      ref={ref}
      className={`gaming-content ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
));

export default function ArticleBody({ content, className = '', slug }: ArticleBodyProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // -- Click-to-zoom lightbox for inline content images --------------------
  // `ratio` = the thumbnail's displayed width/height, so the lightbox can show
  // the *same* crop enlarged (object-fit: cover) rather than the whole image.
  const [zoomImage, setZoomImage] = useState<{ src: string; alt: string; ratio: number | null } | null>(null);
  const [galleryLightbox, setGalleryLightbox] = useState<{ images: { src: string; alt: string; caption?: string; credit?: string }[]; index: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Only editor-inserted content images opt in via `.gc-zoomable` — gallery
      // and gaming-block images keep their own click behaviour.
      const img = target.closest('img.gc-zoomable') as HTMLImageElement | null;
      if (!img) return;
      e.preventDefault();
      const rect = img.getBoundingClientRect();
      const ratio = rect.height > 0 ? rect.width / rect.height : null;
      setZoomImage({ src: img.currentSrc || img.src, alt: img.alt || '', ratio });
    };

    container.addEventListener('click', handleImageClick);
    return () => container.removeEventListener('click', handleImageClick);
  }, [content]);

  // Close on Escape + lock body scroll while the lightbox is open.
  useEffect(() => {
    if (!zoomImage) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setZoomImage(null); };
    document.addEventListener('keydown', onKey);
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [zoomImage]);

  // -- Smooth-scroll internal anchor links ---------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || !href.startsWith('#')) return;

      const id = href.slice(1);

      // Try multiple ID formats to handle prefix mismatches:
      // 1. Exact match (e.g. author manually set id="missable-content-summary")
      // 2. h-{id}  → modern generateHeadingId() format
      // 3. data-legacy-id attribute → old heading-{slug} format
      const el =
        document.getElementById(id) ||
        document.getElementById(`h-${id}`) ||
        container.querySelector<HTMLElement>(`[data-legacy-id="heading-${id}"]`) ||
        container.querySelector<HTMLElement>(`[data-legacy-id="${id}"]`);

      if (!el) return;

      e.preventDefault();
      // Update URL hash without triggering a page jump
      history.pushState(null, '', `#${id}`);
      const offset = 100;
      const top =
        el.getBoundingClientRect().top -
        document.body.getBoundingClientRect().top -
        offset;
      window.scrollTo({ top, behavior: 'smooth' });
    };

    container.addEventListener('click', handleAnchorClick);
    return () => container.removeEventListener('click', handleAnchorClick);
  }, [content]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Defer until after the browser has committed the paint so that
    // dangerouslySetInnerHTML DOM nodes are queryable. This is the root
    // cause of "FAQ not working until page reload" on client-side navigation.
    const rafId = requestAnimationFrame(() => {
    if (!containerRef.current) return;

    // Attach Accordion listeners
    const accordions = containerRef.current.querySelectorAll('.gc-accordion-item');
    accordions.forEach(item => {
      const header = item.querySelector('.gc-accordion-header') as HTMLElement;
      const body = item.querySelector('.gc-accordion-body') as HTMLElement;
      if (!header || !body) return;

      const fn = () => {
        // Support both new UI (.faq-item) and legacy UI
        const isNewUI = item.classList.contains('faq-item');
        const isOpen = isNewUI ? item.classList.contains('open') : body.classList.contains('open');

        // Close others (accordion behavior)
        const parentList = item.closest('[data-type="faq"]');
        if (parentList) {
          parentList.querySelectorAll('.gc-accordion-item').forEach(el => {
             if (el !== item) {
               el.classList.remove('open');
               const b = el.querySelector('.gc-accordion-body') as HTMLElement;
               if (b) {
                 b.classList.remove('open');
                 if (el.classList.contains('faq-item')) {
                   b.style.maxHeight = '0';
                 } else {
                   const h = el.querySelector('.gc-accordion-header');
                   if (h && h.textContent) h.textContent = h.textContent.replace('▴', '▾');
                 }
               }
             }
          });
        }

        if (isNewUI) {
          if (!isOpen) {
            item.classList.add('open');
            const inner = body.querySelector('.faq-body-inner') as HTMLElement;
            if (inner) {
               body.style.maxHeight = inner.scrollHeight + 40 + 'px';
            } else {
               body.style.maxHeight = '1000px';
            }
          } else {
            item.classList.remove('open');
            body.style.maxHeight = '0';
          }
        } else {
           // Legacy logic
           body.classList.toggle('open');
           header.textContent = header.textContent?.replace(isOpen ? '▴' : '▾', isOpen ? '▾' : '▴') || '';
        }
      };
      header.addEventListener('click', fn);
    });

    // Attach Tab listeners
    const tabGroups = containerRef.current.querySelectorAll('.gc-tabs');
    tabGroups.forEach(group => {
      const buttons = group.querySelectorAll('.gc-tab-btn');
      const panels = group.querySelectorAll('.gc-tab-panel');
      buttons.forEach((btn, i) => {
        btn.addEventListener('click', () => {
          buttons.forEach(b => b.classList.remove('active'));
          panels.forEach(p => p.classList.remove('active'));
          btn.classList.add('active');
          panels[i]?.classList.add('active');
        });
      });
    });

    // Hydrate MentionedGame blocks with the latest cover image
    const mentionedGames = containerRef.current.querySelectorAll('[data-type="mentioned-game"][data-game-slug]');
    mentionedGames.forEach((el) => {
      const slug = el.getAttribute('data-game-slug');
      if (!slug) return;
      
      fetch(`/api/games/${slug}`)
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data?.coverImageUrl) {
            const newCoverUrl = res.data.coverImageUrl;
            const wrapper = el.querySelector('.mg-cover-wrapper');
            if (wrapper) {
              const img = wrapper.querySelector('img');
              if (img) {
                // Check exact string or if Next.js image url contains it
                if (!img.src.includes(encodeURIComponent(newCoverUrl)) && img.src !== newCoverUrl) {
                  img.src = newCoverUrl;
                }
              } else {
                wrapper.innerHTML = `<img src="${newCoverUrl}" alt="${res.data.title || slug} cover" style="width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);" loading="lazy" />`;
              }
            }
          }
        })
        .catch(err => console.error('Failed to update MentionedGame cover:', err));
    });

    // Attach Spoiler Blur removal
    const spoilers = containerRef.current.querySelectorAll<HTMLElement>('.spoiler-reveal-btn');
    spoilers.forEach(btn => {
      const fn = () => {
        const blurEl = btn.previousElementSibling as HTMLElement | null;
        if (blurEl) blurEl.classList.remove('spoiler-blur');
        btn.style.display = 'none';
      };
      btn.addEventListener('click', fn);
    });

    // Walkthrough Checkboxes Logic
    if (slug) {
      const walkthroughContainers = containerRef.current.querySelectorAll<HTMLDivElement>('.walkthrough-container');
      walkthroughContainers.forEach((container, containerIndex) => {
        const storageKey = `gh-walkthrough-${slug}-${containerIndex}`;
        const steps = container.querySelectorAll<HTMLDivElement>('.walkthrough-step');
        const progressCountEl = container.querySelector('.walkthrough-progress-count');
        const progressBarEl = container.querySelector<HTMLDivElement>('.walkthrough-progress-bar-fill');

        let completedSteps = new Set<number>();
        try {
          const stored = localStorage.getItem(storageKey);
          if (stored) completedSteps = new Set(JSON.parse(stored));
        } catch (e) {
          // ignore error
        }

        const updateProgressUI = () => {
          const completed = completedSteps.size;
          const total = steps.length;
          if (progressCountEl) {
            progressCountEl.textContent = `${completed}/${total} steps complete`;
          }
          if (progressBarEl) {
            progressBarEl.style.width = `${total > 0 ? (completed / total) * 100 : 0}%`;
          }
        };

        steps.forEach((step, stepIndex) => {
          const checkbox = step.querySelector<HTMLInputElement>('input[type="checkbox"]');
          if (checkbox) {
            checkbox.checked = completedSteps.has(stepIndex);
            checkbox.addEventListener('change', (e) => {
              if (checkbox.checked) {
                completedSteps.add(stepIndex);
                step.classList.add('step-completed');
              } else {
                completedSteps.delete(stepIndex);
                step.classList.remove('step-completed');
              }
              try {
                localStorage.setItem(storageKey, JSON.stringify(Array.from(completedSteps)));
              } catch (err) { }
              updateProgressUI();
            });
            // Initial class setup
            if (completedSteps.has(stepIndex)) {
              step.classList.add('step-completed');
            }
          }
        });

        const resetBtn = container.querySelector('.walkthrough-reset-btn');
        if (resetBtn) {
          resetBtn.addEventListener('click', () => {
            completedSteps.clear();
            try {
              localStorage.removeItem(storageKey);
            } catch (err) { }
            steps.forEach(step => {
              const cb = step.querySelector<HTMLInputElement>('input[type="checkbox"]');
              if (cb) cb.checked = false;
              step.classList.remove('step-completed');
            });
            updateProgressUI();
          });
        }

        updateProgressUI();
      });
    }

    // Gallery carousel
    const galleries = containerRef.current.querySelectorAll('.gc-inline-carousel[data-type="gallery"]')
    galleries.forEach(gallery => {
      const card = gallery.querySelector('.gc-gallery-lightbox-card') as HTMLElement
      const mainImg = card?.querySelector('.main-carousel-img') as HTMLImageElement
      const counter = card?.querySelector('.carousel-counter-overlay') as HTMLElement
      const lbThumbs = card?.querySelectorAll('.gc-gallery-lb-thumb')
      const total = parseInt(gallery.getAttribute('data-lb-total') || '0')
      if (!card || !mainImg || total === 0) return

      const srcs = Array.from(gallery.querySelectorAll<HTMLImageElement>('img[data-lb-index]'))
        .map(img => ({ 
          src: img.src, 
          alt: img.alt,
          caption: img.getAttribute('data-caption') || '',
          credit: img.getAttribute('data-credit') || ''
        }))

      let current = 0

      const goTo = (idx: number) => {
        current = (idx + srcs.length) % srcs.length
        mainImg.classList.add('lb-fading')
        setTimeout(() => {
          mainImg.src = srcs[current].src
          mainImg.alt = srcs[current].alt
          if (counter) counter.textContent = `${current + 1} of ${srcs.length}`
          lbThumbs?.forEach((d, i) => {
            d.classList.toggle('active', i === current)
            if (i === current) {
              d.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
            }
          })
          mainImg.classList.remove('lb-fading')
        }, 180)
      }

      card.querySelector('.gc-gallery-lb-prev')?.addEventListener('click', (e) => { e.stopPropagation(); goTo(current - 1) })
      card.querySelector('.gc-gallery-lb-next')?.addEventListener('click', (e) => { e.stopPropagation(); goTo(current + 1) })
      lbThumbs?.forEach((thumb, i) => thumb.addEventListener('click', () => goTo(i)))
      
      mainImg.style.cursor = 'zoom-in';
      mainImg.addEventListener('click', () => {
        setGalleryLightbox({ images: srcs, index: current });
      });
    })

    // Gallery grids (2, 3, 4 images)
    const galleryGrids = containerRef.current.querySelectorAll('.gc-gallery-grid[data-type="gallery-grid"]')
    galleryGrids.forEach(grid => {
      const imgs = Array.from(grid.querySelectorAll<HTMLImageElement>('img.gc-gallery-grid-img'))
      const srcs = imgs.map(img => ({
          src: img.src,
          alt: img.alt,
          caption: img.getAttribute('data-caption') || '',
          credit: img.getAttribute('data-credit') || ''
      }))
      imgs.forEach((img, idx) => {
        img.style.cursor = 'zoom-in'
        img.addEventListener('click', () => {
          setGalleryLightbox({ images: srcs, index: idx })
        })
      })
    })

    // Task-list checkboxes — persist checked state in localStorage
    const taskLists = containerRef.current.querySelectorAll<HTMLUListElement>('ul.task-list');
    taskLists.forEach((list, listIndex) => {
      const storageKey = `gh-tasklist-${slug || 'page'}-${listIndex}`;
      const checkboxes = list.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');

      // Restore saved state
      let savedState: boolean[] = [];
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) savedState = JSON.parse(stored);
      } catch { /* ignore */ }

      checkboxes.forEach((cb, i) => {
        if (savedState[i] !== undefined) cb.checked = savedState[i];

        cb.addEventListener('change', () => {
          const state = Array.from(checkboxes).map(c => c.checked);
          try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* ignore */ }
          // Strike-through the label when checked
          const label = cb.nextElementSibling as HTMLElement | null;
          if (label) {
            label.style.textDecoration = cb.checked ? 'line-through' : '';
            label.style.textDecorationColor = cb.checked ? 'var(--gc-success, #22c55e)' : '';
            label.style.color = cb.checked ? 'var(--gc-success, #22c55e)' : '';
          }
        });

        // Apply initial strike-through for restored state
        const label = cb.nextElementSibling as HTMLElement | null;
        if (label && cb.checked) {
          label.style.textDecoration = 'line-through';
          label.style.textDecorationColor = 'var(--gc-success, #22c55e)';
          label.style.color = 'var(--gc-success, #22c55e)';
        }
      });
    });

    // Copy code button logic
    const copyBtns = containerRef.current.querySelectorAll('.copy-code-btn');
    copyBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const wrapper = btn.closest('.code-block-wrapper');
        if (!wrapper) return;
        const codeEl = wrapper.querySelector('code');
        if (!codeEl) return;
        
        try {
          await navigator.clipboard.writeText(codeEl.innerText || codeEl.textContent || '');
          const span = btn.querySelector('.copy-text');
          const svg = btn.querySelector('svg');
          if (span) span.textContent = 'Copied!';
          if (svg) svg.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
          
          setTimeout(() => {
            if (span) span.textContent = 'Copy';
            if (svg) svg.innerHTML = '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>';
          }, 2000);
        } catch (err) {
          console.error('Failed to copy code', err);
        }
      });
    });

    // Video Timestamp — Mux seek
    const muxLinks = containerRef.current.querySelectorAll<HTMLAnchorElement>('[data-mux-seek="true"]');
    muxLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const id = link.getAttribute('data-mux-id');
        const t = Number(link.getAttribute('data-mux-t') || '0');
        if (!id) return;
        const video = document.querySelector<HTMLVideoElement>(`[data-mux-playback-id="${id}"]`);
        if (video) {
          video.currentTime = t;
          video.play().catch(() => { /* autoplay policy — user can tap play */ });
          video.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });

    // Newsletter CTA — fetch-enhanced submission + success swap
    const newsletterCtaBlocks = containerRef.current.querySelectorAll<HTMLElement>('[data-newsletter-cta="true"]');
    newsletterCtaBlocks.forEach(cta => {
      const form = cta.querySelector<HTMLFormElement>('.gc-newsletter-form');
      const successEl = cta.querySelector<HTMLElement>('.gc-newsletter-success');
      if (!form || !successEl) return;
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = form.querySelector<HTMLInputElement>('[name="email"]');
        const email = emailInput?.value?.trim();
        if (!email) return;
        const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
        const origText = btn?.textContent || 'Subscribe Free';
        if (btn) { btn.disabled = true; btn.textContent = '…'; }
        try {
          const res = await fetch('/api/newsletter/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          if (res.ok) {
            form.style.display = 'none';
            successEl.style.display = '';
          } else {
            if (btn) { btn.disabled = false; btn.textContent = origText; }
          }
        } catch {
          if (btn) { btn.disabled = false; btn.textContent = origText; }
        }
      });
    });

    // Price History — fetch sparkline data and draw SVG
    const priceWidgets = containerRef.current.querySelectorAll<HTMLElement>('[data-widget="price-history"]');
    priceWidgets.forEach(async (widget) => {
      const gameSlug = widget.getAttribute('data-game-slug');
      const storeName = widget.getAttribute('data-store-name') || '';
      const chartArea = widget.querySelector<HTMLElement>('[data-sparkline-target="true"]');
      if (!gameSlug || !chartArea) return;
      try {
        const res = await fetch(`/api/deals/prices?gameSlug=${encodeURIComponent(gameSlug)}`);
        if (!res.ok) throw new Error('no data');
        const json = await res.json();
        const points: number[] = Array.isArray(json?.prices) ? json.prices : [];
        if (points.length < 2) {
          chartArea.innerHTML = '<p class="gc-ph-unavailable" style="text-align:center;padding:12px;font-size:0.78rem;color:var(--gc-muted);font-style:italic;">Price data unavailable</p>';
          return;
        }
        const min = Math.min(...points);
        const max = Math.max(...points);
        const range = max - min || 1;
        const W = 200; const H = 50; const PAD = 4;
        const toX = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
        const toY = (v: number) => (H - PAD) - ((v - min) / range) * (H - PAD * 2);
        const pts = points.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
        const fillPts = `${toX(0).toFixed(1)},${H} ${pts} ${toX(points.length - 1).toFixed(1)},${H}`;
        chartArea.innerHTML = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="width:100%;height:100%;display:block">
          <polygon points="${fillPts}" class="gc-ph-sparkline-fill"/>
          <polyline points="${pts}" class="gc-ph-sparkline"/>
        </svg>`;
        // Update current price from API if available
        if (json?.currentPrice) {
          const cur = widget.querySelector<HTMLElement>('.gc-ph-current');
          if (cur) cur.textContent = json.currentPrice;
        }
        if (json?.allTimeLow) {
          const atl = widget.querySelector<HTMLElement>('.gc-ph-atl strong');
          if (atl) atl.textContent = json.allTimeLow;
        }
        if (storeName && json?.storeUrl) {
          const link = widget.querySelector<HTMLAnchorElement>('.gc-ph-check-link');
          if (link) link.href = json.storeUrl;
        }
      } catch {
        if (chartArea) {
          chartArea.innerHTML = '<p class="gc-ph-unavailable" style="text-align:center;padding:12px;font-size:0.78rem;color:var(--gc-muted);font-style:italic;">Price data unavailable</p>';
        }
      }
    });

    // Mod Load Order — "Copy List" button
    const mloBlocks = containerRef.current.querySelectorAll<HTMLElement>('[data-type="mod-load-order"]');
    mloBlocks.forEach(block => {
      const copyBtn = block.querySelector<HTMLButtonElement>('[data-copy-list="true"]');
      if (!copyBtn) return;
      copyBtn.addEventListener('click', async () => {
        const names = Array.from(block.querySelectorAll<HTMLElement>('.gc-mlo-name'))
          .map(el => el.textContent?.trim() || '')
          .filter(Boolean);
        if (!names.length) return;
        try {
          await navigator.clipboard.writeText(names.join('\n'));
          const orig = copyBtn.textContent || 'Copy List';
          copyBtn.textContent = 'Copied!';
          copyBtn.style.color = 'var(--gc-success)';
          copyBtn.style.borderColor = 'var(--gc-success)';
          setTimeout(() => {
            copyBtn.textContent = orig;
            copyBtn.style.color = '';
            copyBtn.style.borderColor = '';
          }, 2000);
        } catch { /* clipboard permission denied */ }
      });
    });

    // Deal click tracking
    const dealBtns = containerRef.current.querySelectorAll('.deal-cta-btn');
    dealBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.getAttribute('data-deal-url');
        const card = btn.closest('.deal-card-block');
        const store = card?.querySelector('.deal-store-badge')?.textContent || '';
        const product = card?.querySelector('.deal-product-title')?.textContent || '';
        
        if (url) {
          fetch('/api/analytics/deal-click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, store, product, articleSlug: slug || 'unknown' })
          }).catch(console.error);
        }
      });
    });

    }); // end requestAnimationFrame

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [content]);

  // -- Inline Poll hydration via createRoot (independent React trees) ------
  useEffect(() => {
    if (!containerRef.current) return;
    const pollEls = containerRef.current.querySelectorAll<HTMLElement>('[data-poll-id]');
    if (pollEls.length === 0) return;

    const roots: ReturnType<typeof createRoot>[] = [];

    const rafId = requestAnimationFrame(() => {
      if (!containerRef.current) return;
      pollEls.forEach((el) => {
        const pollId = el.getAttribute('data-poll-id');
        if (!pollId) return; // No poll linked — leave placeholder visible
        el.innerHTML = '';
        const root = createRoot(el);
        root.render(
          <SessionProvider>
            <PollWidget pollId={pollId} />
          </SessionProvider>
        );
        roots.push(root);
      });
    });

    return () => {
      cancelAnimationFrame(rafId);
      // Defer unmount to avoid "synchronous unmount during render" React error
      setTimeout(() => roots.forEach(r => r.unmount()), 0);
    };
  }, [content]);

  // -- Interactive Map hydration via React portals --------------------------
  const [mapPortals, setMapPortals] = useState<Array<{ el: HTMLElement; key: string; mapData: InteractiveMapAttrs }>>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const mapEls = containerRef.current.querySelectorAll<HTMLElement>('[data-type="interactive-map"]');
    if (mapEls.length === 0) return;

    const rafId = requestAnimationFrame(() => {
      if (!containerRef.current) return;

      const portals: Array<{ el: HTMLElement; key: string; mapData: InteractiveMapAttrs }> = [];
      mapEls.forEach((el, idx) => {
        const dataScript = el.querySelector('script.gc-im-data');
        const mount = el.querySelector<HTMLElement>('.gc-im-mount');
        if (!dataScript || !mount) return;
        try {
          const mapData = JSON.parse(dataScript.textContent || '{}') as InteractiveMapAttrs;
          mount.innerHTML = '';
          portals.push({ el: mount, key: `map-${idx}`, mapData });
        } catch { /* ignore malformed map data */ }
      });
      setMapPortals(portals);
    });

    return () => cancelAnimationFrame(rafId);
  }, [content]);

  // -- Price Comparison Table hydration via React portals -------------------
  const [pctPortals, setPctPortals] = useState<Array<{ el: HTMLElement; key: string; data: PriceCompareTableAttrs }>>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const pctEls = containerRef.current.querySelectorAll<HTMLElement>('[data-type="price-compare-table"]');
    if (pctEls.length === 0) return;

    const rafId = requestAnimationFrame(() => {
      if (!containerRef.current) return;

      const portals: Array<{ el: HTMLElement; key: string; data: PriceCompareTableAttrs }> = [];
      pctEls.forEach((el, idx) => {
        const dataScript = el.querySelector('script.gc-pct-data');
        const mount = el.querySelector<HTMLElement>('.gc-pct-mount');
        if (!dataScript || !mount) return;
        try {
          const data = JSON.parse(dataScript.textContent || '{}') as PriceCompareTableAttrs;
          mount.innerHTML = '';
          portals.push({ el: mount, key: `pct-${idx}`, data });
        } catch { /* ignore malformed price data */ }
      });
      setPctPortals(portals);
    });

    return () => cancelAnimationFrame(rafId);
  }, [content]);

  // -- In-Article Ad hydration via React portals -----------------------------
  const [adPortals, setAdPortals] = useState<Array<{ el: HTMLElement; key: string; slot: string }>>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const adEls = containerRef.current.querySelectorAll<HTMLElement>('.gc-monetization-zone, .ad-slot-placeholder, [data-type="in-article-ad"]');
    if (adEls.length === 0) return;

    const rafId = requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const portals: Array<{ el: HTMLElement; key: string; slot: string }> = [];
      adEls.forEach((el, idx) => {
        // Use explicitly set zone-id, otherwise fallback to ADS-02
        const slot = el.getAttribute('data-zone-id') || 'ADS-02';
        portals.push({ el, key: `ad-${idx}`, slot });
      });
      setAdPortals(portals);
    });

    return () => cancelAnimationFrame(rafId);
  }, [content]);

  // Pre-scan for headings to build TOC data and generate HTML
  // We use useMemo to prevent re-generating random IDs on empty headings,
  // which would cause dangerouslySetInnerHTML to detach our portals.
  // Hooks must run unconditionally, so this is computed before the early
  // return below even though it's only consumed in the non-string branch.
  const { html, docHeadings } = useMemo(() => {
    if (!content || typeof content !== 'object') return { html: '', docHeadings: [] };
    const headings = extractHeadings(content);
    const counts = new Map<string, number>();
    return {
      docHeadings: headings,
      html: renderNodes(content, counts, headings)
    };
  }, [content]);


  return (
    <>
      <StaticContent ref={containerRef} className={className} html={html} />
      {mapPortals.map(p => createPortal(<InteractiveMapRenderer key={p.key} mapData={p.mapData} />, p.el))}
      {pctPortals.map(p => createPortal(<PriceCompareTableRenderer key={p.key} gameId={p.data.gameId} gameTitle={p.data.gameTitle} itadId={p.data.itadId} />, p.el))}
      {adPortals.map(p => createPortal(<div className="my-8 w-full flex justify-center"><AdSlot slot={p.slot} className="w-full" /></div>, p.el))}
      {zoomImage && typeof document !== 'undefined' && createPortal(
        <div
          className="gc-img-lightbox-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setZoomImage(null)}
        >
          <button type="button" className="gc-img-lightbox-close" aria-label="Close image preview" onClick={() => setZoomImage(null)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <img
            className={zoomImage.ratio ? 'gc-img-lightbox-img gc-img-lightbox-cropped' : 'gc-img-lightbox-img'}
            src={zoomImage.src}
            alt={zoomImage.alt}
            onClick={e => e.stopPropagation()}
            style={zoomImage.ratio ? ({ '--lb-ratio': String(zoomImage.ratio) } as React.CSSProperties) : undefined}
          />
        </div>,
        document.body,
      )}

      {galleryLightbox && typeof document !== 'undefined' && (
        <GalleryLightbox
          images={galleryLightbox.images}
          initialIndex={galleryLightbox.index}
          onClose={() => setGalleryLightbox(null)}
        />
      )}
    </>
  );
}

function extractHeadings(content: any): HeadingInfo[] {
  const results: HeadingInfo[] = [];
  const counts = new Map<string, number>();

  const walk = (nodes: TipTapNode[]) => {
    if (!nodes || !Array.isArray(nodes)) return;
    for (const n of nodes) {
      if (n.type === 'heading') {
        const text = n.content?.map(c => c.text || '').join('') || '';
        const baseId = (n.attrs?.id as string) || generateHeadingId(text);

        let id = baseId;
        const count = counts.get(baseId) || 0;
        if (count > 0) {
          id = `${baseId}-${count + 1}`;
        }
        counts.set(baseId, count + 1);

        results.push({ text, level: n.attrs?.level as number || 2, id });
      }
      if (n.content) walk(n.content);
    }
  };

  if (Array.isArray(content)) {
    // Multi-section mod guide: array of { id, label, content }
    content.forEach(section => {
      if (section.content) {
        const nodes = section.content.type === 'doc' ? section.content.content : [section.content];
        walk(nodes);
      }
    });
  } else {
    // Standard flat TipTap JSON
    const nodes = content.type === 'doc' ? content.content : [content];
    walk(nodes);
  }

  return results;
}

/**
 * Convert an editor font-size value (e.g. "18px") to a responsive clamp().
 * Desktop shows the exact value; mobile scales down to 90% fluidly.
 *
 * clamp(min, fluid, max)
 *   min   = px × 0.9            (mobile floor)
 *   fluid = px × 0.0833vw       (reaches `max` at ~1200px viewport)
 *   max   = px                  (desktop ceiling)
 *
 * Non-px values (rem, em, %) are returned unchanged — they are already relative.
 */
function responsiveFontSize(value: string): string {
  const match = value.match(/^([0-9]+(?:\.[0-9]+)?)px$/);
  if (!match) return value; // rem/em/% — leave as-is
  const px    = parseFloat(match[1]);
  const min   = Math.round(px * 0.9 * 10) / 10;       // 1 decimal, e.g. 16.2
  const fluid = Math.round(px * 0.0833 * 100) / 100;  // 2 decimals, e.g. 1.5
  return `clamp(${min}px, ${fluid}vw, ${px}px)`;
}

function renderNodes(node: TipTapNode | any, idCounts: Map<string, number>, docHeadings: HeadingInfo[]): string {
  if (!node) return '';

  if (Array.isArray(node)) {
    // Multi-section mod guide: array of { id, label, content }
    return node.map(section => {
      const sectionHtml = renderNodes(section.content, idCounts, docHeadings);
      return `<section class="mod-guide-section" id="section-${section.id}">
        <h2 class="section-label">${section.label}</h2>
        ${sectionHtml}
      </section>`;
    }).join('');
  }

  if (node.type === 'doc' && node.content) {
    return node.content.map((n: TipTapNode) => renderNode(n, idCounts, docHeadings)).join('');
  }

  return renderNode(node, idCounts, docHeadings);
}

function renderNode(node: TipTapNode, idCounts: Map<string, number>, docHeadings: HeadingInfo[], isFirstNode: boolean = false): string {
  const inner = node.content ? node.content.map(n => renderNode(n, idCounts, docHeadings)).join('') : (node.text ? escapeHTML(node.text) : '');

  // Apply marks
  let result = inner;
  if (node.marks) {
    node.marks.forEach(mark => {
      if (mark.type === 'bold') result = `<strong>${result}</strong>`;
      if (mark.type === 'italic') result = `<em>${result}</em>`;
      if (mark.type === 'underline') result = `<u>${result}</u>`;
      if (mark.type === 'strike') result = `<del>${result}</del>`;
      if (mark.type === 'code') result = `<code>${result}</code>`;
      if (mark.type === 'link') {
        const href = sanitizeUrl(mark.attrs?.href || '');
        const isInternal = href.startsWith('#') || href.startsWith('/');
        // Internal links (anchors and relative paths) must never have target="_blank"
        const target = (!isInternal && mark.attrs?.target) ? ` target="${escapeAttr(mark.attrs.target)}"` : '';
        const rel = (!isInternal && mark.attrs?.rel) ? ` rel="${escapeAttr(mark.attrs.rel)}"` : '';
        result = `<a href="${escapeAttr(href)}"${target}${rel}>${result}</a>`;
      }
      if (mark.type === 'textStyle') {
        const styles = [];
        const classes = [];
        
        // Basic styles
        if (mark.attrs?.color) styles.push(`color: ${mark.attrs.color}`);
        if (mark.attrs?.fontSize) styles.push(`font-size: ${responsiveFontSize(mark.attrs.fontSize)}`);
        if (mark.attrs?.fontFamily) styles.push(`font-family: ${mark.attrs.fontFamily}`);
        
        // TypographyEngine styles
        if (mark.attrs?.lineHeight) styles.push(`line-height: ${mark.attrs.lineHeight}`);
        if (mark.attrs?.letterSpacing) styles.push(`letter-spacing: ${mark.attrs.letterSpacing}`);
        if (mark.attrs?.fontWeight) styles.push(`font-weight: ${mark.attrs.fontWeight}`);
        if (mark.attrs?.fontStyle) styles.push(`font-style: ${mark.attrs.fontStyle}`);
        if (mark.attrs?.textTransform) styles.push(`text-transform: ${mark.attrs.textTransform}`);
        if (mark.attrs?.textShadow) styles.push(`text-shadow: ${mark.attrs.textShadow}`);
        if (mark.attrs?.textStroke) styles.push(`-webkit-text-stroke: ${mark.attrs.textStroke}`);
        
        // TypographyEngine classes (gradientText)
        if (mark.attrs?.gradientText && mark.attrs.gradientText !== 'none') {
          const classMap: Record<string, string> = {
            cyber: 'gradient-cyber',
            fire: 'gradient-fire',
            ice: 'gradient-ice',
            gold: 'gradient-gold',
            'text-glitch': 'text-glitch',
            'text-neon-pulse': 'text-neon-pulse',
            'text-glow-cyan': 'text-glow-cyan',
            'text-glow-red': 'text-glow-red',
            'text-glow-green': 'text-glow-green',
          };
          if (classMap[mark.attrs.gradientText]) {
            classes.push(classMap[mark.attrs.gradientText]);
          }
        }
        
        // ThemeColor support
        if (mark.attrs?.colorName) {
          if (mark.attrs.colorName.startsWith('custom:')) {
             const parts = mark.attrs.colorName.split(':');
             if (parts.length === 3) {
                classes.push('theme-color', 'theme-color-custom');
                styles.push(`--color-light: ${parts[1]}`);
                styles.push(`--color-dark: ${parts[2]}`);
             }
          } else {
             const slug = mark.attrs.colorName.toLowerCase().replace(/\s+/g, '-');
             classes.push(`theme-color`, `theme-color-${slug}`);
          }
        }
        
        const classAttr = classes.length ? ` class="${classes.join(' ')}"` : '';
        const styleAttr = styles.length ? ` style="${escapeAttr(styles.join('; '))}"` : '';
        
        if (classAttr || styleAttr) {
          result = `<span${classAttr}${styleAttr}>${result}</span>`;
        }
      }
      if (mark.type === 'highlight') {
        const color = mark.attrs?.color ? ` style="background-color: ${mark.attrs.color}"` : '';
        result = `<mark${color}>${result}</mark>`;
      }
    });
  }

  const buildAttrs = (attrs?: Record<string, any>) => {
    if (!attrs) return '';
    const parts = [];
    if (attrs.class) parts.push(`class="${escapeAttr(attrs.class)}"`);

    // Some attributes might come with data-legacy-id, so don't override manually
    if (attrs.id) parts.push(`id="${escapeAttr(attrs.id)}"`);
    if (attrs['data-legacy-id']) parts.push(`data-legacy-id="${escapeAttr(attrs['data-legacy-id'])}"`);

    if (attrs.src) parts.push(`src="${escapeAttr(sanitizeUrl(attrs.src))}"`);
    if (attrs.alt) parts.push(`alt="${escapeAttr(attrs.alt)}"`);
    if (attrs.href) parts.push(`href="${escapeAttr(sanitizeUrl(attrs.href))}"`);
    if (attrs.target) parts.push(`target="${escapeAttr(attrs.target)}"`);
    if (attrs['data-type']) parts.push(`data-type="${escapeAttr(attrs['data-type'])}"`);
    if (attrs['data-zone-id']) parts.push(`data-zone-id="${escapeAttr(attrs['data-zone-id'])}"`);

    // Combine all styles into a single attribute
    const styles = [];
    if (attrs.style) styles.push(attrs.style);
    
    // Typography Engine Block Attrs
    if (attrs.lineHeight) styles.push(`line-height: ${attrs.lineHeight}`);
    if (attrs.textAlign) styles.push(`text-align: ${attrs.textAlign}`);
    if (attrs.fontSize) styles.push(`font-size: ${responsiveFontSize(attrs.fontSize)}`);
    if (attrs.fontFamily) styles.push(`font-family: ${attrs.fontFamily}`);
    if (attrs.fontWeight) styles.push(`font-weight: ${attrs.fontWeight}`);
    if (attrs.letterSpacing) styles.push(`letter-spacing: ${attrs.letterSpacing}`);
    if (attrs.textTransform) styles.push(`text-transform: ${attrs.textTransform}`);
    if (attrs.color) styles.push(`color: ${attrs.color}`);

    if (styles.length) {
      parts.push(`style="${escapeAttr(styles.join('; '))}"`);
    }

    return parts.length ? ' ' + parts.join(' ') : '';
  };

  const styleAttr = node.attrs?.style ? ` style="${escapeAttr(node.attrs.style)}"` : '';

  switch (node.type) {
    case 'text':
      return result;

    case 'paragraph': {
      const bullet = node.attrs?.bullet ? `<span class="para-bullet">${escapeHTML(node.attrs.bullet)}</span> ` : '';
      return `<p${buildAttrs(node.attrs)}>${bullet}${result}</p>`;
    }

    case 'heading': {
      const level = node.attrs?.level || 1;
      // Strip HTML tags from inner text for slugification
      const plainText = result.replace(/<[^>]*>?/gm, '');
      const baseId = (node.attrs?.id as string) || generateHeadingId(plainText);
      const oldId = slugifyLegacy(plainText);

      let id = baseId;
      const count = idCounts.get(baseId) || 0;
      if (count > 0) {
        id = `${baseId}-${count + 1}`;
      }
      idCounts.set(baseId, count + 1);

      // Merge generated IDs back into attrs for buildAttrs
      const attrs = { ...node.attrs, id, 'data-legacy-id': oldId };
      return `<h${level}${buildAttrs(attrs)}>${result}</h${level}>`;
    }

    case 'blockquote': {
      let blockquoteResult = `<blockquote${buildAttrs(node.attrs)}>${result}</blockquote>`;
      // Automatically upgrade legacy generic blockquotes to styled callouts if they lack classes
      if (!node.attrs?.class || !node.attrs.class.includes('callout-')) {
        blockquoteResult = blockquoteResult.replace(/<blockquote[^>]*>\s*<p>(?:✦\s*)?(?:<strong>)?(Tip|Warning|Info|Danger|Note):?(?:<\/strong>)?/gi, (match, type) => {
          const typeLower = type.toLowerCase();
          const calloutType = typeLower === 'note' ? 'info' : typeLower;
          return `<blockquote class="callout-${calloutType}"><p>✦ <strong>${type}:</strong>`;
        });
      }
      return blockquoteResult;
    }

    case 'bulletList': {
      const bulletAttr = node.attrs?.bullet ? ` data-bullet="${escapeAttr(String(node.attrs.bullet))}" style="--list-bullet: '${escapeAttr(String(node.attrs.bullet))}'"` : '';
      return `<ul class="content-ul"${bulletAttr}${styleAttr}>${inner}</ul>`;
    }

    case 'orderedList':
      return `<ol class="content-ol">${inner}</ol>`;

    case 'taskList':
      return `<ul class="task-list">${inner}</ul>`;

    case 'taskItem': {
      const checked = node.attrs?.checked ? ' checked' : '';
      return `<li><input type="checkbox"${checked}> <span>${result}</span></li>`;
    }

    case 'listItem':
      return `<li>${inner}</li>`;

    case 'table': {
      // Opt-in responsive layout: when the author enabled "Stack on Mobile",
      // each body cell carries its column's header text as data-label so the
      // mobile card CSS can render "Header: value". These labels are baked into
      // the HTML here (not patched onto the DOM afterwards) so they survive any
      // re-render — e.g. opening/closing the image lightbox. Desktop unaffected.
      const stacked = node.attrs?.mobileStacked === true || node.attrs?.mobileStacked === 'true';
      if (stacked && Array.isArray(node.content)) {
        const rows = node.content as TipTapNode[];
        const headerCells = rows[0]?.content || [];
        const labels = headerCells.map(cell =>
          (cell.content || [])
            .map(n => renderNode(n, idCounts, docHeadings))
            .join('')
            .replace(/<[^>]*>/g, '')
            .trim(),
        );
        const rowsHtml = rows.map((row, ri) => {
          const cells = row.content || [];
          const cellsHtml = cells.map((cell, ci) => {
            const tag = cell.type === 'tableHeader' ? 'th' : 'td';
            const cellInner = (cell.content || []).map(n => renderNode(n, idCounts, docHeadings)).join('');
            const colspan = cell.attrs?.colspan ? ` colspan="${cell.attrs.colspan}"` : '';
            const rowspan = cell.attrs?.rowspan ? ` rowspan="${cell.attrs.rowspan}"` : '';
            const colwidth = cell.attrs?.colwidth ? ` data-colwidth="${cell.attrs.colwidth.join(',')}"` : '';
            const labelAttr = ri > 0 && labels[ci] ? ` data-label="${escapeAttr(labels[ci])}"` : '';
            return `<${tag}${labelAttr}${colspan}${rowspan}${colwidth}${buildAttrs(cell.attrs)}>${cellInner}</${tag}>`;
          }).join('');
          return `<tr${buildAttrs(row.attrs)}>${cellsHtml}</tr>`;
        }).join('');
        return `<div class="table-wrapper gc-table-stacked"><table${buildAttrs(node.attrs)}>${rowsHtml}</table></div>`;
      }
      return `<div class="table-wrapper"><table${buildAttrs(node.attrs)}>${inner}</table></div>`;
    }

    case 'tableRow':
      return `<tr${buildAttrs(node.attrs)}>${inner}</tr>`;

    case 'tableHeader': {
      const colspan = node.attrs?.colspan ? ` colspan="${node.attrs.colspan}"` : '';
      const rowspan = node.attrs?.rowspan ? ` rowspan="${node.attrs.rowspan}"` : '';
      const colwidth = node.attrs?.colwidth ? ` data-colwidth="${node.attrs.colwidth.join(',')}"` : '';
      return `<th${colspan}${rowspan}${colwidth}${buildAttrs(node.attrs)}>${inner}</th>`;
    }

    case 'tableCell': {
      const colspan = node.attrs?.colspan ? ` colspan="${node.attrs.colspan}"` : '';
      const rowspan = node.attrs?.rowspan ? ` rowspan="${node.attrs.rowspan}"` : '';
      const colwidth = node.attrs?.colwidth ? ` data-colwidth="${node.attrs.colwidth.join(',')}"` : '';
      return `<td${colspan}${rowspan}${colwidth}${buildAttrs(node.attrs)}>${inner}</td>`;
    }

    case 'codeBlock':
      return `<div class="code-block-wrapper group my-6 border border-border rounded-lg overflow-hidden bg-background">
        <div class="flex justify-end items-center px-2 py-1.5 bg-background border-b border-border">
          <button class="copy-code-btn text-text-muted hover:text-text-primary px-2 py-1 rounded-md text-xs flex items-center gap-1.5 transition-colors" aria-label="Copy code">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
            <span class="copy-text">Copy</span>
          </button>
        </div>
        <pre class="!m-0 !border-0 !rounded-none"><code>${result}</code></pre>
      </div>`;

    case 'horizontalRule':
      return `<hr />`;

    case 'image': {
      const imgSrc = node.attrs?.src || '';
      const imgAlt = node.attrs?.alt || '';
      const caption = node.attrs?.caption || node.attrs?.title || null;
      const credit = node.attrs?.credit || null;
      const imgWidth = node.attrs?.width || null;
      const imgHeight = node.attrs?.height || null;
      // `max-width: none` overrides the base `.gaming-content img { max-width: 100% }`
      // clamp, so an explicit editor-set size (e.g. 120×120) renders at exactly that
      // size even inside a narrow container like a table column — the column grows to
      // fit instead of shrinking the image. object-fit keeps the crop square.
      const sizeAttrs = imgWidth && imgHeight
        ? ` width="${escapeAttr(String(imgWidth))}" height="${escapeAttr(String(imgHeight))}" style="width: ${imgWidth}px; height: ${imgHeight}px; max-width: none; aspect-ratio: auto; object-fit: cover"`
        : '';
      if (caption || credit) {
        const creditHtml = credit
          ? `<span class="gc-image-credit">© ${credit}</span>`
          : '';
        return `<figure class="gc-figure">
          <img class="gc-zoomable" src="${imgSrc}" alt="${imgAlt}"${sizeAttrs} />
          <figcaption class="gc-figcaption">
            <span>${caption || ''}</span>${creditHtml}
          </figcaption>
        </figure>`;
      }
      return `<img class="gc-zoomable" src="${imgSrc}" alt="${imgAlt}"${sizeAttrs} />`;
    }

    case 'youtube': {
      let src = node.attrs?.src || '';
      try {
        if (src.includes('watch?v=')) {
          const url = new URL(src);
          const videoId = url.searchParams.get('v');
          if (videoId) src = `https://www.youtube.com/embed/${videoId}`;
        } else if (src.includes('youtu.be/')) {
          const videoId = src.split('youtu.be/')[1]?.split('?')[0];
          if (videoId) src = `https://www.youtube.com/embed/${videoId}`;
        }
      } catch (e) {
        // invalid url, ignore
      }
      return `<div class="youtube-embed"><iframe src="${src}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    }

    case 'callout': {
      const type = node.attrs?.type || 'info';
      if (type === 'spoiler') {
        return `<div class="spoiler-wrap"><div class="spoiler-blur"><p>🚫 ${inner}</p></div><button type="button" class="spoiler-reveal-btn">👁 Reveal Spoiler</button></div>`;
      }
      const icon = {
        info: '💡',
        warning: '⚠️',
        tip: '✦',
        quote: '"',
        'hot-take': '🔥',
        'did-you-know': '❓',
      }[type as string] || '💡';
      const label = type.charAt(0).toUpperCase() + type.slice(1);
      return `<blockquote class="callout-${type}"><p>${icon} <strong>${label}:</strong> ${inner}</p></blockquote>`;
    }

    case 'spoilerBlock': {
      const label = escapeHTML(node.attrs?.label || '⚠ Spoiler — tap to reveal');
      const content = escapeHTML(node.attrs?.content || '');
      return `<div class="spoiler-wrap"><span class="spoiler-label">${label}</span><div class="spoiler-blur">${content}</div><button type="button" class="spoiler-reveal-btn">👁 Reveal Spoiler</button></div>`;
    }

    case 'collapsibleSection':
      return `<details class="collapsible-section"><summary>${node.attrs?.title || 'Click to expand'}</summary>${inner}</details>`;

    case 'gamingBadge':
      return `<span class="gaming-badge gaming-badge-${node.attrs?.variant || 'platform'}">${node.attrs?.label}</span>`;

    case 'imageGrid':
      return `<div class="image-grid grid-cols-${node.attrs?.columns || 2}">${inner}</div>`;

    case 'imageGallery': {
      let slots = node.attrs?.images || []
      
      if (slots.length === 0) {
        slots = [1,2,3,4,5].map(i => ({
          src: node.attrs?.[`src${i}`] || '',
          alt: node.attrs?.[`alt${i}`] || `Image ${i}`,
          caption: node.attrs?.[`caption${i}`] || '',
          credit: node.attrs?.[`credit${i}`] || '',
        }))
      }

      let lbIdx = 0
      const filled = slots.filter((s: any) => s.src).map((s: any) => ({
        ...s,
        lbIndex: lbIdx++,
      }))
      
      if (filled.length === 0) return ''

      if (filled.length >= 2 && filled.length <= 4) {
        const gridClass = `gc-gallery-grid gc-gallery-grid-${filled.length}`;
        const imagesHtml = filled.map((slot: any) => 
          `<div class="gc-gallery-grid-item" data-lb-index="${slot.lbIndex}">
            <img src="${escapeAttr(slot.src)}" alt="${escapeAttr(slot.alt)}" loading="lazy" decoding="async" class="gc-gallery-grid-img" data-caption="${escapeAttr(slot.caption || '')}" data-credit="${escapeAttr(slot.credit || '')}" />
          </div>`
        ).join('')

        return `<div class="${gridClass}" data-type="gallery-grid" data-lb-total="${filled.length}">
          ${imagesHtml}
        </div>`
      }

      const thumbnails = filled.map((slot: any, i: number) =>
        `<button class="gc-gallery-lb-thumb${i === 0 ? ' active' : ''}" data-dot="${i}" aria-label="Go to image ${i+1}">
          <img src="${escapeAttr(slot.src)}" alt="Thumbnail" loading="lazy" />
        </button>`
      ).join('')

      const hiddenImages = filled.map((slot: any) => 
         `<img src="${escapeAttr(slot.src)}" alt="${escapeAttr(slot.alt)}" loading="lazy" decoding="async" data-lb-index="${slot.lbIndex}" data-caption="${escapeAttr(slot.caption || '')}" data-credit="${escapeAttr(slot.credit || '')}" style="display:none" />`
      ).join('')

      return `<div class="gc-inline-carousel" data-type="gallery" data-lb-total="${filled.length}">
        ${hiddenImages}
        <div class="gc-gallery-lightbox-card">
          <div class="gc-gallery-lightbox-img-wrap">
            <div class="carousel-counter-overlay">1 of ${filled.length}</div>
            <img class="main-carousel-img" src="${escapeAttr(filled[0].src)}" alt="${escapeAttr(filled[0].alt)}" />
            <button class="gc-gallery-lb-arrow gc-gallery-lb-prev" aria-label="Previous"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
            <button class="gc-gallery-lb-arrow gc-gallery-lb-next" aria-label="Next"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>
          </div>
          <div class="gc-gallery-lb-thumbnails">${thumbnails}</div>
        </div>
      </div>`
    }

    case 'customDiv':
      return `<div${buildAttrs(node.attrs)}>${inner}</div>`;

    case 'customSection':
      return `<section${buildAttrs(node.attrs)}>${inner}</section>`;

    case 'customArticle':
      return `<article${buildAttrs(node.attrs)}>${inner}</article>`;

    case 'customFigure':
      return `<figure${buildAttrs(node.attrs)}>${inner}</figure>`;

    case 'customSpan':
      return `<span${buildAttrs(node.attrs)}>${inner}</span>`;

    case 'details':
      return `<details${buildAttrs(node.attrs)}>${inner}</details>`;

    case 'summary':
      return `<summary>${inner}</summary>`;

    // v2.4: Migrated Gaming Blocks
    case 'reviewCard': {
      return renderReviewCard(node.attrs as unknown as ReviewCardAttrs);
    }
    case 'mentionedGame': {
      return renderMentionedGame(node.attrs as unknown as MentionedGameAttrs);
    }

    case 'benchmarkCard': {
      return renderBenchmarkCard(node.attrs as unknown as BenchmarkCardAttrs);
    }

    case 'patchNotes': {
      return renderPatchNotes(node.attrs as unknown as PatchNotesAttrs);
    }

    case 'systemRequirements': {
      return renderSystemRequirements(node.attrs as unknown as SystemRequirementsAttrs);
    }

    case 'prosCons': {
      return renderProsCons(node.attrs as unknown as ProsConsAttrs);
    }

    case 'dealCard': {
      return renderDealCard(node.attrs as unknown as DealCardAttrs);
    }

    case 'timeline': {
      return renderTimeline(node.attrs as unknown as TimelineAttrs);
    }

    case 'faq': {
      return renderFAQ(node.attrs as unknown as FAQAttrs);
    }

    case 'changelog': {
      return renderChangelog(node.attrs as unknown as ChangelogAttrs);
    }

    case 'versionCompare': {
      return renderVersionCompare(node.attrs as unknown as VersionCompareAttrs);
    }

    case 'bossCard': {
      return renderBossCard(node.attrs as unknown as BossCardAttrs);
    }

    case 'buildCard': {
      return renderBuildCard(node.attrs as unknown as BuildCardAttrs);
    }

    case 'awardBadge': {
      return renderAwardBadge(node.attrs as unknown as AwardBadgeAttrs);
    }

    case 'statCompare': {
      return renderStatCompare(node.attrs as unknown as StatCompareAttrs);
    }

    case 'lootTable': {
      return renderLootTable(node.attrs as unknown as LootTableAttrs);
    }

    case 'inlinePoll': {
      const pollAttrs = node.attrs as unknown as InlinePollAttrs;
      if (!pollAttrs.pollId) {
        // No poll linked yet — show placeholder card (visible but not interactive)
        return renderInlinePoll(pollAttrs);
      }
      // Poll linked — bare container; PollWidget fills it via portal
      return `<div class="gc-inline-poll" data-poll-id="${pollAttrs.pollId}" data-display-style="${pollAttrs.displayStyle || 'bar'}" data-type="inline-poll"></div>`;
    }

    case 'modCard': {
      return renderModCard(node.attrs as unknown as ModCardAttrs);
    }

    case 'videoTimestamp': {
      return renderVideoTimestamp(node.attrs as unknown as VideoTimestampAttrs);
    }

    case 'socialEmbed': {
      return renderSocialEmbed(node.attrs as unknown as SocialEmbedAttrs);
    }

    case 'newsletterCta': {
      return renderNewsletterCta(node.attrs as unknown as NewsletterCtaAttrs);
    }

    case 'relatedArticles': {
      return renderRelatedArticles(node.attrs as unknown as RelatedArticlesAttrs);
    }
    case 'hardwareSpec': {
      return renderHardwareSpec(node.attrs as unknown as HardwareSpecAttrs);
    }

    case 'priceHistory': {
      return renderPriceHistory(node.attrs as unknown as PriceHistoryAttrs);
    }

    case 'modLoadOrder': {
      return renderModLoadOrder(node.attrs as unknown as ModLoadOrderAttrs);
    }

    case 'controversyBlock': {
      return renderControversyBlock(node.attrs as unknown as ControversyBlockAttrs);
    }

    case 'tierList': {
      let tiers: TierListAttrs;
      try {
        tiers = JSON.parse((node.attrs as { tiers: string }).tiers);
      } catch {
        tiers = { title: '', tiers: [] };
      }
      return renderTierList(tiers);
    }

    case 'interactiveMap': {
      const attrs = node.attrs as Partial<InteractiveMapAttrs>;
      return renderInteractiveMap({
        mapImageUrl: attrs.mapImageUrl || '',
        title: attrs.title || '',
        pins: Array.isArray(attrs.pins) ? attrs.pins : [],
      });
    }

    case 'comparisonTable': {
      const attrs = node.attrs as Partial<ComparisonTableAttrs>;
      return renderComparisonTable({
        title: attrs.title || '',
        columns: Array.isArray(attrs.columns) ? attrs.columns : [],
        rows: Array.isArray(attrs.rows) ? attrs.rows : [],
      });
    }

    case 'achievementBlock': {
      return renderAchievementBlock(node.attrs as unknown as AchievementBlockAttrs);
    }

    case 'priceCompareTable': {
      return renderPriceCompareTable(node.attrs as unknown as PriceCompareTableAttrs);
    }

    case 'walkthroughContainer': {
      const title = node.attrs?.title || 'Walkthrough Guide';
      return `
        <div class="walkthrough-container border-2 border-slate-700/50 rounded-xl my-8 bg-slate-900/20 overflow-hidden" data-type="walkthrough-container">
          <div class="bg-slate-800/80 px-4 py-3 border-b border-slate-700/50 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
            <h3 class="text-lg font-bold text-white m-0 p-0">${escapeHTML(title)}</h3>
            <div class="flex items-center gap-4">
              <div class="text-xs font-medium text-slate-400 walkthrough-progress-count">0 steps complete</div>
              <div class="w-32 h-2 bg-slate-900 rounded-full overflow-hidden">
                <div class="walkthrough-progress-bar-fill h-full bg-cyan-500 transition-all duration-300" style="width: 0%"></div>
              </div>
            </div>
          </div>
          <div class="p-4 flex flex-col gap-4">
            ${inner}
          </div>
          <div class="bg-slate-800/50 px-4 py-2 border-t border-slate-700/50 flex justify-end">
            <button class="walkthrough-reset-btn text-xs font-medium text-slate-500 hover:text-white transition-colors underline decoration-slate-700 hover:decoration-slate-400 underline-offset-4">Reset Progress</button>
          </div>
        </div>
      `;
    }

    case 'walkthroughStep': {
      const title = node.attrs?.title || 'Step';
      return `
        <div class="walkthrough-step flex gap-3 relative group" data-type="walkthrough-step">
          <div class="flex-none pt-1">
            <div class="w-6 h-6 rounded-full border border-slate-600 bg-slate-800 flex items-center justify-center relative cursor-pointer hover:border-cyan-400 transition-colors">
              <input type="checkbox" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" aria-label="Mark step as complete" />
              <div class="walkthrough-step-check w-3 h-3 bg-cyan-400 rounded-sm opacity-0 scale-50 transition-all duration-200"></div>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="walkthrough-step-header mb-2 transition-opacity">
              <h4 class="text-sm font-bold text-white m-0 p-0">${escapeHTML(title)}</h4>
            </div>
            <div class="walkthrough-step-content prose-sm prose-invert prose-p:my-2 prose-ul:my-2 prose-ol:my-2 opacity-90 transition-opacity">
              ${inner}
            </div>
          </div>
        </div>
      `;
    }

    case 'adSlot': {
      const zoneId = node.attrs?.zoneId || 'ADS-02';
      return `<div class="gc-monetization-zone" data-zone-id="${escapeAttr(zoneId)}"></div>`;
    }

    default:
      return inner;
  }
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Only allow safe schemes (or relative/anchor URLs) into href/src attributes.
// Drops javascript:, data:, vbscript:, and any other unrecognised scheme.
const SAFE_URL_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

function sanitizeUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();

  // Relative or anchor URLs have no scheme, allow them through.
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return url;

  // Strip ASCII control characters, which browsers ignore inside a scheme
  // (this closes the classic filter-bypass trick of putting a tab or
  // newline in the middle of the word "javascript").
  let stripped = '';
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    if (code > 31 && code !== 127) stripped += trimmed[i];
  }

  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*:)/.exec(stripped);
  if (!schemeMatch) return url; // no scheme at all, treat as relative

  const scheme = schemeMatch[1].toLowerCase();
  return SAFE_URL_SCHEMES.has(scheme) ? url : '';
}

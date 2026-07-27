'use client';

import { useMemo, useState } from 'react';import { Spinner } from '@/components/ui/Spinner';

import { ChevronDown, ChevronRight, Target, BookOpen, Link2, AlignLeft } from 'lucide-react';

// -- Pure analysis helpers ----------------------------------------------------

function extractText(node: any): string {
  if (!node) return '';
  let text = '';
  if (typeof node === 'string') return node;
  if (node.text) text += node.text + ' ';
  if (node.content && Array.isArray(node.content)) {
    node.content.forEach((child: any) => { text += extractText(child); });
  }
  if (Array.isArray(node)) {
    node.forEach((section: any) => { text += extractText(section?.content ?? section); });
  }
  return text;
}

function getHeadings(node: any): { level: number; text: string }[] {
  const headings: { level: number; text: string }[] = [];
  if (!node) return headings;
  if (node.type === 'heading') {
    headings.push({ level: node.attrs?.level ?? 2, text: extractText(node) });
    return headings;
  }
  if (node.content && Array.isArray(node.content)) {
    node.content.forEach((child: any) => headings.push(...getHeadings(child)));
  }
  if (Array.isArray(node)) {
    node.forEach((s: any) => headings.push(...getHeadings(s?.content ?? s)));
  }
  return headings;
}

function countInternalLinks(node: any): number {
  if (!node) return 0;
  let count = 0;
  if (node.type === 'text' && node.marks) {
    node.marks.forEach((m: any) => {
      if (m.type === 'link' && m.attrs?.href?.startsWith('/')) count++;
    });
  }
  if (node.content && Array.isArray(node.content)) {
    node.content.forEach((c: any) => { count += countInternalLinks(c); });
  }
  if (Array.isArray(node)) {
    node.forEach((s: any) => { count += countInternalLinks(s?.content ?? s); });
  }
  return count;
}

function fleschKincaid(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length || 1;
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 0;
  const syllables = words.reduce((acc, word) => {
    const w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return acc;
    let count = w.match(/[aeiouy]+/g)?.length ?? 1;
    if (w.endsWith('e') && count > 1) count--;
    return acc + Math.max(1, count);
  }, 0);
  const score = 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syllables / words.length);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function keywordDensity(text: string, keyword: string): number {
  if (!keyword.trim() || !text.trim()) return 0;
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const kw = keyword.toLowerCase();
  const matches = words.filter(w => w.includes(kw)).length;
  return words.length > 0 ? parseFloat(((matches / words.length) * 100).toFixed(1)) : 0;
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

function getScoreBg(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

// -- Component ----------------------------------------------------------------

interface SeoReadabilityPanelProps {
  content: any;
  focusKeyword: string;
}

export default function SeoReadabilityPanel({ content, focusKeyword }: SeoReadabilityPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const analysis = useMemo(() => {
    const text = extractText(content);
    const words = text.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const headings = getHeadings(content);
    const internalLinks = countInternalLinks(content);
    const flesch = fleschKincaid(text);
    const kwDensity = keywordDensity(text, focusKeyword);
    const kwInH2 = focusKeyword
      ? headings.filter(h => h.level === 2 && h.text.toLowerCase().includes(focusKeyword.toLowerCase())).length > 0
      : false;

    // Score calculation (0-100)
    let score = 0;
    // Word count (max 20pts)
    if (wordCount >= 600) score += 20;
    else if (wordCount >= 300) score += 10;
    // Keyword density (max 20pts) — sweet spot 1-3%
    if (kwDensity >= 1 && kwDensity <= 3) score += 20;
    else if (kwDensity > 0) score += 8;
    // Headings (max 20pts)
    if (headings.length >= 3) score += 20;
    else if (headings.length >= 1) score += 10;
    // Keyword in H2 (max 10pts)
    if (focusKeyword && kwInH2) score += 10;
    // Flesch readability (max 20pts)
    if (flesch >= 60) score += 20;
    else if (flesch >= 40) score += 10;
    // Internal links (max 10pts)
    if (internalLinks >= 2) score += 10;
    else if (internalLinks >= 1) score += 5;

    return { text, wordCount, headings, internalLinks, flesch, kwDensity, kwInH2, score };
  }, [content, focusKeyword]);

  const gradeLabel = (f: number) => {
    if (f >= 80) return 'Very Easy';
    if (f >= 70) return 'Easy';
    if (f >= 60) return 'Standard';
    if (f >= 50) return 'Fairly Difficult';
    if (f >= 30) return 'Difficult';
    return 'Very Difficult';
  };

  const densityLabel = (d: number) => {
    if (d === 0) return { text: 'Not found', color: 'text-red-400' };
    if (d < 0.5) return { text: 'Too low', color: 'text-yellow-400' };
    if (d <= 3) return { text: 'Good', color: 'text-green-400' };
    return { text: 'Too high', color: 'text-orange-400' };
  };

  const dl = densityLabel(analysis.kwDensity);

  return (
    <div className="bg-bg-surface border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-bg-elevated transition-colors"
      >
        <div className="flex items-center gap-2 text-text-primary font-medium">
          <Target className="w-4 h-4 text-accent-light" />
          SEO Readability
          {/* Score pill */}
          <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${getScoreColor(analysis.score)} bg-current/10`}
            style={{ background: 'transparent' }}>
            <span className={getScoreColor(analysis.score)}>{analysis.score}/100</span>
          </span>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Overall score bar */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-text-muted">Overall Score</span>
              <span className={`text-xs font-bold ${getScoreColor(analysis.score)}`}>{analysis.score}/100</span>
            </div>
            <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getScoreBg(analysis.score)}`}
                style={{ width: `${analysis.score}%` }}
              />
            </div>
          </div>

          {/* Keyword density */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Keyword Density</span>
            </div>
            {focusKeyword ? (
              <div className="flex items-center justify-between bg-bg-elevated rounded-lg px-3 py-2">
                <span className="text-xs text-text-primary">"{focusKeyword}"</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-text-muted">{analysis.kwDensity}%</span>
                  <span className={`text-xs font-semibold ${dl.color}`}>{dl.text}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-dim italic">Set a focus keyword to see density</p>
            )}
            {focusKeyword && (
              <p className={`text-xs ${analysis.kwInH2 ? 'text-green-400' : 'text-yellow-400'}`}>
                {analysis.kwInH2 ? '✓ Keyword appears in an H2 heading' : '⚠ Keyword not found in any H2 heading'}
              </p>
            )}
          </div>

          {/* Heading structure */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <AlignLeft className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Heading Structure</span>
              <span className="ml-auto text-xs text-text-dim">{analysis.headings.length} headings</span>
            </div>
            {analysis.headings.length > 0 ? (
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {analysis.headings.slice(0, 6).map((h, i) => (
                  <div key={i} className="flex items-baseline gap-2">
                    <span className="text-[10px] font-bold text-accent-light w-7 shrink-0">H{h.level}</span>
                    <span className="text-xs text-text-muted truncate">{h.text.trim().slice(0, 60)}</span>
                  </div>
                ))}
                {analysis.headings.length > 6 && (
                  <p className="text-[10px] text-text-dim">+{analysis.headings.length - 6} more…</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-yellow-400">⚠ No headings — add H2/H3 for better structure</p>
            )}
          </div>

          {/* Reading grade */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Reading Level</span>
            </div>
            <div className="flex items-center justify-between bg-bg-elevated rounded-lg px-3 py-2">
              <span className="text-xs text-text-primary">Flesch-Kincaid</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-text-muted">{analysis.flesch}</span>
                <span className={`text-xs font-semibold ${analysis.flesch >= 60 ? 'text-green-400' : analysis.flesch >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {gradeLabel(analysis.flesch)}
                </span>
              </div>
            </div>
          </div>

          {/* Internal links */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Internal Links</span>
            </div>
            <div className="flex items-center justify-between bg-bg-elevated rounded-lg px-3 py-2">
              <span className="text-xs text-text-primary">{analysis.internalLinks} internal link{analysis.internalLinks !== 1 ? 's' : ''}</span>
              <span className={`text-xs font-semibold ${analysis.internalLinks >= 2 ? 'text-green-400' : analysis.internalLinks === 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                {analysis.internalLinks >= 2 ? 'Good' : analysis.internalLinks === 1 ? 'Add more' : 'None'}
              </span>
            </div>
          </div>

          {/* Word count */}
          <div className="flex items-center justify-between text-xs border-t border-border pt-3 mt-2">
            <span className="text-text-muted">Word count</span>
            <span className={`font-semibold ${analysis.wordCount >= 600 ? 'text-green-400' : analysis.wordCount >= 300 ? 'text-yellow-400' : 'text-red-400'}`}>
              {analysis.wordCount.toLocaleString()} words
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

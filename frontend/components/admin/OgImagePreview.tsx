'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Share2, AtSign, ThumbsUp, MessageCircle } from 'lucide-react';

interface OgImagePreviewProps {
  title: string;
  description: string;
  imageUrl: string;
  siteUrl?: string;
  siteName?: string;
}

type Platform = 'twitter' | 'facebook' | 'whatsapp';

const PLATFORM_CONFIG = {
  twitter: {
    label: 'Twitter / X',
    icon: AtSign,
    color: 'text-sky-400',
    cardWidth: 'max-w-[506px]',
    imageAspect: 'aspect-[1.91/1]',
    titleSize: 'text-[15px]',
    descSize: 'text-[13px]',
    titleLines: 2,
    descLines: 2,
    bg: '#15202b',
    border: '#2f3336',
    textPrimary: '#e7e9ea',
    textSecondary: '#71767b',
    urlColor: '#71767b',
  },
  facebook: {
    label: 'Facebook / Discord',
    icon: ThumbsUp,
    color: 'text-blue-400',
    cardWidth: 'max-w-[527px]',
    imageAspect: 'aspect-[1.91/1]',
    titleSize: 'text-[16px]',
    descSize: 'text-[14px]',
    titleLines: 2,
    descLines: 3,
    bg: '#242526',
    border: '#3a3b3c',
    textPrimary: '#e4e6eb',
    textSecondary: '#b0b3b8',
    urlColor: '#b0b3b8',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageCircle,
    color: 'text-green-400',
    cardWidth: 'max-w-[360px]',
    imageAspect: 'aspect-[1.91/1]',
    titleSize: 'text-[14px]',
    descSize: 'text-[13px]',
    titleLines: 2,
    descLines: 2,
    bg: '#1f2c34',
    border: '#2a3942',
    textPrimary: '#e9edef',
    textSecondary: '#8696a0',
    urlColor: '#53bdeb',
  },
};

function CardPreview({ platform, title, description, imageUrl, siteUrl, siteName }: OgImagePreviewProps & { platform: Platform }) {
  const cfg = PLATFORM_CONFIG[platform];
  const Icon = cfg.icon;
  const displayUrl = siteUrl?.replace(/^https?:\/\//, '') ?? 'thecoregamer.com';
  const displayTitle = title || 'Article title will appear here';
  const displayDesc = description || 'Article description will appear here when shared on social media.';

  return (
    <div className={`${cfg.cardWidth} mx-auto w-full`}>
      <div
        className="rounded-xl overflow-hidden border"
        style={{ background: cfg.bg, borderColor: cfg.border }}
      >
        {/* OG Image */}
        <div className={`w-full ${cfg.imageAspect} relative bg-bg-elevated overflow-hidden`}>
          {imageUrl ? (
            <img src={imageUrl} alt="OG Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3" style={{ background: '#0d1117' }}>
              <Share2 className="w-10 h-10 opacity-20" style={{ color: cfg.textSecondary }} />
              <p className="text-xs" style={{ color: cfg.textSecondary }}>No featured image set</p>
            </div>
          )}
          {/* Platform badge overlay */}
          <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold" style={{ background: `${cfg.bg}cc`, color: cfg.textSecondary }}>
            <Icon className={`w-3 h-3 ${cfg.color}`} />
            {cfg.label}
          </div>
        </div>

        {/* Card metadata */}
        <div className="px-4 py-3 space-y-1">
          {/* Domain */}
          <p className="text-[11px] uppercase tracking-wide truncate" style={{ color: cfg.urlColor }}>{displayUrl}</p>

          {/* Title */}
          <p
            className={`font-semibold leading-snug ${cfg.titleSize}`}
            style={{
              color: cfg.textPrimary,
              display: '-webkit-box',
              WebkitLineClamp: cfg.titleLines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {displayTitle}
          </p>

          {/* Description */}
          <p
            className={`leading-snug ${cfg.descSize}`}
            style={{
              color: cfg.textSecondary,
              display: '-webkit-box',
              WebkitLineClamp: cfg.descLines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {displayDesc}
          </p>
        </div>
      </div>

      {/* Pixel info */}
      <div className="flex items-center justify-between mt-2 px-1">
        <span className="text-[10px]" style={{ color: '#4b5563' }}>
          {platform === 'whatsapp' ? '360×188px card' : '1200×630px recommended'}
        </span>
        <span className={`text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
      </div>
    </div>
  );
}

export default function OgImagePreview({ title, description, imageUrl, siteUrl, siteName }: OgImagePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState<Platform>('twitter');

  const tabs: { key: Platform; label: string; Icon: typeof AtSign }[] = [
    { key: 'twitter', label: 'Twitter / X', Icon: AtSign },
    { key: 'facebook', label: 'Facebook', Icon: ThumbsUp },
    { key: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle },
  ];

  return (
    <div className="bg-bg-surface border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-bg-elevated transition-colors"
      >
        <div className="flex items-center gap-2 text-text-primary font-medium">
          <Share2 className="w-4 h-4 text-accent-light" />
          Social Preview
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="border-t border-border">
          {/* Platform tabs */}
          <div className="flex border-b border-border">
            {tabs.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActivePlatform(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                  activePlatform === key
                    ? 'text-accent-light border-b-2 border-accent-light -mb-px bg-bg-elevated'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Preview card */}
          <div className="p-4 bg-bg-primary">
            <CardPreview
              platform={activePlatform}
              title={title}
              description={description}
              imageUrl={imageUrl}
              siteUrl={siteUrl}
              siteName={siteName}
            />
          </div>

          {/* Hint */}
          <div className="px-4 pb-3">
            <p className="text-[10px] text-text-dim text-center">
              Preview based on SEO Title, SEO Description, and Featured Image
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

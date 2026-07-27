'use client';

import { useState, useEffect, useRef } from 'react';
import { Link2, Mail, Share2 } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06c0 5.022 3.657 9.184 8.438 9.94v-7.03H7.898v-2.91h2.54V9.845c0-2.506 1.493-3.89 3.776-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562v1.878h2.773l-.443 2.91h-2.33V22c4.78-.756 8.438-4.918 8.438-9.94z" />
  </svg>
);

const RedditIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249c0-.688-.561-1.249-1.248-1.249zm5.5 0c-.687 0-1.248.562-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249c0-.688-.561-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
  </svg>
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.767.967-.94 1.165-.173.198-.347.223-.644.074-1.612-.806-2.669-1.438-3.732-3.26-.282-.486.282-.451.805-1.504.089-.18.045-.335-.031-.469-.075-.135-.521-1.27-.776-1.745-.252-.469-.508-.404-.696-.412-.179-.008-.382-.01-.59-.01-.207 0-.541.077-.821.39-.281.312-1.058 1.034-1.058 2.522 0 1.487 1.04 2.917 1.183 3.122.144.205 2.052 3.122 5.045 4.382 2.494 1.043 3.001.836 3.535.788.533-.049 1.728-.706 1.973-1.39.243-.682.243-1.265.169-1.39z" />
  </svg>
);

interface ShareButtonsProps {
  title: string;
  url: string;
}

export default function ShareButtons({ title, url }: ShareButtonsProps) {
  const { addToast } = useUIStore();
  const [fullUrl, setFullUrl] = useState(url);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setFullUrl(`${window.location.origin}${url}`);
    }
  }, [url]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(fullUrl);
    addToast({ type: 'success', message: 'Link copied to clipboard!' });
    setMobileMenuOpen(false);
  };

  const buttons = [
    { label: 'Twitter', bg: '#1DA1F2', icon: TwitterIcon, href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(fullUrl)}` },
    { label: 'Facebook', bg: '#1877F2', icon: FacebookIcon, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}` },
    { label: 'Reddit', bg: '#FF4500', icon: RedditIcon, href: `https://reddit.com/submit?url=${encodeURIComponent(fullUrl)}&title=${encodeURIComponent(title)}` },
    { label: 'WhatsApp', bg: '#25D366', icon: WhatsAppIcon, href: `https://wa.me/?text=${encodeURIComponent(`${title} ${fullUrl}`)}` },
    { label: 'Email', bg: '#6b7280', icon: Mail, href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(fullUrl)}` },
  ];

  return (
    <>
      {/* Desktop / tablet: icons shown inline */}
      <div className="hidden sm:flex items-center gap-2">
        {buttons.map(({ label, bg, icon: Icon, href }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-8 h-8 rounded-full text-white transition-transform hover:scale-105"
            style={{ backgroundColor: bg }}
            aria-label={`Share on ${label}`}
            title={label}
          >
            <Icon className="w-4 h-4" />
          </a>
        ))}

        <button
          onClick={copyLink}
          className="flex items-center justify-center w-8 h-8 rounded-full text-white transition-transform hover:scale-105"
          style={{ backgroundColor: '#3b82f6' }}
          aria-label="Copy link"
          title="Copy link"
        >
          <Link2 className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile: icons collapse behind a single Share trigger to avoid wrapping the row */}
      <div className="relative sm:hidden" ref={mobileMenuRef}>
        <button
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="flex items-center justify-center w-8 h-8 rounded-full text-white transition-transform hover:scale-105"
          style={{ backgroundColor: '#6b7280' }}
          aria-label="Share"
          aria-haspopup="true"
          aria-expanded={mobileMenuOpen}
          title="Share"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {mobileMenuOpen && (
          <div className="absolute left-0 top-full mt-2 z-50 flex items-center gap-2 p-2 rounded-xl bg-bg-surface border border-border shadow-xl">
            {buttons.map(({ label, bg, icon: Icon, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-8 h-8 rounded-full text-white transition-transform hover:scale-105"
                style={{ backgroundColor: bg }}
                aria-label={`Share on ${label}`}
                title={label}
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
            <button
              onClick={copyLink}
              className="flex items-center justify-center w-8 h-8 rounded-full text-white transition-transform hover:scale-105"
              style={{ backgroundColor: '#3b82f6' }}
              aria-label="Copy link"
              title="Copy link"
            >
              <Link2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

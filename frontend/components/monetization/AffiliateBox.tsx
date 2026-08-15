'use client';

import { useCallback } from 'react';
import { ExternalLink, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import { injectUtm } from '@/lib/affiliate';

interface AffiliateBoxProps {
  productName: string;
  storeName: string;
  price?: string;
  url: string;
  imageUrl?: string;
  buttonLabel?: string;
  articleSlug?: string;
  gameSlug?: string;
}

export default function AffiliateBox({
  productName, storeName, price, url, imageUrl,
  buttonLabel = 'Buy Now', articleSlug, gameSlug,
}: AffiliateBoxProps) {
  const trackedUrl = injectUtm(url, storeName);

  const handleClick = useCallback(() => {
    fetch('/api/analytics/deal-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, store: storeName, articleSlug, gameSlug }),
    }).catch(() => {});
  }, [url, storeName, articleSlug, gameSlug]);

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center gap-4 p-5 md:p-6 bg-[var(--bg2)] my-6">
        {imageUrl && (
          <div className="shrink-0 w-24 h-24 relative overflow-hidden bg-bg-primary">
            <Image src={imageUrl} alt={productName} fill className="object-cover" sizes="96px" />
          </div>
        )}
        <div className="flex-1 text-center sm:text-left">
          <h4 className="text-lg font-bold text-text-primary mb-1">{productName}</h4>
          <p className="text-sm text-text-muted">Available at {storeName}</p>
          {price && <p className="text-lg font-semibold text-[var(--brand-green)] mt-2">{price}</p>}
        </div>
        <a
          href={trackedUrl}
          onClick={handleClick}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="shrink-0 flex items-center gap-2 px-6 py-3 font-bold bg-[var(--brand-green)] hover:bg-[var(--brand-green-hover)] text-black transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
          {buttonLabel}
          <ExternalLink className="w-4 h-4 opacity-75" />
        </a>
      </div>
      <p className="text-text-muted" style={{
        fontSize: '10px', marginTop: '4px',
        textAlign: 'right', letterSpacing: '0.02em',
      }}>
        ↗ Affiliate link — we may earn a commission at no extra cost to you.{' '}
        <a href="/affiliate-disclosure" className="text-text-muted underline">
          Learn more
        </a>
      </p>
    </>
  );
}

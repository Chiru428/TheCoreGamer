import { SITE_NAME, SITE_URL } from '@/lib/constants';

export type SchemaType =
  | 'Article'
  | 'Review'
  | 'BreadcrumbList'
  | 'FAQPage'
  | 'VideoGame'
  | 'Organization'
  | 'WebSite'
  | 'HowTo'
  | 'Person'
  | 'AggregateRating'
  | 'WebPage'
  | 'SearchAction'
  | 'VideoObject';

interface JsonLdProps { type: SchemaType; data: Record<string, unknown>; }

export default function JsonLd({ type, data }: JsonLdProps) {
  const schema = buildSchema(type, data);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 0) }}
    />
  );
}

function buildSchema(type: SchemaType, data: Record<string, unknown>) {
  switch (type) {
    case 'Article': return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': `${data.url}#article`,
      headline: data.title,
      description: data.description,
      image: data.image ? {
        '@type': 'ImageObject',
        url: data.image,
        width: 1200,
        height: 630,
      } : undefined,
      datePublished: data.datePublished,
      dateModified: data.dateModified ?? data.datePublished,
      inLanguage: 'en-US',
      // author.url is required for Google E-E-A-T signals
      author: Array.isArray(data.authors) && (data.authors as any[]).length > 0
        ? (data.authors as any[]).map((a: any) => ({ '@type': 'Person', name: a.name, url: a.url ?? undefined }))
        : {
            '@type': 'Person',
            name: data.authorName,
            url: data.authorUrl ? `${SITE_URL}${data.authorUrl}` : undefined,
          },
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png`, width: 600, height: 60 },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': data.url },
      keywords: data.keywords ?? undefined,
      articleSection: data.section ?? undefined,
      wordCount: data.wordCount ?? undefined,
    };

    case 'Review': return {
      '@context': 'https://schema.org',
      '@type': 'Review',
      '@id': `${data.url}#review`,
      name: `${data.gameTitle} Review`,
      url: data.url,
      inLanguage: 'en-US',
      itemReviewed: {
        '@type': 'VideoGame',
        name: data.gameTitle,
        description: data.gameDescription ?? undefined,
        operatingSystem: Array.isArray(data.platforms) ? (data.platforms as string[]).join(', ') : data.platforms,
        applicationCategory: 'Game',
        genre: Array.isArray(data.genres) ? data.genres : undefined,
        gamePlatform: Array.isArray(data.platforms) ? data.platforms : undefined,
        author: data.developer ? [{ '@type': 'Organization', name: data.developer }] : undefined,
        publisher: data.publisher ? [{ '@type': 'Organization', name: data.publisher }] : undefined,
        datePublished: data.releaseDate ?? undefined,
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: data.score,
        bestRating: 10,
        worstRating: 0,
        ratingExplanation: data.verdict ?? undefined,
      },
      author: {
        '@type': 'Person',
        name: data.authorName,
        url: data.authorUrl ? `${SITE_URL}${data.authorUrl}` : undefined,
      },
      reviewBody: data.verdict,
      datePublished: data.datePublished,
      dateModified: data.dateModified ?? data.datePublished,
      publisher: { '@type': 'Organization', name: SITE_NAME, sameAs: SITE_URL },
    };

    case 'BreadcrumbList': return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: (data.items as { name: string; url: string }[]).map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        item: item.url ? `${SITE_URL}${item.url}` : undefined,
      })),
    };

    case 'FAQPage': return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: (data.questions as { q: string; a: string }[]).map(faq => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
      })),
    };

    case 'VideoGame': return {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      '@id': `${SITE_URL}/games/${data.slug}#game`,
      name: data.title,
      description: data.description,
      image: data.coverImageUrl ?? undefined,
      url: `${SITE_URL}/games/${data.slug}`,
      genre: Array.isArray(data.genres) ? data.genres : [],
      gamePlatform: Array.isArray(data.platforms) ? data.platforms : [],
      operatingSystem: Array.isArray(data.platforms) ? (data.platforms as string[]).join(', ') : undefined,
      applicationCategory: 'Game',
      author: data.developer ? [{ '@type': 'Organization', name: data.developer }] : undefined,
      publisher: data.publisher ? [{ '@type': 'Organization', name: data.publisher }] : undefined,
      datePublished: data.releaseDate ?? undefined,
      aggregateRating: data.metacritic && data.ratingsCount && (data.ratingsCount as number) > 0 ? {
        '@type': 'AggregateRating',
        ratingValue: data.metacritic,
        bestRating: 100,
        worstRating: 0,
        ratingCount: data.ratingsCount,
        reviewCount: data.ratingsCount,
      } : undefined,
      contentRating: data.esrbRating ?? undefined,
    };

    case 'Organization': return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        '@id': `${SITE_URL}/#logo`,
        url: `${SITE_URL}/logo.png`,
        width: 600,
        height: 60,
        caption: SITE_NAME,
      },
      sameAs: [
        data.twitter ?? undefined,
        data.youtube ?? undefined,
        data.discord ?? undefined,
      ].filter(Boolean),
    };

    case 'WebSite': return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: data.description ?? undefined,
      publisher: { '@id': `${SITE_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    };

    /**
     * HowTo — used for mod guide pages.
     * data.steps = Array<{ name: string; text?: string }> built from guide section headings.
     * Note: If steps are empty, the call site falls back to passing type="Article" instead.
     */
    case 'HowTo': return {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      '@id': `${data.url}#howto`,
      name: data.title,
      description: data.description,
      image: data.image ? {
        '@type': 'ImageObject',
        url: data.image,
        width: 1200,
        height: 630,
      } : undefined,
      datePublished: data.datePublished,
      dateModified: data.dateModified ?? data.datePublished,
      inLanguage: 'en-US',
      author: {
        '@type': 'Person',
        name: data.authorName,
        url: data.authorUrl ? `${SITE_URL}${data.authorUrl}` : undefined,
      },
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png`, width: 600, height: 60 },
      },
      step: Array.isArray(data.steps) && (data.steps as any[]).length > 0
        ? (data.steps as Array<{ name: string; text?: string }>).map((s, i) => ({
            '@type': 'HowToStep',
            position: i + 1,
            name: s.name,
            text: s.text ?? s.name,
          }))
        : undefined,
      tool: data.tool ?? undefined,
      supply: data.supply ?? undefined,
    };

    case 'VideoObject': return {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: data.name,
      description: data.description,
      thumbnailUrl: data.thumbnailUrl ?? undefined,
      uploadDate: data.uploadDate,
      duration: typeof data.duration === 'number' ? `PT${Math.round(data.duration as number)}S` : undefined,
      contentUrl: data.contentUrl ?? undefined,
      embedUrl: data.embedUrl ?? undefined,
    };

    // Pass-through cases — these types are included in the union for callsite
    // type-safety but are typically embedded inside other schemas rather than
    // emitted as standalone <script> tags.
    case 'Person':
    case 'AggregateRating':
    case 'WebPage':
    case 'SearchAction':
      return { '@context': 'https://schema.org', '@type': type, ...data };
  }
}

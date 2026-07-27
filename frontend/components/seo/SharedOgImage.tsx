import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';
export const alt = 'Article preview';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function SharedOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let article: any = null;
  try {
    const res = await fetch(
      `${process.env.BACKEND_URL ?? 'http://localhost:3001'}/api/posts/${slug}`,
      { next: { revalidate: 3600 } }
    );
    if (res.ok) article = (await res.json()).data;
  } catch {}

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
        background: '#0d1117', color: 'white', fontFamily: 'system-ui, sans-serif',
        padding: 60, position: 'relative' }}>
        {article?.featuredImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={article.featuredImageUrl}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', opacity: 0.22 }} alt="" />
        )}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column',
          justifyContent: 'flex-end', height: '100%', gap: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#a3e635',
            textTransform: 'uppercase', letterSpacing: '0.12em', display: 'flex' }}>
            {(article?.contentType ?? 'Article').replace(/_/g, ' ')}
          </div>
          <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.1,
            color: 'white', maxWidth: 950, display: 'flex' }}>
            {article?.title ?? 'TheCoreGamer'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 16, color: 'rgba(255,255,255,0.55)' }}>
            <span style={{ display: 'flex' }}>TheCoreGamer</span>
            {article?.author?.displayName && (
              <>
                <span style={{ display: 'flex' }}>·</span>
                <span style={{ display: 'flex' }}>{article.author.displayName}</span>
              </>
            )}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

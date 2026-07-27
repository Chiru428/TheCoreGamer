import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const CONTENT_TYPE_COLORS: Record<string, string> = {
  NEWS: '#e11d48',
  REVIEW: '#7b5cfa',
  MOD_GUIDE: '#3b82f6',
  WALKTHROUGH: '#f59e0b',
  OPINION: '#d4386e',
  DEAL: '#06b6d4',
  GAME: '#3b82f6',
};

async function loadGoogleFont(text: string, weight: 400 | 700) {
  const url = `https://fonts.googleapis.com/css2?family=Inter:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const match = css.match(/src: url\(([^)]+)\) format\('(?:opentype|truetype|woff)'\)/);
  if (match) {
    const fontResponse = await fetch(match[1]);
    if (fontResponse.ok) return await fontResponse.arrayBuffer();
  }
  throw new Error('Failed to load Inter font');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const title = searchParams.get('title') || 'TheCoreGamer';
  const type = (searchParams.get('type') || 'NEWS').toUpperCase();
  const authorName = searchParams.get('authorName') || '';
  const authorAvatarUrl = searchParams.get('authorAvatarUrl') || '';
  const scoreParam = searchParams.get('score');
  const score = scoreParam ? Number(scoreParam) : null;
  const featuredImageUrl = searchParams.get('featuredImageUrl') || '';
  const gameCoverUrl = searchParams.get('gameCoverUrl') || '';

  const badgeColor = CONTENT_TYPE_COLORS[type] || CONTENT_TYPE_COLORS.NEWS;
  const sideImage = gameCoverUrl || featuredImageUrl;
  const isGameCover = !!gameCoverUrl;

  const fontText = `TheCoreGamer${title}${authorName}${type}${score != null ? score.toFixed(1) : ''}`;

  const [interRegular, interBold] = await Promise.all([
    loadGoogleFont(fontText, 400),
    loadGoogleFont(fontText, 700),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          position: 'relative',
          backgroundColor: '#0f0f0f',
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 2px)',
          fontFamily: 'Inter',
        }}
      >
        {/* Side image (featured image or game cover) */}
        {sideImage && (
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              top: 0,
              right: 0,
              width: '480px',
              height: '630px',
              overflow: 'hidden',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sideImage}
              alt=""
              width={480}
              height={630}
              style={{
                width: '480px',
                height: '630px',
                objectFit: 'cover',
                ...(isGameCover ? {} : { filter: 'blur(6px)', transform: 'scale(1.05)' }),
              }}
            />
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '480px',
                height: '630px',
                background:
                  'linear-gradient(to right, #0f0f0f 0%, rgba(15,15,15,0) 35%)',
              }}
            />
          </div>
        )}

        {/* Wordmark — top left */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            position: 'absolute',
            top: '40px',
            left: '40px',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              fontSize: '20px',
              fontWeight: 700,
            }}
          >
            TCG
          </div>
          <div style={{ display: 'flex', color: '#ffffff', fontSize: '20px', fontWeight: 700 }}>
            TheCoreGamer
          </div>
        </div>

        {/* Content type badge — top right */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: '40px',
            right: '40px',
            padding: '4px 12px',
            backgroundColor: badgeColor,
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 700,
            textTransform: 'uppercase',
            borderRadius: '4px',
            letterSpacing: '0.05em',
          }}
        >
          {type.replace('_', ' ')}
        </div>

        {/* Title + author — lower left */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            position: 'absolute',
            left: '48px',
            bottom: '48px',
            width: sideImage ? '620px' : score != null ? '980px' : '1104px',
            gap: '16px',
          }}
        >
          <div
            style={{
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              overflow: 'hidden',
              color: '#ffffff',
              fontSize: '52px',
              fontWeight: 700,
              lineHeight: 1.2,
              wordBreak: 'break-word',
            }}
          >
            {title}
          </div>
          {authorName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#999999', fontSize: '18px', fontWeight: 400 }}>
              {authorAvatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={authorAvatarUrl}
                  alt=""
                  width={32}
                  height={32}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                />
              )}
              <div style={{ display: 'flex' }}>By {authorName}</div>
            </div>
          )}
        </div>

        {/* Score badge — bottom right */}
        {score != null && !Number.isNaN(score) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              bottom: '40px',
              right: '40px',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              fontSize: '44px',
              fontWeight: 700,
            }}
          >
            {score.toFixed(1)}
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter', data: interRegular, weight: 400, style: 'normal' },
        { name: 'Inter', data: interBold, weight: 700, style: 'normal' },
      ],
    }
  );
}

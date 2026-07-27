import { NextResponse } from 'next/server';
import { SITE_URL } from '@/lib/constants';
import { 
  fetchAdminSeries, 
  fetchAdminPosts, 
  fetchGames, 
  fetchTags, 
  fetchVideos 
} from '@/lib/api';

const staticPages = [
  '', '/articles', '/reviews', '/mod-guides', '/walkthroughs', '/games',
  '/news', '/deals', '/opinions', '/features', '/lists', '/about', '/contact',
  '/advertise', '/privacy', '/terms', '/dmca', '/affiliate-disclosure', '/search',
  '/review-policy', '/corrections', '/videos',
  '/platforms', '/genres', '/series',
  '/platforms/ps5', '/platforms/xbox-series-x', '/platforms/nintendo-switch',
  '/platforms/pc', '/platforms/ios', '/platforms/android'
];

const rssFeeds = [
  '/rss.xml', '/rss/reviews.xml', '/rss/news.xml', '/rss/deals.xml', '/rss/guides.xml', '/rss/features.xml',
];

function getArticlePrefix(contentType: string) {
  switch (contentType) {
    case 'NEWS': return '/news';
    case 'REVIEW': return '/reviews';
    case 'MOD_GUIDE': return '/mod-guides';
    case 'WALKTHROUGH': return '/walkthroughs';
    case 'OPINION': return '/opinions';
    case 'DEAL': return '/deals';
    case 'FEATURE': return '/features';
    case 'LISTICLE': return '/lists';
    default: return '/articles';
  }
}

export async function GET() {
  const allUrls: any[] = [];

  // 1. Static Pages
  staticPages.forEach(p => {
    allUrls.push({
      url: `${SITE_URL}${p}`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly',
      priority: p === '' ? '1.0' : p === '/search' ? '0.5' : '0.8',
    });
  });

  // 2. RSS Feeds
  rssFeeds.forEach(p => {
    allUrls.push({
      url: `${SITE_URL}${p}`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'hourly',
      priority: '0.3',
    });
  });

  // 3. Dynamic Content
  try {
    // Fetch all content in parallel to keep generation fast
    const [seriesRes, postsRes, gamesRes, tagsRes, videosRes] = await Promise.allSettled([
      fetchAdminSeries(),
      fetchAdminPosts({ limit: 5000 }), // Get up to 5000 posts
      fetchGames({ limit: 5000 }),      // Get up to 5000 games
      fetchTags(),
      fetchVideos() 
    ]);

    // Series
    if (seriesRes.status === 'fulfilled' && seriesRes.value.success && seriesRes.value.data) {
      seriesRes.value.data
        .filter((s: any) => s.articleCount > 0)
        .forEach((s: any) => {
          allUrls.push({
            url: `${SITE_URL}/series/${s.slug}`,
            lastModified: new Date().toISOString(),
            changeFrequency: 'weekly',
            priority: '0.7',
          });
        });
    }

    // Articles / Posts
    if (postsRes.status === 'fulfilled' && postsRes.value.success && postsRes.value.data) {
      postsRes.value.data.forEach((p: any) => {
        // Only include published articles in the public sitemap
        if (p.status !== 'PUBLISHED') return;
        
        const prefix = getArticlePrefix(p.contentType);
        allUrls.push({
          url: `${SITE_URL}${prefix}/${p.slug}`,
          lastModified: new Date(p.updatedAt || p.publishedAt || Date.now()).toISOString(),
          changeFrequency: 'weekly',
          priority: '0.8',
        });
      });
    }

    // Games
    if (gamesRes.status === 'fulfilled' && gamesRes.value.success && gamesRes.value.data) {
      gamesRes.value.data.forEach((g: any) => {
        allUrls.push({
          url: `${SITE_URL}/games/${g.slug}`,
          lastModified: new Date(g.updatedAt || Date.now()).toISOString(),
          changeFrequency: 'weekly',
          priority: '0.8',
        });
      });
    }

    // Tags
    if (tagsRes.status === 'fulfilled' && tagsRes.value.success && tagsRes.value.data) {
      tagsRes.value.data.forEach((t: any) => {
        allUrls.push({
          url: `${SITE_URL}/tags/${t.slug}`,
          lastModified: new Date().toISOString(),
          changeFrequency: 'monthly',
          priority: '0.5',
        });
      });
    }

    // Videos
    if (videosRes.status === 'fulfilled' && videosRes.value.success && videosRes.value.data) {
      videosRes.value.data.forEach((v: any) => {
        allUrls.push({
          url: `${SITE_URL}/videos/${v.id}`,
          lastModified: new Date(v.createdAt || Date.now()).toISOString(),
          changeFrequency: 'monthly',
          priority: '0.6',
        });
      });
    }

  } catch (e) {
    console.error("Error generating dynamic sitemap urls:", e);
  }

  // Generate XML
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(url => `  <url>
    <loc>${url.url}</loc>
    <lastmod>${url.lastModified}</lastmod>
    <changefreq>${url.changeFrequency}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new NextResponse(sitemapXml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate',
    },
  });
}

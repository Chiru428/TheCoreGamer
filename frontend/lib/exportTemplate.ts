import { contentTypePath } from '@/lib/seo';

export function generateExportHtml(data: any): string {
  const css = `
    body {
      font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f9fafb;
      max-width: 1000px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    h1 {
      color: #111;
      padding-bottom: 10px;
    }
    h2 {
      color: #4b5563;
      margin-top: 40px;
      padding-bottom: 5px;
    }
    .card {
      background: white;
      border: 1px solid #9ca3af;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      background: white;
    }
    th, td {
      border: 1px solid #9ca3af;
      padding: 16px 12px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background-color: #f3f4f6;
      font-weight: 600;
      color: #374151;
    }
    td {
      color: #4b5563;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    a {
      color: #3b82f6;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .meta {
      font-size: 0.9em;
      color: #6b7280;
      margin-bottom: 30px;
    }
    .empty {
      color: #9ca3af;
      font-style: italic;
    }
  `;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://thecoregamer.com';

  const renderArticleLink = (article: any) => {
    if (!article) return '<span class="empty">N/A</span>';
    const path = contentTypePath(article.contentType);
    return `<a href="${baseUrl}/${path}/${article.slug}" target="_blank">${article.title}</a>`;
  };

  const renderGameLink = (game: any) => {
    if (!game) return '<span class="empty">N/A</span>';
    return `<a href="${baseUrl}/games/${game.slug}" target="_blank">${game.title}</a>`;
  };

  const generateTable = (items: any[], columns: { label: string; width?: string; render: (val: any) => string }[]) => {
    if (!items || items.length === 0) return '<p class="empty">No records found.</p>';
    
    let html = '<table><thead><tr>';
    columns.forEach(col => { 
      html += `<th${col.width ? ` style="width: ${col.width};"` : ''}>${col.label}</th>`; 
    });
    html += '</tr></thead><tbody>';
    
    items.forEach(item => {
      html += '<tr>';
      columns.forEach(col => { html += `<td>${col.render(item)}</td>`; });
      html += '</tr>';
    });
    
    html += '</tbody></table>';
    return html;
  };

  const profile = data.profile || {};
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Data Export - The Core Gamer</title>
  <style>${css}</style>
</head>
<body>
  <h1>Your Data Export</h1>
  <p class="meta">Exported on ${formatDate(data.exportedAt)}</p>

  <h2>Profile Information</h2>
  <div class="card">
    <p><strong>Username:</strong> ${profile.username || 'N/A'}</p>
    <p><strong>Display Name:</strong> ${profile.displayName || 'N/A'}</p>
    <p><strong>Email:</strong> ${profile.email || 'N/A'}</p>
    <p><strong>Role:</strong> ${profile.role || 'N/A'}</p>
    <p><strong>Joined:</strong> ${formatDate(profile.createdAt)}</p>
    <p><strong>Last Login:</strong> ${formatDate(profile.lastLoginAt)}</p>
    <p><strong>Bio:</strong> <br>${profile.bio || '<span class="empty">No bio provided</span>'}</p>
  </div>

  <h2>Comments</h2>
  ${generateTable(data.comments, [
    { label: 'Date', width: '150px', render: (c) => formatDate(c.createdAt) },
    { label: 'Comment', render: (c) => c.body },
    { label: 'Article', width: '250px', render: (c) => renderArticleLink(c.Article) }
  ])}

  <h2>Reviews & Ratings</h2>
  ${generateTable(data.ratings, [
    { label: 'Date', width: '150px', render: (r) => formatDate(r.createdAt) },
    { label: 'Score', width: '80px', render: (r) => r.score || 'N/A' },
    { label: 'Review', render: (r) => r.body || '<span class="empty">No text</span>' },
    { label: 'Game', width: '250px', render: (r) => renderGameLink(r.Game) }
  ])}

  <h2>Bookmarks</h2>
  ${generateTable(data.bookmarks, [
    { label: 'Date Bookmarked', render: (b) => formatDate(b.createdAt) },
    { label: 'Article', render: (b) => renderArticleLink(b.Article) }
  ])}

  <h2>Reading Lists</h2>
  ${generateTable(data.readingLists, [
    { label: 'Created', render: (l) => formatDate(l.createdAt) },
    { label: 'Name', render: (l) => l.name },
    { label: 'Description', render: (l) => l.description || 'N/A' },
    { label: 'Public', render: (l) => l.isPublic ? 'Yes' : 'No' },
    { label: 'Items Count', render: (l) => l.Items?.length || 0 }
  ])}

  <h2>Article Reactions</h2>
  ${generateTable(data.reactions, [
    { label: 'Date', render: (r) => formatDate(r.createdAt) },
    { label: 'Type', render: (r) => r.type },
    { label: 'Article', render: (r) => renderArticleLink(r.Article) }
  ])}
  
  ${data.articlesAuthored && data.articlesAuthored.length > 0 ? `
  <h2>Authored Articles</h2>
  ${generateTable(data.articlesAuthored, [
    { label: 'Date', render: (a) => formatDate(a.createdAt) },
    { label: 'Title', render: (a) => `<a href="${baseUrl}/${contentTypePath(a.contentType)}/${a.slug}" target="_blank">${a.title}</a>` },
    { label: 'Status', render: (a) => a.status }
  ])}
  ` : ''}

</body>
</html>`;
}

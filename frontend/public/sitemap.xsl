<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>XML Sitemap Index</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #1f2937; margin: 0; padding: 2rem; }
          #header { background: #111827; color: white; padding: 2.5rem 2rem; border-radius: 8px 8px 0 0; }
          #header h1 { margin: 0 0 0.5rem 0; font-size: 1.75rem; font-weight: 700; letter-spacing: -0.025em; }
          #header p { margin: 0; color: #9ca3af; font-size: 0.95rem; }
          .stats { display: inline-block; background: #374151; color: #e5e7eb; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; margin-top: 1.5rem; }
          table { width: 100%; border-collapse: collapse; background: white; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
          th, td { padding: 1rem 1.5rem; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
          th { font-size: 0.75rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
          tr:hover { background-color: #f9fafb; }
          tr:last-child td { border-bottom: none; }
          a { color: #2563eb; text-decoration: none; font-weight: 500; word-break: break-word; }
          a:hover { text-decoration: underline; color: #1d4ed8; }
          .container { max-width: 1280px; margin: 0 auto; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-radius: 8px; background: white; }
          .table-wrapper { overflow-x: auto; width: 100%; border-radius: 0 0 8px 8px; }
          @media (max-width: 768px) {
            body { padding: 1rem; }
            #header { padding: 1.5rem 1rem; }
            th, td { padding: 0.75rem 1rem; }
          }
          .date { color: #6b7280; font-variant-numeric: tabular-nums; }
          .priority { display: inline-flex; align-items: center; justify-content: center; background: #f3f4f6; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; color: #4b5563; font-weight: 600;}
          .serial { width: 30px; color: #9ca3af; font-variant-numeric: tabular-nums; text-align: center; padding-left: 0.5rem !important; padding-right: 0.5rem !important; }
          .serial-header { width: 30px; text-align: center; padding-left: 0.5rem !important; padding-right: 0.5rem !important; }
        </style>
      </head>
      <body>
        <div class="container">
          <div id="header">
            <h1>XML Sitemap Index</h1>
            <p>This XML sitemap is generated for search engine consumption. It lists all available URLs.</p>
            <div class="stats"><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/> URLs in this sitemap</div>
          </div>
          <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th class="serial-header">#</th>
                <th>Sitemap URL</th>
                <th>Priority</th>
                <th>Last Modified</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <tr>
                  <td class="serial"><xsl:value-of select="position()"/></td>
                  <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
                  <td><span class="priority"><xsl:value-of select="sitemap:priority"/></span></td>
                  <td class="date">
                    <xsl:value-of select="substring(sitemap:lastmod, 1, 10)"/>
                    <xsl:text> </xsl:text>
                    <xsl:value-of select="substring(sitemap:lastmod, 12, 5)"/>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>

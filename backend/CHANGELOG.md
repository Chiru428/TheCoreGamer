# Changelog

## [1.0.0]

### Security
- CSRF protection on all state-mutating API routes (origin/referer validation, SameSite session cookies)
- Rate limiting on admin routes and two-factor authentication endpoints
- Hardened admin route access control and IP allowlisting
- HSTS security headers
- Fixed a database connection pool exhaustion issue under load

### Content & Community
- Community voting and Steam sign-in for mod guides
- User screenshot submissions with an admin moderation queue
- Public author profile pages
- Walkthroughs listing page and admin management section
- Notification bell, notification inbox, and esports team/tournament pages
- Affiliate click tracking

### Search & Discovery
- Dedicated full-text search results page, backed by a database index for performance
- Multi-entity autocomplete covering articles, games, tags, and mods

### Monetization & Compliance
- Ad slot configuration and publisher ID wiring
- Sponsored content disclosure labelling
- GDPR cookie consent banner
- Editorial policy pages

### Platform & Infrastructure
- Background job workers (email, deals, newsletters, push, search indexing) split into an independent process from the web server
- Fixed unbounded growth of price-snapshot data in the deals worker
- Added a test suite covering search, homepage, deals worker, and newsletter flows
- HTML email templates for transactional email
- Tag description and color fields
- Videos listing page with embedded video player
- Sitemap pagination fix

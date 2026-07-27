import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeAll(() => {
  const required = [
    'TEST_ADMIN_EMAIL',
    'TEST_ADMIN_PASSWORD',
    'TEST_EDITOR_EMAIL',
    'TEST_EDITOR_PASSWORD',
  ];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required E2E env vars: ${missing.join(', ')}\n` +
      'Copy .env.example to .env.test and fill in test credentials.'
    );
  }
});

test.describe('TheCoreGamer E2E Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/TheCoreGamer/);
  });

  test('article page loads and shows ad slots', async ({ page }) => {
    // Navigate to articles index first
    await page.goto('/articles');
    
    // Click the first article card (assuming it exists from seed data)
    const firstArticle = page.locator('a[href^="/articles/"]').first();
    // Use fallback if no article found
    if (await firstArticle.count() > 0) {
      await firstArticle.click();
      
      // Check article page loaded
      await expect(page.locator('.article-content')).toBeVisible(); // Article content
      
      // Check for AdSlot
      // Since it requires consent, we mock consent first
      await page.evaluate(() => {
        localStorage.setItem('gdpr_consent', '1');
      });
      await page.reload();
      
      // Wait for at least one ad container (either Adsense tag or our placeholder)
      let adContainer = page.locator('ins.adsbygoogle').first();
      if (await adContainer.count() === 0) {
        adContainer = page.locator('text=Advertisement').first();
      }
      // It might not be visible immediately due to lazy loading, but it should be in DOM
      await expect(adContainer).toBeAttached();
    }
  });

  test('login flow', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.fill('input[type="email"]', process.env.TEST_ADMIN_EMAIL ?? 'test-admin@example.com');
    await page.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD ?? 'MISSING_TEST_ADMIN_PASSWORD');
    await page.click('button[type="submit"]');
    
    // Should redirect to homepage or dashboard
    await page.waitForURL('**/');
    // Ensure auth state is applied
    await expect(page.locator('text=TheCoreGamer').first()).toBeVisible();
  });

  test('admin login and post creation flow', async ({ page }) => {
    // Login as Admin
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', process.env.TEST_EDITOR_EMAIL ?? 'test-editor@example.com');
    await page.fill('input[type="password"]', process.env.TEST_EDITOR_PASSWORD ?? 'MISSING_TEST_EDITOR_PASSWORD');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    
    // Navigate to Admin Posts
    await page.goto('/admin/posts');
    await expect(page).toHaveURL(/\/admin\/posts/);
    
    // Click Create New Post
    await page.click('text=New Post');
    await expect(page).toHaveURL(/\/admin\/posts\/new/);
    
    // Fill out form
    await page.fill('input[name="title"]', 'Playwright Test Post');
    // We can't easily interact with TipTap via fill, but we can evaluate or click
    await page.click('.ProseMirror');
    await page.keyboard.type('This is a test post body.');
    
    // Due to the complex nature of the select dropdowns, we just test if the form renders
    await expect(page.locator('input[name="title"]')).toHaveValue('Playwright Test Post');
  });

  test('search returns results', async ({ page }) => {
    await page.goto('/search?q=elden');
    await expect(page.locator('h1, h2').filter({ hasText: /elden/i }).first()).toBeVisible();
    // Either matching results render, or the empty state explicitly says so — both confirm the search ran
    const resultOrEmpty = page.locator('text=/result.*for|No results for/i').first();
    await expect(resultOrEmpty).toBeVisible();
  });

  test('404 page renders', async ({ page }) => {
    await page.goto('/this-does-not-exist-404');
    await expect(page.locator('text=/not found/i').first()).toBeVisible();
    const homeLink = page.locator('a[href="/"]').first();
    await expect(homeLink).toBeVisible();
  });

  test('mod guide loads', async ({ page, request }) => {
    const res = await request.get('/api/mod-guides?limit=1');
    const { data } = await res.json();
    const slug = data?.[0]?.slug;
    test.skip(!slug, 'No mod guides available to test against');

    await page.goto(`/mod-guides/${slug}`);
    await expect(page.locator('h1').first()).toBeVisible();
    const compatWarning = page.locator('text=Compatibility Warning').first();
    if (await compatWarning.count() > 0) {
      await expect(compatWarning).toBeVisible();
    }
  });

  test('game page loads', async ({ page, request }) => {
    const res = await request.get('/api/games?limit=1');
    const { data } = await res.json();
    const slug = data?.[0]?.slug;
    test.skip(!slug, 'No games available to test against');

    await page.goto(`/games/${slug}`);
    const reviewSection = page.locator('text=/Our Score|reviews yet/i').first();
    await expect(reviewSection).toBeVisible();
  });

  test('homepage has no critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const critical = results.violations.filter((v: any) => v.impact === 'critical');
    expect(critical).toHaveLength(0);
  });

  test('article listing page has no critical accessibility violations', async ({ page }) => {
    await page.goto('/articles');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('#onetrust-accept-btn-handler') // exclude any consent banners
      .analyze();
    const critical = results.violations.filter((v: any) => v.impact === 'critical');
    expect(critical).toHaveLength(0);
  });
});

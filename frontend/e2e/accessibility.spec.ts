import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const CRITICAL_PAGES = [
  '/',
  '/games',
  '/reviews',
  '/news',
  '/deals',
  '/auth/login',
  '/auth/register',
];

for (const path of CRITICAL_PAGES) {
  test(`accessibility: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('[data-cookie-banner]')   // exclude cookie consent UI
      .exclude('ins.adsbygoogle')        // exclude third-party ad iframes
      .analyze();

    const violations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (violations.length > 0) {
      const summary = violations.map((v) =>
        `[${v.impact}] ${v.id}: ${v.description}\n  Nodes: ${v.nodes.map((n) => n.html).join('\n  ')}`
      ).join('\n\n');
      expect.soft(violations, `Accessibility violations on ${path}:\n\n${summary}`).toHaveLength(0);
    }

    expect(violations).toHaveLength(0);
  });
}

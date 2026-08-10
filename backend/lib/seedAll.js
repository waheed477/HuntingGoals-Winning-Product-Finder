/**
 * Seed runner — intentionally empty.
 *
 * The database starts clean so only real scraped Facebook Ad Library data
 * appears in the UI. No dummy products, ads, or suppliers are inserted.
 *
 * To populate data:
 *   1. Add FB_SESSION_COOKIE to Replit Secrets (see AdSpy page for setup guide)
 *   2. Restart the Socket Server workflow — it runs the scheduler every 6 hours
 *   3. Or click "Scrape Now" on the Ad Spy page to trigger an immediate scrape
 */
export async function seedAll() {
  // Intentionally empty — no seeding in production mode
}

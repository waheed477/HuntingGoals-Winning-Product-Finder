/**
 * Chromium / Puppeteer environment resolution.
 *
 * Resolution order for the browser executable:
 *   1. PUPPETEER_EXECUTABLE_PATH  (set in the Render/Docker environment)
 *   2. CHROMIUM_PATH              (legacy override, still honored)
 *   3. Well-known system locations (Debian/Alpine docker images)
 *   4. undefined → let Puppeteer use its own downloaded Chrome binary
 *      (local dev default, downloaded by `npm install` unless skipped)
 */

import { existsSync } from 'fs';

const SYSTEM_CHROMIUM_PATHS = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
];

export function getChromiumExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.env.CHROMIUM_PATH && existsSync(process.env.CHROMIUM_PATH)) {
    return process.env.CHROMIUM_PATH;
  }
  for (const p of SYSTEM_CHROMIUM_PATHS) {
    if (existsSync(p)) return p;
  }
  return undefined; // Puppeteer falls back to its bundled binary
}

/**
 * Launch args required when Chromium runs as root inside a container.
 * Shared by every scraper so they all behave identically.
 * The tail entries trim RAM/CPU overhead — meaningful on a 512 MB instance.
 */
export const PUPPETEER_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-extensions',
  '--disable-background-networking',
  '--no-first-run',
  '--mute-audio',
  '--metrics-recording-only',
];

/** Options spread into puppeteer.launch() at each call site. */
export function getPuppeteerLaunchOptions(extraArgs = []) {
  const executablePath = getChromiumExecutablePath();
  return {
    headless: 'new',
    args: [...PUPPETEER_LAUNCH_ARGS, ...extraArgs],
    ...(executablePath ? { executablePath } : {}),
  };
}

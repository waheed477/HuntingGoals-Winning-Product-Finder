/**
 * Proxy service for rotating IPs during scraping.
 *
 * TODO (Phase 5): Implement real proxy rotation.
 * Options to consider:
 *   - Rotating residential proxies via BrightData / Oxylabs / SmartProxy
 *   - Free proxy lists (less reliable, suitable for dev only)
 *   - Tor network (SOCKS5 proxy on localhost:9050)
 *
 * The getProxy() function should return an object compatible with
 * axios's `proxy` config or puppeteer's `--proxy-server` arg:
 *   { host: '1.2.3.4', port: 8080, auth: { username, password } }
 */

let proxyPool = [];
let proxyIndex = 0;

/**
 * Load proxy pool from environment variable.
 * Expected format: comma-separated "host:port:user:pass" strings.
 * e.g. PROXY_LIST="1.2.3.4:8080:user:pass,5.6.7.8:3128:user2:pass2"
 */
function loadProxyPool() {
  const raw = process.env.PROXY_LIST;
  if (!raw) return [];
  return raw.split(',').map((entry) => {
    const [host, port, username, password] = entry.trim().split(':');
    return { host, port: parseInt(port, 10), auth: { username, password } };
  });
}

/**
 * Returns the next proxy from the pool (round-robin), or null if none configured.
 * @returns {{ host: string, port: number, auth: { username: string, password: string } } | null}
 */
export function getProxy() {
  // TODO (Phase 5): Replace with live proxy pool logic
  if (proxyPool.length === 0) {
    proxyPool = loadProxyPool();
  }
  if (proxyPool.length === 0) return null;

  const proxy = proxyPool[proxyIndex % proxyPool.length];
  proxyIndex++;
  return proxy;
}

export default getProxy;

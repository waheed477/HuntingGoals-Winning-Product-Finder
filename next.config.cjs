/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: [
      'mongoose',
      'bcryptjs',
      'slugify',
      'mongodb-memory-server',
      'mongodb-memory-server-core',
      'cheerio',
      'axios',
      'puppeteer',
      'puppeteer-extra',
      'puppeteer-extra-plugin-stealth',
      'puppeteer-extra-plugin',
      'merge-deep',
      'clone-deep',
      'google-trends-api',
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      const CJS_EXTERNALS = [
        'mongoose', 'bcryptjs', 'slugify',
        'mongodb-memory-server', 'mongodb-memory-server-core',
        'cheerio', 'axios', 'puppeteer',
        'puppeteer-extra', 'puppeteer-extra-plugin', 'puppeteer-extra-plugin-stealth',
        'merge-deep', 'clone-deep',
        'google-trends-api',
      ];

      const existing = Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean);

      config.externals = [
        ...existing,
        ({ request }, callback) => {
          if (CJS_EXTERNALS.some((pkg) => request === pkg || request.startsWith(pkg + '/'))) {
            return callback(null, 'commonjs ' + request);
          }
          callback();
        },
      ];

      // Suppress "Cannot statically analyse 'require(…, …)'" warnings from CJS
      // dependencies (e.g. clone-deep) that puppeteer-extra pulls in transitively.
      config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        { message: /Cannot statically analyse/ },
      ];
    }
    return config;
  },
};

module.exports = nextConfig;

import axios from 'axios';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://huntinggoals.replit.app';

function normalisePhone(phoneNumber) {
  let digits = phoneNumber.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '92' + digits.slice(1);
  if (!digits.startsWith('92')) digits = '92' + digits;
  return digits + '@c.us';
}

function buildUrl(path) {
  const instanceId = process.env.GREEN_API_INSTANCE_ID;
  const token      = process.env.GREEN_API_TOKEN;
  return `https://api.green-api.com/waInstance${instanceId}/${path}/${token}`;
}

function assertCredentials() {
  const instanceId = process.env.GREEN_API_INSTANCE_ID;
  const token      = process.env.GREEN_API_TOKEN;
  if (!instanceId || !token) {
    throw new Error(
      'GREEN_API_INSTANCE_ID and GREEN_API_TOKEN are required. Add them in Replit Secrets.'
    );
  }
}

function formatProductMessage(product) {
  const priceRange =
    product.priceMin === product.priceMax
      ? `Rs. ${product.priceMin?.toLocaleString('en-PK') ?? product.priceMin}`
      : `Rs. ${product.priceMin?.toLocaleString('en-PK') ?? product.priceMin} - Rs. ${product.priceMax?.toLocaleString('en-PK') ?? product.priceMax}`;

  const cities     = Array.isArray(product.cities) ? product.cities.join(', ') : product.cities || 'All Cities';
  const platforms  = Array.isArray(product.platforms) && product.platforms.length
    ? product.platforms.join(', ')
    : 'Facebook / Instagram';

  const adLine = product.directUrl ? `🔗 *View Ad:* ${product.directUrl}` : '';
  const aiLine = product.aiSummary  ? `\n💡 *AI Insight:* ${product.aiSummary}` : '';

  return (
    `🚀 *Hunting Goals Alert!*\n\n` +
    `*Product:* ${product.name}\n` +
    `*Win Score:* ${product.winScore}/100 ⭐\n` +
    `*City:* ${cities}\n` +
    `*Category:* ${product.category || 'N/A'}\n` +
    `*Price:* ${priceRange}\n` +
    `*Platforms:* ${platforms}\n\n` +
    `📊 *Ad Signals:*\n` +
    `• ${product.advertiserCount ?? 0} advertisers\n` +
    `• ${product.totalAds ?? 0} total ads\n` +
    `• ${product.maxDaysRunning ?? 0} days running\n\n` +
    (adLine ? adLine + '\n' : '') +
    `📋 *Full Report:* ${FRONTEND_URL}/products/${product.slug}` +
    aiLine
  );
}

export async function sendWhatsAppRaw(phoneNumber, message) {
  assertCredentials();

  const chatId   = normalisePhone(phoneNumber);
  const url      = buildUrl('sendMessage');
  const response = await axios.post(
    url,
    { chatId, message },
    { headers: { 'Content-Type': 'application/json' }, timeout: 12000 }
  );

  console.log(`[WhatsApp] Raw message → ${phoneNumber} | idMessage: ${response.data?.idMessage}`);
  return response.data;
}

export async function sendWhatsAppAlert(phoneNumber, product) {
  assertCredentials();

  const chatId   = normalisePhone(phoneNumber);
  const message  = formatProductMessage(product);
  const url      = buildUrl('sendMessage');
  const response = await axios.post(
    url,
    { chatId, message },
    { headers: { 'Content-Type': 'application/json' }, timeout: 12000 }
  );

  console.log(`[WhatsApp] Alert "${product.name}" → ${phoneNumber} | idMessage: ${response.data?.idMessage}`);
  return response.data;
}

export async function getWhatsAppStatus() {
  assertCredentials();
  const response = await axios.get(buildUrl('getStateInstance'), { timeout: 8000 });
  return response.data;
}

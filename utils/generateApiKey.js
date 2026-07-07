import crypto from 'crypto';

export function generateApiKey() {
  return `trndspy_live_${crypto.randomBytes(24).toString('hex')}`;
}

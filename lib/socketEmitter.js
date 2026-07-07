/**
 * Socket Emitter
 * Sends events from the Next.js process to the standalone Socket.io server
 * via its internal HTTP API. This avoids the need to share a process boundary.
 */

import axios from 'axios';

const SOCKET_BASE_URL = process.env.SOCKET_INTERNAL_URL || 'http://localhost:3002';
const SOCKET_SECRET   = process.env.SOCKET_INTERNAL_SECRET || 'trendspy-socket-internal';

async function emitInternal({ event, data, userId = null, productId = null }) {
  try {
    await axios.post(
      `${SOCKET_BASE_URL}/internal/emit`,
      { event, data, userId, productId },
      {
        headers: { 'x-internal-secret': SOCKET_SECRET },
        timeout: 3000,
      }
    );
  } catch (err) {
    // Socket server may not be running — degrade gracefully, never block the caller
    if (err.code !== 'ECONNREFUSED') {
      console.warn(`[SocketEmitter] Failed to emit "${event}":`, err.message);
    }
  }
}

/**
 * Broadcast a new winning product to all connected clients.
 * @param {Object} product - Mongoose product document or plain object
 */
export async function emitNewWinningProduct(product) {
  await emitInternal({
    event: 'newWinningProduct',
    data: {
      product: {
        _id:      product._id,
        name:     product.name,
        slug:     product.slug,
        category: product.category,
        winScore: product.winScore,
        cities:   product.cities,
        priceMin: product.priceMin,
        priceMax: product.priceMax,
        imageUrl: product.imageUrl,
        trend:    product.trend,
      },
    },
  });
}

/**
 * Broadcast a product score change to subscribers of that product.
 * @param {Object} product
 * @param {number} oldScore
 */
export async function emitScoreUpdate(product, oldScore) {
  await emitInternal({
    event:     'scoreUpdated',
    productId: product._id?.toString(),
    data: {
      productId: product._id,
      name:      product.name,
      slug:      product.slug,
      oldScore,
      newScore:  product.winScore,
      delta:     product.winScore - oldScore,
    },
  });
}

/**
 * Notify a specific user that their personal alert was triggered.
 * @param {string} userId
 * @param {Object} alert
 * @param {Object} product
 */
export async function emitAlertTriggered(userId, alert, product) {
  await emitInternal({
    event:  'alertTriggered',
    userId: userId?.toString(),
    data: {
      alert: {
        _id:          alert._id,
        city:         alert.city,
        category:     alert.category,
        minWinScore:  alert.minWinScore,
        channel:      alert.channel,
        triggerCount: (alert.triggerCount || 0) + 1,
      },
      product: {
        _id:      product._id,
        name:     product.name,
        slug:     product.slug,
        winScore: product.winScore,
        category: product.category,
        cities:   product.cities,
      },
    },
  });
}

/**
 * Broadcast a batch score update summary to all connected clients.
 * @param {{ count: number, newWinners: Array }} payload
 */
export async function emitScoreBatchUpdate(payload) {
  await emitInternal({
    event: 'scoreBatchUpdate',
    data:  payload,
  });
}

/**
 * Broadcast to all clients that new ads have been detected.
 * @param {{ count: number, categories: string[] }} payload
 */
export async function emitNewAdsDetected(payload) {
  await emitInternal({
    event: 'newAdsDetected',
    data:  payload,
  });
}

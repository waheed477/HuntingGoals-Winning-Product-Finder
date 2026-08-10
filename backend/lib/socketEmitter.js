/**
 * Socket Emitter
 * Emits events directly on the in-process Socket.io instance (attached to the
 * main HTTP server by lib/socketServer.js). The io handle is read from
 * globalThis so this module also works inside Next.js webpack server bundles.
 *
 * If Socket.io is not initialized yet, emits degrade gracefully (log + skip),
 * exactly like the old "socket server not reachable" behavior.
 */

function io() {
  return globalThis.__trendspyIO || null;
}

/**
 * Route an event the same way the old /internal/emit endpoint did:
 * userId → `user:<id>` room, productId → `product:<id>` room, else broadcast.
 */
function emitInternal({ event, data, userId = null, productId = null }) {
  const socket = io();
  if (!socket) {
    // Socket layer not initialized yet — never block the caller
    return;
  }
  try {
    if (userId)         socket.to(`user:${userId}`).emit(event, data);
    else if (productId) socket.to(`product:${productId}`).emit(event, data);
    else                socket.emit(event, data);
  } catch (err) {
    console.warn(`[SocketEmitter] Failed to emit "${event}":`, err.message);
  }
}

/** Generic event broadcast (used by jobs, e.g. TikTok completion events). */
export async function emitSocketEvent(event, data) {
  emitInternal({ event, data });
}

/**
 * Broadcast a new winning product to all connected clients.
 * @param {Object} product - Mongoose product document or plain object
 */
export async function emitNewWinningProduct(product) {
  emitInternal({
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
  emitInternal({
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
  emitInternal({
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
  emitInternal({
    event: 'scoreBatchUpdate',
    data:  payload,
  });
}

/**
 * Broadcast to all clients that new ads have been detected.
 * @param {{ count: number, categories: string[] }} payload
 */
export async function emitNewAdsDetected(payload) {
  emitInternal({
    event: 'newAdsDetected',
    data:  payload,
  });
}

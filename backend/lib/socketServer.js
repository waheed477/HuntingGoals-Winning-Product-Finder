/**
 * Socket.io — attached to the SAME HTTP server as the Express/Next.js app.
 *
 * Replaces the former standalone socket-server.js process (port 3002).
 * Only server.js imports this module directly; every other module reaches the
 * io instance through globalThis.__trendspyIO (shared across Next.js webpack
 * bundles and plain Node modules in this single process).
 */

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getAllowedOrigins } from './corsOrigins.js';

// In-memory map: socketId → { userId, socketId, connectedAt }
const connectedUsers = new Map();

let io = null;

/**
 * Attach Socket.io to the given http.Server. Idempotent.
 * @param {import('http').Server} httpServer
 */
export function initSocket(httpServer) {
  if (io) return io;

  io = new Server(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // ─── Authentication Middleware ─────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.email  = decoded.email;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  // ─── Connection Handlers ───────────────────────────────────────────────────
  io.on('connection', (socket) => {
    connectedUsers.set(socket.id, {
      userId:      socket.userId,
      socketId:    socket.id,
      connectedAt: new Date(),
    });

    console.log(`[Socket] Connected: userId=${socket.userId} socketId=${socket.id} total=${connectedUsers.size}`);
    socket.join(`user:${socket.userId}`);

    socket.on('subscribe', ({ productIds = [] }) => {
      productIds.forEach((id) => socket.join(`product:${id}`));
      console.log(`[Socket] userId=${socket.userId} subscribed to ${productIds.length} product(s)`);
    });

    socket.on('unsubscribe', ({ productIds = [] }) => {
      productIds.forEach((id) => socket.leave(`product:${id}`));
    });

    socket.on('disconnect', (reason) => {
      connectedUsers.delete(socket.id);
      console.log(`[Socket] Disconnected: userId=${socket.userId} reason=${reason} total=${connectedUsers.size}`);
    });
  });

  // Shared with modules bundled by Next.js webpack (they cannot import this
  // module's instance, so the registry lives on globalThis).
  globalThis.__trendspyIO = io;

  console.log('[Socket] ✅ Socket.io attached to main HTTP server');
  return io;
}

export function getIO() {
  return io;
}

export function getConnectedUsers() {
  return connectedUsers.size;
}

export function emitToUser(userId, event, data) {
  io?.to(`user:${userId}`).emit(event, data);
}

export function emitToProduct(productId, event, data) {
  io?.to(`product:${productId}`).emit(event, data);
}

export function emitToAll(event, data) {
  io?.emit(event, data);
}

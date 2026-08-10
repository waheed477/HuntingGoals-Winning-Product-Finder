import { connectDB } from '@/lib/db';
import { Alert, Product } from '@/models/index';
import AlertLog from '@/models/AlertLog.js';
import { sendEmailAlert } from './emailService.js';
import { sendWhatsAppAlert } from './whatsappService.js';
import { emitAlertTriggered } from '@/lib/socketEmitter';
import { getAlertInsight } from './groqService.js';
import { notifyWinningProduct } from './notificationService.js';

export async function checkAndTriggerAlerts(product) {
  await connectDB();

  const alerts = await Alert.find({ isActive: true }).populate(
    'userId',
    'email phoneNumber emailNotifications whatsappNotifications'
  );

  const triggered = alerts.filter((alert) => {
    const scoreOk = product.winScore >= alert.minWinScore;
    const cityOk  = !alert.city || (Array.isArray(product.cities) && product.cities.includes(alert.city));
    const catOk   = !alert.category || product.category === alert.category;
    return scoreOk && cityOk && catOk;
  });

  const results = { triggered: triggered.length, whatsapp: 0, email: 0, errors: [] };

  // For high-value products, generate a one-line AI insight
  let aiSummary = '';
  if (product.winScore >= 85) {
    try {
      aiSummary = await getAlertInsight(product.name, product.winScore, product.category);
    } catch {
      // Groq unavailable — degrade gracefully
    }
  }

  const enrichedProduct = aiSummary ? { ...product, aiSummary } : product;

  for (const alert of triggered) {
    const user = alert.userId;
    if (!user) continue;

    const wantEmail    = alert.channel === 'email'    || alert.channel === 'both';
    const wantWhatsApp = alert.channel === 'whatsapp' || alert.channel === 'both';

    // ── Email ──────────────────────────────────────────────────────────────
    if (wantEmail && user.emailNotifications && user.email) {
      let delivered = false;
      let errorMessage = null;
      try {
        await sendEmailAlert(user.email, enrichedProduct);
        delivered = true;
        results.email++;
      } catch (err) {
        errorMessage = err.message;
        results.errors.push({ type: 'email', userId: user._id, error: err.message });
        console.error(`[AlertService] Email failed for ${user.email}:`, err.message);
      }
      await AlertLog.create({
        userId:      user._id,
        alertId:     alert._id,
        productId:   product._id,
        productName: product.name,
        winScore:    product.winScore,
        channel:     'email',
        sentAt:      new Date(),
        delivered,
        errorMessage,
      }).catch((e) => console.error('[AlertService] AlertLog write failed:', e.message));
    }

    // ── WhatsApp ───────────────────────────────────────────────────────────
    if (wantWhatsApp && user.whatsappNotifications && user.phoneNumber) {
      let delivered = false;
      let errorMessage = null;
      try {
        await sendWhatsAppAlert(user.phoneNumber, enrichedProduct);
        delivered = true;
        results.whatsapp++;
      } catch (err) {
        errorMessage = err.message;
        results.errors.push({ type: 'whatsapp', userId: user._id, error: err.message });
        console.error(`[AlertService] WhatsApp failed for ${user.phoneNumber}:`, err.message);
      }
      await AlertLog.create({
        userId:      user._id,
        alertId:     alert._id,
        productId:   product._id,
        productName: product.name,
        winScore:    product.winScore,
        channel:     'whatsapp',
        sentAt:      new Date(),
        delivered,
        errorMessage,
      }).catch((e) => console.error('[AlertService] AlertLog write failed:', e.message));
    }

    // ── Real-time socket push ──────────────────────────────────────────────
    emitAlertTriggered(user._id.toString(), alert, enrichedProduct).catch(() => {});

    // ── In-app notification ────────────────────────────────────────────────
    notifyWinningProduct(user._id, enrichedProduct).catch((e) =>
      console.error('[AlertService] In-app notification failed:', e.message)
    );

    // ── Update alert metadata ──────────────────────────────────────────────
    Alert.findByIdAndUpdate(alert._id, {
      $set: { lastTriggeredAt: new Date() },
      $inc: { triggerCount: 1 },
    }).catch((e) => console.error(`[AlertService] Failed to update alert ${alert._id}:`, e.message));
  }

  return results;
}

export async function checkAllProductsForAlerts() {
  await connectDB();

  const products = await Product.find({ winScore: { $gte: 75 } });
  const totals   = { whatsapp: 0, email: 0, errors: [] };

  for (const product of products) {
    try {
      const result = await checkAndTriggerAlerts(product);
      totals.whatsapp += result.whatsapp;
      totals.email    += result.email;
      totals.errors.push(...result.errors);
    } catch (err) {
      console.error(`[AlertService] Error checking alerts for product "${product.name}":`, err.message);
    }
  }

  return totals;
}

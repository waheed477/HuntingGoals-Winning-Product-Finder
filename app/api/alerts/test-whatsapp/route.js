import { withAuth } from '@/middleware/auth';
import { sendWhatsAppAlert, sendWhatsAppRaw } from '@/services/whatsappService';

export const POST = withAuth(async (request, context, user) => {
  try {
    const body = await request.json();
    const { phoneNumber, message } = body;

    if (!phoneNumber) {
      return Response.json(
        { success: false, error: 'phoneNumber is required (e.g. "+923001234567")' },
        { status: 400 }
      );
    }

    const instanceId = process.env.GREEN_API_INSTANCE_ID;
    const token = process.env.GREEN_API_TOKEN;

    if (!instanceId || !token) {
      return Response.json(
        {
          success: false,
          error: 'GREEN_API_INSTANCE_ID and GREEN_API_TOKEN are not configured. Add them in Replit Secrets.',
        },
        { status: 503 }
      );
    }

    const text = message || `✅ Hunting Goals WhatsApp alert test!\n\nYour WhatsApp alerts are now active. You will receive product alerts here.\n\n— Hunting Goals Team`;

    const result = await sendWhatsAppRaw(phoneNumber, text);

    console.log(`[POST /api/alerts/test-whatsapp] Sent to ${phoneNumber} by user ${user.email} — idMessage: ${result?.idMessage}`);

    return Response.json({
      success: true,
      data: {
        idMessage: result?.idMessage,
        phoneNumber,
        sentBy: user.email,
        greenApi: {
          instanceId: instanceId.slice(0, 4) + '****',
          status: 'connected',
        },
      },
    });
  } catch (err) {
    console.error('[POST /api/alerts/test-whatsapp]', err.message);

    const isGreenApiError = err.response?.data;
    return Response.json(
      {
        success: false,
        error: err.message,
        detail: isGreenApiError ? err.response.data : undefined,
      },
      { status: 500 }
    );
  }
});

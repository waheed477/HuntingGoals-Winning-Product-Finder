import nodemailer from 'nodemailer';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5000';

function getScoreColor(score) {
  if (score >= 85) return '#22c55e';
  if (score >= 70) return '#f97316';
  return '#ef4444';
}

function buildEmailHtml(product) {
  const priceRange =
    product.priceMin === product.priceMax
      ? `Rs. ${product.priceMin.toLocaleString('en-PK')}`
      : `Rs. ${product.priceMin.toLocaleString('en-PK')} – Rs. ${product.priceMax.toLocaleString('en-PK')}`;

  const cities = Array.isArray(product.cities) ? product.cities.join(', ') : product.cities || 'All Cities';
  const scoreColor = getScoreColor(product.winScore);
  const productUrl = `${FRONTEND_URL}/products/${product.slug}`;
  const imageHtml = product.imageUrl
    ? `<img src="${product.imageUrl}" alt="${product.name}" style="width:100%;max-height:220px;object-fit:cover;border-radius:8px;margin-bottom:20px;" />`
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:12px;overflow:hidden;max-width:600px;">
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:-0.5px;">
              🚀 TrendSpy Alert
            </h1>
            <p style="margin:6px 0 0;color:#c4b5fd;font-size:14px;">A product just hit your alert threshold!</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${imageHtml}
            <h2 style="margin:0 0 16px;color:#ffffff;font-size:20px;">${product.name}</h2>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #2d2d4e;">
                  <span style="color:#94a3b8;font-size:13px;">Win Score</span>
                </td>
                <td align="right" style="padding:10px 0;border-bottom:1px solid #2d2d4e;">
                  <span style="background:${scoreColor};color:#fff;font-size:13px;font-weight:700;padding:3px 10px;border-radius:999px;">
                    ${product.winScore}/100 ⭐
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #2d2d4e;">
                  <span style="color:#94a3b8;font-size:13px;">Price Range</span>
                </td>
                <td align="right" style="padding:10px 0;border-bottom:1px solid #2d2d4e;">
                  <span style="color:#f8fafc;font-size:13px;font-weight:600;">${priceRange}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #2d2d4e;">
                  <span style="color:#94a3b8;font-size:13px;">Category</span>
                </td>
                <td align="right" style="padding:10px 0;border-bottom:1px solid #2d2d4e;">
                  <span style="color:#f8fafc;font-size:13px;">${product.category}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;">
                  <span style="color:#94a3b8;font-size:13px;">Cities</span>
                </td>
                <td align="right" style="padding:10px 0;">
                  <span style="color:#f8fafc;font-size:13px;">${cities}</span>
                </td>
              </tr>
            </table>
            <div style="text-align:center;margin-top:28px;">
              <a href="${productUrl}"
                style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 32px;border-radius:8px;">
                View Product Details
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #2d2d4e;text-align:center;">
            <p style="margin:0;color:#475569;font-size:12px;">
              TrendSpy &mdash; Pakistan's #1 Product Hunting Tool<br>
              <a href="${FRONTEND_URL}/alerts" style="color:#6366f1;text-decoration:none;">Manage your alerts</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function createTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error('EMAIL_USER and EMAIL_PASS environment variables are required for email alerts.');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

/**
 * Generic email helper — used by notificationService for digests and system emails.
 * Requires EMAIL_USER + EMAIL_PASS in environment.
 */
export async function sendEmail(to, subject, html) {
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: `"TrendSpy" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
  console.log(`[Email] Sent "${subject}" to ${to} — messageId: ${info.messageId}`);
  return info;
}

export async function sendEmailAlert(userEmail, product) {
  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from: `"TrendSpy Alerts" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `🚀 Alert: ${product.name} hit Win Score ${product.winScore}/100`,
    html: buildEmailHtml(product),
  });

  console.log(`[Email] Sent alert for "${product.name}" to ${userEmail} — messageId: ${info.messageId}`);
  return info;
}

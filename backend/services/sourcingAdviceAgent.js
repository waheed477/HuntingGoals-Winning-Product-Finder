/**
 * Sourcing Advice Agent — Groq TEXT call (no vision).
 * Produces conservative stocking/pricing/ad-angle advice for a small Pakistani
 * dropshipper, from a Product doc (+ its matched suppliers).
 *
 * Conventions mirror services/groqService.js: returns null when GROQ_API_KEY is
 * missing so the caller can answer 503 — never throws to the route.
 */

import Groq from 'groq-sdk';

// Same text model already used across this codebase (see services/groqService.js)
const TEXT_MODEL = 'llama-3.3-70b-versatile';

let groqClient = null;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (GROQ_API_KEY && GROQ_API_KEY !== 'your_groq_api_key_here') {
  try {
    groqClient = new Groq({ apiKey: GROQ_API_KEY });
  } catch {
    groqClient = null;
  }
}

const SYSTEM_PROMPT = `You are a sourcing and inventory advisor for small Pakistani dropshippers.
Your advice must be CONSERVATIVE test-batch advice — never bulk-order advice:
assume the seller has limited capital, uses Cash on Delivery, and sources from local wholesale markets or Alibaba.

Given the product context, respond with STRICT JSON only, exactly this shape:
{
  "summary": string,               // 2-3 sentences: is this worth testing and why
  "recommendedStockSize": string,  // e.g. "10-20 units for a 2-week test"
  "suggestedPricePoint": string,   // in PKR, tied to local COD norms
  "competitionLevel": "Low" | "Medium" | "High",
  "suggestedAdAngle": string       // the single strongest angle for FB/TikTok ads in Pakistan
}`;

/**
 * @param {object} product  Product doc/lean object (matchedSuppliers may be populated)
 * @returns {Promise<object|null>} advice object, or null if AI is unavailable / call failed
 */
export async function generateSourcingAdvice(product) {
  if (!groqClient) return null;

  const suppliers = Array.isArray(product?.matchedSuppliers) ? product.matchedSuppliers : [];

  const context = {
    product:            product?.name || 'unknown product',
    category:           product?.category || null,
    winScore:           product?.winScore ?? null,
    seasonalTag:        product?.season || 'general',
    trend:              product?.trend || null,
    matchedSuppliers:   suppliers.length,
    supplierNames:      suppliers.slice(0, 5).map((s) => `${s.name || '?'} (${s.city || 'PK'})`),
    // Ad-level signals live on ScrapedAd docs; pass through whatever was attached
    // to the product by the caller (may be null — prompt tolerates gaps).
    daysRunning:        product?.maxDaysRunning ?? null,
    advertiserCount:    product?.advertiserCount ?? null,
    spendLevel:         product?.spendLevel ?? null,
  };

  try {
    const completion = await groqClient.chat.completions.create({
      model:           TEXT_MODEL,
      temperature:     0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: `Product context:\n${JSON.stringify(context, null, 2)}` },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }

    const competitionLevel = ['Low', 'Medium', 'High'].includes(parsed.competitionLevel)
      ? parsed.competitionLevel
      : null;

    if (!parsed.summary) return null;

    return {
      summary:              String(parsed.summary).slice(0, 1000),
      recommendedStockSize: String(parsed.recommendedStockSize || '').slice(0, 200),
      suggestedPricePoint:  String(parsed.suggestedPricePoint  || '').slice(0, 200),
      competitionLevel,
      suggestedAdAngle:     String(parsed.suggestedAdAngle     || '').slice(0, 500),
    };
  } catch (err) {
    console.warn('[sourcingAdviceAgent] Groq call failed:', err.message);
    return null;
  }
}

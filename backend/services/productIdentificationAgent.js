/**
 * Product Identification Agent — Groq call (vision when an image exists,
 * text-estimation fallback when it doesn't).
 * Given a scraped ad (image and/or copy), identifies the exact, sourceable product.
 *
 * Conventions mirror services/groqService.js:
 *  - module-level client; missing key → graceful degradation, never throw
 *  - model name comes ONLY from process.env.GROQ_VISION_MODEL (no baked-in
 *    fallback — the operator picks the model deliberately; qwen3.6 does text+vision)
 *  - callers receive { status: 'failed', reason } instead of exceptions
 *  - result.source tells the caller HOW the product was read: 'image' | 'text'
 */

import Groq from 'groq-sdk';

// ── Module-level Groq client init (once; silent — groqService announces AI
//    status at server boot already) ──────────────────────────────────────────
let groqClient = null;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (GROQ_API_KEY && GROQ_API_KEY !== 'your_groq_api_key_here') {
  try {
    groqClient = new Groq({ apiKey: GROQ_API_KEY });
  } catch {
    groqClient = null;
  }
}

const MAX_COPY_CHARS  = 500;  // token budget guard
const MAX_RAW_CHARS   = 4000; // stored raw response cap
const TEXT_CONFIDENCE_CAP = 75; // text-only guesses are honest about their ceiling

const SYSTEM_PROMPT_VISION = `You are a product identification expert for Pakistani e-commerce sellers and dropshippers.
You are shown a social-media ad (image + ad copy). Your job is to identify the SPECIFIC, sourceable product
being advertised — the exact item a seller could search for on Alibaba/1688/Daraz wholesale
(e.g. "LED Facial Mask — 7 Color Light Therapy"), NOT a broad category like "Beauty".

Rules:
- productName: short and specific; include the key variant/spec when visible.
- keyFeatures: 3-6 concrete specs (colors, materials, sizes, wattage, bundle contents, compatibility).
- confidence: 0-100 — how certain you are that a specific product is identifiable.
- If the image is unclear, generic, or text-only, set confidence below 50 and prefix productName with "Possibly: ".
- category: the single best retail category label (e.g. Electronics, Beauty, Fashion, Home, Sports, Toys).

Respond with STRICT JSON only, exactly this shape:
{"productName": string, "category": string, "keyFeatures": string[], "confidence": number, "reasoning": string}`;

const SYSTEM_PROMPT_TEXT = `You are a product identification expert for Pakistani e-commerce sellers and dropshippers.
You are given ONLY the ad copy of a social-media ad (headline + description + advertiser) — the image is
unavailable. Infer the SPECIFIC, sourceable product being advertised from the copy alone
(e.g. "LED Facial Mask — 7 Color Light Therapy"), NOT a broad category like "Beauty".

Rules:
- productName: short and specific; include the key variant/spec when the copy reveals it.
- keyFeatures: 3-6 concrete specs mentioned or strongly implied by the copy.
- confidence: 0-100, but be conservative without the image — never report above 75.
- If the copy is too vague for a specific product, set confidence below 50 and prefix productName with "Possibly: ".
- category: the single best retail category label (e.g. Electronics, Beauty, Fashion, Home, Sports, Toys).

Respond with STRICT JSON only, exactly this shape:
{"productName": string, "category": string, "keyFeatures": string[], "confidence": number, "reasoning": string}`;

function shapeResult(parsed, raw, { source, capConfidence }) {
  const name = String(parsed.productName || '').trim();
  if (!name) return null;

  let confidence = Math.max(0, Math.min(100, Number(parsed.confidence) || 0));
  if (capConfidence) confidence = Math.min(confidence, capConfidence);

  return {
    status: confidence >= 60 ? 'identified' : 'low_confidence',
    result: {
      name,
      category:           String(parsed.category || '').trim() || null,
      keyFeatures:        Array.isArray(parsed.keyFeatures)
        ? parsed.keyFeatures.map((f) => String(f).trim()).filter(Boolean).slice(0, 6)
        : [],
      confidence,
      reasoning:          String(parsed.reasoning || '').slice(0, 500),
      rawModelResponse:   raw.slice(0, MAX_RAW_CHARS),
      source,
    },
  };
}

async function runGroq({ model, system, userContent }) {
  const completion = await groqClient.chat.completions.create({
    model,
    temperature:     0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user',   content: userContent },
    ],
  });
  return completion.choices?.[0]?.message?.content || '';
}

/**
 * @param {object} ad   ScrapedAd doc/lean object (uses imageUrl, headline, description, advertiserName)
 * @returns {Promise<{status:'identified'|'low_confidence', result:object} | {status:'failed', reason:string}>}
 */
export async function identifyProductFromAd(ad) {
  if (!groqClient) {
    return { status: 'failed', reason: 'AI service is not configured on this server (missing GROQ_API_KEY).' };
  }

  // Vision model is operator-configured on purpose — never silently substitute one.
  // (qwen/qwen3.6-27b handles both images AND plain text, so it powers both paths.)
  const model = process.env.GROQ_VISION_MODEL;
  if (!model) {
    return { status: 'failed', reason: 'Vision model is not configured (set GROQ_VISION_MODEL).' };
  }

  const copy       = `${ad?.headline || ''}\n${ad?.description || ''}`.trim().slice(0, MAX_COPY_CHARS);
  const advertiser = String(ad?.advertiserName || '').trim();
  // Prefer the archived Cloudinary copy — FB CDN links expire in ~30-60 days
  const imageUrl   = ad?.archivedImageUrl || ad?.imageUrl || null;

  try {
    if (imageUrl) {
      // ── Vision path ──────────────────────────────────────────────────────
      let visionFailure = null;
      try {
        const raw = await runGroq({
          model,
          system:      SYSTEM_PROMPT_VISION,
          userContent: [
            { type: 'text', text: `Ad copy (may be truncated):\n${copy || '(no ad copy available)'}` },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        });

        let parsed = null;
        try { parsed = JSON.parse(raw); } catch { /* fall through to text */ }

        const shaped = parsed && shapeResult(parsed, raw, { source: 'image', capConfidence: null });
        if (shaped) return shaped;
        visionFailure = 'Model returned unusable output for this image.';
      } catch (err) {
        // Expired FB CDN link / API hiccup — don't give up if we have copy
        visionFailure = (err?.message || 'Groq vision call failed').slice(0, 300);
      }

      // Image path failed but the ad has readable copy → text estimation rescue
      if (copy || advertiser) {
        console.warn('[identify] vision path failed, retrying from ad copy:', visionFailure);
      } else {
        return { status: 'failed', reason: visionFailure || 'Image analysis failed and no ad copy is available.' };
      }
    } else if (!copy && !advertiser) {
      return { status: 'failed', reason: 'This ad has no image and no readable copy to analyse.' };
    }

    // ── Text path (also the rescue when the image path failed) ────────────
    const raw = await runGroq({
      model,
      system:      SYSTEM_PROMPT_TEXT,
      userContent: `Advertiser/page: ${advertiser || '(unknown)'}\nAd copy (may be truncated):\n${copy || '(no ad copy available)'}`,
    });

    let parsed;
    try { parsed = JSON.parse(raw); }
    catch { return { status: 'failed', reason: 'Model returned unparseable output (not valid JSON).' } }

    const shaped = shapeResult(parsed, raw, { source: 'text', capConfidence: TEXT_CONFIDENCE_CAP });
    if (!shaped) return { status: 'failed', reason: 'Model could not identify a product from this ad copy.' };
    return shaped;
  } catch (err) {
    // API failure, unreachable image URL (expired FB CDN link), model errors — all degrade the same way
    return { status: 'failed', reason: (err?.message || 'Groq call failed').slice(0, 300) };
  }
}

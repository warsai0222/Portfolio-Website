const crypto = require("crypto");

function headersOf(event) {
  return event.headers || {};
}

function allowedOrigin(event) {
  const headers = headersOf(event);
  const origin = headers.origin || headers.Origin || "";
  if (!origin) return "";

  const host = headers.host || headers.Host || "";
  try {
    const originHost = new URL(origin).host;
    if (originHost === host || originHost === "localhost:8888" || originHost.startsWith("localhost:")) return origin;
  } catch {
    return "";
  }

  return "";
}

function isOriginAllowed(event) {
  const origin = headersOf(event).origin || headersOf(event).Origin || "";
  return !origin || !!allowedOrigin(event);
}

function json(event, statusCode, body) {
  const origin = allowedOrigin(event);
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin || "null",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin"
    },
    body: JSON.stringify(body)
  };
}

function clean(value, max = 800) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function clientHash(event) {
  const headers = headersOf(event);
  const raw =
    headers["x-nf-client-connection-ip"] ||
    headers["x-forwarded-for"] ||
    headers["client-ip"] ||
    "unknown";
  return crypto.createHash("sha256").update(raw.split(",")[0].trim()).digest("hex").slice(0, 16);
}

exports.handler = async event => {
  if (!isOriginAllowed(event)) return json(event, 403, { ok: false });
  if (event.httpMethod === "OPTIONS") return json(event, 200, {});
  if (event.httpMethod !== "POST") return json(event, 405, { ok: false });

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(event, 400, { ok: false });
  }

  const rating = payload.rating === "up" || payload.rating === "down" ? payload.rating : "";
  if (!rating) return json(event, 400, { ok: false });

  console.log(
    "askvarshith_feedback",
    JSON.stringify({
      rating,
      question: clean(payload.question),
      answer: clean(payload.answer, 1200),
      intent: clean(payload.intent, 80),
      sourceIds: Array.isArray(payload.sourceIds) ? payload.sourceIds.slice(0, 8).map(id => clean(id, 80)) : [],
      path: clean(payload.path, 160),
      clientHash: clientHash(event),
      createdAt: new Date().toISOString()
    })
  );

  return json(event, 200, { ok: true });
};

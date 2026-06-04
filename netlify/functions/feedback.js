const crypto = require("crypto");

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    },
    body: JSON.stringify(body)
  };
}

function clean(value, max = 800) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function clientHash(event) {
  const raw =
    event.headers["x-nf-client-connection-ip"] ||
    event.headers["x-forwarded-for"] ||
    event.headers["client-ip"] ||
    "unknown";
  return crypto.createHash("sha256").update(raw.split(",")[0].trim()).digest("hex").slice(0, 16);
}

exports.handler = async event => {
  if (event.httpMethod === "OPTIONS") return json(200, {});
  if (event.httpMethod !== "POST") return json(405, { ok: false });

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false });
  }

  const rating = payload.rating === "up" || payload.rating === "down" ? payload.rating : "";
  if (!rating) return json(400, { ok: false });

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

  return json(200, { ok: true });
};

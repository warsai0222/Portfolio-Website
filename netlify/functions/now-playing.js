/**
 * /api/now-playing
 *
 * Holds the Spotify credentials server-side and returns a small, safe payload.
 * Needs three environment variables in Netlify:
 *   SPOTIFY_CLIENT_ID
 *   SPOTIFY_CLIENT_SECRET
 *   SPOTIFY_REFRESH_TOKEN
 * With any of them missing the endpoint answers {configured:false} and the
 * card on the page simply keeps its default copy.
 */

const TOKEN_URL   = 'https://accounts.spotify.com/api/token';
const NOW_URL     = 'https://api.spotify.com/v1/me/player/currently-playing';
const RECENT_URL  = 'https://api.spotify.com/v1/me/player/recently-played?limit=10';

const CACHE_MS      = 25_000;   // one upstream call per 25s no matter how many visitors
const HIDE_EXPLICIT = true;     // explicit track playing -> show the last clean one instead

let cache = { at: 0, body: null };
let token = { value: null, expiresAt: 0 };

async function accessToken(id, secret, refresh) {
  if (token.value && Date.now() < token.expiresAt - 60_000) return token.value;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64')
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh })
  });
  if (!res.ok) throw new Error('token ' + res.status);
  const j = await res.json();
  token = { value: j.access_token, expiresAt: Date.now() + (j.expires_in || 3600) * 1000 };
  return token.value;
}

const artOf = item =>
  (item && item.album && item.album.images || [])
    .slice().sort((a, b) => a.width - b.width)
    .find(i => i.width >= 120)?.url || null;

function shape(item, { isPlaying, progressMs, playedAt }) {
  return {
    configured: true,
    isPlaying,
    title:    item.name,
    artist:   (item.artists || []).map(a => a.name).join(', '),
    album:    item.album && item.album.name || '',
    art:      artOf(item),
    url:      item.external_urls && item.external_urls.spotify || 'https://open.spotify.com/',
    progressMs: progressMs || 0,
    durationMs: item.duration_ms || 0,
    playedAt: playedAt || null
  };
}

async function recent(bearer) {
  const res = await fetch(RECENT_URL, { headers: { Authorization: 'Bearer ' + bearer } });
  if (!res.ok) return null;
  const j = await res.json();
  const items = (j.items || []).filter(x => x && x.track);
  const pick = (HIDE_EXPLICIT ? items.find(x => !x.track.explicit) : items[0]) || items[0];
  if (!pick) return null;
  return shape(pick.track, { isPlaying: false, progressMs: 0, playedAt: pick.played_at });
}

exports.handler = async () => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=20'
  };

  const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret,
          SPOTIFY_REFRESH_TOKEN: refresh } = process.env;
  if (!id || !secret || !refresh) {
    return { statusCode: 200, headers, body: JSON.stringify({ configured: false }) };
  }

  if (cache.body && Date.now() - cache.at < CACHE_MS) {
    return { statusCode: 200, headers, body: cache.body };
  }

  try {
    const bearer = await accessToken(id, secret, refresh);

    const res = await fetch(NOW_URL + '?market=from_token',
      { headers: { Authorization: 'Bearer ' + bearer } });

    let payload = null;

    if (res.status === 200) {
      const j = await res.json().catch(() => null);
      const item = j && j.item;
      if (item && item.type === 'track') {
        // an explicit track is swapped for the most recent clean one
        if (HIDE_EXPLICIT && item.explicit) payload = await recent(bearer);
        else payload = shape(item, { isPlaying: !!j.is_playing, progressMs: j.progress_ms });
      }
    }
    // 204 means nothing is playing; anything else unexpected falls through the same way
    if (!payload) payload = await recent(bearer);
    if (!payload) payload = { configured: true, isPlaying: false, idle: true };

    cache = { at: Date.now(), body: JSON.stringify(payload) };
    return { statusCode: 200, headers, body: cache.body };

  } catch (err) {
    // never surface an error into the page; the card keeps whatever it last had
    if (cache.body) return { statusCode: 200, headers, body: cache.body };
    return { statusCode: 200, headers,
             body: JSON.stringify({ configured: true, isPlaying: false, idle: true }) };
  }
};

let accessToken = '';
let tokenExpiresAt = 0;
let cached = null;
let cacheExpiresAt = 0;
let inFlight = null;

async function spotifyFetch(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(4000) });
}

async function getPlayback() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return { state: 'unconfigured' };

  if (!accessToken || Date.now() >= tokenExpiresAt) {
    const response = await spotifyFetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }).toString()
    });
    if (!response.ok) throw new Error('spotify_auth_failed');
    const token = await response.json();
    if (!token.access_token || !Number.isFinite(token.expires_in)) throw new Error('spotify_invalid_token');
    accessToken = token.access_token;
    tokenExpiresAt = Date.now() + Math.max(0, token.expires_in - 60) * 1000;
  }

  const response = await spotifyFetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (response.status === 204) return { state: 'idle' };
  if (response.status === 401) { accessToken = ''; tokenExpiresAt = 0; }
  if (!response.ok) throw new Error('spotify_playback_failed');
  const playback = await response.json();
  const track = playback.item;
  if (!track || track.type !== 'track' || !Number.isFinite(track.duration_ms) || track.duration_ms <= 0) return { state: 'idle' };
  return {
    state: playback.is_playing ? 'playing' : 'paused',
    title: String(track.name || '').slice(0, 300),
    artist: (track.artists || []).map(artist => artist.name).join(', ').slice(0, 300),
    albumArt: track.album?.images?.[0]?.url || '',
    url: track.external_urls?.spotify || '',
    progressMs: Math.min(track.duration_ms, Math.max(0, playback.progress_ms || 0)),
    durationMs: track.duration_ms,
    updatedAt: Date.now()
  };
}

exports.handler = async event => {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: { ...headers, Allow: 'GET' }, body: JSON.stringify({ state: 'unavailable' }) };
  }
  if (!cached || Date.now() >= cacheExpiresAt) {
    if (!inFlight) {
      inFlight = getPlayback().catch(() => ({ state: 'unavailable' })).then(data => {
        cached = data;
        cacheExpiresAt = Date.now() + (['playing', 'paused'].includes(data.state) ? 15000 : 60000);
      }).finally(() => { inFlight = null; });
    }
    await inFlight;
  }
  return { statusCode: 200, headers, body: JSON.stringify(cached) };
};

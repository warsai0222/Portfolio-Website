/* Fills the #now-playing card from /api/now-playing.
   Re-syncs every 30s and ticks the progress bar locally in between, so the bar
   moves smoothly without polling harder. Polling stops while the tab is hidden. */
(function () {
  'use strict';
  var card = document.getElementById('now-playing');
  if (!card) return;

  var $ = function (id) { return document.getElementById(id); };
  var elStatus = $('music-status'), elLink = $('music-link'), elArt = $('music-art'),
      elTitle  = $('music-title'),  elArtist = $('music-artist'), elBar = $('music-progress'),
      elNow    = $('music-elapsed'), elEnd = $('music-duration');

  var SYNC_MS = 30000, TICK_MS = 1000;
  var state = null, syncedAt = 0, timer = null, poll = null;

  function safeURL(value, image) {
    try {
      var url = new URL(value);
      var allowed = image
        ? (url.hostname === 'scdn.co' || url.hostname.endsWith('.scdn.co') || url.hostname === 'spotifycdn.com' || url.hostname.endsWith('.spotifycdn.com'))
        : url.hostname === 'open.spotify.com';
      return url.protocol === 'https:' && allowed ? url.href : '';
    } catch (_) { return ''; }
  }

  var mmss = function (ms) {
    if (!ms && ms !== 0) return '--:--';
    var s = Math.max(0, Math.floor(ms / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };

  function paintProgress() {
    if (!state || !state.durationMs) {
      elBar.value = 0; elBar.max = 1;
      elNow.textContent = '--:--'; elEnd.textContent = '--:--';
      return;
    }
    var at = state.progressMs + (state.isPlaying ? Date.now() - syncedAt : 0);
    if (at > state.durationMs) at = state.durationMs;
    elBar.max = state.durationMs;
    elBar.value = at;
    elNow.textContent = mmss(at);
    elEnd.textContent = mmss(state.durationMs);
  }

  function paint(d) {
    // not configured yet, or nothing to show: leave the card's own default copy alone
    if (!d || d.configured === false || d.idle || !d.title) {
      card.classList.remove('is-playing');
      state = null; paintProgress();
      return;
    }
    state = d; syncedAt = Date.now();

    card.classList.toggle('is-playing', !!d.isPlaying);
    elStatus.textContent = d.isPlaying ? 'Now playing' : 'Last played';
    elTitle.textContent  = d.title;
    elArtist.textContent = d.album ? d.artist + ' · ' + d.album : d.artist;
    elLink.href = safeURL(d.url, false) || 'https://open.spotify.com/';
    elLink.setAttribute('aria-label',
      (d.isPlaying ? 'Now playing: ' : 'Last played: ') + d.title + ' by ' + d.artist);

    var art = safeURL(d.art, true);
    if (art) { elArt.src = art; elArt.alt = d.album ? 'Cover of ' + d.album : ''; elArt.hidden = false; }
    else       { elArt.hidden = true; elArt.removeAttribute('src'); }

    // a finished track has no live position to show
    if (!d.isPlaying) { state.progressMs = 0; state.durationMs = d.durationMs || 0; }
    paintProgress();
  }

  function sync() {
    fetch('/api/now-playing', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(paint)
      .catch(function () { /* keep whatever is on screen */ });
  }

  function start() {
    stop();
    sync();
    poll  = setInterval(sync, SYNC_MS);
    timer = setInterval(function () { if (state && state.isPlaying) paintProgress(); }, TICK_MS);
  }
  function stop() {
    if (poll)  { clearInterval(poll);  poll  = null; }
    if (timer) { clearInterval(timer); timer = null; }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });
  start();
})();

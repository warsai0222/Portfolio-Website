(() => {
  const card = document.getElementById('now-playing');
  if (!card || location.protocol === 'file:') return;
  const status = document.getElementById('music-status');
  const title = document.getElementById('music-title');
  const artist = document.getElementById('music-artist');
  const link = document.getElementById('music-link');
  const art = document.getElementById('music-art');
  const progress = document.getElementById('music-progress');
  const elapsed = document.getElementById('music-elapsed');
  const duration = document.getElementById('music-duration');
  let sample = null;
  let pollTimer;
  let progressTimer;
  let visible = false;
  let pending = false;
  let lastPoll = 0;

  function safeURL(value, image = false) {
    try {
      const url = new URL(value);
      const allowed = image ? url.hostname.endsWith('.scdn.co') : url.hostname === 'open.spotify.com';
      return url.protocol === 'https:' && allowed ? url.href : '';
    } catch { return ''; }
  }

  function time(milliseconds) {
    const seconds = Math.floor(Math.max(0, milliseconds) / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function tick() {
    if (!sample) return;
    const offset = sample.isPlaying ? Math.max(0, Date.now() - sample.updatedAt) : 0;
    const position = Math.min(sample.durationMs, sample.progressMs + offset);
    progress.max = sample.durationMs;
    progress.value = position;
    elapsed.textContent = time(position);
    duration.textContent = time(sample.durationMs);
  }

  function render(data) {
    sample = null;
    card.classList.remove('is-playing');
    link.href = 'https://open.spotify.com/';
    art.hidden = true;
    art.removeAttribute('src');
    progress.value = 0;
    progress.max = 1;
    elapsed.textContent = duration.textContent = '--:--';
    if (data.state === 'unconfigured') {
      status.textContent = 'Listening corner';
      title.textContent = 'Music, between the work.';
      artist.textContent = 'Live listening coming soon';
      return;
    }
    if (data.state === 'idle') {
      status.textContent = 'Off the record';
      title.textContent = 'Nothing playing right now';
      artist.textContent = 'Back with another track soon';
      return;
    }
    if (!['playing', 'paused'].includes(data.state) || !data.title || !Number.isFinite(data.durationMs) || data.durationMs <= 0) {
      status.textContent = 'Listening corner';
      title.textContent = 'Taking a short interlude';
      artist.textContent = 'Live listening is unavailable right now';
      return;
    }
    sample = {
      isPlaying: data.state === 'playing',
      durationMs: data.durationMs,
      progressMs: Number.isFinite(data.progressMs) ? Math.max(0, data.progressMs) : 0,
      updatedAt: Number.isFinite(data.updatedAt) ? data.updatedAt : Date.now()
    };
    status.textContent = sample.isPlaying ? 'Now playing' : 'Paused';
    title.textContent = String(data.title).slice(0, 300);
    artist.textContent = String(data.artist || '').slice(0, 300);
    link.href = safeURL(data.url) || 'https://open.spotify.com/';
    const image = safeURL(data.albumArt, true);
    if (image) { art.src = image; art.hidden = false; }
    card.classList.toggle('is-playing', sample.isPlaying);
    tick();
  }

  art.addEventListener('error', () => { art.hidden = true; });

  async function poll() {
    clearTimeout(pollTimer);
    if (pending || !visible || document.hidden) return;
    if (Date.now() - lastPoll < 15000) {
      pollTimer = setTimeout(poll, 15000 - (Date.now() - lastPoll));
      return;
    }
    pending = true;
    lastPoll = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let delay = 30000;
    try {
      const response = await fetch('/api/now-playing', { signal: controller.signal });
      if (!response.ok) throw new Error('unavailable');
      const data = await response.json();
      render(data);
      if (data.state === 'unconfigured' || data.state === 'unavailable') delay = 120000;
    } catch {
      render({ state: 'unavailable' });
      delay = 60000;
    } finally {
      clearTimeout(timeout);
      pending = false;
      if (visible && !document.hidden) pollTimer = setTimeout(poll, delay);
    }
  }

  function sync() {
    clearTimeout(pollTimer);
    clearInterval(progressTimer);
    if (visible && !document.hidden) {
      tick();
      progressTimer = setInterval(tick, 1000);
      poll();
    }
  }

  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    }, { rootMargin: '100px' }).observe(card);
  } else { visible = true; sync(); }
})();

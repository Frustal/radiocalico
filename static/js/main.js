const HLS_URL = 'https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8';

const player = document.getElementById('player');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const statusText = document.getElementById('status');
const volumeSlider = document.getElementById('volume');
const volumeValue = document.getElementById('volumeValue');
const elapsedTime = document.getElementById('elapsed');
const artistName = document.getElementById('artistName');
const trackTitle = document.getElementById('trackTitle');
const trackMeta = document.getElementById('trackMeta');
const recentlyPlayedList = document.getElementById('recentlyPlayedList');
const bannerText = document.getElementById('bannerText');
const thumbsUpBtn = document.getElementById('thumbsUpBtn');
const thumbsDownBtn = document.getElementById('thumbsDownBtn');
const thumbsUpCount = document.getElementById('thumbsUpCount');
const thumbsDownCount = document.getElementById('thumbsDownCount');

const METADATA_URL = 'https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json';
const API_BASE = '/api';

let currentTrackId = null;
let lastMetadata = null;
let currentAudioQuality = null;

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function formatSampleRate(sampleRate) {
  const rate = typeof sampleRate === 'string' ? parseFloat(sampleRate) : sampleRate;
  if (!rate || isNaN(rate)) return `${sampleRate}`;

  const khz = rate >= 1000 ? rate / 1000 : rate;
  const formatted = khz % 1 === 0 ? khz.toString() : khz.toFixed(1);
  return `${formatted}kHz`;
}

// The metadata JSON's bit_depth/sample_rate describe the source master
// (always ~48kHz FLAC), not necessarily what HLS is actually delivering —
// HLS adaptively switches between a lossless FLAC rendition and a lossy
// ~192kbps VBR MP3 rendition based on the client's bandwidth. Inspect the
// active hls.js level/audio track to find out which is really playing.
function detectAudioQuality() {
  if (!hls) return null;

  const level = hls.levels && hls.levels[hls.currentLevel];
  const track = hls.audioTracks && hls.audioTracks[hls.audioTrack];

  const codec = (
    (track && track.attrs && track.attrs.CODECS) ||
    (level && level.audioCodec) ||
    (level && level.attrs && level.attrs.CODECS) ||
    ''
  ).toLowerCase();

  const bitrate = (level && level.bitrate) || (track && track.bitrate) || null;

  if (codec.includes('flac') || codec.includes('alac') || codec.includes('pcm')) {
    return { lossless: true };
  }
  if (bitrate && bitrate > 500000) {
    // Lossless FLAC bitrates run well above typical lossy streaming bitrates
    return { lossless: true };
  }
  if (codec || bitrate) {
    return { lossless: false, bitrateKbps: bitrate ? Math.round(bitrate / 1000) : null };
  }
  return null;
}

function renderTrackMeta() {
  if (!lastMetadata) return;

  const metaParts = [];
  if (lastMetadata.album) metaParts.push(lastMetadata.album);
  if (lastMetadata.date) metaParts.push(lastMetadata.date);

  const qualityParts = [];
  if (currentAudioQuality && currentAudioQuality.lossless === false) {
    const kbps = currentAudioQuality.bitrateKbps || 192;
    qualityParts.push(`${kbps}kbps MP3`);
  } else {
    const specParts = [];
    if (lastMetadata.bit_depth) specParts.push(`${lastMetadata.bit_depth}-bit`);
    if (lastMetadata.sample_rate) specParts.push(formatSampleRate(lastMetadata.sample_rate));
    if (specParts.length) qualityParts.push(`${specParts.join('/')} FLAC`);
  }
  if (qualityParts.length) metaParts.push(qualityParts.join('/'));

  trackMeta.textContent = metaParts.join(' • ') || '—';
}

async function fetchAndUpdateMetadata() {
  try {
    console.log('Fetching metadata from:', METADATA_URL);
    const response = await fetch(METADATA_URL);
    if (!response.ok) {
      console.error('Metadata fetch failed:', response.status, response.statusText);
      return;
    }
    const data = await response.json();
    console.log('Metadata fetched:', data);

    lastMetadata = data;

    artistName.textContent = data.artist || '—';
    trackTitle.textContent = data.title || '—';
    bannerText.textContent = (data.artist || '—').toUpperCase();

    renderTrackMeta();

    const coverImage = document.getElementById('coverImage');
    coverImage.src = 'https://d3d4yli4hf5bmh.cloudfront.net/cover.jpg?t=' + Date.now();

    renderRecentlyPlayed(data);
    updateTrackRating(data);
  } catch (error) {
    console.error('Error fetching metadata:', error);
    console.error('Error details:', error.message);
  }
}

function renderRecentlyPlayed(data) {
  recentlyPlayedList.innerHTML = '';

  for (let i = 1; i <= 5; i++) {
    const artistKey = `prev_artist_${i}`;
    const titleKey = `prev_title_${i}`;

    if (data[artistKey] && data[titleKey]) {
      const item = document.createElement('div');
      item.className = 'recent-item';
      item.textContent = `${data[artistKey]} - ${data[titleKey]}`;
      recentlyPlayedList.appendChild(item);
    }
  }
}

function generateTrackId(artist, title) {
  return `${artist}-${title}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

function updateTrackRating(data) {
  const trackId = generateTrackId(data.artist, data.title);
  console.log('updateTrackRating called. Current:', currentTrackId, 'New:', trackId);
  if (currentTrackId !== trackId) {
    currentTrackId = trackId;
    console.log('Track ID updated to:', currentTrackId);
    fetchRatingCounts(trackId);
  }
}

async function fetchRatingCounts(trackId) {
  try {
    const response = await fetch(`${API_BASE}/ratings/${trackId}`);
    const data = await response.json();

    thumbsUpCount.textContent = data.thumbs_up || 0;
    thumbsDownCount.textContent = data.thumbs_down || 0;

    updateRatingButtonStates(data.user_rating);
  } catch (error) {
    console.error('Error fetching ratings:', error);
  }
}

function updateRatingButtonStates(userRating) {
  thumbsUpBtn.classList.remove('active');
  thumbsDownBtn.classList.remove('active');

  if (userRating === 'up') {
    thumbsUpBtn.classList.add('active');
  } else if (userRating === 'down') {
    thumbsDownBtn.classList.add('active');
  }
}

async function submitRating(trackId, rating) {
  try {
    console.log('Submitting rating:', rating, 'for track:', trackId);
    const response = await fetch(`${API_BASE}/ratings/${trackId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating })
    });
    console.log('Rating response:', response.status);

    if (response.ok || response.status === 409) {
      await fetchRatingCounts(trackId);
    }
  } catch (error) {
    console.error('Error submitting rating:', error);
  }
}

function startMetadataPolling() {
  fetchAndUpdateMetadata();
  setInterval(fetchAndUpdateMetadata, 5000);
}

// Fallback: if metadata fails to load, set a test track so buttons work
setTimeout(() => {
  if (!currentTrackId) {
    console.warn('Metadata not loaded after 3s. Setting test track ID.');
    currentTrackId = 'test-track';
    artistName.textContent = 'Test Artist';
    trackTitle.textContent = 'Test Track';
    trackMeta.textContent = 'Test metadata';
    bannerText.textContent = 'TEST ARTIST';
    fetchRatingCounts('test-track');
  }
}, 3000);

let hls;
let playStartTime = 0;
let elapsedAtPause = 0;

function initHLS() {
  if (Hls.isSupported()) {
    const hlsConfig = {
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      maxBufferSize: 20 * 1000 * 1000,
      maxBufferHole: 0.5,
      lowLatencyMode: false,
      backBufferLength: 30,
      manifestLoadingTimeOut: 10000,
      manifestLoadingRetryDelay: 1000,
      levelLoadingTimeOut: 10000,
      fragLoadingTimeOut: 20000,
      fragLoadingErrorRetry: { retryDelayMs: 500, maxNumRetry: 6 },
    };
    hls = new Hls(hlsConfig);
    hls.loadSource(HLS_URL);
    hls.attachMedia(player);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      statusText.textContent = 'Stream loaded. Ready to play.';
    });
    hls.on(Hls.Events.LEVEL_SWITCHED, () => {
      currentAudioQuality = detectAudioQuality();
      renderTrackMeta();
    });
    hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, () => {
      currentAudioQuality = detectAudioQuality();
      renderTrackMeta();
    });
    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.type === 'networkError') {
        statusText.textContent = 'Network error. Check stream URL.';
      } else if (data.type === 'mediaError') {
        statusText.textContent = 'Media error. Retrying...';
        hls.recoverMediaError();
      } else {
        statusText.textContent = `Error: ${data.reason || 'Unknown error'}`;
      }
    });
  } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
    player.src = HLS_URL;
    statusText.textContent = 'Stream loaded. Ready to play.';
  } else {
    statusText.textContent = 'HLS not supported in this browser';
  }
}

function play() {
  if (!player.src && !hls) {
    initHLS();
  }
  player.play();
  playBtn.textContent = '⏹';
  statusText.textContent = '▶ Now playing...';
}

function stop() {
  player.pause();
  player.currentTime = 0;
  if (timeUpdateInterval) clearInterval(timeUpdateInterval);
  playStartTime = 0;
  elapsedAtPause = 0;
  elapsedTime.textContent = '0:00';
  playBtn.textContent = '▶';
  statusText.textContent = 'Stopped';
}

function togglePlayStop() {
  if (player.paused || !playStartTime) {
    play();
  } else {
    stop();
  }
}

playBtn.addEventListener('click', togglePlayStop);
stopBtn.addEventListener('click', stop);

thumbsUpBtn.addEventListener('click', () => {
  console.log('Thumbs up clicked. currentTrackId:', currentTrackId);
  if (currentTrackId) {
    submitRating(currentTrackId, 'up');
  } else {
    console.warn('Cannot submit rating: currentTrackId is null or undefined');
  }
});

thumbsDownBtn.addEventListener('click', () => {
  console.log('Thumbs down clicked. currentTrackId:', currentTrackId);
  if (currentTrackId) {
    submitRating(currentTrackId, 'down');
  } else {
    console.warn('Cannot submit rating: currentTrackId is null or undefined');
  }
});

volumeSlider.addEventListener('input', (e) => {
  const volume = e.target.value;
  player.volume = volume / 100;
  volumeValue.textContent = volume + '%';
});

function updateElapsedTime() {
  if (playStartTime === 0) return;
  const elapsed = (Date.now() - playStartTime) / 1000 + elapsedAtPause;
  elapsedTime.textContent = formatTime(elapsed);
}

let timeUpdateInterval;

player.addEventListener('play', () => {
  playBtn.textContent = '⏹';
  statusText.textContent = '▶ Now playing...';
  playStartTime = Date.now();

  if (timeUpdateInterval) clearInterval(timeUpdateInterval);
  timeUpdateInterval = setInterval(updateElapsedTime, 100);
});

player.addEventListener('pause', () => {
  playBtn.textContent = '▶';
  statusText.textContent = '⏸ Paused';
  if (timeUpdateInterval) clearInterval(timeUpdateInterval);
  if (playStartTime > 0) {
    elapsedAtPause += (Date.now() - playStartTime) / 1000;
    playStartTime = 0;
  }
});

player.addEventListener('error', (e) => {
  statusText.textContent = 'Playback error. Check your connection.';
});

player.addEventListener('timeupdate', () => {
  updateElapsedTime();
});

initHLS();
startMetadataPolling();

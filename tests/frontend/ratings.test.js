import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

function createTestDocument() {
  const html = `
    <!DOCTYPE html>
    <html>
    <head></head>
    <body>
      <audio id="player"></audio>
      <button id="playBtn">▶</button>
      <button id="stopBtn">⏹</button>
      <div id="status"></div>
      <input id="volume" type="range" value="50">
      <span id="volumeValue">50%</span>
      <span id="elapsed">0:00</span>
      <h2 id="artistName">—</h2>
      <h3 id="trackTitle">—</h3>
      <div id="trackMeta">—</div>
      <div id="recentlyPlayedList"></div>
      <div id="bannerText">—</div>
      <button id="thumbsUpBtn">👍</button>
      <button id="thumbsDownBtn">👎</button>
      <span id="thumbsUpCount">0</span>
      <span id="thumbsDownCount">0</span>
      <img id="coverImage" src="">
    </body>
    </html>
  `;
  return new JSDOM(html, { pretendToBeVisual: true });
}

function mockResponse(data, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

describe('Frontend Rating Buttons', () => {
  let dom;
  let window;
  let fetchMock;
  let HlsMock;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();

    dom = createTestDocument();
    window = dom.window;
    global.window = window;
    global.document = window.document;
    global.fetch = vi.fn();
    fetchMock = global.fetch;

    HlsMock = vi.fn();
    HlsMock.isSupported = vi.fn(() => false);
    HlsMock.Events = {
      MANIFEST_PARSED: 'hlsManifestParsed',
      ERROR: 'hlsError',
    };
    global.Hls = HlsMock;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
    delete global.window;
    delete global.document;
    delete global.fetch;
    delete global.Hls;
  });

  it('should not submit rating if currentTrackId is null (before metadata loads)', async () => {
    await import('../../static/js/main.js');

    const thumbsUpBtn = window.document.getElementById('thumbsUpBtn');
    thumbsUpBtn.click();

    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/ratings/),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should fetch rating counts after metadata is loaded', async () => {
    fetchMock.mockImplementation((url) => {
      if (url.includes('metadatav2.json')) {
        return mockResponse({
          artist: 'Test Artist',
          title: 'Test Song',
          album: 'Test Album',
          date: '2025',
          bit_depth: '16',
          sample_rate: 44100,
        });
      }
      if (url.includes('/api/ratings/')) {
        return mockResponse({
          track_id: 'test-artist-test-song',
          thumbs_up: 5,
          thumbs_down: 2,
          user_rating: null,
        });
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });

    await import('../../static/js/main.js');

    await vi.runOnlyPendingTimersAsync();

    const thumbsUpCount = window.document.getElementById('thumbsUpCount');
    expect(thumbsUpCount.textContent).toBe('5');
  });

  it('should submit a rating when button is clicked', async () => {
    fetchMock.mockImplementation((url, opts) => {
      if (url.includes('metadatav2.json')) {
        return mockResponse({
          artist: 'Artist A',
          title: 'Song A',
        });
      }
      if (url.includes('/api/ratings/')) {
        if (opts?.method === 'POST') {
          return mockResponse({
            track_id: 'artist-a-song-a',
            rating: 'up',
            user_ip: '127.0.0.1',
          }, 201);
        }
        return mockResponse({
          track_id: 'artist-a-song-a',
          thumbs_up: 1,
          thumbs_down: 0,
          user_rating: 'up',
        });
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });

    await import('../../static/js/main.js');

    await vi.runOnlyPendingTimersAsync();

    const thumbsUpBtn = window.document.getElementById('thumbsUpBtn');
    thumbsUpBtn.click();

    await vi.runOnlyPendingTimersAsync();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/ratings\/artista-songa/),
      expect.objectContaining({ method: 'POST' })
    );

    const thumbsUpCount = window.document.getElementById('thumbsUpCount');
    expect(thumbsUpCount.textContent).toBe('1');

    const thumbsUpBtnElement = window.document.getElementById('thumbsUpBtn');
    expect(thumbsUpBtnElement.classList.contains('active')).toBe(true);
  });

  it('should handle 409 (already-rated) response', async () => {
    fetchMock.mockImplementation((url, opts) => {
      if (url.includes('metadatav2.json')) {
        return mockResponse({
          artist: 'Artist B',
          title: 'Song B',
        });
      }
      if (url.includes('/api/ratings/')) {
        if (opts?.method === 'POST') {
          return mockResponse({ error: 'already rated' }, 409);
        }
        return mockResponse({
          track_id: 'artist-b-song-b',
          thumbs_up: 3,
          thumbs_down: 1,
          user_rating: 'down',
        });
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });

    await import('../../static/js/main.js');

    await vi.runOnlyPendingTimersAsync();

    const thumbsDownBtn = window.document.getElementById('thumbsDownBtn');
    thumbsDownBtn.click();

    await vi.runOnlyPendingTimersAsync();

    const thumbsDownCount = window.document.getElementById('thumbsDownCount');
    expect(thumbsDownCount.textContent).toBe('1');
  });

  it('should update button states based on user_rating', async () => {
    fetchMock.mockImplementation((url) => {
      if (url.includes('metadatav2.json')) {
        return mockResponse({
          artist: 'Artist C',
          title: 'Song C',
        });
      }
      if (url.includes('/api/ratings/')) {
        return mockResponse({
          track_id: 'artist-c-song-c',
          thumbs_up: 2,
          thumbs_down: 0,
          user_rating: 'up',
        });
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });

    await import('../../static/js/main.js');

    await vi.runOnlyPendingTimersAsync();

    const thumbsUpBtn = window.document.getElementById('thumbsUpBtn');
    const thumbsDownBtn = window.document.getElementById('thumbsDownBtn');

    expect(thumbsUpBtn.classList.contains('active')).toBe(true);
    expect(thumbsDownBtn.classList.contains('active')).toBe(false);
  });

  it('should set test track ID if metadata fails to load after 3 seconds', async () => {
    fetchMock.mockImplementation((url) => {
      if (url.includes('metadatav2.json')) {
        return new Promise(() => {}); // never resolves
      }
      if (url.includes('/api/ratings/test-track')) {
        return mockResponse({
          track_id: 'test-track',
          thumbs_up: 0,
          thumbs_down: 0,
          user_rating: null,
        });
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });

    await import('../../static/js/main.js');

    vi.advanceTimersByTime(3100);
    await vi.runOnlyPendingTimersAsync();

    const artistName = window.document.getElementById('artistName');
    expect(artistName.textContent).toBe('Test Artist');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/ratings\/test-track/)
    );
  });

  it('should not trigger second ratings fetch when track ID does not change', async () => {
    let ratingsCallCount = 0;

    fetchMock.mockImplementation((url, opts) => {
      if (url.includes('metadatav2.json')) {
        return mockResponse({
          artist: 'Same Artist',
          title: 'Same Song',
        });
      }
      if (url.includes('/api/ratings/') && opts?.method !== 'POST') {
        ratingsCallCount++;
        return mockResponse({
          track_id: 'same-artist-same-song',
          thumbs_up: 0,
          thumbs_down: 0,
          user_rating: null,
        });
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });

    await import('../../static/js/main.js');

    await vi.runOnlyPendingTimersAsync();

    const initialRatingsCall = ratingsCallCount;

    vi.advanceTimersByTime(100);
    await vi.runOnlyPendingTimersAsync();

    expect(ratingsCallCount).toBe(initialRatingsCall);
  });
});

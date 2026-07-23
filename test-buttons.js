const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  const networkLogs = [];
  page.on('response', response => {
    networkLogs.push({
      url: response.url(),
      status: response.status(),
      method: response.request().method()
    });
  });

  try {
    console.log('=== Loading app ===');
    const response = await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 10000 });
    console.log(`Initial load: ${response.status()}`);

    await page.waitForTimeout(3000);

    console.log('\n=== Checking initial state ===');
    const thumbsUpCount = await page.locator('#thumbsUpCount').textContent();
    const thumbsDownCount = await page.locator('#thumbsDownCount').textContent();
    console.log(`Thumbs up count: ${thumbsUpCount}`);
    console.log(`Thumbs down count: ${thumbsDownCount}`);

    console.log('\n=== Clicking thumbs up button ===');
    const thumbsUpBtn = page.locator('#thumbsUpBtn');
    await thumbsUpBtn.click();
    await page.waitForTimeout(1000);

    const thumbsUpCountAfter = await page.locator('#thumbsUpCount').textContent();
    console.log(`Thumbs up count after click: ${thumbsUpCountAfter}`);

    console.log('\n=== Checking console for errors ===');
    consoleLogs.forEach(log => {
      console.log(`[${log.type.toUpperCase()}] ${log.text}`);
    });

    console.log('\n=== API Calls ===');
    networkLogs.filter(l => l.url.includes('/api')).forEach(log => {
      console.log(`${log.method} ${log.url} → ${log.status}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
})();

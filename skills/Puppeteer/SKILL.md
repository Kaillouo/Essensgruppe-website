# Puppeteer Skill

## Overview
Puppeteer is a Node.js library for controlling headless (or headed) Chrome/Chromium browsers. This skill covers browser automation, web scraping, testing, and debugging strategies using Puppeteer with MCP (Model Context Protocol) server integration.

---

## When to Use Puppeteer

### ✅ Use Puppeteer For:
- **Dynamic content scraping** - Sites that load data via JavaScript
- **Authentication flows** - Login, session handling, cookies
- **Form automation** - Fill and submit complex forms
- **Screenshot/PDF generation** - Capture page states or generate documents
- **E2E testing** - User flow testing in real browser
- **API unavailable** - When official API doesn't exist or is restricted
- **Page interactions** - Click buttons, scroll, hover, drag-and-drop
- **SPA navigation** - Single-page applications with client-side routing

### ❌ Don't Use Puppeteer For:
- **Static HTML scraping** - Use Cheerio or jsdom (much faster)
- **Official APIs available** - Direct API calls are more reliable
- **High-frequency requests** - Too resource-intensive
- **Simple HTTP requests** - Use axios/fetch instead

---

## Core Concepts

### Browser vs Page
```typescript
// Browser: The entire Chrome instance
const browser = await puppeteer.launch();

// Page: A single tab in the browser
const page = await browser.newPage();

// Always close when done
await browser.close();
```

### Headless vs Headed
```typescript
// Headless (no visible window) - production
const browser = await puppeteer.launch({ headless: true });

// Headed (visible window) - debugging
const browser = await puppeteer.launch({ 
  headless: false,
  devtools: true,    // Open DevTools automatically
  slowMo: 50         // Slow down by 50ms per action
});
```

### Selectors
```typescript
// CSS selector (recommended)
await page.click('#login-button');
await page.type('input[name="username"]', 'myuser');

// XPath (for complex queries)
const [element] = await page.$x('//button[contains(text(), "Submit")]');
await element.click();

// Text content
await page.click('button:has-text("Login")');
```

---

## Essential Patterns

### 1. Navigation & Waiting
```typescript
// Navigate and wait for network idle
await page.goto('https://example.com', { 
  waitUntil: 'networkidle2' // or 'load', 'domcontentloaded', 'networkidle0'
});

// Wait for selector (most reliable)
await page.waitForSelector('#content', { timeout: 5000 });

// Wait for navigation after click
await Promise.all([
  page.waitForNavigation(),
  page.click('#submit-button')
]);

// Wait for custom condition
await page.waitForFunction(() => {
  return document.querySelector('.loading') === null;
});
```

### 2. Extracting Data
```typescript
// Get text content
const title = await page.$eval('h1', el => el.textContent);

// Get multiple elements
const links = await page.$$eval('a', anchors => 
  anchors.map(a => ({ text: a.textContent, href: a.href }))
);

// Get element attribute
const src = await page.$eval('img', el => el.getAttribute('src'));

// Evaluate in page context
const data = await page.evaluate(() => {
  return {
    title: document.title,
    url: window.location.href,
    cookies: document.cookie
  };
});
```

### 3. Form Interactions
```typescript
// Type into input
await page.type('#username', 'myuser', { delay: 100 });

// Select dropdown
await page.select('#country', 'US');

// Click checkbox
await page.click('input[type="checkbox"]');

// Upload file
const input = await page.$('input[type="file"]');
await input.uploadFile('/path/to/file.pdf');

// Submit form
await page.click('button[type="submit"]');
```

### 4. Screenshots & PDFs
```typescript
// Full page screenshot
await page.screenshot({ 
  path: 'screenshot.png', 
  fullPage: true 
});

// Element screenshot
const element = await page.$('#chart');
await element.screenshot({ path: 'chart.png' });

// Generate PDF
await page.pdf({ 
  path: 'page.pdf', 
  format: 'A4',
  printBackground: true 
});
```

### 5. Cookies & Session
```typescript
// Set cookies before navigation
await page.setCookie({
  name: 'session',
  value: 'abc123',
  domain: 'example.com'
});

// Get cookies
const cookies = await page.cookies();

// Clear cookies
await page.deleteCookie(...cookies);

// Save session for reuse
const cookies = await page.cookies();
fs.writeFileSync('cookies.json', JSON.stringify(cookies));

// Load session
const cookies = JSON.parse(fs.readFileSync('cookies.json'));
await page.setCookie(...cookies);
```

---

## Anti-Detection (Stealth)

### Use Puppeteer Extra
```typescript
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled'
  ]
});
```

### Random User Agent
```typescript
await page.setUserAgent(
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
);
```

### Viewport Randomization
```typescript
await page.setViewport({
  width: 1920 + Math.floor(Math.random() * 100),
  height: 1080 + Math.floor(Math.random() * 100),
  deviceScaleFactor: 1
});
```

---

## Error Handling

### Comprehensive Try-Catch
```typescript
const browser = await puppeteer.launch();
const page = await browser.newPage();

try {
  await page.goto('https://example.com', { timeout: 30000 });
  
  // Take screenshot on error for debugging
  const data = await page.evaluate(() => {
    const el = document.querySelector('#data');
    if (!el) throw new Error('Element not found');
    return el.textContent;
  });
  
  return data;
  
} catch (error) {
  // Screenshot on error
  await page.screenshot({ path: 'error.png' });
  console.error('Error:', error.message);
  throw error;
  
} finally {
  await browser.close();
}
```

### Timeout Handling
```typescript
try {
  await page.waitForSelector('#content', { timeout: 5000 });
} catch (error) {
  if (error.name === 'TimeoutError') {
    console.log('Element did not appear in time');
    // Fallback strategy
  }
}
```

### Retry Logic
```typescript
async function retryOperation(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

await retryOperation(async () => {
  await page.goto('https://example.com');
  await page.waitForSelector('#content');
});
```

---

## Performance Optimization

### Block Unnecessary Resources
```typescript
await page.setRequestInterception(true);

page.on('request', (request) => {
  const resourceType = request.resourceType();
  
  // Block images, stylesheets, fonts for faster scraping
  if (['image', 'stylesheet', 'font'].includes(resourceType)) {
    request.abort();
  } else {
    request.continue();
  }
});
```

### Disable JavaScript (when possible)
```typescript
await page.setJavaScriptEnabled(false);
```

### Reuse Browser Instance
```typescript
// DON'T: Launch new browser for each scrape
for (const url of urls) {
  const browser = await puppeteer.launch(); // Slow!
  // ...
  await browser.close();
}

// DO: Reuse browser, create new pages
const browser = await puppeteer.launch();
for (const url of urls) {
  const page = await browser.newPage();
  // ...
  await page.close();
}
await browser.close();
```

---

## Common Scraping Patterns

### Pagination
```typescript
async function scrapeAllPages(startUrl) {
  const allData = [];
  const page = await browser.newPage();
  
  let currentUrl = startUrl;
  
  while (currentUrl) {
    await page.goto(currentUrl);
    
    // Extract data from current page
    const pageData = await page.$$eval('.item', items => 
      items.map(item => item.textContent)
    );
    allData.push(...pageData);
    
    // Find next page link
    currentUrl = await page.$eval('a.next', a => a.href)
      .catch(() => null); // No more pages
  }
  
  await page.close();
  return allData;
}
```

### Infinite Scroll
```typescript
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

await autoScroll(page);
const items = await page.$$eval('.item', items => 
  items.map(item => item.textContent)
);
```

### Login Flow
```typescript
async function login(page, username, password) {
  await page.goto('https://example.com/login');
  
  // Wait for login form
  await page.waitForSelector('input[name="username"]');
  
  // Fill credentials
  await page.type('input[name="username"]', username);
  await page.type('input[name="password"]', password);
  
  // Submit and wait for navigation
  await Promise.all([
    page.waitForNavigation(),
    page.click('button[type="submit"]')
  ]);
  
  // Verify login success
  const isLoggedIn = await page.$('.user-profile') !== null;
  
  if (!isLoggedIn) {
    throw new Error('Login failed');
  }
  
  // Save cookies for session reuse
  const cookies = await page.cookies();
  fs.writeFileSync('session.json', JSON.stringify(cookies));
  
  return cookies;
}
```

### Table Extraction
```typescript
async function extractTable(page, selector) {
  return await page.$$eval(`${selector} tr`, rows => {
    return rows.map(row => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      return cells.map(cell => cell.textContent.trim());
    });
  });
}

// Usage
const tableData = await extractTable(page, '#schedule-table');
// Returns: [['Header1', 'Header2'], ['Row1Col1', 'Row1Col2'], ...]
```

---

## Debugging Strategies

### 1. Visual Debugging
```typescript
const browser = await puppeteer.launch({
  headless: false,  // See the browser
  devtools: true,   // DevTools open
  slowMo: 250       // Slow down actions by 250ms
});
```

### 2. Console Logs
```typescript
// Forward browser console to Node console
page.on('console', msg => console.log('Browser:', msg.text()));

// Your page code can now log
await page.evaluate(() => {
  console.log('Current URL:', window.location.href);
});
```

### 3. Screenshot on Each Step
```typescript
let stepCount = 0;

async function debugStep(page, description) {
  await page.screenshot({ path: `debug-${stepCount}-${description}.png` });
  stepCount++;
}

await page.goto('https://example.com');
await debugStep(page, 'after-navigation');

await page.click('#button');
await debugStep(page, 'after-click');
```

### 4. Network Monitoring
```typescript
page.on('request', request => {
  console.log('Request:', request.url());
});

page.on('response', response => {
  console.log('Response:', response.status(), response.url());
});
```

### 5. Pause Execution
```typescript
// Wait for manual interaction
await page.evaluate(() => debugger);

// Or use explicit pause
await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 min
```

---

## MCP Server Integration

### Why MCP for Puppeteer?
- **Interactive debugging:** Claude Code can control browser in real-time
- **Reusable:** One server, many projects
- **Live feedback:** See browser actions as Claude Code executes
- **Iterative development:** Claude Code sees failures, adjusts strategy

### MCP Server Architecture
```
Your PC:
├── puppeteer-mcp-server/ (runs in background)
│   ├── Listens for MCP commands
│   ├── Executes Puppeteer actions
│   └── Returns results/screenshots
│
└── Claude Code session
    ├── Connects to MCP server
    ├── Sends: "Navigate to X", "Click Y", "Extract Z"
    └── Receives: Results, errors, screenshots
```

### Server Capabilities
The Puppeteer MCP server should expose these tools:

**Navigation:**
- `navigate(url)` - Go to URL
- `go_back()` - Browser back button
- `reload()` - Refresh page

**Interaction:**
- `click(selector)` - Click element
- `type(selector, text)` - Type into input
- `select(selector, value)` - Select dropdown option
- `upload(selector, filepath)` - Upload file

**Extraction:**
- `get_text(selector)` - Get text content
- `get_attribute(selector, attribute)` - Get attribute value
- `extract_table(selector)` - Parse table to JSON
- `evaluate(code)` - Run JavaScript in page context

**State:**
- `screenshot(path?)` - Capture screenshot
- `get_cookies()` - Get all cookies
- `set_cookies(cookies)` - Set cookies
- `get_html()` - Get page HTML

**Waiting:**
- `wait_for_selector(selector, timeout?)` - Wait for element
- `wait_for_navigation()` - Wait for page load

**Debugging:**
- `set_headless(boolean)` - Toggle visible browser
- `set_slow_mo(ms)` - Slow down actions
- `get_console_logs()` - Get browser console output

---

## Best Practices Summary

### ✅ Always Do:
- Use `waitForSelector` instead of `setTimeout`
- Close browsers in `finally` blocks
- Set reasonable timeouts (5-30 seconds)
- Handle navigation with `Promise.all([waitForNavigation(), click()])`
- Use stealth plugin for scraping
- Take screenshots on errors
- Reuse browser instances when scraping multiple pages

### ❌ Never Do:
- Use `page.waitFor()` - deprecated, use `waitForTimeout`
- Forget to close browser (memory leak)
- Use `sleep()` - always wait for elements/events
- Scrape without checking robots.txt
- Run headless in debugging (can't see what's wrong)
- Ignore TimeoutErrors (usually means selector is wrong)

### 🎯 Performance Tips:
- Block unnecessary resources (images, fonts)
- Disable CSS when not needed
- Reuse browser instances
- Use connection pooling for parallel scraping
- Set viewport to minimum needed size

### 🔒 Security Tips:
- Never commit credentials
- Use environment variables for secrets
- Rotate user agents
- Add random delays between requests
- Respect rate limits
- Check site's terms of service

---

## Common Issues & Solutions

### Issue: Element not found
```typescript
// Problem: Selector is wrong or element not loaded
await page.click('#button'); // Error!

// Solution: Wait for element first
await page.waitForSelector('#button', { visible: true });
await page.click('#button');
```

### Issue: Navigation timeout
```typescript
// Problem: Page takes too long to load
await page.goto(url); // Timeout after 30s

// Solution: Increase timeout or wait for specific event
await page.goto(url, { 
  waitUntil: 'domcontentloaded', // Don't wait for all resources
  timeout: 60000 
});
```

### Issue: Click not working
```typescript
// Problem: Element is covered or not clickable
await page.click('#button'); // Nothing happens

// Solutions:
// 1. Scroll into view
await page.$eval('#button', el => el.scrollIntoView());
await page.click('#button');

// 2. Wait for element to be clickable
await page.waitForSelector('#button', { visible: true });
await page.click('#button');

// 3. Use JavaScript click
await page.$eval('#button', el => el.click());
```

### Issue: Dynamic content not appearing
```typescript
// Problem: Content loads via AJAX after page load
await page.goto(url);
const data = await page.$eval('#data', el => el.textContent); // null!

// Solution: Wait for the dynamic content
await page.goto(url);
await page.waitForSelector('#data');
const data = await page.$eval('#data', el => el.textContent);
```

---

## Example: Complete Scraping Script

```typescript
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function scrapeWebsite(url: string) {
  const browser = await puppeteer.launch({
    headless: false, // Set to true in production
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Navigate to page
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for content
    await page.waitForSelector('.content');
    
    // Extract data
    const data = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.item'));
      return items.map(item => ({
        title: item.querySelector('h2')?.textContent?.trim(),
        description: item.querySelector('p')?.textContent?.trim(),
        link: item.querySelector('a')?.href
      }));
    });
    
    console.log(`Scraped ${data.length} items`);
    return data;
    
  } catch (error) {
    // Screenshot on error
    await page.screenshot({ path: 'error.png', fullPage: true });
    console.error('Scraping failed:', error);
    throw error;
    
  } finally {
    await browser.close();
  }
}

// Usage
scrapeWebsite('https://example.com')
  .then(data => console.log(data))
  .catch(error => console.error(error));
```

---

## Resources

### Official Documentation
- Puppeteer API: https://pptr.dev/api
- Puppeteer Extra: https://github.com/berstend/puppeteer-extra

### Useful Selectors
- CSS Selector Guide: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors
- XPath Cheatsheet: https://devhints.io/xpath

### Testing Selectors
- Browser DevTools ($() in console)
- Selector Hub browser extension
- ChroPath extension

---

## Conclusion

Puppeteer is powerful for browser automation but requires careful handling of timing, errors, and resource management. Always test selectors in browser DevTools first, use explicit waits instead of sleeps, and implement proper error handling with screenshots for debugging.

When integrated with MCP server, Claude Code can interactively control the browser, see results in real-time, and iteratively fix issues - making development much faster than traditional scripting.
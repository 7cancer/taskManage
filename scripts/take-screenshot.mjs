import { chromium } from 'playwright-core';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = resolve(__dirname, '../samples/christmas-party-sample.csv');
const outputPath = resolve(__dirname, '../docs/gantt-chart-sample.png');

const csvText = readFileSync(csvPath, 'utf-8');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 1000 });

// Navigate to the dev server
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

// Import CSV data via the store
await page.evaluate((csv) => {
  // Access the Zustand store and the import function
  // We need to call importTasksFromCsvText and setSnapshot
  // The store is accessible via window (Zustand devtools) or we can trigger file import programmatically

  // Create a fake file and trigger the file input
  const dataTransfer = new DataTransfer();
  const file = new File([csv], 'christmas-party-sample.csv', { type: 'text/csv' });
  dataTransfer.items.add(file);

  const fileInput = document.querySelector('input[type="file"]');
  if (fileInput) {
    Object.defineProperty(fileInput, 'files', { value: dataTransfer.files });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  }
}, csvText);

// Wait for the data to load and chart to render
await page.waitForTimeout(2000);

// Ensure we're on the Gantt tab (default view)
const ganttTab = page.getByRole('tab', { name: 'ガント' });
if (await ganttTab.isVisible()) {
  await ganttTab.click();
}

await page.waitForTimeout(500);

// Set the view start date to November 2026 to show Christmas party tasks
const dateInput = page.locator('input[type="date"]');
await dateInput.fill('2026-11-01');
await dateInput.dispatchEvent('change');

await page.waitForTimeout(500);

// Change period to 3 months for better visibility
const periodSelect = page.locator('select').first();
await periodSelect.selectOption('3m');

await page.waitForTimeout(1500);

// Take a full page screenshot first, then crop to the relevant area
await page.screenshot({
  path: outputPath,
  fullPage: false,
  clip: { x: 0, y: 0, width: 1440, height: 900 },
});

console.log(`Screenshot saved to: ${outputPath}`);

await browser.close();

import { Page } from '@playwright/test';
import path from 'path';

export const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/test-results/screenshots');

export async function takeScreenshots(page: Page, pageName: string) {
  // Desktop screenshot (already at 1280x720 for desktop project)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, `${pageName}--desktop.png`),
    fullPage: false,
  });
}

export async function takeScreenshotMobile(page: Page, pageName: string) {
  // Mobile screenshot (375x667 for mobile project)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, `${pageName}--mobile.png`),
    fullPage: false,
  });
}

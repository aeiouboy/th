#!/usr/bin/env node
/**
 * Timesheet User Manual — MD → HTML → PDF generator
 * Uses: marked (markdown parser) + puppeteer (PDF)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = __dirname;
const MD_PATH = path.join(DOCS_DIR, 'timesheet-user-manual.md');
const HTML_PATH = path.join(DOCS_DIR, 'timesheet-user-manual.html');
const PDF_PATH = path.join(DOCS_DIR, 'timesheet-user-manual.pdf');
const SCREENSHOTS_DIR = path.join(DOCS_DIR, 'manual-screenshots');

// ── Step 1: Read markdown ──────────────────────────────────────────
const md = fs.readFileSync(MD_PATH, 'utf-8');

// ── Step 2: Convert images to base64 ──────────────────────────────
function imgToBase64(imgPath) {
  const abs = path.resolve(DOCS_DIR, imgPath);
  if (!fs.existsSync(abs)) {
    // Try alternate location
    const alt = path.resolve(DOCS_DIR, '..', imgPath);
    if (fs.existsSync(alt)) {
      const buf = fs.readFileSync(alt);
      return `data:image/png;base64,${buf.toString('base64')}`;
    }
    console.warn(`⚠ Image not found: ${imgPath}`);
    return imgPath;
  }
  const buf = fs.readFileSync(abs);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

// ── Step 3: Simple markdown → HTML converter ──────────────────────
function convertMarkdown(src) {
  let html = '';
  const lines = src.split('\n');
  let inTable = false;
  let inCodeBlock = false;
  let inList = false;
  let listType = null; // 'ul' or 'ol'
  let inBlockquote = false;

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function inlineFormat(s) {
    // Images: ![alt](src)
    s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
      const b64 = imgToBase64(src);
      return `<img src="${b64}" alt="${escapeHtml(alt)}" />`;
    });
    // Links: [text](href)
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    // Bold + italic: ***text*** or ___text___
    s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    // Bold: **text**
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    s = s.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    // Code: `text`
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    return s;
  }

  function closeList() {
    if (inList) {
      html += listType === 'ol' ? '</ol>\n' : '</ul>\n';
      inList = false;
      listType = null;
    }
  }

  function closeBlockquote() {
    if (inBlockquote) {
      html += '</blockquote>\n';
      inBlockquote = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      closeList();
      closeBlockquote();
      if (!inCodeBlock) {
        inCodeBlock = true;
        html += '<pre><code>';
      } else {
        inCodeBlock = false;
        html += '</code></pre>\n';
      }
      continue;
    }
    if (inCodeBlock) {
      html += escapeHtml(line) + '\n';
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      closeList();
      closeBlockquote();
      continue;
    }

    // Horizontal rule
    if (/^-{3,}$/.test(line.trim()) || /^\*{3,}$/.test(line.trim())) {
      closeList();
      closeBlockquote();
      // Don't render as visible hr between sections — just spacing
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      closeList();
      closeBlockquote();
      if (inTable) { html += '</tbody></table>\n'; inTable = false; }
      const level = headingMatch[1].length;
      const text = inlineFormat(headingMatch[2]);
      const cls = level === 2 ? ' class="section-break"' : '';
      html += `<h${level}${cls}>${text}</h${level}>\n`;
      continue;
    }

    // Table
    if (line.trim().startsWith('|')) {
      closeList();
      closeBlockquote();
      const cells = line.split('|').slice(1, -1).map(c => c.trim());

      // Check if separator row
      if (cells.every(c => /^[-:]+$/.test(c))) {
        continue; // skip separator
      }

      if (!inTable) {
        inTable = true;
        html += '<table><thead><tr>';
        cells.forEach(c => { html += `<th>${inlineFormat(c)}</th>`; });
        html += '</tr></thead><tbody>\n';
      } else {
        html += '<tr>';
        cells.forEach(c => { html += `<td>${inlineFormat(c)}</td>`; });
        html += '</tr>\n';
      }
      continue;
    } else if (inTable) {
      html += '</tbody></table>\n';
      inTable = false;
    }

    // Blockquote
    if (line.startsWith('>')) {
      closeList();
      const content = line.replace(/^>\s*/, '');
      if (!inBlockquote) {
        inBlockquote = true;
        html += '<blockquote>\n';
      }
      html += `<p>${inlineFormat(content)}</p>\n`;
      continue;
    } else {
      closeBlockquote();
    }

    // Ordered list
    const olMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        closeList();
        html += '<ol>\n';
        inList = true;
        listType = 'ol';
      }
      html += `<li>${inlineFormat(olMatch[2])}</li>\n`;
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[-*]\s+(.+)/);
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        closeList();
        html += '<ul>\n';
        inList = true;
        listType = 'ul';
      }
      html += `<li>${inlineFormat(ulMatch[1])}</li>\n`;
      continue;
    }

    // Indented list continuation (sub-items)
    const indentedItem = line.match(/^\s{2,}[-*]\s+(.+)/);
    if (indentedItem && inList) {
      html += `<li class="sub-item">${inlineFormat(indentedItem[1])}</li>\n`;
      continue;
    }

    // Indented ordered sub-item
    const indentedOl = line.match(/^\s{2,}(\d+)\.\s+(.+)/);
    if (indentedOl && inList) {
      html += `<li class="sub-item">${inlineFormat(indentedOl[2])}</li>\n`;
      continue;
    }

    // Regular paragraph
    closeList();
    html += `<p>${inlineFormat(line)}</p>\n`;
  }

  closeList();
  closeBlockquote();
  if (inTable) html += '</tbody></table>\n';

  return html;
}

// ── Step 4: Build full HTML document ──────────────────────────────
const bodyHtml = convertMarkdown(md);

const fullHtml = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>คู่มือการใช้งานระบบ Timesheet</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');

/* ── Page / Print ─────────────────────────────── */
@page {
  size: A4;
  margin: 2cm;
  @bottom-center {
    content: "หน้า " counter(page) " / " counter(pages);
    font-family: 'Sarabun', sans-serif;
    font-size: 10px;
    color: #888;
  }
}

@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .section-break { page-break-before: always; }
  table { page-break-inside: avoid; }
  img { page-break-inside: avoid; }
  h2, h3 { page-break-after: avoid; }
}

/* ── Base ──────────────────────────────────────── */
* { box-sizing: border-box; }

body {
  font-family: 'Sarabun', -apple-system, 'Noto Sans Thai', sans-serif;
  font-size: 14px;
  line-height: 1.8;
  color: #1a1a2e;
  max-width: 210mm;
  margin: 0 auto;
  padding: 20px;
}

/* Minimum font size enforcement */
body, p, li, td, th, blockquote, code {
  font-size: max(13px, 0.85rem);
}

/* ── Typography ───────────────────────────────── */
h1 {
  color: #1a1a2e;
  border-bottom: 3px solid #00a5e0;
  padding-bottom: 10px;
  font-size: 28px;
  font-weight: 700;
  margin-top: 0;
}

h2 {
  color: #16213e;
  margin-top: 36px;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 6px;
  font-size: 22px;
  font-weight: 700;
}

h2.section-break {
  page-break-before: always;
}

/* First h2 (สารบัญ) should NOT page-break */
h1 + h2.section-break,
h2.section-break:first-of-type {
  page-break-before: auto;
}

h3 {
  color: #0f3460;
  font-size: 17px;
  font-weight: 600;
  margin-top: 24px;
}

h4 { font-size: 15px; font-weight: 600; }

p { margin: 8px 0; }

/* ── Images ───────────────────────────────────── */
img {
  max-width: 100%;
  border: 1px solid #ddd;
  border-radius: 6px;
  margin: 14px 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  display: block;
}

/* ── Tables ───────────────────────────────────── */
table {
  border-collapse: collapse;
  width: 100%;
  margin: 12px 0;
  font-size: 13px;
}

th, td {
  border: 1px solid #d0d7de;
  padding: 7px 10px;
  text-align: left;
  vertical-align: top;
}

th {
  background: #f0f4f8;
  font-weight: 600;
  color: #16213e;
}

tr:nth-child(even) {
  background: #f9fafb;
}

/* ── Code ─────────────────────────────────────── */
code {
  background: #f0f0f0;
  padding: 1px 5px;
  border-radius: 3px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12.5px;
}

pre {
  background: #f6f8fa;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  padding: 14px 18px;
  overflow-x: auto;
  line-height: 1.5;
}

pre code {
  background: none;
  padding: 0;
  font-size: 12.5px;
}

/* ── Blockquote ───────────────────────────────── */
blockquote {
  border-left: 3px solid #00a5e0;
  padding: 8px 14px;
  margin: 12px 0;
  background: #f8f9fa;
  border-radius: 0 6px 6px 0;
}

blockquote p {
  margin: 4px 0;
}

/* ── Lists ────────────────────────────────────── */
ul, ol {
  padding-left: 24px;
  margin: 8px 0;
}

li {
  margin: 4px 0;
}

li.sub-item {
  margin-left: 20px;
  list-style-type: circle;
}

/* ── Links ────────────────────────────────────── */
a {
  color: #00a5e0;
  text-decoration: none;
}

/* ── Cover / Header ───────────────────────────── */
h1:first-of-type {
  text-align: center;
  font-size: 32px;
  border-bottom: 3px solid #00a5e0;
  padding-bottom: 14px;
  margin-bottom: 10px;
}

/* Version info blockquote right after h1 */
h1 + blockquote {
  text-align: center;
  border-left: none;
  background: #eef6fb;
  border-radius: 8px;
  padding: 12px;
}

/* ── Status badges ────────────────────────────── */
strong {
  color: #16213e;
}

/* Emoji badges in headings */
h2 .emoji-badge, h3 .emoji-badge {
  font-size: 0.85em;
}

/* ── Footer ───────────────────────────────────── */
.page-footer {
  text-align: center;
  margin-top: 40px;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
  color: #888;
  font-size: 12px;
}
</style>
</head>
<body>
${bodyHtml}
<div class="page-footer">
  RIS Timesheet &amp; Cost Allocation System — คู่มือการใช้งาน v4.0 — มีนาคม 2026
</div>
</body>
</html>`;

fs.writeFileSync(HTML_PATH, fullHtml, 'utf-8');
console.log(`✅ HTML written: ${HTML_PATH} (${(fs.statSync(HTML_PATH).size / 1024).toFixed(0)} KB)`);

// ── Step 5: Generate PDF with Puppeteer ───────────────────────────
try {
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Load HTML file
  await page.goto(`file://${HTML_PATH}`, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for fonts to load
  await page.evaluateHandle('document.fonts.ready');

  await page.pdf({
    path: PDF_PATH,
    format: 'A4',
    margin: { top: '2cm', right: '2cm', bottom: '2.5cm', left: '2cm' },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `
      <div style="width:100%;text-align:center;font-size:9px;color:#888;font-family:'Sarabun',sans-serif;">
        <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>`,
  });

  await browser.close();

  const pdfSize = fs.statSync(PDF_PATH).size;
  console.log(`✅ PDF written: ${PDF_PATH} (${(pdfSize / 1024).toFixed(0)} KB)`);
  console.log(`📄 Method: Puppeteer (headless Chrome)`);
} catch (err) {
  console.error('❌ Puppeteer failed:', err.message);
  console.log('Trying wkhtmltopdf...');
  try {
    const { execSync } = await import('child_process');
    execSync(`wkhtmltopdf --page-size A4 --margin-top 20mm --margin-bottom 25mm --margin-left 20mm --margin-right 20mm --enable-local-file-access "${HTML_PATH}" "${PDF_PATH}"`);
    const pdfSize = fs.statSync(PDF_PATH).size;
    console.log(`✅ PDF written: ${PDF_PATH} (${(pdfSize / 1024).toFixed(0)} KB)`);
    console.log(`📄 Method: wkhtmltopdf`);
  } catch (err2) {
    console.error('❌ wkhtmltopdf also failed:', err2.message);
    console.log('💡 HTML file is ready — open in Chrome and print to PDF manually.');
  }
}

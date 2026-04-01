import { chromium } from "playwright";
import TurndownService from "turndown";
import * as cheerio from "cheerio";

const DELAY_MS = 1000;
const PAGE_TIMEOUT_MS = 30000;

interface CrawlConfig {
  startUrl: string;
  maxDepth: number;
  followExternal: boolean;
  outputFormat: "markdown" | "pdf";
  onProgress: (scraped: number, found: number, currentUrl: string) => void;
}

interface CrawledPage {
  url: string;
  title: string;
  content: string;
  markdown: string;
  depth: number;
  isExternal: boolean;
}

function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    let path = u.pathname;
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    u.pathname = path;
    return u.toString();
  } catch {
    return raw;
  }
}

function isSameOriginAndPath(startUrl: string, linkUrl: string): boolean {
  try {
    const start = new URL(startUrl);
    const link = new URL(linkUrl);
    // Must be same hostname (subdomain-aware)
    if (start.hostname !== link.hostname) return false;
    // Link must be under the same base path as startUrl
    // e.g. startUrl = https://docs.example.com/guide
    //   -> /guide/page1 = OK, /other = NOT OK
    // But if startUrl is root (/) then all paths are OK
    const basePath = start.pathname === '/' ? '/' : start.pathname.replace(/\/$/, '');
    if (basePath === '/') return true;
    return link.pathname === basePath || link.pathname.startsWith(basePath + '/');
  } catch {
    return false;
  }
}

function cleanHtml(html: string): string {
  const $ = cheerio.load(html);

  $("nav, footer, header, script, style, noscript, iframe, svg").remove();

  const removeSelectors = [
    "[class*='nav']",
    "[class*='menu']",
    "[class*='sidebar']",
    "[class*='footer']",
    "[class*='cookie']",
    "[class*='banner']",
    "[class*='ad-']",
    "[id*='nav']",
    "[id*='menu']",
    "[id*='sidebar']",
    "[id*='footer']",
    "[id*='cookie']",
    "[id*='banner']",
  ];

  for (const sel of removeSelectors) {
    $(sel).remove();
  }

  const main = $("main, article, [role='main']").first();
  if (main.length > 0) {
    return main.html() ?? $.html();
  }

  return $("body").html() ?? $.html();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function crawlSite(config: CrawlConfig): Promise<CrawledPage[]> {
  const { startUrl, maxDepth, followExternal, onProgress } = config;
  const turndown = new TurndownService({ headingStyle: "atx" });

  const visited = new Set<string>();
  const queue: Array<{ url: string; depth: number; isExternal: boolean }> = [];
  const results: CrawledPage[] = [];

  const normalizedStart = normalizeUrl(startUrl);
  queue.push({ url: normalizedStart, depth: 0, isExternal: false });
  visited.add(normalizedStart);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (compatible; SkillForge/1.0; +https://github.com/skillforge)",
  });

  try {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      const { url, depth, isExternal } = item;
      onProgress(results.length, results.length + queue.length + 1, url);

      const page = await context.newPage();
      try {
        await page.goto(url, {
          waitUntil: "networkidle",
          timeout: PAGE_TIMEOUT_MS,
        });

        const title = await page.title();
        const bodyHtml = await page.content();
        const cleaned = cleanHtml(bodyHtml);
        const markdown = turndown.turndown(cleaned);

        results.push({
          url,
          title: title || url,
          content: cleaned,
          markdown,
          depth,
          isExternal,
        });

        if (!isExternal && depth < maxDepth) {
          const links = await page.evaluate(() =>
            Array.from(document.querySelectorAll("a[href]"))
              .map((a) => (a as HTMLAnchorElement).href)
              .filter((href) => href.startsWith("http"))
          );

          for (const link of links) {
            const normalized = normalizeUrl(link);
            if (visited.has(normalized)) continue;
            visited.add(normalized);

            const linkIsExternal = !isSameOriginAndPath(startUrl, normalized);

            if (linkIsExternal) {
              if (followExternal) {
                queue.push({ url: normalized, depth: 0, isExternal: true });
              }
            } else {
              queue.push({
                url: normalized,
                depth: depth + 1,
                isExternal: false,
              });
            }
          }
        }
      } catch {
        // skip pages that fail to load
      } finally {
        await page.close();
      }

      await sleep(DELAY_MS);
    }
  } finally {
    await browser.close();
  }

  return results;
}

export function buildMarkdownOutput(
  siteTitle: string,
  startUrl: string,
  pages: CrawledPage[]
): string {
  const lines: string[] = [];
  const date = new Date().toISOString().split("T")[0];

  lines.push(`# Documentation : ${siteTitle}`);
  lines.push(`> Source : ${startUrl}`);
  lines.push(`> Généré le : ${date}`);
  lines.push(`> Pages scrapées : ${pages.length}`);
  lines.push("");
  lines.push("## Table des matières");

  pages.forEach((page, i) => {
    const anchor = `page-${i + 1}`;
    lines.push(`- [Page ${i + 1} - ${page.title}](#${anchor})`);
  });

  lines.push("");
  lines.push("---");

  pages.forEach((page, i) => {
    lines.push("");
    lines.push(`## Page ${i + 1} : ${page.title}`);
    lines.push(`> URL : ${page.url}`);
    lines.push("");
    lines.push(page.markdown);
    lines.push("");
    lines.push("---");
  });

  return lines.join("\n");
}

export async function buildPdfOutput(
  markdownContent: string
): Promise<Buffer> {
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { border-bottom: 2px solid #333; padding-bottom: 8px; }
    h2 { border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-top: 2em; }
    blockquote { border-left: 3px solid #ccc; padding-left: 12px; color: #666; }
    pre { background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; }
    code { background: #f5f5f5; padding: 2px 4px; border-radius: 2px; }
    hr { border: none; border-top: 1px solid #eee; margin: 2em 0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  </style>
</head>
<body>${markdownToHtml(markdownContent)}</body>
</html>`;

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: "A4",
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
      displayHeaderFooter: true,
      headerTemplate:
        '<div style="font-size:8px;width:100%;text-align:center;color:#999;">SkillForge Documentation</div>',
      footerTemplate:
        '<div style="font-size:8px;width:100%;text-align:center;color:#999;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function markdownToHtml(md: string): string {
  let html = md;

  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");
  html = html.replace(/^---$/gm, "<hr>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(
    /^\- \[([^\]]+)\]\(#([^)]+)\)$/gm,
    '<li><a href="#$2">$1</a></li>'
  );
  html = html.replace(/^\- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/\n\n/g, "</p><p>");
  html = `<p>${html}</p>`;

  return html;
}

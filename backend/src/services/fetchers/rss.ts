// backend/src/services/fetchers/rss.ts
import { XMLParser } from 'fast-xml-parser';

export interface RssJob {
  externalId: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  postedAt: Date;
  source: 'google_alerts';
}

// Strip all HTML tags from a string
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '').trim();
}

// Try to extract company name from title
// e.g. "Software Engineer at Stripe - LinkedIn" → "Stripe"
// e.g. "Software Engineer II - JPMorgan Chase | Careers" → "JPMorgan Chase"
function extractCompany(title: string): string {
  const atMatch = title.match(/\bat\s+([A-Z][^\-\|\n]+?)(?:\s*[\-\|]|$)/);
  if (atMatch) return atMatch[1].trim();

  const dashMatch = title.match(/[-–]\s*([A-Z][A-Za-z0-9\s&\.]+?)(?:\s*\||$)/);
  if (dashMatch) return dashMatch[1].trim();

  const pipeMatch = title.match(/\|\s*([A-Z][A-Za-z0-9\s&\.]+?)(?:\s*\||$)/);
  if (pipeMatch) return pipeMatch[1].trim();

  return 'Unknown';
}

// Try to extract location from title or content
function extractLocation(title: string, content: string): string {
  const combined = `${title} ${content}`;

  const inMatch = combined.match(/\bin\s+([A-Z][a-z]+(?:,\s*[A-Z][a-zA-Z\s]+)?)/);
  if (inMatch) return inMatch[1].trim();

  if (/remote/i.test(combined)) return 'Remote';

  return 'United States';
}

export async function fetchRssFeed(feedUrl: string, feedName: string): Promise<RssJob[]> {
  try {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobPulse/1.0)',
        'Accept': 'application/atom+xml, application/xml, text/xml',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(`RSS feed "${feedName}" returned status ${response.status}`);
      return [];
    }

    const xml = await response.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
    });

    const parsed = parser.parse(xml);
    const entries = parsed?.feed?.entry;

    if (!entries) {
      console.log(`No entries found in RSS feed "${feedName}"`);
      return [];
    }

    // Single entry comes as object, multiple as array - normalize to array
    const entryArray = Array.isArray(entries) ? entries : [entries];

    const jobs: RssJob[] = entryArray.map((entry: any) => {
      const rawTitle = stripHtml(entry.title?.['#text'] || entry.title || '');
      const rawContent = stripHtml(entry.content?.['#text'] || entry.content || '');
      const rawId = String(entry.id || '');

      // Google Alerts wraps actual URL in a redirect - keep it as-is
      const linkHref =
        entry.link?.['@_href'] ||
        (Array.isArray(entry.link) ? entry.link[0]?.['@_href'] : '') ||
        '';

      const postedAt = entry.published ? new Date(entry.published) : new Date();

      return {
        externalId: rawId,
        title: rawTitle,
        company: extractCompany(rawTitle),
        location: extractLocation(rawTitle, rawContent),
        url: linkHref,
        description: rawContent,
        postedAt,
        source: 'google_alerts' as const,
      };
    });

    return jobs;
  } catch (err: any) {
    console.error(`Error fetching RSS feed "${feedName}":`, err.message);
    return [];
  }
}
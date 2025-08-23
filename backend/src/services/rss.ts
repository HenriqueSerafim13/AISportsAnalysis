import Parser from "rss-parser";
import fetch from "node-fetch";
import { decode } from "iconv-lite";
import chardet from "chardet";
import { Feed, Article, generateLinkTimestampHash } from "../types";

// Lightweight cleaner (no encoding hacks here anymore)
function cleanText(text: string): string {
  if (!text) return "";

  let cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  cleaned = cleaned.replace(/\uFFFD/g, "");

  // Decode basic HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  return cleaned.replace(/\s+/g, " ").trim();
}

export class RSSService {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      customFields: {
        item: [
          ["media:content", "media:content", { keepArray: true }],
          ["media:thumbnail", "media:thumbnail", { keepArray: true }],
        ],
      },
    });
  }

  async fetchFeed(url: string): Promise<{ feed: Feed; articles: Article[] }> {
    try {
      console.log(`Fetching RSS feed: ${url}`);

      const res = await fetch(url, {
        headers: {
          "User-Agent": "Sports-Analysis-App/1.0",
          Accept: "application/rss+xml, application/xml, text/xml, */*",
        },
      });

      const buffer = Buffer.from(await res.arrayBuffer());

      // Detect encoding or fallback to UTF-8
      const encoding = chardet.detect(buffer) || "utf8";
      console.log(`Detected encoding: ${encoding}`);

      const text = decode(buffer, encoding);

      // Parse decoded XML string
      const parsedFeed = await this.parser.parseString(text);

      const feed: Feed = {
        url,
        title: cleanText(parsedFeed.title || "Unknown Feed"),
        description: cleanText(parsedFeed.description || ""),
        enabled: true,
      };

      const articles: Article[] = (parsedFeed.items || []).map((item, index) => {
        const cleanedTitle = cleanText(item.title || `Article ${index + 1}`);
        const cleanedContent = cleanText(item.content || item.contentSnippet || "");
        const cleanedSummary = cleanText(item.contentSnippet || "");
        const cleanedAuthor = cleanText(item.creator || item.author || "");

        if (index < 3 && item.title) {
          console.log(`Article ${index + 1} - Original: "${item.title.substring(0, 50)}..."`);
          console.log(`Article ${index + 1} - Cleaned: "${cleanedTitle.substring(0, 50)}..."`);
        }

        const publishedAt = item.pubDate || item.isoDate || new Date().toISOString();
        return {
          feed_id: 0,
          title: cleanedTitle,
          link: item.link || "",
          link_timestamp_hash: generateLinkTimestampHash(item.link || "", publishedAt),
          content: cleanedContent,
          summary: cleanedSummary,
          author: cleanedAuthor,
          published_at: publishedAt,
          raw_json: JSON.stringify(item),
        };
      });

      console.log(`Fetched ${articles.length} articles from ${url}`);
      return { feed, articles };
    } catch (error) {
      console.error(`Failed to fetch RSS feed ${url}:`, error);
      throw new Error(`Failed to fetch RSS feed: ${error}`);
    }
  }

  async validateFeed(url: string): Promise<boolean> {
    try {
      const res = await fetch(url);
      const buffer = Buffer.from(await res.arrayBuffer());
      const encoding = chardet.detect(buffer) || "utf8";
      const text = decode(buffer, encoding);

      await this.parser.parseString(text);
      return true;
    } catch (error) {
      console.error(`Invalid RSS feed ${url}:`, error);
      return false;
    }
  }
}

export default new RSSService();

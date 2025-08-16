import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders } from '../_shared/security.ts';

interface CrawlRequest {
  baseUrl: string;
  maxPages?: number;
}

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

interface CrawlResult {
  success: boolean;
  crawled: number;
  queued: number;
  errors: string[];
  sourceId?: string;
}

// Keywords to match for camp/program content
const CAMP_KEYWORDS = ['camp', 'session', 'summer', 'program', 'register', 'youth'];

class RobotsChecker {
  private cache: Map<string, { allowed: boolean; expiry: number }> = new Map();
  
  async isAllowed(url: string): Promise<boolean> {
    try {
      const hostname = new URL(url).hostname;
      const cached = this.cache.get(hostname);
      
      if (cached && cached.expiry > Date.now()) {
        return cached.allowed;
      }
      
      const robotsUrl = `https://${hostname}/robots.txt`;
      const response = await fetch(robotsUrl, {
        headers: { 'User-Agent': 'CampScheduleBot/1.0' },
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        // No robots.txt found - assume allowed
        this.cache.set(hostname, { allowed: true, expiry: Date.now() + 3600000 });
        return true;
      }
      
      const robotsText = await response.text();
      const allowed = !this.isDisallowed(robotsText, url);
      
      this.cache.set(hostname, { allowed, expiry: Date.now() + 3600000 });
      return allowed;
    } catch (error) {
      console.error('Robots check failed:', error);
      return false; // Conservative approach
    }
  }
  
  private isDisallowed(robotsText: string, url: string): boolean {
    const lines = robotsText.split('\n');
    let userAgentMatch = false;
    
    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      
      if (trimmed.startsWith('user-agent:')) {
        const agent = trimmed.split(':')[1].trim();
        userAgentMatch = agent === '*' || agent.includes('bot');
        continue;
      }
      
      if (userAgentMatch && trimmed.startsWith('disallow:')) {
        const path = trimmed.split(':')[1].trim();
        if (path === '/' || path === '') {
          return true; // Site disallows all crawling
        }
        
        const urlPath = new URL(url).pathname;
        if (urlPath.startsWith(path)) {
          return true;
        }
      }
    }
    
    return false;
  }
}

class RateLimiter {
  private hostLimits: Map<string, { lastRequest: number; delay: number }> = new Map();
  
  async waitIfNeeded(url: string): Promise<void> {
    const hostname = new URL(url).hostname;
    const limit = this.hostLimits.get(hostname) || { lastRequest: 0, delay: 1000 };
    
    const timeSinceLastRequest = Date.now() - limit.lastRequest;
    if (timeSinceLastRequest < limit.delay) {
      const waitTime = limit.delay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.hostLimits.set(hostname, {
      lastRequest: Date.now(),
      delay: Math.min(limit.delay * 1.1, 5000) // Gradually increase delay
    });
  }
}

class WebCrawler {
  private robotsChecker = new RobotsChecker();
  private rateLimiter = new RateLimiter();
  private concurrency = 2;
  private activeRequests = new Map<string, number>();
  
  async crawlSite(supabase: any, baseUrl: string, maxPages = 50): Promise<CrawlResult> {
    const result: CrawlResult = {
      success: false,
      crawled: 0,
      queued: 0,
      errors: []
    };
    
    try {
      console.log(`Starting crawl of ${baseUrl}`);
      
      // Create or get source record
      const sourceId = await this.ensureSource(supabase, baseUrl);
      result.sourceId = sourceId;
      
      // Check robots.txt for base domain
      const robotsAllowed = await this.robotsChecker.isAllowed(baseUrl);
      if (!robotsAllowed) {
        throw new Error(`Robots.txt disallows crawling ${baseUrl}`);
      }
      
      // Get sitemap URLs
      const sitemapUrls = await this.getSitemapUrls(baseUrl);
      console.log(`Found ${sitemapUrls.length} URLs in sitemap`);
      
      // Filter URLs that match camp keywords
      const relevantUrls = this.filterRelevantUrls(sitemapUrls, maxPages);
      console.log(`${relevantUrls.length} URLs match camp keywords`);
      
      // Crawl pages with concurrency control
      const crawlPromises = relevantUrls.map(url => 
        this.crawlPage(supabase, url, sourceId)
      );
      
      const results = await this.processConcurrently(crawlPromises, this.concurrency);
      
      // Count successes and failures
      for (const crawlResult of results) {
        if (crawlResult.success) {
          result.crawled++;
        } else {
          result.errors.push(crawlResult.error);
        }
      }
      
      result.success = true;
      result.queued = result.crawled; // All crawled pages are queued for parsing
      
    } catch (error) {
      console.error('Crawl failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }
    
    return result;
  }
  
  private async ensureSource(supabase: any, baseUrl: string): Promise<string> {
    const { data: existing, error: selectError } = await supabase
      .from('sources')
      .select('id')
      .eq('base_url', baseUrl)
      .single();
    
    if (existing) {
      return existing.id;
    }
    
    const { data: newSource, error: insertError } = await supabase
      .from('sources')
      .insert({
        base_url: baseUrl,
        type: 'web_crawl',
        status: 'active'
      })
      .select('id')
      .single();
    
    if (insertError) {
      throw new Error(`Failed to create source: ${insertError.message}`);
    }
    
    return newSource.id;
  }
  
  private async getSitemapUrls(baseUrl: string): Promise<string[]> {
    const sitemapUrls = [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/sitemap_index.xml`,
      `${baseUrl}/sitemaps.xml`
    ];
    
    const allUrls: string[] = [];
    
    for (const sitemapUrl of sitemapUrls) {
      try {
        await this.rateLimiter.waitIfNeeded(sitemapUrl);
        
        const response = await fetch(sitemapUrl, {
          headers: { 'User-Agent': 'CampScheduleBot/1.0' },
          signal: AbortSignal.timeout(10000)
        });
        
        if (response.ok) {
          const xml = await response.text();
          const urls = this.parseSitemap(xml);
          allUrls.push(...urls);
          console.log(`Found ${urls.length} URLs in ${sitemapUrl}`);
          break; // Use first successful sitemap
        }
      } catch (error) {
        console.warn(`Failed to fetch ${sitemapUrl}:`, error);
      }
    }
    
    // If no sitemap found, try common paths
    if (allUrls.length === 0) {
      console.log('No sitemap found, using common paths');
      return this.getCommonPaths(baseUrl);
    }
    
    return [...new Set(allUrls)]; // Deduplicate
  }
  
  private parseSitemap(xml: string): string[] {
    const urls: string[] = [];
    
    // Handle sitemap index files
    const sitemapMatches = xml.match(/<sitemap[^>]*>[\s\S]*?<\/sitemap>/g);
    if (sitemapMatches) {
      for (const match of sitemapMatches) {
        const locMatch = match.match(/<loc[^>]*>(.*?)<\/loc>/);
        if (locMatch) {
          // TODO: Recursively fetch nested sitemaps if needed
          console.log(`Found nested sitemap: ${locMatch[1]}`);
        }
      }
    }
    
    // Handle URL entries
    const urlMatches = xml.match(/<url[^>]*>[\s\S]*?<\/url>/g);
    if (urlMatches) {
      for (const match of urlMatches) {
        const locMatch = match.match(/<loc[^>]*>(.*?)<\/loc>/);
        if (locMatch) {
          urls.push(locMatch[1].trim());
        }
      }
    }
    
    return urls;
  }
  
  private getCommonPaths(baseUrl: string): string[] {
    return [
      `${baseUrl}/programs`,
      `${baseUrl}/camps`,
      `${baseUrl}/summer`,
      `${baseUrl}/youth`,
      `${baseUrl}/register`,
      `${baseUrl}/activities`,
      `${baseUrl}/classes`,
      `${baseUrl}/sessions`
    ];
  }
  
  private filterRelevantUrls(urls: string[], maxPages: number): string[] {
    const relevant = urls.filter(url => {
      const urlLower = url.toLowerCase();
      return CAMP_KEYWORDS.some(keyword => urlLower.includes(keyword));
    });
    
    return relevant.slice(0, maxPages);
  }
  
  private async crawlPage(supabase: any, url: string, sourceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if already crawled recently
      const { data: existing } = await supabase
        .from('raw_pages')
        .select('id')
        .eq('url', url)
        .gte('fetched_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .single();
      
      if (existing) {
        console.log(`Skipping recently crawled URL: ${url}`);
        return { success: true };
      }
      
      // Check robots.txt
      const robotsAllowed = await this.robotsChecker.isAllowed(url);
      if (!robotsAllowed) {
        return { success: false, error: `Robots.txt disallows ${url}` };
      }
      
      // Rate limit by hostname
      await this.rateLimiter.waitIfNeeded(url);
      
      // Fetch page
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CampScheduleBot/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(15000)
      });
      
      const html = await response.text();
      const hash = await this.hashContent(html);
      
      // Store in raw_pages
      const { error: insertError } = await supabase
        .from('raw_pages')
        .insert({
          source_id: sourceId,
          url: url,
          html: html,
          content_type: response.headers.get('content-type') || 'text/html',
          content_length: html.length,
          http_status: response.status,
          hash: hash,
          fetched_at: new Date().toISOString()
        });
      
      if (insertError) {
        throw new Error(`Database insert failed: ${insertError.message}`);
      }
      
      console.log(`Successfully crawled: ${url}`);
      return { success: true };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to crawl ${url}:`, errorMsg);
      return { success: false, error: `${url}: ${errorMsg}` };
    }
  }
  
  private async hashContent(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  private async processConcurrently<T>(promises: Promise<T>[], concurrency: number): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < promises.length; i += concurrency) {
      const batch = promises.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + concurrency < promises.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { baseUrl, maxPages }: CrawlRequest = await req.json();

    if (!baseUrl) {
      return new Response(
        JSON.stringify({ error: 'baseUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting crawl of ${baseUrl} with max ${maxPages || 50} pages`);

    const crawler = new WebCrawler();
    const result = await crawler.crawlSite(supabase, baseUrl, maxPages);

    console.log(`Crawl completed:`, result);

    return new Response(
      JSON.stringify(result),
      { 
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Crawl function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        crawled: 0,
        queued: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
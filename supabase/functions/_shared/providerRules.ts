// Provider-specific extraction rules to reduce LLM calls
// Maps hostname patterns to CSS selectors and normalization rules

export interface ProviderRule {
  hostPattern: RegExp;
  selectors: {
    title?: string[];
    dates?: string[];
    prices?: string[];
    ages?: string[];
    description?: string[];
    availability?: string[];
    location?: string[];
    signupUrl?: string[];
  };
  normalizers: {
    dateRegex?: RegExp[];
    priceRegex?: RegExp[];
    ageRegex?: RegExp[];
    availabilityMap?: Record<string, string>;
  };
}

// Common normalization patterns
const COMMON_DATE_REGEXES = [
  /(\d{1,2})\/(\d{1,2})\/(\d{4})/g, // MM/DD/YYYY
  /(\d{1,2})-(\d{1,2})-(\d{4})/g,  // MM-DD-YYYY
  /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/gi, // Month DD, YYYY
  /(\d{4})-(\d{1,2})-(\d{1,2})/g   // YYYY-MM-DD
];

const COMMON_PRICE_REGEXES = [
  /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g, // $123.45, $1,234.56
  /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:dollars?|usd)/gi, // 123.45 dollars
];

const COMMON_AGE_REGEXES = [
  /ages?\s*(\d+)(?:\s*[-–—to]\s*(\d+))?/gi, // Ages 8-12, Age 5 to 8
  /(\d+)(?:\s*[-–—to]\s*(\d+))?\s*years?\s*old/gi, // 8-12 years old
  /grade[s]?\s*(\d+)(?:\s*[-–—to]\s*(\d+))?/gi, // Grades 3-5
];

export const PROVIDER_RULES: ProviderRule[] = [
  // Active Network / CampMinder sites
  {
    hostPattern: /(?:register\.)?(?:campfire|active|campminder)\.com/i,
    selectors: {
      title: [
        '.activity-title',
        '.program-title', 
        '.session-title',
        'h1.title',
        '[data-testid="activity-title"]'
      ],
      dates: [
        '.session-dates',
        '.date-range', 
        '.start-end-dates',
        '[data-testid="session-dates"]',
        '.activity-schedule .dates'
      ],
      prices: [
        '.price',
        '.cost',
        '.fee',
        '.session-price',
        '[data-testid="price"]',
        '.pricing-info .amount'
      ],
      ages: [
        '.age-range',
        '.ages',
        '.age-group',
        '[data-testid="age-range"]',
        '.eligibility .ages'
      ],
      availability: [
        '.availability',
        '.status',
        '.spots-available',
        '[data-testid="availability"]',
        '.registration-status'
      ],
      location: [
        '.location',
        '.venue',
        '.address',
        '[data-testid="location"]',
        '.facility-info'
      ],
      signupUrl: [
        'a[href*="register"]',
        'a[href*="signup"]',
        '.register-button',
        '[data-testid="register-link"]'
      ]
    },
    normalizers: {
      dateRegex: COMMON_DATE_REGEXES,
      priceRegex: COMMON_PRICE_REGEXES,
      ageRegex: COMMON_AGE_REGEXES,
      availabilityMap: {
        'available': 'open',
        'open': 'open',
        'full': 'full',
        'waitlist': 'waitlist',
        'closed': 'full',
        'sold out': 'full'
      }
    }
  },

  // RecDesk / DaySmart Recreation
  {
    hostPattern: /(?:recdesk|daysmart)\.com/i,
    selectors: {
      title: [
        '.class-title',
        '.activity-name',
        'h2.program-title',
        '.session-header h3'
      ],
      dates: [
        '.class-dates',
        '.session-schedule',
        '.date-time-info',
        '.when'
      ],
      prices: [
        '.class-fee',
        '.registration-fee',
        '.price-info',
        '.cost-per-session'
      ],
      ages: [
        '.age-requirements',
        '.participant-ages',
        '.age-info'
      ],
      availability: [
        '.enrollment-status',
        '.class-status',
        '.spots-remaining'
      ],
      location: [
        '.facility',
        '.location-info',
        '.where'
      ]
    },
    normalizers: {
      dateRegex: COMMON_DATE_REGEXES,
      priceRegex: COMMON_PRICE_REGEXES,
      ageRegex: COMMON_AGE_REGEXES,
      availabilityMap: {
        'open enrollment': 'open',
        'spots available': 'open',
        'waitlist available': 'waitlist',
        'closed': 'full'
      }
    }
  },

  // Jackrabbit Class
  {
    hostPattern: /jackrabbitclass\.com/i,
    selectors: {
      title: [
        '.class-name',
        '.program-name',
        'h1',
        '.header-title'
      ],
      dates: [
        '.class-schedule',
        '.session-dates',
        '.schedule-info'
      ],
      prices: [
        '.tuition',
        '.class-price',
        '.monthly-fee'
      ],
      ages: [
        '.age-range',
        '.class-ages',
        '.participant-info .ages'
      ],
      availability: [
        '.enrollment-info',
        '.class-availability'
      ]
    },
    normalizers: {
      dateRegex: COMMON_DATE_REGEXES,
      priceRegex: COMMON_PRICE_REGEXES,
      ageRegex: COMMON_AGE_REGEXES,
      availabilityMap: {
        'enrolling': 'open',
        'full': 'full',
        'waitlist': 'waitlist'
      }
    }
  }
];

export function extractWithRules(html: string, url: string): Partial<any> | null {
  const hostname = new URL(url).hostname;
  const rule = PROVIDER_RULES.find(r => r.hostPattern.test(hostname));
  
  if (!rule) {
    return null;
  }

  // Create a simple DOM parser (note: this is a basic implementation)
  // In a real implementation, you'd use a proper HTML parser
  const extractBySelectors = (selectors: string[]): string[] => {
    const results: string[] = [];
    
    for (const selector of selectors) {
      // Simple regex-based selector matching (basic implementation)
      if (selector.startsWith('.')) {
        const className = selector.slice(1);
        const classRegex = new RegExp(`class="[^"]*\\b${className}\\b[^"]*"[^>]*>([^<]+)`, 'gi');
        let match;
        while ((match = classRegex.exec(html)) !== null) {
          results.push(match[1].trim());
        }
      } else if (selector.startsWith('#')) {
        const id = selector.slice(1);
        const idRegex = new RegExp(`id="${id}"[^>]*>([^<]+)`, 'gi');
        let match;
        while ((match = idRegex.exec(html)) !== null) {
          results.push(match[1].trim());
        }
      } else {
        // Tag selector
        const tagRegex = new RegExp(`<${selector}[^>]*>([^<]+)`, 'gi');
        let match;
        while ((match = tagRegex.exec(html)) !== null) {
          results.push(match[1].trim());
        }
      }
    }
    
    return results;
  };

  const extracted: any = {
    source_url: url
  };

  // Extract title
  if (rule.selectors.title) {
    const titles = extractBySelectors(rule.selectors.title);
    if (titles.length > 0) {
      extracted.name = titles[0];
    }
  }

  // Extract and normalize dates
  if (rule.selectors.dates) {
    const dateTexts = extractBySelectors(rule.selectors.dates);
    if (dateTexts.length > 0 && rule.normalizers.dateRegex) {
      for (const dateText of dateTexts) {
        for (const regex of rule.normalizers.dateRegex) {
          const match = regex.exec(dateText);
          if (match) {
            try {
              // Parse different date formats
              let date: Date;
              if (match[0].includes('/')) {
                // MM/DD/YYYY or MM-DD-YYYY
                date = new Date(`${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`);
              } else if (match[3]) {
                // Month DD, YYYY
                date = new Date(`${match[3]}-${getMonthNumber(match[1])}-${match[2].padStart(2, '0')}`);
              } else {
                // YYYY-MM-DD
                date = new Date(match[0]);
              }
              
              if (!extracted.start_date) {
                extracted.start_date = date.toISOString();
              } else if (!extracted.end_date) {
                extracted.end_date = date.toISOString();
              }
            } catch (e) {
              // Skip invalid dates
            }
          }
        }
      }
    }
  }

  // Extract and normalize prices
  if (rule.selectors.prices) {
    const priceTexts = extractBySelectors(rule.selectors.prices);
    if (priceTexts.length > 0 && rule.normalizers.priceRegex) {
      const prices: number[] = [];
      for (const priceText of priceTexts) {
        for (const regex of rule.normalizers.priceRegex) {
          let match;
          while ((match = regex.exec(priceText)) !== null) {
            const price = parseFloat(match[1].replace(',', ''));
            if (!isNaN(price)) {
              prices.push(price);
            }
          }
        }
      }
      if (prices.length > 0) {
        extracted.price_min = Math.min(...prices);
        if (prices.length > 1) {
          extracted.price_max = Math.max(...prices);
        }
      }
    }
  }

  // Extract and normalize ages
  if (rule.selectors.ages) {
    const ageTexts = extractBySelectors(rule.selectors.ages);
    if (ageTexts.length > 0 && rule.normalizers.ageRegex) {
      for (const ageText of ageTexts) {
        for (const regex of rule.normalizers.ageRegex) {
          const match = regex.exec(ageText);
          if (match) {
            const minAge = parseInt(match[1]);
            const maxAge = match[2] ? parseInt(match[2]) : minAge;
            if (!isNaN(minAge)) {
              extracted.age_min = minAge;
              if (!isNaN(maxAge)) {
                extracted.age_max = maxAge;
              }
            }
          }
        }
      }
    }
  }

  // Extract availability
  if (rule.selectors.availability) {
    const availTexts = extractBySelectors(rule.selectors.availability);
    if (availTexts.length > 0 && rule.normalizers.availabilityMap) {
      for (const text of availTexts) {
        const normalizedText = text.toLowerCase().trim();
        const status = rule.normalizers.availabilityMap[normalizedText];
        if (status) {
          extracted.availability_hint = status;
          break;
        }
      }
    }
  }

  // Extract location (try to parse city/state)
  if (rule.selectors.location) {
    const locationTexts = extractBySelectors(rule.selectors.location);
    if (locationTexts.length > 0) {
      const locationText = locationTexts[0];
      // Try to parse "City, State" format
      const locationMatch = locationText.match(/([^,]+),\s*([A-Z]{2}|[A-Za-z\s]+)$/);
      if (locationMatch) {
        extracted.city = locationMatch[1].trim();
        extracted.state = locationMatch[2].trim();
      }
    }
  }

  // Extract signup URL
  if (rule.selectors.signupUrl) {
    const urlMatch = html.match(/href="([^"]*(?:register|signup)[^"]*)"/i);
    if (urlMatch) {
      try {
        const signupUrl = new URL(urlMatch[1], url).href;
        extracted.signup_url = signupUrl;
      } catch (e) {
        // Skip invalid URLs
      }
    }
  }

  return extracted;
}

function getMonthNumber(monthName: string): string {
  const months = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
  };
  return months[monthName.toLowerCase().slice(0, 3)] || '01';
}

export function calculateRuleConfidence(extracted: any): number {
  let score = 0;
  let maxScore = 0;

  // Required fields (higher weight)
  maxScore += 40; // name (20) + source_url (10) + city (5) + state (5)
  if (extracted.name) score += 20;
  if (extracted.source_url) score += 10;
  if (extracted.city) score += 5;
  if (extracted.state) score += 5;

  // Important optional fields
  maxScore += 35; // dates (15) + prices (10) + ages (10)
  if (extracted.start_date) score += 10;
  if (extracted.end_date) score += 5;
  if (extracted.price_min) score += 10;
  if (extracted.age_min) score += 10;

  // Nice-to-have fields
  maxScore += 25; // availability (10) + signup_url (10) + description (5)
  if (extracted.availability_hint) score += 10;
  if (extracted.signup_url) score += 10;
  if (extracted.description) score += 5;

  return Math.min(score / maxScore, 1.0);
}
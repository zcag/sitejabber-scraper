import { CheerioCrawler, type CheerioAPI } from '@crawlee/cheerio';
import { Actor, Dataset, log } from 'apify';

// ── Types ──────────────────────────────────────────────────────────────

interface Input {
    companyUrls: string[];
    maxReviewsPerCompany?: number;
    sortBy?: 'recent' | 'highest_rating' | 'lowest_rating';
    filterByStars?: 'all' | '1' | '2' | '3' | '4' | '5';
    includeCompanyInfo?: boolean;
    proxyConfig?: object;
}

interface ReviewResult {
    type: 'review';
    companyName: string;
    companyDomain: string;
    companyUrl: string;
    reviewId: string;
    rating: number;
    reviewTitle: string;
    reviewText: string;
    authorName: string;
    authorUrl: string;
    authorLocation: string;
    authorReviewCount: number;
    authorHelpfulVotes: number;
    publishedDate: string;
    isVerified: boolean;
    hasMedia: boolean;
    helpfulCount: number;
    reviewUrl: string;
}

interface CompanyResult {
    type: 'companyInfo';
    companyName: string;
    companyDomain: string;
    companyUrl: string;
    overallRating: number;
    totalReviews: number;
    starDistribution: Record<string, number>;
    recommendationRate: number;
    categories: string[];
}

interface UserData {
    label: 'REVIEW_PAGE';
    companyDomain: string;
    companyBaseUrl: string;
    reviewCount: number;
    companyInfoEmitted: boolean;
}

// ── Init ───────────────────────────────────────────────────────────────

await Actor.init();

const {
    companyUrls = [],
    maxReviewsPerCompany = 100,
    sortBy = 'recent',
    filterByStars = 'all',
    includeCompanyInfo = true,
    proxyConfig,
} = (await Actor.getInput<Input>()) ?? ({} as Input);

if (companyUrls.length === 0) {
    log.error('No company URLs provided. Exiting.');
    await Actor.exit({ exitCode: 1 });
}

const proxyConfiguration = await Actor.createProxyConfiguration(proxyConfig);

// ── URL helpers ────────────────────────────────────────────────────────

// SiteJabber redirects to smartcustomer.com — use smartcustomer as canonical
const BASE_HOST = 'www.smartcustomer.com';

function normalizeCompanyUrl(input: string): string {
    if (input.startsWith('http')) {
        const url = new URL(input);
        const pathParts = url.pathname.split('/').filter(Boolean);
        // Handle /reviews/domain.com paths
        const reviewIdx = pathParts.indexOf('reviews');
        const domain = reviewIdx >= 0 && pathParts[reviewIdx + 1]
            ? pathParts[reviewIdx + 1]
            : pathParts[pathParts.length - 1] || url.hostname;
        return `https://${BASE_HOST}/reviews/${domain}`;
    }
    // Bare domain like "amazon.com"
    return `https://${BASE_HOST}/reviews/${input}`;
}

function extractDomain(url: string): string {
    const match = url.match(/\/reviews\/([^?#/]+)/);
    return match ? match[1] : url;
}

function buildPageUrl(baseUrl: string, page: number): string {
    const url = new URL(baseUrl);
    if (page > 1) url.searchParams.set('page', String(page));
    if (sortBy === 'highest_rating') url.searchParams.set('sort', 'rating');
    if (sortBy === 'lowest_rating') url.searchParams.set('sort', 'rating_asc');
    if (filterByStars !== 'all') url.searchParams.set('rating', filterByStars);
    return url.href;
}

// ── Extraction: JSON-LD ────────────────────────────────────────────────

function extractFromJsonLd($: CheerioAPI, companyDomain: string, companyUrl: string): {
    reviews: ReviewResult[];
    companyInfo: CompanyResult | null;
} {
    const reviews: ReviewResult[] = [];
    let companyInfo: CompanyResult | null = null;

    $('script[type="application/ld+json"]').each((_, el) => {
        try {
            const data = JSON.parse($(el).html() || '{}');
            const items = data['@graph'] || [data];

            for (const item of items) {
                // Company/Organization info
                if (item['@type'] === 'Organization' || item['@type'] === 'LocalBusiness') {
                    const agg = item.aggregateRating || {};
                    companyInfo = {
                        type: 'companyInfo',
                        companyName: item.name || companyDomain,
                        companyDomain,
                        companyUrl,
                        overallRating: parseFloat(agg.ratingValue) || 0,
                        totalReviews: parseInt(agg.reviewCount) || 0,
                        starDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
                        recommendationRate: 0,
                        categories: [],
                    };
                }

                // Individual reviews
                if (item['@type'] === 'Review') {
                    reviews.push({
                        type: 'review',
                        companyName: '',
                        companyDomain,
                        companyUrl,
                        reviewId: item['@id'] || item.url || '',
                        rating: parseInt(item.reviewRating?.ratingValue) || 0,
                        reviewTitle: item.headline || '',
                        reviewText: item.reviewBody || '',
                        authorName: item.author?.name || '',
                        authorUrl: item.author?.url || item.author?.['@id'] || '',
                        authorLocation: '',
                        authorReviewCount: 0,
                        authorHelpfulVotes: 0,
                        publishedDate: item.datePublished || '',
                        isVerified: false,
                        hasMedia: false,
                        helpfulCount: 0,
                        reviewUrl: item.url || '',
                    });
                }
            }
        } catch {
            // skip malformed JSON-LD
        }
    });

    // Fill company name on reviews
    if (companyInfo) {
        for (const r of reviews) {
            r.companyName = (companyInfo as CompanyResult).companyName;
        }
    }

    return { reviews, companyInfo };
}

// ── Extraction: HTML enrichment ────────────────────────────────────────

function enrichFromHtml($: CheerioAPI, reviews: ReviewResult[], companyInfo: CompanyResult | null): {
    reviews: ReviewResult[];
    companyInfo: CompanyResult | null;
    totalPages: number;
} {
    // Try to extract star distribution from HTML
    if (companyInfo) {
        // Look for star distribution bars (common pattern: "56% 5 star")
        const distText = $.html();
        const distPattern = /(\d+)%\s*(?:.*?)(\d)\s*star/gi;
        let match;
        while ((match = distPattern.exec(distText)) !== null) {
            const percent = parseInt(match[1]);
            const stars = match[2];
            if (stars >= '1' && stars <= '5') {
                companyInfo.starDistribution[stars] = percent;
            }
        }

        // Recommendation rate
        const recMatch = distText.match(/(\d+)%\s*(?:of\s+)?reviewers?\s+recommend/i);
        if (recMatch) {
            companyInfo.recommendationRate = parseInt(recMatch[1]);
        }

        // Categories
        $('a[href*="/categories/"]').each((_, el) => {
            const cat = $(el).text().trim();
            if (cat && companyInfo && !companyInfo.categories.includes(cat)) {
                companyInfo.categories.push(cat);
            }
        });
    }

    // Enrich reviews with HTML data (verified badges, media, helpful counts)
    // This is best-effort — JSON-LD has the core data
    const reviewElements = $('[itemtype*="Review"], .review-container, [data-review-id]');
    reviewElements.each((i, el) => {
        if (i < reviews.length) {
            const $el = $(el);
            // Check for verified badge
            if ($el.find('.verified, [data-verified], .badge-verified').length > 0) {
                reviews[i].isVerified = true;
            }
            // Check for images/video
            if ($el.find('img:not([alt=""]):not(.avatar):not(.star), video').length > 0) {
                reviews[i].hasMedia = true;
            }
            // Author location
            const locEl = $el.find('.reviewer-location, .user-location');
            if (locEl.length) {
                reviews[i].authorLocation = locEl.text().trim();
            }
        }
    });

    // Pagination: find max page number
    let totalPages = 1;
    $('a[href*="page="]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const pageMatch = href.match(/page=(\d+)/);
        if (pageMatch) {
            const p = parseInt(pageMatch[1]);
            if (p > totalPages) totalPages = p;
        }
    });

    // Also check for "next" link existence
    const nextLink = $('a[rel="next"], a:contains("Next"), .pagination-next a');
    if (nextLink.length > 0 && totalPages === 1) {
        // At least 2 pages
        totalPages = 2;
    }

    return { reviews, companyInfo, totalPages };
}

// ── Crawler ────────────────────────────────────────────────────────────

const crawler = new CheerioCrawler({
    proxyConfiguration,
    maxRequestsPerCrawl: 5000,
    maxConcurrency: 3,
    requestHandlerTimeoutSecs: 60,
    additionalMimeTypes: ['application/json'],
    // Follow redirects from sitejabber.com to smartcustomer.com
    navigationTimeoutSecs: 30,
    requestHandler: async ({ request, $, crawler: c }) => {
        const userData = request.userData as UserData;
        const { companyDomain, companyBaseUrl } = userData;
        let { reviewCount, companyInfoEmitted } = userData;

        log.info(`Processing ${request.url} (${reviewCount} reviews so far for ${companyDomain})`);

        // Extract from JSON-LD
        const jsonLd = extractFromJsonLd($, companyDomain, companyBaseUrl);

        // Enrich with HTML data
        const { reviews, companyInfo, totalPages } = enrichFromHtml($, jsonLd.reviews, jsonLd.companyInfo);

        log.info(`Found ${reviews.length} reviews, estimated ${totalPages} total pages`);

        // Emit company info once (no charge)
        if (includeCompanyInfo && !companyInfoEmitted && companyInfo) {
            await Actor.pushData(companyInfo);
            companyInfoEmitted = true;
        }

        // Apply max limit
        let pageReviews = reviews;
        if (maxReviewsPerCompany > 0) {
            const remaining = maxReviewsPerCompany - reviewCount;
            if (remaining <= 0) return;
            pageReviews = reviews.slice(0, remaining);
        }

        // Push reviews (PPE: charge per result)
        if (pageReviews.length > 0) {
            await Actor.pushData(pageReviews, 'result');
            reviewCount += pageReviews.length;
            log.info(`Pushed ${pageReviews.length} reviews (total: ${reviewCount}) for ${companyDomain}`);
        }

        // Check if we should continue
        if (maxReviewsPerCompany > 0 && reviewCount >= maxReviewsPerCompany) {
            log.info(`Reached max reviews (${maxReviewsPerCompany}) for ${companyDomain}`);
            return;
        }

        // Enqueue next page
        const currentUrl = new URL(request.url);
        const currentPage = parseInt(currentUrl.searchParams.get('page') || '1');

        if (currentPage < totalPages) {
            const nextUrl = buildPageUrl(companyBaseUrl, currentPage + 1);
            await c.addRequests([{
                url: nextUrl,
                userData: {
                    label: 'REVIEW_PAGE' as const,
                    companyDomain,
                    companyBaseUrl,
                    reviewCount,
                    companyInfoEmitted,
                },
            }]);
        } else if (reviews.length > 0 && totalPages <= 1) {
            // If we couldn't detect total pages but got reviews, try next page speculatively
            const nextUrl = buildPageUrl(companyBaseUrl, currentPage + 1);
            await c.addRequests([{
                url: nextUrl,
                userData: {
                    label: 'REVIEW_PAGE' as const,
                    companyDomain,
                    companyBaseUrl,
                    reviewCount,
                    companyInfoEmitted,
                },
            }]);
            log.info(`Speculatively trying page ${currentPage + 1} (pagination not detected)`);
        } else {
            log.info(`Finished all pages for ${companyDomain} (${reviewCount} reviews total)`);
        }
    },

    failedRequestHandler: async ({ request }, error) => {
        log.error(`Request failed: ${request.url} — ${error.message}`);
    },
});

// ── Build start URLs ───────────────────────────────────────────────────

const startUrls = companyUrls.map((input) => {
    const baseUrl = normalizeCompanyUrl(input);
    const domain = extractDomain(baseUrl);
    return {
        url: buildPageUrl(baseUrl, 1),
        userData: {
            label: 'REVIEW_PAGE' as const,
            companyDomain: domain,
            companyBaseUrl: baseUrl,
            reviewCount: 0,
            companyInfoEmitted: false,
        },
    };
});

log.info(`Starting SiteJabber scraper for ${startUrls.length} companies: ${startUrls.map(u => u.userData.companyDomain).join(', ')}`);

await crawler.run(startUrls);

const datasetInfo = await Dataset.open().then(d => d.getInfo());
log.info(`Done. Total items in dataset: ${datasetInfo?.itemCount ?? 0}`);

await Actor.exit();

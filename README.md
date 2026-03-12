# SiteJabber Review Scraper

Extract reviews, ratings, and company profile data from [SiteJabber](https://www.sitejabber.com) (now SmartCustomer).

**Zero competition** — no other Apify actor scrapes SiteJabber/SmartCustomer.

## What it does

This scraper extracts structured data from SiteJabber company review pages:

- **Reviews**: rating, title, full text, author info, dates, verification status
- **Company profiles**: overall rating, total reviews, star distribution, recommendation rate, categories

## Input

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `companyUrls` | string[] | *required* | SiteJabber URLs or domain names (e.g. `amazon.com` or `https://www.sitejabber.com/reviews/amazon.com`) |
| `maxReviewsPerCompany` | number | 100 | Max reviews per company. 0 = unlimited |
| `sortBy` | string | `recent` | Sort order: `recent`, `highest_rating`, `lowest_rating` |
| `filterByStars` | string | `all` | Filter: `all`, `1`, `2`, `3`, `4`, `5` |
| `includeCompanyInfo` | boolean | `true` | Include company profile as first result |
| `proxyConfig` | object | Apify Proxy | Proxy settings |

### Example input

```json
{
    "companyUrls": [
        "amazon.com",
        "https://www.sitejabber.com/reviews/ebay.com"
    ],
    "maxReviewsPerCompany": 25,
    "sortBy": "recent",
    "includeCompanyInfo": true
}
```

## Output

### Review object

```json
{
    "type": "review",
    "companyName": "Amazon",
    "companyDomain": "amazon.com",
    "rating": 5,
    "reviewTitle": "Great service",
    "reviewText": "Fast delivery and good prices...",
    "authorName": "John D.",
    "publishedDate": "2026-03-01",
    "isVerified": true,
    "hasMedia": false,
    "reviewUrl": "https://www.smartcustomer.com/reviews/amazon.com#review-123"
}
```

### Company profile object

```json
{
    "type": "companyInfo",
    "companyName": "Amazon",
    "companyDomain": "amazon.com",
    "overallRating": 2.6,
    "totalReviews": 11106,
    "starDistribution": { "1": 34, "2": 8, "3": 6, "4": 9, "5": 43 },
    "recommendationRate": 47,
    "categories": ["Shopping"]
}
```

## How it works

1. **JSON-LD extraction**: Reads structured review data from the page's embedded schema markup
2. **HTML enrichment**: Extracts additional data (star distribution, categories, verified badges) from page HTML
3. **Proxy rotation**: Uses Apify Proxy to avoid rate limiting
4. **Multiple companies**: Scrape reviews for many companies in a single run
5. **Auto-redirect**: Handles SiteJabber → SmartCustomer redirect transparently

## Use cases

- **Competitor analysis**: Compare review sentiment across competitors on SiteJabber
- **Brand monitoring**: Track reputation changes over time
- **Market research**: Analyze customer satisfaction in specific industries
- **Review aggregation**: Collect reviews for dashboards or reports
- **Cross-platform comparison**: Pair with Trustpilot data for multi-platform analysis

## Cost estimate

Using Apify Proxy (datacenter), scraping reviews for one company costs approximately $0.01-0.02 in platform usage.

## Notes

- Extracts up to ~25 reviews per company per page load (limited by server-side rendering)
- SiteJabber rebranded to SmartCustomer — both URLs work
- Review data depends on what SiteJabber exposes publicly

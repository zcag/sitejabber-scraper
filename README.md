# SiteJabber Review Scraper

Extract reviews, ratings, and company profile data from [SiteJabber](https://www.sitejabber.com/) (now [SmartCustomer](https://www.smartcustomer.com/)) — a major consumer review platform with millions of business reviews.

Collect structured review data including star ratings, review text, author details, verification status, and company-level statistics like recommendation rates and star distributions. Built for reputation monitoring, competitive intelligence, and consumer research.

## What data can you extract from SiteJabber?

| Field | Example |
|-------|---------|
| Star rating | 1-5 |
| Review title | "Great service" |
| Full review text | Complete review content |
| Author name | "John D." |
| Published date | "2026-03-01" |
| Verified status | true/false |
| Has media | true/false |
| Review URL | Direct link to review |
| Company name | "Amazon" |
| Overall rating | 2.6 |
| Total reviews | 11,106 |
| Star distribution | Percentage per star |
| Recommendation rate | 47% |
| Categories | "Shopping" |

## How to scrape SiteJabber reviews

1. Click **Try for free** to open the Actor in Apify Console
2. Enter company domains or SiteJabber URLs (e.g., `amazon.com` or `https://www.sitejabber.com/reviews/amazon.com`)
3. Set the maximum number of reviews per company
4. Optionally sort by date or rating, and filter by star rating
5. Click **Start** and wait for the run to finish
6. Download results as JSON, CSV, or Excel — or access via the Apify API

Schedule automatic runs to track review trends over time. Connect to Google Sheets, Slack, Zapier, or webhooks.

## Input

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `companyUrls` | string[] | SiteJabber URLs or domain names (e.g., `amazon.com` or `https://www.sitejabber.com/reviews/amazon.com`) | required |
| `maxReviewsPerCompany` | number | Max reviews per company. 0 = unlimited. | 100 |
| `sortBy` | string | `recent`, `highest_rating`, or `lowest_rating` | `recent` |
| `filterByStars` | string | `all`, `1`, `2`, `3`, `4`, or `5` | `all` |
| `includeCompanyInfo` | boolean | Include company profile with aggregate statistics | true |
| `proxyConfig` | object | Proxy configuration | Apify Proxy (datacenter) |

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

### Review

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

### Company profile

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

## Pricing

Pay only for results — no monthly subscription.

| Reviews | Cost |
|---------|------|
| 1,000 | $1.00 |
| 5,000 | $5.00 |
| 10,000 | $10.00 |

Platform usage is minimal — CheerioCrawler uses HTTP requests only (no browser). ~$0.01-0.02 per company in platform costs.

## Try it free

Every Apify account includes free credits. Set `maxReviewsPerCompany: 10` to preview the data format — no payment method required.

## Use cases

- **Reputation monitoring** — Track your brand's SiteJabber reviews and recommendation rate over time. Catch negative trends early with scheduled runs.
- **Competitive analysis** — Compare review volumes, ratings, and recommendation rates across competitors.
- **Cross-platform analysis** — Combine SiteJabber data with Trustpilot and other review platforms for a complete reputation picture.
- **Market research** — Understand consumer sentiment in specific product categories before entering a market.
- **Verification analysis** — Filter for verified reviews only to get higher-quality sentiment signals.
- **Customer service insights** — Identify common praise and complaints to improve your product or service.

## Is it legal to scrape SiteJabber?

Web scraping of publicly available data is generally legal. SiteJabber reviews are publicly accessible without login. This Actor only collects publicly visible information.

For more context, see [Is web scraping legal?](https://blog.apify.com/is-web-scraping-legal/) on the Apify blog. Always review applicable terms of service and data protection regulations for your use case.

## Tips

- **Use domain names as input**: Enter `amazon.com` directly — no need for full SiteJabber URLs.
- **SiteJabber is now SmartCustomer**: The platform rebranded, but both URLs work. The scraper handles the redirect automatically.
- **~25 reviews per company**: SiteJabber's server-side rendering limits the number of reviews available per page load. For comprehensive analysis, combine with other review platforms.
- **Sort by rating**: Use `lowest_rating` to focus on complaints, or `highest_rating` to analyze what customers love.

## Why this scraper?

- **Lightweight and fast** — uses CheerioCrawler (HTTP only, no browser), making it the cheapest review scraper to run.
- **Handles the SiteJabber/SmartCustomer rebrand** — automatically follows the redirect. Works with both old and new URLs.
- **Pay-per-result** — $1.00 per 1,000 reviews. No reviews = no charge.

## API access

Call this Actor programmatically from any language:

```bash
curl "https://api.apify.com/v2/acts/quasi_grass~sitejabber-review-scraper/run-sync-get-dataset-items?token=YOUR_TOKEN" \
  -d '{"companyUrls": ["amazon.com"], "maxReviewsPerCompany": 25}'
```

```python
from apify_client import ApifyClient

client = ApifyClient("YOUR_TOKEN")
run = client.actor("quasi_grass/sitejabber-review-scraper").call(
    run_input={"companyUrls": ["amazon.com"], "maxReviewsPerCompany": 25}
)
for item in client.dataset(run["defaultDatasetId"]).iterate_items():
    print(item)
```

Works with Google Sheets, Zapier, Make, Slack, and 100+ integrations via the [Apify platform](https://docs.apify.com/integrations).

## Related scrapers

Combine with our other review platform scrapers for comprehensive reputation analysis:

- [Trustpilot Reviews Scraper](https://apify.com/quasi_grass/trustpilot-review-scraper)
- [PissedConsumer Reviews Scraper](https://apify.com/quasi_grass/pissedconsumer-review-scraper)
- [ConsumerAffairs Reviews Scraper](https://apify.com/quasi_grass/consumeraffairs-review-scraper)

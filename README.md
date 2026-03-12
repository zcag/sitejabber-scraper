# SiteJabber Review Scraper

Apify Actor that scrapes reviews, ratings, and company data from [SiteJabber](https://www.sitejabber.com) (now SmartCustomer).

## Features

- Extract reviews with ratings, text, author info, and dates
- Company profiles with overall rating, star distribution, and recommendation rate
- Filter by star rating (1-5)
- Sort by recent, highest, or lowest rating
- Multi-company support
- Handles SiteJabber → SmartCustomer redirect automatically

## Input

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `companyUrls` | string[] | required | SiteJabber URLs or bare domains (e.g., `amazon.com`) |
| `maxReviewsPerCompany` | number | 100 | Max reviews per company (0 = unlimited) |
| `sortBy` | string | `recent` | Sort order: `recent`, `highest_rating`, `lowest_rating` |
| `filterByStars` | string | `all` | Filter: `all`, `1`, `2`, `3`, `4`, `5` |
| `includeCompanyInfo` | boolean | true | Include company profile in output |

## Output

Each review record contains:

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
    "reviewUrl": "https://www.smartcustomer.com/reviews/amazon.com#review-123"
}
```

## Usage

```bash
# Local development
npm install
npm start

# Build for Apify
npm run build
apify push
```

# Source Policies

> **Document Version:** 1.0
> **Last Updated:** January 8, 2026
> **Purpose:** Define allowed data sources, rate limits, and usage policies

---

## Overview

This document outlines the policies for external data sources used by the Telugu Portal Movie Intelligence Platform. All data fetching must comply with these policies to ensure legal compliance, reliability, and sustainability.

---

## 1. Allowed Sources

### 1.1 Primary API Sources

| Source | Type | Status | Usage |
|--------|------|--------|-------|
| **TMDB** | API | Active | Movie metadata, cast, crew, images |
| **OMDB** | API | Active | Ratings, plot summaries |
| **Wikidata** | API | Active | Structured facts, identifiers |
| **Wikipedia** | API | Active | Biographies, descriptions |
| **Google KG** | API | Limited | Entity verification |

### 1.2 Archive Sources

| Source | Type | Status | Usage |
|--------|------|--------|-------|
| **Internet Archive** | Archive | Active | Historical images, posters |
| **Wikimedia Commons** | Archive | Active | CC-licensed images |

### 1.3 Prohibited Sources

The following sources are NOT allowed:

- ❌ Piracy-related websites
- ❌ Unofficial fan sites without verification
- ❌ Social media posts as primary source
- ❌ User-uploaded content without attribution
- ❌ Scraped websites without robots.txt permission

---

## 2. Rate Limits

### 2.1 Per-Source Limits

| Source | Requests/Second | Requests/Day | Notes |
|--------|-----------------|--------------|-------|
| TMDB | 40 | Unlimited (with key) | Requires API key |
| OMDB | 10 | 1,000 | Free tier limit |
| Wikipedia | 100 | Unlimited | Respect user-agent policy |
| Wikidata | 50 | Unlimited | SPARQL query limits apply |
| Google KG | 1 | 100 | Strict quota |
| Internet Archive | 5 | 10,000 | Respect server load |
| Wikimedia Commons | 50 | Unlimited | Respect user-agent |

### 2.2 Global Limits

- **Total concurrent requests:** 20
- **Retry attempts:** 3 per request
- **Retry delay:** Exponential backoff (1s, 2s, 4s)
- **Request timeout:** 30 seconds
- **Cache TTL:** 7 days (TMDB), 30 days (Wikipedia)

---

## 3. API Compliance

### 3.1 TMDB

**Terms:** https://www.themoviedb.org/terms-of-use

Requirements:
- ✅ Display TMDB logo/attribution
- ✅ Link to TMDB source page
- ✅ Use API key (not shared publicly)
- ✅ Cache responses appropriately
- ❌ Do not store raw API responses permanently
- ❌ Do not redistribute API data as a feed

### 3.2 OMDB

**Terms:** https://www.omdbapi.com/legal.htm

Requirements:
- ✅ Display attribution
- ✅ Use API key
- ✅ Respect daily limits
- ❌ Do not exceed free tier without subscription

### 3.3 Wikipedia/Wikidata

**Terms:** https://foundation.wikimedia.org/wiki/Terms_of_Use

Requirements:
- ✅ Attribute content to Wikipedia
- ✅ Use proper user-agent
- ✅ Respect robots.txt
- ✅ Link to original article
- ✅ Comply with CC BY-SA license

### 3.4 Wikimedia Commons

**Terms:** https://commons.wikimedia.org/wiki/Commons:Licensing

Requirements:
- ✅ Display license information
- ✅ Credit original author
- ✅ Link to source page
- ✅ Indicate any modifications

---

## 4. User-Agent Policy

All requests must use a proper user-agent:

```
User-Agent: TeluguVibes/1.0 (https://teluguvibes.com; contact@teluguvibes.com)
```

Components:
- **App name:** TeluguVibes
- **Version:** Current version
- **URL:** Public website URL
- **Contact:** Contact email

---

## 5. Image Licensing

### 5.1 License Types

| License | Usage Allowed | Attribution Required |
|---------|---------------|---------------------|
| Public Domain | Yes | No |
| CC0 | Yes | No |
| CC BY | Yes | Yes |
| CC BY-SA | Yes (share-alike) | Yes |
| CC BY-NC | Non-commercial only | Yes |
| Fair Use | Review/commentary | Yes |
| API Terms | Per API policy | Per policy |

### 5.2 Image Source Priority

1. **TMDB:** Preferred for posters/backdrops
2. **Wikimedia Commons:** CC-licensed alternatives
3. **Internet Archive:** Historical/archival images
4. **Official Sources:** Press kits, studio releases

### 5.3 Image Attribution Format

```html
<figure>
  <img src="/api/image-proxy?url=..." alt="..." />
  <figcaption>
    Image: <a href="[source_url]">[Source Name]</a> | License: [License Type]
  </figcaption>
</figure>
```

---

## 6. Data Retention

### 6.1 Cache Retention

| Data Type | Cache Duration | Storage Location |
|-----------|----------------|------------------|
| Movie metadata | 7 days | Database |
| Cast/crew | 14 days | Database |
| Images (URLs) | 30 days | Database |
| Raw API responses | 1 hour | Memory |
| Search results | 24 hours | Redis |

### 6.2 Permanent Storage

Only verified, normalized data is stored permanently:
- Movie records with source attribution
- Celebrity profiles with sources
- Reviews (internal content)
- Verification history

### 6.3 Data Deletion

Cached data is automatically deleted:
- On cache expiration
- When source data changes
- When manually invalidated

---

## 7. Error Handling

### 7.1 Source Unavailable

When a source is unavailable:
1. Retry with exponential backoff
2. Fall back to cached data if available
3. Fall back to alternative source
4. Log failure for monitoring
5. Alert if prolonged outage

### 7.2 Rate Limit Exceeded

When rate limit is exceeded:
1. Queue request for later
2. Use cached data if available
3. Display "data may be outdated" notice
4. Alert for investigation

### 7.3 Invalid Response

When response is invalid:
1. Validate against schema
2. Log validation errors
3. Skip invalid data
4. Use fallback source

---

## 8. Monitoring

### 8.1 Metrics to Track

| Metric | Alert Threshold |
|--------|-----------------|
| API error rate | > 5% |
| Average response time | > 2s |
| Cache hit rate | < 70% |
| Rate limit errors | > 10/hour |
| Source downtime | > 5 minutes |

### 8.2 Audit Logging

All API requests are logged:
```json
{
  "timestamp": "2026-01-08T10:30:00Z",
  "source": "tmdb",
  "endpoint": "/movie/123",
  "status": 200,
  "latency_ms": 150,
  "cached": false,
  "user_agent": "TeluguVibes/1.0"
}
```

---

## 9. Compliance Checklist

Before adding a new source:

- [ ] Review Terms of Service
- [ ] Check robots.txt permissions
- [ ] Verify API key requirements
- [ ] Confirm rate limits
- [ ] Document attribution requirements
- [ ] Test error handling
- [ ] Configure monitoring
- [ ] Add to source registry

---

## 10. Source Registry

### Adding a New Source

1. Create entry in `lib/compliance/safe-fetcher.ts`
2. Add rate limit configuration
3. Add to allowed domains list
4. Document in this policy
5. Test in staging environment
6. Review by security team

### Source Configuration Example

```typescript
{
  tmdb: {
    baseUrl: 'https://api.themoviedb.org/3',
    rateLimit: { requests: 40, per: 'second' },
    timeout: 30000,
    retries: 3,
    cacheTTL: 604800, // 7 days
    attribution: 'TMDB',
    license: 'API Terms',
    trustLevel: 0.95,
  }
}
```

---

*Document maintained by the Telugu Portal Engineering Team*



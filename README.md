# CDC Maximizer

CDC Maximizer recommends low-cost filler items for NTUC FairPrice, Sheng Siong, and Venus Beauty so a cart subtotal can land on a useful CDC voucher total with minimal cash overflow.

## Quick Start

```bash
npm install
npm run dev
```

The app works with a built-in demo catalog. To enable PostgreSQL:

```bash
cp .env.example .env
npm run prisma:migrate
npm run prisma:seed
npm run scrape
```

If `DATABASE_URL` is not set, `npm run scrape` creates and fills a local SQLite catalog at `data/catalog.sqlite`.

## Product Images

FairPrice image cards can be sparse on search pages, so run:

```bash
npm run images:enrich
```

The image enricher checks each product page first. If no image is exposed there, it can fall back to Google image search when `GOOGLE_CUSTOM_SEARCH_API_KEY` and `GOOGLE_CUSTOM_SEARCH_CX` are configured. Use `npm run scrape:with-images` to refresh products and then fill missing images in one pass.

## Voucher Rules

- NTUC FairPrice and Sheng Siong supermarket CDC targets are calculated only in multiples of S$10.
- Venus Beauty merchant CDC targets are calculated with any valid S$2, S$5, and S$10 combination.

## CDC Voucher Notes

- NTUC FairPrice and Sheng Siong are configured as `Supermarket` CDC voucher stores.
- Venus Beauty is configured as `Merchant`, because public CDC listings and Venus Beauty posts indicate CDC acceptance only at selected physical outlets, not a blanket supermarket-voucher checkout path.

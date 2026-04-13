# Email Authentication Visualizer

Small full-stack Next.js MVP for checking a domain's email authentication setup.

## What it does

- Accepts a domain and optional DKIM selector
- Looks up SPF TXT records on the base domain
- Looks up DMARC TXT records on `_dmarc.<domain>`
- Looks up DKIM TXT records on `<selector>._domainkey.<domain>` when a selector is supplied
- Parses useful SPF and DMARC fields
- Returns a readable summary plus practical recommendations

## Stack

- Next.js App Router
- TypeScript
- CSS Modules
- Node DNS lookups through `node:dns/promises`

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## API

`POST /api/analyze-domain`

Request body:

```json
{
  "domain": "example.com",
  "dkimSelector": "google"
}
```

Notes:

- `domain` is required
- `dkimSelector` is optional
- URLs like `https://example.com` are normalized lightly, but the UI is designed around bare domains

## Current MVP scope

- SPF: existence, raw record, includes, `ip4`, `ip6`, and final `all`
- DMARC: existence, raw record, `p`, `rua`, `ruf`, `pct`, `adkim`, `aspf`
- DKIM: selector-based lookup only; no generic selector discovery

## Verification

- `npm run build`
- `npm run lint`

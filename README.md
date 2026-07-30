# Email Authentication Visualizer

A focused security-operations aid for reviewing a domain's public SPF, DMARC,
and selector-based DKIM records during phishing or business email compromise
(BEC) triage.

The tool turns DNS TXT records into readable findings, preserves the raw values
for analyst notes, and calls out where a result is incomplete. It supports an
investigation; it does not decide whether an email is malicious.

[Open the live demo](https://richfish85.github.io/email_authentication_visualizer/)

![Workflow for using Email Authentication Visualizer](docs/email-auth-workflow.svg)

## Security operations use case

An analyst investigating a reported message may need to understand whether its
claimed sender domain publishes basic anti-spoofing controls. This project makes
that public DNS review quicker and easier to document:

- SPF on the base domain
- DMARC on `_dmarc.<domain>`
- DKIM on `<selector>._domainkey.<domain>` when a selector is known
- Raw records, parsed fields, a plain-language posture label, and follow-up
  recommendations

The result is one evidence source alongside the original message, full headers,
mail-gateway verdicts, user context, URL and attachment analysis, and the
organisation's response procedures.

## Phishing / BEC analyst workflow

1. Preserve the reported message and its full headers according to local policy.
2. Record the visible `From` domain, envelope/`Return-Path` domain, `Reply-To`
   domain, and the DKIM `d=` domain and `s=` selector when present.
3. Check the relevant domain here and supply the observed DKIM selector. Do not
   guess that DKIM is absent merely because one selector returns no record.
4. Compare the published DNS posture with the message's `Authentication-Results`
   header and the mail gateway's SPF, DKIM, and DMARC verdicts.
5. Add the raw record evidence and limitations to the ticket, then contain or
   escalate based on the full set of indicators and organisational policy.

### Synthetic analyst conclusion / ticket note

> **INC-2026-0147 — suspected supplier impersonation (training scenario).** The
> visible From domain was `accounts-payable.example`; the Reply-To used a
> different domain. The preserved message reported SPF fail, no aligned DKIM
> result, and DMARC fail. A public DNS review found no SPF or DMARC record and no
> TXT record for the observed DKIM selector `mail2026`. The lookup cannot prove
> malicious intent or rule out other DKIM selectors. Combined with the domain
> mismatch and urgent bank-detail change, treat as suspected BEC: preserve the
> original message, escalate to the incident queue, and verify the request with
> the supplier through a known contact channel before taking action.

All domains, people, and identifiers in this example are synthetic.

## Screenshots

### Home / empty state

![Home screen before analysis](docs/screenshots/01-home-empty.png)

### Results state

![Results for example.com](docs/screenshots/02-results-example-com.png)

### Validation state

![Validation error for invalid input](docs/screenshots/03-validation-error.png)

### Mobile results

![Mobile results view](docs/screenshots/04-mobile-results-example-com.png)

## Implementation

- Next.js App Router, TypeScript, and CSS Modules
- Local/server deployment: Node runtime route at `POST /api/analyze-domain` with
  DNS TXT lookups through `node:dns/promises`
- GitHub Pages deployment: static export with browser-side DNS-over-HTTPS
- Input normalization and validation before lookup
- Selector-specific DKIM checks without claiming automatic selector discovery
- Focused Vitest coverage for normalization, parsing, and posture scoring
- GitHub Actions checks lint and tests, builds `out/`, and deploys the live demo

The workflow diagram above shows the input, lookup, parsing, and review path.

### API

`POST /api/analyze-domain`

Request body:

```json
{
  "domain": "example.com",
  "dkimSelector": "google"
}
```

- `domain` is required.
- `dkimSelector` is optional.
- A pasted URL is normalized to its hostname when possible.
- The interface is designed around bare domains.

### Deployment modes

The normal Next.js build uses the local API route. GitHub Pages cannot run that
route, so its static build selects browser-side DNS-over-HTTPS:

```bash
GITHUB_PAGES=true NEXT_PUBLIC_DNS_LOOKUP_MODE=doh npm run build
```

On Windows PowerShell, use:

```powershell
$env:GITHUB_PAGES="true"
$env:NEXT_PUBLIC_DNS_LOOKUP_MODE="doh"
npm run build
```

## Assumptions

- Public DNS TXT records are the only data source examined by this MVP.
- SPF and DMARC use predictable DNS names; DKIM requires a known selector.
- The analyst obtains message headers and gateway verdicts elsewhere.
- A posture label is triage guidance, not proof of authenticity, compromise,
  deliverability, or malicious intent.
- DNS changes over time, so a result describes the resolver response at the time
  of the check.

## Threat and risk notes

- The tool does not ingest an email, parse `Authentication-Results`, inspect
  links or attachments, or verify mailbox-level delivery.
- A published SPF record does not prove that every legitimate sender is covered
  or that a specific message passed SPF with identifier alignment.
- A public DKIM key does not prove that a specific message has a valid signature.
  No result for one selector does not prove that DKIM is absent.
- A correct-looking DNS posture does not rule out display-name spoofing,
  lookalike domains, compromised mailboxes, forwarding effects, or operational
  misconfiguration.
- DNS-over-HTTPS requests from the public demo are sent to its configured
  resolver. Do not submit a domain if that disclosure is unacceptable.
- Resolver timeouts and errors remain inconclusive findings rather than failures
  of the domain's security controls.

See [SECURITY.md](SECURITY.md) for the project's disclosure scope and safe-use
expectations.

## Current scope

- SPF: existence, raw record, includes, `ip4`, `ip6`, and final `all`
- DMARC: existence, raw record, `p`, `rua`, `ruf`, `pct`, `adkim`, and `aspf`
- DKIM: selector-based lookup only; no generic selector discovery
- Recommendations: next steps for missing, weak, ambiguous, or inconclusive
  records

Reviewer-friendly sample inputs are in
[`docs/sample-domains.json`](docs/sample-domains.json). Live DNS answers may
change after these examples are published.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validation steps

```bash
npm run lint
npm run test
npm run build
npm audit
```

Manual smoke test:

1. Start the app with `npm run dev`.
2. Open `http://localhost:3000`.
3. Analyze `example.com` with DKIM selector `google`.
4. Confirm raw results, posture notes, and recommendations render without an
   application error. DNS answers may change, so do not hard-code a security
   conclusion from this live domain.
5. Submit an invalid value such as `not a domain!` and confirm validation blocks
   the lookup.

## Possible extensions

- API route tests with mocked DNS responses
- Optional import of sanitised message-header fields for side-by-side comparison
- A short screen recording of the analyst workflow

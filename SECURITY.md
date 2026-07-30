# Security Policy

## Project status

Email Authentication Visualizer is a learning and portfolio project, not a
commercial security scanner or a substitute for an organisation's incident
response tooling. Only the current `main` branch and the linked GitHub Pages demo
are maintained.

There is no bug-bounty program, guaranteed response time, or security SLA.
Reports will be reviewed on a best-effort basis.

## Reporting a vulnerability

If GitHub private vulnerability reporting is available for this repository, use
the repository's **Security > Advisories > Report a vulnerability** flow.

If that option is unavailable, open a minimal GitHub issue asking for a private
contact channel. Do not include exploit code, sensitive data, credentials, or
detailed reproduction steps in a public issue.

Please include privately:

- The affected component and deployment mode
- A concise description of the impact
- Reproduction steps using only systems and data you are authorised to test
- Any suggested mitigation, if known

## Scope and safe use

In scope:

- Vulnerabilities in this repository's application code
- Vulnerabilities reproducible on the linked public demo without affecting
  other users or third-party systems
- Input-handling issues demonstrated with synthetic or researcher-owned domains

Out of scope:

- DNS, email, or hosting infrastructure not controlled by this project
- Vulnerability reports based only on automated scanner output without a
  demonstrated impact
- Denial-of-service or high-volume DNS testing
- Social engineering, credential testing, or access to other users' data
- Testing third-party domains or systems without explicit permission

The application reads public DNS records. That does not grant permission to test
or interfere with the domain owner, mail provider, DNS provider, GitHub, or the
DNS-over-HTTPS resolver.

## Data and privacy notes

The application has no user accounts or project database. In the public static
demo, DNS-over-HTTPS lookups are sent from the browser to the configured resolver,
and normal hosting or resolver logs may still record request metadata. Do not
submit domains or selectors you are not comfortable disclosing to those
providers.

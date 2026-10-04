# MELL download service

Cloudflare Worker for the GitHub Pages website's free playbook downloads and hardcopy enquiry capture. It has no payment processor and no customer accounts. All payments and physical delivery are arranged through MELL's WhatsApp catalogue.

`MODE=api` serves the API and protected owner dashboard. It does not host the public website. The only allowed form origins are `https://melltutors.co.za` and `https://www.melltutors.co.za`. Free requests collect email and phone; hardcopy requests collect email and discard any supplied phone.

## Deploying an existing configured service

Use Node 22.13+ or 24 and install the pinned Wrangler version from `package.json`. Run `npm test`, then `npm run deploy`. Authentication uses the official Wrangler account flow. Deploying this code does not transfer the domain or change DNS.

The configuration points to the existing production D1 database. The schema is in `migrations/0001_contacts.sql`; apply migrations through Wrangler before first use. The daily trigger deletes expired grants and abuse-prevention buckets.

The following values must remain Cloudflare secrets and must never be committed:

- `TOKEN_SECRET`: at least 32 random bytes, used for signed form/download/session tokens and hashed abuse-prevention identifiers.
- `ADMIN_SECRET`: separate private owner access key.
- `GOOGLE_SERVICE_ACCOUNT`: JSON credentials for the dedicated reader account, shared as Viewer with only the four free PDFs.
- `FILES`: server-only JSON mapping each supported course to its Algebra and Calculus file identifiers.

Production does not use the preview key. Use `MODE=preview`, assets, a separate preview database and `PREVIEW_KEY` only for an isolated private review deployment. The preview gate runs before static assets and form routes; owner contact access is separate.

## Routes

- `GET /api/form`: short-lived signed token bound to the calling website origin.
- `POST /api/requests`: validates and stores the request, then returns two signed PDF links or the allowlisted catalogue URL.
- `GET /api/download/:course/:subject`: validates the expiring grant and streams the approved Google PDF as an attachment. Google identifiers and links never enter the response.
- `/admin`: protected owner dashboard. Its private owner link starts a one-hour HttpOnly session and removes the access key from the displayed URL.
- `GET /api/admin/contacts.csv`: protected, paginated contact export; includes separate email-update consent and escapes spreadsheet formulas.

Free links last two hours with twelve total uses. Requests are limited to fifteen per IP and five per email per hour. Numbers are normalised to international format. Abuse-prevention buckets store keyed hashes and expire; contacts do not store raw IP addresses. Request body size is bounded to 4 KB. Application request logging is disabled.

MATH1048A supports only the free Block 2 pair. MATH1049A supports the free Semester 2 pair and three Block 4 hardcopy choices: Algebra R400, Calculus R400, both R600. Optional marketing consent must not be treated as consent when unticked.

The service uses Cloudflare's Free plan; [quota enforcement](https://developers.cloudflare.com/d1/platform/pricing/) can stop requests until limits reset. No paid upgrade is required for this deployment.

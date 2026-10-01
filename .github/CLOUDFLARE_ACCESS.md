# Cloudflare access for MELL playbook downloads

This branch provides a GitHub Actions check for authenticated Cloudflare Workers
and D1 API access. It makes GET requests only and leaves the live website and
Cloudflare resources unchanged.

## Complete the connection

1. Open this repository's **Settings → Secrets and variables → Actions**.
2. Add the repository secret **CLOUDFLARE_API_TOKEN** using the existing Cloudflare
   API token for the download project, if one is available. Enter it directly in
   GitHub's secret form.
3. Re-run the **Check Cloudflare access** workflow on this branch. Read its job
   summary to see whether Workers and D1 access succeeds.

The account ID comes from the colleague's handover. A repository secret named
**CLOUDFLARE_ACCOUNT_ID** overrides it if the intended account has changed.

If a new token is needed, limit it to the MELL Cloudflare account. This check
needs Workers Scripts read access and D1 read access. The later download preview
deployment needs Workers Scripts edit access; the download database setup needs
D1 edit access. DNS and billing permissions are outside this task.

An authenticated read proves API access, not deployment permission. Confirm the
deployment permission by deploying and testing the isolated download preview
after its source is available.

## References

- Cloudflare's GitHub Actions authentication guide:
  https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- Workers listing API:
  https://developers.cloudflare.com/api/resources/workers/subresources/scripts/methods/list/
- D1 listing API:
  https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/list/

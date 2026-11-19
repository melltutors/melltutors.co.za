# Website search metadata

Edit site-metadata.json to change a page label, description, preferred image or publication date. Public page titles use the same Page label | MELL Tutors format.

Run node scripts/site-metadata.mjs from the repository to update the static HTML and sitemap, and commit those files alongside the configuration. Run node scripts/site-metadata.mjs --check to detect stale output.

The sitemap lists public images with descriptive alt text in each page’s main content. Use short lowercase filenames with hyphens, and update any media references when a filename changes. Put a video’s thumbnail, content URL and upload date in the metadata for its watch page.

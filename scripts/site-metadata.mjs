import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const local = file => fileURLToPath(new URL(file, root));
const { domain, brand, pages } = JSON.parse(readFileSync(local('scripts/site-metadata.json'), 'utf8'));
const check = process.argv.includes('--check');
const changed = [];
const pageFiles = readdirSync(root).filter(file => file.endsWith('.html'));

for (const file of pageFiles) {
 if (!pages[file]) throw Error('Add '+file+' to scripts/site-metadata.json.');
}

function pageUrl(file) {
 if (!pages[file]) throw Error('Unknown page '+file);
 return new URL(file === 'index.html' ? '/' : file, domain).href;
}

function escape(value) {
 return String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
 })[character]);
}

function assetUrl(file) {
 if (!/^(?:images|media)\/[-a-z0-9/.]+$/.test(file) || !existsSync(local(file))) {
  throw Error('Missing media or non-descriptive filename: '+file);
 }
 return new URL(file, domain).href;
}

function meta(key, value) {
 const attribute = key.startsWith('og:') ? 'property' : 'name';
 return '<meta '+attribute+'="'+key+'" content="'+escape(value)+'">';
}

function schema(type, fields) {
 const json = JSON.stringify({ '@context': 'https://schema.org', '@type': type, ...fields }).replace(/</g, '\\u003c');
 return '<script type="application/ld+json">'+json+'</script>';
}

function publish(file, expected) {
 const path = local(file);
 if (existsSync(path) && readFileSync(path, 'utf8') === expected) return;
 changed.push(file);
 if (!check) writeFileSync(path, expected);
}

function imagesOnPage(file, html) {
 const page = pages[file];
 const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? '';
 const images = new Set();
 for (const [tag] of main.matchAll(/<img\b[^>]*>/gi)) {
  const src = tag.match(/\bsrc="([^"]+)"/i)?.[1];
  const alt = tag.match(/\balt="([^"]*)"/i)?.[1]?.trim();
  if (src && alt && !page.excludeImages?.includes(src)) images.add(assetUrl(src));
 }
 if (page.video) images.add(assetUrl(page.image.file));
 if (page.image && !images.has(assetUrl(page.image.file))) {
  throw Error('The primary image on '+file+' must be visible in the page content.');
 }
 return [...images];
}

function breadcrumbs(file) {
 const path = [file];
 while (pages[path[0]].parent) {
  const parent = pages[path[0]].parent;
  if (path.includes(parent) || !pages[parent]) throw Error('Invalid breadcrumb parent for '+file);
  path.unshift(parent);
 }
 if (path[0] !== 'index.html') path.unshift('index.html');
 return schema('BreadcrumbList', { itemListElement: path.map((name, index) => ({
  '@type': 'ListItem',
  position: index + 1,
  name: pages[name].breadcrumb ?? pages[name].label,
  item: pageUrl(name),
 })) });
}

function metadata(file, images) {
 const page = pages[file];
 const title = page.label+' | '+brand;
 const url = pageUrl(page.alias ?? file);
 const indexable = page.index !== false;
 const tags = ['<title>'+escape(title)+'</title>'];
 if (indexable || page.alias || file === 'privacy.html') tags.push('<link rel="canonical" href="'+url+'">');
 if (page.description) tags.push(meta('description', page.description));
 if (indexable || page.description) tags.push(
  meta('og:site_name', brand),
  meta('og:locale', 'en_ZA'),
  meta('og:type', page.video ? 'video.other' : 'website'),
  meta('og:url', url),
  meta('og:title', title),
  meta('og:description', page.description),
  meta('twitter:card', page.image && page.image.width > page.image.height ? 'summary_large_image' : 'summary'),
  meta('twitter:title', title),
  meta('twitter:description', page.description),
 );
 if (page.image) {
  const { file: image, alt, width, height } = page.image;
  const source = assetUrl(image);
  tags.push(meta('og:image', source), meta('og:image:width', width), meta('og:image:height', height),
   meta('og:image:alt', alt), meta('twitter:image', source), meta('twitter:image:alt', alt));
  tags.push(schema('WebPage', { url, name: title, primaryImageOfPage: {
   '@type': 'ImageObject', url: source, width, height,
  } }));
 }
 if (indexable || file === 'privacy.html') tags.push(breadcrumbs(file));
 if (file === 'index.html') tags.push(schema('WebSite', { name: brand, alternateName: 'MELL', url }));
 if (page.video) {
  const { content, uploadDate, durationSeconds } = page.video;
  tags.push(schema('VideoObject', {
   name: page.label, description: page.description, thumbnailUrl: [assetUrl(page.image.file)],
   uploadDate, duration: 'PT'+durationSeconds+'S', contentUrl: assetUrl(content),
   mainEntityOfPage: url,
  }));
 }
 const block = '<!-- Search metadata: start -->\n'+tags.join('\n')+'\n<!-- Search metadata: end -->';
 return function updateHead(head) {
   const cleaned = head
    .replace(/\s*<!-- Search metadata: start -->[\s\S]*?<!-- Search metadata: end -->/g, '')
    .replace(/<title>[\s\S]*?<\/title>|<link rel="canonical"[^>]*>|<meta (?:name="(?:description|twitter:[^"]+)"|property="og:[^"]+")[^>]*>/gi, '')
    .replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (script, json) => {
     const value = JSON.parse(json);
     if (value['@type'] === 'BreadcrumbList') return '';
     if (file.startsWith('math1049a-') && value['@type'] === 'Product') {
      value.image = images;
      return '<script type="application/ld+json">'+JSON.stringify(value)+'</script>';
     }
     return script;
    });
   const robots = indexable ? 'index, follow, max-image-preview:large' : page.alias ? 'noindex, follow' : null;
   const robotsTag = /<meta name="robots"[^>]*>/;
   const headWithRobots = robots && robotsTag.test(cleaned) ? cleaned.replace(robotsTag, meta('robots', robots)) : cleaned;
   const addRobots = robots && !robotsTag.test(cleaned) ? '\n'+meta('robots', robots) : '';
   return headWithRobots.trimEnd()+addRobots+'\n'+block+'\n';
 };
}

function sitemapEntry(file, images) {
 const { label, updated, description, image, video } = pages[file];
 const lines = ['  <url>', '    <loc>'+pageUrl(file)+'</loc>', '    <lastmod>'+updated+'</lastmod>'];
 for (const source of images) lines.push('    <image:image><image:loc>'+escape(source)+'</image:loc></image:image>');
 if (video) lines.push(
  '    <video:video>',
  '      <video:thumbnail_loc>'+assetUrl(image.file)+'</video:thumbnail_loc>',
  '      <video:title>'+escape(label)+'</video:title>',
  '      <video:description>'+escape(description)+'</video:description>',
  '      <video:content_loc>'+assetUrl(video.content)+'</video:content_loc>',
  '      <video:duration>'+video.durationSeconds+'</video:duration>',
  '      <video:publication_date>'+video.uploadDate+'</video:publication_date>',
  '    </video:video>',
 );
 lines.push('  </url>');
 return lines.join('\n');
}

const entries = [];
for (const [file, page] of Object.entries(pages)) {
 const html = readFileSync(local(file), 'utf8');
 const images = imagesOnPage(file, html);
 if (page.index !== false) {
  if (!page.description || !/^\d{4}-\d{2}-\d{2}$/.test(page.updated)) throw Error('Missing search description or update date for '+file);
  entries.push(sitemapEntry(file, images));
 }
 const updateHead = metadata(file, images);
 const head = /(<head>)([\s\S]*?)(<\/head>)/i;
 if (!head.test(html)) throw Error('Missing head element in '+file);
 publish(file, html.replace(head, (_, opening, content, closing) => opening+updateHead(content)+closing));
}
publish('sitemap.xml', [
 '<?xml version="1.0" encoding="UTF-8"?>',
 '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
 '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"',
 '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">',
 ...entries, '</urlset>', '',
].join('\n'));

if (check && changed.length) {
 console.error('Run node scripts/site-metadata.mjs to update: '+changed.join(', '));
 process.exitCode = 1;
} else {
 console.log(changed.length ? 'Updated '+changed.length+' metadata files.' : 'Site metadata is up to date.');
}

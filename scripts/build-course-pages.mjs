import { readFileSync, writeFileSync } from 'node:fs';

const shared = readFileSync('careers.html', 'utf8');
const offers = readFileSync('offers.html', 'utf8');
const offerCards = [...offers.matchAll(/<article class="offer-card (?:premium|apex)-card" data-reveal>[\s\S]*?<\/article>/g)].map(match => match[0]);
const header = shared.match(/<header class="site-header[^>]*>[\s\S]*?<\/header>/)?.[0]
  .replace('href="careers.html" aria-current="page"', 'href="careers.html"')
  .replace('href="offers.html"', 'href="offers.html" aria-current="page"');
const footer = shared.match(/<footer class="site-footer"[\s\S]*?<\/footer>/)?.[0];
const method = shared.match(/<section class="section dark-section teaching-method"[\s\S]*?<\/section>/)?.[0];
if (!header || !footer || !method || offerCards.length !== 2) throw Error('Shared page components were not found.');

const courses = [
  {
    file: 'engineering-mathematics-i.html', subject: 'Engineering Mathematics I', short: 'Mathematics I',
    hero: 'images/experience/mell-engineering-maths-tutoring-class.webp', width: 1250, height: 853,
    heroAlt: 'Engineering Mathematics I students working through maths in a classroom',
    heroPosition: 'center 49%',
    codes: [['Full-time', 'MATH1048A · MATH1049A'], ['Part-time', 'MATH1046A · MATH1047A']],
    premiumPrice: 'R880', apexPrice: 'R30,000', hours: '5 hours a week',
    split: '2 Algebra + 3 Calculus', playbooks: true,
    description: 'In-person Engineering Mathematics I tutoring at Wits. Small Saturday classes or individual support for MATH1048A, MATH1049A, MATH1046A and MATH1047A.',
  },
  {
    file: 'engineering-mathematics-ii.html', subject: 'Engineering Mathematics II', short: 'Mathematics II',
    hero: 'images/mell-engineering-mathematics-ii-tutoring.jpg', width: 1672, height: 941,
    heroAlt: 'Tutor and students working together on advanced mathematics in a classroom',
    heroPosition: 'center 53%',
    codes: [['Full-time', 'MATH2011A/2 · MATH2014A/2 · MATH2035A/2'], ['Part-time', 'MATH2027A · MATH2023A']],
    premiumPrice: 'R880', apexPrice: 'R30,000', hours: '5 hours a week',
    split: '2 Algebra + 3 Calculus', playbooks: false,
    description: 'In-person Engineering Mathematics II tutoring at Wits. Small Saturday classes or individual support for full-time and part-time students.',
  },
  {
    file: 'physics-major-i.html', subject: 'Physics Major I', short: 'Physics I',
    hero: 'images/mell-physics-i-tutoring.jpg', width: 1672, height: 941,
    heroAlt: 'Tutor and students working through a Physics mechanics problem in a classroom',
    heroPosition: 'center 52%',
    codes: [['Full-time', 'PHYS1000A/1 · PHYS1033A/1'], ['Part-time', 'PHYS1038A/1']],
    premiumPrice: 'R900', apexPrice: 'R35,000', hours: '4 hours a week',
    split: '', playbooks: false,
    description: 'In-person Physics Major I tutoring at Wits. Small Saturday classes or individual support for PHYS1000A/1, PHYS1033A/1 and PHYS1038A/1.',
  },
];

const arrow = '<svg class="icon-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 18 18 6M6 6h12v12"/></svg>';
const link = (href, label, className = 'button primary') => `<a class="${className}" href="${href}">${label} ${arrow}</a>`;
const codeList = course => course.codes.map(([mode, codes]) => `<div><dt>${mode}</dt><dd>${codes}</dd></div>`).join('');
const courseOfferCards = course => offerCards.map(card => {
  const physics = course.file === 'physics-major-i.html';
  return card
    .replaceAll(' data-subject-content="mathematics-i,mathematics-ii"', physics ? ' hidden' : '')
    .replaceAll(' data-subject-content="physics-i" hidden', physics ? '' : ' hidden')
    .replace(' id="premium-subject-schedule" role="tabpanel" aria-labelledby="subject-tab-mathematics-i"', '');
}).join('');

function playbooks() {
  return `<section class="section course-playbooks" aria-labelledby="course-playbooks-title"><div class="container">
    <div class="course-section-heading"><p class="eyebrow">Engineering Mathematics I</p><h2 id="course-playbooks-title">Your playbooks.</h2></div>
    <div class="course-book-feature" data-reveal>
      <div class="course-book-pair"><img src="images/mell-math1048a-block-2-algebra-playbook.webp" width="640" height="855" loading="lazy" alt="MATH1048A Block 2 Algebra playbook cover"><img src="images/mell-math1048a-block-2-calculus-playbook.webp" width="640" height="908" loading="lazy" alt="MATH1048A Block 2 Calculus playbook cover"></div>
      <div><p class="eyebrow">Semester 1 · MATH1048A</p><h3>Start here.</h3><p>Free Algebra and Calculus PDFs for Block 2. Practice for each skill and chapter tests.</p>${link('math1048a.html', 'Get the free pair')}</div>
    </div>
    <div class="course-book-later"><div><p class="eyebrow">Semester 2 · MATH1049A</p><h3>Next semester.</h3><p>Free Algebra and Calculus PDFs.</p>${link('math1049a.html', 'Get the PDFs', 'text-link')}</div><div><p class="eyebrow">Block 4 · MATH1049A</p><h3>Printed, with solutions.</h3><p>R400 each or R600 for both.</p>${link('math1049a-bundle.html', 'See the hardcopies', 'text-link')}</div></div>
  </div></section>`;
}

function page(course) {
  return `<!doctype html>
<html lang="en-ZA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="index, follow, max-image-preview:large"><meta name="theme-color" content="#faf9f6"><meta name="author" content="MELL Tutors"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600&family=Montserrat:wght@400;500;600;700&display=swap" media="print" onload="this.media=&quot;all&quot;"><noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600&family=Montserrat:wght@400;500;600;700&display=swap"></noscript><link rel="stylesheet" href="styles.css?v=20261124brickmatch"><link rel="stylesheet" href="site-chrome.css?v=20261120reveal"><link rel="stylesheet" href="teaching-method.css?v=20261119shared"><link rel="stylesheet" href="offers.css?v=20261125faq"><link rel="stylesheet" href="course-pages.css?v=20261125offerfit"><script src="script.js?v=20261120opening" defer></script><link rel="icon" type="image/png" sizes="192x192" href="/favicon.png?v=20261116mark"><link rel="shortcut icon" href="/favicon.ico?v=20261116mark"><link rel="apple-touch-icon" href="/favicon.png?v=20261116mark"></head>
<body class="course-page"><a class="skip" href="#main">Skip to content</a>${header}<main id="main">
  <section class="course-hero" aria-labelledby="course-title"><img src="${course.hero}" width="${course.width}" height="${course.height}" alt="${course.heroAlt}" style="object-position:${course.heroPosition}" fetchpriority="high"><div class="container course-hero-content"><p class="eyebrow" data-reveal>Wits · In-person tutoring</p><h1 id="course-title" data-reveal>${course.subject}.</h1></div></section>
  <section class="course-codes" aria-label="Supported module codes"><div class="container course-codes-inner"><p class="eyebrow">Your modules</p><dl>${codeList(course)}</dl></div></section>
  <section class="section course-options offers-intro" aria-labelledby="course-options-title"><div class="container"><div class="course-section-heading"><p class="eyebrow">${course.short}</p><h2 id="course-options-title">Choose your tutoring.</h2></div><div class="offer-grid">${courseOfferCards(course)}</div></div></section>
  ${method}
  ${course.playbooks ? playbooks() : ''}
  <section class="section course-experience" aria-labelledby="course-experience-title"><div class="container"><div class="course-section-heading"><p class="eyebrow">The MELL experience</p><h2 id="course-experience-title">From the classroom.</h2></div><div class="course-review-grid"><figure data-reveal><div class="review-stars" aria-label="5 out of 5 stars">★★★★★</div><blockquote>“He also regularly checked our understanding by giving us questions to complete and then going through our work with us.”</blockquote><figcaption><strong>Ntando Mavuso</strong><a href="https://maps.app.goo.gl/zR47zhRhVm75x12h6" target="_blank" rel="noopener noreferrer">Read on Google ↗</a></figcaption></figure><figure data-reveal><div class="review-stars" aria-label="5 out of 5 stars">★★★★★</div><blockquote>“The in person tutorials offered are very supportive and every student is helped according to their own pace and level of knowledge”</blockquote><figcaption><strong>Tharollo Koloti</strong><a href="https://maps.app.goo.gl/HDWEhiASvxih85186" target="_blank" rel="noopener noreferrer">Read on Google ↗</a></figcaption></figure></div></div></section>
  <nav class="course-other" aria-label="Explore other courses"><div class="container"><p class="eyebrow">Also at MELL</p><div>${courses.filter(item => item.file !== course.file).map(item => link(item.file, item.subject, 'course-other-link')).join('')}</div></div></nav>
</main>${footer}</body></html>\n`;
}

for (const course of courses) writeFileSync(course.file, page(course));

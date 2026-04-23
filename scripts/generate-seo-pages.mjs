import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  BRAND_LOGO_URL,
  BRAND_NAME,
  DEFAULT_OG_IMAGE,
  escapeHtml,
  getAllSeoRoutes,
  SITE_URL,
  toCanonicalUrl,
} from './seo-shared.mjs';

const DIST_INDEX_PATH = resolve('dist', 'index.html');

function buildBreadcrumbSchema(route) {
  if (route.path === '/') {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE_URL }],
    };
  }

  if (route.type === 'article') {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
        {
          '@type': 'ListItem',
          position: 3,
          name: route.category,
          item: `${SITE_URL}/blog/categorie/${route.categorySlug}`,
        },
        { '@type': 'ListItem', position: 4, name: route.heading, item: route.canonicalUrl },
      ],
    };
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: route.heading, item: route.canonicalUrl },
    ],
  };
}

function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND_NAME,
    url: SITE_URL,
    logo: BRAND_LOGO_URL,
    image: DEFAULT_OG_IMAGE,
    description:
      'Factourati est un logiciel marocain de facturation et de gestion pour centraliser devis, factures, paiements, stock, fournisseurs et projets.',
    sameAs: [
      'https://web.facebook.com/profile.php?id=61585975779434',
      'https://x.com/FacTourati',
      'https://www.linkedin.com/company/factourati',
      'https://www.instagram.com/factourati',
    ],
  };
}

function buildRouteSchema(route) {
  if (route.type === 'article') {
    return [
      buildOrganizationSchema(),
      {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: route.heading,
        name: route.title,
        description: route.description,
        url: route.canonicalUrl,
        mainEntityOfPage: route.canonicalUrl,
        image: [route.image],
        datePublished: route.publishedAt || route.modifiedAt,
        dateModified: route.modifiedAt || route.publishedAt,
        keywords: route.keywords,
        author: { '@type': 'Organization', name: BRAND_NAME },
        publisher: {
          '@type': 'Organization',
          name: BRAND_NAME,
          logo: { '@type': 'ImageObject', url: BRAND_LOGO_URL },
        },
      },
      buildBreadcrumbSchema(route),
    ];
  }

  return [
    buildOrganizationSchema(),
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: route.title,
      url: route.canonicalUrl,
      description: route.description,
      inLanguage: 'fr-MA',
      isPartOf: {
        '@type': 'WebSite',
        name: BRAND_NAME,
        url: SITE_URL,
      },
      significantLink: route.links.map((link) => (link.href.startsWith('http') ? link.href : toCanonicalUrl(link.href))),
    },
    buildBreadcrumbSchema(route),
  ];
}

function buildSeoHead(route) {
  const schemaMarkup = buildRouteSchema(route)
    .map((entry) => `<script type="application/ld+json">${JSON.stringify(entry)}</script>`)
    .join('\n    ');
  const ogType = route.type === 'article' ? 'article' : 'website';
  const ogImage = route.image || DEFAULT_OG_IMAGE;
  const imageAlt = route.imageAlt || route.heading;

  return `
    <title>${escapeHtml(route.title)}</title>
    <meta name="description" content="${escapeHtml(route.description)}" />
    <meta name="keywords" content="${escapeHtml(route.keywords || '')}" />
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    <meta name="author" content="${BRAND_NAME}" />
    <link rel="canonical" href="${route.canonicalUrl}" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:url" content="${route.canonicalUrl}" />
    <meta property="og:site_name" content="${BRAND_NAME}" />
    <meta property="og:locale" content="fr_MA" />
    <meta property="og:title" content="${escapeHtml(route.title)}" />
    <meta property="og:description" content="${escapeHtml(route.description)}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:secure_url" content="${ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@FacTourati" />
    <meta name="twitter:title" content="${escapeHtml(route.title)}" />
    <meta name="twitter:description" content="${escapeHtml(route.description)}" />
    <meta name="twitter:url" content="${route.canonicalUrl}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />
    ${schemaMarkup}`;
}

function buildFallback(route) {
  const introBlocks = route.sections
    .filter(Boolean)
    .map((section) => `<li>${escapeHtml(section)}</li>`)
    .join('\n');
  const linkMarkup = route.links
    .map((link, index) => {
      const separator = index === route.links.length - 1 ? '' : '\n          <span> | </span>';
      const href = link.href.startsWith('http') ? link.href : link.href;
      return `          <a href="${escapeHtml(href)}">${escapeHtml(link.label)}</a>${separator}`;
    })
    .join('\n');

  return `      <main style="margin:0 auto;max-width:960px;padding:32px 16px;font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;">
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#0f766e;">${BRAND_NAME}</p>
        <h1 style="margin:0 0 16px;font-size:36px;line-height:1.2;">${escapeHtml(route.heading)}</h1>
        <p style="margin:0 0 18px;font-size:18px;">${escapeHtml(route.intro)}</p>
        <ul style="margin:0 0 22px;padding-left:22px;font-size:16px;">
${introBlocks}
        </ul>
        <p style="margin:0;font-size:16px;">
${linkMarkup}
        </p>
      </main>`;
}

function stripExistingSeoMarkup(template) {
  const patterns = [
    /<title>[\s\S]*?<\/title>\s*/gi,
    /<meta\s+name="description"[^>]*>\s*/gi,
    /<meta\s+name="keywords"[^>]*>\s*/gi,
    /<meta\s+name="robots"[^>]*>\s*/gi,
    /<meta\s+name="googlebot"[^>]*>\s*/gi,
    /<meta\s+name="author"[^>]*>\s*/gi,
    /<link\s+rel="canonical"[^>]*>\s*/gi,
    /<meta\s+property="og:[^"]+"[^>]*>\s*/gi,
    /<meta\s+name="twitter:[^"]+"[^>]*>\s*/gi,
    /<script\s+type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi,
  ];

  return patterns.reduce((html, pattern) => html.replace(pattern, ''), template);
}

function prepareHtml(template, route) {
  let html = stripExistingSeoMarkup(template);
  html = html.replace('</head>', `${buildSeoHead(route)}\n  </head>`);
  html = html.replace(
    /<div id="root">[\s\S]*?<\/div>\s*\n\s*<noscript>/i,
    `<div id="root">\n${buildFallback(route)}\n    </div>\n\n    <noscript>`,
  );

  return html;
}

if (!existsSync(DIST_INDEX_PATH)) {
  throw new Error('dist/index.html is missing. Run vite build before generating SEO pages.');
}

const template = readFileSync(DIST_INDEX_PATH, 'utf8');
const { staticRoutes, articleRoutes } = await getAllSeoRoutes();
const routes = [...staticRoutes, ...articleRoutes];

routes.forEach((route) => {
  const html = prepareHtml(template, route);
  const outputPath = route.path === '/' ? DIST_INDEX_PATH : resolve('dist', route.path.slice(1), 'index.html');

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, html, 'utf8');
});

['sitemap.xml', 'robots.txt'].forEach((file) => {
  const sourcePath = resolve('public', file);
  const outputPath = resolve('dist', file);

  if (existsSync(sourcePath)) {
    copyFileSync(sourcePath, outputPath);
  }
});

console.log(`[seo-pages] Generated ${routes.length} prerendered SEO entry points`);

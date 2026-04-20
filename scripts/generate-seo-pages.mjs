import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const SITE_URL = 'https://factourati.com';
const BRAND_NAME = 'Factourati';
const BRAND_LOGO_URL = `${SITE_URL}/files_3254075-1761082431431-image.png`;
const DEFAULT_OG_IMAGE = `${SITE_URL}/2.png`;
const DIST_INDEX_PATH = resolve('dist', 'index.html');

const routes = [
  {
    path: '/',
    title: 'Factourati | Logiciel de facturation Maroc pour PME',
    description:
      'Factourati est un logiciel marocain de facturation et gestion pour creer devis, factures, suivre paiements, stock, fournisseurs et projets.',
    keywords:
      'logiciel facturation maroc, logiciel facture maroc, ERP maroc, gestion stock maroc, logiciel pme maroc, facture maroc',
    heading: 'Logiciel de facturation et gestion pour PME au Maroc',
    intro:
      'Centralisez vos devis, factures, paiements, stock, fournisseurs et projets dans une seule plateforme pensee pour les entreprises marocaines.',
    sections: [
      'Creez des devis et factures professionnels avec ICE, IF, RC, TVA et total TTC.',
      'Suivez les paiements, les impayes, les clients et les fournisseurs sans multiplier les fichiers Excel.',
      'Essayez gratuitement Factourati avant de choisir une formule mensuelle, 6 mois ou annuelle.',
    ],
    links: [
      { label: 'Voir les tarifs', href: '/tarifs' },
      { label: 'Tester le generateur gratuit', href: '/generateur-facture' },
      { label: 'Voir les modules', href: '/modules' },
    ],
  },
  {
    path: '/blog',
    title: 'Blog Factourati | Guides facturation, stock et gestion Maroc',
    description:
      'Guides pratiques pour mieux gerer une entreprise au Maroc : facturation, stock, fiscalite, ERP, paiements, clients et organisation PME.',
    keywords:
      'blog facturation maroc, guide facture maroc, gestion entreprise maroc, stock maroc, ERP PME maroc',
    heading: 'Guides pratiques pour mieux gerer votre entreprise au Maroc',
    intro:
      'Le blog Factourati regroupe des conseils utiles pour creer des factures, organiser le stock, suivre les paiements et piloter une PME marocaine.',
    sections: [
      'Guides facturation pour comprendre les devis, factures, paiements, relances et mentions utiles.',
      'Conseils stock et fournisseurs pour mieux suivre les produits, mouvements et ruptures.',
      'Articles ERP et gestion pour passer d une organisation dispersee a une base de travail plus claire.',
    ],
    links: [
      { label: 'Lire les articles', href: '/blog' },
      { label: 'Voir les modules', href: '/modules' },
      { label: 'Comparer les tarifs', href: '/tarifs' },
    ],
  },
  {
    path: '/tarifs',
    title: 'Tarifs Factourati | 199 DH/mois, 999 DH/6 mois, 1999 DH/an',
    description:
      'Tarifs Factourati au Maroc : 199 DH par mois, 999 DH pour 6 mois et 1999 DH par an, avec essai gratuit pour les PME.',
    keywords:
      'tarifs factourati, logiciel facturation maroc prix, ERP maroc tarif, logiciel gestion maroc prix',
    heading: 'Tarifs Factourati pour digitaliser la gestion de votre entreprise',
    intro:
      'Factourati propose des prix simples pour centraliser devis, factures, paiements, stock, fournisseurs, projets et rapports.',
    sections: [
      'Formule mensuelle a 199 DH pour demarrer sans engagement long.',
      'Formule 6 mois a 999 DH pour installer une routine de gestion stable.',
      'Formule annuelle a 1999 DH pour piloter durablement votre entreprise.',
    ],
    links: [
      { label: 'Commencer gratuitement', href: '/login?mode=register' },
      { label: 'Lire la FAQ', href: '/faq' },
      { label: 'Tester une facture', href: '/generateur-facture' },
    ],
  },
  {
    path: '/faq',
    title: 'FAQ Factourati | Questions sur tarifs, essai et facturation',
    description:
      'Reponses aux questions frequentes sur Factourati : tarifs, essai gratuit, generateur de facture, stock, paiements et gestion PME au Maroc.',
    keywords:
      'faq factourati, questions logiciel facturation maroc, essai gratuit factourati, facture maroc FAQ',
    heading: 'FAQ Factourati pour choisir votre logiciel de gestion',
    intro:
      'Cette FAQ explique comment Factourati aide les PME marocaines a creer des factures, suivre les paiements et organiser leur activite.',
    sections: [
      'Un mois d essai gratuit est disponible sans carte bancaire.',
      'Le generateur gratuit permet de creer une facture sans compte.',
      'Le compte complet ajoute la sauvegarde, les templates Pro, les modules stock, fournisseurs, projets et rapports.',
    ],
    links: [
      { label: 'Voir les tarifs', href: '/tarifs' },
      { label: 'Voir les modules', href: '/modules' },
      { label: 'Creer une facture gratuite', href: '/generateur-facture' },
    ],
  },
  {
    path: '/generateur-facture',
    title: 'Generateur de facture gratuit Maroc | Creer une facture PDF',
    description:
      'Creez gratuitement une facture professionnelle au Maroc avec numero, date, client, ICE, articles, TVA, total HT et total TTC.',
    keywords:
      'generateur facture gratuit maroc, creer facture maroc, modele facture maroc, facture PDF maroc, facture professionnelle maroc',
    heading: 'Generateur de facture gratuit au Maroc',
    intro:
      'Remplissez vos informations, ajoutez vos articles, calculez la TVA et imprimez une facture professionnelle en PDF avec le template gratuit Factourati.',
    sections: [
      'Utile pour tester rapidement un modele de facture sans creer de compte.',
      'Les informations entreprise, client, ICE, prix HT, TVA et total TTC sont visibles dans l apercu.',
      'Pour sauvegarder l historique, suivre les paiements et utiliser les templates Pro, creez un compte Factourati.',
    ],
    links: [
      { label: 'Creer ma facture', href: '/generateur-facture#generateur' },
      { label: 'Voir les tarifs', href: '/tarifs' },
      { label: 'Voir les modules', href: '/modules' },
    ],
  },
  {
    path: '/modules',
    title: 'Modules Factourati | Devis, factures, stock et gestion PME',
    description:
      'Modules Factourati pour PME au Maroc : devis, facturation, paiements, stock, fournisseurs, projets, RH et rapports.',
    keywords:
      'modules factourati, logiciel devis facture maroc, gestion stock maroc, fournisseurs projets PME, ERP maroc',
    heading: 'Modules Factourati pour gerer une PME au Maroc',
    intro:
      'Les modules Factourati connectent devis, factures, paiements, stock, fournisseurs, projets, RH et rapports dans une seule interface.',
    sections: [
      'Transformez un devis accepte en facture et gardez un historique client clair.',
      'Suivez les produits, quantites, mouvements de stock, fournisseurs et restes a payer.',
      'Analysez les ventes, paiements, clients et indicateurs pour mieux piloter l activite.',
    ],
    links: [
      { label: 'Comparer les tarifs', href: '/tarifs' },
      { label: 'Voir les secteurs', href: '/secteurs' },
      { label: 'Tester le generateur', href: '/generateur-facture' },
    ],
  },
  {
    path: '/secteurs',
    title: 'Secteurs Factourati | ERP et facturation pour PME Maroc',
    description:
      'Factourati accompagne BTP, distribution, e-commerce, industrie, communication, services, commerces et PME marocaines.',
    keywords:
      'secteurs factourati, logiciel BTP maroc, ERP distribution maroc, gestion stock ecommerce maroc, logiciel PME maroc',
    heading: 'Logiciel de facturation adapte aux secteurs au Maroc',
    intro:
      'Factourati aide les entreprises du BTP, de la distribution, du commerce, des services et de l industrie a mieux gerer leurs documents et operations.',
    sections: [
      'BTP et chantiers : devis, factures, achats fournisseurs, projets et avancement.',
      'Distribution et commerce : ventes, commandes, stock, fournisseurs, marges et paiements.',
      'Services et agences : devis rapides, factures propres, relances et historique client.',
    ],
    links: [
      { label: 'Voir les modules', href: '/modules' },
      { label: 'Tester une facture gratuite', href: '/generateur-facture' },
      { label: 'Lire la FAQ', href: '/faq' },
    ],
  },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function routeUrl(routePath) {
  return routePath === '/' ? `${SITE_URL}/` : `${SITE_URL}${routePath}`;
}

function buildSchema(route) {
  const url = routeUrl(route.path);

  return [
    {
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
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: route.title,
      url,
      description: route.description,
      inLanguage: 'fr-MA',
      isPartOf: {
        '@type': 'WebSite',
        name: BRAND_NAME,
        url: SITE_URL,
      },
      about: {
        '@type': 'SoftwareApplication',
        name: BRAND_NAME,
        url: SITE_URL,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
      },
      significantLink: route.links.map((link) => (link.href.startsWith('http') ? link.href : `${SITE_URL}${link.href}`)),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement:
        route.path === '/'
          ? [{ '@type': 'ListItem', position: 1, name: 'Accueil', item: `${SITE_URL}/` }]
          : [
              { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${SITE_URL}/` },
              { '@type': 'ListItem', position: 2, name: route.heading, item: url },
            ],
    },
  ];
}

function buildSeoHead(route) {
  const url = routeUrl(route.path);
  const schema = buildSchema(route)
    .map((entry) => `<script type="application/ld+json">${JSON.stringify(entry)}</script>`)
    .join('\n    ');

  return `
    <title>${escapeHtml(route.title)}</title>
    <meta name="description" content="${escapeHtml(route.description)}" />
    <meta name="keywords" content="${escapeHtml(route.keywords)}" />
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    <meta name="author" content="${BRAND_NAME}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${url}" />
    <meta property="og:site_name" content="${BRAND_NAME}" />
    <meta property="og:locale" content="fr_MA" />
    <meta property="og:title" content="${escapeHtml(route.title)}" />
    <meta property="og:description" content="${escapeHtml(route.description)}" />
    <meta property="og:image" content="${DEFAULT_OG_IMAGE}" />
    <meta property="og:image:secure_url" content="${DEFAULT_OG_IMAGE}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:alt" content="${escapeHtml(route.heading)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@FacTourati" />
    <meta name="twitter:title" content="${escapeHtml(route.title)}" />
    <meta name="twitter:description" content="${escapeHtml(route.description)}" />
    <meta name="twitter:url" content="${url}" />
    <meta name="twitter:image" content="${DEFAULT_OG_IMAGE}" />
    <meta name="twitter:image:alt" content="${escapeHtml(route.heading)}" />
    ${schema}`;
}

function buildFallback(route) {
  return `      <main style="margin:0 auto;max-width:960px;padding:32px 16px;font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;">
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#0f766e;">${BRAND_NAME}</p>
        <h1 style="margin:0 0 16px;font-size:36px;line-height:1.2;">${escapeHtml(route.heading)}</h1>
        <p style="margin:0 0 18px;font-size:18px;">${escapeHtml(route.intro)}</p>
        <ul style="margin:0 0 22px;padding-left:22px;font-size:16px;">
${route.sections.map((section) => `          <li>${escapeHtml(section)}</li>`).join('\n')}
        </ul>
        <p style="margin:0;font-size:16px;">
${route.links
  .map((link, index) => {
    const separator = index === route.links.length - 1 ? '' : '\n          <span> | </span>';
    return `          <a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>${separator}`;
  })
  .join('\n')}
        </p>
      </main>`;
}

function prepareHtml(template, route) {
  let html = template
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/i, '')
    .replace(/<meta\s+name="keywords"[^>]*>\s*/i, '')
    .replace(/<meta\s+name="robots"[^>]*>\s*/i, '')
    .replace(/<meta\s+name="googlebot"[^>]*>\s*/i, '')
    .replace(/<meta\s+name="author"[^>]*>\s*/i, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/i, '')
    .replace(/<meta\s+property="og:[^"]+"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="twitter:[^"]+"[^>]*>\s*/gi, '')
    .replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi, '');

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

routes.forEach((route) => {
  const html = prepareHtml(template, route);
  const outputPath = route.path === '/' ? DIST_INDEX_PATH : resolve('dist', route.path.slice(1), 'index.html');

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, html, 'utf8');
});

const publicFiles = ['sitemap.xml', 'robots.txt'];
publicFiles.forEach((file) => {
  const sourcePath = resolve('public', file);
  const outputPath = resolve('dist', file);

  if (existsSync(sourcePath)) {
    copyFileSync(sourcePath, outputPath);
  }
});

console.log(`SEO pages generated: ${routes.length} routes`);

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp } from 'firebase/app';
import { collection, getDocs, getFirestore, setLogLevel } from 'firebase/firestore';

export const SITE_URL = 'https://factourati.com';
export const BRAND_NAME = 'Factourati';
export const BRAND_LOGO_URL = `${SITE_URL}/files_3254075-1761082431431-image.png`;
export const DEFAULT_OG_IMAGE = `${SITE_URL}/2.png`;
export const BUILD_DATE = new Date().toISOString().slice(0, 10);

const SITE_ORIGIN = new URL(SITE_URL).origin;
const BLOG_POSTS_COLLECTION = 'blogPosts';

const staticCategorySlugMap = {
  facturation: 'facturation',
  stock: 'stock',
  erp: 'erp',
  fiscalite: 'fiscalite',
  gestion: 'gestion',
  projets: 'gestion',
  projet: 'gestion',
  logiciel: 'logiciel',
};

const firebaseConfig = {
  apiKey: 'AIzaSyDrNiFLm_jwAS6pRstetAOo3KOWkzmf8y0',
  authDomain: 'facture-bc21d.firebaseapp.com',
  projectId: 'facture-bc21d',
  storageBucket: 'facture-bc21d.firebasestorage.app',
  messagingSenderId: '15503201564',
  appId: '1:15503201564:web:8f61217b6e35dfbd2ad6d9',
  measurementId: 'G-581B5HXX2H',
};

export const publicPageSeoRoutes = [
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
    changefreq: 'weekly',
    priority: '1.0',
    type: 'website',
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
    changefreq: 'weekly',
    priority: '0.9',
    type: 'website',
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
    changefreq: 'weekly',
    priority: '0.9',
    type: 'website',
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
    changefreq: 'weekly',
    priority: '0.8',
    type: 'website',
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
    changefreq: 'weekly',
    priority: '0.9',
    type: 'website',
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
    changefreq: 'weekly',
    priority: '0.8',
    type: 'website',
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
    changefreq: 'weekly',
    priority: '0.8',
    type: 'website',
  },
];

function normalizePathname(pathname) {
  const collapsedPath = String(pathname || '/').replace(/\/{2,}/g, '/');
  const trimmedPath = collapsedPath.replace(/\/+$/, '');
  return trimmedPath || '/';
}

export function normalizePublicPath(path = '/') {
  const rawPath = String(path || '').trim();

  if (!rawPath || rawPath === '/') {
    return '/';
  }

  if (/^https?:\/\//i.test(rawPath)) {
    try {
      return normalizePathname(new URL(rawPath).pathname);
    } catch {
      return '/';
    }
  }

  const withoutHash = rawPath.split('#', 1)[0] || rawPath;
  const withoutSearch = withoutHash.split('?', 1)[0] || withoutHash;
  const prefixedPath = withoutSearch.startsWith('/') ? withoutSearch : `/${withoutSearch}`;

  return normalizePathname(prefixedPath);
}

export function toCanonicalUrl(pathOrUrl = '/') {
  const rawValue = String(pathOrUrl || '').trim();

  if (!rawValue) {
    return SITE_URL;
  }

  if (/^https?:\/\//i.test(rawValue)) {
    try {
      const parsedUrl = new URL(rawValue);
      const normalizedPath = normalizePathname(parsedUrl.pathname);
      return normalizedPath === '/' ? SITE_URL : `${SITE_ORIGIN}${normalizedPath}`;
    } catch {
      return SITE_URL;
    }
  }

  const normalizedPath = normalizePublicPath(rawValue);
  return normalizedPath === '/' ? SITE_URL : `${SITE_ORIGIN}${normalizedPath}`;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function ensureString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalizedValue = value.trim();
  const invalidValues = new Set(['undefined', 'null', '[object object]']);

  return invalidValues.has(normalizedValue.toLowerCase()) ? fallback : normalizedValue;
}

function ensureStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => ensureString(item)).filter(Boolean);
}

function stripHtml(value) {
  return ensureString(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function slugify(value) {
  return ensureString(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resolveCategorySlug(category, explicitSlug) {
  const providedSlug = ensureString(explicitSlug);
  if (providedSlug) {
    return providedSlug;
  }

  const normalizedCategory = slugify(category);
  return staticCategorySlugMap[normalizedCategory] || normalizedCategory || 'gestion';
}

function normalizeDateIso(value) {
  if (!value) {
    return '';
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === 'number') {
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString();
  }

  if (typeof value === 'string') {
    const trimmedValue = ensureString(value);

    if (!trimmedValue) {
      return '';
    }

    const frenchDate = trimmedValue.match(/^(\d{1,2})\s+([a-zA-Zéûîôàèù]+)\s+(\d{4})$/);
    if (frenchDate) {
      const [, day, rawMonth, year] = frenchDate;
      const monthMap = {
        janvier: 0,
        fevrier: 1,
        février: 1,
        mars: 2,
        avril: 3,
        mai: 4,
        juin: 5,
        juillet: 6,
        aout: 7,
        août: 7,
        septembre: 8,
        octobre: 9,
        novembre: 10,
        decembre: 11,
        décembre: 11,
      };
      const monthIndex = monthMap[rawMonth.toLowerCase()];
      if (monthIndex !== undefined) {
        const parsedDate = new Date(Number(year), monthIndex, Number(day));
        return Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString();
      }
    }

    const parsedDate = new Date(trimmedValue);
    return Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString();
  }

  if (typeof value === 'object') {
    const record = value;

    if (typeof record?.toDate === 'function') {
      const parsedDate = record.toDate();
      return Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString();
    }

    const seconds = typeof record?.seconds === 'number' ? record.seconds : record?._seconds;
    const nanoseconds = typeof record?.nanoseconds === 'number' ? record.nanoseconds : record?._nanoseconds || 0;

    if (typeof seconds === 'number') {
      const parsedDate = new Date(seconds * 1000 + Math.floor(nanoseconds / 1000000));
      return Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString();
    }
  }

  return '';
}

function loadStaticBlogArticlesFromSource() {
  const sourcePath = resolve('src', 'data', 'blogArticles.ts');
  const source = readFileSync(sourcePath, 'utf8');
  const transformedSource = source
    .replace(/^import[^\n]*\n/gm, '')
    .replace(/export const blogArticles:\s*BlogArticle\[\]\s*=/, 'const blogArticles =')
    .replace(/\nexport const featuredArticle[\s\S]*$/, '\n');

  const evaluator = new Function(`${transformedSource}\nreturn blogArticles;`);
  const articles = evaluator();

  return Array.isArray(articles) ? articles : [];
}

async function fetchPublishedFirestoreArticles() {
  try {
    setLogLevel('silent');
    const app = initializeApp(firebaseConfig, 'seo-build-app');
    const db = getFirestore(app);
    const snapshot = await getDocs(collection(db, BLOG_POSTS_COLLECTION));

    return snapshot.docs
      .map((docSnapshot) => {
        const data = docSnapshot.data();
        const slug = ensureString(data.slug);
        const title = ensureString(data.title);
        const description = ensureString(data.description);
        const excerpt = ensureString(data.excerpt);

        if (!slug || !title || !description || data.isPublished === false) {
          return null;
        }

        return {
          id: docSnapshot.id,
          slug,
          title,
          seoTitle: ensureString(data.seoTitle) || title,
          description,
          excerpt: excerpt || description,
          category: ensureString(data.category) || 'Gestion',
          categorySlug: resolveCategorySlug(data.category, data.categorySlug),
          image: ensureString(data.image),
          imageAlt: ensureString(data.imageAlt) || title,
          keywords: ensureStringArray(data.keywords),
          intro: ensureString(data.intro) || excerpt || description,
          summaryPoints: ensureStringArray(data.summaryPoints),
          publishedAtISO:
            normalizeDateIso(data.publishedAtISO) ||
            normalizeDateIso(data.publishedAt) ||
            normalizeDateIso(data.createdAt) ||
            normalizeDateIso(data.updatedAt),
          updatedAt: normalizeDateIso(data.updatedAt),
          createdAt: normalizeDateIso(data.createdAt),
          seo: typeof data.seo === 'object' && data.seo ? data.seo : undefined,
          source: 'firestore',
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.warn('[seo] Firestore blog loading skipped:', error instanceof Error ? error.message : error);
    return [];
  }
}

function normalizeStaticArticle(article) {
  return {
    id: article.slug,
    slug: ensureString(article.slug),
    title: ensureString(article.title),
    seoTitle: ensureString(article.seoTitle) || ensureString(article.title),
    description: ensureString(article.description),
    excerpt: ensureString(article.excerpt) || ensureString(article.description),
    category: ensureString(article.category) || 'Gestion',
    categorySlug: resolveCategorySlug(article.category, article.categorySlug),
    image: ensureString(article.image),
    imageAlt: ensureString(article.imageAlt) || ensureString(article.title),
    keywords: ensureStringArray(article.keywords),
    intro: ensureString(article.intro) || ensureString(article.excerpt) || ensureString(article.description),
    summaryPoints: ensureStringArray(article.summaryPoints),
    publishedAtISO: normalizeDateIso(article.publishedAtISO) || normalizeDateIso(article.publishedAt) || '2026-03-27T00:00:00.000Z',
    updatedAt: normalizeDateIso(article.updatedAt) || '2026-03-27T00:00:00.000Z',
    createdAt: normalizeDateIso(article.createdAt) || '2026-03-27T00:00:00.000Z',
    seo: typeof article.seo === 'object' && article.seo ? article.seo : undefined,
    source: 'static',
  };
}

export async function getPublishedBlogArticles() {
  const staticArticles = loadStaticBlogArticlesFromSource().map(normalizeStaticArticle);
  const firestoreArticles = await fetchPublishedFirestoreArticles();
  const mergedArticles = [...firestoreArticles, ...staticArticles];
  const uniqueArticles = new Map();

  mergedArticles.forEach((article) => {
    if (!uniqueArticles.has(article.slug)) {
      uniqueArticles.set(article.slug, article);
    }
  });

  return Array.from(uniqueArticles.values()).sort((leftArticle, rightArticle) => {
    const leftTime = new Date(leftArticle.updatedAt || leftArticle.publishedAtISO || leftArticle.createdAt || 0).getTime();
    const rightTime = new Date(rightArticle.updatedAt || rightArticle.publishedAtISO || rightArticle.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
}

function resolveArticleSeoDescription(article) {
  const seo = article.seo && typeof article.seo === 'object' ? article.seo : {};
  return (
    ensureString(seo.metaDescription) ||
    ensureString(article.description) ||
    ensureString(article.excerpt) ||
    stripHtml(article.intro)
  );
}

function resolveArticleSeoTitle(article) {
  const seo = article.seo && typeof article.seo === 'object' ? article.seo : {};
  return ensureString(seo.seoTitle) || ensureString(article.seoTitle) || ensureString(article.title);
}

function resolveArticleSeoImage(article) {
  const seo = article.seo && typeof article.seo === 'object' ? article.seo : {};
  return toCanonicalUrl(ensureString(seo.ogImage) || ensureString(article.image) || DEFAULT_OG_IMAGE);
}

function resolveLastmod(article) {
  return (
    normalizeDateIso(article.updatedAt).slice(0, 10) ||
    normalizeDateIso(article.publishedAtISO).slice(0, 10) ||
    normalizeDateIso(article.createdAt).slice(0, 10) ||
    BUILD_DATE
  );
}

export function buildBlogArticleRoute(article) {
  const path = `/blog/${article.slug}`;
  const canonicalUrl = toCanonicalUrl(path);
  const description = resolveArticleSeoDescription(article);
  const title = resolveArticleSeoTitle(article);
  const summaryPoints = ensureStringArray(article.summaryPoints);
  const keywords = ensureStringArray(article.keywords);

  return {
    path,
    title,
    description,
    keywords: keywords.join(', '),
    heading: ensureString(article.title),
    intro: ensureString(article.excerpt) || description,
    sections: summaryPoints.length > 0 ? summaryPoints : [ensureString(article.intro) || description],
    links: [
      { label: 'Retour au blog', href: '/blog' },
      { label: 'Voir les tarifs', href: '/tarifs' },
      { label: 'Essayer Factourati', href: '/login?mode=register' },
    ],
    changefreq: 'monthly',
    priority: '0.7',
    type: 'article',
    canonicalUrl,
    image: resolveArticleSeoImage(article),
    imageAlt: ensureString(article.imageAlt) || ensureString(article.title),
    publishedAt: normalizeDateIso(article.publishedAtISO),
    modifiedAt: normalizeDateIso(article.updatedAt) || normalizeDateIso(article.publishedAtISO) || normalizeDateIso(article.createdAt),
    category: ensureString(article.category) || 'Blog',
    categorySlug: resolveCategorySlug(article.category, article.categorySlug),
    rawArticle: article,
    lastmod: resolveLastmod(article),
  };
}

export async function getAllSeoRoutes() {
  const publishedArticles = await getPublishedBlogArticles();
  const articleRoutes = publishedArticles.map(buildBlogArticleRoute);

  return {
    staticRoutes: publicPageSeoRoutes.map((route) => ({
      ...route,
      canonicalUrl: toCanonicalUrl(route.path),
      lastmod: BUILD_DATE,
    })),
    articleRoutes,
    publishedArticles,
  };
}

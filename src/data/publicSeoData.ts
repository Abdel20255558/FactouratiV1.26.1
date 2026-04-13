export const SITE_URL = 'https://www.factourati.com';
export const BRAND_NAME = 'Factourati';
export const BRAND_LOGO_URL = `${SITE_URL}/files_3254075-1761082431431-image.png`;
export const DEFAULT_OG_IMAGE = `${SITE_URL}/2.png`;
export const BRAND_DESCRIPTION =
  'Factourati est un logiciel marocain de facturation et de gestion pour centraliser devis, factures, paiements, stock, fournisseurs et projets.';

export const SOCIAL_LINKS = [
  'https://web.facebook.com/profile.php?id=61585975779434',
  'https://x.com/FacTourati',
  'https://www.linkedin.com/company/factourati',
  'https://www.instagram.com/factourati',
] as const;

export const publicPricing = {
  monthly: 199,
  sixMonths: 999,
  annual: 1999,
} as const;

export const pricingPlans = [
  {
    name: 'Mensuel',
    price: publicPricing.monthly,
    description: 'Abonnement mensuel Factourati pour gerer devis, factures, stock et paiements.',
  },
  {
    name: '6 mois',
    price: publicPricing.sixMonths,
    description: 'Abonnement Factourati pour 6 mois avec un meilleur rapport prix / duree.',
  },
  {
    name: 'Annuel',
    price: publicPricing.annual,
    description: 'Abonnement annuel Factourati pour piloter durablement votre entreprise.',
  },
] as const;

export const publicSitePages = [
  { name: 'Accueil', path: '/' },
  { name: 'Secteurs', path: '/secteurs' },
  { name: 'Modules', path: '/modules' },
  { name: 'Generateur de facture gratuit', path: '/generateur-facture' },
  { name: 'Tarifs', path: '/tarifs' },
  { name: 'FAQ', path: '/faq' },
  { name: 'Blog', path: '/blog' },
  { name: 'Connexion', path: '/login' },
] as const;

export const faqItems = [
  {
    question: "L'essai gratuit dure combien de temps ?",
    answer: "Vous profitez d'un mois d'essai gratuit, sans carte bancaire et sans engagement.",
  },
  {
    question: 'Quels sont les tarifs de Factourati ?',
    answer: 'Factourati propose 199 DH par mois, 999 DH pour 6 mois et 1999 DH pour une annee.',
  },
  {
    question: 'Factourati est-il adapte aux PME marocaines ?',
    answer: 'Oui. La solution est pensee pour la facturation, le stock, les clients, les paiements et l organisation des PME au Maroc.',
  },
  {
    question: 'Puis-je annuler mon abonnement a tout moment ?',
    answer: 'Oui. Vous pouvez arreter ou renouveler votre abonnement selon les besoins de votre entreprise.',
  },
  {
    question: 'Que peut-on gerer avec Factourati ?',
    answer: 'Vous pouvez gerer les devis, factures, paiements, relances, produits, stock, fournisseurs et projets dans une seule interface.',
  },
] as const;

export const pricingFaqItems = [
  {
    question: 'Quel est le prix de Factourati au Maroc ?',
    answer: 'Factourati coute 199 DH par mois, 999 DH pour 6 mois et 1999 DH par an.',
  },
  {
    question: 'Y a-t-il un essai gratuit ?',
    answer: "Oui, un mois d'essai gratuit est disponible sans carte bancaire.",
  },
  {
    question: 'Peut-on changer de formule ?',
    answer: 'Oui. Vous pouvez choisir une formule mensuelle, 6 mois ou annuelle selon les besoins de votre entreprise.',
  },
] as const;

export function createOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND_NAME,
    url: SITE_URL,
    logo: BRAND_LOGO_URL,
    image: DEFAULT_OG_IMAGE,
    description: BRAND_DESCRIPTION,
    sameAs: [...SOCIAL_LINKS],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        telephone: '+212666736446',
        email: 'contact@Factourati.com',
        areaServed: 'MA',
        availableLanguage: ['fr', 'ar'],
      },
    ],
  };
}

export function createLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: BRAND_NAME,
    description: BRAND_DESCRIPTION,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: SITE_URL,
    image: DEFAULT_OG_IMAGE,
    areaServed: 'MA',
    availableLanguage: ['fr', 'ar'],
    featureList: [
      'Devis et factures',
      'Suivi des paiements',
      'Gestion du stock',
      'Gestion des fournisseurs',
      'Gestion des projets',
      'Pilotage des PME marocaines',
    ],
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'MAD',
      lowPrice: publicPricing.monthly,
      highPrice: publicPricing.annual,
      offerCount: pricingPlans.length,
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5',
      ratingCount: '1000',
    },
    provider: {
      '@type': 'Organization',
      name: BRAND_NAME,
      url: SITE_URL,
    },
  };
}

export function createWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND_NAME,
    alternateName: 'Factourati ERP Maroc',
    url: SITE_URL,
    inLanguage: 'fr-MA',
    description: BRAND_DESCRIPTION,
    publisher: {
      '@type': 'Organization',
      name: BRAND_NAME,
      url: SITE_URL,
    },
    hasPart: publicSitePages.map((page) => ({
      '@type': 'WebPage',
      name: page.name,
      url: `${SITE_URL}${page.path}`,
    })),
  };
}

export function createSiteNavigationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Navigation Factourati',
    itemListElement: publicSitePages.map((page, index) => ({
      '@type': 'SiteNavigationElement',
      position: index + 1,
      name: page.name,
      url: `${SITE_URL}${page.path}`,
    })),
  };
}

export function createWebPageSchema({
  name,
  path,
  description,
}: {
  name: string;
  path: string;
  description: string;
}) {
  const url = path.startsWith('http') ? path : `${SITE_URL}${path}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    url,
    description,
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
    },
  };
}

export function createOfferCatalogSchema(path: string = '/tarifs') {
  const url = path.startsWith('http') ? path : `${SITE_URL}${path}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: 'Tarifs Factourati',
    url,
    itemListElement: pricingPlans.map((plan) => ({
      '@type': 'Offer',
      name: `Abonnement ${plan.name} Factourati`,
      description: plan.description,
      price: plan.price,
      priceCurrency: 'MAD',
      availability: 'https://schema.org/InStock',
      url,
    })),
  };
}

export function createBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function createFaqSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function createPricingFaqSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pricingFaqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

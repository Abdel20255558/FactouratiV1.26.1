export const SITE_URL = 'https://www.factourati.com';
export const BRAND_NAME = 'Factourati';
export const BRAND_LOGO_URL = `${SITE_URL}/files_3254075-1761082431431-image.png`;
export const DEFAULT_OG_IMAGE = `${SITE_URL}/2.png`;

export const publicPricing = {
  monthly: 199,
  sixMonths: 999,
  annual: 1999,
} as const;

export const faqItems = [
  {
    question: "L'essai gratuit dure combien de temps ?",
    answer: "Vous profitez d'un mois d'essai gratuit, sans carte bancaire et sans engagement.",
  },
  {
    question: 'Quels sont les tarifs de Factourati ?',
    answer: 'Factourati propose 199 DH par mois, 999 DH pour 6 mois et 1999 DH pour une année.',
  },
  {
    question: 'Factourati est-il adapte aux PME marocaines ?',
    answer: 'Oui. La solution est pensee pour la facturation, le stock, les clients, les paiements et l organisation des PME au Maroc.',
  },
  {
    question: 'Puis-je annuler mon abonnement a tout moment ?',
    answer: "Oui. Vous pouvez arreter ou renouveler votre abonnement selon les besoins de votre entreprise.",
  },
  {
    question: 'Que peut-on gerer avec Factourati ?',
    answer: 'Vous pouvez gerer les devis, factures, paiements, relances, produits, stock, fournisseurs et projets dans une seule interface.',
  },
] as const;

export function createOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND_NAME,
    url: SITE_URL,
    logo: BRAND_LOGO_URL,
    sameAs: [
      'https://x.com/FacTourati',
      'https://www.linkedin.com/company/factourati',
      'https://www.instagram.com/factourati',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      telephone: '+212666736446',
      email: 'contact@Factourati.com',
      areaServed: 'MA',
      availableLanguage: ['fr', 'ar'],
    },
  };
}

export function createLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: BRAND_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: SITE_URL,
    image: DEFAULT_OG_IMAGE,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'MAD',
      lowPrice: publicPricing.monthly,
      highPrice: publicPricing.annual,
      offerCount: 3,
    },
    provider: {
      '@type': 'Organization',
      name: BRAND_NAME,
      url: SITE_URL,
    },
    areaServed: 'MA',
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

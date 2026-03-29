import { blogArticles, getBlogArticleBySlug } from './blogArticles';

export const visibleBlogSlugs = [
  'guide-complet-facturation-maroc',
  'comment-gerer-votre-stock-efficacement',
  'avantages-erp-pme-marocaines',
  'conformite-fiscale-maroc-factourati',
  'gestion-de-projet-meilleures-pratiques',
] as const;

export const blogCategoryDefinitions = [
  {
    slug: 'facturation',
    label: 'Facturation',
    description:
      'Guides pratiques pour mieux organiser vos devis, vos factures, vos paiements et votre suivi client au Maroc.',
    introTitle: 'Structurer votre cycle devis, facture et paiement',
    introPoints: [
      'Mieux cadrer vos documents commerciaux',
      'Suivre les paiements et les relances avec plus de clarte',
      'Donner une image plus professionnelle a votre entreprise',
    ],
    keywords: ['facturation maroc', 'devis facture maroc', 'suivi paiements pme maroc'],
  },
  {
    slug: 'stock',
    label: 'Stock',
    description:
      'Conseils concrets pour mieux suivre vos produits, anticiper les ruptures et garder un stock sain dans votre entreprise.',
    introTitle: 'Mieux piloter vos produits et vos niveaux de stock',
    introPoints: [
      'Eviter les ruptures et les oublis',
      'Mieux anticiper les besoins de reapprovisionnement',
      'Relier les mouvements de stock a votre activite commerciale',
    ],
    keywords: ['gestion stock maroc', 'stock pme maroc', 'logiciel stock maroc'],
  },
  {
    slug: 'erp',
    label: 'ERP',
    description:
      'Articles pour comprendre comment un ERP aide les PME marocaines a centraliser leur gestion et gagner en visibilite.',
    introTitle: 'Centraliser la gestion pour gagner en visibilite',
    introPoints: [
      'Relier facturation, stock, clients et suivi',
      'Limiter les doubles saisies et les erreurs',
      'Piloter l activite avec une vue plus globale',
    ],
    keywords: ['erp maroc', 'erp pme maroc', 'logiciel gestion entreprise maroc'],
  },
  {
    slug: 'fiscalite',
    label: 'Fiscalite',
    description:
      'Ressources utiles pour mieux organiser vos documents, vos factures et votre suivi administratif dans un cadre fiscal plus propre.',
    introTitle: 'Organiser vos documents et votre suivi administratif',
    introPoints: [
      'Mieux structurer les informations legales de l entreprise',
      'Faciliter le suivi des factures et des paiements',
      'Conserver des donnees plus propres et plus accessibles',
    ],
    keywords: ['fiscalite maroc pme', 'facture conforme maroc', 'conformite fiscale maroc'],
  },
  {
    slug: 'gestion',
    label: 'Gestion',
    description:
      'Methodes, organisation et bonnes pratiques pour piloter les projets et structurer le quotidien des PME marocaines.',
    introTitle: 'Clarifier les priorites et mieux executer les projets',
    introPoints: [
      'Mieux distribuer les taches et les responsabilites',
      'Suivre les delais et l avancement plus sereinement',
      'Centraliser le travail pour reduire les blocages',
    ],
    keywords: ['gestion pme maroc', 'gestion projet maroc', 'organisation entreprise maroc'],
  },
] as const;

export const blogArticleOverrides: Record<string, { category: string; categorySlug: string; excerpt: string }> = {
  'guide-complet-facturation-maroc': {
    category: 'Facturation',
    categorySlug: 'facturation',
    excerpt:
      'Un guide pratique pour mieux organiser vos devis, vos factures, vos paiements et le suivi client dans votre entreprise.',
  },
  'comment-gerer-votre-stock-efficacement': {
    category: 'Stock',
    categorySlug: 'stock',
    excerpt:
      'Les bonnes pratiques pour suivre vos produits, anticiper les besoins et garder un stock plus maitrise au quotidien.',
  },
  'avantages-erp-pme-marocaines': {
    category: 'ERP',
    categorySlug: 'erp',
    excerpt:
      'Pourquoi une solution centralisee aide les PME marocaines a gagner du temps et mieux piloter leur activite.',
  },
  'conformite-fiscale-maroc-factourati': {
    category: 'Fiscalite',
    categorySlug: 'fiscalite',
    excerpt:
      'Des conseils concrets pour structurer vos documents, limiter les oublis et garder une gestion plus sereine.',
  },
  'gestion-de-projet-meilleures-pratiques': {
    category: 'Gestion',
    categorySlug: 'gestion',
    excerpt:
      'Des methodes simples pour clarifier les priorites, mieux suivre les taches et faire avancer vos projets plus efficacement.',
  },
};

export const visibleBlogArticles = visibleBlogSlugs
  .map((slug) => getBlogArticleBySlug(slug))
  .filter((article): article is NonNullable<typeof article> => Boolean(article));

export function getBlogCategoryBySlug(slug?: string) {
  return blogCategoryDefinitions.find((category) => category.slug === slug);
}

export function getVisibleArticlesByCategorySlug(categorySlug?: string) {
  return visibleBlogArticles.filter((article) => blogArticleOverrides[article.slug]?.categorySlug === categorySlug);
}

export const sitemapBlogArticles = blogArticles;

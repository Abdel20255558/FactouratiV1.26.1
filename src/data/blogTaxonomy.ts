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
    keywords: ['facturation maroc', 'devis facture maroc', 'suivi paiements pme maroc'],
  },
  {
    slug: 'stock',
    label: 'Stock',
    description:
      'Conseils concrets pour mieux suivre vos produits, anticiper les ruptures et garder un stock sain dans votre entreprise.',
    keywords: ['gestion stock maroc', 'stock pme maroc', 'logiciel stock maroc'],
  },
  {
    slug: 'erp',
    label: 'ERP',
    description:
      'Articles pour comprendre comment un ERP aide les PME marocaines a centraliser leur gestion et gagner en visibilite.',
    keywords: ['erp maroc', 'erp pme maroc', 'logiciel gestion entreprise maroc'],
  },
  {
    slug: 'fiscalite',
    label: 'Fiscalite',
    description:
      'Ressources utiles pour mieux organiser vos documents, vos factures et votre suivi administratif dans un cadre fiscal plus propre.',
    keywords: ['fiscalite maroc pme', 'facture conforme maroc', 'conformite fiscale maroc'],
  },
  {
    slug: 'gestion',
    label: 'Gestion',
    description:
      'Methodes, organisation et bonnes pratiques pour piloter les projets et structurer le quotidien des PME marocaines.',
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

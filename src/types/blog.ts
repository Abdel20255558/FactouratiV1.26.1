export type BlogSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  image?: string;
  imageAlt?: string;
};

export type BlogArticle = {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  readingTime: string;
  heroLabel: string;
  image: string;
  imageAlt: string;
  keywords: string[];
  intro: string;
  summaryPoints: string[];
  sections: BlogSection[];
};

export type BlogResolvedArticle = BlogArticle & {
  id: string;
  source: 'static' | 'firestore';
  categorySlug: string;
  isPublished: boolean;
  isVisibleInListings: boolean;
  publishedAtISO: string;
  createdAt?: string;
  updatedAt?: string;
  imageStoragePath?: string;
};

export type FirestoreBlogPostInput = {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  excerpt: string;
  category: string;
  categorySlug: string;
  heroLabel: string;
  image: string;
  imageAlt: string;
  keywords: string[];
  intro: string;
  summaryPoints: string[];
  sections: BlogSection[];
  isPublished: boolean;
};

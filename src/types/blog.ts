export type BlogSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  image?: string;
  imageAlt?: string;
  imagePrompt?: string;
};

export type BlogRobotsIndex = 'index' | 'noindex';
export type BlogRobotsFollow = 'follow' | 'nofollow';
export type BlogSchemaType = 'Article' | 'BlogPosting' | 'FAQPage' | 'None';
export type BlogSeoCheckStatus = 'passed' | 'warning' | 'failed';

export type BlogSeoCheck = {
  id: string;
  label: string;
  status: BlogSeoCheckStatus;
  points: number;
  recommendation: string;
  targetId?: string;
};

export type BlogSeoMetadata = {
  focusKeyword: string;
  seoTitle: string;
  metaDescription: string;
  slug: string;
  canonicalUrl: string;
  robotsIndex: BlogRobotsIndex;
  robotsFollow: BlogRobotsFollow;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  schemaType: BlogSchemaType;
  seoScore: number;
  seoChecks: BlogSeoCheck[];
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
  seo?: BlogSeoMetadata;
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
  seo?: BlogSeoMetadata;
};

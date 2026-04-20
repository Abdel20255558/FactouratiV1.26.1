import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { blogArticles } from '../data/blogArticles';
import { getBlogArticleMeta, resolveBlogCategorySlug, visibleBlogSlugs } from '../data/blogTaxonomy';
import type { BlogResolvedArticle, BlogSchemaType, BlogSection, FirestoreBlogPostInput } from '../types/blog';
import { evaluateBlogSeo, resolveBlogSeoFallbacks } from '../utils/blogSeo';

const BLOG_POSTS_COLLECTION = 'blogPosts';
const STATIC_PUBLISHED_AT_ISO = '2026-03-27T00:00:00.000Z';

function ensureString(value: unknown, fallback: string = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalizedValue = value.trim();
  const invalidValues = new Set(['undefined', 'null', '[object object]']);

  return invalidValues.has(normalizedValue.toLowerCase()) ? fallback : normalizedValue;
}

function normalizeBlogDateIso(value: unknown) {
  if (!value) {
    return '';
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    const trimmedValue = ensureString(value);

    if (!trimmedValue) {
      return '';
    }

    const slashDateMatch = trimmedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashDateMatch) {
      const [, day, month, year] = slashDateMatch;
      const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
      return Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString();
    }

    const parsedDate = new Date(trimmedValue);
    return Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString();
  }

  if (typeof value === 'number') {
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString();
  }

  if (typeof value === 'object') {
    const record = value as {
      seconds?: number;
      _seconds?: number;
      nanoseconds?: number;
      _nanoseconds?: number;
      toDate?: () => Date;
    };

    if (typeof record.toDate === 'function') {
      const parsedDate = record.toDate();
      return Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString();
    }

    const seconds = typeof record.seconds === 'number' ? record.seconds : record._seconds;
    const nanoseconds = typeof record.nanoseconds === 'number' ? record.nanoseconds : record._nanoseconds || 0;

    if (typeof seconds === 'number') {
      const parsedDate = new Date(seconds * 1000 + Math.floor(nanoseconds / 1000000));
      return Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString();
    }
  }

  return '';
}

function getBlogSortTime(article: Pick<BlogResolvedArticle, 'publishedAtISO' | 'createdAt' | 'updatedAt'>) {
  const dateIso = normalizeBlogDateIso(article.publishedAtISO) || normalizeBlogDateIso(article.createdAt) || normalizeBlogDateIso(article.updatedAt);
  const timestamp = dateIso ? new Date(dateIso).getTime() : 0;
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function ensureStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((item) => ensureString(item))
    .filter(Boolean);
}

function getRecordValue(record: unknown, key: string) {
  return record && typeof record === 'object' ? (record as Record<string, unknown>)[key] : undefined;
}

function createGeneratedSectionImageUrl({
  prompt,
  seed,
}: {
  prompt: string;
  seed: string;
}) {
  const cleanPrompt =
    ensureString(prompt) || 'Professional Moroccan SME business management software dashboard, realistic editorial image';
  const encodedPrompt = encodeURIComponent(
    `${cleanPrompt}, professional realistic editorial blog image, Moroccan SME, business software, no text, no watermark`,
  );
  const encodedSeed = encodeURIComponent(seed);

  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1200&height=800&seed=${encodedSeed}&nologo=true&model=flux`;
}

function sanitizeSections(sections: unknown, context?: { articleSlug?: string; category?: string }): BlogSection[] {
  if (!Array.isArray(sections)) {
    return [];
  }

  return sections
    .map((section, index) => {
      const heading = ensureString(getRecordValue(section, 'heading'));
      const imagePrompt =
        ensureString(getRecordValue(section, 'imagePrompt')) ||
        ensureString(getRecordValue(section, 'prompt')) ||
        `${heading} ${context?.category || 'Factourati blog'}`;
      const image =
        ensureString(getRecordValue(section, 'image')) ||
        ensureString(getRecordValue(section, 'imageUrl')) ||
        ensureString(getRecordValue(section, 'imageURL')) ||
        createGeneratedSectionImageUrl({
          prompt: imagePrompt,
          seed: `${context?.articleSlug || 'factourati-blog'}-${index}`,
        });

      return {
        heading,
        paragraphs: ensureStringArray(getRecordValue(section, 'paragraphs')),
        bullets: ensureStringArray(getRecordValue(section, 'bullets')),
        image,
        imageAlt: ensureString(getRecordValue(section, 'imageAlt')) || heading,
        imagePrompt,
      };
    })
    .filter((section) => section.heading && section.paragraphs.length > 0)
    .map((section) => ({
      ...section,
      bullets: section.bullets.length > 0 ? section.bullets : undefined,
      imageAlt: section.imageAlt || section.heading,
      imagePrompt: section.imagePrompt || undefined,
    }));
}

function serializeBlogSectionForFirestore(section: BlogSection): BlogSection {
  const serializedSection: BlogSection = {
    heading: section.heading,
    paragraphs: section.paragraphs,
    imageAlt: section.imageAlt || section.heading,
  };

  if (section.bullets && section.bullets.length > 0) {
    serializedSection.bullets = section.bullets;
  }

  if (section.image) {
    serializedSection.image = section.image;
  }

  if (section.imagePrompt) {
    serializedSection.imagePrompt = section.imagePrompt;
  }

  return serializedSection;
}

function serializeBlogSectionsForFirestore(sections: BlogSection[]) {
  return sections.map(serializeBlogSectionForFirestore);
}

function ensureBlogSchemaType(value: unknown): BlogSchemaType {
  return value === 'Article' || value === 'FAQPage' || value === 'None' || value === 'BlogPosting'
    ? value
    : 'BlogPosting';
}

function normalizeSeoMetadata(data: DocumentData | Record<string, unknown>, article: {
  title: string;
  slug: string;
  seoTitle: string;
  description: string;
  excerpt: string;
  intro: string;
  image: string;
  imageAlt: string;
  sections: BlogSection[];
}) {
  const rawSeo = getRecordValue(data, 'seo') && typeof getRecordValue(data, 'seo') === 'object'
    ? (getRecordValue(data, 'seo') as Record<string, unknown>)
    : {};
  const metadata = resolveBlogSeoFallbacks({
    focusKeyword: ensureString(rawSeo.focusKeyword) || ensureString(getRecordValue(data, 'focusKeyword')),
    seoTitle: ensureString(rawSeo.seoTitle) || article.seoTitle,
    metaDescription: ensureString(rawSeo.metaDescription) || article.description,
    slug: ensureString(rawSeo.slug) || article.slug,
    canonicalUrl: ensureString(rawSeo.canonicalUrl),
    robotsIndex: rawSeo.robotsIndex === 'noindex' ? 'noindex' : 'index',
    robotsFollow: rawSeo.robotsFollow === 'nofollow' ? 'nofollow' : 'follow',
    ogTitle: ensureString(rawSeo.ogTitle),
    ogDescription: ensureString(rawSeo.ogDescription),
    ogImage: ensureString(rawSeo.ogImage),
    twitterTitle: ensureString(rawSeo.twitterTitle),
    twitterDescription: ensureString(rawSeo.twitterDescription),
    twitterImage: ensureString(rawSeo.twitterImage),
    schemaType: ensureBlogSchemaType(rawSeo.schemaType),
    title: article.title,
    excerpt: article.excerpt,
    intro: article.intro,
    image: article.image,
    imageAlt: article.imageAlt,
    sections: article.sections,
  });
  const evaluation = evaluateBlogSeo({
    title: article.title,
    slug: metadata.slug || article.slug,
    seoTitle: metadata.seoTitle,
    metaDescription: metadata.metaDescription,
    excerpt: article.excerpt,
    intro: article.intro,
    focusKeyword: metadata.focusKeyword,
    canonicalUrl: metadata.canonicalUrl,
    image: article.image,
    imageAlt: article.imageAlt,
    sections: article.sections,
  });

  return {
    ...metadata,
    seoScore: evaluation.score,
    seoChecks: evaluation.checks,
  };
}

function serializeSeoForFirestore(input: FirestoreBlogPostInput) {
  const metadata = resolveBlogSeoFallbacks({
    ...input.seo,
    title: input.title,
    slug: input.slug,
    seoTitle: input.seo?.seoTitle || input.seoTitle,
    metaDescription: input.seo?.metaDescription || input.description,
    excerpt: input.excerpt,
    intro: input.intro,
    image: input.image,
    imageAlt: input.imageAlt,
    sections: input.sections,
  });
  const evaluation = evaluateBlogSeo({
    title: input.title,
    slug: metadata.slug || input.slug,
    seoTitle: metadata.seoTitle,
    metaDescription: metadata.metaDescription,
    excerpt: input.excerpt,
    intro: input.intro,
    focusKeyword: metadata.focusKeyword,
    canonicalUrl: metadata.canonicalUrl,
    image: input.image,
    imageAlt: input.imageAlt,
    sections: input.sections,
  });

  return {
    ...metadata,
    seoScore: evaluation.score,
    seoChecks: evaluation.checks,
  };
}

export function createBlogSlug(title: string) {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

export function formatBlogPublishedAt(dateIso: string) {
  const date = new Date(dateIso);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function estimateBlogReadingTimeFromContent({
  title,
  description,
  intro,
  summaryPoints,
  sections,
}: Pick<FirestoreBlogPostInput, 'title' | 'description' | 'intro' | 'summaryPoints' | 'sections'>) {
  const payload = [
    title,
    description,
    intro,
    ...summaryPoints,
    ...sections.flatMap((section) => [section.heading, ...section.paragraphs, ...(section.bullets || [])]),
  ]
    .join(' ')
    .trim();

  const wordCount = payload ? payload.split(/\s+/).length : 0;
  const minutes = Math.max(3, Math.ceil(wordCount / 180));
  return `${minutes} min`;
}

function normalizeStaticBlogArticle(article: (typeof blogArticles)[number]): BlogResolvedArticle {
  const articleMeta = getBlogArticleMeta(article);
  const seo = normalizeSeoMetadata(article as unknown as Record<string, unknown>, {
    title: article.title,
    slug: article.slug,
    seoTitle: article.seoTitle,
    description: article.description,
    excerpt: articleMeta.excerpt,
    intro: article.intro,
    image: article.image,
    imageAlt: article.imageAlt,
    sections: article.sections,
  });

  return {
    ...article,
    seo,
    id: article.slug,
    source: 'static',
    category: articleMeta.category,
    categorySlug: articleMeta.categorySlug,
    excerpt: articleMeta.excerpt,
    isPublished: true,
    isVisibleInListings: visibleBlogSlugs.includes(article.slug as (typeof visibleBlogSlugs)[number]),
    publishedAtISO: STATIC_PUBLISHED_AT_ISO,
    createdAt: STATIC_PUBLISHED_AT_ISO,
    updatedAt: STATIC_PUBLISHED_AT_ISO,
    imageStoragePath: '',
  };
}

function normalizeFirestoreBlogPost(id: string, data: DocumentData): BlogResolvedArticle | null {
  const slug = ensureString(data.slug);
  const title = ensureString(data.title);
  const description = ensureString(data.description);
  const excerpt = ensureString(data.excerpt);
  const intro = ensureString(data.intro);
  const heroLabel = ensureString(data.heroLabel);
  const seoTitle = ensureString(data.seoTitle) || title;
  const image = ensureString(data.image);
  const imageAlt = ensureString(data.imageAlt) || title;
  const categorySlug = resolveBlogCategorySlug(ensureString(data.category), ensureString(data.categorySlug));
  const category = ensureString(data.category) || categorySlug;
  const summaryPoints = ensureStringArray(data.summaryPoints);
  const keywords = ensureStringArray(data.keywords);
  const sections = sanitizeSections(data.sections, { articleSlug: slug, category });
  const publishedAtISO =
    normalizeBlogDateIso(data.publishedAtISO) ||
    normalizeBlogDateIso(data.publishedAt) ||
    normalizeBlogDateIso(data.date) ||
    normalizeBlogDateIso(data.createdAt) ||
    normalizeBlogDateIso(data.updatedAt) ||
    new Date().toISOString();
  const readingTime =
    ensureString(data.readingTime) ||
    estimateBlogReadingTimeFromContent({
      title,
      description,
      intro,
      summaryPoints,
      sections,
    });

  if (!slug || !title || !description || !excerpt || !intro || !heroLabel || !image || sections.length === 0) {
    return null;
  }

  const seo = normalizeSeoMetadata(data, {
    title,
    slug,
    seoTitle,
    description,
    excerpt,
    intro,
    image,
    imageAlt,
    sections,
  });

  return {
    id,
    source: 'firestore',
    slug,
    title,
    seoTitle,
    description,
    excerpt,
    category,
    categorySlug,
    publishedAt: ensureString(data.publishedAt) || formatBlogPublishedAt(publishedAtISO),
    publishedAtISO,
    readingTime,
    heroLabel,
    image,
    imageAlt,
    keywords,
    intro,
    summaryPoints,
    sections,
    seo,
    isPublished: data.isPublished !== false,
    isVisibleInListings: data.isVisibleInListings !== false,
    createdAt: normalizeBlogDateIso(data.createdAt),
    updatedAt: normalizeBlogDateIso(data.updatedAt),
    imageStoragePath: ensureString(data.imageStoragePath),
  };
}

export function getStaticBlogArticles() {
  return blogArticles.map(normalizeStaticBlogArticle);
}

export async function fetchFirestoreBlogPosts(options?: { includeUnpublished?: boolean }) {
  const snapshot = await getDocs(collection(db, BLOG_POSTS_COLLECTION));
  const articles = snapshot.docs
    .map((docSnapshot) => normalizeFirestoreBlogPost(docSnapshot.id, docSnapshot.data()))
    .filter((article): article is BlogResolvedArticle => Boolean(article))
    .filter((article) => options?.includeUnpublished || article.isPublished)
    .sort((a, b) => getBlogSortTime(b) - getBlogSortTime(a));

  return articles;
}

export async function blogSlugExists(slug: string, excludePostId?: string) {
  const normalizedSlug = ensureString(slug);

  if (!normalizedSlug) {
    return false;
  }

  const staticExists = blogArticles.some((article) => article.slug === normalizedSlug);
  if (staticExists) {
    return true;
  }

  const snapshot = await getDocs(query(collection(db, BLOG_POSTS_COLLECTION), where('slug', '==', normalizedSlug)));
  return snapshot.docs.some((docSnapshot) => docSnapshot.id !== excludePostId);
}

export async function uploadBlogImage(file: File) {
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '-');
  const storagePath = `blog/${Date.now()}-${cleanFileName}`;
  const imageRef = ref(storage, storagePath);
  await uploadBytes(imageRef, file);
  const imageUrl = await getDownloadURL(imageRef);

  return {
    imageUrl,
    storagePath,
  };
}

export async function createFirestoreBlogPost(
  input: FirestoreBlogPostInput,
  options?: {
    createdByEmail?: string;
    imageStoragePath?: string;
  },
) {
  const nowIso = new Date().toISOString();
  const readingTime = estimateBlogReadingTimeFromContent(input);
  const publishedAtISO = nowIso;

  const payload = {
    ...input,
    categorySlug: resolveBlogCategorySlug(input.category, input.categorySlug),
    sections: serializeBlogSectionsForFirestore(input.sections),
    seo: serializeSeoForFirestore(input),
    readingTime,
    publishedAt: formatBlogPublishedAt(publishedAtISO),
    publishedAtISO,
    createdAt: nowIso,
    updatedAt: nowIso,
    createdByEmail: options?.createdByEmail || '',
    imageStoragePath: options?.imageStoragePath || '',
    isVisibleInListings: true,
  };

  return addDoc(collection(db, BLOG_POSTS_COLLECTION), payload);
}

export async function updateFirestoreBlogPost(
  postId: string,
  input: FirestoreBlogPostInput,
  options?: {
    imageStoragePath?: string;
  },
) {
  const nowIso = new Date().toISOString();
  const readingTime = estimateBlogReadingTimeFromContent(input);

  await updateDoc(doc(db, BLOG_POSTS_COLLECTION, postId), {
    ...input,
    categorySlug: resolveBlogCategorySlug(input.category, input.categorySlug),
    sections: serializeBlogSectionsForFirestore(input.sections),
    seo: serializeSeoForFirestore(input),
    readingTime,
    updatedAt: nowIso,
    ...(options?.imageStoragePath !== undefined ? { imageStoragePath: options.imageStoragePath } : {}),
  });
}

export async function setFirestoreBlogPostPublished(postId: string, isPublished: boolean) {
  await updateDoc(doc(db, BLOG_POSTS_COLLECTION, postId), {
    isPublished,
    updatedAt: new Date().toISOString(),
  });
}

export async function updateFirestoreBlogPostImages(
  postId: string,
  input: {
    image: string;
    imageAlt: string;
    sections: BlogSection[];
    imageStoragePath?: string;
  },
) {
  await updateDoc(doc(db, BLOG_POSTS_COLLECTION, postId), {
    image: input.image,
    imageAlt: input.imageAlt,
    sections: serializeBlogSectionsForFirestore(input.sections),
    ...(input.imageStoragePath !== undefined ? { imageStoragePath: input.imageStoragePath } : {}),
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteFirestoreBlogPost(postId: string, imageStoragePath?: string) {
  if (imageStoragePath) {
    try {
      await deleteObject(ref(storage, imageStoragePath));
    } catch (error) {
      console.warn('Suppression de l image Storage impossible:', error);
    }
  }

  await deleteDoc(doc(db, BLOG_POSTS_COLLECTION, postId));
}

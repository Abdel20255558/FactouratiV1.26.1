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
import type { BlogResolvedArticle, BlogSection, FirestoreBlogPostInput } from '../types/blog';

const BLOG_POSTS_COLLECTION = 'blogPosts';
const STATIC_PUBLISHED_AT_ISO = '2026-03-27T00:00:00.000Z';

function ensureString(value: unknown, fallback: string = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function ensureStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((item) => ensureString(item))
    .filter(Boolean);
}

function sanitizeSections(sections: unknown): BlogSection[] {
  if (!Array.isArray(sections)) {
    return [];
  }

  return sections
    .map((section) => ({
      heading: ensureString(section?.heading),
      paragraphs: ensureStringArray(section?.paragraphs),
      bullets: ensureStringArray(section?.bullets),
      image: ensureString(section?.image),
      imageAlt: ensureString(section?.imageAlt),
    }))
    .filter((section) => section.heading && section.paragraphs.length > 0)
    .map((section) => ({
      ...section,
      bullets: section.bullets.length > 0 ? section.bullets : undefined,
      image: section.image || undefined,
      imageAlt: section.imageAlt || undefined,
    }));
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

  return {
    ...article,
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
  const sections = sanitizeSections(data.sections);
  const publishedAtISO = ensureString(data.publishedAtISO) || ensureString(data.createdAt) || new Date().toISOString();
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
    isPublished: data.isPublished !== false,
    isVisibleInListings: data.isVisibleInListings !== false,
    createdAt: ensureString(data.createdAt),
    updatedAt: ensureString(data.updatedAt),
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
    .sort((a, b) => new Date(b.publishedAtISO).getTime() - new Date(a.publishedAtISO).getTime());

  return articles;
}

export async function blogSlugExists(slug: string) {
  const normalizedSlug = ensureString(slug);

  if (!normalizedSlug) {
    return false;
  }

  const staticExists = blogArticles.some((article) => article.slug === normalizedSlug);
  if (staticExists) {
    return true;
  }

  const snapshot = await getDocs(query(collection(db, BLOG_POSTS_COLLECTION), where('slug', '==', normalizedSlug)));
  return !snapshot.empty;
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

export async function setFirestoreBlogPostPublished(postId: string, isPublished: boolean) {
  await updateDoc(doc(db, BLOG_POSTS_COLLECTION, postId), {
    isPublished,
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

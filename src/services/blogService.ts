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
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalizedValue = value.trim();
  const invalidValues = new Set(['undefined', 'null', '[object object]']);

  return invalidValues.has(normalizedValue.toLowerCase()) ? fallback : normalizedValue;
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
  const sections = sanitizeSections(data.sections, { articleSlug: slug, category });
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
    sections: serializeBlogSectionsForFirestore(input.sections),
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

import { SITE_URL } from '../data/publicSeoData';
import { toAbsoluteSiteUrl } from './publicSiteUrl';
import type {
  BlogArticle,
  BlogRobotsFollow,
  BlogRobotsIndex,
  BlogSchemaType,
  BlogSection,
  BlogSeoCheck,
  BlogSeoMetadata,
} from '../types/blog';

export const blogSchemaTypeOptions: BlogSchemaType[] = ['Article', 'BlogPosting', 'FAQPage', 'None'];
export const blogRobotsIndexOptions: BlogRobotsIndex[] = ['index', 'noindex'];
export const blogRobotsFollowOptions: BlogRobotsFollow[] = ['follow', 'nofollow'];

type BlogSeoEvaluationInput = {
  title: string;
  slug: string;
  seoTitle?: string;
  metaDescription?: string;
  excerpt?: string;
  intro?: string;
  focusKeyword?: string;
  canonicalUrl?: string;
  image?: string;
  imageAlt?: string;
  sections?: BlogSection[];
};

type BlogSeoFallbackInput = BlogSeoEvaluationInput & {
  robotsIndex?: BlogRobotsIndex;
  robotsFollow?: BlogRobotsFollow;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  schemaType?: BlogSchemaType;
  seoChecks?: BlogSeoCheck[];
  seoScore?: number;
};

function normalizeText(value?: string) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function compactText(value?: string) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function stripHtml(value?: string) {
  return compactText((value || '').replace(/<[^>]*>/g, ' '));
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function containsKeyword(value: string | undefined, keyword: string) {
  const normalizedKeyword = normalizeText(keyword);

  if (!normalizedKeyword) {
    return false;
  }

  return normalizeText(value).includes(normalizedKeyword);
}

function isValidAbsoluteUrl(value?: string) {
  if (!value) {
    return false;
  }

  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:';
  } catch {
    return false;
  }
}

function normalizeCanonicalUrl(value?: string) {
  const compactedValue = compactText(value);

  if (!compactedValue) {
    return '';
  }

  return toAbsoluteSiteUrl(compactedValue);
}

function countWords(text: string) {
  const words = stripHtml(text)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  return words.length;
}

function getContentPayload(input: BlogSeoEvaluationInput) {
  const sections = input.sections || [];
  const headingText = sections.map((section) => section.heading).join(' ');
  const paragraphText = sections.flatMap((section) => section.paragraphs).join(' ');
  const bulletText = sections.flatMap((section) => section.bullets || []).join(' ');
  const firstParagraph = compactText(input.intro) || compactText(sections[0]?.paragraphs?.[0]);
  const fullText = [input.title, input.metaDescription, input.excerpt, input.intro, headingText, paragraphText, bulletText]
    .map(stripHtml)
    .filter(Boolean)
    .join(' ');
  const absoluteLinks = fullText.match(/https?:\/\/[^\s),]+/gi) || [];
  const markdownLinks = Array.from(fullText.matchAll(/\[[^\]]+\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g)).map((match) => match[1]);
  const relativeLinks = Array.from(
    fullText.matchAll(/(?:^|\s)(\/(?:blog|tarifs|faq|modules|secteurs|generateur-facture)[^\s),]*)/g),
  ).map((match) => match[1]);
  const links = Array.from(new Set([...absoluteLinks, ...markdownLinks, ...relativeLinks]));
  const internalLinks = links.filter((link) => link.startsWith('/') || link.includes('factourati.com') || link.startsWith(SITE_URL));
  const externalLinks = links.filter((link) => /^https?:\/\//i.test(link) && !link.includes('factourati.com'));
  const sectionImages = sections.filter((section) => section.image);
  const imageCount = (input.image ? 1 : 0) + sectionImages.length;
  const imageAltCount = (input.image && input.imageAlt ? 1 : 0) + sectionImages.filter((section) => section.imageAlt).length;

  return {
    firstParagraph,
    headingText,
    fullText,
    internalLinks,
    externalLinks,
    imageCount,
    imageAltCount,
    wordCount: countWords(fullText),
  };
}

function createCheck({
  id,
  label,
  passed,
  points,
  recommendation,
  targetId,
  warning,
}: {
  id: string;
  label: string;
  passed: boolean;
  points: number;
  recommendation: string;
  targetId?: string;
  warning?: boolean;
}): BlogSeoCheck {
  return {
    id,
    label,
    status: passed ? 'passed' : warning ? 'warning' : 'failed',
    points: passed ? points : 0,
    recommendation,
    targetId,
  };
}

export function resolveBlogSeoFallbacks(input: BlogSeoFallbackInput): BlogSeoMetadata {
  const fallbackDescription =
    compactText(input.metaDescription) ||
    compactText(input.excerpt) ||
    truncate(stripHtml(input.intro || input.sections?.[0]?.paragraphs?.[0] || ''), 155);
  const fallbackTitle = compactText(input.seoTitle) || compactText(input.title);
  const fallbackOgTitle = compactText(input.ogTitle) || fallbackTitle;
  const fallbackOgDescription = compactText(input.ogDescription) || fallbackDescription;
  const fallbackTwitterTitle = compactText(input.twitterTitle) || fallbackOgTitle;
  const fallbackTwitterDescription = compactText(input.twitterDescription) || fallbackOgDescription;
  const fallbackImage = compactText(input.image);

  return {
    focusKeyword: compactText(input.focusKeyword),
    seoTitle: fallbackTitle,
    metaDescription: fallbackDescription,
    slug: compactText(input.slug),
    canonicalUrl: normalizeCanonicalUrl(input.canonicalUrl),
    robotsIndex: input.robotsIndex || 'index',
    robotsFollow: input.robotsFollow || 'follow',
    ogTitle: fallbackOgTitle,
    ogDescription: fallbackOgDescription,
    ogImage: compactText(input.ogImage) || fallbackImage,
    twitterTitle: fallbackTwitterTitle,
    twitterDescription: fallbackTwitterDescription,
    twitterImage: compactText(input.twitterImage) || compactText(input.ogImage) || fallbackImage,
    schemaType: input.schemaType || 'BlogPosting',
    seoScore: typeof input.seoScore === 'number' ? input.seoScore : 0,
    seoChecks: input.seoChecks || [],
  };
}

export function evaluateBlogSeo(input: BlogSeoEvaluationInput) {
  const resolved = resolveBlogSeoFallbacks(input);
  const content = getContentPayload({ ...input, seoTitle: resolved.seoTitle, metaDescription: resolved.metaDescription });
  const keyword = resolved.focusKeyword;
  const seoTitleLength = resolved.seoTitle.length;
  const metaDescriptionLength = resolved.metaDescription.length;
  const canonicalLooksValid = !resolved.canonicalUrl || isValidAbsoluteUrl(resolved.canonicalUrl);

  const checks: BlogSeoCheck[] = [
    createCheck({
      id: 'focus-keyword',
      label: 'Focus keyword defini',
      passed: Boolean(keyword),
      points: 10,
      recommendation: 'Ajoutez un mot-cle principal pour guider l optimisation de l article.',
      targetId: 'blog-seo-focus-keyword',
    }),
    createCheck({
      id: 'keyword-seo-title',
      label: 'Focus keyword present dans le SEO title',
      passed: containsKeyword(resolved.seoTitle, keyword),
      points: 10,
      recommendation: 'Placez le mot-cle principal dans le titre SEO.',
      targetId: 'blog-seo-title',
    }),
    createCheck({
      id: 'keyword-slug',
      label: 'Focus keyword present dans le slug',
      passed: containsKeyword(resolved.slug.replace(/-/g, ' '), keyword),
      points: 10,
      recommendation: 'Utilisez un slug court qui contient le mot-cle principal.',
      targetId: 'blog-seo-slug',
    }),
    createCheck({
      id: 'keyword-title',
      label: 'Focus keyword present dans le H1 / titre',
      passed: containsKeyword(input.title, keyword),
      points: 10,
      recommendation: 'Ajoutez le mot-cle principal dans le titre visible de l article.',
      targetId: 'blog-title',
    }),
    createCheck({
      id: 'keyword-first-paragraph',
      label: 'Focus keyword present dans le premier paragraphe',
      passed: containsKeyword(content.firstParagraph, keyword),
      points: 10,
      recommendation: 'Mentionnez naturellement le mot-cle dans l introduction.',
      targetId: 'blog-intro',
    }),
    createCheck({
      id: 'keyword-heading',
      label: 'Focus keyword present dans au moins un H2 ou H3',
      passed: containsKeyword(content.headingText, keyword),
      points: 10,
      recommendation: 'Ajoutez le mot-cle ou une variante dans un titre de section.',
      targetId: 'blog-sections',
    }),
    createCheck({
      id: 'meta-description',
      label: 'Meta description presente',
      passed: Boolean(resolved.metaDescription),
      points: 10,
      recommendation: 'Ajoutez une meta description claire qui resume l article.',
      targetId: 'blog-meta-description',
    }),
    createCheck({
      id: 'seo-title-length',
      label: 'Longueur du SEO title valide',
      passed: seoTitleLength >= 35 && seoTitleLength <= 60,
      points: 5,
      recommendation: 'Gardez le titre SEO entre 35 et 60 caracteres.',
      targetId: 'blog-seo-title',
      warning: Boolean(resolved.seoTitle),
    }),
    createCheck({
      id: 'meta-description-length',
      label: 'Longueur de la meta description valide',
      passed: metaDescriptionLength >= 120 && metaDescriptionLength <= 160,
      points: 5,
      recommendation: 'Gardez la meta description entre 120 et 160 caracteres.',
      targetId: 'blog-meta-description',
      warning: Boolean(resolved.metaDescription),
    }),
    createCheck({
      id: 'content-length',
      label: 'Contenu superieur a 600 mots',
      passed: content.wordCount > 600,
      points: 10,
      recommendation: `Ajoutez du contenu utile. Longueur actuelle: ${content.wordCount} mots.`,
      targetId: 'blog-sections',
      warning: content.wordCount >= 350,
    }),
    createCheck({
      id: 'image-present',
      label: 'Au moins une image presente',
      passed: content.imageCount > 0,
      points: 3,
      recommendation: 'Ajoutez une image principale ou une image de section.',
      targetId: 'blog-main-image',
    }),
    createCheck({
      id: 'image-alt',
      label: 'Texte alt present sur les images',
      passed: content.imageCount > 0 && content.imageAltCount >= content.imageCount,
      points: 2,
      recommendation: 'Renseignez un alt descriptif pour chaque image.',
      targetId: 'blog-main-image-alt',
      warning: content.imageAltCount > 0,
    }),
    createCheck({
      id: 'internal-link',
      label: 'Au moins un lien interne',
      passed: content.internalLinks.length > 0,
      points: 3,
      recommendation: 'Ajoutez un lien vers une page Factourati pertinente.',
      targetId: 'blog-intro',
    }),
    createCheck({
      id: 'external-link',
      label: 'Au moins un lien externe',
      passed: content.externalLinks.length > 0,
      points: 2,
      recommendation: 'Ajoutez une source externe fiable si le sujet le justifie.',
      targetId: 'blog-intro',
      warning: true,
    }),
    createCheck({
      id: 'canonical-valid',
      label: 'Canonical valide',
      passed: canonicalLooksValid,
      points: 3,
      recommendation: 'Utilisez une URL canonique absolue valide ou laissez le champ vide.',
      targetId: 'blog-seo-canonical',
    }),
  ];
  const score = Math.min(100, checks.reduce((sum, check) => sum + check.points, 0));

  return {
    score,
    checks,
    metadata: {
      ...resolved,
      seoScore: score,
      seoChecks: checks,
    },
    wordCount: content.wordCount,
  };
}

export function resolveArticleSeo(article: BlogArticle): BlogSeoMetadata {
  const baseSeo = article.seo;
  const evaluated = evaluateBlogSeo({
    title: article.title,
    slug: article.slug,
    seoTitle: baseSeo?.seoTitle || article.seoTitle,
    metaDescription: baseSeo?.metaDescription || article.description,
    excerpt: article.excerpt,
    intro: article.intro,
    focusKeyword: baseSeo?.focusKeyword || article.keywords[0] || '',
    canonicalUrl: baseSeo?.canonicalUrl || '',
    image: article.image,
    imageAlt: article.imageAlt,
    sections: article.sections,
  });

  return {
    ...evaluated.metadata,
    robotsIndex: baseSeo?.robotsIndex || evaluated.metadata.robotsIndex,
    robotsFollow: baseSeo?.robotsFollow || evaluated.metadata.robotsFollow,
    ogTitle: baseSeo?.ogTitle || evaluated.metadata.ogTitle,
    ogDescription: baseSeo?.ogDescription || evaluated.metadata.ogDescription,
    ogImage: baseSeo?.ogImage || evaluated.metadata.ogImage,
    twitterTitle: baseSeo?.twitterTitle || evaluated.metadata.twitterTitle,
    twitterDescription: baseSeo?.twitterDescription || evaluated.metadata.twitterDescription,
    twitterImage: baseSeo?.twitterImage || evaluated.metadata.twitterImage,
    schemaType: baseSeo?.schemaType || evaluated.metadata.schemaType,
  };
}

export function getSeoQuality(score: number) {
  if (score >= 80) {
    return 'good';
  }

  if (score >= 50) {
    return 'medium';
  }

  return 'low';
}

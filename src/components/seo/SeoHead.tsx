import { useEffect } from 'react';
import { BRAND_NAME } from '../../data/publicSeoData';
import { toAbsoluteSiteUrl } from '../../utils/publicSiteUrl';

type SeoHeadProps = {
  title: string;
  description: string;
  canonicalPath: string;
  keywords?: string;
  image?: string;
  imageAlt?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  type?: 'article' | 'website';
  robots?: string;
  schema?: Record<string, unknown> | Array<Record<string, unknown>>;
};

function setMetaContent(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  const metaNodes = Array.from(document.head.querySelectorAll(`meta[${attribute}="${name}"]`));
  const [existingMeta, ...duplicateMetas] = metaNodes;
  duplicateMetas.forEach((metaNode) => metaNode.remove());

  let meta = existingMeta;

  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, name);
    document.head.appendChild(meta);
  }

  meta.setAttribute('content', content);
}

function removeMeta(name: string, attribute: 'name' | 'property' = 'name') {
  const metas = document.head.querySelectorAll(`meta[${attribute}="${name}"]`);
  metas.forEach((meta) => meta.remove());
}

export default function SeoHead({
  title,
  description,
  canonicalPath,
  keywords,
  image,
  imageAlt,
  ogTitle,
  ogDescription,
  ogImage,
  twitterTitle,
  twitterDescription,
  twitterImage,
  type = 'website',
  robots,
  schema,
}: SeoHeadProps) {
  useEffect(() => {
    const canonicalUrl = toAbsoluteSiteUrl(canonicalPath);
    const imageUrl = image ? toAbsoluteSiteUrl(image) : undefined;
    const ogImageUrl = ogImage ? toAbsoluteSiteUrl(ogImage) : imageUrl;
    const twitterImageUrl = twitterImage ? toAbsoluteSiteUrl(twitterImage) : ogImageUrl;
    const robotsContent = robots ?? 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';
    const resolvedImageAlt = imageAlt ?? title;
    const resolvedOgTitle = ogTitle || title;
    const resolvedOgDescription = ogDescription || description;
    const resolvedTwitterTitle = twitterTitle || resolvedOgTitle;
    const resolvedTwitterDescription = twitterDescription || resolvedOgDescription;

    document.title = title;
    document.documentElement.setAttribute('lang', 'fr');

    setMetaContent('description', description);
    setMetaContent('robots', robotsContent);
    setMetaContent('googlebot', robotsContent);
    setMetaContent('author', BRAND_NAME);
    setMetaContent('application-name', BRAND_NAME);
    setMetaContent('apple-mobile-web-app-title', BRAND_NAME);

    if (keywords) {
      setMetaContent('keywords', keywords);
    } else {
      removeMeta('keywords');
    }

    setMetaContent('og:title', resolvedOgTitle, 'property');
    setMetaContent('og:description', resolvedOgDescription, 'property');
    setMetaContent('og:type', type, 'property');
    setMetaContent('og:url', canonicalUrl, 'property');
    setMetaContent('og:site_name', BRAND_NAME, 'property');
    setMetaContent('og:locale', 'fr_MA', 'property');

    setMetaContent('twitter:card', twitterImageUrl ? 'summary_large_image' : 'summary');
    setMetaContent('twitter:title', resolvedTwitterTitle);
    setMetaContent('twitter:description', resolvedTwitterDescription);
    setMetaContent('twitter:url', canonicalUrl);
    setMetaContent('twitter:site', '@FacTourati');

    if (ogImageUrl) {
      setMetaContent('og:image', ogImageUrl, 'property');
      setMetaContent('og:image:secure_url', ogImageUrl, 'property');
      setMetaContent('og:image:alt', resolvedImageAlt, 'property');
      setMetaContent('twitter:image', twitterImageUrl || ogImageUrl);
      setMetaContent('twitter:image:alt', resolvedImageAlt);
    } else {
      removeMeta('og:image', 'property');
      removeMeta('og:image:secure_url', 'property');
      removeMeta('og:image:alt', 'property');
      removeMeta('twitter:image');
      removeMeta('twitter:image:alt');
    }

    const canonicalLinks = Array.from(document.head.querySelectorAll('link[rel="canonical"]'));
    const [existingCanonical, ...duplicateCanonicals] = canonicalLinks;
    duplicateCanonicals.forEach((canonicalNode) => canonicalNode.remove());

    let canonical = existingCanonical;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }

    canonical.setAttribute('href', canonicalUrl);

    const schemaNodes = document.head.querySelectorAll('script[data-factourati-schema="true"]');
    schemaNodes.forEach((node) => node.remove());

    if (schema) {
      const schemas = Array.isArray(schema) ? schema : [schema];
      schemas.forEach((entry) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-factourati-schema', 'true');
        script.text = JSON.stringify(entry);
        document.head.appendChild(script);
      });
    }

    return () => {
      const activeSchemaNodes = document.head.querySelectorAll('script[data-factourati-schema="true"]');
      activeSchemaNodes.forEach((node) => node.remove());
    };
  }, [
    canonicalPath,
    description,
    image,
    imageAlt,
    keywords,
    ogDescription,
    ogImage,
    ogTitle,
    robots,
    schema,
    title,
    twitterDescription,
    twitterImage,
    twitterTitle,
    type,
  ]);

  return null;
}

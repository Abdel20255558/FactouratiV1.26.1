import { useEffect } from 'react';
import { BRAND_NAME, SITE_URL } from '../../data/publicSeoData';

type SeoHeadProps = {
  title: string;
  description: string;
  canonicalPath: string;
  keywords?: string;
  image?: string;
  imageAlt?: string;
  type?: 'article' | 'website';
  robots?: string;
  schema?: Record<string, unknown> | Array<Record<string, unknown>>;
};

function setMetaContent(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  let meta = document.head.querySelector(`meta[${attribute}="${name}"]`);

  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, name);
    document.head.appendChild(meta);
  }

  meta.setAttribute('content', content);
}

function removeMeta(name: string, attribute: 'name' | 'property' = 'name') {
  const meta = document.head.querySelector(`meta[${attribute}="${name}"]`);
  meta?.remove();
}

export default function SeoHead({
  title,
  description,
  canonicalPath,
  keywords,
  image,
  imageAlt,
  type = 'website',
  robots,
  schema,
}: SeoHeadProps) {
  useEffect(() => {
    const canonicalUrl = canonicalPath.startsWith('http') ? canonicalPath : `${SITE_URL}${canonicalPath}`;
    const imageUrl = image ? (image.startsWith('http') ? image : `${SITE_URL}${image}`) : undefined;
    const robotsContent = robots ?? 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';
    const resolvedImageAlt = imageAlt ?? title;

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

    setMetaContent('og:title', title, 'property');
    setMetaContent('og:description', description, 'property');
    setMetaContent('og:type', type, 'property');
    setMetaContent('og:url', canonicalUrl, 'property');
    setMetaContent('og:site_name', BRAND_NAME, 'property');
    setMetaContent('og:locale', 'fr_MA', 'property');

    setMetaContent('twitter:card', imageUrl ? 'summary_large_image' : 'summary');
    setMetaContent('twitter:title', title);
    setMetaContent('twitter:description', description);
    setMetaContent('twitter:url', canonicalUrl);
    setMetaContent('twitter:site', '@FacTourati');

    if (imageUrl) {
      setMetaContent('og:image', imageUrl, 'property');
      setMetaContent('og:image:secure_url', imageUrl, 'property');
      setMetaContent('og:image:alt', resolvedImageAlt, 'property');
      setMetaContent('twitter:image', imageUrl);
      setMetaContent('twitter:image:alt', resolvedImageAlt);
    } else {
      removeMeta('og:image', 'property');
      removeMeta('og:image:secure_url', 'property');
      removeMeta('og:image:alt', 'property');
      removeMeta('twitter:image');
      removeMeta('twitter:image:alt');
    }

    let canonical = document.head.querySelector('link[rel="canonical"]');
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
  }, [canonicalPath, description, image, imageAlt, keywords, robots, schema, title, type]);

  return null;
}

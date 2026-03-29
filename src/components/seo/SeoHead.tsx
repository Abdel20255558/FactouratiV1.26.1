import { useEffect } from 'react';

type SeoHeadProps = {
  title: string;
  description: string;
  canonicalPath: string;
  keywords?: string;
  image?: string;
  type?: 'article' | 'website';
  robots?: string;
  schema?: Record<string, unknown> | Array<Record<string, unknown>>;
};

const SITE_URL = 'https://www.factourati.com';

function setMetaContent(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  let meta = document.head.querySelector(`meta[${attribute}="${name}"]`);

  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, name);
    document.head.appendChild(meta);
  }

  meta.setAttribute('content', content);
}

export default function SeoHead({
  title,
  description,
  canonicalPath,
  keywords,
  image,
  type = 'website',
  robots,
  schema,
}: SeoHeadProps) {
  useEffect(() => {
    const canonicalUrl = canonicalPath.startsWith('http') ? canonicalPath : `${SITE_URL}${canonicalPath}`;
    const imageUrl = image ? (image.startsWith('http') ? image : `${SITE_URL}${image}`) : undefined;

    document.title = title;
    setMetaContent('description', description);

    if (keywords) {
      setMetaContent('keywords', keywords);
    }

    setMetaContent('robots', robots ?? 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
    setMetaContent('og:title', title, 'property');
    setMetaContent('og:description', description, 'property');
    setMetaContent('og:type', type, 'property');
    setMetaContent('og:url', canonicalUrl, 'property');
    setMetaContent('og:site_name', 'Factourati', 'property');
    setMetaContent('og:locale', 'fr_MA', 'property');
    setMetaContent('twitter:card', image ? 'summary_large_image' : 'summary');
    setMetaContent('twitter:title', title);
    setMetaContent('twitter:description', description);
    setMetaContent('twitter:url', canonicalUrl);

    if (imageUrl) {
      setMetaContent('og:image', imageUrl, 'property');
      setMetaContent('twitter:image', imageUrl);
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
  }, [canonicalPath, description, image, keywords, robots, schema, title, type]);

  return null;
}

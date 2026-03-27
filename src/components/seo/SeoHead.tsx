import { useEffect } from 'react';

type SeoHeadProps = {
  title: string;
  description: string;
  canonicalPath: string;
  keywords?: string;
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

export default function SeoHead({ title, description, canonicalPath, keywords }: SeoHeadProps) {
  useEffect(() => {
    document.title = title;
    setMetaContent('description', description);

    if (keywords) {
      setMetaContent('keywords', keywords);
    }

    setMetaContent('og:title', title, 'property');
    setMetaContent('og:description', description, 'property');
    setMetaContent('og:type', 'article', 'property');
    setMetaContent('og:url', `${SITE_URL}${canonicalPath}`, 'property');

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }

    canonical.setAttribute('href', `${SITE_URL}${canonicalPath}`);
  }, [canonicalPath, description, keywords, title]);

  return null;
}

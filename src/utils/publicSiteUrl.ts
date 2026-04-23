export const SITE_URL = 'https://factourati.com';

const SITE_ORIGIN = new URL(SITE_URL).origin;

function normalizePathname(pathname: string) {
  const collapsedPath = pathname.replace(/\/{2,}/g, '/');
  const trimmedPath = collapsedPath.replace(/\/+$/, '');
  return trimmedPath || '/';
}

export function normalizePublicPath(path = '/') {
  const rawPath = (path || '').trim();

  if (!rawPath || rawPath === '/') {
    return '/';
  }

  if (/^https?:\/\//i.test(rawPath)) {
    try {
      const parsedUrl = new URL(rawPath);
      return normalizePathname(parsedUrl.pathname);
    } catch {
      return '/';
    }
  }

  const withoutHash = rawPath.split('#', 1)[0] || rawPath;
  const withoutSearch = withoutHash.split('?', 1)[0] || withoutHash;
  const prefixedPath = withoutSearch.startsWith('/') ? withoutSearch : `/${withoutSearch}`;

  return normalizePathname(prefixedPath);
}

export function toAbsoluteSiteUrl(pathOrUrl = '/') {
  const rawValue = (pathOrUrl || '').trim();

  if (!rawValue) {
    return SITE_URL;
  }

  if (/^https?:\/\//i.test(rawValue)) {
    try {
      const parsedUrl = new URL(rawValue);
      const normalizedPath = normalizePathname(parsedUrl.pathname);
      return normalizedPath === '/' ? SITE_URL : `${SITE_ORIGIN}${normalizedPath}`;
    } catch {
      return SITE_URL;
    }
  }

  const normalizedPath = normalizePublicPath(rawValue);
  return normalizedPath === '/' ? SITE_URL : `${SITE_ORIGIN}${normalizedPath}`;
}

export function isPreferredPublicUrl(pathOrUrl = '/') {
  return toAbsoluteSiteUrl(pathOrUrl) === (pathOrUrl || '').trim();
}

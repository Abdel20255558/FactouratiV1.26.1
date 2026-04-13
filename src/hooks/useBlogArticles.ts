import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BlogResolvedArticle } from '../types/blog';
import { fetchFirestoreBlogPosts, getStaticBlogArticles } from '../services/blogService';

type UseBlogArticlesOptions = {
  includeUnpublished?: boolean;
  includeHiddenStatic?: boolean;
};

function getArticleSortTime(article: BlogResolvedArticle) {
  const timestamp = new Date(article.publishedAtISO || article.createdAt || article.updatedAt || '').getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function useBlogArticles(options?: UseBlogArticlesOptions) {
  const [firestoreArticles, setFirestoreArticles] = useState<BlogResolvedArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const staticArticles = useMemo(() => getStaticBlogArticles(), []);

  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const articles = await fetchFirestoreBlogPosts({
        includeUnpublished: options?.includeUnpublished,
      });
      setFirestoreArticles(articles);
    } catch (loadError) {
      console.error('Erreur lors du chargement des articles blog:', loadError);
      setError('Impossible de charger les articles du blog.');
    } finally {
      setIsLoading(false);
    }
  }, [options?.includeUnpublished]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const filteredStaticArticles = useMemo(() => {
    if (options?.includeHiddenStatic) {
      return staticArticles;
    }

    return staticArticles.filter((article) => article.isVisibleInListings);
  }, [options?.includeHiddenStatic, staticArticles]);

  const articles = useMemo(() => {
    const mergedArticles = [...firestoreArticles, ...filteredStaticArticles].sort(
      (a, b) => getArticleSortTime(b) - getArticleSortTime(a),
    );

    const uniqueArticles = new Map<string, BlogResolvedArticle>();
    mergedArticles.forEach((article) => {
      if (!uniqueArticles.has(article.slug)) {
        uniqueArticles.set(article.slug, article);
      }
    });

    return Array.from(uniqueArticles.values());
  }, [filteredStaticArticles, firestoreArticles]);

  return {
    articles,
    firestoreArticles,
    staticArticles,
    isLoading,
    error,
    refetch: loadArticles,
  };
}

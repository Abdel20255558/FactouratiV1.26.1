import { Suspense, lazy } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3 } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { getBlogArticleMeta } from '../../data/blogTaxonomy';
import { SITE_URL, createBreadcrumbSchema } from '../../data/publicSeoData';
import { useBlogArticles } from '../../hooks/useBlogArticles';
import { resolveArticleSeo } from '../../utils/blogSeo';
import PublicSiteChrome from '../public/PublicSiteChrome';
import SeoHead from '../seo/SeoHead';
import LinkedBlogText from './LinkedBlogText';

const GuideErpArticle = lazy(() => import('./GuideErpArticle'));
const GuideFacturationArticle = lazy(() => import('./GuideFacturationArticle'));
const GuideFiscalArticle = lazy(() => import('./GuideFiscalArticle'));
const GuideProjectArticle = lazy(() => import('./GuideProjectArticle'));
const GuideStockArticle = lazy(() => import('./GuideStockArticle'));

function ArticleLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center bg-white">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 shadow-sm">
        Chargement de l'article...
      </div>
    </div>
  );
}

function splitReadableText(text: string) {
  const withLinkBreaks = text
    .replace(/\s+(Lien\s+interne\s*:)/gi, '\n\n$1')
    .replace(/\s+(Lien\s+externe\s*:)/gi, '\n\n$1');
  const blocks = withLinkBreaks
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.flatMap((block) => {
    if (block.length <= 520) {
      return [block];
    }

    const sentences = block.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [block];
    const paragraphs: string[] = [];
    let currentParagraph = '';

    sentences.forEach((sentence) => {
      const nextParagraph = currentParagraph ? `${currentParagraph} ${sentence}` : sentence;
      if (nextParagraph.length > 420 && currentParagraph) {
        paragraphs.push(currentParagraph);
        currentParagraph = sentence;
        return;
      }

      currentParagraph = nextParagraph;
    });

    if (currentParagraph) {
      paragraphs.push(currentParagraph);
    }

    return paragraphs;
  });
}

export default function BlogArticlePage() {
  const { slug } = useParams();
  const { articles, isLoading } = useBlogArticles({ includeHiddenStatic: true });

  if (slug === 'gestion-projet-meilleures-pratiques') {
    return <Navigate to="/blog/gestion-de-projet-meilleures-pratiques" replace />;
  }

  if (slug === 'guide-complet-facturation-maroc') {
    return (
      <Suspense fallback={<ArticleLoader />}>
        <GuideFacturationArticle />
      </Suspense>
    );
  }

  if (slug === 'comment-gerer-votre-stock-efficacement') {
    return (
      <Suspense fallback={<ArticleLoader />}>
        <GuideStockArticle />
      </Suspense>
    );
  }

  if (slug === 'avantages-erp-pme-marocaines') {
    return (
      <Suspense fallback={<ArticleLoader />}>
        <GuideErpArticle />
      </Suspense>
    );
  }

  if (slug === 'conformite-fiscale-maroc-factourati') {
    return (
      <Suspense fallback={<ArticleLoader />}>
        <GuideFiscalArticle />
      </Suspense>
    );
  }

  if (slug === 'gestion-de-projet-meilleures-pratiques') {
    return (
      <Suspense fallback={<ArticleLoader />}>
        <GuideProjectArticle />
      </Suspense>
    );
  }

  const article = articles.find((item) => item.slug === slug);

  if (!article) {
    if (isLoading) {
      return <ArticleLoader />;
    }

    return <Navigate to="/blog" replace />;
  }

  const relatedArticles = articles.filter((item) => item.slug !== article.slug).slice(0, 3);
  const articleCategory = getBlogArticleMeta(article);
  const articleSeo = resolveArticleSeo(article);
  const introBlocks = splitReadableText(article.intro);
  const articleImage = articleSeo.ogImage || article.image;
  const articleImageUrl = articleImage.startsWith('http') ? articleImage : `${SITE_URL}${articleImage}`;
  const canonicalPath = articleSeo.canonicalUrl || `/blog/${article.slug}`;
  const robots = `${articleSeo.robotsIndex}, ${articleSeo.robotsFollow}, max-snippet:-1, max-image-preview:large, max-video-preview:-1`;

  const contentSchema =
    articleSeo.schemaType === 'None'
      ? null
      : articleSeo.schemaType === 'FAQPage'
        ? {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: article.sections.map((section) => ({
              '@type': 'Question',
              name: section.heading,
              acceptedAnswer: {
                '@type': 'Answer',
                text: section.paragraphs.join(' '),
              },
            })),
          }
        : {
            '@context': 'https://schema.org',
            '@type': articleSeo.schemaType,
            headline: article.title,
            description: articleSeo.metaDescription,
            image: [articleImageUrl],
            keywords: article.keywords.join(', '),
            author: {
              '@type': 'Organization',
              name: 'Factourati',
            },
            publisher: {
              '@type': 'Organization',
              name: 'Factourati',
              logo: {
                '@type': 'ImageObject',
                url: `${SITE_URL}/files_3254075-1761082431431-image.png`,
              },
            },
            mainEntityOfPage: articleSeo.canonicalUrl || `${SITE_URL}/blog/${article.slug}`,
            datePublished: article.publishedAtISO,
            dateModified: article.updatedAt || article.publishedAtISO,
          };

  const articleSchema = [
    createBreadcrumbSchema([
      { name: 'Accueil', url: SITE_URL },
      { name: 'Blog', url: `${SITE_URL}/blog` },
      ...(articleCategory
        ? [{ name: articleCategory.category, url: `${SITE_URL}/blog/categorie/${articleCategory.categorySlug}` }]
        : []),
      { name: article.title, url: `${SITE_URL}/blog/${article.slug}` },
    ]),
    ...(contentSchema ? [contentSchema] : []),
  ];

  return (
    <PublicSiteChrome>
      <SeoHead
        title={articleSeo.seoTitle}
        description={articleSeo.metaDescription}
        canonicalPath={canonicalPath}
        keywords={article.keywords.join(', ')}
        image={articleImage}
        imageAlt={article.imageAlt}
        ogTitle={articleSeo.ogTitle}
        ogDescription={articleSeo.ogDescription}
        ogImage={articleSeo.ogImage || article.image}
        twitterTitle={articleSeo.twitterTitle}
        twitterDescription={articleSeo.twitterDescription}
        twitterImage={articleSeo.twitterImage || articleSeo.ogImage || article.image}
        type="article"
        robots={robots}
        schema={articleSchema}
      />

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-teal-900 text-white">
        <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-12 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-teal-200 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Retour au blog
          </Link>

          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-teal-100">
                {article.heroLabel}
              </div>
              <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-300">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {article.publishedAt}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Clock3 className="h-4 w-4" />
                  {article.readingTime} de lecture
                </span>
              </div>
              <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">{article.title}</h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">{article.description}</p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur">
              <img
                src={article.image}
                alt={article.imageAlt}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="h-full w-full rounded-[1.5rem] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
          <article className="max-w-4xl">
            <div className="rounded-[1.75rem] border border-teal-100 bg-gradient-to-br from-teal-50 to-blue-50 p-7 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">En resume</h2>
              <div className="mt-4 space-y-4 break-words text-base leading-8 text-gray-700">
                {introBlocks.map((introBlock) => (
                  <p key={introBlock}>
                    <LinkedBlogText text={introBlock} />
                  </p>
                ))}
              </div>
              <ul className="mt-5 space-y-3">
                {article.summaryPoints.map((point) => (
                  <li key={point} className="flex gap-3 text-sm leading-7 text-gray-700">
                    <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-teal-600" />
                    <span>
                      <LinkedBlogText text={point} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-10 space-y-10">
              {article.sections.map((section) => (
                <section key={section.heading} className="rounded-[1.75rem] border border-gray-200 bg-white p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900">{section.heading}</h2>
                  <div className="mt-5 space-y-4 break-words text-base leading-8 text-gray-700">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>
                        <LinkedBlogText text={paragraph} />
                      </p>
                    ))}
                  </div>
                  {section.image && (
                    <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-gray-200 bg-gray-50 shadow-sm">
                      <img
                        src={section.image}
                        alt={section.imageAlt || section.heading}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  {section.bullets && (
                    <ul className="mt-6 grid gap-3 md:grid-cols-2">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                          <LinkedBlogText text={bullet} />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>

            <div className="mt-12 rounded-[1.75rem] bg-gray-900 p-8 text-white shadow-xl">
              <h2 className="text-2xl font-semibold">Transformer ces bonnes pratiques en resultat concret</h2>
              <p className="mt-3 max-w-2xl text-slate-300">
                Factourati vous aide a relier la facturation, les clients, le stock, les fournisseurs et les projets
                dans une seule interface claire.
              </p>
              <Link
                to="/login?mode=register"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-gray-900 transition hover:bg-gray-100"
              >
                Demarrer l'essai gratuit
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </article>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-[1.75rem] border border-gray-200 bg-gray-50 p-6">
              <h2 className="text-lg font-semibold text-gray-900">Mots-cles travailles</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {article.keywords.map((keyword) => (
                  <span key={keyword} className="rounded-full bg-white px-3 py-2 text-sm text-gray-700 shadow-sm">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">A lire ensuite</h2>
              <div className="mt-5 space-y-5">
                {relatedArticles.map((related) => (
                  <Link key={related.slug} to={`/blog/${related.slug}`} className="block rounded-2xl border border-gray-100 p-4 transition hover:border-teal-200 hover:bg-teal-50">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">{getBlogArticleMeta(related).category}</p>
                    <p className="mt-2 text-base font-semibold leading-7 text-gray-900">{related.title}</p>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </PublicSiteChrome>
  );
}

import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3 } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { blogArticles, getBlogArticleBySlug } from '../../data/blogArticles';
import GuideFacturationArticle from './GuideFacturationArticle';
import PublicSiteChrome from '../public/PublicSiteChrome';
import SeoHead from '../seo/SeoHead';

export default function BlogArticlePage() {
  const { slug } = useParams();
  const article = getBlogArticleBySlug(slug);

  if (!article) {
    return <Navigate to="/blog" replace />;
  }

  if (slug === 'guide-complet-facturation-maroc') {
    return <GuideFacturationArticle />;
  }

  const relatedArticles = blogArticles.filter((item) => item.slug !== article.slug).slice(0, 3);

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.description,
    image: [`https://www.factourati.com${article.image}`],
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
        url: 'https://www.factourati.com/files_3254075-1761082431431-image.png',
      },
    },
    mainEntityOfPage: `https://www.factourati.com/blog/${article.slug}`,
    datePublished: '2026-03-27',
    dateModified: '2026-03-27',
  };

  return (
    <PublicSiteChrome>
      <SeoHead
        title={article.seoTitle}
        description={article.description}
        canonicalPath={`/blog/${article.slug}`}
        keywords={article.keywords.join(', ')}
        image={article.image}
        type="article"
      />
      <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>

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
              <img src={article.image} alt={article.imageAlt} className="h-full w-full rounded-[1.5rem] object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
          <article className="max-w-4xl">
            <div className="rounded-[1.75rem] border border-teal-100 bg-gradient-to-br from-teal-50 to-blue-50 p-7 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">En resume</h2>
              <p className="mt-4 text-base leading-8 text-gray-700">{article.intro}</p>
              <ul className="mt-5 space-y-3">
                {article.summaryPoints.map((point) => (
                  <li key={point} className="flex gap-3 text-sm leading-7 text-gray-700">
                    <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-teal-600" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-10 space-y-10">
              {article.sections.map((section) => (
                <section key={section.heading} className="rounded-[1.75rem] border border-gray-200 bg-white p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900">{section.heading}</h2>
                  <div className="mt-5 space-y-4 text-base leading-8 text-gray-700">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  {section.bullets && (
                    <ul className="mt-6 grid gap-3 md:grid-cols-2">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                          {bullet}
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
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">{related.category}</p>
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

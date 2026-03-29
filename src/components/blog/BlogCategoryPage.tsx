import { ArrowLeft, ArrowRight, CalendarDays, Clock3, FolderOpen } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  blogArticleOverrides,
  blogCategoryDefinitions,
  getBlogCategoryBySlug,
  getVisibleArticlesByCategorySlug,
} from '../../data/blogTaxonomy';
import { SITE_URL, createBreadcrumbSchema } from '../../data/publicSeoData';
import PublicSiteChrome from '../public/PublicSiteChrome';
import SeoHead from '../seo/SeoHead';

export default function BlogCategoryPage() {
  const { categorySlug } = useParams();
  const category = getBlogCategoryBySlug(categorySlug);

  if (!category) {
    return <Navigate to="/blog" replace />;
  }

  const articles = getVisibleArticlesByCategorySlug(category.slug);
  const featuredImage = articles[0]?.image;
  const otherCategories = blogCategoryDefinitions.filter((item) => item.slug !== category.slug);
  const schema = createBreadcrumbSchema([
    { name: 'Accueil', url: SITE_URL },
    { name: 'Blog', url: `${SITE_URL}/blog` },
    { name: category.label, url: `${SITE_URL}/blog/categorie/${category.slug}` },
  ]);

  return (
    <PublicSiteChrome>
      <SeoHead
        title={`${category.label} | Blog Factourati`}
        description={category.description}
        canonicalPath={`/blog/categorie/${category.slug}`}
        keywords={category.keywords.join(', ')}
        image={featuredImage}
        type="website"
        schema={schema}
      />

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(13,148,136,0.14),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(37,99,235,0.12),_transparent_30%),linear-gradient(180deg,_#ffffff_0%,_#f8fbff_100%)]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800">
            <ArrowLeft className="h-4 w-4" />
            Retour au blog
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px] lg:items-end">
            <div>
              <div className="inline-flex items-center rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700 shadow-sm">
                <FolderOpen className="mr-2 h-4 w-4" />
                Categorie {category.label}
              </div>
              <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
                Articles Factourati sur {category.label.toLowerCase()}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{category.description}</p>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Explorer aussi</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {otherCategories.map((item) => (
                  <Link
                    key={item.slug}
                    to={`/blog/categorie/${item.slug}`}
                    className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 rounded-[1.75rem] border border-teal-100 bg-white p-7 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Ce que vous allez trouver ici</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">{category.introTitle}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {category.introPoints.map((point) => (
                <div key={point} className="rounded-2xl bg-slate-50 px-4 py-4 text-sm font-medium leading-6 text-slate-700">
                  {point}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Selection {category.label}</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">Guides utiles pour mieux gerer votre entreprise</h2>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm">
              {articles.length} article{articles.length > 1 ? 's' : ''}
            </div>
          </div>

          <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
            {articles.map((article) => {
              const override = blogArticleOverrides[article.slug];

              return (
                <article
                  key={article.slug}
                  className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_60px_rgba(15,23,42,0.10)]"
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={article.image}
                      alt={article.imageAlt}
                      loading="lazy"
                      decoding="async"
                      className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700 shadow-sm">
                      {override.category}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {article.publishedAt}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Clock3 className="h-4 w-4" />
                        {article.readingTime}
                      </span>
                    </div>

                    <h2 className="mt-4 text-xl font-bold leading-8 text-slate-900">{article.title}</h2>
                    <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">{override.excerpt}</p>

                    <Link
                      to={`/blog/${article.slug}`}
                      className="mt-6 inline-flex items-center gap-2 font-semibold text-teal-700 transition hover:text-teal-800"
                    >
                      Lire l'article
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-12 rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Aller plus loin</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">Explorez les autres pages utiles de Factourati</h2>
            <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
              Si vous comparez encore les solutions ou si vous voulez mieux comprendre l offre Factourati, vous pouvez
              continuer avec nos pages publiques les plus importantes.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/tarifs"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
              >
                Voir les tarifs
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/faq"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
              >
                Lire la FAQ
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
              >
                Retour au blog
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicSiteChrome>
  );
}

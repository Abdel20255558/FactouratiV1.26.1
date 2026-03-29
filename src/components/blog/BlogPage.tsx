import { ArrowRight, CalendarDays, CheckCircle2, Clock3, FolderKanban, Receipt, Search, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { blogArticleOverrides, blogCategoryDefinitions, visibleBlogArticles } from '../../data/blogTaxonomy';
import PublicSiteChrome from '../public/PublicSiteChrome';
import SeoHead from '../seo/SeoHead';
const articles = visibleBlogArticles;

const featuredArticle = articles[0];
const articleCountLabel = `${articles.length} articles a lire`;

const conversionPoints = [
  'Gain de temps au quotidien',
  'Meilleur suivi de votre activite',
  "Gestion plus fluide de votre entreprise",
];

export default function BlogPage() {
  return (
    <PublicSiteChrome>
      <SeoHead
        title="Blog Factourati | Conseils pratiques pour mieux gerer votre entreprise au Maroc"
        description="Retrouvez des guides utiles sur la facturation, le stock, la fiscalite, l organisation et la gestion des PME pour piloter votre activite plus sereinement."
        canonicalPath="/blog"
        keywords="blog facturation maroc, gestion entreprise maroc, stock maroc, fiscalite maroc, ERP PME maroc"
        image={featuredArticle.image}
        type="website"
      />

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(13,148,136,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(37,99,235,0.15),_transparent_30%),linear-gradient(135deg,_#f8fffe_0%,_#ffffff_45%,_#f8fbff_100%)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-200 to-transparent" />
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex items-center rounded-full border border-teal-200 bg-white/90 px-4 py-2 text-sm font-semibold text-teal-700 shadow-sm">
                <Sparkles className="mr-2 h-4 w-4" />
                Blog Factourati
              </div>

              <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Conseils pratiques pour mieux gerer votre entreprise au Maroc
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Retrouvez des guides utiles sur la facturation, le stock, la fiscalite, l organisation et la gestion
                des PME pour gagner du temps et piloter votre activite plus sereinement.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/login?mode=register"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 font-semibold text-white transition hover:bg-slate-800"
                >
                  Essayer Factourati gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#articles"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
                >
                  Voir les articles
                </a>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur">
                  <Receipt className="h-5 w-5 text-teal-700" />
                  <p className="mt-3 text-sm font-semibold text-slate-900">Facturation claire</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Devis, factures, paiements et relances mieux organises.</p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur">
                  <Search className="h-5 w-5 text-teal-700" />
                  <p className="mt-3 text-sm font-semibold text-slate-900">Gestion plus simple</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Des conseils concrets pour mieux suivre votre activite.</p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur">
                  <FolderKanban className="h-5 w-5 text-teal-700" />
                  <p className="mt-3 text-sm font-semibold text-slate-900">PME marocaines</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Des contenus utiles, adaptes aux besoins du terrain.</p>
                </div>
              </div>
            </div>

            <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_20px_80px_rgba(15,23,42,0.10)]">
              <div className="relative">
                <img
                  src={featuredArticle.image}
                  alt={featuredArticle.imageAlt}
                  className="h-72 w-full object-cover"
                />
                <div className="absolute left-5 top-5 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 shadow-sm">
                  {blogArticleOverrides[featuredArticle.slug].category}
                </div>
              </div>
              <div className="p-7 sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Article mis en avant</p>
                <h2 className="mt-3 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">{featuredArticle.title}</h2>
                <p className="mt-4 text-base leading-7 text-slate-600">{blogArticleOverrides[featuredArticle.slug].excerpt}</p>
                <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {featuredArticle.publishedAt}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    {featuredArticle.readingTime}
                  </span>
                </div>
                <Link
                  to={`/blog/${featuredArticle.slug}`}
                  className="mt-7 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white transition hover:bg-teal-700"
                >
                  Lire l'article
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Explorer par categorie</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Des sujets utiles pour mieux piloter votre entreprise</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {blogCategoryDefinitions.map((category) => (
                <Link
                  key={category.slug}
                  to={`/blog/categorie/${category.slug}`}
                  className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                >
                  {category.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="articles" className="bg-slate-50 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Nos derniers guides</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">Les articles a lire pour mieux gerer votre activite</h2>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm">
              {articleCountLabel}
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

                    <h3 className="mt-4 text-xl font-bold leading-8 text-slate-900">{article.title}</h3>
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
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[2rem] bg-slate-900 p-8 text-white shadow-[0_20px_80px_rgba(15,23,42,0.16)]">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-300">Factourati pour votre entreprise</p>
              <h2 className="mt-4 text-3xl font-bold leading-tight">Passez a une gestion plus simple avec Factourati</h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
                Centralisez vos devis, factures, relances, clients et outils de gestion dans une solution pensee pour
                les entreprises marocaines.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {conversionPoints.map((point) => (
                  <div key={point} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <CheckCircle2 className="h-5 w-5 text-teal-300" />
                    <p className="mt-3 text-sm font-medium leading-6 text-white">{point}</p>
                  </div>
                ))}
              </div>
              <Link
                to="/login?mode=register"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Commencer gratuitement
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,_#f8fffe_0%,_#eefbf8_40%,_#ffffff_100%)] p-8 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Pourquoi les PME choisissent Factourati</p>
              <h2 className="mt-4 text-3xl font-bold leading-tight text-slate-900">Une plateforme claire pour mieux suivre votre quotidien</h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                Factourati aide a structurer la facturation, le suivi client, le stock et le pilotage de l activite
                sans complexifier vos habitudes de travail.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">Devis et factures</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Creez vos documents plus vite et gardez un suivi propre de vos paiements.</p>
                </div>
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">Stock et organisation</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Mieux anticiper vos besoins et garder une vision plus claire de votre activite.</p>
                </div>
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">Clients et relances</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Centralisez les informations importantes pour gagner du temps au quotidien.</p>
                </div>
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">Pilotage global</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Suivez plus facilement les sujets qui comptent pour votre entreprise.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-16 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,_rgba(15,118,110,0.35),_rgba(15,23,42,0.95))] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.22)] sm:p-10 lg:p-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-200">Essai gratuit</p>
                <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">Pret a simplifier la gestion de votre entreprise ?</h2>
                <p className="mt-4 text-lg leading-8 text-slate-200">
                  Essayez Factourati pour centraliser vos devis, factures, paiements et relances dans une seule
                  plateforme.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/login?mode=register"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Creer mon compte
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicSiteChrome>
  );
}

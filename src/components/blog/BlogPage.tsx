import { ArrowRight, CalendarDays, Clock3, FileText, Search, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import SeoHead from '../seo/SeoHead';

const article = {
  title: 'Logiciel de facturation au Maroc : comment choisir la bonne solution pour votre entreprise',
  slug: '/blog/logiciel-facturation-maroc',
  excerpt:
    "Découvrez les critères essentiels pour choisir un logiciel de facturation au Maroc, gagner du temps et structurer la gestion de votre entreprise.",
  date: '27 mars 2026',
  readingTime: '8 min de lecture',
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50">
      <SeoHead
        title="Blog Factourati | Conseils facturation et gestion d'entreprise au Maroc"
        description="Articles pratiques sur la facturation, la gestion commerciale, le stock et les outils de pilotage pour entreprises au Maroc."
        canonicalPath="/blog"
        keywords="blog facturation maroc, logiciel de facturation maroc, gestion entreprise maroc, blog ERP maroc"
      />

      <section className="border-b border-teal-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link to="/" className="text-sm font-medium text-teal-700 hover:text-teal-800">
                Retour a l'accueil
              </Link>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Blog Factourati</h1>
              <p className="mt-3 max-w-2xl text-base text-slate-600">
                Des contenus utiles pour mieux gerer votre facturation, votre stock et votre activite au Maroc.
              </p>
            </div>
            <Link
              to="/login?mode=register"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
            >
              Tester Factourati
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-8 text-white">
              <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
                <TrendingUp className="mr-2 h-4 w-4" />
                Article a forte intention SEO
              </span>
              <h2 className="mt-4 text-3xl font-bold leading-tight">{article.title}</h2>
              <p className="mt-4 max-w-2xl text-white/90">{article.excerpt}</p>
              <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/90">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {article.date}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Clock3 className="h-4 w-4" />
                  {article.readingTime}
                </span>
              </div>
            </div>

            <div className="p-8">
              <p className="text-base leading-8 text-slate-600">
                Si vous voulez augmenter votre visibilite sur Google, une page blog bien structuree est un excellent
                point de depart. Elle permet de travailler des recherches comme "logiciel de facturation maroc",
                "ERP Maroc" ou "gestion commerciale PME Maroc" avec du contenu utile et pertinent.
              </p>

              <div className="mt-8">
                <Link
                  to={article.slug}
                  className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-5 py-3 font-semibold text-teal-700 transition hover:bg-teal-100"
                >
                  Lire l'article complet
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </article>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                  <Search className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Pourquoi cette page aide le SEO</h3>
              </div>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                <li>Elle cible des mots-cles recherches par vos clients potentiels.</li>
                <li>Elle cree une nouvelle porte d'entree organique vers votre site.</li>
                <li>Elle renforce la pertinence de votre marque sur la facturation au Maroc.</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-3">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">Prochaine etape conseillee</h3>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Publier regulierement d'autres articles sur la facturation electronique, la gestion de stock, la TVA
                et les devis au Maroc pour multiplier les mots-cles longue traine.
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

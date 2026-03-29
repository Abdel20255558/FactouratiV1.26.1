import { Link } from 'react-router-dom';
import { ArrowRight, Home } from 'lucide-react';
import PublicSiteChrome from './PublicSiteChrome';
import SeoHead from '../seo/SeoHead';

export default function NotFoundPage() {
  return (
    <PublicSiteChrome>
      <SeoHead
        title="Page introuvable | Factourati"
        description="La page demandee est introuvable. Retrouvez l accueil, les tarifs, la FAQ ou le blog Factourati."
        canonicalPath="/404"
        robots="noindex, follow"
        type="website"
      />

      <section className="bg-slate-50 py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">Erreur 404</p>
          <h1 className="mt-4 text-4xl font-extrabold text-slate-900 sm:text-5xl">Cette page n existe pas</h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            L URL demandee est peut-etre incorrecte ou la page a ete deplacee. Vous pouvez revenir vers les pages
            importantes du site.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
            >
              <Home className="h-4 w-4" />
              Retour a l accueil
            </Link>
            <Link
              to="/blog"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
            >
              Voir le blog
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </PublicSiteChrome>
  );
}

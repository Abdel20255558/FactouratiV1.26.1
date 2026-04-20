import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PublicSiteChrome from './PublicSiteChrome';
import SeoHead from '../seo/SeoHead';
import {
  DEFAULT_OG_IMAGE,
  SITE_URL,
  createBreadcrumbSchema,
  createFaqSchema,
  createLocalBusinessSchema,
  createOrganizationSchema,
  createSiteNavigationSchema,
  createWebPageSchema,
  createWebsiteSchema,
  faqItems,
} from '../../data/publicSeoData';

export default function FaqPage() {
  const pageUrl = `${SITE_URL}/faq`;
  const pageDescription =
    "Consultez la FAQ Factourati pour comprendre le fonctionnement du logiciel, les tarifs, l'essai gratuit et les usages pour les PME marocaines.";
  const schema = [
    createOrganizationSchema(),
    createLocalBusinessSchema(),
    createWebsiteSchema(),
    createSiteNavigationSchema(),
    createFaqSchema(),
    createBreadcrumbSchema([
      { name: 'Accueil', url: SITE_URL },
      { name: 'FAQ', url: pageUrl },
    ]),
    createWebPageSchema({
      name: 'FAQ Factourati | Tarifs, essai gratuit et logiciel de gestion',
      path: '/faq',
      description: pageDescription,
    }),
  ];

  return (
    <PublicSiteChrome>
      <SeoHead
        title="FAQ Factourati | Tarifs, essai gratuit et logiciel de gestion"
        description={pageDescription}
        canonicalPath="/faq"
        keywords="faq factourati, logiciel gestion maroc faq, facturation maroc questions"
        image={DEFAULT_OG_IMAGE}
        imageAlt="Questions frequentes sur Factourati"
        type="website"
        schema={schema}
      />

      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">FAQ Factourati</p>
          <h1 className="mt-4 text-4xl font-extrabold text-slate-900 sm:text-5xl">
            Les reponses utiles pour choisir votre solution de gestion
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Retrouvez les questions frequentes sur Factourati, les tarifs, l essai gratuit et la gestion des PME
            marocaines.
          </p>

          <div className="mt-10 rounded-[1.75rem] border border-teal-100 bg-teal-50 p-6">
            <h2 className="text-2xl font-bold text-slate-900">
              Une FAQ pour comprendre Factourati avant de creer un compte
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-700">
              Cette page repond aux principales recherches autour du logiciel de facturation au Maroc : prix,
              essai gratuit, generation de facture, suivi des paiements, gestion du stock, modules disponibles et
              adaptation aux petites entreprises. Elle aide aussi a choisir entre le generateur gratuit et le compte
              complet Factourati.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/generateur-facture"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white transition hover:bg-teal-800"
              >
                Tester le generateur gratuit
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/modules"
                className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-white px-5 py-3 font-semibold text-teal-800 transition hover:border-teal-300"
              >
                Voir les modules
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-12 space-y-4">
            {faqItems.map((item) => (
              <details key={item.question} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <summary className="cursor-pointer text-lg font-semibold text-slate-900">{item.question}</summary>
                <p className="mt-4 text-base leading-8 text-slate-700">{item.answer}</p>
              </details>
            ))}
          </div>

          <div className="mt-12 rounded-[1.75rem] bg-slate-900 p-8 text-white shadow-xl">
            <h2 className="text-2xl font-semibold">Passez a une gestion plus simple avec Factourati</h2>
            <p className="mt-3 max-w-2xl text-slate-300">
              Testez la solution pour centraliser vos devis, factures, relances, produits et activite dans une seule
              interface.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/login?mode=register"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Creer mon compte
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/tarifs"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/15"
              >
                Voir les tarifs
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/15"
              >
                Lire le blog
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <article className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-xl font-bold text-slate-900">Pour qui ?</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Factourati convient aux PME, TPE, commerces, prestataires, agences, distributeurs et entreprises qui
                veulent mieux organiser leurs documents commerciaux.
              </p>
            </article>
            <article className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-xl font-bold text-slate-900">Pourquoi maintenant ?</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Plus l entreprise grandit, plus les fichiers se dispersent. Un outil centralise aide a retrouver les
                factures, suivre les paiements et comprendre l activite.
              </p>
            </article>
            <article className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-xl font-bold text-slate-900">Comment tester ?</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Vous pouvez commencer par le generateur gratuit, puis creer un compte pour sauvegarder les documents et
                utiliser les modules complets.
              </p>
            </article>
          </div>
        </div>
      </section>
    </PublicSiteChrome>
  );
}

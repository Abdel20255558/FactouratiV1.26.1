import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicSiteChrome from './PublicSiteChrome';
import SeoHead from '../seo/SeoHead';
import {
  BRAND_LOGO_URL,
  SITE_URL,
  createBreadcrumbSchema,
  createLocalBusinessSchema,
  createOrganizationSchema,
  publicPricing,
} from '../../data/publicSeoData';

const plans = [
  {
    key: 'monthly',
    name: 'Mensuel',
    price: publicPricing.monthly,
    label: 'par mois',
    highlight: false,
  },
  {
    key: 'sixMonths',
    name: '6 mois',
    price: publicPricing.sixMonths,
    label: 'pour 6 mois',
    highlight: true,
  },
  {
    key: 'annual',
    name: 'Annuel',
    price: publicPricing.annual,
    label: 'par an',
    highlight: false,
  },
] as const;

const features = [
  'Devis et factures illimites',
  'Suivi des paiements et relances',
  'Gestion du stock et des produits',
  'Clients et fournisseurs centralises',
  'Projets et pilotage d activite',
  'Solution pensee pour les PME marocaines',
];

export default function PricingPage() {
  const pageUrl = `${SITE_URL}/tarifs`;

  const schema = [
    createOrganizationSchema(),
    createLocalBusinessSchema(),
    createBreadcrumbSchema([
      { name: 'Accueil', url: SITE_URL },
      { name: 'Tarifs', url: pageUrl },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'OfferCatalog',
      name: 'Tarifs Factourati',
      url: pageUrl,
      itemListElement: plans.map((plan) => ({
        '@type': 'Offer',
        name: `Abonnement ${plan.name} Factourati`,
        price: plan.price,
        priceCurrency: 'MAD',
        url: pageUrl,
        availability: 'https://schema.org/InStock',
      })),
    },
  ];

  return (
    <PublicSiteChrome>
      <SeoHead
        title="Tarifs Factourati au Maroc | Logiciel de gestion pour PME"
        description="Consultez les tarifs Factourati pour les entreprises marocaines : 199 DH par mois, 999 DH pour 6 mois et 1999 DH par an."
        canonicalPath="/tarifs"
        keywords="tarifs factourati, logiciel facturation maroc prix, ERP maroc tarif, abonnement factourati"
        image={BRAND_LOGO_URL}
        type="website"
        schema={schema}
      />

      <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-teal-900 py-16 text-white lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-200">Tarifs Factourati</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
              Des prix simples pour digitaliser la gestion de votre entreprise au Maroc
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              Choisissez une formule claire pour centraliser vos devis, factures, paiements, stock et suivi client
              dans une seule plateforme.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.key}
                className={`rounded-[1.75rem] border p-8 shadow-sm ${
                  plan.highlight ? 'border-teal-300 bg-white shadow-xl' : 'border-slate-200 bg-white'
                }`}
              >
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">{plan.name}</p>
                <div className="mt-5 text-4xl font-bold text-slate-900">{plan.price} DH</div>
                <p className="mt-2 text-sm text-slate-500">{plan.label}</p>
                {plan.highlight && (
                  <p className="mt-3 inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                    Offre la plus equilibree
                  </p>
                )}
                <ul className="mt-8 space-y-3">
                  {features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm leading-7 text-slate-700">
                      <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-teal-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login?mode=register"
                  className={`mt-8 inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition ${
                    plan.highlight
                      ? 'bg-teal-600 text-white hover:bg-teal-700'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  Commencer maintenant
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-12 rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Avant de choisir</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">Consultez aussi nos autres pages utiles</h2>
            <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
              Pour mieux comparer l offre Factourati, vous pouvez lire notre FAQ ou consulter les guides blog sur la
              facturation, le stock, l ERP et la gestion des PME marocaines.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/faq"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
              >
                Lire la FAQ
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
              >
                Voir le blog
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicSiteChrome>
  );
}

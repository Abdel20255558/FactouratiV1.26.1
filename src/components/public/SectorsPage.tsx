import { ArrowRight, Building2, CheckCircle2, Cog, Grid2x2, Megaphone, Monitor, Package, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicSiteChrome from './PublicSiteChrome';
import SeoHead from '../seo/SeoHead';
import {
  DEFAULT_OG_IMAGE,
  SITE_URL,
  createBreadcrumbSchema,
  createLocalBusinessSchema,
  createOrganizationSchema,
  createSiteNavigationSchema,
  createWebPageSchema,
  createWebsiteSchema,
} from '../../data/publicSeoData';

const sectors = [
  {
    name: 'BTP et chantiers',
    icon: Building2,
    description: 'Suivez les devis, factures, achats fournisseurs, projets et avancement de chantier dans une seule interface.',
    keywords: ['devis BTP Maroc', 'facturation chantier', 'gestion projet BTP'],
  },
  {
    name: 'Distribution et grossistes',
    icon: Truck,
    description: 'Pilotez les ventes, les commandes, les fournisseurs, les paiements et les marges par client ou produit.',
    keywords: ['ERP distribution Maroc', 'gestion grossiste', 'suivi commandes'],
  },
  {
    name: 'E-commerce et vente en ligne',
    icon: Monitor,
    description: 'Centralisez les produits, le stock, les factures clients et les rapports de ventes pour mieux organiser votre activite.',
    keywords: ['gestion stock ecommerce Maroc', 'facture ecommerce', 'catalogue produits'],
  },
  {
    name: 'Industrie et production',
    icon: Cog,
    description: 'Structurez les achats, les mouvements de stock, les fournisseurs et les documents commerciaux de votre atelier.',
    keywords: ['ERP industrie Maroc', 'stock production', 'fournisseurs industrie'],
  },
  {
    name: 'Communication et services',
    icon: Megaphone,
    description: 'Transformez vos devis en factures, suivez les paiements et gardez un historique clair par client.',
    keywords: ['facturation agence Maroc', 'devis service', 'suivi client'],
  },
  {
    name: 'Commerce et autres PME',
    icon: Grid2x2,
    description: 'Une solution souple pour les commerces, prestataires, importateurs et PME qui veulent digitaliser leur gestion.',
    keywords: ['logiciel PME Maroc', 'gestion entreprise Maroc', 'facturation commerciale'],
  },
] as const;

const sectorSeoGuides = [
  {
    title: 'Logiciel de facturation pour BTP et chantiers au Maroc',
    body: 'Les entreprises BTP doivent suivre les devis, les achats, les avances, les situations de chantier et les factures clients. Factourati aide a garder une trace claire des documents commerciaux et des projets pour eviter les informations dispersees entre Excel, WhatsApp et dossiers PDF.',
    link: '/blog/guide-complet-facturation-maroc',
    linkLabel: 'Lire le guide facturation',
  },
  {
    title: 'ERP pour distribution, commerce et grossistes',
    body: 'Pour un distributeur ou un commerce, la priorite est de connaitre les ventes, les produits, les commandes, les fournisseurs et les paiements. Un outil centralise permet de mieux suivre les marges, les ruptures de stock et les clients qui doivent encore regler.',
    link: '/modules',
    linkLabel: 'Voir les modules',
  },
  {
    title: 'Gestion pour services, agences et independants',
    body: 'Les prestataires de services ont besoin de transformer rapidement une demande client en devis, puis en facture. Factourati aide a professionnaliser les documents, suivre les relances et garder un historique par client pour mieux piloter l activite.',
    link: '/generateur-facture',
    linkLabel: 'Tester une facture gratuite',
  },
];

export default function SectorsPage() {
  const pageUrl = `${SITE_URL}/secteurs`;
  const pageDescription =
    'Decouvrez les secteurs couverts par Factourati : BTP, distribution, e-commerce, industrie, communication, services et PME au Maroc.';
  const schema = [
    createOrganizationSchema(),
    createLocalBusinessSchema(),
    createWebsiteSchema(),
    createSiteNavigationSchema(),
    createBreadcrumbSchema([
      { name: 'Accueil', url: SITE_URL },
      { name: 'Secteurs', url: pageUrl },
    ]),
    createWebPageSchema({
      name: 'Secteurs Factourati | Logiciel de gestion pour PME au Maroc',
      path: '/secteurs',
      description: pageDescription,
    }),
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Secteurs couverts par Factourati',
      itemListElement: sectors.map((sector, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: sector.name,
        description: sector.description,
        url: pageUrl,
      })),
    },
  ];

  return (
    <PublicSiteChrome>
      <SeoHead
        title="Secteurs Factourati | ERP et facturation pour PME au Maroc"
        description={pageDescription}
        canonicalPath="/secteurs"
        keywords="secteurs factourati, logiciel BTP Maroc, ERP distribution Maroc, gestion stock ecommerce Maroc, logiciel PME Maroc"
        image={DEFAULT_OG_IMAGE}
        imageAlt="Secteurs d'activite couverts par Factourati au Maroc"
        type="website"
        schema={schema}
      />

      <section className="relative overflow-hidden bg-slate-950 py-16 text-white lg:py-24">
        <div className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-200">Secteurs d'activite</p>
            <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
              Un logiciel de facturation adapte aux PME marocaines, quel que soit votre secteur
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              Factourati accompagne les entreprises du BTP, de la distribution, du commerce, des services et de
              l'industrie avec des modules simples pour gerer les ventes, le stock, les fournisseurs et les projets.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/generateur-facture"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-teal-300"
              >
                Tester le generateur gratuit
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/modules"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 font-bold text-white transition hover:bg-white/15"
              >
                Voir les modules
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sectors.map((sector) => {
              const Icon = sector.icon;
              return (
                <article key={sector.name} className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="mt-5 text-xl font-bold text-slate-950">{sector.name}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{sector.description}</p>
                  <div className="mt-5 space-y-2">
                    {sector.keywords.map((keyword) => (
                      <p key={keyword} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <CheckCircle2 className="h-4 w-4 text-teal-600" />
                        {keyword}
                      </p>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {sectorSeoGuides.map((guide) => (
              <article key={guide.title} className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Guide secteur</p>
                <h2 className="mt-3 text-xl font-bold leading-8 text-slate-950">{guide.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{guide.body}</p>
                <Link
                  to={guide.link}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-teal-700 transition hover:text-teal-800"
                >
                  {guide.linkLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-12 rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">SEO local Maroc</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">
              Pourquoi choisir un logiciel adapte au contexte marocain ?
            </h2>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <p className="text-base leading-8 text-slate-600">
                Une PME marocaine ne cherche pas seulement a imprimer une facture. Elle veut souvent suivre l ICE du
                client, les informations legales de l entreprise, les paiements, le stock, les fournisseurs, les projets
                et les rapports dans une interface simple. C est pour cela que Factourati met la facturation au centre,
                puis connecte les autres modules autour.
              </p>
              <p className="text-base leading-8 text-slate-600">
                Cette approche convient aux activites qui veulent une solution progressive : commencer avec devis et
                factures, ajouter le suivi des produits, puis utiliser les rapports et les modules avances quand
                l entreprise grandit. Le but est de rendre la gestion quotidienne plus lisible, sans complexite inutile.
              </p>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/tarifs"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-slate-800"
              >
                Comparer les tarifs
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/faq"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
              >
                Lire la FAQ
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-12 rounded-[1.75rem] border border-teal-100 bg-white p-8 shadow-sm lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Pourquoi c'est utile</p>
                <h2 className="mt-3 text-3xl font-bold text-slate-950">Une seule base de travail pour vos clients, produits et documents</h2>
                <p className="mt-4 text-base leading-8 text-slate-600">
                  Au lieu de multiplier Excel, WhatsApp et les fichiers PDF disperses, Factourati relie vos devis,
                  factures, paiements, stock et fournisseurs pour vous donner une vision claire de votre activite.
                </p>
              </div>
              <div className="rounded-3xl bg-slate-950 p-6 text-white">
                <Package className="h-9 w-9 text-teal-300" />
                <p className="mt-4 text-2xl font-bold">BTP, commerce, services, distribution</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  Les memes bases : vendre, facturer, encaisser, suivre le stock et comprendre les chiffres.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicSiteChrome>
  );
}

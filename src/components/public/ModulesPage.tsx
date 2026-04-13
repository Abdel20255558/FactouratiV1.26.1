import { ArrowRight, BarChart3, Briefcase, Calculator, CheckCircle2, ClipboardList, FileText, FolderKanban, Package, Users } from 'lucide-react';
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

const modules = [
  {
    name: 'Devis professionnels',
    icon: ClipboardList,
    description: 'Creez des devis clairs, dupliquez vos documents et transformez un devis accepte en facture.',
    features: ['Numerotation claire', 'Conditions et validite', 'Conversion en facture'],
  },
  {
    name: 'Facturation',
    icon: FileText,
    description: 'Preparez vos factures avec les informations utiles pour les entreprises marocaines.',
    features: ['PDF professionnel', 'ICE, IF, RC, TVA', 'Suivi des factures'],
  },
  {
    name: 'Gestion financiere',
    icon: Calculator,
    description: 'Suivez les montants payes, impayes, restes a payer et balances clients ou fournisseurs.',
    features: ['Paiements', 'Retards', 'Tresorerie'],
  },
  {
    name: 'Stock et produits',
    icon: Package,
    description: 'Centralisez vos produits, quantites, prix et mouvements de stock pour eviter les ruptures.',
    features: ['Produits', 'Mouvements', 'Alertes de stock'],
  },
  {
    name: 'Fournisseurs',
    icon: Briefcase,
    description: 'Gardez une fiche claire par fournisseur avec achats, paiements et reste a payer.',
    features: ['Contacts', 'Produits achetes', 'Balance fournisseur'],
  },
  {
    name: 'Projets',
    icon: FolderKanban,
    description: 'Organisez les taches, budgets, responsables et avancement de vos projets.',
    features: ['Taches', 'Deadlines', 'Budget projet'],
  },
  {
    name: 'Ressources humaines',
    icon: Users,
    description: 'Structurez les fiches employes, les roles et le suivi RH selon vos besoins.',
    features: ['Employes', 'Conges', 'Permissions'],
  },
  {
    name: 'Rapports et analyses',
    icon: BarChart3,
    description: 'Visualisez les ventes, clients, fournisseurs, paiements et indicateurs importants.',
    features: ['Top clients', 'Exports', 'Pilotage PME'],
  },
] as const;

export default function ModulesPage() {
  const pageUrl = `${SITE_URL}/modules`;
  const pageDescription =
    'Decouvrez les modules Factourati : devis, facturation, paiements, stock, fournisseurs, projets, RH et rapports pour les PME au Maroc.';
  const schema = [
    createOrganizationSchema(),
    createLocalBusinessSchema(),
    createWebsiteSchema(),
    createSiteNavigationSchema(),
    createBreadcrumbSchema([
      { name: 'Accueil', url: SITE_URL },
      { name: 'Modules', url: pageUrl },
    ]),
    createWebPageSchema({
      name: 'Modules Factourati | Devis, factures, stock, fournisseurs et projets',
      path: '/modules',
      description: pageDescription,
    }),
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Modules du logiciel Factourati',
      itemListElement: modules.map((module, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: module.name,
        description: module.description,
        url: pageUrl,
      })),
    },
  ];

  return (
    <PublicSiteChrome>
      <SeoHead
        title="Modules Factourati | Devis, factures, stock et gestion PME"
        description={pageDescription}
        canonicalPath="/modules"
        keywords="modules factourati, logiciel devis facture Maroc, gestion stock Maroc, fournisseurs projets PME, ERP Maroc"
        image={DEFAULT_OG_IMAGE}
        imageAlt="Modules de gestion Factourati pour PME marocaines"
        type="website"
        schema={schema}
      />

      <section className="bg-gradient-to-br from-teal-50 via-white to-slate-100 py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_0.75fr] lg:px-8 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-700">Modules Factourati</p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
              Tous les modules essentiels pour gerer une PME au Maroc
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              Factourati regroupe devis, factures, paiements, stock, fournisseurs, projets, RH et rapports dans un
              espace unique pour travailler plus vite et garder une gestion propre.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/tarifs"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-slate-800"
              >
                Voir les tarifs
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login?mode=register"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-bold text-white transition hover:bg-teal-700"
              >
                Essai 1 mois gratuit
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
            <div className="grid grid-cols-2 gap-3">
              {modules.slice(0, 6).map((module) => {
                const Icon = module.icon;
                return (
                  <div key={module.name} className="rounded-2xl bg-slate-50 p-4">
                    <Icon className="h-6 w-6 text-teal-700" />
                    <p className="mt-3 text-sm font-bold text-slate-900">{module.name}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-700">Fonctionnalites</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">Des modules connectes entre eux</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Chaque module aide votre entreprise a eviter la double saisie : un devis peut devenir facture, une vente
              peut impacter les rapports, et les fournisseurs restent lies au stock.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <article key={module.name} className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-1 hover:bg-white hover:shadow-xl">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-slate-950">{module.name}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{module.description}</p>
                  <div className="mt-5 space-y-2">
                    {module.features.map((feature) => (
                      <p key={feature} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <CheckCircle2 className="h-4 w-4 text-teal-600" />
                        {feature}
                      </p>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-12 rounded-[1.75rem] bg-slate-950 p-8 text-white shadow-xl lg:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-300">Demarrer simplement</p>
                <h2 className="mt-3 text-3xl font-bold">Testez d'abord le generateur gratuit, puis passez au compte complet</h2>
                <p className="mt-4 text-slate-300">
                  Le generateur permet d'imprimer une facture gratuitement. Le compte Factourati ajoute la sauvegarde,
                  les templates Pro et les modules complets.
                </p>
              </div>
              <Link
                to="/generateur-facture"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-slate-950 transition hover:bg-slate-100"
              >
                Ouvrir le generateur
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicSiteChrome>
  );
}

import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicSiteChrome from '../public/PublicSiteChrome';
import SeoHead from '../seo/SeoHead';
import { SITE_URL, createBreadcrumbSchema } from '../../data/publicSeoData';

const keywords = [
  'ERP pour PME marocaines',
  'avantages ERP PME',
  'logiciel ERP Maroc',
  'ERP gestion entreprise Maroc',
  'ERP facturation stock clients',
  'solution ERP PME Maroc',
  'digitalisation PME marocaines',
  'logiciel gestion PME Maroc',
];

const schema = [
  createBreadcrumbSchema([
    { name: 'Accueil', url: SITE_URL },
    { name: 'Blog', url: `${SITE_URL}/blog` },
    { name: 'ERP', url: `${SITE_URL}/blog/categorie/erp` },
    { name: "Avantages d'un ERP pour PME marocaines", url: `${SITE_URL}/blog/avantages-erp-pme-marocaines` },
  ]),
];

const sections = [
  {
    heading: "Qu'est-ce qu'un ERP exactement",
    paragraphs: [
      "Aujourd'hui, les PME marocaines doivent aller vite, rester organisees et garder une bonne visibilite sur leur activite. Quand les informations sont dispersees entre plusieurs fichiers ou plusieurs outils, la gestion devient plus lente, plus compliquee et plus risquee.",
      "Un ERP permet de reunir plusieurs fonctions de l'entreprise dans un meme systeme. Au lieu d'avoir un outil pour la facturation, un autre pour le stock, un autre pour les clients ou les projets, l'ERP centralise l'information et relie les processus.",
      "Pour une PME, cela veut dire une chose tres simple: au lieu de subir une gestion fragmentee, elle peut travailler avec une vision plus claire, plus coherente et plus facile a suivre.",
    ],
  },
  {
    heading: 'Pourquoi les PME marocaines ont interet a adopter un ERP',
    paragraphs: [
      "La realite d'une PME, c'est souvent une equipe reduite, beaucoup d'operations quotidiennes et peu de temps a perdre. Les dirigeants doivent gerer a la fois les ventes, les devis, les factures, les paiements, les relances, les stocks, les achats et parfois meme les projets.",
      "Dans ce cadre, un ERP repond a un besoin concret: mieux gerer son entreprise avec moins de friction, plus de clarte et une meilleure capacite a suivre l'activite.",
    ],
  },
  {
    heading: 'Premier avantage : centraliser toute la gestion dans un seul outil',
    paragraphs: [
      "Le plus grand avantage d'un ERP pour une PME marocaine, c'est la centralisation. Quand tout est reuni dans un meme espace, il devient plus simple de suivre l'activite.",
      "Avec une solution comme Factourati, cette logique peut couvrir plusieurs besoins importants: devis, factures, clients, fournisseurs, stock, produits, commandes, projets et suivi global de l'activite.",
    ],
    bullets: [
      'devis',
      'factures',
      'clients',
      'fournisseurs',
      'stock',
      'produits',
      'commandes',
      'projets',
    ],
  },
  {
    heading: 'Deuxieme avantage : gagner du temps au quotidien',
    paragraphs: [
      "Beaucoup de PME perdent un temps enorme sur des taches repetitives: ressaisir les informations client, chercher une facture, verifier un paiement, confirmer un stock ou retrouver une commande.",
      "Un ERP permet de reduire ces pertes de temps en reliant les operations. Les donnees entrees une fois peuvent etre reutilisees dans plusieurs parties du systeme.",
    ],
  },
  {
    heading: "Troisieme avantage : ameliorer la visibilite sur l'entreprise",
    paragraphs: [
      "Quand un dirigeant n'a pas une vision claire de ce qui se passe, il prend ses decisions trop tard ou avec de mauvaises informations. Un bon ERP ameliore cette visibilite.",
      "Concretement, l'entreprise peut mieux voir les ventes en cours, les factures emises, les paiements recus, les retards a relancer, les produits en stock faible, les commandes en cours et l'evolution globale de l'activite.",
    ],
  },
  {
    heading: 'Quatrieme avantage : mieux gerer la facturation et les relances',
    paragraphs: [
      "Pour beaucoup de PME marocaines, la facturation reste une zone sensible. Une facture oubliee, mal suivie ou non relancee peut impacter directement la tresorerie.",
      "Avec un ERP, la facturation n'est plus isolee. Elle s'integre dans une chaine complete: devis, validation, facture, suivi, paiement et relance.",
    ],
  },
  {
    heading: 'Cinquieme avantage : mieux suivre le stock et les produits',
    paragraphs: [
      "Le stock est souvent l'un des premiers domaines ou une PME ressent le besoin d'un ERP. Lorsqu'il n'y a pas de systeme clair, on finit vite par perdre la visibilite sur les quantites, les seuils minimums, les sorties et les reapprovisionnements.",
      "Avec Factourati, la presence d'un tableau produits, d'alertes de stock, d'un stock restant, d'un stock rectifie et d'un suivi des commandes donne deja une base tres utile pour une PME qui veut mieux organiser sa gestion produit.",
    ],
  },
  {
    heading: 'Sixieme avantage : reduire les erreurs',
    paragraphs: [
      "Quand une entreprise travaille avec plusieurs fichiers Excel, des notes separees, des messages WhatsApp et plusieurs outils non connectes, les erreurs sont presque inevitables.",
      "Un ERP reduit ce risque grace a une base de donnees commune, moins de ressaisie, des informations coherentes, des statuts plus clairs et une meilleure tracabilite.",
    ],
  },
  {
    heading: 'Septieme avantage : mieux piloter la croissance',
    paragraphs: [
      "Une petite structure peut parfois fonctionner sans ERP pendant un moment. Mais des que l'activite grandit, les limites apparaissent vite: plus de clients, plus de factures, plus de produits, plus de commandes et plus de complexite.",
      "Un bon ERP ne sert pas seulement a resoudre les problemes d'aujourd'hui. Il prepare aussi l'entreprise a demain.",
    ],
  },
  {
    heading: 'Huitieme avantage : mieux collaborer entre les equipes',
    paragraphs: [
      "Quand chaque personne travaille avec sa propre methode, l'entreprise perd en fluidite. Le commercial a une information, l'administratif une autre, le responsable stock une autre encore.",
      "Avec un ERP, les equipes travaillent davantage sur une base commune. Les informations sont plus accessibles, plus coherentes et plus faciles a partager.",
    ],
  },
  {
    heading: 'Pourquoi Factourati est interessant pour une PME marocaine',
    paragraphs: [
      "Pour une PME marocaine, un ERP n'a pas besoin d'etre complique pour etre utile. La vraie valeur vient d'une solution simple, claire et adaptee au quotidien de l'entreprise.",
      "Factourati peut justement jouer ce role en reunissant les devis, factures, clients, fournisseurs, produits, stock, commandes et projets dans un meme environnement.",
    ],
  },
];

const faqItems = [
  {
    question: "Qu'est-ce qu'un ERP pour une PME ?",
    answer:
      "Un ERP est un logiciel de gestion d'entreprise qui centralise plusieurs fonctions dans un seul systeme, avec des donnees et des processus integres.",
  },
  {
    question: 'Pourquoi une PME marocaine a-t-elle besoin d’un ERP ?',
    answer:
      "Parce qu'un ERP aide a mieux organiser les ventes, la facturation, le stock, les clients et les operations quotidiennes dans une logique plus simple et plus fluide.",
  },
  {
    question: "Quels sont les avantages d'un ERP ?",
    answer:
      'Les principaux avantages sont la centralisation des donnees, le gain de temps, une meilleure visibilite, moins d erreurs, un meilleur suivi des operations et une meilleure capacite a accompagner la croissance.',
  },
  {
    question: 'Factourati peut-il aider comme ERP pour PME ?',
    answer:
      'Oui. Factourati regroupe plusieurs fonctions utiles a la PME comme les devis, factures, clients, stock, produits, commandes et projets dans une logique de gestion unifiee.',
  },
];

export default function GuideErpArticle() {
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: "Avantages d'un ERP pour PME marocaines",
    description:
      'Découvrez les avantages d’un ERP pour les PME marocaines : gain de temps, meilleure organisation, suivi du stock, facturation et pilotage simplifié avec Factourati.',
    image: [
      `${SITE_URL}/blog-assets/facturation-dashboard1.PNG`,
      `${SITE_URL}/blog-assets/stock.PNG`,
      `${SITE_URL}/blog-assets/facturation-process2.PNG`,
      `${SITE_URL}/blog-assets/erp-management.svg`,
    ],
    keywords: keywords.join(', '),
    mainEntityOfPage: `${SITE_URL}/blog/avantages-erp-pme-marocaines`,
    author: { '@type': 'Organization', name: 'Factourati' },
    publisher: {
      '@type': 'Organization',
      name: 'Factourati',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/files_3254075-1761082431431-image.png` },
    },
    datePublished: '2026-03-29',
    dateModified: '2026-03-29',
  };

  return (
    <PublicSiteChrome>
      <SeoHead
        title="Avantages d'un ERP pour PME marocaines | Factourati"
        description="Découvrez les avantages d’un ERP pour les PME marocaines : gain de temps, meilleure organisation, suivi du stock, facturation et pilotage simplifié avec Factourati."
        canonicalPath="/blog/avantages-erp-pme-marocaines"
        keywords={keywords.join(', ')}
        image="/blog-assets/facturation-dashboard1.PNG"
        type="article"
        schema={[...schema, articleSchema]}
      />

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-teal-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-teal-200 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Retour au blog
          </Link>
          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
            <div>
              <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-teal-100">
                ERP pour PME
              </div>
              <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-300">
                <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />29 mars 2026</span>
                <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />8 min de lecture</span>
              </div>
              <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">Avantages d'un ERP pour PME marocaines</h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
                Decouvrez comment un ERP peut aider votre PME a gagner du temps, mieux organiser ses operations et
                piloter plus clairement la facturation, le stock, les clients et l'activite.
              </p>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur">
              <img src="/blog-assets/facturation-dashboard1.PNG" alt="ERP pour PME marocaines avec Factourati" loading="eager" fetchPriority="high" decoding="async" className="h-full w-full rounded-[1.5rem] object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
          <article className="max-w-4xl">
            <div className="rounded-[1.75rem] border border-teal-100 bg-gradient-to-br from-teal-50 to-blue-50 p-7 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">En resume</h2>
              <p className="mt-4 text-base leading-8 text-gray-700">
                Un ERP aide les PME marocaines a centraliser leurs operations, gagner du temps, reduire les erreurs et
                mieux piloter leur croissance. Avec Factourati, cette logique devient plus simple a mettre en place.
              </p>
              <ul className="mt-5 space-y-3">
                <li className="flex gap-3 text-sm leading-7 text-gray-700"><CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-teal-600" />Mot-cle principal: ERP pour PME marocaines</li>
                <li className="flex gap-3 text-sm leading-7 text-gray-700"><CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-teal-600" />Focus: centralisation, productivite et pilotage</li>
                <li className="flex gap-3 text-sm leading-7 text-gray-700"><CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-teal-600" />Public: TPME et PME marocaines en croissance</li>
              </ul>
            </div>

            <div className="mt-10 space-y-10">
              {sections.slice(0, 4).map((section) => (
                <section key={section.heading} className="rounded-[1.75rem] border border-gray-200 bg-white p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900">{section.heading}</h2>
                  <div className="mt-5 space-y-4 text-base leading-8 text-gray-700">
                    {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </div>
                  {section.bullets && <ul className="mt-6 grid gap-3 md:grid-cols-2">{section.bullets.map((bullet) => <li key={bullet} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">{bullet}</li>)}</ul>}
                </section>
              ))}

              <figure className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-sm">
                <img src="/blog-assets/stock.PNG" alt="gestion de stock dans un ERP pour PME" loading="lazy" decoding="async" className="w-full object-cover" />
              </figure>

              {sections.slice(4, 7).map((section) => (
                <section key={section.heading} className="rounded-[1.75rem] border border-gray-200 bg-white p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900">{section.heading}</h2>
                  <div className="mt-5 space-y-4 text-base leading-8 text-gray-700">
                    {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </div>
                </section>
              ))}

              <figure className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-sm">
                <img src="/blog-assets/facturation-process2.PNG" alt="logiciel ERP facturation devis Maroc" loading="lazy" decoding="async" className="w-full object-cover" />
              </figure>

              {sections.slice(7, 9).map((section) => (
                <section key={section.heading} className="rounded-[1.75rem] border border-gray-200 bg-white p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900">{section.heading}</h2>
                  <div className="mt-5 space-y-4 text-base leading-8 text-gray-700">
                    {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </div>
                </section>
              ))}

              <figure className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-sm">
                <img src="/blog-assets/erp-management.svg" alt="gestion d entreprise avec ERP au Maroc" loading="lazy" decoding="async" className="w-full object-cover" />
              </figure>

              {sections.slice(9).map((section) => (
                <section key={section.heading} className="rounded-[1.75rem] border border-gray-200 bg-white p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900">{section.heading}</h2>
                  <div className="mt-5 space-y-4 text-base leading-8 text-gray-700">
                    {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </div>
                </section>
              ))}

              <section className="rounded-[1.75rem] border border-teal-100 bg-gradient-to-br from-white to-teal-50 p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900">FAQ SEO a ajouter en bas de page</h2>
                <div className="mt-6 space-y-4">
                  {faqItems.map((item) => (
                    <details key={item.question} className="rounded-2xl border border-gray-200 bg-white p-5">
                      <summary className="cursor-pointer text-base font-semibold text-gray-900">{item.question}</summary>
                      <p className="mt-3 text-sm leading-7 text-gray-700">{item.answer}</p>
                    </details>
                  ))}
                </div>
              </section>

              <section className="rounded-[1.75rem] bg-gray-900 p-8 text-white shadow-xl">
                <h2 className="text-2xl font-semibold">Passez a une gestion plus simple avec Factourati</h2>
                <p className="mt-3 max-w-2xl text-slate-300">
                  Centralisez vos devis, factures, stock, clients et suivi d'activite dans une solution pensee pour les
                  PME marocaines.
                </p>
                <Link to="/login?mode=register" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-gray-900 transition hover:bg-gray-100">
                  Essayer Factourati gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </section>
            </div>
          </article>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-[1.75rem] border border-gray-200 bg-gray-50 p-6">
              <h2 className="text-lg font-semibold text-gray-900">Pack SEO pret</h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-gray-700">
                <div><p className="font-semibold text-gray-900">Slug</p><p>/avantages-erp-pme-marocaines</p></div>
                <div><p className="font-semibold text-gray-900">Mot-cle principal</p><p>ERP pour PME marocaines</p></div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {keywords.map((keyword) => <span key={keyword} className="rounded-full bg-white px-3 py-2 text-sm text-gray-700 shadow-sm">{keyword}</span>)}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </PublicSiteChrome>
  );
}

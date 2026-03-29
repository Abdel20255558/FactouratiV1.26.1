import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicSiteChrome from '../public/PublicSiteChrome';
import SeoHead from '../seo/SeoHead';
import { SITE_URL, createBreadcrumbSchema } from '../../data/publicSeoData';

const keywords = [
  'conformite fiscale au Maroc',
  'conformite fiscale Maroc PME',
  'logiciel de facturation Maroc conforme',
  'facture conforme Maroc',
  'ICE sur facture Maroc',
  'gestion fiscale entreprise Maroc',
  'organisation fiscale PME Maroc',
  'teledeclaration Maroc',
  'Factourati conformite fiscale',
];

const schema = [
  createBreadcrumbSchema([
    { name: 'Accueil', url: SITE_URL },
    { name: 'Blog', url: `${SITE_URL}/blog` },
    { name: 'Fiscalite', url: `${SITE_URL}/blog/categorie/fiscalite` },
    { name: 'Conformite fiscale au Maroc avec Factourati', url: `${SITE_URL}/blog/conformite-fiscale-maroc-factourati` },
  ]),
];

const sections = [
  {
    heading: 'Pourquoi la conformite fiscale est si importante',
    paragraphs: [
      "Pour une PME marocaine, la conformite fiscale ne se resume pas a payer ses impots. Elle commence bien avant, dans la maniere d'organiser les informations de l'entreprise, de preparer les documents commerciaux, de suivre les ventes, de conserver les pieces justificatives et de garder des donnees coherentes.",
      "Une entreprise conforme fiscalement inspire plus confiance, limite les risques d'erreurs et facilite les echanges avec le comptable, l'administration et les partenaires.",
      "Factourati peut aider l'entreprise a travailler plus proprement, plus clairement et avec une meilleure base documentaire pour la gestion fiscale, sans remplacer un comptable ou un conseiller fiscal.",
    ],
  },
  {
    heading: "Qu'est-ce qu'une entreprise doit bien organiser fiscalement",
    paragraphs: [
      "La conformite fiscale d'une PME commence par une gestion propre de ses donnees. Dans la pratique, cela veut dire qu'une entreprise doit pouvoir retrouver facilement ses devis, ses factures, ses paiements, ses informations clients, ses informations produits ou services, ses justificatifs, ses exports et ses historiques.",
      "Quand tout cela est centralise dans un seul outil, la gestion devient beaucoup plus simple.",
    ],
    bullets: [
      'devis',
      'factures',
      'paiements',
      'informations clients',
      'produits ou services',
      'justificatifs',
      'exports et historiques',
    ],
  },
  {
    heading: 'L importance des informations legales sur les documents',
    paragraphs: [
      "Au Maroc, certaines informations d'identification de l'entreprise ont une vraie importance dans les documents officiels. Pour une entreprise, cela veut dire qu'il est essentiel de bien renseigner ses informations dans son outil de gestion.",
      "Quand ces donnees sont bien enregistrees dans Factourati, elles peuvent etre reutilisees proprement dans les devis, factures et autres documents commerciaux. Cela reduit les oublis et ameliore la coherence des pieces emises.",
    ],
    bullets: ['raison sociale', 'ICE', 'IF', 'RC', 'adresse', 'coordonnees utiles', 'informations de TVA selon le cas'],
  },
  {
    heading: 'Pourquoi la facture joue un role central dans la conformite',
    paragraphs: [
      "La facture est un document cle. Elle ne sert pas seulement a demander un paiement. Elle fait aussi partie de la structure documentaire que l'entreprise doit maitriser.",
      "Dans la pratique, cela signifie qu'une facture doit etre claire, bien numerotee, coherente avec l'operation, reliee au bon client, archivable et facile a retrouver.",
    ],
  },
  {
    heading: 'Comment Factourati aide a mieux structurer la facturation',
    paragraphs: [
      "Factourati aide l'entreprise a structurer sa facturation en centralisant plusieurs elements importants dans une seule logique: creation des devis, transformation en facture, suivi des statuts, historique des documents, organisation des clients, export et consultation des pieces, suivi des paiements et relances.",
      "Cette centralisation aide beaucoup sur le plan fiscal et administratif, parce qu'elle evite la dispersion des informations.",
    ],
  },
  {
    heading: 'Le role du suivi des paiements dans la conformite',
    paragraphs: [
      "Une facture emise mais mal suivie devient vite un probleme de gestion. Une entreprise doit savoir ce qui a ete facture, ce qui a ete paye, ce qui reste a encaisser et ce qui doit etre relance.",
      "Dans cette logique, Factourati peut aider a preparer un environnement de gestion plus propre grace a des statuts de facture clairs, au suivi des echeances, a l'historique des reglements et a la distinction entre paye, non paye, encaisse, brouillon ou envoye.",
    ],
  },
  {
    heading: "L'interet de conserver des donnees propres et accessibles",
    paragraphs: [
      "La conformite fiscale ne depend pas seulement du document emis aujourd'hui. Elle depend aussi de la capacite de l'entreprise a retrouver demain les bonnes informations.",
      "Quand vos donnees sont bien classees dans un logiciel, vous gagnez sur plusieurs plans: moins de perte d'information, acces plus rapide a l'historique, meilleure preparation des dossiers, meilleure collaboration avec le comptable et moins de stress en cas de verification documentaire.",
    ],
  },
  {
    heading: 'Factourati et la preparation des exports utiles',
    paragraphs: [
      "La conformite fiscale repose souvent sur la qualite des informations transmises au comptable ou utilisees pour les declarations. Plus vos donnees sont propres, plus ce travail devient simple.",
      "Factourati peut jouer un role utile en amont: garder des factures bien structurees, centraliser les informations clients, garder des montants coherents, suivre les reglements, produire des exports propres et aider a limiter les erreurs de ressaisie.",
    ],
  },
  {
    heading: 'Pourquoi la digitalisation renforce la conformite',
    paragraphs: [
      "Une entreprise digitalisee peut travailler plus vite, securiser davantage ses donnees, limiter les erreurs manuelles, mieux classer les documents, collaborer plus facilement avec son expert-comptable et garder une meilleure tracabilite.",
      "Factourati s'inscrit bien dans cette logique, surtout pour les PME qui veulent une solution marocaine simple a utiliser.",
    ],
  },
  {
    heading: 'Les erreurs frequentes qui nuisent a la conformite fiscale',
    paragraphs: [
      "Beaucoup d'entreprises ne rencontrent pas un probleme fiscal parce qu'elles veulent frauder. Elles rencontrent des problemes parce qu'elles sont mal organisees.",
    ],
    bullets: [
      'informations legales incompletes',
      'factures dispersees',
      'documents introuvables',
      'mauvais suivi des paiements',
      'doublons de donnees',
      'oublis dans la numerotation',
      "absence d'archivage propre",
    ],
  },
  {
    heading: 'Comment Factourati aide concretement une PME marocaine',
    paragraphs: [
      "Pour une PME marocaine, Factourati peut aider concretement a travers plusieurs points: centraliser les devis et factures, enregistrer les bonnes informations d'entreprise, suivre les paiements, relancer les impayes, garder un historique clair, consulter rapidement les documents, organiser les clients et produits et travailler sur une base plus fiable.",
      "Cette logique ne remplace pas la comptabilite ou le conseil fiscal, mais elle ameliore enormement la qualite de la gestion quotidienne.",
    ],
  },
];

const faqItems = [
  {
    question: "Qu'est-ce que la conformite fiscale au Maroc ?",
    answer:
      "La conformite fiscale correspond au respect des obligations fiscales de l'entreprise : bonne organisation des documents, donnees coherentes, facturation structuree, conservation des pieces et respect des demarches liees aux impots comme l'IR, l'IS ou la TVA.",
  },
  {
    question: "L'ICE est-il obligatoire sur les documents de l'entreprise ?",
    answer:
      "Oui. L'ICE doit figurer sur les documents officiels de l'entreprise, ce qui rend son bon renseignement dans l'outil de gestion tres important.",
  },
  {
    question: 'Pourquoi un logiciel aide-t-il a la conformite fiscale ?',
    answer:
      "Parce qu'il permet de centraliser les informations, mieux structurer les factures, suivre les paiements, garder l'historique et limiter les erreurs de saisie.",
  },
  {
    question: 'Factourati remplace-t-il un comptable ?',
    answer:
      "Non. Factourati aide a mieux organiser la gestion commerciale et documentaire, mais il ne remplace pas un expert-comptable ou un conseiller fiscal.",
  },
];

export default function GuideFiscalArticle() {
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: 'Conformite fiscale au Maroc avec Factourati',
    description:
      'Découvrez comment mieux organiser votre conformité fiscale au Maroc avec Factourati : factures, ICE, suivi des paiements, documents et gestion plus structurée.',
    image: [
      'https://www.factourati.com/blog-assets/1.PNG',
      'https://www.factourati.com/blog-assets/2.PNG',
      'https://www.factourati.com/blog-assets/3.PNG',
      'https://www.factourati.com/blog-assets/4.PNG',
    ],
    keywords: keywords.join(', '),
    mainEntityOfPage: 'https://www.factourati.com/blog/conformite-fiscale-maroc-factourati',
    author: { '@type': 'Organization', name: 'Factourati' },
    publisher: {
      '@type': 'Organization',
      name: 'Factourati',
      logo: { '@type': 'ImageObject', url: 'https://www.factourati.com/files_3254075-1761082431431-image.png' },
    },
    datePublished: '2026-03-29',
    dateModified: '2026-03-29',
  };

  return (
    <PublicSiteChrome>
      <SeoHead
        title="Conformite fiscale au Maroc avec Factourati | Guide PME"
        description="Découvrez comment mieux organiser votre conformité fiscale au Maroc avec Factourati : factures, ICE, suivi des paiements, documents et gestion plus structurée."
        canonicalPath="/blog/conformite-fiscale-maroc-factourati"
        keywords={keywords.join(', ')}
        image="/blog-assets/1.PNG"
        type="article"
        schema={schema}
      />
      <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-teal-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-teal-200 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Retour au blog
          </Link>
          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
            <div>
              <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-teal-100">
                Conformite fiscale
              </div>
              <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-300">
                <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />29 mars 2026</span>
                <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />8 min de lecture</span>
              </div>
              <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">Conformite fiscale au Maroc avec Factourati</h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
                Decouvrez comment mieux organiser vos factures, vos informations d'entreprise, vos paiements et vos
                documents pour travailler d'une maniere plus propre fiscalement et administrativement.
              </p>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur">
              <img src="/blog-assets/1.PNG" alt="facture conforme au Maroc avec Factourati" loading="eager" fetchPriority="high" decoding="async" className="h-full w-full rounded-[1.5rem] object-cover" />
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
                Factourati peut aider la PME marocaine a mieux organiser ses devis, factures, paiements, donnees
                clients et documents pour travailler plus proprement sur le plan fiscal et administratif. Cela ne
                remplace pas un comptable ou un conseiller fiscal, mais cela ameliore fortement la base de travail.
              </p>
              <ul className="mt-5 space-y-3">
                <li className="flex gap-3 text-sm leading-7 text-gray-700"><CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-teal-600" />Mot-cle principal: conformite fiscale au Maroc</li>
                <li className="flex gap-3 text-sm leading-7 text-gray-700"><CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-teal-600" />Focus: factures, ICE, paiements et documents</li>
                <li className="flex gap-3 text-sm leading-7 text-gray-700"><CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-teal-600" />Public: PME marocaines en recherche d une gestion plus propre</li>
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
                <img src="/blog-assets/2.PNG" alt="informations fiscales entreprise dans Factourati" loading="lazy" decoding="async" className="w-full object-cover" />
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
                <img src="/blog-assets/3.PNG" alt="suivi des factures et paiements avec Factourati" loading="lazy" decoding="async" className="w-full object-cover" />
              </figure>

              {sections.slice(7).map((section) => (
                <section key={section.heading} className="rounded-[1.75rem] border border-gray-200 bg-white p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900">{section.heading}</h2>
                  <div className="mt-5 space-y-4 text-base leading-8 text-gray-700">
                    {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </div>
                  {section.bullets && <ul className="mt-6 grid gap-3 md:grid-cols-2">{section.bullets.map((bullet) => <li key={bullet} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">{bullet}</li>)}</ul>}
                </section>
              ))}

              <figure className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-sm">
                <img src="/blog-assets/4.PNG" alt="logiciel de facturation pour conformite fiscale au Maroc" loading="lazy" decoding="async" className="w-full object-cover" />
              </figure>

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
                <h2 className="text-2xl font-semibold">Mettez de l'ordre dans votre gestion avec Factourati</h2>
                <p className="mt-3 max-w-2xl text-slate-300">
                  Centralisez vos devis, factures, paiements, clients et documents dans une solution pensee pour aider
                  les PME marocaines a travailler plus proprement et plus sereinement.
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
                <div><p className="font-semibold text-gray-900">Slug</p><p>/conformite-fiscale-maroc-factourati</p></div>
                <div><p className="font-semibold text-gray-900">Mot-cle principal</p><p>conformite fiscale au Maroc</p></div>
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

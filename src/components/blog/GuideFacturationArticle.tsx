import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicSiteChrome from '../public/PublicSiteChrome';
import SeoHead from '../seo/SeoHead';

const keywords = [
  'facturation au Maroc',
  'guide facturation Maroc',
  'logiciel de facturation Maroc',
  'facture Maroc PME',
  'gestion des factures Maroc',
  'devis et factures Maroc',
  'facture conforme Maroc',
  'relance facture Maroc',
  'suivi paiement client Maroc',
];

const sections = [
  {
    heading: 'Pourquoi la facturation est essentielle pour une entreprise au Maroc',
    paragraphs: [
      "La facturation au Maroc ne consiste pas seulement a envoyer un document a un client. Une bonne facture permet de mieux suivre son activite, de securiser ses ventes, de relancer plus facilement les paiements et de garder une organisation claire au quotidien.",
      "Quand la facturation est mal organisee, les problemes arrivent vite: factures perdues, paiements en retard, erreurs de montant, difficultes de suivi ou manque de visibilite sur la tresorerie.",
      "A l'inverse, une bonne organisation permet de savoir en temps reel quelles factures sont envoyees, lesquelles sont payees, lesquelles sont en retard et quels clients doivent etre relances.",
    ],
  },
  {
    heading: "Qu'est-ce qu'une facture professionnelle au Maroc",
    paragraphs: [
      "Une facture professionnelle est un document clair, numerote, lisible et complet, qui reprend les informations essentielles de la vente ou de la prestation.",
      "En pratique, les entreprises veillent a faire apparaitre l'identite du fournisseur, les informations du client, la date, le numero de facture, le detail des produits ou services, les montants, ainsi que les identifiants usuels de l'entreprise.",
      "Au-dela de la conformite, une facture professionnelle renforce aussi votre image. Un document propre, coherent et bien presente inspire plus confiance a vos clients et reduit les echanges inutiles.",
    ],
  },
  {
    heading: 'Les elements a bien structurer sur une facture',
    paragraphs: [
      "Pour que votre facturation au Maroc soit plus efficace, chaque facture doit suivre une structure logique. Commencez par vos informations d'entreprise, puis les coordonnees du client, ensuite les informations du document, puis le detail de la vente.",
      "Le plus important n'est pas seulement d'avoir ces informations, mais de les presenter de maniere claire et constante d'une facture a l'autre.",
    ],
    bullets: [
      'un numero de facture unique',
      "une date d'emission",
      "les coordonnees de l'entreprise",
      'les coordonnees du client',
      'la designation des produits ou services',
      'les quantites',
      'les prix unitaires',
      'le total TTC',
      'les modalites de paiement',
    ],
  },
  {
    heading: 'Devis, facture, paiement et relance: un seul vrai processus',
    paragraphs: [
      "Beaucoup d'entreprises traitent encore le devis, la facture et le paiement comme des actions separees. En realite, il faut voir cela comme une seule chaine.",
      "Le bon fonctionnement ressemble a ceci: vous creez un devis, le client l'accepte, vous le transformez en facture, vous suivez le reglement, puis vous relancez si necessaire.",
      "Quand ce processus est centralise, vous savez immediatement quels devis sont acceptes, quelles factures ont ete envoyees, quelles factures sont payees et quels retards doivent etre relances.",
    ],
  },
  {
    heading: 'Comment eviter les erreurs de facturation',
    paragraphs: [
      "Les erreurs les plus frequentes sont souvent simples: mauvais montant, mauvaise date, oubli d'un article, client mal renseigne, numero duplique, TVA mal appliquee, facture envoyee sans suivi.",
      "Pour limiter ces erreurs, il faut mettre en place une methode claire: utiliser une numerotation ordonnee, garder un modele unique, renseigner correctement les fiches clients, verifier les lignes avant envoi et suivre le statut de chaque facture.",
    ],
  },
  {
    heading: 'Pourquoi digitaliser sa facturation au Maroc',
    paragraphs: [
      "Une gestion manuelle peut fonctionner quand l'activite est tres petite. Mais des que le volume augmente, les limites apparaissent: temps perdu, documents disperses, difficulte a retrouver l'historique et manque de visibilite sur les encaissements.",
      "Utiliser un logiciel de facturation au Maroc n'est plus seulement un confort: c'est un vrai levier d'organisation et de fiabilite.",
    ],
    bullets: [
      'creer rapidement des factures',
      'suivre les paiements',
      'relancer les impayes',
      'centraliser les clients',
      "garder l'historique",
      'avoir une vue claire sur l activite',
    ],
  },
  {
    heading: "L'importance de l'ICE dans vos documents",
    paragraphs: [
      "Au Maroc, l'Identifiant Commun de l'Entreprise occupe une place importante dans l'identification des societes. Pour une entreprise qui veut inspirer confiance et eviter les oublis administratifs, il est logique de l'integrer proprement dans ses modeles de devis et de factures.",
    ],
  },
  {
    heading: 'Comment mieux suivre les paiements clients',
    paragraphs: [
      "Une facture envoyee ne veut pas dire une facture payee. Il faut distinguer clairement plusieurs statuts: brouillon, envoyee, payee, non payee, partiellement reglee ou encaissee.",
      "Un bon suivi des paiements vous aide a savoir ou vous en etes avec chaque client. Vous evitez les relances au hasard et vous gagnez une meilleure visibilite sur votre tresorerie.",
    ],
    bullets: [
      "une date d'echeance",
      'un mode de paiement',
      'un statut clair',
      'un historique de relances',
      'des commentaires internes si besoin',
    ],
  },
  {
    heading: 'Les relances: une etape cle de la facturation',
    paragraphs: [
      "Relancer un client ne doit pas etre vu comme quelque chose de genant. C'est simplement une etape normale du cycle de vente. Une entreprise bien organisee relance au bon moment, avec un message clair, professionnel et respectueux.",
      "Quand vos relances sont bien suivies, vous reduisez les retards et ameliorez la regularite de vos encaissements.",
    ],
  },
  {
    heading: 'Pourquoi utiliser un logiciel comme Factourati',
    paragraphs: [
      "Un logiciel de facturation comme Factourati permet de centraliser les devis, les factures, les paiements, les relances et les informations clients dans un seul espace.",
      "Pour une PME marocaine, cela apporte plusieurs avantages concrets: gain de temps, meilleure organisation, moins d'erreurs, meilleur suivi des clients et vision plus claire de l'activite.",
    ],
  },
];

const faqItems = [
  {
    question: 'Comment faire une facture au Maroc ?',
    answer:
      "Pour faire une facture au Maroc, il faut preparer un document clair avec les informations de l'entreprise, celles du client, le detail de la vente ou de la prestation, les montants et les references utiles d'identification.",
  },
  {
    question: 'Pourquoi utiliser un logiciel de facturation au Maroc ?',
    answer:
      'Un logiciel de facturation permet de gagner du temps, limiter les erreurs, suivre les paiements et centraliser la gestion.',
  },
  {
    question: 'Quelle difference entre devis et facture ?',
    answer:
      "Le devis presente une proposition commerciale avant validation. La facture sert a formaliser la vente ou la prestation realisee et a demander le reglement.",
  },
  {
    question: 'Pourquoi suivre les relances clients ?',
    answer:
      "Parce qu'une facture envoyee n'est pas toujours une facture payee. Les relances permettent d'ameliorer les encaissements et de mieux controler la tresorerie.",
  },
];

export default function GuideFacturationArticle() {
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: 'Guide complet de facturation au Maroc',
    description:
      'Découvrez comment réussir votre facturation au Maroc : mentions utiles, organisation, paiements, relances et outils pour PME avec Factourati.',
    image: [
      'https://www.factourati.com/blog/facturation-dashboard.png',
      'https://www.factourati.com/blog/facture-exemple.svg',
      'https://www.factourati.com/blog/suivi-paiements.svg',
      'https://www.factourati.com/blog/facturation-process.png',
    ],
    keywords: keywords.join(', '),
    mainEntityOfPage: 'https://www.factourati.com/blog/guide-complet-facturation-maroc',
    author: { '@type': 'Organization', name: 'Factourati' },
    publisher: {
      '@type': 'Organization',
      name: 'Factourati',
      logo: { '@type': 'ImageObject', url: 'https://www.factourati.com/files_3254075-1761082431431-image.png' },
    },
    datePublished: '2026-03-27',
    dateModified: '2026-03-27',
  };

  return (
    <PublicSiteChrome>
      <SeoHead
        title="Guide complet de facturation au Maroc pour PME | Factourati"
        description="Découvrez comment réussir votre facturation au Maroc : mentions utiles, organisation, paiements, relances et outils pour PME avec Factourati."
        canonicalPath="/blog/guide-complet-facturation-maroc"
        keywords={keywords.join(', ')}
        image="/blog/facturation-dashboard.png"
        type="article"
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
                Facturation au Maroc
              </div>
              <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-300">
                <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />27 mars 2026</span>
                <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />9 min de lecture</span>
              </div>
              <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">Guide complet de facturation au Maroc</h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
                Decouvrez comment mieux organiser vos devis, vos factures, vos paiements et vos relances pour gagner
                du temps et piloter votre activite plus sereinement.
              </p>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur">
              <img src="/blog/facturation-dashboard.png" alt="logiciel de facturation au Maroc pour PME" className="h-full w-full rounded-[1.5rem] object-cover" />
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
                La facturation devient vite un pilier de la gestion d'entreprise pour une PME, une TPE ou un
                independant. Une bonne facture permet de mieux suivre son activite, de securiser ses ventes et de mieux
                relancer les paiements.
              </p>
              <ul className="mt-5 space-y-3">
                <li className="flex gap-3 text-sm leading-7 text-gray-700"><CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-teal-600" />Mot-cle principal: facturation au Maroc</li>
                <li className="flex gap-3 text-sm leading-7 text-gray-700"><CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-teal-600" />Focus: devis, factures, paiements et relances</li>
                <li className="flex gap-3 text-sm leading-7 text-gray-700"><CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-teal-600" />Public: PME, TPE et independants marocains</li>
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
                <img src="/blog/facture-exemple.svg" alt="exemple de facture au Maroc pour entreprise" className="w-full object-cover" />
              </figure>

              {sections.slice(4, 8).map((section) => (
                <section key={section.heading} className="rounded-[1.75rem] border border-gray-200 bg-white p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900">{section.heading}</h2>
                  <div className="mt-5 space-y-4 text-base leading-8 text-gray-700">
                    {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </div>
                  {section.bullets && <ul className="mt-6 grid gap-3 md:grid-cols-2">{section.bullets.map((bullet) => <li key={bullet} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">{bullet}</li>)}</ul>}
                </section>
              ))}

              <figure className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-sm">
                <img src="/blog/suivi-paiements.svg" alt="suivi des paiements et relances clients au Maroc" className="w-full object-cover" />
              </figure>

              {sections.slice(8).map((section) => (
                <section key={section.heading} className="rounded-[1.75rem] border border-gray-200 bg-white p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900">{section.heading}</h2>
                  <div className="mt-5 space-y-4 text-base leading-8 text-gray-700">
                    {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </div>
                </section>
              ))}

              <figure className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-sm">
                <img src="/blog/facturation-process.png" alt="gestion devis facture paiement avec Factourati" className="w-full object-cover" />
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
                <h2 className="text-2xl font-semibold">Simplifiez votre facturation avec Factourati</h2>
                <p className="mt-3 max-w-2xl text-slate-300">
                  Creez vos devis, factures, suivez vos paiements et relancez vos clients plus facilement avec une
                  solution pensee pour les entreprises marocaines.
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
                <div><p className="font-semibold text-gray-900">Slug</p><p>/guide-complet-facturation-maroc</p></div>
                <div><p className="font-semibold text-gray-900">Mot-cle principal</p><p>facturation au Maroc</p></div>
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

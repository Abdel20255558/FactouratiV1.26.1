import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicSiteChrome from '../public/PublicSiteChrome';
import SeoHead from '../seo/SeoHead';

const keywords = [
  'gerer son stock efficacement',
  'gestion de stock Maroc',
  'logiciel de stock Maroc',
  'suivi stock PME',
  'stock produit entreprise',
  'eviter rupture de stock',
  'gestion produits Factourati',
  'stock faible',
  'stock restant',
];

const sections = [
  {
    heading: 'Pourquoi une bonne gestion de stock est essentielle',
    paragraphs: [
      "La gestion de stock est l'un des points les plus importants dans une entreprise. Quand le stock est mal suivi, les problemes arrivent vite: produits manquants, ruptures, erreurs de quantite, ventes perdues, achats mal anticipes et manque de visibilite sur l'activite.",
      "A l'inverse, un stock bien organise permet de travailler plus sereinement, de mieux servir ses clients et de piloter son entreprise avec plus de precision.",
      "Avec un outil comme Factourati, la gestion de stock devient plus claire, plus visuelle et plus simple a suivre au quotidien.",
    ],
  },
  {
    heading: "Qu'est-ce qu'une gestion de stock efficace",
    paragraphs: [
      "Gerer son stock efficacement, c'est avoir une vision claire et a jour de tous les produits. Cela veut dire savoir combien vous avez en stock, connaitre le stock minimum, suivre les commandes et voir rapidement les produits en stock faible.",
      "Une gestion de stock efficace repose sur trois piliers: la visibilite, l'anticipation et la regularite.",
    ],
    bullets: [
      'savoir combien vous avez en stock',
      'connaitre le stock minimum',
      'suivre les commandes liees a chaque produit',
      'voir rapidement les produits en stock faible',
      'eviter les ruptures',
      'corriger les ecarts si necessaire',
      'garder un historique clair',
    ],
  },
  {
    heading: 'Les erreurs les plus frequentes dans la gestion de stock',
    paragraphs: [
      "Beaucoup d'entreprises rencontrent toujours les memes problemes. Les erreurs les plus courantes sont simples, mais elles ont un impact direct sur l'activite.",
    ],
    bullets: [
      'ne pas suivre le stock en temps reel',
      'ne pas definir un stock minimum',
      'separer les produits, les commandes et le suivi',
      'ne pas analyser les alertes',
      'ne pas corriger les ecarts',
    ],
  },
  {
    heading: 'Pourquoi digitaliser la gestion de stock',
    paragraphs: [
      "Une PME gagne a sortir de la gestion manuelle des que son activite commence a grandir. Un logiciel de stock permet de centraliser les produits, visualiser rapidement les niveaux de stock, reperer les alertes, suivre les commandes et reduire les erreurs humaines.",
      "Autrement dit, la digitalisation de la gestion de stock n'est pas seulement une question de confort. C'est une meilleure maniere de piloter son entreprise.",
    ],
  },
  {
    heading: 'Comment Factourati vous aide a mieux gerer votre stock',
    paragraphs: [
      "Le tableau de bord Produits de Factourati montre immediatement les indicateurs les plus importants: le nombre total de produits, le nombre de produits en stock faible, le nombre de ruptures, les commandes recentes et les alertes visibles en haut de page.",
      "Cette approche est tres utile, car elle permet de comprendre en quelques secondes la situation du stock.",
    ],
  },
  {
    heading: 'Des alertes de stock visibles',
    paragraphs: [
      "Une alerte de stock faible n'est utile que si elle est visible et traitee rapidement. Avec Factourati, le statut visuel aide a agir vite avant qu'un produit ne tombe en rupture.",
      "C'est exactement ce qu'une entreprise attend d'un bon logiciel de gestion de stock: transformer un probleme potentiel en action simple et rapide.",
    ],
  },
  {
    heading: 'Un tableau produit complet',
    paragraphs: [
      "Le tableau produits de Factourati permet de suivre le nom du produit, le prix d'achat, le prix de vente HT, le stock initial, les commandes liees au produit, le stock restant, le stock rectifie, le statut et les actions disponibles.",
      "Cette structure relie la logique commerciale a la logique operationnelle. Vous ne voyez pas seulement le produit, vous voyez aussi son mouvement et sa situation reelle.",
    ],
  },
  {
    heading: "L'importance du stock restant",
    paragraphs: [
      "Le champ stock restant est l'un des plus utiles. C'est lui qui permet de savoir ou vous en etes reellement apres les commandes enregistrees.",
      "Quand vous connaissez votre stock restant, vous prenez de meilleures decisions. Vous savez quels produits reapprovisionner, lesquels suivent une bonne rotation et lesquels approchent d'une zone de risque.",
    ],
  },
  {
    heading: 'Comment mieux organiser votre catalogue produit',
    paragraphs: [
      "Pour gerer votre stock efficacement, il ne suffit pas d'ajouter des produits. Il faut aussi structurer votre catalogue avec des noms clairs, des categories propres, des prix a jour et des seuils minimums.",
      "Dans Factourati, la barre de recherche produit facilite justement cette organisation. Quand le catalogue grandit, cette fonction devient indispensable.",
    ],
    bullets: [
      'utiliser des noms de produits clairs',
      'classer les produits par type ou categorie',
      'fixer un stock minimum',
      "garder un prix d'achat et un prix de vente a jour",
      'eviter les doublons',
      'utiliser la recherche pour retrouver vite un article',
    ],
  },
  {
    heading: 'Les avantages concrets pour une PME',
    paragraphs: [
      "Pour une PME marocaine, une bonne gestion de stock apporte des resultats tres concrets: moins de ruptures, meilleure anticipation des achats, meilleur suivi des produits, moins d'erreurs, plus de temps gagne et plus de visibilite sur l'activite.",
      "Et surtout, cela ameliore la qualite de service. Un client qui trouve le bon produit disponible au bon moment vit une meilleure experience.",
    ],
  },
];

const faqItems = [
  {
    question: 'Comment gerer son stock efficacement ?',
    answer:
      'Pour gerer son stock efficacement, il faut suivre les quantites disponibles, definir un stock minimum, surveiller les sorties, anticiper les reapprovisionnements et utiliser un outil clair pour centraliser les informations.',
  },
  {
    question: 'Pourquoi utiliser un logiciel de gestion de stock ?',
    answer:
      'Un logiciel de gestion de stock permet de gagner du temps, reduire les erreurs, suivre les produits plus facilement et reperer rapidement les alertes ou les ruptures.',
  },
  {
    question: 'Comment eviter les ruptures de stock ?',
    answer:
      'Pour eviter les ruptures de stock, il faut fixer des seuils minimums, surveiller les alertes, suivre les commandes et analyser regulierement le stock restant.',
  },
  {
    question: "Quel est l'interet de Factourati pour le stock ?",
    answer:
      "Factourati aide a suivre les produits, visualiser les stocks faibles, surveiller les commandes, consulter le stock restant et garder une gestion plus claire de l'activite.",
  },
];

export default function GuideStockArticle() {
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: 'Comment gerer votre stock efficacement',
    description:
      'Découvrez comment mieux gérer votre stock, éviter les ruptures et suivre vos produits avec une méthode simple et un logiciel comme Factourati.',
    image: [
      'https://www.factourati.com/blog-assets/stock.PNG',
      'https://www.factourati.com/blog-assets/stock-alerts.svg',
      'https://www.factourati.com/blog-assets/stock-remaining.svg',
      'https://www.factourati.com/blog-assets/stock-search.svg',
    ],
    keywords: keywords.join(', '),
    mainEntityOfPage: 'https://www.factourati.com/blog/comment-gerer-votre-stock-efficacement',
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
        title="Comment gerer votre stock efficacement au Maroc | Factourati"
        description="Découvrez comment mieux gérer votre stock, éviter les ruptures et suivre vos produits avec une méthode simple et un logiciel comme Factourati."
        canonicalPath="/blog/comment-gerer-votre-stock-efficacement"
        keywords={keywords.join(', ')}
        image="/blog-assets/stock.PNG"
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
                Gestion de stock
              </div>
              <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-300">
                <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />27 mars 2026</span>
                <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />7 min de lecture</span>
              </div>
              <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">Comment gerer votre stock efficacement</h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
                Decouvrez comment mieux suivre vos produits, eviter les ruptures et organiser votre stock avec une
                methode simple et un outil clair comme Factourati.
              </p>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur">
              <img src="/blog-assets/stock.PNG" alt="gestion de stock produits avec Factourati" className="h-full w-full rounded-[1.5rem] object-cover" />
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
                Un stock bien organise permet de mieux servir ses clients, anticiper les besoins et piloter son
                entreprise avec plus de precision. Avec Factourati, la gestion de stock devient plus claire, plus
                visuelle et plus simple a suivre au quotidien.
              </p>
              <ul className="mt-5 space-y-3">
                <li className="flex gap-3 text-sm leading-7 text-gray-700"><CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-teal-600" />Mot-cle principal: gerer son stock efficacement</li>
                <li className="flex gap-3 text-sm leading-7 text-gray-700"><CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-teal-600" />Focus: produits, alertes, commandes et stock restant</li>
                <li className="flex gap-3 text-sm leading-7 text-gray-700"><CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-teal-600" />Public: PME marocaines et activites avec catalogue produit</li>
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
                <img src="/blog-assets/stock-alerts.svg" alt="alerte stock faible dans logiciel de gestion" className="w-full object-cover" />
              </figure>

              {sections.slice(4, 8).map((section) => (
                <section key={section.heading} className="rounded-[1.75rem] border border-gray-200 bg-white p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900">{section.heading}</h2>
                  <div className="mt-5 space-y-4 text-base leading-8 text-gray-700">
                    {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </div>
                </section>
              ))}

              <figure className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-sm">
                <img src="/blog-assets/stock-remaining.svg" alt="suivi du stock restant et des commandes produits" className="w-full object-cover" />
              </figure>

              {sections.slice(8).map((section) => (
                <section key={section.heading} className="rounded-[1.75rem] border border-gray-200 bg-white p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900">{section.heading}</h2>
                  <div className="mt-5 space-y-4 text-base leading-8 text-gray-700">
                    {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </div>
                  {section.bullets && <ul className="mt-6 grid gap-3 md:grid-cols-2">{section.bullets.map((bullet) => <li key={bullet} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">{bullet}</li>)}</ul>}
                </section>
              ))}

              <figure className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-sm">
                <img src="/blog-assets/stock-search.svg" alt="logiciel de gestion de stock pour PME au Maroc" className="w-full object-cover" />
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
                <h2 className="text-2xl font-semibold">Simplifiez la gestion de votre stock avec Factourati</h2>
                <p className="mt-3 max-w-2xl text-slate-300">
                  Suivez vos produits, vos alertes, vos commandes et votre stock restant dans une seule application
                  pensee pour les entreprises marocaines.
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
                <div><p className="font-semibold text-gray-900">Slug</p><p>/comment-gerer-votre-stock-efficacement</p></div>
                <div><p className="font-semibold text-gray-900">Mot-cle principal</p><p>gerer son stock efficacement</p></div>
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

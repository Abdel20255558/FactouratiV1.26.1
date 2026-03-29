import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PublicSiteChrome from './PublicSiteChrome';
import SeoHead from '../seo/SeoHead';
import {
  SITE_URL,
  createBreadcrumbSchema,
  createFaqSchema,
  createLocalBusinessSchema,
  createOrganizationSchema,
  faqItems,
} from '../../data/publicSeoData';

export default function FaqPage() {
  const pageUrl = `${SITE_URL}/faq`;
  const schema = [
    createOrganizationSchema(),
    createLocalBusinessSchema(),
    createFaqSchema(),
    createBreadcrumbSchema([
      { name: 'Accueil', url: SITE_URL },
      { name: 'FAQ', url: pageUrl },
    ]),
  ];

  return (
    <PublicSiteChrome>
      <SeoHead
        title="FAQ Factourati | Questions frequentes sur le logiciel de gestion"
        description="Consultez la FAQ Factourati pour comprendre le fonctionnement du logiciel, les tarifs, l'essai gratuit et les usages pour les PME marocaines."
        canonicalPath="/faq"
        keywords="faq factourati, logiciel gestion maroc faq, facturation maroc questions"
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
            <Link
              to="/login?mode=register"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Creer mon compte
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </PublicSiteChrome>
  );
}

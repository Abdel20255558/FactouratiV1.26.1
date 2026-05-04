import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  Brain,
  Building2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  Globe,
  LineChart,
  Mail,
  MapPin,
  Package,
  Phone,
  ShoppingCart,
  Sparkles,
  Truck,
  Users,
} from 'lucide-react';
import SeoHead from '../seo/SeoHead';
import PublicSiteChrome from '../public/PublicSiteChrome';
import {
  DEFAULT_OG_IMAGE,
  SITE_URL,
  createBreadcrumbSchema,
  createFaqSchema,
  createLocalBusinessSchema,
  createOfferCatalogSchema,
  createOrganizationSchema,
  createSiteNavigationSchema,
  createWebPageSchema,
  createWebsiteSchema,
} from '../../data/publicSeoData';
import {
  fetchHomepageScreenshots,
  type HomepageScreenshot,
} from '../../services/homepageScreenshotService';
import { fallbackHomepageScreenshots } from '../../data/homepageScreenshots';

const featureCards = [
  {
    icon: FileText,
    title: 'Creation de factures',
    text: 'Creez, personnalisez et exportez vos factures professionnelles en quelques clics.',
  },
  {
    icon: ClipboardList,
    title: 'Gestion des devis',
    text: 'Preparez vos devis rapidement et transformez-les en factures ou commandes.',
  },
  {
    icon: ShoppingCart,
    title: 'Gestion des commandes',
    text: 'Suivez vos commandes clients, livraisons et statuts pour mieux organiser votre activite.',
  },
  {
    icon: Boxes,
    title: 'Gestion de stock',
    text: 'Suivez vos produits, mouvements de stock, alertes et quantites disponibles.',
  },
  {
    icon: Users,
    title: 'Gestion clients',
    text: 'Centralisez les informations de vos clients, historiques, factures et paiements.',
  },
  {
    icon: Truck,
    title: 'Gestion fournisseurs',
    text: 'Suivez vos fournisseurs, achats, reglements et soldes.',
  },
  {
    icon: CreditCard,
    title: 'Suivi des paiements',
    text: 'Identifiez facilement les factures payees, partiellement payees ou en retard.',
  },
  {
    icon: BarChart3,
    title: 'Tableaux de bord',
    text: 'Visualisez votre chiffre d affaires, vos ventes, vos achats et vos indicateurs cles.',
  },
];

const aiVatFeatures = [
  'Import du releve bancaire PDF',
  'Detection automatique des achats',
  'Detection automatique des ventes',
  'Separation des virements personnels',
  'Separation des operations hors TVA',
  'Choix du taux TVA : 20%, 14%, 13%, 10%, 7%, 0%',
  'Calcul automatique du HT, TVA et TTC',
  'Correction manuelle avant validation',
  'Resume TVA deductible, collectee et TVA estimee a payer',
];

const whyFactourati = [
  'Solution simple et rapide',
  'Adaptee au marche marocain',
  'Gestion complete dans une seule plateforme',
  'Gain de temps administratif',
  'Calculs automatises',
  'Support disponible',
  'Acces securise en ligne',
  'Evolutif pour les PME',
];

const quickPoints = [
  'Premier mois gratuit',
  'Sans installation',
  'Adapte aux entreprises marocaines',
  'Factures, devis, stock, commandes et TVA',
];

const freeGeneratorHighlights = [
  'Facture PDF prete a imprimer',
  'Utilisable sans compte',
  'Passez a Factourati quand vous voulez',
];

const faqs = [
  {
    question: 'Factourati convient-il aux PME marocaines ?',
    answer:
      'Oui. Factourati est pense pour les TPE, PME, independants et societes marocaines qui veulent centraliser facturation, stock, clients, paiements et TVA.',
  },
  {
    question: 'Peut-on tester Factourati gratuitement ?',
    answer: 'Oui. Vous pouvez commencer avec un premier mois gratuit pour decouvrir l application.',
  },
  {
    question: 'L analyse TVA IA remplace-t-elle un comptable ?',
    answer:
      'Non. Elle accelere le tri et la preparation des operations, mais les resultats doivent etre verifies par l utilisateur ou son comptable avant declaration.',
  },
  {
    question: 'Dois-je installer un logiciel sur mon ordinateur ?',
    answer: 'Non. Factourati est une solution SaaS accessible en ligne, sans installation.',
  },
];

export default function HomePage() {
  const [screenshots, setScreenshots] = useState<HomepageScreenshot[]>(fallbackHomepageScreenshots);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isGalleryInView, setIsGalleryInView] = useState(false);
  const gallerySectionRef = useRef<HTMLElement | null>(null);
  const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    let isMounted = true;

    const loadScreenshots = async () => {
      try {
        const nextScreenshots = await fetchHomepageScreenshots({ activeOnly: true });
        if (isMounted && nextScreenshots.length > 0) {
          setScreenshots(nextScreenshots);
        }
      } catch (error) {
        console.warn("Images home indisponibles, fallback local utilise:", error);
      }
    };

    void loadScreenshots();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const sectionNode = gallerySectionRef.current;
    if (!sectionNode) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsGalleryInView(entry.isIntersecting);
      },
      {
        threshold: 0.35,
      },
    );

    observer.observe(sectionNode);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (screenshots.length <= 1 || !isGalleryInView) {
      return;
    }

    const timer = window.setInterval(() => {
      setCurrentSlide((current) => (current + 1) % screenshots.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [isGalleryInView, screenshots]);

  useEffect(() => {
    const activeThumbnail = thumbnailRefs.current[currentSlide];
    if (!activeThumbnail) {
      return;
    }

    activeThumbnail.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [currentSlide, screenshots]);

  const homeDescription =
    'Factourati est une solution ERP marocaine pour gerer factures, devis, commandes, stock, clients, fournisseurs et analyser la TVA avec IA. Essayez gratuitement ou utilisez le generateur de facture gratuit.';

  const homeSchema = useMemo(
    () => [
      createOrganizationSchema(),
      createLocalBusinessSchema(),
      createWebsiteSchema(),
      createSiteNavigationSchema(),
      createBreadcrumbSchema([{ name: 'Accueil', url: SITE_URL }]),
      createOfferCatalogSchema('/tarifs'),
      createFaqSchema(),
      createWebPageSchema({
        name: 'Factourati - Solution ERP Marocaine pour gerer votre entreprise simplement',
        path: '/',
        description: homeDescription,
      }),
    ],
    [homeDescription],
  );

  const featuredScreenshot = screenshots[0] || fallbackHomepageScreenshots[0];
  const activeScreenshot = screenshots[currentSlide] || featuredScreenshot;

  return (
    <PublicSiteChrome>
      <SeoHead
        title="Factourati - Solution ERP Marocaine | Factures, Devis, Stock, Commandes et TVA IA"
        description={homeDescription}
        canonicalPath="/"
        keywords="solution ERP marocaine, logiciel facturation Maroc, gestion factures Maroc, gestion devis Maroc, gestion stock Maroc, logiciel TVA Maroc, analyse TVA IA, application gestion entreprise Maroc, logiciel pour PME marocaines"
        image={featuredScreenshot.imageUrl || DEFAULT_OG_IMAGE}
        imageAlt="Interface Factourati pour factures, devis, stock, commandes et TVA IA"
        type="website"
        schema={homeSchema}
      />

      <div className="bg-[linear-gradient(180deg,#f7fffd_0%,#ffffff_30%,#eefcf7_100%)] text-slate-900">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.24),transparent_30%),radial-gradient(circle_at_15%_15%,rgba(14,165,233,0.20),transparent_35%),radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.16),transparent_28%),linear-gradient(180deg,#f5fffd_0%,#ecfeff_40%,#ffffff_100%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[0.94fr_1.1fr] lg:gap-16 lg:px-8 lg:pb-32 lg:pt-24">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="max-w-3xl"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/90 px-4 py-2 text-xs font-semibold text-sky-700 shadow-sm sm:px-5 sm:py-2.5 sm:text-base">
                <Sparkles className="h-4 w-4" />
                Nouveau : Analyse TVA intelligente avec IA
              </div>

              <h1 className="mt-5 text-4xl font-black leading-[0.98] tracking-tight text-slate-950 sm:mt-6 sm:text-[2.75rem] lg:text-[4.15rem]">
                Factourati - Solution ERP Marocaine pour gerer votre entreprise simplement
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-700 sm:mt-7 sm:text-lg sm:leading-8">
                Creez vos factures, devis, commandes, gerez votre stock, vos clients, vos fournisseurs et analysez votre TVA avec l intelligence artificielle.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  to="/login?mode=register"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-400 px-6 py-3.5 text-base font-bold text-white shadow-xl shadow-cyan-200 transition hover:scale-[1.01] sm:px-7 sm:py-4.5 sm:text-lg"
                >
                  Essayer gratuitement
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <a
                  href="#fonctionnalites"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-6 py-3.5 text-base font-semibold text-slate-800 transition hover:border-sky-300 hover:text-sky-700 sm:px-7 sm:py-4.5 sm:text-lg"
                >
                  Voir les fonctionnalites
                </a>
                <Link
                  to="/generateur-facture"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-6 py-3.5 text-base font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100 sm:px-7 sm:py-4.5 sm:text-lg"
                >
                  Generateur facture gratuit
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  to="/tarifs"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-950 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-slate-800 sm:px-7 sm:py-4.5 sm:text-lg"
                >
                  Voir les tarifs
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2">
                {quickPoints.map((point) => (
                  <div key={point} className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/85 px-4 py-3 text-sm text-slate-700 shadow-sm sm:px-5 sm:py-4 sm:text-base">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="relative"
            >
              <div className="absolute -inset-5 hidden rounded-[2.4rem] bg-gradient-to-br from-sky-300/30 via-cyan-200/20 to-emerald-300/30 blur-2xl md:block" />

              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5 shadow-lg shadow-cyan-100/60 md:hidden">
                <div className="flex items-center gap-3">
                  <Brain className="h-5 w-5 text-sky-600" />
                  <p className="text-lg font-semibold text-slate-950">Analyse TVA intelligente</p>
                </div>
                <p className="mt-3 text-base leading-8 text-slate-600">
                  Importez un PDF, detectez achats, ventes, virements personnels et operations hors TVA en quelques minutes.
                </p>
                <a
                  href="#tva-ia"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-sky-700 shadow-sm ring-1 ring-sky-100 transition hover:-translate-y-0.5 hover:bg-sky-100 hover:text-sky-800"
                >
                  Voir le module TVA IA
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              <div className="relative hidden overflow-hidden rounded-[2.2rem] border border-white/80 bg-white/88 shadow-2xl shadow-cyan-100/80 md:block">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                  <div>
                    <p className="text-base font-semibold text-slate-950">Plateforme Factourati</p>
                    <p className="text-sm text-slate-500">Factures, stock, commandes, rapports et TVA IA</p>
                  </div>
                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">
                    SaaS marocain
                  </div>
                </div>

                <div className="grid gap-5 p-6">
                  <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                    <img
                      src={featuredScreenshot.imageUrl}
                      alt={featuredScreenshot.title}
                      className="h-[22rem] w-full object-cover sm:h-[26rem] lg:h-[31rem]"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
                      <div className="flex items-center gap-3">
                        <Brain className="h-5 w-5 text-sky-600" />
                        <p className="text-lg font-semibold text-slate-950">Analyse TVA intelligente</p>
                      </div>
                      <p className="mt-3 text-base leading-7 text-slate-600">
                        Importez un PDF, detectez achats, ventes, virements personnels et operations hors TVA en quelques minutes.
                      </p>
                      <a
                        href="#tva-ia"
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-sky-700 shadow-sm ring-1 ring-sky-100 transition hover:-translate-y-0.5 hover:bg-sky-100 hover:text-sky-800"
                      >
                        Voir le module TVA IA
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </div>

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                      <div className="flex items-center gap-3">
                        <LineChart className="h-5 w-5 text-emerald-600" />
                        <p className="text-lg font-semibold text-slate-950">Pilotage de l activite</p>
                      </div>
                      <p className="mt-3 text-base leading-7 text-slate-600">
                        Visualisez facilement ventes, achats, paiements, stock et indicateurs de votre entreprise.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="bg-white/70 py-12 text-slate-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-[linear-gradient(135deg,#f0fdf4_0%,#ecfeff_45%,#ffffff_100%)] p-6 shadow-sm lg:p-8">
              <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                    <FileText className="h-4 w-4" />
                    Facture gratuite
                  </div>
                  <h2 className="mt-4 max-w-2xl text-2xl font-black text-slate-950 sm:text-[2.15rem]">
                    Creez une facture gratuite en quelques minutes
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                    Un lien direct pour preparer une facture propre, rapide et imprimable. Quand vous voulez aller plus loin,
                    Factourati vous attend avec clients, devis, stock, paiements et TVA IA.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2.5">
                    {['Sans compte', 'PDF imprimable', 'Simple et rapide'].map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white bg-white/90 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm"
                      >
                        <BadgeCheck className="h-4 w-4 text-emerald-600" />
                        {item}
                      </span>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Link
                      to="/generateur-facture"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-100 transition hover:scale-[1.01]"
                    >
                      Ouvrir le generateur gratuit
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                    <Link
                      to="/tarifs"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-base font-semibold text-slate-800 transition hover:border-cyan-300 hover:text-cyan-700"
                    >
                      Voir les tarifs
                    </Link>
                    <Link
                      to="/login?mode=register"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-base font-semibold text-slate-800 transition hover:border-emerald-300 hover:text-emerald-700"
                    >
                      Tester la plateforme complete
                    </Link>
                  </div>
                </div>

                <div className="rounded-[1.7rem] border border-white bg-white/90 p-5 shadow-lg shadow-emerald-100/40">
                  <div className="rounded-[1.4rem] bg-[linear-gradient(135deg,#052e2b_0%,#0f766e_50%,#0891b2_100%)] p-5 text-white">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100/85">Acces rapide</p>
                    <h3 className="mt-3 text-2xl font-black">Generateur de facture gratuit</h3>
                    <p className="mt-3 text-sm leading-7 text-cyan-50/90">
                      Pour les independants, TPE et equipes qui veulent une facture rapide avant de passer a une vraie gestion complete.
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {freeGeneratorHighlights.map((item) => (
                      <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5">
                        <div className="flex items-start gap-3">
                          <div className="rounded-2xl bg-gradient-to-br from-emerald-100 to-cyan-100 p-2 text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                          <p className="text-sm font-semibold leading-6 text-slate-800">{item}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="captures"
          ref={gallerySectionRef}
          className="bg-[linear-gradient(180deg,#031525_0%,#082f49_45%,#0b1220_100%)] py-20 text-white"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.26em] text-cyan-200">Galerie produit</p>
              <h2 className="mt-4 text-3xl font-black sm:text-4xl">Decouvrez Factourati en images</h2>
              <p className="mt-4 text-lg leading-8 text-slate-300">
                Retrouvez les principaux ecrans de l application SaaS Factourati : tableau de bord, facturation, stock, clients, paiements et analyse TVA intelligente.
              </p>
            </div>

            <div className="relative mt-12 overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/5 shadow-2xl shadow-cyan-950/40 backdrop-blur-sm">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.16),transparent_26%)]" />
              <div className="relative">
                <motion.div
                  key={activeScreenshot.id}
                  initial={{ opacity: 0.2, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35 }}
                  className="relative"
                >
                  <div className="aspect-[18/9] bg-slate-950 sm:aspect-[16/8]">
                    <img
                      src={activeScreenshot.imageUrl}
                      alt={activeScreenshot.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(3,7,18,0.76)_0%,rgba(3,7,18,0.34)_45%,rgba(3,7,18,0.08)_100%),linear-gradient(180deg,rgba(3,7,18,0.02)_0%,rgba(3,7,18,0.78)_100%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
                    <div className="max-w-3xl">
                      <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-cyan-100">
                        Factourati SaaS
                      </div>
                      <h3 className="mt-4 text-3xl font-black text-white sm:text-5xl">{activeScreenshot.title}</h3>
                      <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-lg sm:leading-8">
                        {activeScreenshot.description}
                      </p>
                    </div>
                  </div>

                  {screenshots.length > 1 ? (
                    <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between px-4 sm:px-6">
                      <button
                        type="button"
                        onClick={() => setCurrentSlide((current) => (current === 0 ? screenshots.length - 1 : current - 1))}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-slate-950/70 text-white shadow-lg transition hover:scale-105 hover:bg-slate-900"
                        aria-label="Image precedente"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentSlide((current) => (current + 1) % screenshots.length)}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-slate-950/70 text-white shadow-lg transition hover:scale-105 hover:bg-slate-900"
                        aria-label="Image suivante"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  ) : null}
                </motion.div>

                <div className="border-t border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88)_0%,rgba(7,15,28,0.96)_100%)] p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-200">
                        Capture {Math.min(currentSlide + 1, screenshots.length)} / {screenshots.length}
                      </p>
                      <p className="mt-2 text-sm text-slate-300">
                        Parcourez les ecrans principaux de Factourati comme un catalogue premium.
                      </p>
                    </div>

                    <div className="hidden flex-wrap gap-3 sm:flex">
                      {screenshots.map((shot, index) => (
                        <button
                          key={shot.id}
                          type="button"
                          onClick={() => setCurrentSlide(index)}
                          className={`h-3 rounded-full transition ${
                            index === currentSlide ? 'w-12 bg-gradient-to-r from-cyan-400 to-emerald-400' : 'w-3 bg-slate-600 hover:bg-slate-500'
                          }`}
                          aria-label={`Afficher ${shot.title}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 overflow-x-auto pb-2">
                    <div className="grid auto-cols-[82%] grid-flow-col gap-4 sm:auto-cols-[48%] xl:auto-cols-[calc((100%-3rem)/4)]">
                    {screenshots.map((shot, index) => (
                      <button
                        key={`${shot.id}-thumb`}
                        type="button"
                        ref={(element) => {
                          thumbnailRefs.current[index] = element;
                        }}
                        onClick={() => setCurrentSlide(index)}
                        className={`group relative overflow-hidden rounded-[1.6rem] border text-left transition ${
                          index === currentSlide
                            ? 'border-cyan-300/40 shadow-xl shadow-cyan-950/25'
                            : 'border-white/10 hover:border-cyan-300/20'
                        }`}
                      >
                        <div className="aspect-[16/10]">
                          <img
                            src={shot.imageUrl}
                            alt={shot.title}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        </div>
                        <div className={`pointer-events-none absolute inset-0 ${
                          index === currentSlide
                            ? 'bg-[linear-gradient(180deg,rgba(8,145,178,0.02)_0%,rgba(3,7,18,0.18)_48%,rgba(3,7,18,0.92)_100%)]'
                            : 'bg-[linear-gradient(180deg,rgba(3,7,18,0.04)_0%,rgba(3,7,18,0.22)_50%,rgba(3,7,18,0.94)_100%)]'
                        }`} />
                        <div className="absolute inset-x-0 bottom-0 p-4">
                          <p className="text-base font-bold text-white">{shot.title}</p>
                        </div>
                      </button>
                    ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="fonctionnalites" className="bg-white py-20 text-slate-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-700">Fonctionnalites principales</p>
              <h2 className="mt-4 text-3xl font-black sm:text-4xl">Tout ce qu il faut pour gerer votre activite</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Factourati est une application de gestion d entreprise au Maroc qui aide les PME, TPE et independants a centraliser leurs operations commerciales et administratives.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {featureCards.map((feature, index) => {
                const Icon = feature.icon;

                return (
                  <motion.article
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.4, delay: index * 0.04 }}
                    className="rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/40 to-emerald-50/30 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="inline-flex rounded-2xl bg-gradient-to-br from-sky-100 to-emerald-100 p-3 text-sky-700 ring-1 ring-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-slate-950">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{feature.text}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="tva-ia" className="bg-slate-50 py-18 text-slate-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-[2rem] border border-cyan-100/80 bg-[linear-gradient(135deg,#ecfeff_0%,#eff6ff_38%,#f0fdf4_100%)] shadow-[0_30px_90px_-35px_rgba(14,165,233,0.4)]">
              <div className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
              <div className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />

              <div className="relative grid gap-8 px-6 py-7 lg:grid-cols-[1.02fr_0.98fr] lg:px-9 lg:py-10 xl:gap-10 xl:px-10">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/90 px-4 py-2 text-xs font-bold text-cyan-700 shadow-sm sm:text-sm">
                    <BadgeCheck className="h-4 w-4" />
                    Premiere plateforme marocaine avec analyse TVA intelligente par IA
                  </div>
                  <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl xl:text-[2.8rem]">
                    Analyse TVA intelligente avec IA
                  </h2>
                  <p className="mt-4 text-lg leading-8 text-slate-700 sm:text-xl">
                    Factourati analyse automatiquement vos releves bancaires PDF pour detecter les factures achats, ventes, virements personnels et operations hors TVA.
                  </p>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                    Grace a notre systeme d analyse intelligent, importez simplement votre releve bancaire. Factourati prepare une analyse structuree de votre TVA, vous permet de verifier les operations, ajuster les taux TVA et preparer votre declaration plus rapidement.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2.5">
                    {[
                      'Import PDF en quelques secondes',
                      'Tri achats / ventes automatique',
                      'TVA calculee et ajustable',
                    ].map((item) => (
                      <div
                        key={item}
                        className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200/80 bg-white/80 px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm"
                      >
                        <Sparkles className="h-4 w-4 text-cyan-600" />
                        {item}
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {[
                      { value: 'PDF', label: 'Import bancaire rapide' },
                      { value: 'IA', label: 'Classement intelligent' },
                      { value: 'TVA', label: 'Resume pret a verifier' },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-3xl border border-white/80 bg-white/75 p-3.5 shadow-sm backdrop-blur"
                      >
                        <p className="text-xl font-black text-slate-950">{item.value}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link
                      to="/login?mode=register"
                      className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#0369a1_52%,#10b981_100%)] px-6 py-3.5 text-sm font-bold text-white shadow-[0_18px_40px_-18px_rgba(14,165,233,0.6)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-18px_rgba(16,185,129,0.45)]"
                    >
                      Tester l analyse TVA IA
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-white/90 px-6 py-3.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-700"
                    >
                      Voir l application
                    </Link>
                  </div>

                  <p className="mt-5 max-w-xl text-xs leading-6 text-slate-500 sm:text-sm">
                    Les resultats doivent etre verifies par l utilisateur ou son comptable avant declaration.
                  </p>
                </div>

                <div className="rounded-[1.7rem] border border-white/80 bg-white/80 p-5 shadow-[0_25px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
                  <div className="rounded-[1.35rem] border border-cyan-100 bg-[linear-gradient(135deg,#0f172a_0%,#155e75_45%,#0f766e_100%)] p-4 text-white shadow-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-white/15 p-2.5 text-cyan-100 ring-1 ring-white/10">
                          <Brain className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-100/80">Nouveau module Factourati</p>
                          <h3 className="mt-1 text-xl font-black sm:text-2xl">Ce que Factourati prepare pour vous</h3>
                        </div>
                      </div>
                      <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-100">
                        TVA IA
                      </div>
                    </div>

                    <p className="mt-4 max-w-lg text-sm leading-7 text-cyan-50/90">
                      Un flux simple pour logiciel TVA Maroc, verification comptable plus rapide et meilleure lecture de vos operations bancaires.
                    </p>

                    <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                      {[
                        { label: 'Achats detectes', value: 'Auto' },
                        { label: 'Ventes triees', value: 'Clair' },
                        { label: 'TVA estimee', value: 'Rapide' },
                      ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2.5 backdrop-blur-sm">
                          <p className="text-base font-black text-white">{item.value}</p>
                          <p className="mt-1 text-xs leading-5 text-cyan-50/80">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {aiVatFeatures.map((feature, index) => (
                      <div
                        key={feature}
                        className="group flex items-start gap-3 rounded-2xl border border-cyan-100 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md"
                      >
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-100 to-emerald-100 text-cyan-700">
                          {index < 3 ? <Sparkles className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-6 text-slate-800">{feature}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm leading-6 text-amber-800">
                    Verification finale recommandee avant declaration comptable ou fiscale.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pourquoi" className="bg-[linear-gradient(180deg,#ecfeff_0%,#f0fdf4_100%)] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-700">Pourquoi Factourati</p>
              <h2 className="mt-4 text-3xl font-black text-slate-950 sm:text-4xl">
                Pourquoi les entreprises marocaines choisissent Factourati ?
              </h2>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {whyFactourati.map((reason, index) => (
                <motion.div
                  key={reason}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.35, delay: index * 0.04 }}
                  className="rounded-3xl border border-white bg-white/90 p-5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-gradient-to-br from-sky-100 to-emerald-100 p-2 text-sky-700">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <p className="text-base font-semibold leading-7 text-slate-800">{reason}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="demarrage" className="bg-slate-50 py-20 text-slate-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-700">Mise en route</p>
              <h2 className="mt-4 text-3xl font-black sm:text-4xl">Commencez en 3 etapes</h2>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {[
                {
                  step: '01',
                  title: 'Creez votre compte',
                  text: 'Inscrivez-vous gratuitement et configurez votre entreprise.',
                  icon: Building2,
                },
                {
                  step: '02',
                  title: 'Ajoutez vos donnees',
                  text: 'Ajoutez vos clients, produits, fournisseurs ou importez votre releve bancaire.',
                  icon: Package,
                },
                {
                  step: '03',
                  title: 'Gerez votre activite',
                  text: 'Creez vos documents, suivez vos paiements, gerez votre stock et preparez votre TVA.',
                  icon: BarChart3,
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.step} className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-700">{item.step}</span>
                      <div className="rounded-2xl bg-gradient-to-br from-sky-100 to-emerald-100 p-3 text-sky-700">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <h3 className="mt-6 text-2xl font-black text-slate-950">{item.title}</h3>
                    <p className="mt-4 text-base leading-8 text-slate-600">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white py-20 text-slate-900">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8 shadow-sm lg:p-10">
              <div className="max-w-3xl">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-700">FAQ</p>
                <h2 className="mt-4 text-3xl font-black sm:text-4xl">Questions frequentes</h2>
              </div>

              <div className="mt-8 space-y-4">
                {faqs.map((faq) => (
                  <details key={faq.question} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <summary className="cursor-pointer text-base font-bold text-slate-950">{faq.question}</summary>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[linear-gradient(180deg,#e0f2fe_0%,#ecfdf5_100%)] py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-[2rem] border border-white bg-[linear-gradient(135deg,#0f766e_0%,#0284c7_55%,#10b981_100%)] p-8 shadow-2xl shadow-cyan-200/40 lg:p-12">
              <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="max-w-3xl">
                  <h2 className="text-3xl font-black text-white sm:text-4xl">
                    Pret a simplifier la gestion de votre entreprise ?
                  </h2>
                  <p className="mt-4 text-lg leading-8 text-slate-200">
                    Essayez Factourati gratuitement et decouvrez une nouvelle facon de gerer vos factures, devis, commandes, stock et TVA.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <Link
                    to="/login?mode=register"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-base font-bold text-slate-950 transition hover:bg-cyan-50"
                  >
                    Creer mon compte gratuit
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  <a
                    href="mailto:contact@Factourati.com?subject=Demande%20de%20demonstration%20Factourati"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-4 text-base font-semibold text-white transition hover:bg-white/10"
                  >
                    Demander une demonstration
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PublicSiteChrome>
  );
}

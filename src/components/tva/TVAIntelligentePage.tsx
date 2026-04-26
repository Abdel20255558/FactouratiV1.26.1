import React from 'react';
import { AlertTriangle, BarChart3, CalendarDays, CheckCircle2, CreditCard, Download, FileUp, Pencil, Plus, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useVat } from '../../contexts/VatContext';
import type {
  ManualSalesVatInvoice,
  MoroccanVatRate,
  PurchaseVatExtractionResult,
  PurchaseVatInvoice,
  PurchaseVatPaymentMode,
  SalesVatInvoiceLike,
  VatAnalysisCacheEntry,
} from '../../types/vat';
import { buildVatHistory, buildVatSummary, formatMad, getCurrentVatPeriod, PAYMENT_MODE_OPTIONS, VAT_RATE_OPTIONS } from '../../utils/vat';
import PurchaseVatInvoiceModal from './PurchaseVatInvoiceModal';
import SalesVatInvoiceModal from './SalesVatInvoiceModal';
import SalesVatMonthModal from './SalesVatMonthModal';
import TvaAnalysisCreditsPurchaseModal from './TvaAnalysisCreditsPurchaseModal';
import TVAComparisonChart from './TVAComparisonChart';

type SortField = 'date' | 'montant' | 'fournisseur';

const PAYMENT_LABELS = Object.fromEntries(PAYMENT_MODE_OPTIONS.map((option) => [option.value, option.label])) as Record<PurchaseVatPaymentMode, string>;
const KPI_CARD_CLASS =
  'rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800';
const TABLE_CONTAINER_CLASS =
  'mt-6 overflow-x-auto overscroll-x-contain rounded-3xl border border-gray-200 bg-white pb-2 shadow-sm dark:border-gray-700 dark:bg-gray-800';
const TABLE_HINT_CLASS =
  'mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';

const periodLabel = (period: string) => {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month) return period;

  return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
};

const getAnalysisPeriodValue = (entry: VatAnalysisCacheEntry) => {
  const cachedPeriod = entry.resultat_json?.periode;
  if (typeof cachedPeriod === 'string' && /^\d{4}-\d{2}$/.test(cachedPeriod)) {
    return cachedPeriod;
  }

  const firstOperationDate = entry.resultat_json?.factures?.[0]?.date;
  if (typeof firstOperationDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(firstOperationDate)) {
    return firstOperationDate.slice(0, 7);
  }

  return null;
};

const getAnalysisPeriodLabel = (entry: VatAnalysisCacheEntry) => {
  const analysisPeriod = getAnalysisPeriodValue(entry);
  return analysisPeriod ? periodLabel(analysisPeriod) : 'Mois non determine';
};

const getSalesCounterpart = (invoice: SalesVatInvoiceLike) => invoice.clientName || invoice.client?.name || 'Client';
const getSalesDescription = (invoice: SalesVatInvoiceLike) =>
  invoice.description || invoice.items?.[0]?.description || invoice.number || 'Facture de vente';

export default function TVAIntelligentePage() {
  const { user } = useAuth();
  const { invoices: applicationInvoices } = useData();
  const {
    purchaseInvoices,
    salesInvoices,
    manualSalesInvoices,
    salesAdjustments,
    analysisCacheEntries,
    analysisCredits,
    isLoading,
    deletePurchaseInvoice,
    deleteAnalysisCacheEntry,
    deleteManualSalesInvoice,
    excludeApplicationSalesInvoice,
    moveApplicationSalesInvoiceToDate,
    restoreApplicationSalesInvoice,
    exportVatPdf,
  } = useVat();

  const [selectedPeriod, setSelectedPeriod] = React.useState(getCurrentVatPeriod());
  const [paymentFilter, setPaymentFilter] = React.useState<'all' | PurchaseVatPaymentMode>('all');
  const [vatRateFilter, setVatRateFilter] = React.useState<'all' | MoroccanVatRate>('all');
  const [sortField, setSortField] = React.useState<SortField>('date');
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = React.useState(false);
  const [purchaseInitialMode, setPurchaseInitialMode] = React.useState<'manual' | 'pdf'>('manual');
  const [editingPurchaseInvoice, setEditingPurchaseInvoice] = React.useState<PurchaseVatInvoice | null>(null);
  const [isSalesModalOpen, setIsSalesModalOpen] = React.useState(false);
  const [editingSalesInvoice, setEditingSalesInvoice] = React.useState<ManualSalesVatInvoice | null>(null);
  const [isMoveSalesModalOpen, setIsMoveSalesModalOpen] = React.useState(false);
  const [movingSalesInvoice, setMovingSalesInvoice] = React.useState<SalesVatInvoiceLike | null>(null);
  const [actionError, setActionError] = React.useState('');
  const [actionSuccess, setActionSuccess] = React.useState('');
  const [isExporting, setIsExporting] = React.useState(false);
  const [salesActionLoadingId, setSalesActionLoadingId] = React.useState<string | null>(null);
  const [analysisActionLoadingId, setAnalysisActionLoadingId] = React.useState<string | null>(null);
  const [isExcludedSalesPanelOpen, setIsExcludedSalesPanelOpen] = React.useState(false);
  const [importCelebration, setImportCelebration] = React.useState<string | null>(null);
  const [prefilledAnalysisResult, setPrefilledAnalysisResult] = React.useState<PurchaseVatExtractionResult | null>(null);
  const [prefilledAnalysisFileName, setPrefilledAnalysisFileName] = React.useState<string | null>(null);
  const [isCreditsPurchaseModalOpen, setIsCreditsPurchaseModalOpen] = React.useState(false);

  const isProActive =
    user?.company.subscription === 'pro' &&
    Boolean(user.company.expiryDate) &&
    new Date(user.company.expiryDate!) > new Date();

  const hasVatPermission = Boolean(user?.isAdmin || user?.permissions?.smartVat || user?.permissions?.reports);

  const periodPurchaseInvoices = React.useMemo(
    () => purchaseInvoices.filter((invoice) => invoice.date.startsWith(selectedPeriod)),
    [purchaseInvoices, selectedPeriod],
  );

  const periodSalesInvoices = React.useMemo(
    () => salesInvoices.filter((invoice) => invoice.date.startsWith(selectedPeriod)).sort((a, b) => b.date.localeCompare(a.date)),
    [salesInvoices, selectedPeriod],
  );

  const excludedSalesInvoices = React.useMemo(() => {
    const excludedIds = new Set(
      salesAdjustments
        .filter((adjustment) => adjustment.action === 'exclude')
        .map((adjustment) => adjustment.sourceInvoiceId),
    );

    return applicationInvoices
      .filter((invoice) => excludedIds.has(invoice.id) && invoice.date.startsWith(selectedPeriod))
      .sort((left, right) => right.date.localeCompare(left.date));
  }, [applicationInvoices, salesAdjustments, selectedPeriod]);

  const summary = React.useMemo(
    () => buildVatSummary(periodPurchaseInvoices, periodSalesInvoices, selectedPeriod),
    [periodPurchaseInvoices, periodSalesInvoices, selectedPeriod],
  );

  const history = React.useMemo(() => buildVatHistory(purchaseInvoices, salesInvoices, 6), [purchaseInvoices, salesInvoices]);

  const filteredPurchaseInvoices = React.useMemo(() => {
    const filtered = periodPurchaseInvoices.filter((invoice) => {
      const paymentMatches = paymentFilter === 'all' || invoice.mode_paiement === paymentFilter;
      const rateMatches = vatRateFilter === 'all' || invoice.taux_tva === vatRateFilter;
      return paymentMatches && rateMatches;
    });

    return filtered.sort((left, right) => {
      if (sortField === 'montant') return right.montant_ttc - left.montant_ttc;
      if (sortField === 'fournisseur') return left.fournisseur.localeCompare(right.fournisseur, 'fr', { sensitivity: 'base' });
      return right.date.localeCompare(left.date);
    });
  }, [paymentFilter, periodPurchaseInvoices, sortField, vatRateFilter]);

  const recapRows = React.useMemo(() => {
    const purchaseRows = periodPurchaseInvoices.map((invoice) => ({
      id: `purchase-${invoice.id}`,
      date: invoice.date,
      type: 'Achat',
      counterpart: invoice.fournisseur,
      description: invoice.description,
      ht: invoice.montant_ht,
      vat: invoice.montant_tva,
      ttc: invoice.montant_ttc,
    }));

    const salesRows = periodSalesInvoices.map((invoice) => ({
      id: `sale-${invoice.id}`,
      date: invoice.date,
      type: 'Vente',
      counterpart: getSalesCounterpart(invoice),
      description: getSalesDescription(invoice),
      ht: invoice.subtotal,
      vat: invoice.totalVat,
      ttc: invoice.totalTTC,
    }));

    return [...purchaseRows, ...salesRows].sort((left, right) => right.date.localeCompare(left.date));
  }, [periodPurchaseInvoices, periodSalesInvoices]);

  const openCreatePurchaseModal = (mode: 'manual' | 'pdf') => {
    if (mode === 'pdf' && analysisCredits.total_disponible <= 0) {
      setIsCreditsPurchaseModalOpen(true);
      setActionError('');
      setActionSuccess('');
      return;
    }

    setEditingPurchaseInvoice(null);
    setPrefilledAnalysisResult(null);
    setPrefilledAnalysisFileName(null);
    setPurchaseInitialMode(mode);
    setActionError('');
    setActionSuccess('');
    setIsPurchaseModalOpen(true);
  };

  const openEditPurchaseModal = (invoice: PurchaseVatInvoice) => {
    setEditingPurchaseInvoice(invoice);
    setPrefilledAnalysisResult(null);
    setPrefilledAnalysisFileName(null);
    setPurchaseInitialMode(invoice.source === 'pdf_ia' ? 'pdf' : 'manual');
    setActionError('');
    setActionSuccess('');
    setIsPurchaseModalOpen(true);
  };

  const openCreateSalesModal = () => {
    setEditingSalesInvoice(null);
    setActionError('');
    setActionSuccess('');
    setIsSalesModalOpen(true);
  };

  const openEditSalesModal = (invoice: SalesVatInvoiceLike) => {
    const manualInvoice = manualSalesInvoices.find((item) => item.id === invoice.sourceInvoiceId);
    if (!manualInvoice) {
      setActionError("Impossible de retrouver cette vente manuelle.");
      return;
    }

    setEditingSalesInvoice(manualInvoice);
    setActionError('');
    setActionSuccess('');
    setIsSalesModalOpen(true);
  };

  const openMoveSalesModal = (invoice: SalesVatInvoiceLike) => {
    setMovingSalesInvoice(invoice);
    setActionError('');
    setActionSuccess('');
    setIsMoveSalesModalOpen(true);
  };

  const handlePurchaseImportComplete = React.useCallback(
    ({ achats, ventes, periods }: { achats: number; ventes: number; periods: string[] }) => {
      const primaryPeriod = periods[0];
      if (primaryPeriod) {
        setSelectedPeriod(primaryPeriod);
      }
      setPaymentFilter('all');
      setVatRateFilter('all');
      setSortField('date');

      const importedTotal = achats + ventes;
      const periodMessage =
        periods.length === 0
          ? ''
          : periods.length === 1
            ? ` Affichage bascule sur ${periodLabel(periods[0])}.`
            : ` Les lignes couvrent ${periods.length} mois (${periods.map((period) => periodLabel(period)).join(', ')}). Affichage place sur ${periodLabel(periods[0])}.`;

      setActionError('');
      setActionSuccess(
        `${importedTotal} ligne${importedTotal > 1 ? 's' : ''} importee${importedTotal > 1 ? 's' : ''} : ${achats} achat${achats > 1 ? 's' : ''} et ${ventes} vente${ventes > 1 ? 's' : ''}.${periodMessage}`,
      );
      setImportCelebration(
        `${importedTotal} ligne${importedTotal > 1 ? 's' : ''} importee${importedTotal > 1 ? 's' : ''} avec succes`,
      );
    },
    [],
  );

  const handleCreditsPurchased = (addedCredits: number) => {
    setActionError('');
    setActionSuccess(`${addedCredits} analyses ajoutees a votre compte !`);
    setImportCelebration(`${addedCredits} analyses IA rechargees`);
    openCreatePurchaseModal('pdf');
  };

  React.useEffect(() => {
    if (!importCelebration) return undefined;

    const timeout = window.setTimeout(() => {
      setImportCelebration(null);
    }, 3200);

    return () => window.clearTimeout(timeout);
  }, [importCelebration]);

  const openCachedAnalysis = React.useCallback((entry: VatAnalysisCacheEntry) => {
    setEditingPurchaseInvoice(null);
    setPurchaseInitialMode('pdf');
    setPrefilledAnalysisFileName(entry.nom_fichier_original);
    setPrefilledAnalysisResult({
      ...entry.resultat_json,
      cache_info: {
        cacheHit: true,
        cacheEntryId: entry.id,
        hash_fichier: entry.hash_fichier,
        nom_fichier_original: entry.nom_fichier_original,
        analyse_date: entry.analyse_date,
        nb_factures_achat: entry.nb_factures_achat,
        nb_factures_vente: entry.nb_factures_vente,
        nb_operations_ignorees: entry.nb_operations_ignorees,
      },
    });
    setActionError('');
    setActionSuccess('');
    setIsPurchaseModalOpen(true);
  }, []);

  const previewCachedAnalysis = React.useCallback(
    (entry: VatAnalysisCacheEntry) => {
      const analysisPeriod = getAnalysisPeriodValue(entry);
      if (analysisPeriod) {
        setSelectedPeriod(analysisPeriod);
        setActionSuccess(`Affichage positionne sur ${periodLabel(analysisPeriod)}.`);
      } else {
        setActionSuccess('Le mois analyse n a pas pu etre determine pour ce releve.');
      }
      setActionError('');
    },
    [],
  );

  const handleDeleteAnalysisCacheEntry = React.useCallback(
    async (entry: VatAnalysisCacheEntry) => {
      const confirmed = window.confirm(
        `Supprimer le releve analyse "${entry.nom_fichier_original}" de l'historique ?`,
      );

      if (!confirmed) return;

      try {
        setAnalysisActionLoadingId(entry.id);
        setActionError('');
        await deleteAnalysisCacheEntry(entry.id);
        setActionSuccess(`Le releve "${entry.nom_fichier_original}" a ete supprime de l'historique.`);
      } catch (error) {
        console.error("Erreur suppression releve analyse TVA:", error);
        setActionError("Impossible de supprimer ce releve analyse pour le moment.");
      } finally {
        setAnalysisActionLoadingId(null);
      }
    },
    [deleteAnalysisCacheEntry],
  );

  const handleDeletePurchase = async (invoice: PurchaseVatInvoice) => {
    const confirmed = window.confirm(`Supprimer la facture achat "${invoice.fournisseur}" ?`);
    if (!confirmed) return;

    try {
      setActionError('');
      await deletePurchaseInvoice(invoice.id);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Impossible de supprimer cette facture d'achat.");
    }
  };

  const handleDeleteSale = async (invoice: SalesVatInvoiceLike) => {
    const confirmed = window.confirm(
      invoice.sourceType === 'application'
        ? `Retirer la facture de vente "${getSalesCounterpart(invoice)}" du tableau TVA sans supprimer la facture de l'application ?`
        : `Supprimer la vente manuelle "${getSalesCounterpart(invoice)}" du module TVA ?`,
    );
    if (!confirmed) return;

    try {
      setSalesActionLoadingId(invoice.id);
      setActionError('');
      if (invoice.sourceType === 'application' && invoice.sourceInvoiceId) {
        await excludeApplicationSalesInvoice(invoice.sourceInvoiceId);
      } else if (invoice.sourceType === 'manuelle' && invoice.sourceInvoiceId) {
        await deleteManualSalesInvoice(invoice.sourceInvoiceId);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Impossible de supprimer cette facture de vente.");
    } finally {
      setSalesActionLoadingId(null);
    }
  };

  const handleMoveSaleToMonth = async (targetDate: string) => {
    if (!movingSalesInvoice?.sourceInvoiceId) {
      throw new Error('Facture de vente introuvable.');
    }

    setSalesActionLoadingId(movingSalesInvoice.id);
    setActionError('');

    try {
      await moveApplicationSalesInvoiceToDate(movingSalesInvoice.sourceInvoiceId, targetDate);
    } finally {
      setSalesActionLoadingId(null);
    }
  };

  const handleRestoreSale = async (invoice: SalesVatInvoiceLike) => {
    if (!invoice.sourceInvoiceId) return;

    try {
      setSalesActionLoadingId(invoice.id);
      setActionError('');
      await restoreApplicationSalesInvoice(invoice.sourceInvoiceId);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Impossible de restaurer cette vente.");
    } finally {
      setSalesActionLoadingId(null);
    }
  };

  const handleRestoreExcludedSale = async (invoiceId: string) => {
    try {
      setSalesActionLoadingId(invoiceId);
      setActionError('');
      await restoreApplicationSalesInvoice(invoiceId);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Impossible de reajouter cette vente au tableau TVA.");
    } finally {
      setSalesActionLoadingId(null);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      setActionError('');
      await exportVatPdf(selectedPeriod);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Impossible d'exporter le recapitulatif TVA.");
    } finally {
      setIsExporting(false);
    }
  };

  if (!hasVatPermission) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="max-w-lg rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-xl dark:border-amber-700 dark:bg-gray-800">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Acces TVA Intelligente indisponible</h1>
          <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300">
            Votre compte n&apos;a pas encore la permission d&apos;utiliser ce module.
          </p>
        </div>
      </div>
    );
  }

  if (!isProActive) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="max-w-lg rounded-3xl border border-red-200 bg-white p-8 text-center shadow-xl dark:border-red-800 dark:bg-gray-800">
          <BarChart3 className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">TVA Intelligente reservee a la version PRO</h1>
          <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300">
            Activez ou renouvelez la version PRO pour acceder a ce module.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-teal-200 bg-gradient-to-br from-teal-600 via-emerald-600 to-slate-900 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold">
                <BarChart3 className="h-4 w-4" />
                TVA Intelligente
              </div>
              <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">
                Pilotez vos achats TVA et vos ventes TVA en un seul endroit
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-teal-50/90 sm:text-base">
                Saisissez vos achats manuellement ou par analyse PDF avec IA, puis gerez aussi les ventes du mois, leur affectation TVA et vos exports comptables.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur xl:min-w-[240px]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-100/80">Periode</p>
              <label className="mt-3 block">
                <span className="sr-only">Periode TVA</span>
                <input
                  type="month"
                  value={selectedPeriod}
                  onChange={(event) => setSelectedPeriod(event.target.value)}
                  className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white outline-none placeholder:text-white/70"
                />
              </label>
              <p className="mt-3 text-xs leading-5 text-teal-50/80">Declaration estimee avant le {summary.deadlineLabel}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className={KPI_CARD_CLASS}>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">TVA sur achats</p>
            <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-gray-100">{formatMad(summary.deductibleVat)}</p>
            <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">TVA deductible issue des achats</p>
          </div>

          <div className={KPI_CARD_CLASS}>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">TVA sur ventes</p>
            <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-gray-100">{formatMad(summary.collectedVat)}</p>
            <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">TVA collectee sur les ventes</p>
          </div>

          <div className={KPI_CARD_CLASS}>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Solde TVA</p>
            <p className={`mt-3 text-3xl font-bold ${summary.balance > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatMad(Math.abs(summary.balance))}
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {summary.balance > 0 ? 'Montant estime a payer' : 'Credit TVA a reporter'}
            </p>
          </div>

          <div className={KPI_CARD_CLASS}>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Factures de la periode</p>
            <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-gray-100">{summary.totalInvoices}</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {summary.purchaseInvoicesCount} achats • {summary.salesInvoicesCount} ventes
            </p>
          </div>
        </section>

        <section
          className={`rounded-[2rem] border p-5 shadow-sm ${
            summary.balance > 0
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
              : 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200'
          }`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-80">Statut TVA</p>
              <h2 className="mt-2 text-2xl font-bold">
                {summary.balance > 0
                  ? `TVA a payer : ${formatMad(summary.balance)}`
                  : `Credit TVA : ${formatMad(Math.abs(summary.balance))}`}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7">
                {summary.balance > 0
                  ? `Declarez avant le ${summary.deadlineLabel} sur le portail SIMPL-TVA de la DGI.`
                  : 'Aucun paiement requis pour cette periode. Le credit TVA peut etre reporte sur le mois suivant.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExporting}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                summary.balance > 0
                  ? 'bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-60'
                  : 'bg-red-700 text-white hover:bg-red-800 disabled:opacity-60'
              }`}
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Export en cours...' : 'Exporter PDF'}
            </button>
          </div>
        </section>

        <section
          className={`rounded-[2rem] border p-5 shadow-sm ${
            analysisCredits.total_disponible > 0
              ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20'
              : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20'
          }`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p
                className={`text-xs font-semibold uppercase tracking-[0.24em] ${
                  analysisCredits.total_disponible > 0
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-red-700 dark:text-red-300'
                }`}
              >
                Credits analyses IA
              </p>
              <h2
                className={`mt-2 text-2xl font-bold ${
                  analysisCredits.total_disponible > 0
                    ? 'text-blue-900 dark:text-blue-100'
                    : 'text-red-900 dark:text-red-100'
                }`}
              >
                {analysisCredits.total_disponible > 0
                  ? `Analyses IA disponibles : ${analysisCredits.total_disponible}`
                  : 'Analyses IA epuisees'}
              </h2>
              <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">
                {analysisCredits.total_disponible > 0
                  ? `(${analysisCredits.credits_gratuits_restants} incluses restantes + ${analysisCredits.credits_payes_restants} payees) - Les credits payes sont utilises en priorite.`
                  : 'Rechargez votre compte pour continuer a analyser vos releves bancaires avec l IA TVA.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsCreditsPurchaseModalOpen(true)}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                analysisCredits.total_disponible > 0
                  ? 'bg-blue-700 text-white hover:bg-blue-800'
                  : 'bg-red-700 text-white hover:bg-red-800'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Acheter des analyses
            </button>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">Analysez votre relevé bancaire en quelques secondes</p>
                <h2 className="mt-2 text-xl font-bold text-gray-900 dark:text-gray-100">Importez votre relevé bancaire</h2>
                <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300">
                  Importez votre relevé bancaire — Factourati s&apos;occupe du reste.
                  Notre IA détecte automatiquement vos factures achat et vente,
                  filtre les opérations non comptables, et prépare votre déclaration TVA.
                  Vous n&apos;avez qu&apos;à vérifier et valider.
                </p>
              </div>
              <div className="rounded-2xl bg-white/80 p-3 text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300">
                <FileUp className="h-6 w-6" />
              </div>
            </div>
            <button
              type="button"
              onClick={() => openCreatePurchaseModal('pdf')}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <FileUp className="h-4 w-4" />
              Importer mon relevé bancaire
            </button>
            <p className="mt-3 text-xs font-medium text-gray-500 dark:text-gray-400">
              Formats acceptés : PDF — Taille max : 10 MB
            </p>
          </div>

          <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700 dark:text-blue-300">Entree manuelle</p>
                <h2 className="mt-2 text-xl font-bold text-gray-900 dark:text-gray-100">Saisir une facture achat structuree</h2>
                <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300">
                  Remplissez les champs un par un avec calcul automatique du HT et de la TVA.
                </p>
              </div>
              <div className="rounded-2xl bg-white/80 p-3 text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-300">
                <Plus className="h-6 w-6" />
              </div>
            </div>
            <button
              type="button"
              onClick={() => openCreatePurchaseModal('manual')}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Ajouter une facture achat
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Releves deja analyses</h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Rechargez un resultat mis en cache sans relancer l'analyse OpenAI.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 dark:bg-gray-900 dark:text-gray-200">
              <FileUp className="h-4 w-4" />
              {analysisCacheEntries.length} releve{analysisCacheEntries.length > 1 ? 's' : ''}
            </div>
          </div>

          <div className="mt-4 rounded-3xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
            Chaque releve conserve son mois analyse, ses compteurs achat / vente et les actions utiles pour le recharger ou le supprimer.
          </div>

          <div className={`${TABLE_CONTAINER_CLASS} overflow-x-hidden`}>
            <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
              <colgroup>
                <col style={{ width: '27%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '17%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '16%' }} />
              </colgroup>
              <thead className="bg-gray-50 dark:bg-gray-900/60">
                <tr>
                  {['Fichier', 'Mois analyse', 'Date analyse', 'Factures achat', 'Factures vente', 'Actions'].map((label) => (
                    <th
                      key={label}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {analysisCacheEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="min-w-[260px] px-4 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                      <div>{entry.nom_fichier_original}</div>
                      <div className="mt-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                        {entry.nb_operations_ignorees} operation{entry.nb_operations_ignorees > 1 ? 's' : ''} exclue{entry.nb_operations_ignorees > 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
                      {getAnalysisPeriodLabel(entry)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
                      {entry.analyse_date ? new Date(entry.analyse_date).toLocaleString('fr-FR') : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
                      {entry.nb_factures_achat}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
                      {entry.nb_factures_vente}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-start gap-2">
                        <button
                          type="button"
                          onClick={() => previewCachedAnalysis(entry)}
                          disabled={analysisActionLoadingId === entry.id}
                          className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
                        >
                          <FileUp className="h-3.5 w-3.5" />
                          Apercu
                        </button>
                        <button
                          type="button"
                          onClick={() => openCachedAnalysis(entry)}
                          disabled={analysisActionLoadingId === entry.id}
                          className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Recharger
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAnalysisCacheEntry(entry)}
                          disabled={analysisActionLoadingId === entry.id}
                          className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {analysisActionLoadingId === entry.id ? 'Suppression...' : 'Supprimer'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!isLoading && analysisCacheEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      Aucun releve analyse pour le moment.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <TVAComparisonChart data={history} />

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Resume de la periode</h2>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/50">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Periode selectionnee</p>
                <p className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100">{periodLabel(selectedPeriod)}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Achats HT</p>
                  <p className="mt-2 text-xl font-bold text-gray-900 dark:text-gray-100">{formatMad(summary.purchaseTotalHT)}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Ventes HT</p>
                  <p className="mt-2 text-xl font-bold text-gray-900 dark:text-gray-100">{formatMad(summary.salesTotalHT)}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Achats TTC</p>
                  <p className="mt-2 text-xl font-bold text-gray-900 dark:text-gray-100">{formatMad(summary.purchaseTotalTTC)}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Ventes TTC</p>
                  <p className="mt-2 text-xl font-bold text-gray-900 dark:text-gray-100">{formatMad(summary.salesTotalTTC)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Factures achat TVA</h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Vos achats deducibles saisis manuellement ou extraits automatiquement depuis un PDF.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <select
                value={paymentFilter}
                onChange={(event) => setPaymentFilter(event.target.value as 'all' | PurchaseVatPaymentMode)}
                className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="all">Tous les paiements</option>
                {PAYMENT_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={vatRateFilter}
                onChange={(event) =>
                  setVatRateFilter(event.target.value === 'all' ? 'all' : Number(event.target.value) as MoroccanVatRate)
                }
                className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="all">Tous les taux TVA</option>
                {VAT_RATE_OPTIONS.map((rate) => (
                  <option key={rate} value={rate}>
                    TVA {rate}%
                  </option>
                ))}
              </select>

              <select
                value={sortField}
                onChange={(event) => setSortField(event.target.value as SortField)}
                className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="date">Trier par date</option>
                <option value="montant">Trier par montant</option>
                <option value="fournisseur">Trier par fournisseur</option>
              </select>
            </div>
          </div>

          {actionError ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
              {actionError}
            </div>
          ) : null}

          {actionSuccess ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
              {actionSuccess}
            </div>
          ) : null}

          <div className={TABLE_HINT_CLASS}>
            <Sparkles className="h-3.5 w-3.5" />
            Faites defiler horizontalement pour voir toutes les colonnes du tableau.
          </div>

          <div className={TABLE_CONTAINER_CLASS}>
            <table className="min-w-[1480px] divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/60">
                <tr>
                  {['Date', 'N° facture', 'Fournisseur', 'Description', 'TTC', 'Taux TVA', 'TVA', 'HT', 'Paiement', 'N° piece', 'ICE', 'Actions'].map((label) => (
                    <th
                      key={label}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredPurchaseInvoices.map((invoice) => (
                  <tr key={invoice.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
                      {new Date(invoice.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {invoice.numero_facture || '—'}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                      <div>{invoice.fournisseur}</div>
                      <div className="mt-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            invoice.source === 'pdf_ia'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {invoice.source === 'pdf_ia' ? 'Extrait par IA' : 'Saisie manuelle'}
                        </span>
                      </div>
                    </td>
                    <td className="min-w-[260px] px-4 py-4 text-sm text-gray-700 dark:text-gray-200">{invoice.description}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">{formatMad(invoice.montant_ttc)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-200">{invoice.taux_tva}%</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-200">{formatMad(invoice.montant_tva)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-200">{formatMad(invoice.montant_ht)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-200">{PAYMENT_LABELS[invoice.mode_paiement]}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-200">{invoice.numero_piece || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-200">{invoice.ice_fournisseur || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditPurchaseModal(invoice)}
                          className="inline-flex items-center gap-1 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePurchase(invoice)}
                          className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!isLoading && filteredPurchaseInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      Aucune facture achat pour cette periode avec les filtres actuels.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Factures vente TVA</h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Factures issues de l'application et ventes manuelles TVA, avec options de suppression et changement de mois TVA.
              </p>
            </div>

            <div className="w-full xl:w-auto xl:min-w-[360px]">
              <div className="rounded-3xl border border-gray-200 bg-gray-50/80 p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900/50">
                <p className="px-1 text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                  Actions ventes TVA
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row xl:flex-col">
                  <button
                    type="button"
                    onClick={openCreateSalesModal}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:from-indigo-700 hover:to-blue-800"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter une facture vente manuelle
                  </button>

                  {excludedSalesInvoices.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setIsExcludedSalesPanelOpen((prev) => !prev)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      {isExcludedSalesPanelOpen ? 'Masquer les ventes retirees' : `Reajouter une vente retiree (${excludedSalesInvoices.length})`}
                    </button>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-3 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      Aucune vente retiree a reafficher.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {isExcludedSalesPanelOpen ? (
            <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-800 dark:bg-amber-950/20">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Ventes retirees du tableau TVA</h3>
                  <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                    Vous pouvez les remettre sans recréer la facture de vente dans l'application.
                  </p>
                </div>
                <span className="inline-flex w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm dark:bg-slate-900 dark:text-amber-300">
                  {excludedSalesInvoices.length} facture{excludedSalesInvoices.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                {excludedSalesInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-4 dark:border-amber-900 dark:bg-slate-900/80 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{invoice.number || 'Sans numero'}</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{invoice.client?.name || 'Client'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(invoice.date).toLocaleDateString('fr-FR')} • {formatMad(invoice.totalTTC)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRestoreExcludedSale(invoice.id)}
                      disabled={salesActionLoadingId === invoice.id}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
                    >
                      <RotateCcw className="h-4 w-4" />
                      {salesActionLoadingId === invoice.id ? 'Reintegration...' : 'Reintegrer au tableau TVA'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className={TABLE_HINT_CLASS}>
            <Sparkles className="h-3.5 w-3.5" />
            Faites defiler horizontalement pour voir toutes les colonnes du tableau.
          </div>

          <div className={TABLE_CONTAINER_CLASS}>
            <table className="min-w-[1520px] divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/60">
                <tr>
                  {['Date TVA', 'N° facture', 'Source', 'Client', 'Description', 'Paiement', 'N° piece', 'HT', 'TVA', 'TTC', 'Statut', 'Actions'].map((label) => (
                    <th
                      key={label}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {periodSalesInvoices.map((invoice) => {
                  const isApplicationInvoice = invoice.sourceType === 'application';
                  const isLoadingRow = salesActionLoadingId === invoice.id;

                  return (
                    <tr key={invoice.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
                        <div>{new Date(invoice.date).toLocaleDateString('fr-FR')}</div>
                        {invoice.originalDate && invoice.originalDate !== invoice.date ? (
                          <div className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                            Origine : {new Date(invoice.originalDate).toLocaleDateString('fr-FR')}
                          </div>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {invoice.number || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            isApplicationInvoice
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                          }`}
                        >
                          {isApplicationInvoice ? 'Application' : 'Manuelle'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {getSalesCounterpart(invoice)}
                      </td>
                      <td className="min-w-[260px] px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
                        {getSalesDescription(invoice)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
                        {invoice.mode_paiement ? PAYMENT_LABELS[invoice.mode_paiement] : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
                        {invoice.numero_piece || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-200">{formatMad(invoice.subtotal)}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-200">{formatMad(invoice.totalVat)}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">{formatMad(invoice.totalTTC)}</td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
                        {invoice.isAdjusted ? (
                          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            Mois TVA modifie
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                            Standard
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {isApplicationInvoice ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openMoveSalesModal(invoice)}
                                disabled={isLoadingRow}
                                className="inline-flex items-center gap-1 rounded-xl border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-60 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30"
                              >
                                <CalendarDays className="h-3.5 w-3.5" />
                                Autre mois
                              </button>
                              {invoice.isAdjusted ? (
                                <button
                                  type="button"
                                  onClick={() => handleRestoreSale(invoice)}
                                  disabled={isLoadingRow}
                                  className="inline-flex rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                  Restaurer
                                </button>
                              ) : null}
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openEditSalesModal(invoice)}
                              disabled={isLoadingRow}
                              className="inline-flex items-center gap-1 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Modifier
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteSale(invoice)}
                            disabled={isLoadingRow}
                            className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {isLoadingRow ? 'Traitement...' : isApplicationInvoice ? 'Retirer TVA' : 'Supprimer'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!isLoading && periodSalesInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      Aucune facture vente sur cette periode.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Tableau recapitulatif achat + vente</h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Vision consolidee de toutes les ecritures TVA de la periode selectionnee.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 dark:bg-gray-900 dark:text-gray-200">
              <CalendarDays className="h-4 w-4" />
              {periodLabel(selectedPeriod)}
            </div>
          </div>

          <div className={TABLE_HINT_CLASS}>
            <Sparkles className="h-3.5 w-3.5" />
            Faites defiler horizontalement pour voir toutes les colonnes du tableau.
          </div>

          <div className={TABLE_CONTAINER_CLASS}>
            <table className="min-w-[980px] divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/60">
                <tr>
                  {['Date', 'Type', 'Tiers', 'Description', 'HT', 'TVA', 'TTC'].map((label) => (
                    <th
                      key={label}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {recapRows.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-200">{new Date(row.date).toLocaleDateString('fr-FR')}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          row.type === 'Achat'
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        }`}
                      >
                        {row.type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">{row.counterpart}</td>
                    <td className="min-w-[260px] px-4 py-4 text-sm text-gray-700 dark:text-gray-200">{row.description}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-200">{formatMad(row.ht)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-200">{formatMad(row.vat)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">{formatMad(row.ttc)}</td>
                  </tr>
                ))}

                {!isLoading && recapRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      Aucun mouvement TVA sur cette periode.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <PurchaseVatInvoiceModal
        isOpen={isPurchaseModalOpen}
        onClose={() => {
          setIsPurchaseModalOpen(false);
          setEditingPurchaseInvoice(null);
          setPrefilledAnalysisResult(null);
          setPrefilledAnalysisFileName(null);
        }}
        initialMode={purchaseInitialMode}
        invoice={editingPurchaseInvoice}
        prefilledExtractionResult={prefilledAnalysisResult}
        prefilledFileName={prefilledAnalysisFileName}
        onImported={handlePurchaseImportComplete}
      />

      <SalesVatInvoiceModal
        isOpen={isSalesModalOpen}
        onClose={() => {
          setIsSalesModalOpen(false);
          setEditingSalesInvoice(null);
        }}
        invoice={editingSalesInvoice}
      />

      <SalesVatMonthModal
        isOpen={isMoveSalesModalOpen}
        onClose={() => {
          setIsMoveSalesModalOpen(false);
          setMovingSalesInvoice(null);
        }}
        invoice={movingSalesInvoice}
        onSubmit={handleMoveSaleToMonth}
      />

      <TvaAnalysisCreditsPurchaseModal
        isOpen={isCreditsPurchaseModalOpen}
        onClose={() => setIsCreditsPurchaseModalOpen(false)}
        onPurchased={handleCreditsPurchased}
      />

      <div
        className={`pointer-events-none fixed right-6 top-6 z-[90] transition-all duration-500 ${
          importCelebration ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
        }`}
      >
        <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-white/95 px-5 py-4 shadow-2xl backdrop-blur dark:border-emerald-800 dark:bg-slate-900/95">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10" />
          <div className="relative flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <span className="absolute inset-0 rounded-2xl bg-emerald-400/20 animate-ping" />
              <CheckCircle2 className="relative h-6 w-6 animate-bounce" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Import TVA termine</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{importCelebration || ''}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

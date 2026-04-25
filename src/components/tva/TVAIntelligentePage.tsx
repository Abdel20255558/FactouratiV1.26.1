import React from 'react';
import { AlertTriangle, BarChart3, CalendarDays, Download, FileUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useVat } from '../../contexts/VatContext';
import type { ManualSalesVatInvoice, MoroccanVatRate, PurchaseVatInvoice, PurchaseVatPaymentMode, SalesVatInvoiceLike } from '../../types/vat';
import { buildVatHistory, buildVatSummary, formatMad, getCurrentVatPeriod, PAYMENT_MODE_OPTIONS, VAT_RATE_OPTIONS } from '../../utils/vat';
import PurchaseVatInvoiceModal from './PurchaseVatInvoiceModal';
import SalesVatInvoiceModal from './SalesVatInvoiceModal';
import SalesVatMonthModal from './SalesVatMonthModal';
import TVAComparisonChart from './TVAComparisonChart';

type SortField = 'date' | 'montant' | 'fournisseur';

const PAYMENT_LABELS = Object.fromEntries(PAYMENT_MODE_OPTIONS.map((option) => [option.value, option.label])) as Record<PurchaseVatPaymentMode, string>;
const KPI_CARD_CLASS =
  'rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800';

const periodLabel = (period: string) => {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month) return period;

  return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
};

const getSalesCounterpart = (invoice: SalesVatInvoiceLike) => invoice.clientName || invoice.client?.name || 'Client';
const getSalesDescription = (invoice: SalesVatInvoiceLike) =>
  invoice.description || invoice.items?.[0]?.description || invoice.number || 'Facture de vente';

export default function TVAIntelligentePage() {
  const { user } = useAuth();
  const {
    purchaseInvoices,
    salesInvoices,
    manualSalesInvoices,
    isLoading,
    deletePurchaseInvoice,
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
  const [isExporting, setIsExporting] = React.useState(false);
  const [salesActionLoadingId, setSalesActionLoadingId] = React.useState<string | null>(null);

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
    setEditingPurchaseInvoice(null);
    setPurchaseInitialMode(mode);
    setActionError('');
    setIsPurchaseModalOpen(true);
  };

  const openEditPurchaseModal = (invoice: PurchaseVatInvoice) => {
    setEditingPurchaseInvoice(invoice);
    setPurchaseInitialMode(invoice.source === 'pdf_ia' ? 'pdf' : 'manual');
    setActionError('');
    setIsPurchaseModalOpen(true);
  };

  const openCreateSalesModal = () => {
    setEditingSalesInvoice(null);
    setActionError('');
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
    setIsSalesModalOpen(true);
  };

  const openMoveSalesModal = (invoice: SalesVatInvoiceLike) => {
    setMovingSalesInvoice(invoice);
    setActionError('');
    setIsMoveSalesModalOpen(true);
  };

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
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">Analyse avec IA</p>
                <h2 className="mt-2 text-xl font-bold text-gray-900 dark:text-gray-100">Importer un PDF fournisseur</h2>
                <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300">
                  Le PDF est analyse automatiquement puis vous validez un formulaire pre-rempli.
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
              Lancer l'analyse PDF
            </button>
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

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/60">
                <tr>
                  {['Date', 'Fournisseur', 'Description', 'TTC', 'Taux TVA', 'TVA', 'HT', 'Paiement', 'N° piece', 'ICE', 'Actions'].map((label) => (
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
                    <td colSpan={11} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
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

            <button
              type="button"
              onClick={openCreateSalesModal}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:from-indigo-700 hover:to-blue-800"
            >
              <Plus className="h-4 w-4" />
              Ajouter une facture vente manuelle
            </button>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/60">
                <tr>
                  {['Date TVA', 'Source', 'Client', 'Description', 'HT', 'TVA', 'TTC', 'Statut', 'Actions'].map((label) => (
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
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
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

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
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
        }}
        initialMode={purchaseInitialMode}
        invoice={editingPurchaseInvoice}
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
    </>
  );
}

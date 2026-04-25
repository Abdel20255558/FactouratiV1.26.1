import type {
  ManualSalesVatInvoice,
  MoroccanVatRate,
  PurchaseVatPaymentMode,
  PurchaseVatInvoice,
  SalesVatAdjustment,
  SalesVatInvoiceLike,
  VatHistoryPoint,
  VatSummary,
} from '../types/vat';

export const VAT_RATE_OPTIONS: MoroccanVatRate[] = [20, 10, 7, 0];

export const PAYMENT_MODE_OPTIONS: Array<{ value: PurchaseVatPaymentMode; label: string }> = [
  { value: 'virement', label: 'Virement bancaire' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'effet', label: 'Effet de commerce' },
  { value: 'especes', label: 'Especes' },
];

export const TVA_COLLECTION = 'factures_achat_tva';
export const TVA_SALES_MANUAL_COLLECTION = 'factures_vente_tva_manuelles';
export const TVA_SALES_ADJUSTMENTS_COLLECTION = 'factures_vente_tva_ajustements';
export const TVA_AI_SETTINGS_COLLECTION = 'platformSettings';
export const TVA_AI_SETTINGS_DOC = 'openaiPdfAnalysis';

const roundToTwo = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const formatMad = (value: number) =>
  `${new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)} MAD`;

export const getCurrentVatPeriod = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const getPeriodRange = (period: string) => {
  const [yearPart, monthPart] = period.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return {
      start: '',
      end: '',
    };
  }

  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return { start, end };
};

export const getVatDeadlineLabel = (period: string) => {
  const [yearPart, monthPart] = period.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return 'le 20 du mois suivant';
  }

  const deadline = new Date(year, month, 20);

  return deadline.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const isDateInPeriod = (date: string, period: string) => {
  const { start, end } = getPeriodRange(period);
  if (!start || !end || !date) return false;
  return date >= start && date <= end;
};

export const isValidMoroccanIce = (value?: string | null) => /^\d{15}$/.test((value || '').trim());

export const calculateVatFromTTC = (ttc: number, rate: number) => {
  const safeTtc = Number.isFinite(ttc) ? ttc : 0;
  const safeRate = Number.isFinite(rate) ? rate : 0;

  if (safeRate <= 0) {
    return {
      ht: roundToTwo(safeTtc),
      vat: 0,
    };
  }

  const ht = safeTtc / (1 + safeRate / 100);
  const vat = safeTtc - ht;

  return {
    ht: roundToTwo(ht),
    vat: roundToTwo(vat),
  };
};

export const normalizeVatRate = (value: number): MoroccanVatRate => {
  if (value === 20 || value === 10 || value === 7 || value === 0) {
    return value;
  }

  return 20;
};

export const normalizePaymentMode = (value?: string | null): PurchaseVatPaymentMode => {
  const normalized = (value || '').trim().toLowerCase();

  if (normalized.includes('virement')) return 'virement';
  if (normalized.includes('cheque') || normalized.includes('chèque')) return 'cheque';
  if (normalized.includes('effet') || normalized.includes('traite') || normalized.includes('lcn')) return 'effet';
  if (normalized.includes('espece') || normalized.includes('espèce')) return 'especes';

  return 'virement';
};

export const buildVatSummary = (
  purchaseInvoices: PurchaseVatInvoice[],
  salesInvoices: SalesVatInvoiceLike[],
  period: string,
): VatSummary => {
  const filteredPurchases = purchaseInvoices.filter((invoice) => isDateInPeriod(invoice.date, period));
  const filteredSales = salesInvoices.filter((invoice) => isDateInPeriod(invoice.date, period));

  const deductibleVat = roundToTwo(filteredPurchases.reduce((sum, invoice) => sum + Number(invoice.montant_tva || 0), 0));
  const collectedVat = roundToTwo(filteredSales.reduce((sum, invoice) => sum + Number(invoice.totalVat || 0), 0));
  const purchaseTotalHT = roundToTwo(filteredPurchases.reduce((sum, invoice) => sum + Number(invoice.montant_ht || 0), 0));
  const purchaseTotalTTC = roundToTwo(filteredPurchases.reduce((sum, invoice) => sum + Number(invoice.montant_ttc || 0), 0));
  const salesTotalHT = roundToTwo(filteredSales.reduce((sum, invoice) => sum + Number(invoice.subtotal || 0), 0));
  const salesTotalTTC = roundToTwo(filteredSales.reduce((sum, invoice) => sum + Number(invoice.totalTTC || 0), 0));
  const balance = roundToTwo(collectedVat - deductibleVat);

  return {
    periode: period,
    deductibleVat,
    collectedVat,
    balance,
    totalInvoices: filteredPurchases.length + filteredSales.length,
    purchaseInvoicesCount: filteredPurchases.length,
    salesInvoicesCount: filteredSales.length,
    purchaseTotalHT,
    purchaseTotalTTC,
    salesTotalHT,
    salesTotalTTC,
    deadlineLabel: getVatDeadlineLabel(period),
    status: balance > 0 ? 'due' : 'credit',
  };
};

export const buildVatHistory = (
  purchaseInvoices: PurchaseVatInvoice[],
  salesInvoices: SalesVatInvoiceLike[],
  months = 6,
): VatHistoryPoint[] => {
  const history: VatHistoryPoint[] = [];

  for (let index = months - 1; index >= 0; index -= 1) {
    const baseDate = new Date();
    baseDate.setDate(1);
    baseDate.setMonth(baseDate.getMonth() - index);

    const period = getCurrentVatPeriod(baseDate);
    const summary = buildVatSummary(purchaseInvoices, salesInvoices, period);

    history.push({
      period,
      label: baseDate.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      purchaseVat: summary.deductibleVat,
      salesVat: summary.collectedVat,
      balance: summary.balance,
    });
  }

  return history;
};

export const mapManualSalesInvoiceToVatInvoice = (
  invoice: ManualSalesVatInvoice,
): SalesVatInvoiceLike => ({
  id: `manual-${invoice.id}`,
  sourceInvoiceId: invoice.id,
  sourceType: 'manuelle',
  number: invoice.numero_facture || undefined,
  date: invoice.date,
  originalDate: invoice.date,
  subtotal: Number(invoice.montant_ht || 0),
  totalVat: Number(invoice.montant_tva || 0),
  totalTTC: Number(invoice.montant_ttc || 0),
  clientName: invoice.client_name,
  description: invoice.description,
  client: {
    name: invoice.client_name,
  },
  items: invoice.description
    ? [
        {
          description: invoice.description,
        },
      ]
    : [],
  isAdjusted: false,
  adjustmentAction: null,
});

export const resolveSalesVatInvoices = (
  applicationInvoices: SalesVatInvoiceLike[],
  manualInvoices: ManualSalesVatInvoice[],
  adjustments: SalesVatAdjustment[],
): SalesVatInvoiceLike[] => {
  const adjustmentMap = new Map(adjustments.map((adjustment) => [adjustment.sourceInvoiceId, adjustment]));

  const applicationRows = applicationInvoices
    .map((invoice) => {
      const adjustment = adjustmentMap.get(invoice.id);

      if (adjustment?.action === 'exclude') {
        return null;
      }

      const effectiveDate =
        adjustment?.action === 'move' && adjustment.targetDate ? adjustment.targetDate : invoice.date;

      return {
        ...invoice,
        sourceType: 'application',
        sourceInvoiceId: invoice.id,
        originalDate: invoice.date,
        date: effectiveDate,
        clientName: invoice.client?.name || invoice.clientName,
        description: invoice.items?.[0]?.description || invoice.description || invoice.number || 'Facture de vente',
        isAdjusted: Boolean(adjustment),
        adjustmentAction: adjustment?.action || null,
      } satisfies SalesVatInvoiceLike;
    })
    .filter(Boolean) as SalesVatInvoiceLike[];

  const manualRows = manualInvoices.map(mapManualSalesInvoiceToVatInvoice);

  return [...applicationRows, ...manualRows].sort((left, right) => right.date.localeCompare(left.date));
};

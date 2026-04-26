import React from 'react';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, ChevronDown, FileUp, Loader2, PlusCircle, Sparkles } from 'lucide-react';
import Modal from '../common/Modal';
import { useSupplier } from '../../contexts/SupplierContext';
import { useVat } from '../../contexts/VatContext';
import type {
  MoroccanVatRate,
  PurchaseVatExtractionResult,
  PurchaseVatInvoice,
  PurchaseVatInvoiceInput,
  PurchaseVatInvoiceSource,
  PurchaseVatPaymentMode,
  VatExtractedOperation,
  VatIgnoredOperation,
} from '../../types/vat';
import { calculateVatFromTTC, formatMad, isValidMoroccanIce, PAYMENT_MODE_OPTIONS, VAT_RATE_OPTIONS } from '../../utils/vat';

interface PurchaseVatInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'manual' | 'pdf';
  invoice?: PurchaseVatInvoice | null;
  prefilledExtractionResult?: PurchaseVatExtractionResult | null;
  prefilledFileName?: string | null;
  onImported?: (summary: { achats: number; ventes: number; periods: string[] }) => void;
}

interface FormState {
  date: string;
  numero_facture: string;
  description: string;
  fournisseur: string;
  montant_ttc: string;
  taux_tva: MoroccanVatRate;
  mode_paiement: PurchaseVatInvoiceInput['mode_paiement'];
  numero_piece: string;
  ice_fournisseur: string;
}

interface DraftOp extends VatExtractedOperation {
  selected: boolean;
  source: 'ai' | 'ignored';
}

const PURCHASE_AI_FIELDS = ['date', 'numero_facture', 'fournisseur', 'description', 'montant_ttc', 'taux_tva', 'montant_tva', 'montant_ht', 'mode_paiement', 'numero_piece', 'ice_fournisseur'] as const;
const inputClass = 'w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-teal-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100';
const compactInputClass = 'w-full min-w-0 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-[11px] leading-4 text-gray-900 outline-none transition focus:border-teal-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100';
const compactReadOnlyClass = 'w-full min-w-0 rounded-xl bg-slate-50 px-2 py-1.5 text-[11px] font-semibold leading-4 text-slate-900 dark:bg-slate-800 dark:text-slate-100';
const tableHeadClass = 'whitespace-nowrap px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500 dark:text-gray-400';
const tableCellClass = 'px-2 py-2 align-top text-xs text-gray-700 dark:text-gray-200';
const tableHintClass =
  'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';

const roundToTwo = (value: number) => Math.round(value * 100) / 100;
const inferClosestVatRate = (montantTtc: number, montantTva: number): MoroccanVatRate => {
  if (!Number.isFinite(montantTtc) || montantTtc <= 0 || !Number.isFinite(montantTva) || montantTva <= 0) return 0;

  const montantHt = montantTtc - montantTva;
  if (montantHt <= 0) return 20;

  const rawRate = (montantTva / montantHt) * 100;
  return VAT_RATE_OPTIONS.reduce((closest, rate) =>
    Math.abs(rate - rawRate) < Math.abs(closest - rawRate) ? rate : closest,
  VAT_RATE_OPTIONS[0]) as MoroccanVatRate;
};

const defaultFormState = (): FormState => ({
  date: new Date().toISOString().split('T')[0],
  numero_facture: '',
  description: '',
  fournisseur: '',
  montant_ttc: '',
  taux_tva: 20,
  mode_paiement: 'virement',
  numero_piece: '',
  ice_fournisseur: '',
});

const isPieceNumberRequired = (mode: PurchaseVatPaymentMode) => mode === 'cheque' || mode === 'effet';

const normalizeDraftOperation = (op: VatExtractedOperation): DraftOp =>
  syncDraftAmounts({
    ...op,
    sens: op.sens === 'vente' ? 'vente' : 'achat',
    fournisseur_client: `${op.fournisseur_client || ''}`.trim() || 'Tiers a verifier',
    description: `${op.description || ''}`.trim() || `${op.fournisseur_client || ''}`.trim() || 'Operation a verifier',
    numero_piece: op.numero_piece || null,
    selected: true,
    source: 'ai',
  });

const syncDraftAmounts = (op: DraftOp): DraftOp => {
  const amounts = calculateVatFromTTC(Number(op.montant_ttc || 0), op.taux_tva);
  return { ...op, montant_ttc: Number.isFinite(Number(op.montant_ttc)) ? Number(op.montant_ttc) : 0, montant_ht: amounts.ht, montant_tva: amounts.vat };
};

const draftFromIgnored = (op: VatIgnoredOperation): DraftOp =>
  syncDraftAmounts({
    id: `draft-${op.id}`,
    selected: true,
    source: 'ignored',
    sens: 'achat',
    date: op.date,
    numero_facture: null,
    fournisseur_client: op.libelle,
    description: op.libelle,
    montant_ttc: Math.abs(Number(op.montant || 0)),
    taux_tva: 20,
    montant_tva: 0,
    montant_ht: 0,
    mode_paiement: 'virement',
    numero_piece: null,
    ice: null,
    ignoree: false,
  });

const buildAiMetadata = (op: DraftOp) => {
  if (op.source !== 'ai') return { aiExtractedFields: [] as string[], aiMissingFields: [] as string[] };
  const values = {
    date: op.date,
    numero_facture: op.numero_facture,
    fournisseur: op.fournisseur_client,
    description: op.description,
    montant_ttc: op.montant_ttc,
    taux_tva: op.taux_tva,
    montant_tva: op.montant_tva,
    montant_ht: op.montant_ht,
    mode_paiement: op.mode_paiement,
    numero_piece: op.numero_piece,
    ice_fournisseur: op.ice,
  } as const;
  const aiExtractedFields = PURCHASE_AI_FIELDS.filter((field) => `${values[field] ?? ''}`.trim() !== '');
  return { aiExtractedFields, aiMissingFields: PURCHASE_AI_FIELDS.filter((field) => !aiExtractedFields.includes(field)) };
};

const buildPurchasePayload = (op: DraftOp): PurchaseVatInvoiceInput => {
  const metadata = buildAiMetadata(op);
  const source: PurchaseVatInvoiceSource = op.source === 'ai' ? 'pdf_ia' : 'manuelle';
  return {
    date: op.date,
    numero_facture: op.numero_facture,
    fournisseur: op.fournisseur_client.trim(),
    ice_fournisseur: op.ice,
    description: op.description.trim(),
    montant_ttc: op.montant_ttc,
    montant_ht: op.montant_ht,
    taux_tva: op.taux_tva,
    montant_tva: op.montant_tva,
    mode_paiement: op.mode_paiement,
    numero_piece: op.mode_paiement === 'cheque' || op.mode_paiement === 'effet' ? op.numero_piece : null,
    source,
    aiExtractedFields: metadata.aiExtractedFields,
    aiMissingFields: metadata.aiMissingFields,
  };
};

const validateDraft = (op: DraftOp) => {
  if (!op.date) return 'Chaque ligne importee doit avoir une date.';
  if (!op.fournisseur_client.trim()) return 'Chaque ligne importee doit avoir un fournisseur ou un client.';
  if (!op.description.trim()) return 'Chaque ligne importee doit avoir une description.';
  if (!Number.isFinite(Number(op.montant_ttc)) || Number(op.montant_ttc) <= 0) return 'Chaque ligne importee doit avoir un montant TTC superieur a 0.';
  return null;
};

function FieldLabel({ label, showAiBadge, isHighlighted }: { label: string; showAiBadge: boolean; isHighlighted?: boolean }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className={`text-sm font-medium ${isHighlighted ? 'text-orange-700 dark:text-orange-300' : 'text-gray-700 dark:text-gray-200'}`}>{label}</span>
      {showAiBadge ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Extrait par IA</span> : null}
    </div>
  );
}

const fieldClassName = (highlight = false) => `w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
  highlight ? 'border-orange-300 bg-orange-50 text-orange-900 focus:border-orange-400 dark:border-orange-700 dark:bg-orange-950/30 dark:text-orange-100' : 'border-gray-300 bg-white text-gray-900 focus:border-teal-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
}`;

const collectImportedPeriods = (operations: DraftOp[]) =>
  Array.from(
    new Set(
      operations
        .map((op) => op.date?.slice(0, 7))
        .filter((period): period is string => Boolean(period && /^\d{4}-\d{2}$/.test(period))),
    ),
  ).sort((left, right) => right.localeCompare(left));

export default function PurchaseVatInvoiceModal({
  isOpen,
  onClose,
  initialMode = 'manual',
  invoice,
  prefilledExtractionResult,
  prefilledFileName,
  onImported,
}: PurchaseVatInvoiceModalProps) {
  const { suppliers } = useSupplier();
  const { createPurchaseInvoice, updatePurchaseInvoice, createManualSalesInvoice, extractPurchaseInvoicePdf } = useVat();
  const [entryMode, setEntryMode] = React.useState<'manual' | 'pdf'>(initialMode);
  const [form, setForm] = React.useState<FormState>(defaultFormState);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = React.useState('');
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [extractMessage, setExtractMessage] = React.useState('');
  const [extractWarnings, setExtractWarnings] = React.useState<string[]>([]);
  const [aiFilledFields, setAiFilledFields] = React.useState<string[]>([]);
  const [missingFields, setMissingFields] = React.useState<string[]>([]);
  const [draftOperations, setDraftOperations] = React.useState<DraftOp[]>([]);
  const [ignoredOperations, setIgnoredOperations] = React.useState<VatIgnoredOperation[]>([]);
  const [selectedIgnoredIds, setSelectedIgnoredIds] = React.useState<string[]>([]);
  const [addedIgnoredIds, setAddedIgnoredIds] = React.useState<string[]>([]);
  const [showIgnoredOperations, setShowIgnoredOperations] = React.useState(false);
  const [documentType, setDocumentType] = React.useState<string | null>(null);
  const [detectedPeriod, setDetectedPeriod] = React.useState<string | null>(null);
  const [analysisCacheInfo, setAnalysisCacheInfo] = React.useState<PurchaseVatExtractionResult['cache_info']>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setEntryMode(invoice ? (invoice.source === 'pdf_ia' ? 'pdf' : 'manual') : initialMode);
    setSelectedFile(null);
    setSelectedFileName(prefilledFileName || '');
    setIsExtracting(false);
    setIsSaving(false);
    setErrorMessage('');
    setExtractMessage('');
    setExtractWarnings([]);
    setDraftOperations([]);
    setIgnoredOperations([]);
    setSelectedIgnoredIds([]);
    setAddedIgnoredIds([]);
    setShowIgnoredOperations(false);
    setDocumentType(null);
    setDetectedPeriod(null);
    setAnalysisCacheInfo(null);
    if (invoice) {
      setForm({ date: invoice.date, numero_facture: invoice.numero_facture || '', description: invoice.description, fournisseur: invoice.fournisseur, montant_ttc: String(invoice.montant_ttc), taux_tva: invoice.taux_tva, mode_paiement: invoice.mode_paiement, numero_piece: invoice.numero_piece || '', ice_fournisseur: invoice.ice_fournisseur || '' });
      setAiFilledFields(invoice.aiExtractedFields || []);
      setMissingFields(invoice.aiMissingFields || []);
      return;
    }
    if (initialMode === 'pdf' && prefilledExtractionResult) {
      const rows = prefilledExtractionResult.factures.map((op) => normalizeDraftOperation(op));
      setDraftOperations(rows);
      setIgnoredOperations(prefilledExtractionResult.operations_ignorees || []);
      setDocumentType(prefilledExtractionResult.type_document);
      setDetectedPeriod(prefilledExtractionResult.periode);
      setShowIgnoredOperations(Boolean(prefilledExtractionResult.operations_ignorees?.length));
      setAnalysisCacheInfo(prefilledExtractionResult.cache_info || null);
      const achats = rows.filter((op) => op.sens === 'achat');
      const ventes = rows.filter((op) => op.sens === 'vente');
      console.log('Achats detectes:', achats.length);
      console.log('Ventes detectees:', ventes.length);
      setExtractWarnings([
        ...(achats.length === 0 ? ["Aucun achat detecte dans ce releve. Verifiez si c'est normal ou ajoutez manuellement."] : []),
        ...(ventes.length === 0 ? ["Aucune vente detectee dans ce releve. Verifiez si c'est normal ou ajoutez manuellement."] : []),
      ]);
      setExtractMessage(
        rows.length
          ? 'Analyse terminee - Verifiez et validez vos operations'
          : 'Aucune operation comptable valide detectee. Vous pouvez passer en saisie manuelle ou ajouter une operation exclue.',
      );
    }
    setForm(defaultFormState());
    setAiFilledFields([]);
    setMissingFields([]);
  }, [initialMode, invoice, isOpen, prefilledExtractionResult, prefilledFileName]);
  const isPdfImportMode = entryMode === 'pdf' && !invoice;
  const ttcValue = Number(form.montant_ttc || 0);
  const amounts = React.useMemo(() => calculateVatFromTTC(ttcValue, form.taux_tva), [form.taux_tva, ttcValue]);
  const isPieceRequired = isPieceNumberRequired(form.mode_paiement);
  const hasInvalidIce = Boolean(form.ice_fournisseur.trim()) && !isValidMoroccanIce(form.ice_fournisseur);
  const isHighlightedByAi = (field: string, value: string | number | null | undefined) => missingFields.includes(field) && `${value ?? ''}`.trim() === '';
  const selectedOperations = draftOperations.filter((op) => op.selected);
  const purchaseDraftOperations = draftOperations.filter((op) => op.sens === 'achat');
  const salesDraftOperations = draftOperations.filter((op) => op.sens === 'vente');
  const selectedPurchaseCount = purchaseDraftOperations.filter((op) => op.selected).length;
  const selectedSalesCount = salesDraftOperations.filter((op) => op.selected).length;
  const importButtonLabel = `Importer tout (${selectedPurchaseCount} achats + ${selectedSalesCount} ventes)`;

  const syncSupplierMetadata = (name: string) => {
    const supplier = suppliers.find((item) => item.name.trim().toLowerCase() === name.trim().toLowerCase());
    setForm((prev) => ({ ...prev, fournisseur: name, ice_fournisseur: supplier ? prev.ice_fournisseur || supplier.ice || '' : prev.ice_fournisseur }));
  };

  const handleFormChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    if (field === 'fournisseur') return syncSupplierMetadata(String(value));
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleExtract = async () => {
    if (!selectedFile) return setErrorMessage("Selectionnez un PDF pour lancer l'analyse.");
    setIsExtracting(true);
    setErrorMessage('');
    setExtractMessage('');
    setExtractWarnings([]);
    setAnalysisCacheInfo(null);
    try {
      const result = await extractPurchaseInvoicePdf(selectedFile);
      const rows = result.factures.map((op) => normalizeDraftOperation(op));
      const achats = rows.filter((op) => op.sens === 'achat');
      const ventes = rows.filter((op) => op.sens === 'vente');
      console.log('Achats detectes:', achats.length);
      console.log('Ventes detectees:', ventes.length);
      setDraftOperations(rows);
      setIgnoredOperations(result.operations_ignorees || []);
      setSelectedIgnoredIds([]);
      setAddedIgnoredIds([]);
      setDocumentType(result.type_document);
      setDetectedPeriod(result.periode);
      setShowIgnoredOperations(Boolean(result.operations_ignorees?.length));
      setSelectedFileName(selectedFile.name || '');
      setAnalysisCacheInfo(result.cache_info || null);
      setExtractWarnings([
        ...(achats.length === 0 ? ["Aucun achat detecte dans ce releve. Verifiez si c'est normal ou ajoutez manuellement."] : []),
        ...(ventes.length === 0 ? ["Aucune vente detectee dans ce releve. Verifiez si c'est normal ou ajoutez manuellement."] : []),
      ]);
      setExtractMessage(rows.length ? 'Analyse terminée — Vérifiez et validez vos opérations' : 'Aucune operation comptable valide detectee. Vous pouvez passer en saisie manuelle ou ajouter une operation exclue.');
    } catch (error) {
      setDraftOperations([]);
      setIgnoredOperations([]);
      setSelectedIgnoredIds([]);
      setAddedIgnoredIds([]);
      setDocumentType(null);
      setDetectedPeriod(null);
      setExtractWarnings([]);
      setAnalysisCacheInfo(null);
      if (error instanceof Error && error.message.includes('ANALYSIS_CREDITS_REQUIRED')) {
        setErrorMessage("Vous n'avez plus d'analyses IA disponibles. Rechargez votre compte pour continuer.");
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Impossible de lire ce PDF, veuillez saisir manuellement.');
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const updateDraft = (
    id: string,
    updater: (op: DraftOp) => DraftOp,
    options?: { syncAmounts?: boolean },
  ) => {
    setDraftOperations((prev) =>
      prev.map((op) => {
        if (op.id !== id) return op;
        const nextOperation = updater(op);
        return options?.syncAmounts === false ? nextOperation : syncDraftAmounts(nextOperation);
      }),
    );
  };

  const toggleSectionSelection = (sens: 'achat' | 'vente') => {
    setDraftOperations((prev) => {
      const rows = prev.filter((op) => op.sens === sens);
      const shouldSelectAll = rows.some((op) => !op.selected);
      return prev.map((op) => (op.sens === sens ? { ...op, selected: shouldSelectAll } : op));
    });
  };

  const handleDraftChange = (id: string, field: 'sens' | 'date' | 'numero_facture' | 'fournisseur_client' | 'description' | 'montant_ttc' | 'montant_tva' | 'taux_tva' | 'mode_paiement' | 'numero_piece' | 'ice', value: string) => {
    if (field === 'montant_tva') {
      setDraftOperations((prev) =>
        prev.map((op) => {
          if (op.id !== id) return op;

          const nextVat = Number.isFinite(Number(value)) ? Number(value) : 0;
          const clampedVat = Math.max(0, Math.min(nextVat, Number(op.montant_ttc) || 0));
          const nextHt = roundToTwo((Number(op.montant_ttc) || 0) - clampedVat);

          return {
            ...op,
            montant_tva: roundToTwo(clampedVat),
            montant_ht: nextHt,
            taux_tva: inferClosestVatRate(Number(op.montant_ttc) || 0, clampedVat),
          };
        }),
      );
      return;
    }

    updateDraft(id, (op) => {
      if (field === 'montant_ttc') {
        return { ...op, montant_ttc: Number.isFinite(Number(value)) ? Number(value) : 0 };
      }

      if (field === 'taux_tva') {
        return { ...op, taux_tva: Number(value) as MoroccanVatRate };
      }

      if (field === 'sens') {
        return { ...op, sens: value === 'vente' ? 'vente' : 'achat' };
      }

      if (field === 'mode_paiement') {
        const nextMode = value as PurchaseVatPaymentMode;
        return {
          ...op,
          mode_paiement: nextMode,
          numero_piece: isPieceNumberRequired(nextMode) ? op.numero_piece : null,
        };
      }

      return {
        ...op,
        [field]: value.trim() || null,
      };
    }, { syncAmounts: field === 'montant_ttc' || field === 'taux_tva' });
  };

  const buildManualPayload = (): PurchaseVatInvoiceInput | null => {
    if (!form.date) return setErrorMessage('La date est obligatoire.'), null;
    if (!form.description.trim()) return setErrorMessage('La description est obligatoire.'), null;
    if (!form.fournisseur.trim()) return setErrorMessage('Le fournisseur est obligatoire.'), null;
    if (!Number.isFinite(ttcValue) || ttcValue <= 0) return setErrorMessage('Le montant TTC doit etre superieur a 0.'), null;
    const source: PurchaseVatInvoiceSource = entryMode === 'pdf' && invoice?.source === 'pdf_ia' ? 'pdf_ia' : 'manuelle';
    return {
      date: form.date,
      numero_facture: form.numero_facture.trim() || null,
      fournisseur: form.fournisseur.trim(),
      ice_fournisseur: form.ice_fournisseur.trim() || null,
      description: form.description.trim(),
      montant_ttc: ttcValue,
      montant_ht: amounts.ht,
      taux_tva: form.taux_tva,
      montant_tva: amounts.vat,
      mode_paiement: form.mode_paiement,
      numero_piece: isPieceRequired ? form.numero_piece.trim() : null,
      source,
      aiExtractedFields: aiFilledFields,
      aiMissingFields: missingFields,
    };
  };

  const submitManual = async () => {
    const payload = buildManualPayload();
    if (!payload) return;
    setIsSaving(true);
    setErrorMessage('');
    try {
      if (invoice) await updatePurchaseInvoice(invoice.id, payload);
      else await createPurchaseInvoice(payload);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible d'enregistrer la facture achat.");
    } finally {
      setIsSaving(false);
    }
  };

  const addIgnoredToTable = () => {
    const rows = ignoredOperations.filter((op) => selectedIgnoredIds.includes(op.id) && !addedIgnoredIds.includes(op.id));
    if (!rows.length) return setErrorMessage('Selectionnez au moins une operation exclue a ajouter.');
    setDraftOperations((prev) => [...prev, ...rows.map((op) => draftFromIgnored(op))]);
    setAddedIgnoredIds((prev) => [...prev, ...rows.map((op) => op.id)]);
    setSelectedIgnoredIds([]);
    setErrorMessage('');
  };

  const importSelected = async () => {
    if (!selectedOperations.length) return setErrorMessage('Selectionnez au moins une ligne a importer.');
    for (const op of selectedOperations) {
      const validationError = validateDraft(op);
      if (validationError) return setErrorMessage(validationError);
    }
    setIsSaving(true);
    setErrorMessage('');
    try {
      let achats = 0;
      let ventes = 0;
      const periods = collectImportedPeriods(selectedOperations);
      for (const op of selectedOperations) {
        if (op.sens === 'vente') {
          await createManualSalesInvoice({
            date: op.date,
            numero_facture: op.numero_facture,
            client_name: op.fournisseur_client.trim(),
            description: op.description.trim(),
            montant_ttc: op.montant_ttc,
            montant_ht: op.montant_ht,
            taux_tva: op.taux_tva,
            montant_tva: op.montant_tva,
            mode_paiement: op.mode_paiement,
            numero_piece: op.mode_paiement === 'cheque' || op.mode_paiement === 'effet' ? op.numero_piece : null,
          });
          ventes += 1;
        } else {
          await createPurchaseInvoice(buildPurchasePayload(op));
          achats += 1;
        }
      }
      onImported?.({ achats, ventes, periods });
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible d'importer les lignes selectionnees.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderDetectedSection = (
    sens: 'achat' | 'vente',
    operations: DraftOp[],
  ) => {
    if (!operations.length) return null;

    const isPurchaseSection = sens === 'achat';
    const selectedCount = operations.filter((op) => op.selected).length;
    const allSelected = operations.every((op) => op.selected);
    const Icon = isPurchaseSection ? ArrowDownLeft : ArrowUpRight;
    const sectionTitle = isPurchaseSection ? 'Factures Achat detectees' : 'Factures Vente detectees';
    const sectionCountLabel = `${operations.length} facture${operations.length > 1 ? 's' : ''} ${isPurchaseSection ? 'achat' : 'vente'}`;
    const sectionClasses = isPurchaseSection
      ? {
          wrapper: 'border-orange-200 bg-orange-50/70 dark:border-orange-800 dark:bg-orange-950/20',
          badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
          title: 'text-orange-900 dark:text-orange-200',
          help: 'text-orange-700 dark:text-orange-300',
        }
      : {
          wrapper: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/20',
          badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
          title: 'text-emerald-900 dark:text-emerald-200',
          help: 'text-emerald-700 dark:text-emerald-300',
        };

    return (
      <section key={sens} className={`rounded-3xl border ${sectionClasses.wrapper}`}>
        <div className="flex flex-col gap-4 border-b border-black/5 px-5 py-4 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 rounded-2xl p-2 ${sectionClasses.badge}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <h4 className={`text-base font-semibold ${sectionClasses.title}`}>{sectionTitle}</h4>
              <p className={`mt-1 text-sm ${sectionClasses.help}`}>{sectionCountLabel}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => toggleSectionSelection(sens)}
                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              {allSelected ? 'Tout deselectionner' : 'Tout selectionner'}
            </label>
            <div className={`rounded-full px-3 py-1 text-sm font-semibold ${sectionClasses.badge}`}>
              {selectedCount} selectionnee{selectedCount > 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto px-4 pb-5 pt-4">
          <table className="min-w-[1030px] w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
            <colgroup>
              <col style={{ width: '40px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '160px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '120px' }} />
            </colgroup>
            <thead className="bg-white/80 dark:bg-slate-900/70">
              <tr>
                <th className={tableHeadClass}>Choix</th>
                <th className={tableHeadClass}>Sens</th>
                <th className={tableHeadClass}>Date</th>
                <th className={tableHeadClass}>N° facture</th>
                <th className={tableHeadClass}>{isPurchaseSection ? 'Fournisseur' : 'Client'}</th>
                <th className={tableHeadClass}>Montant TTC</th>
                <th className={tableHeadClass}>TVA</th>
                <th className={tableHeadClass}>Mode paiement</th>
                <th className={tableHeadClass}>N° piece</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {operations.map((op) => {
                const pieceRequired = isPieceNumberRequired(op.mode_paiement);
                return (
                  <tr key={op.id} className="bg-white/90 dark:bg-slate-950/10">
                    <td className={tableCellClass}>
                      <input
                        type="checkbox"
                        checked={op.selected}
                        onChange={() =>
                          setDraftOperations((prev) =>
                            prev.map((row) => (row.id === op.id ? { ...row, selected: !row.selected } : row)),
                          )
                        }
                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                    </td>
                    <td className={tableCellClass}>
                      <select value={op.sens} onChange={(event) => handleDraftChange(op.id, 'sens', event.target.value)} className={compactInputClass}>
                        <option value="achat">Achat</option>
                        <option value="vente">Vente</option>
                      </select>
                    </td>
                    <td className={tableCellClass}>
                      <input type="date" value={op.date} onChange={(event) => handleDraftChange(op.id, 'date', event.target.value)} className={compactInputClass} />
                    </td>
                    <td className={tableCellClass}>
                      <input type="text" value={op.numero_facture || ''} onChange={(event) => handleDraftChange(op.id, 'numero_facture', event.target.value)} className={compactInputClass} placeholder="Numero facture" />
                    </td>
                    <td className={tableCellClass}>
                      <input type="text" value={op.fournisseur_client} onChange={(event) => handleDraftChange(op.id, 'fournisseur_client', event.target.value)} className={compactInputClass} placeholder={isPurchaseSection ? 'Fournisseur' : 'Client'} />
                    </td>
                    <td className={tableCellClass}>
                      <div className={compactReadOnlyClass}>
                        {formatMad(op.montant_ttc)}
                      </div>
                    </td>
                    <td className={tableCellClass}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={Number.isFinite(op.montant_tva) ? op.montant_tva : 0}
                        onChange={(event) => handleDraftChange(op.id, 'montant_tva', event.target.value)}
                        className={compactInputClass}
                        placeholder="TVA"
                      />
                    </td>
                    <td className={tableCellClass}>
                      <select value={op.mode_paiement} onChange={(event) => handleDraftChange(op.id, 'mode_paiement', event.target.value)} className={compactInputClass}>
                        {PAYMENT_MODE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className={tableCellClass}>
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={op.numero_piece || ''}
                          onChange={(event) => handleDraftChange(op.id, 'numero_piece', event.target.value)}
                          className={compactInputClass}
                          placeholder={pieceRequired ? 'N° piece' : 'Optionnel'}
                        />
                        {!pieceRequired ? (
                          <span className="block text-[10px] text-gray-400 dark:text-gray-500">Non requis pour ce mode</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isPdfImportMode) await importSelected();
    else await submitManual();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={invoice ? 'Modifier une facture achat TVA' : 'Nouvelle facture achat TVA'} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setEntryMode('manual')} className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${entryMode === 'manual' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'}`}>Saisie manuelle</button>
          <button type="button" onClick={() => setEntryMode('pdf')} className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${entryMode === 'pdf' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'}`}>Import PDF avec IA</button>
        </div>
        {isPdfImportMode ? (
          <div className="space-y-5">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-800 dark:bg-emerald-950/30">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h4 className="text-base font-semibold text-emerald-900 dark:text-emerald-200">Importez votre relevé bancaire</h4>
                  <p className="mt-2 text-sm leading-6 text-emerald-800 dark:text-emerald-300">Importez votre relevé bancaire — Factourati s&apos;occupe du reste. Notre IA détecte automatiquement vos factures achat et vente, filtre les opérations non comptables, et prépare votre déclaration TVA. Vous n&apos;avez qu&apos;à vérifier et valider.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-emerald-300 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-slate-800">
                    <FileUp className="h-4 w-4" /> Choisir un PDF
                    <input type="file" accept="application/pdf" className="hidden" onChange={(event) => { setSelectedFile(event.target.files?.[0] || null); setSelectedFileName(event.target.files?.[0]?.name || ''); setAnalysisCacheInfo(null); setErrorMessage(''); setExtractMessage(''); setExtractWarnings([]); setDraftOperations([]); setIgnoredOperations([]); setSelectedIgnoredIds([]); setAddedIgnoredIds([]); }} />
                  </label>
                  <button type="button" onClick={handleExtract} disabled={isExtracting || !selectedFile} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-emerald-700 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-50">
                    {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {isExtracting ? 'Factourati analyse votre relevé bancaire...' : 'Extraire avec IA'}
                  </button>
                </div>
              </div>
              {(selectedFile || selectedFileName) ? <p className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-300">Fichier selectionne : {selectedFile?.name || selectedFileName}</p> : null}
              <p className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-300">Formats acceptés : PDF — Taille max : 10 MB</p>
              {analysisCacheInfo?.cacheHit ? <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white/90 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-700 dark:bg-slate-900/80 dark:text-emerald-300"><Sparkles className="h-3.5 w-3.5" />Resultat mis en cache - Analyse le {analysisCacheInfo.analyse_date ? new Date(analysisCacheInfo.analyse_date).toLocaleString('fr-FR') : 'precedemment'}</div> : null}
              {extractMessage ? <div className="mt-4 rounded-2xl border border-emerald-300 bg-white/90 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-700 dark:bg-slate-900/80 dark:text-emerald-300">{extractMessage}</div> : null}
            </div>
            {extractWarnings.length ? (
              <div className="space-y-3">
                {extractWarnings.map((warning) => (
                  <div key={warning} className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
                    {warning}
                  </div>
                ))}
              </div>
            ) : null}
            {!draftOperations.length ? <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">Analysez d&apos;abord le PDF pour afficher les lignes extraites, les verifier et choisir celles a importer.</div> : null}
            {draftOperations.length ? (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-4 dark:border-teal-800 dark:bg-teal-950/30"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">Type document</p><p className="mt-2 text-base font-semibold text-gray-900 dark:text-gray-100">{documentType === 'releve_bancaire' ? 'Releve bancaire' : documentType === 'factures_multiples' ? 'Factures multiples' : 'Facture unique'}</p></div>
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 dark:border-blue-800 dark:bg-blue-950/30"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">Lignes extraites</p><p className="mt-2 text-base font-semibold text-gray-900 dark:text-gray-100">{draftOperations.length} ligne{draftOperations.length > 1 ? 's' : ''}</p></div>
                  <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4 dark:border-violet-800 dark:bg-violet-950/30"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">Periode detectee</p><p className="mt-2 text-base font-semibold text-gray-900 dark:text-gray-100">{detectedPeriod || 'Non detectee'}</p></div>
                </div>
                <div className="space-y-5">
                  {renderDetectedSection('achat', purchaseDraftOperations)}
                  {renderDetectedSection('vente', salesDraftOperations)}
                </div>
                <div className="hidden">
                  <div className="px-5 pt-4">
                    <div className={tableHintClass}>
                      <Sparkles className="h-3.5 w-3.5" />
                      Faites defiler horizontalement pour afficher tout le tableau extrait.
                    </div>
                  </div>
                  <div className="overflow-x-auto px-5 pb-5 pt-4">
                    <table className="min-w-[1460px] divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900"><tr><th className={tableHeadClass}>Choix</th><th className={tableHeadClass}>Sens</th><th className={tableHeadClass}>Date</th><th className={tableHeadClass}>N° facture</th><th className={tableHeadClass}>Fournisseur / Client</th><th className={tableHeadClass}>Description</th><th className={tableHeadClass}>TTC</th><th className={tableHeadClass}>TVA</th><th className={tableHeadClass}>Paiement</th><th className={tableHeadClass}>N° piece</th><th className={tableHeadClass}>ICE</th></tr></thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {draftOperations.map((op) => (
                          <tr key={op.id} className="bg-white dark:bg-transparent">
                            <td className={tableCellClass}><input type="checkbox" checked={op.selected} onChange={() => setDraftOperations((prev) => prev.map((row) => row.id === op.id ? { ...row, selected: !row.selected } : row))} className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" /></td>
                            <td className={tableCellClass}><select value={op.sens} onChange={(event) => handleDraftChange(op.id, 'sens', event.target.value)} className={compactInputClass}><option value="achat">Achat</option><option value="vente">Vente</option></select></td>
                            <td className={tableCellClass}><input type="date" value={op.date} onChange={(event) => handleDraftChange(op.id, 'date', event.target.value)} className={compactInputClass} /></td>
                            <td className={tableCellClass}><input type="text" value={op.numero_facture || ''} onChange={(event) => handleDraftChange(op.id, 'numero_facture', event.target.value)} className={compactInputClass} placeholder="Numero" /></td>
                            <td className={tableCellClass}><input type="text" value={op.fournisseur_client} onChange={(event) => handleDraftChange(op.id, 'fournisseur_client', event.target.value)} className={compactInputClass} placeholder="Tiers" /></td>
                            <td className={tableCellClass}><textarea rows={2} value={op.description} onChange={(event) => handleDraftChange(op.id, 'description', event.target.value)} className={compactInputClass} placeholder="Description" /></td>
                            <td className={tableCellClass}><div className="space-y-2"><input type="number" min="0" step="0.01" value={op.montant_ttc} onChange={(event) => handleDraftChange(op.id, 'montant_ttc', event.target.value)} className={compactInputClass} /><select value={op.taux_tva} onChange={(event) => handleDraftChange(op.id, 'taux_tva', event.target.value)} className={compactInputClass}>{VAT_RATE_OPTIONS.map((rate) => <option key={rate} value={rate}>{rate}%</option>)}</select></div></td>
                            <td className={tableCellClass}><div className="space-y-1 whitespace-nowrap"><p className="font-semibold text-gray-900 dark:text-gray-100">{formatMad(op.montant_tva)}</p><p className="text-xs text-gray-500 dark:text-gray-400">HT : {formatMad(op.montant_ht)}</p></div></td>
                            <td className={tableCellClass}><select value={op.mode_paiement} onChange={(event) => handleDraftChange(op.id, 'mode_paiement', event.target.value)} className={compactInputClass}>{PAYMENT_MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></td>
                            <td className={tableCellClass}><input type="text" value={op.numero_piece || ''} onChange={(event) => handleDraftChange(op.id, 'numero_piece', event.target.value)} className={compactInputClass} placeholder="Cheque / effet" /></td>
                            <td className={tableCellClass}><input type="text" value={op.ice || ''} onChange={(event) => handleDraftChange(op.id, 'ice', event.target.value)} className={compactInputClass} placeholder="15 chiffres" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-900/30">
                  <button type="button" onClick={() => setShowIgnoredOperations((prev) => !prev)} className="flex w-full items-center justify-between gap-4 text-left"><div><h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Operations exclues ({ignoredOperations.length})</h4><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Les operations filtrees par l&apos;IA sont listees ici avec la raison d&apos;exclusion.</p></div><ChevronDown className={`h-5 w-5 text-gray-500 transition-transform dark:text-gray-400 ${showIgnoredOperations ? 'rotate-180' : ''}`} /></button>
                  {showIgnoredOperations ? <div className="mt-4 space-y-4">{ignoredOperations.length ? <><div className="space-y-3">{ignoredOperations.map((op) => { const isAdded = addedIgnoredIds.includes(op.id); return <label key={op.id} className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${isAdded ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/40'}`}><input type="checkbox" checked={selectedIgnoredIds.includes(op.id)} onChange={() => setSelectedIgnoredIds((prev) => prev.includes(op.id) ? prev.filter((id) => id !== op.id) : [...prev, op.id])} disabled={isAdded} className="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{op.libelle}</span><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">{formatMad(op.montant)}</span>{isAdded ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Ajoutee au tableau</span> : null}</div><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{op.date} - Raison : {op.raison_exclusion}</p></div></label>; })}</div><button type="button" onClick={addIgnoredToTable} disabled={!selectedIgnoredIds.length} className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"><PlusCircle className="h-4 w-4" /> Ajouter les operations cochees au tableau</button></> : <p className="text-sm text-gray-500 dark:text-gray-400">Aucune operation exclue pour ce document.</p>}</div> : null}
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            <div><FieldLabel label="Date *" showAiBadge={aiFilledFields.includes('date')} isHighlighted={isHighlightedByAi('date', form.date)} /><input type="date" value={form.date} onChange={(event) => handleFormChange('date', event.target.value)} className={fieldClassName(isHighlightedByAi('date', form.date))} /></div>
            <div><FieldLabel label="Numero de facture" showAiBadge={aiFilledFields.includes('numero_facture')} isHighlighted={isHighlightedByAi('numero_facture', form.numero_facture)} /><input type="text" value={form.numero_facture} onChange={(event) => handleFormChange('numero_facture', event.target.value)} className={fieldClassName(isHighlightedByAi('numero_facture', form.numero_facture))} placeholder="Ex: FAC-2026-0045" /></div>
            <div className="md:row-span-2"><FieldLabel label="Description *" showAiBadge={aiFilledFields.includes('description')} isHighlighted={isHighlightedByAi('description', form.description)} /><textarea rows={5} value={form.description} onChange={(event) => handleFormChange('description', event.target.value)} className={fieldClassName(isHighlightedByAi('description', form.description))} placeholder="Ex: Achat fournitures bureau, prestation consultant..." /></div>
            <div><FieldLabel label="Fournisseur *" showAiBadge={aiFilledFields.includes('fournisseur')} isHighlighted={isHighlightedByAi('fournisseur', form.fournisseur)} /><input list="tva-fournisseurs-list" value={form.fournisseur} onChange={(event) => handleFormChange('fournisseur', event.target.value)} className={fieldClassName(isHighlightedByAi('fournisseur', form.fournisseur))} placeholder="Nom du fournisseur" /><datalist id="tva-fournisseurs-list">{suppliers.map((supplier) => <option key={supplier.id} value={supplier.name} />)}</datalist></div>
            <div><FieldLabel label="Montant TTC (MAD) *" showAiBadge={aiFilledFields.includes('montant_ttc')} isHighlighted={isHighlightedByAi('montant_ttc', form.montant_ttc)} /><input type="number" min="0" step="0.01" value={form.montant_ttc} onChange={(event) => handleFormChange('montant_ttc', event.target.value)} className={fieldClassName(isHighlightedByAi('montant_ttc', form.montant_ttc))} placeholder="0.00" /></div>
            <div><FieldLabel label="Type de TVA" showAiBadge={aiFilledFields.includes('taux_tva')} isHighlighted={isHighlightedByAi('taux_tva', String(form.taux_tva))} /><select value={form.taux_tva} onChange={(event) => handleFormChange('taux_tva', Number(event.target.value) as MoroccanVatRate)} className={fieldClassName(isHighlightedByAi('taux_tva', String(form.taux_tva)))}>{VAT_RATE_OPTIONS.map((rate) => <option key={rate} value={rate}>{rate}%</option>)}</select><p className="mt-2 text-sm font-medium text-teal-700 dark:text-teal-300">HT : {formatMad(amounts.ht)} | TVA : {formatMad(amounts.vat)}</p></div>
            <div><FieldLabel label="Mode de paiement" showAiBadge={aiFilledFields.includes('mode_paiement')} isHighlighted={isHighlightedByAi('mode_paiement', form.mode_paiement)} /><select value={form.mode_paiement} onChange={(event) => handleFormChange('mode_paiement', event.target.value as PurchaseVatInvoiceInput['mode_paiement'])} className={fieldClassName(isHighlightedByAi('mode_paiement', form.mode_paiement))}>{PAYMENT_MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
            {isPieceRequired ? <div><FieldLabel label="Numero cheque / effet" showAiBadge={aiFilledFields.includes('numero_piece')} isHighlighted={isHighlightedByAi('numero_piece', form.numero_piece)} /><input type="text" value={form.numero_piece} onChange={(event) => handleFormChange('numero_piece', event.target.value)} className={fieldClassName(isHighlightedByAi('numero_piece', form.numero_piece))} placeholder="Numero de piece" /></div> : null}
            <div><FieldLabel label="ICE fournisseur" showAiBadge={aiFilledFields.includes('ice_fournisseur')} isHighlighted={isHighlightedByAi('ice_fournisseur', form.ice_fournisseur)} /><input type="text" value={form.ice_fournisseur} onChange={(event) => handleFormChange('ice_fournisseur', event.target.value)} className={fieldClassName(isHighlightedByAi('ice_fournisseur', form.ice_fournisseur) || hasInvalidIce)} placeholder="15 chiffres" />{!isValidMoroccanIce(form.ice_fournisseur) ? <div className="mt-2 flex items-start gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-3 text-sm text-orange-800 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-300"><AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /><span>Sans ICE valide, cette TVA ne sera pas deductible (regle DGI).</span></div> : null}</div>
          </div>
        )}
        {errorMessage ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">{errorMessage}</div> : null}
        <div className="flex justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
          <button type="button" onClick={onClose} className="rounded-2xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">Annuler</button>
          <button type="submit" disabled={isSaving || (isPdfImportMode ? !selectedOperations.length : false)} className="rounded-2xl bg-gradient-to-r from-teal-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:from-teal-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? (isPdfImportMode ? 'Import en cours...' : 'Enregistrement...') : isPdfImportMode ? importButtonLabel : invoice ? 'Mettre a jour' : 'Valider et enregistrer'}</button>
        </div>
      </form>
    </Modal>
  );
}

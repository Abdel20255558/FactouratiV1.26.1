import React from 'react';
import { AlertTriangle, FileUp, Loader2, Sparkles } from 'lucide-react';
import Modal from '../common/Modal';
import { useSupplier } from '../../contexts/SupplierContext';
import { useVat } from '../../contexts/VatContext';
import type {
  MoroccanVatRate,
  PurchaseVatInvoice,
  PurchaseVatInvoiceInput,
  PurchaseVatInvoiceSource,
} from '../../types/vat';
import {
  calculateVatFromTTC,
  formatMad,
  isValidMoroccanIce,
  PAYMENT_MODE_OPTIONS,
  VAT_RATE_OPTIONS,
} from '../../utils/vat';

interface PurchaseVatInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'manual' | 'pdf';
  invoice?: PurchaseVatInvoice | null;
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

function FieldLabel({
  label,
  showAiBadge,
  isHighlighted,
}: {
  label: string;
  showAiBadge: boolean;
  isHighlighted?: boolean;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span
        className={`text-sm font-medium ${
          isHighlighted ? 'text-orange-700 dark:text-orange-300' : 'text-gray-700 dark:text-gray-200'
        }`}
      >
        {label}
      </span>
      {showAiBadge ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          Extrait par IA
          <Sparkles className="h-3 w-3" />
        </span>
      ) : null}
    </div>
  );
}

const fieldClassName = (highlightOrange = false) =>
  `w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
    highlightOrange
      ? 'border-orange-300 bg-orange-50 text-orange-900 focus:border-orange-400 dark:border-orange-700 dark:bg-orange-950/30 dark:text-orange-100'
      : 'border-gray-300 bg-white text-gray-900 focus:border-teal-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
  }`;

export default function PurchaseVatInvoiceModal({
  isOpen,
  onClose,
  initialMode = 'manual',
  invoice,
}: PurchaseVatInvoiceModalProps) {
  const { suppliers } = useSupplier();
  const { createPurchaseInvoice, updatePurchaseInvoice, extractPurchaseInvoicePdf } = useVat();

  const [entryMode, setEntryMode] = React.useState<'manual' | 'pdf'>(initialMode);
  const [form, setForm] = React.useState<FormState>(defaultFormState);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [extractMessage, setExtractMessage] = React.useState('');
  const [aiFilledFields, setAiFilledFields] = React.useState<string[]>([]);
  const [missingFields, setMissingFields] = React.useState<string[]>([]);
  const [hasSuccessfulExtraction, setHasSuccessfulExtraction] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;

    setEntryMode(invoice ? (invoice.source === 'pdf_ia' ? 'pdf' : 'manual') : initialMode);
    setSelectedFile(null);
    setIsExtracting(false);
    setIsSaving(false);
    setErrorMessage('');
    setExtractMessage('');
    setHasSuccessfulExtraction(false);

    if (invoice) {
      setForm({
        date: invoice.date,
        numero_facture: invoice.numero_facture || '',
        description: invoice.description,
        fournisseur: invoice.fournisseur,
        montant_ttc: String(invoice.montant_ttc),
        taux_tva: invoice.taux_tva,
        mode_paiement: invoice.mode_paiement,
        numero_piece: invoice.numero_piece || '',
        ice_fournisseur: invoice.ice_fournisseur || '',
      });
      setAiFilledFields(invoice.aiExtractedFields || []);
      setMissingFields(invoice.aiMissingFields || []);
      return;
    }

    setForm(defaultFormState());
    setAiFilledFields([]);
    setMissingFields([]);
  }, [initialMode, invoice, isOpen]);

  const ttcValue = Number(form.montant_ttc || 0);
  const amounts = React.useMemo(() => calculateVatFromTTC(ttcValue, form.taux_tva), [form.taux_tva, ttcValue]);
  const isPieceRequired = form.mode_paiement === 'cheque' || form.mode_paiement === 'effet';
  const hasInvalidIce = Boolean(form.ice_fournisseur.trim()) && !isValidMoroccanIce(form.ice_fournisseur);
  const shouldShowFormFields =
    entryMode === 'manual' || Boolean(invoice) || hasSuccessfulExtraction || aiFilledFields.length > 0;

  const isHighlightedByAi = (field: string, value: string | number | null | undefined) =>
    missingFields.includes(field) && `${value ?? ''}`.trim() === '';

  const syncSupplierMetadata = (fournisseurName: string) => {
    const matchedSupplier = suppliers.find(
      (supplier) => supplier.name.trim().toLowerCase() === fournisseurName.trim().toLowerCase(),
    );

    setForm((prev) => ({
      ...prev,
      fournisseur: fournisseurName,
      ice_fournisseur: matchedSupplier ? prev.ice_fournisseur || matchedSupplier.ice || '' : prev.ice_fournisseur,
    }));
  };

  const handleFormChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    if (field === 'fournisseur') {
      syncSupplierMetadata(String(value));
      return;
    }

    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null;
    setSelectedFile(nextFile);
    setErrorMessage('');
    setExtractMessage('');
  };

  const handleExtract = async () => {
    if (!selectedFile) {
      setErrorMessage('Selectionnez un PDF pour lancer l’extraction.');
      return;
    }

    setIsExtracting(true);
    setErrorMessage('');
    setExtractMessage('');

    try {
      const result = await extractPurchaseInvoicePdf(selectedFile);

      setForm((prev) => ({
        ...prev,
        date: result.date || prev.date,
        numero_facture: result.numero_facture || prev.numero_facture,
        description: result.description || prev.description,
        fournisseur: result.fournisseur || prev.fournisseur,
        montant_ttc:
          typeof result.montant_ttc === 'number' && Number.isFinite(result.montant_ttc)
            ? String(result.montant_ttc)
            : prev.montant_ttc,
        taux_tva:
          typeof result.taux_tva === 'number' && VAT_RATE_OPTIONS.includes(result.taux_tva)
            ? result.taux_tva
            : prev.taux_tva,
        mode_paiement: result.mode_paiement || prev.mode_paiement,
        numero_piece: result.numero_piece || prev.numero_piece,
        ice_fournisseur: result.ice_fournisseur || prev.ice_fournisseur,
      }));

      if (result.fournisseur) {
        syncSupplierMetadata(result.fournisseur);
      }

      setAiFilledFields(result.autoFilledFields || []);
      setMissingFields(result.missingFields || []);
      setHasSuccessfulExtraction(true);
      setExtractMessage('Extraction terminee. Verifiez les champs surlignes puis validez.');
    } catch (error) {
      setHasSuccessfulExtraction(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Impossible de lire ce PDF, veuillez saisir manuellement.',
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const buildPayload = (): PurchaseVatInvoiceInput | null => {
    if (!form.date) {
      setErrorMessage('La date est obligatoire.');
      return null;
    }

    if (!form.description.trim()) {
      setErrorMessage('La description est obligatoire.');
      return null;
    }

    if (!form.fournisseur.trim()) {
      setErrorMessage('Le fournisseur est obligatoire.');
      return null;
    }

    if (!Number.isFinite(ttcValue) || ttcValue <= 0) {
      setErrorMessage('Le montant TTC doit etre superieur a 0.');
      return null;
    }

    if (isPieceRequired && !form.numero_piece.trim()) {
      setErrorMessage('Le numero de cheque ou d’effet est obligatoire pour ce mode de paiement.');
      return null;
    }

    const source: PurchaseVatInvoiceSource =
      entryMode === 'pdf' && (hasSuccessfulExtraction || aiFilledFields.length > 0) ? 'pdf_ia' : 'manuelle';

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = buildPayload();

    if (!payload) return;

    setIsSaving(true);
    setErrorMessage('');

    try {
      if (invoice) {
        await updatePurchaseInvoice(invoice.id, payload);
      } else {
        await createPurchaseInvoice(payload);
      }

      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Impossible d'enregistrer la facture achat.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={invoice ? 'Modifier une facture achat TVA' : 'Nouvelle facture achat TVA'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setEntryMode('manual')}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              entryMode === 'manual'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Saisie manuelle
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('pdf')}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              entryMode === 'pdf'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Import PDF avec IA
          </button>
        </div>

        {entryMode === 'pdf' ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-800 dark:bg-emerald-950/30">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h4 className="text-base font-semibold text-emerald-900 dark:text-emerald-200">
                  Importer une facture achat PDF
                </h4>
                <p className="mt-2 text-sm leading-6 text-emerald-800 dark:text-emerald-300">
                  Ajoutez un PDF de facture achat. Les champs seront pre-remplis, puis vous pourrez verifier et corriger avant enregistrement.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-emerald-300 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-slate-800">
                  <FileUp className="h-4 w-4" />
                  Choisir un PDF
                  <input type="file" accept="application/pdf" className="hidden" onChange={handleFileSelection} />
                </label>
                <button
                  type="button"
                  onClick={handleExtract}
                  disabled={isExtracting || !selectedFile}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-emerald-700 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {isExtracting ? 'Analyse en cours...' : 'Extraire avec IA'}
                </button>
              </div>
            </div>

            {selectedFile ? (
              <p className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Fichier selectionne: {selectedFile.name}
              </p>
            ) : null}

            {extractMessage ? (
              <div className="mt-4 rounded-2xl border border-emerald-300 bg-white/90 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-700 dark:bg-slate-900/80 dark:text-emerald-300">
                {extractMessage}
              </div>
            ) : null}
          </div>
        ) : null}

        {!shouldShowFormFields && entryMode === 'pdf' ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
            Analysez d'abord le PDF pour afficher les champs extraits et les verifier avant enregistrement.
          </div>
        ) : null}

        {shouldShowFormFields ? (
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel label="Date *" showAiBadge={aiFilledFields.includes('date')} isHighlighted={isHighlightedByAi('date', form.date)} />
            <input type="date" value={form.date} onChange={(event) => handleFormChange('date', event.target.value)} className={fieldClassName(isHighlightedByAi('date', form.date))} />
          </div>

          <div>
            <FieldLabel
              label="Numero de facture"
              showAiBadge={aiFilledFields.includes('numero_facture')}
              isHighlighted={isHighlightedByAi('numero_facture', form.numero_facture)}
            />
            <input
              type="text"
              value={form.numero_facture}
              onChange={(event) => handleFormChange('numero_facture', event.target.value)}
              className={fieldClassName(isHighlightedByAi('numero_facture', form.numero_facture))}
              placeholder="Ex: FAC-2026-0045"
            />
          </div>

          <div className="md:row-span-2">
            <FieldLabel label="Description *" showAiBadge={aiFilledFields.includes('description')} isHighlighted={isHighlightedByAi('description', form.description)} />
            <textarea rows={5} value={form.description} onChange={(event) => handleFormChange('description', event.target.value)} className={fieldClassName(isHighlightedByAi('description', form.description))} placeholder="Ex: Achat fournitures bureau, prestation consultant..." />
          </div>

          <div>
            <FieldLabel label="Fournisseur *" showAiBadge={aiFilledFields.includes('fournisseur')} isHighlighted={isHighlightedByAi('fournisseur', form.fournisseur)} />
            <input list="tva-fournisseurs-list" value={form.fournisseur} onChange={(event) => handleFormChange('fournisseur', event.target.value)} className={fieldClassName(isHighlightedByAi('fournisseur', form.fournisseur))} placeholder="Nom du fournisseur" />
            <datalist id="tva-fournisseurs-list">
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.name} />
              ))}
            </datalist>
          </div>

          <div>
            <FieldLabel label="Montant TTC (MAD) *" showAiBadge={aiFilledFields.includes('montant_ttc')} isHighlighted={isHighlightedByAi('montant_ttc', form.montant_ttc)} />
            <input type="number" min="0" step="0.01" value={form.montant_ttc} onChange={(event) => handleFormChange('montant_ttc', event.target.value)} className={fieldClassName(isHighlightedByAi('montant_ttc', form.montant_ttc))} placeholder="0.00" />
          </div>

          <div>
            <FieldLabel label="Type de TVA" showAiBadge={aiFilledFields.includes('taux_tva')} isHighlighted={isHighlightedByAi('taux_tva', String(form.taux_tva))} />
            <select value={form.taux_tva} onChange={(event) => handleFormChange('taux_tva', Number(event.target.value) as MoroccanVatRate)} className={fieldClassName(isHighlightedByAi('taux_tva', String(form.taux_tva)))}>
              {VAT_RATE_OPTIONS.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}%
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm font-medium text-teal-700 dark:text-teal-300">
              HT : {formatMad(amounts.ht)} | TVA : {formatMad(amounts.vat)}
            </p>
          </div>

          <div>
            <FieldLabel label="Mode de paiement" showAiBadge={aiFilledFields.includes('mode_paiement')} isHighlighted={isHighlightedByAi('mode_paiement', form.mode_paiement)} />
            <select value={form.mode_paiement} onChange={(event) => handleFormChange('mode_paiement', event.target.value as PurchaseVatInvoiceInput['mode_paiement'])} className={fieldClassName(isHighlightedByAi('mode_paiement', form.mode_paiement))}>
              {PAYMENT_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {isPieceRequired ? (
            <div>
              <FieldLabel label="Numero cheque / effet *" showAiBadge={aiFilledFields.includes('numero_piece')} isHighlighted={isHighlightedByAi('numero_piece', form.numero_piece)} />
              <input type="text" value={form.numero_piece} onChange={(event) => handleFormChange('numero_piece', event.target.value)} className={fieldClassName(isHighlightedByAi('numero_piece', form.numero_piece))} placeholder="Numero de piece" />
            </div>
          ) : null}

          <div>
            <FieldLabel label="ICE fournisseur" showAiBadge={aiFilledFields.includes('ice_fournisseur')} isHighlighted={isHighlightedByAi('ice_fournisseur', form.ice_fournisseur)} />
            <input type="text" value={form.ice_fournisseur} onChange={(event) => handleFormChange('ice_fournisseur', event.target.value)} className={fieldClassName(isHighlightedByAi('ice_fournisseur', form.ice_fournisseur) || hasInvalidIce)} placeholder="15 chiffres" />
            {!isValidMoroccanIce(form.ice_fournisseur) ? (
              <div className="mt-2 flex items-start gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-3 text-sm text-orange-800 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>Sans ICE valide, cette TVA ne sera pas deductible (regle DGI).</span>
              </div>
            ) : null}
          </div>
        </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
          <button type="button" onClick={onClose} className="rounded-2xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
            Annuler
          </button>
          <button type="submit" disabled={isSaving || !shouldShowFormFields} className="rounded-2xl bg-gradient-to-r from-teal-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:from-teal-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
            {isSaving ? 'Enregistrement...' : invoice ? 'Mettre a jour' : 'Valider et enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

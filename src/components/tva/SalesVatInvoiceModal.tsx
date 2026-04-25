import React from 'react';
import Modal from '../common/Modal';
import { useVat } from '../../contexts/VatContext';
import type { ManualSalesVatInvoice, ManualSalesVatInvoiceInput, MoroccanVatRate } from '../../types/vat';
import { calculateVatFromTTC, formatMad, VAT_RATE_OPTIONS } from '../../utils/vat';

interface SalesVatInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: ManualSalesVatInvoice | null;
}

interface FormState {
  date: string;
  client_name: string;
  description: string;
  montant_ttc: string;
  taux_tva: MoroccanVatRate;
}

const defaultFormState = (): FormState => ({
  date: new Date().toISOString().split('T')[0],
  client_name: '',
  description: '',
  montant_ttc: '',
  taux_tva: 20,
});

const inputClassName =
  'w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-teal-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100';

export default function SalesVatInvoiceModal({
  isOpen,
  onClose,
  invoice,
}: SalesVatInvoiceModalProps) {
  const { createManualSalesInvoice, updateManualSalesInvoice } = useVat();
  const [form, setForm] = React.useState<FormState>(defaultFormState);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;

    if (invoice) {
      setForm({
        date: invoice.date,
        client_name: invoice.client_name,
        description: invoice.description,
        montant_ttc: String(invoice.montant_ttc),
        taux_tva: invoice.taux_tva,
      });
      setErrorMessage('');
      setIsSaving(false);
      return;
    }

    setForm(defaultFormState());
    setErrorMessage('');
    setIsSaving(false);
  }, [invoice, isOpen]);

  const amounts = React.useMemo(
    () => calculateVatFromTTC(Number(form.montant_ttc || 0), form.taux_tva),
    [form.montant_ttc, form.taux_tva],
  );

  const handleChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const buildPayload = (): ManualSalesVatInvoiceInput | null => {
    if (!form.date) {
      setErrorMessage('La date est obligatoire.');
      return null;
    }

    if (!form.client_name.trim()) {
      setErrorMessage('Le client est obligatoire.');
      return null;
    }

    if (!form.description.trim()) {
      setErrorMessage('La description est obligatoire.');
      return null;
    }

    const montantTtc = Number(form.montant_ttc);
    if (!Number.isFinite(montantTtc) || montantTtc <= 0) {
      setErrorMessage('Le montant TTC doit etre superieur a 0.');
      return null;
    }

    return {
      date: form.date,
      client_name: form.client_name.trim(),
      description: form.description.trim(),
      montant_ttc: montantTtc,
      montant_ht: amounts.ht,
      taux_tva: form.taux_tva,
      montant_tva: amounts.vat,
    };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = buildPayload();
    if (!payload) return;

    try {
      setIsSaving(true);
      setErrorMessage('');

      if (invoice) {
        await updateManualSalesInvoice(invoice.id, payload);
      } else {
        await createManualSalesInvoice(payload);
      }

      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Impossible d'enregistrer la facture de vente TVA.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={invoice ? 'Modifier une facture vente TVA' : 'Nouvelle facture vente TVA'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Date *
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(event) => handleChange('date', event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Client *
            </label>
            <input
              type="text"
              value={form.client_name}
              onChange={(event) => handleChange('client_name', event.target.value)}
              className={inputClassName}
              placeholder="Nom du client"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Description *
            </label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => handleChange('description', event.target.value)}
              className={inputClassName}
              placeholder="Description de la vente"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Montant TTC (MAD) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.montant_ttc}
              onChange={(event) => handleChange('montant_ttc', event.target.value)}
              className={inputClassName}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Taux TVA
            </label>
            <select
              value={form.taux_tva}
              onChange={(event) => handleChange('taux_tva', Number(event.target.value) as MoroccanVatRate)}
              className={inputClassName}
            >
              {VAT_RATE_OPTIONS.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}%
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-300">
          HT : {formatMad(amounts.ht)} | TVA : {formatMad(amounts.vat)}
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60"
          >
            {isSaving ? 'Enregistrement...' : invoice ? 'Mettre a jour' : 'Ajouter la vente'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

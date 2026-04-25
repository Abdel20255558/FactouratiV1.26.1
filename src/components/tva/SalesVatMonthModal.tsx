import React from 'react';
import Modal from '../common/Modal';
import type { SalesVatInvoiceLike } from '../../types/vat';

interface SalesVatMonthModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SalesVatInvoiceLike | null;
  onSubmit: (targetDate: string) => Promise<void>;
}

const inputClassName =
  'w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-teal-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100';

const buildTargetDate = (monthValue: string, invoice: SalesVatInvoiceLike) => {
  const [yearPart, monthPart] = monthValue.split('-').map(Number);
  if (!yearPart || !monthPart) {
    return '';
  }

  const sourceDate = invoice.originalDate || invoice.date;
  const sourceDay = Number(sourceDate.split('-')[2] || '1');
  const lastDay = new Date(yearPart, monthPart, 0).getDate();
  const day = String(Math.min(sourceDay, lastDay)).padStart(2, '0');

  return `${yearPart}-${String(monthPart).padStart(2, '0')}-${day}`;
};

export default function SalesVatMonthModal({
  isOpen,
  onClose,
  invoice,
  onSubmit,
}: SalesVatMonthModalProps) {
  const [targetMonth, setTargetMonth] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen || !invoice) return;
    setTargetMonth((invoice.date || invoice.originalDate || new Date().toISOString()).slice(0, 7));
    setErrorMessage('');
    setIsSaving(false);
  }, [invoice, isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!invoice) {
      return;
    }

    if (!targetMonth) {
      setErrorMessage('Le mois cible est obligatoire.');
      return;
    }

    const targetDate = buildTargetDate(targetMonth, invoice);
    if (!targetDate) {
      setErrorMessage('Le mois cible est invalide.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      await onSubmit(targetDate);
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Impossible d'affecter cette vente a un autre mois.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Affecter la vente a un autre mois TVA"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-200">
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {invoice?.clientName || invoice?.client?.name || invoice?.number || 'Facture de vente'}
          </p>
          <p className="mt-2">
            Date actuelle :{' '}
            {invoice?.date ? new Date(invoice.date).toLocaleDateString('fr-FR') : '-'}
          </p>
          {invoice?.originalDate && invoice.originalDate !== invoice.date ? (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Date originale : {new Date(invoice.originalDate).toLocaleDateString('fr-FR')}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
            Nouveau mois TVA *
          </label>
          <input
            type="month"
            value={targetMonth}
            onChange={(event) => setTargetMonth(event.target.value)}
            className={inputClassName}
          />
          <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
            La facture reste dans l'application, mais elle sera comptabilisee sur le mois TVA choisi.
          </p>
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
            className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:from-amber-600 hover:to-orange-700 disabled:opacity-60"
          >
            {isSaving ? 'Enregistrement...' : 'Appliquer au mois choisi'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

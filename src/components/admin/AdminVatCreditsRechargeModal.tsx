import React from 'react';
import Modal from '../common/Modal';
import { Sparkles } from 'lucide-react';
import { TVA_ANALYSIS_PACKS } from '../../utils/vat';

interface AdminVatCreditsRechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  currentCredits: number;
  onSubmit: (payload: {
    credits: number;
    note: string;
    type: 'pack_5' | 'pack_10' | 'pack_20' | 'custom_admin';
  }) => Promise<void>;
}

export default function AdminVatCreditsRechargeModal({
  isOpen,
  onClose,
  companyName,
  currentCredits,
  onSubmit,
}: AdminVatCreditsRechargeModalProps) {
  const [selectedType, setSelectedType] = React.useState<'pack_5' | 'pack_10' | 'pack_20' | 'custom_admin'>('pack_5');
  const [customCredits, setCustomCredits] = React.useState('5');
  const [note, setNote] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  React.useEffect(() => {
    if (!isOpen) {
      setSelectedType('pack_5');
      setCustomCredits('5');
      setNote('');
      setIsSubmitting(false);
      setErrorMessage('');
    }
  }, [isOpen]);

  const selectedPreset = TVA_ANALYSIS_PACKS.find((pack) => pack.type === selectedType);
  const creditsToAdd =
    selectedType === 'custom_admin'
      ? Math.max(0, Number(customCredits || 0))
      : selectedPreset?.credits || 0;

  const handleSubmit = async () => {
    if (!creditsToAdd || creditsToAdd <= 0) {
      setErrorMessage('Le nombre de credits a ajouter doit etre superieur a 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await onSubmit({
        credits: creditsToAdd,
        note,
        type: selectedType,
      });
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de recharger les analyses IA.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Recharger analyses IA" size="lg">
      <div className="space-y-6">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950/30">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Client : {companyName}</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Credits actuels : {currentCredits}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Ajouter :</p>
          {TVA_ANALYSIS_PACKS.map((pack) => (
            <label
              key={pack.type}
              className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 transition ${
                selectedType === pack.type
                  ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/30'
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="admin-vat-pack"
                  checked={selectedType === pack.type}
                  onChange={() => setSelectedType(pack.type)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{pack.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{pack.price} DH</p>
                </div>
              </div>
            </label>
          ))}

          <label
            className={`block rounded-2xl border px-4 py-3 transition ${
              selectedType === 'custom_admin'
                ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/30'
                : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="admin-vat-pack"
                checked={selectedType === 'custom_admin'}
                onChange={() => setSelectedType('custom_admin')}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Personnalise</p>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    value={customCredits}
                    onChange={(event) => setCustomCredits(event.target.value)}
                    className="w-28 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                    placeholder="Analyses"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">analyses</span>
                </div>
              </div>
            </div>
          </label>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-gray-100">Note admin</label>
          <textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            placeholder="Ex: offert suite support, geste commercial, recharge manuelle..."
          />
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
            type="button"
            onClick={() => {
              void handleSubmit();
            }}
            disabled={isSubmitting}
            className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Recharge...' : 'Recharger gratuitement'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

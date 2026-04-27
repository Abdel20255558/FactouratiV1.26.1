import React from 'react';
import { CheckCircle2, CreditCard, Sparkles } from 'lucide-react';
import Modal from '../common/Modal';
import PaymentModal from '../license/PaymentModal';
import { useVat } from '../../contexts/VatContext';
import { TVA_ANALYSIS_PACKS } from '../../utils/vat';

interface TvaAnalysisCreditsPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchased?: (addedCredits: number) => void;
}

export default function TvaAnalysisCreditsPurchaseModal({
  isOpen,
  onClose,
  onPurchased,
}: TvaAnalysisCreditsPurchaseModalProps) {
  const { purchaseAnalysisCredits } = useVat();
  const [selectedPackType, setSelectedPackType] = React.useState<'pack_5' | 'pack_10' | 'pack_20'>('pack_10');
  const [isPaymentOpen, setIsPaymentOpen] = React.useState(false);
  const [isCompleting, setIsCompleting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  const selectedPack =
    TVA_ANALYSIS_PACKS.find((pack) => pack.type === selectedPackType) || TVA_ANALYSIS_PACKS[1];

  React.useEffect(() => {
    if (!isOpen) {
      setIsPaymentOpen(false);
      setIsCompleting(false);
      setErrorMessage('');
      setSelectedPackType('pack_10');
    }
  }, [isOpen]);

  const handlePaymentComplete = async () => {
    try {
      setIsCompleting(true);
      setErrorMessage('');
      await purchaseAnalysisCredits(selectedPack.type, {
        label: selectedPack.label,
        amount: selectedPack.price,
        credits: selectedPack.credits,
        source: 'manual_bank_transfer',
      });
      setIsPaymentOpen(false);
      onClose();
      onPurchased?.(selectedPack.credits);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Impossible d'ajouter les analyses IA pour le moment.",
      );
      setIsPaymentOpen(false);
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Acheter des analyses IA" size="lg">
        <div className="space-y-6">
          <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 p-4 dark:border-indigo-800 dark:from-indigo-950/30 dark:to-slate-900">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Rechargez vos analyses TVA en quelques clics
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  Choisissez un pack, envoyez votre recu bancaire, puis vos credits seront ajoutes
                  automatiquement a votre compte Factourati.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {TVA_ANALYSIS_PACKS.map((pack) => {
              const isSelected = pack.type === selectedPackType;

              return (
                <button
                  key={pack.type}
                  type="button"
                  onClick={() => setSelectedPackType(pack.type)}
                  className={`relative h-full rounded-3xl border p-4 text-left transition ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 shadow-md dark:border-indigo-400 dark:bg-indigo-950/30'
                      : 'border-gray-200 bg-white hover:border-indigo-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-700'
                  }`}
                >
                  {pack.badge ? (
                    <span className="absolute right-4 top-4 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      {pack.badge}
                    </span>
                  ) : null}
                  <div className="pr-16">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                      Pack TVA
                    </p>
                    <h4 className="mt-3 text-xl font-bold text-gray-900 dark:text-gray-100">{pack.label}</h4>
                    <p className="mt-2 text-3xl font-extrabold text-indigo-700 dark:text-indigo-300">
                      {pack.price} MAD
                    </p>
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                      {pack.credits} analyses rechargeables pour vos releves bancaires.
                    </p>
                  </div>

                  <div className="mt-5 flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Ajout immediat apres validation du paiement
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-gray-700 dark:bg-gray-900/50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selectedPack.label}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedPack.credits} analyses pour {selectedPack.price} MAD
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:from-indigo-700 hover:to-blue-800"
              >
                <CreditCard className="h-4 w-4" />
                Continuer vers le paiement
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
              {errorMessage}
            </div>
          ) : null}
        </div>
      </Modal>

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onComplete={() => {
          void handlePaymentComplete();
        }}
        billingPeriod="monthly"
        customOffer={{
          productLabel: selectedPack.label,
          amount: selectedPack.price,
          billingLabel: 'achat unique',
          billingSuffix: 'pack',
          whatsappMessage: `Bonjour, voici mon recu pour ${selectedPack.label} - Montant: ${selectedPack.price} MAD.`,
        }}
      />

      {isCompleting ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-3xl border border-emerald-200 bg-white px-6 py-5 text-center shadow-2xl dark:border-emerald-800 dark:bg-gray-900">
            <Sparkles className="mx-auto h-8 w-8 animate-pulse text-emerald-500" />
            <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Ajout des analyses en cours...
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}

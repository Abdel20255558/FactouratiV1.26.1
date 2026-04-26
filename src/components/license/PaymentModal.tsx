import React, { useState } from 'react';
import { X, CreditCard, MessageCircle, Check, Sparkles, Copy, CheckCircle } from 'lucide-react';

export type BillingPeriod = 'monthly' | 'sixMonths' | 'annual';

interface PaymentModalOffer {
  productLabel?: string;
  amount?: number;
  billingLabel?: string;
  billingSuffix?: string;
  whatsappMessage?: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  isRenewal?: boolean;
  billingPeriod: BillingPeriod;
  customOffer?: PaymentModalOffer;
}

export default function PaymentModal({
  isOpen,
  onClose,
  onComplete,
  isRenewal = false,
  billingPeriod,
  customOffer,
}: PaymentModalProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const PRICES = { monthly: 199, sixMonths: 999, annual: 1999 } as const;
  const amount = customOffer?.amount ?? PRICES[billingPeriod];
  const billingLabel =
    customOffer?.billingLabel ??
    (billingPeriod === 'monthly' ? 'mensuel' : billingPeriod === 'sixMonths' ? '6 mois' : 'annuel');
  const billingSuffix =
    customOffer?.billingSuffix ??
    (billingPeriod === 'monthly' ? 'mois' : billingPeriod === 'sixMonths' ? '6 mois' : 'an');
  const productLabel = customOffer?.productLabel || 'Version Pro';

  const bankInfo = {
    bank: 'CIH',
    holder: 'ABDERRAHMANE IDRISSI',
    rib: '230 815 2553323211015100 48',
    iban: 'MA64 2308 1525 5332 3211 0151 0048',
    swift: 'CIHMMAMC',
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleWhatsAppRedirect = () => {
    const message = encodeURIComponent(
      customOffer?.whatsappMessage ||
        `Bonjour, voici mon recu pour l'activation ${isRenewal ? 'de renouvellement ' : ''}de ${productLabel} (${billingLabel}) - Montant: ${amount} MAD.`,
    );
    const whatsappUrl = `https://wa.me/212666736446?text=${message}`;
    window.open(whatsappUrl, '_blank');
    setTimeout(() => setShowConfirmation(true), 1000);
  };

  const handleComplete = () => {
    onComplete();
    if (!customOffer) {
      localStorage.setItem('proActivationPending', 'true');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="flex min-h-screen items-center justify-center px-4 pb-20 pt-4">
        <div className="my-8 inline-block w-full max-w-lg overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all duration-300">
          {!showConfirmation ? (
            <>
              <div className="relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-6 text-white">
                <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-green-400 to-emerald-500 opacity-50" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Paiement {productLabel}</h2>
                      <p className="text-sm opacity-90">
                        {isRenewal
                          ? `Renouvellement - ${amount} MAD / ${billingSuffix}`
                          : `${amount} MAD / ${billingSuffix}`}
                      </p>
                    </div>
                  </div>
                  <button onClick={onClose} className="rounded-lg p-2 transition-colors hover:bg-white/20">
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-8">
                <div className="mb-6 text-center">
                  <h3 className="mb-2 text-xl font-bold text-gray-900">
                    {isRenewal ? 'Renouvellement - Informations Bancaires' : 'Informations Bancaires'}
                  </h3>
                  <p className="text-gray-600">
                    {isRenewal
                      ? `Effectuez votre virement de renouvellement (${billingLabel}) avec les informations ci-dessous`
                      : `Effectuez votre virement bancaire (${billingLabel}) avec les informations ci-dessous`}
                  </p>
                </div>

                <div className="mb-6 rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6">
                  <div className="space-y-4">
                    {[
                      { label: 'Banque', value: bankInfo.bank, key: 'bank' },
                      { label: 'Titulaire', value: bankInfo.holder, key: 'holder' },
                      { label: 'RIB', value: bankInfo.rib, key: 'rib' },
                      { label: 'IBAN', value: bankInfo.iban, key: 'iban' },
                      { label: 'Code SWIFT', value: bankInfo.swift, key: 'swift' },
                    ].map((row) => (
                      <div
                        key={row.key}
                        className="flex items-center justify-between rounded-lg border border-green-200 bg-white p-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-700">{row.label}</p>
                          <p className="font-mono text-lg font-bold text-gray-900">{row.value}</p>
                        </div>
                        <button
                          onClick={() => handleCopy(row.value, row.key)}
                          className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                        >
                          {copiedField === row.key ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <Copy className="h-5 w-5 text-gray-500" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h4 className="mb-2 font-semibold text-blue-900">Instructions</h4>
                  <ol className="space-y-1 text-sm text-blue-800">
                    <li>
                      1. Effectuez un virement de <strong>{amount} MAD</strong> {isRenewal && '(renouvellement)'} -{' '}
                      {billingLabel}
                    </li>
                    <li>2. Prenez une capture d'ecran du recu</li>
                    <li>3. Cliquez sur le bouton WhatsApp ci-dessous</li>
                    <li>4. Envoyez-nous votre recu via WhatsApp</li>
                  </ol>
                </div>

                <button
                  onClick={handleWhatsAppRedirect}
                  className="w-full rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 font-semibold text-white shadow-lg transition-all duration-200 hover:from-green-600 hover:to-emerald-700 hover:shadow-xl"
                >
                  <span className="flex items-center justify-center space-x-3">
                    <MessageCircle className="h-6 w-6" />
                    <span>{isRenewal ? 'Envoyer le recu de renouvellement' : 'Envoyer le recu sur WhatsApp'}</span>
                  </span>
                </button>

                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">Support WhatsApp : +212 666 736 446</p>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 animate-bounce items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500">
                <Check className="h-10 w-10 text-white" />
              </div>

              <div className="relative mb-6">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute animate-bounce"
                    style={{ left: `${20 + i * 15}%`, top: `${Math.random() * 20}px`, animationDelay: `${i * 0.2}s` }}
                  >
                    <Sparkles className="h-4 w-4 text-yellow-400" />
                  </div>
                ))}
              </div>

              <h3 className="mb-4 text-2xl font-bold text-gray-900">Merci pour votre confiance !</h3>

              <div className="mb-6 rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6">
                <p className="mb-2 text-lg font-semibold text-green-800">
                  Votre {productLabel.toLowerCase()} sera {isRenewal ? 'renouvele' : 'active'} dans un delai maximum de 2h.
                </p>
                <p className="text-green-700">
                  {isRenewal
                    ? 'Vos comptes utilisateurs seront automatiquement debloques apres activation.'
                    : 'Si vous avez un probleme, contactez notre support via WhatsApp.'}
                </p>
              </div>

              <div className="mb-6 h-3 w-full rounded-full bg-gray-200">
                <div className="h-3 w-full animate-pulse rounded-full bg-gradient-to-r from-green-400 to-emerald-500" />
              </div>

              <button
                onClick={handleComplete}
                className="rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:from-green-600 hover:to-emerald-700 hover:shadow-xl"
              >
                Continuer
              </button>

              <div className="mt-6">
                <p className="text-sm text-gray-500">Support : +212 666 736 446 • support@factourati.com</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

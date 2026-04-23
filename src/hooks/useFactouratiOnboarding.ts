import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useSupplier } from '../contexts/SupplierContext';
import { ONBOARDING_STEPS, type OnboardingStepKey } from '../components/onboarding/onboardingContent';

const TOTAL_STEPS = ONBOARDING_STEPS.length;

const resolvePreferredId = <T extends { id: string }>(items: T[], preferredId?: string) => {
  if (preferredId) {
    return preferredId;
  }

  return items[0]?.id || '';
};

const getCurrentStepIndex = (completion: Record<OnboardingStepKey, boolean>) => {
  if (!completion.client) return 0;
  if (!completion.product) return 1;
  if (!completion.supplier) return 2;
  if (!completion.invoice) return 3;
  return TOTAL_STEPS;
};

export function useFactouratiOnboarding() {
  const { user, updateCompanySettings } = useAuth();
  const { clients, products, invoices } = useData();
  const { suppliers } = useSupplier();
  const completionSyncRef = useRef(false);

  const company = user?.company;
  const isEligible = Boolean(user?.isAdmin && user.email !== 'admin@facturati.ma');

  const completion = useMemo<Record<OnboardingStepKey, boolean>>(
    () => ({
      client: Boolean(company?.onboardingClientId),
      product: Boolean(company?.onboardingProductId),
      supplier: Boolean(company?.onboardingSupplierId),
      invoice: Boolean(company?.onboardingInvoiceId),
    }),
    [
      company?.onboardingClientId,
      company?.onboardingProductId,
      company?.onboardingSupplierId,
      company?.onboardingInvoiceId,
    ],
  );

  const progressCount = useMemo(
    () => Object.values(completion).filter(Boolean).length,
    [completion],
  );

  const currentStepIndex = useMemo(() => getCurrentStepIndex(completion), [completion]);
  const isCompleted = Boolean(company?.hasCompletedOnboarding);
  const isDismissed = Boolean(company?.onboardingDismissedAt);

  const steps = useMemo(
    () =>
      ONBOARDING_STEPS.map((step, index) => ({
        ...step,
        index,
        complete: completion[step.key],
      })),
    [completion],
  );

  const preferredIds = useMemo(
    () => ({
      clientId: resolvePreferredId(clients, company?.onboardingClientId),
      productId: resolvePreferredId(products, company?.onboardingProductId),
      supplierId: resolvePreferredId(suppliers, company?.onboardingSupplierId),
      invoiceId: resolvePreferredId(invoices, company?.onboardingInvoiceId),
    }),
    [
      clients,
      products,
      suppliers,
      invoices,
      company?.onboardingClientId,
      company?.onboardingProductId,
      company?.onboardingSupplierId,
      company?.onboardingInvoiceId,
    ],
  );

  const shouldAutoOpen =
    isEligible &&
    company?.hasCompletedOnboarding === false &&
    !isCompleted &&
    !isDismissed;

  useEffect(() => {
    if (!isEligible || company?.hasCompletedOnboarding || progressCount < TOTAL_STEPS || completionSyncRef.current) {
      return;
    }

    completionSyncRef.current = true;

    updateCompanySettings({
      hasCompletedOnboarding: true,
      onboardingCompletedAt: new Date().toISOString(),
      onboardingDismissedAt: '',
    }).catch((error) => {
      completionSyncRef.current = false;
      console.error("Erreur lors de la synchronisation de l'onboarding:", error);
    });
  }, [company?.hasCompletedOnboarding, isEligible, progressCount, updateCompanySettings]);

  const dismissOnboarding = async () => {
    if (!isEligible) return;

    await updateCompanySettings({
      onboardingDismissedAt: new Date().toISOString(),
    });
  };

  const reopenOnboarding = async () => {
    if (!isEligible) return;

    await updateCompanySettings({
      onboardingDismissedAt: '',
    });
  };

  const saveOnboardingData = async (
    settings: Partial<NonNullable<typeof user>['company']>,
  ) => {
    if (!isEligible) return;

    await updateCompanySettings({
      ...settings,
      onboardingDismissedAt: '',
    });
  };

  const completeOnboarding = async (
    settings?: Partial<NonNullable<typeof user>['company']>,
  ) => {
    if (!isEligible) return;

    await updateCompanySettings({
      ...settings,
      hasCompletedOnboarding: true,
      onboardingCompletedAt: new Date().toISOString(),
      onboardingDismissedAt: '',
    });
  };

  return {
    company,
    isEligible,
    isCompleted,
    isDismissed,
    shouldAutoOpen,
    currentStepIndex,
    progressCount,
    totalSteps: TOTAL_STEPS,
    steps,
    completion,
    preferredIds,
    dismissOnboarding,
    reopenOnboarding,
    saveOnboardingData,
    completeOnboarding,
  };
}

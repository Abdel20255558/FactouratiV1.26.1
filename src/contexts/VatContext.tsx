import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import type {
  ManualSalesVatInvoice,
  ManualSalesVatInvoiceInput,
  PurchaseVatExtractionResult,
  PurchaseVatInvoice,
  PurchaseVatInvoiceInput,
  SalesVatAdjustment,
  SalesVatInvoiceLike,
  VatSummary,
} from '../types/vat';
import {
  buildVatSummary,
  getCurrentVatPeriod,
  resolveSalesVatInvoices,
  TVA_COLLECTION,
  TVA_SALES_ADJUSTMENTS_COLLECTION,
  TVA_SALES_MANUAL_COLLECTION,
} from '../utils/vat';

interface VatContextType {
  purchaseInvoices: PurchaseVatInvoice[];
  salesInvoices: SalesVatInvoiceLike[];
  manualSalesInvoices: ManualSalesVatInvoice[];
  salesAdjustments: SalesVatAdjustment[];
  isLoading: boolean;
  currentPeriod: string;
  currentMonthSummary: VatSummary;
  hasVatDue: boolean;
  dueAmount: number;
  createPurchaseInvoice: (payload: PurchaseVatInvoiceInput) => Promise<void>;
  updatePurchaseInvoice: (id: string, payload: PurchaseVatInvoiceInput) => Promise<void>;
  deletePurchaseInvoice: (id: string) => Promise<void>;
  createManualSalesInvoice: (payload: ManualSalesVatInvoiceInput) => Promise<void>;
  updateManualSalesInvoice: (id: string, payload: ManualSalesVatInvoiceInput) => Promise<void>;
  deleteManualSalesInvoice: (id: string) => Promise<void>;
  excludeApplicationSalesInvoice: (invoiceId: string) => Promise<void>;
  moveApplicationSalesInvoiceToDate: (invoiceId: string, targetDate: string) => Promise<void>;
  restoreApplicationSalesInvoice: (invoiceId: string) => Promise<void>;
  extractPurchaseInvoicePdf: (file: File) => Promise<PurchaseVatExtractionResult>;
  exportVatPdf: (period: string) => Promise<void>;
}

const VatContext = createContext<VatContextType | undefined>(undefined);
const TVA_API_BASES = ['/api/tva', '/.netlify/functions/tva'];

const parseApiErrorMessage = async (response: Response) => {
  try {
    const payload = await response.json();
    if (typeof payload?.message === 'string') {
      return payload.message;
    }
  } catch {
    // ignore json parsing failure
  }

  return `Erreur API (${response.status})`;
};

export function VatProvider({ children }: { children: React.ReactNode }) {
  const { user, firebaseUser } = useAuth();
  const { invoices } = useData();
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseVatInvoice[]>([]);
  const [manualSalesInvoices, setManualSalesInvoices] = useState<ManualSalesVatInvoice[]>([]);
  const [salesAdjustments, setSalesAdjustments] = useState<SalesVatAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const entrepriseId = user?.isAdmin ? user.id : user?.entrepriseId;
  const currentPeriod = useMemo(() => getCurrentVatPeriod(), []);

  useEffect(() => {
    if (!user || !entrepriseId) {
      setPurchaseInvoices([]);
      return;
    }

    setIsLoading(true);

    const purchaseInvoicesQuery = query(
      collection(db, TVA_COLLECTION),
      where('entrepriseId', '==', entrepriseId),
    );
    const manualSalesQuery = query(
      collection(db, TVA_SALES_MANUAL_COLLECTION),
      where('entrepriseId', '==', entrepriseId),
    );
    const adjustmentsQuery = query(
      collection(db, TVA_SALES_ADJUSTMENTS_COLLECTION),
      where('entrepriseId', '==', entrepriseId),
    );

    const unsubscribePurchases = onSnapshot(
      purchaseInvoicesQuery,
      (snapshot) => {
        const invoicesData = snapshot.docs
          .map((document) => ({ id: document.id, ...document.data() } as PurchaseVatInvoice))
          .sort((left, right) => {
            const leftKey = left.date || left.created_at || '';
            const rightKey = right.date || right.created_at || '';
            return rightKey.localeCompare(leftKey);
          });

        setPurchaseInvoices(invoicesData);
        setIsLoading(false);
      },
      (error) => {
        console.error('Erreur chargement TVA intelligente:', error);
        setIsLoading(false);
      },
    );

    const unsubscribeManualSales = onSnapshot(
      manualSalesQuery,
      (snapshot) => {
        const invoicesData = snapshot.docs
          .map((document) => ({ id: document.id, ...document.data() } as ManualSalesVatInvoice))
          .sort((left, right) => {
            const leftKey = left.date || left.created_at || '';
            const rightKey = right.date || right.created_at || '';
            return rightKey.localeCompare(leftKey);
          });

        setManualSalesInvoices(invoicesData);
        setIsLoading(false);
      },
      (error) => {
        console.error('Erreur chargement TVA ventes manuelles:', error);
        setIsLoading(false);
      },
    );

    const unsubscribeAdjustments = onSnapshot(
      adjustmentsQuery,
      (snapshot) => {
        const adjustmentsData = snapshot.docs
          .map((document) => ({ id: document.id, ...document.data() } as SalesVatAdjustment))
          .sort((left, right) => {
            const leftKey = left.updated_at || left.created_at || '';
            const rightKey = right.updated_at || right.created_at || '';
            return rightKey.localeCompare(leftKey);
          });

        setSalesAdjustments(adjustmentsData);
        setIsLoading(false);
      },
      (error) => {
        console.error('Erreur chargement ajustements TVA ventes:', error);
        setIsLoading(false);
      },
    );

    return () => {
      unsubscribePurchases();
      unsubscribeManualSales();
      unsubscribeAdjustments();
    };
  }, [entrepriseId, user]);

  const getRequestHeaders = async (includeJson = true) => {
    const headers: Record<string, string> = {
      'x-factourati-entreprise-id': entrepriseId || '',
      'x-factourati-user-id': user?.id || '',
      'x-factourati-user-email': user?.email || '',
      'x-factourati-is-admin': String(Boolean(user?.isAdmin)),
    };

    if (includeJson) {
      headers['Content-Type'] = 'application/json';
    }

    if (firebaseUser) {
      try {
        const token = await firebaseUser.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.warn('Token Firebase indisponible pour TVA Intelligente:', error);
      }
    }

    return headers;
  };

  const request = async <T,>(path: string, init?: RequestInit, includeJson = true): Promise<T> => {
    let lastError: Error | null = null;

    for (const baseUrl of TVA_API_BASES) {
      let response: Response;
      try {
        response = await fetch(`${baseUrl}${path}`, {
          ...init,
          headers: {
            ...(await getRequestHeaders(includeJson)),
            ...(init?.headers || {}),
          },
        });
      } catch (error) {
        lastError =
          error instanceof Error
            ? error
            : new Error("L'API TVA est indisponible. Lancez Netlify Dev en local ou verifiez le deploiement.");
        continue;
      }

      if (response.status === 404) {
        lastError = new Error(await parseApiErrorMessage(response));
        continue;
      }

      if (!response.ok) {
        throw new Error(await parseApiErrorMessage(response));
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return response.json() as Promise<T>;
    }

    throw lastError || new Error("L'API TVA est introuvable. Verifiez le deploiement Netlify ou lancez Netlify Dev en local.");
  };

  const createPurchaseInvoice = async (payload: PurchaseVatInvoiceInput) => {
    if (!user || !entrepriseId) {
      throw new Error("Utilisateur introuvable pour enregistrer la facture d'achat.");
    }

    const now = new Date().toISOString();

    await addDoc(collection(db, TVA_COLLECTION), {
      ...payload,
      user_id: user.id,
      entrepriseId,
      created_at: now,
      updated_at: now,
    });
  };

  const updatePurchaseInvoice = async (id: string, payload: PurchaseVatInvoiceInput) => {
    await updateDoc(doc(db, TVA_COLLECTION, id), {
      ...payload,
      updated_at: new Date().toISOString(),
    });
  };

  const deletePurchaseInvoice = async (id: string) => {
    await deleteDoc(doc(db, TVA_COLLECTION, id));
  };

  const createManualSalesInvoice = async (payload: ManualSalesVatInvoiceInput) => {
    if (!user || !entrepriseId) {
      throw new Error('Utilisateur introuvable pour enregistrer la facture de vente TVA.');
    }

    const now = new Date().toISOString();

    await addDoc(collection(db, TVA_SALES_MANUAL_COLLECTION), {
      ...payload,
      user_id: user.id,
      entrepriseId,
      created_at: now,
      updated_at: now,
    });
  };

  const updateManualSalesInvoice = async (id: string, payload: ManualSalesVatInvoiceInput) => {
    await updateDoc(doc(db, TVA_SALES_MANUAL_COLLECTION, id), {
      ...payload,
      updated_at: new Date().toISOString(),
    });
  };

  const deleteManualSalesInvoice = async (id: string) => {
    await deleteDoc(doc(db, TVA_SALES_MANUAL_COLLECTION, id));
  };

  const excludeApplicationSalesInvoice = async (invoiceId: string) => {
    if (!user || !entrepriseId) {
      throw new Error('Entreprise introuvable.');
    }

    const now = new Date().toISOString();

    await setDoc(doc(db, TVA_SALES_ADJUSTMENTS_COLLECTION, invoiceId), {
      user_id: user.id,
      entrepriseId,
      sourceInvoiceId: invoiceId,
      action: 'exclude',
      targetDate: null,
      created_at: now,
      updated_at: now,
    });
  };

  const moveApplicationSalesInvoiceToDate = async (invoiceId: string, targetDate: string) => {
    if (!user || !entrepriseId) {
      throw new Error('Entreprise introuvable.');
    }

    if (!targetDate) {
      throw new Error('La date cible est obligatoire.');
    }

    const now = new Date().toISOString();

    await setDoc(doc(db, TVA_SALES_ADJUSTMENTS_COLLECTION, invoiceId), {
      user_id: user.id,
      entrepriseId,
      sourceInvoiceId: invoiceId,
      action: 'move',
      targetDate,
      created_at: now,
      updated_at: now,
    });
  };

  const restoreApplicationSalesInvoice = async (invoiceId: string) => {
    await deleteDoc(doc(db, TVA_SALES_ADJUSTMENTS_COLLECTION, invoiceId));
  };

  const extractPurchaseInvoicePdf = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return request<PurchaseVatExtractionResult>(
      '/extract-pdf',
      {
        method: 'POST',
        body: formData,
      },
      false,
    );
  };

  const exportVatPdf = async (period: string) => {
    let response: Response | null = null;
    let lastError: Error | null = null;

    for (const baseUrl of TVA_API_BASES) {
      let nextResponse: Response;
      try {
        nextResponse = await fetch(`${baseUrl}/export-pdf?periode=${encodeURIComponent(period)}`, {
          headers: await getRequestHeaders(false),
        });
      } catch (error) {
        lastError =
          error instanceof Error
            ? error
            : new Error("L'API TVA est indisponible. Lancez Netlify Dev en local ou verifiez le deploiement.");
        continue;
      }

      if (nextResponse.status === 404) {
        lastError = new Error(await parseApiErrorMessage(nextResponse));
        continue;
      }

      response = nextResponse;
      break;
    }

    if (!response) {
      throw lastError || new Error("L'API TVA est introuvable. Verifiez le deploiement Netlify ou lancez Netlify Dev en local.");
    }

    if (!response.ok) {
      throw new Error(await parseApiErrorMessage(response));
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recap-tva-${period}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const salesInvoices = useMemo(
    () => resolveSalesVatInvoices(invoices, manualSalesInvoices, salesAdjustments),
    [invoices, manualSalesInvoices, salesAdjustments],
  );

  const currentMonthSummary = useMemo(
    () => buildVatSummary(purchaseInvoices, salesInvoices, currentPeriod),
    [currentPeriod, purchaseInvoices, salesInvoices],
  );

  const value: VatContextType = {
    purchaseInvoices,
    salesInvoices,
    manualSalesInvoices,
    salesAdjustments,
    isLoading,
    currentPeriod,
    currentMonthSummary,
    hasVatDue: currentMonthSummary.balance > 0,
    dueAmount: Math.max(currentMonthSummary.balance, 0),
    createPurchaseInvoice,
    updatePurchaseInvoice,
    deletePurchaseInvoice,
    createManualSalesInvoice,
    updateManualSalesInvoice,
    deleteManualSalesInvoice,
    excludeApplicationSalesInvoice,
    moveApplicationSalesInvoiceToDate,
    restoreApplicationSalesInvoice,
    extractPurchaseInvoicePdf,
    exportVatPdf,
  };

  return <VatContext.Provider value={value}>{children}</VatContext.Provider>;
}

export function useVat() {
  const context = useContext(VatContext);

  if (context === undefined) {
    throw new Error('useVat must be used within a VatProvider');
  }

  return context;
}

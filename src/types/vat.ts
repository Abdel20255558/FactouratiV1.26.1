export type MoroccanVatRate = 0 | 7 | 10 | 20;

export type PurchaseVatPaymentMode = 'virement' | 'cheque' | 'effet' | 'especes';

export type PurchaseVatInvoiceSource = 'pdf_ia' | 'manuelle';
export type SalesVatInvoiceSource = 'application' | 'manuelle';
export type SalesVatAdjustmentAction = 'exclude' | 'move';

export interface PurchaseVatInvoice {
  id: string;
  user_id: string;
  entrepriseId: string;
  date: string;
  numero_facture: string | null;
  fournisseur: string;
  ice_fournisseur: string | null;
  description: string;
  montant_ttc: number;
  montant_ht: number;
  taux_tva: MoroccanVatRate;
  montant_tva: number;
  mode_paiement: PurchaseVatPaymentMode;
  numero_piece: string | null;
  source: PurchaseVatInvoiceSource;
  aiExtractedFields?: string[];
  aiMissingFields?: string[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseVatInvoiceInput {
  date: string;
  numero_facture: string | null;
  fournisseur: string;
  ice_fournisseur: string | null;
  description: string;
  montant_ttc: number;
  montant_ht: number;
  taux_tva: MoroccanVatRate;
  montant_tva: number;
  mode_paiement: PurchaseVatPaymentMode;
  numero_piece: string | null;
  source: PurchaseVatInvoiceSource;
  aiExtractedFields?: string[];
  aiMissingFields?: string[];
}

export interface PurchaseVatExtractionPayload {
  date?: string | null;
  numero_facture?: string | null;
  fournisseur?: string | null;
  description?: string | null;
  montant_ttc?: number | null;
  taux_tva?: MoroccanVatRate | null;
  montant_tva?: number | null;
  montant_ht?: number | null;
  mode_paiement?: PurchaseVatPaymentMode | null;
  numero_piece?: string | null;
  ice_fournisseur?: string | null;
}

export interface PurchaseVatExtractionResult extends PurchaseVatExtractionPayload {
  autoFilledFields: string[];
  missingFields: string[];
}

export interface ManualSalesVatInvoice {
  id: string;
  user_id: string;
  entrepriseId: string;
  date: string;
  numero_facture: string | null;
  client_name: string;
  description: string;
  montant_ttc: number;
  montant_ht: number;
  taux_tva: MoroccanVatRate;
  montant_tva: number;
  created_at: string;
  updated_at: string;
}

export interface ManualSalesVatInvoiceInput {
  date: string;
  numero_facture: string | null;
  client_name: string;
  description: string;
  montant_ttc: number;
  montant_ht: number;
  taux_tva: MoroccanVatRate;
  montant_tva: number;
}

export interface SalesVatAdjustment {
  id: string;
  user_id: string;
  entrepriseId: string;
  sourceInvoiceId: string;
  action: SalesVatAdjustmentAction;
  targetDate: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesVatInvoiceLike {
  id: string;
  number?: string;
  date: string;
  subtotal: number;
  totalVat: number;
  totalTTC: number;
  sourceType?: SalesVatInvoiceSource;
  originalDate?: string;
  clientName?: string;
  description?: string;
  isAdjusted?: boolean;
  adjustmentAction?: SalesVatAdjustmentAction | null;
  sourceInvoiceId?: string;
  client?: {
    name: string;
  };
  items?: Array<{
    description: string;
  }>;
}

export interface VatSummary {
  periode: string;
  deductibleVat: number;
  collectedVat: number;
  balance: number;
  totalInvoices: number;
  purchaseInvoicesCount: number;
  salesInvoicesCount: number;
  purchaseTotalHT: number;
  purchaseTotalTTC: number;
  salesTotalHT: number;
  salesTotalTTC: number;
  deadlineLabel: string;
  status: 'due' | 'credit';
}

export interface VatHistoryPoint {
  period: string;
  label: string;
  purchaseVat: number;
  salesVat: number;
  balance: number;
}

export interface VatAiSettings {
  apiKey: string;
  model: string;
  prompt: string;
  updatedAt?: string;
}

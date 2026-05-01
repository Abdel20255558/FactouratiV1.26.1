export type MoroccanVatRate = 0 | 7 | 10 | 13 | 14 | 20;

export type PurchaseVatPaymentMode =
  | 'virement'
  | 'cheque'
  | 'effet'
  | 'paiement_en_ligne'
  | 'carte'
  | 'especes'
  | 'autre';
export type VatOperationDirection = 'achat' | 'vente';
export type VatExtractionDocumentType = 'facture_unique' | 'releve_bancaire' | 'factures_multiples';
export type VatAnalysisTransactionType = 'gratuit' | 'pack_5' | 'pack_10' | 'pack_20' | 'custom_admin' | 'retrait_admin';
export type VatOperationBankingDirection = 'debit' | 'credit' | 'inconnu';
export type VatOperationClassification = 'achat_propose' | 'vente_propose' | 'ignore' | 'a_verifier';
export type VatConfidenceLevel = 'eleve' | 'moyen' | 'faible';
export type VatIgnoredOperationBucket = 'virements_personnels' | 'hors_tva' | 'ignore';

export type PurchaseVatInvoiceSource = 'pdf_ia' | 'manuelle';
export type SalesVatInvoiceSource = 'application' | 'manuelle';
export type SalesVatAdjustmentAction = 'exclude' | 'move';

export interface VatAnalysisPeriodDetail {
  date_debut: string | null;
  date_fin: string | null;
  mois: string | null;
}

export interface VatAnalysisSummaryDetail {
  nombre_operations_total: number;
  nombre_achats_proposes: number;
  nombre_ventes_proposees: number;
  nombre_operations_ignorees: number;
  nombre_operations_a_verifier: number;
  total_achats_ttc: number;
  total_ventes_ttc: number;
  total_tva_deductible: number;
  total_tva_collectee: number;
}

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

export interface VatExtractedOperation {
  id: string;
  id_ligne_source: string;
  classification: VatOperationClassification;
  sens: VatOperationDirection;
  date: string;
  libelle_original: string;
  numero_facture: string | null;
  fournisseur_client: string;
  description: string;
  montant_ttc: number;
  taux_tva: MoroccanVatRate;
  montant_tva: number;
  montant_ht: number;
  mode_paiement: PurchaseVatPaymentMode;
  numero_piece: string | null;
  ice: string | null;
  tva_modifiable: boolean;
  niveau_confiance: VatConfidenceLevel;
  raison_classement: string;
  ignoree: boolean;
}

export interface VatBankOperation {
  id_ligne: string;
  date: string | null;
  libelle_original: string;
  montant_debit: number;
  montant_credit: number;
  sens_bancaire: VatOperationBankingDirection;
  mode_paiement_detecte: PurchaseVatPaymentMode;
  classification: VatOperationClassification;
  raison: string;
  niveau_confiance: VatConfidenceLevel;
  fournisseur_client: string | null;
  description: string | null;
  numero_piece: string | null;
  taux_tva: MoroccanVatRate | null;
}

export interface VatIgnoredOperation {
  id: string;
  id_ligne_source: string;
  date: string;
  libelle: string;
  mode_paiement?: PurchaseVatPaymentMode | null;
  montant: number;
  sens?: 'debit' | 'credit' | null;
  raison_exclusion: string;
  bucket?: VatIgnoredOperationBucket | null;
}

export interface VatAnalysisAlert {
  type: string;
  message: string;
}

export interface VatAnalysisCacheInfo {
  cacheHit: boolean;
  cacheEntryId: string | null;
  hash_fichier: string | null;
  nom_fichier_original: string | null;
  analyse_date: string | null;
  nb_factures_achat: number;
  nb_factures_vente: number;
  nb_operations_ignorees: number;
}

export interface PurchaseVatExtractionResult {
  success?: boolean;
  schema_name?: string | null;
  type_document: VatExtractionDocumentType;
  banque?: string | null;
  societe_titulaire?: string | null;
  periode: string | null;
  periode_detail?: VatAnalysisPeriodDetail | null;
  resume?: VatAnalysisSummaryDetail | null;
  factures: VatExtractedOperation[];
  achats?: VatExtractedOperation[];
  ventes?: VatExtractedOperation[];
  virements_personnels?: VatIgnoredOperation[];
  hors_tva?: VatIgnoredOperation[];
  a_verifier?: VatBankOperation[];
  total_operations?: number;
  toutes_operations?: VatBankOperation[];
  operations_ignorees: VatIgnoredOperation[];
  alertes?: VatAnalysisAlert[];
  cache_info?: VatAnalysisCacheInfo | null;
}

export interface VatAnalysisCacheEntry {
  id: string;
  user_id: string;
  entrepriseId: string;
  hash_fichier: string;
  nom_fichier_original: string;
  resultat_json: PurchaseVatExtractionResult;
  nb_factures_achat: number;
  nb_factures_vente: number;
  nb_operations_ignorees: number;
  analyse_date: string;
  created_at: string;
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
  mode_paiement?: PurchaseVatPaymentMode | null;
  numero_piece?: string | null;
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
  mode_paiement?: PurchaseVatPaymentMode | null;
  numero_piece?: string | null;
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
  mode_paiement?: PurchaseVatPaymentMode | null;
  numero_piece?: string | null;
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

export interface VatAnalysisCredits {
  id: string;
  user_id: string;
  entrepriseId?: string;
  credits_gratuits_utilises: number;
  credits_payes_restants: number;
  total_analyses_effectuees: number;
  created_at: string;
  updated_at: string;
}

export interface VatAnalysisCreditsSummary {
  credits_gratuits_restants: number;
  credits_payes_restants: number;
  total_disponible: number;
  credits_gratuits_utilises: number;
  total_analyses_effectuees: number;
}

export interface VatAnalysisCreditsVerification {
  autorise: boolean;
  credits_restants: number;
  credits_gratuits_restants: number;
  credits_payes_restants: number;
}

export interface VatAnalysisTransaction {
  id: string;
  user_id: string;
  entrepriseId?: string;
  type: VatAnalysisTransactionType;
  credits_ajoutes: number;
  montant_paye: number;
  recharge_par_admin: boolean;
  admin_id: string | null;
  note?: string | null;
  created_at: string;
}

export interface VatAnalysisPackDefinition {
  type: Extract<VatAnalysisTransactionType, 'pack_5' | 'pack_10' | 'pack_20'>;
  label: string;
  price: number;
  credits: number;
  badge?: string;
}

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
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
  VatAnalysisCreditsSummary,
  VatAnalysisCreditsVerification,
  VatAnalysisAlert,
  VatAnalysisSummaryDetail,
  VatBankOperation,
  VatConfidenceLevel,
  ManualSalesVatInvoice,
  ManualSalesVatInvoiceInput,
  PurchaseVatExtractionResult,
  PurchaseVatInvoice,
  PurchaseVatInvoiceInput,
  SalesVatAdjustment,
  SalesVatInvoiceLike,
  VatAnalysisCacheEntry,
  VatCarryoverOverride,
  VatExtractedOperation,
  VatIgnoredOperation,
  VatExtractionDocumentType,
  VatOperationClassification,
  VatSummary,
} from '../types/vat';
import {
  buildVatSummary,
  buildDefaultVatAnalysisCredits,
  buildVatAnalysisCreditsSummary,
  calculateVatFromTTC,
  formatMad,
  getVatDeadlineLabel,
  getCurrentVatPeriod,
  isDateInPeriod,
  PAYMENT_MODE_OPTIONS,
  resolveSalesVatInvoices,
  TVA_ANALYSIS_CACHE_COLLECTION,
  TVA_ANALYSIS_CREDITS_COLLECTION,
  TVA_ANALYSIS_PACKS,
  TVA_ANALYSIS_TRANSACTIONS_COLLECTION,
  TVA_AI_SETTINGS_COLLECTION,
  TVA_AI_SETTINGS_DOC,
  TVA_CARRYOVER_OVERRIDES_COLLECTION,
  TVA_COLLECTION,
  TVA_FREE_ANALYSIS_LIMIT,
  TVA_SALES_ADJUSTMENTS_COLLECTION,
  TVA_SALES_MANUAL_COLLECTION,
} from '../utils/vat';

interface VatContextType {
  purchaseInvoices: PurchaseVatInvoice[];
  salesInvoices: SalesVatInvoiceLike[];
  manualSalesInvoices: ManualSalesVatInvoice[];
  salesAdjustments: SalesVatAdjustment[];
  carryoverOverrides: VatCarryoverOverride[];
  analysisCacheEntries: VatAnalysisCacheEntry[];
  analysisCredits: VatAnalysisCreditsSummary;
  isLoading: boolean;
  currentPeriod: string;
  currentMonthSummary: VatSummary;
  hasVatDue: boolean;
  dueAmount: number;
  createPurchaseInvoice: (payload: PurchaseVatInvoiceInput) => Promise<void>;
  updatePurchaseInvoice: (id: string, payload: PurchaseVatInvoiceInput) => Promise<void>;
  deletePurchaseInvoice: (id: string) => Promise<void>;
  deleteAnalysisCacheEntry: (id: string) => Promise<void>;
  createManualSalesInvoice: (payload: ManualSalesVatInvoiceInput) => Promise<void>;
  updateManualSalesInvoice: (id: string, payload: ManualSalesVatInvoiceInput) => Promise<void>;
  deleteManualSalesInvoice: (id: string) => Promise<void>;
  excludeApplicationSalesInvoice: (invoiceId: string) => Promise<void>;
  moveApplicationSalesInvoiceToDate: (invoiceId: string, targetDate: string) => Promise<void>;
  restoreApplicationSalesInvoice: (invoiceId: string) => Promise<void>;
  upsertCarryoverOverride: (period: string, amount: number, note?: string | null) => Promise<void>;
  deleteCarryoverOverride: (period: string) => Promise<void>;
  extractPurchaseInvoicePdf: (
    file: File,
    options?: { forceReanalyze?: boolean },
  ) => Promise<PurchaseVatExtractionResult>;
  exportVatPdf: (period: string) => Promise<void>;
  verifyAnalysisCredits: () => Promise<VatAnalysisCreditsVerification>;
  purchaseAnalysisCredits: (
    type: 'pack_5' | 'pack_10' | 'pack_20',
    paymentData?: Record<string, unknown>,
  ) => Promise<VatAnalysisCreditsSummary>;
}

const VatContext = createContext<VatContextType | undefined>(undefined);
const TVA_API_BASES = ['/api/tva', '/.netlify/functions/tva'];
const VALID_VAT_RATES = [20, 14, 13, 10, 7, 0] as const;
const DEFAULT_TVA_AI_MODEL = 'gpt-5.4';
const DEFAULT_TVA_N8N_WEBHOOK_URL = 'https://factourati2.app.n8n.cloud/webhook-test/factourati-tva-analyse';
const DEFAULT_TVA_AI_PROMPT = `Tu es un assistant comptable marocain expert en TVA.
Analyse ce document (releve bancaire ou facture) et extrais uniquement les operations comptables valides selon ces regles strictes.

════════════════════════════════════
REGLES DE FILTRAGE — LIS ATTENTIVEMENT
════════════════════════════════════

COLONNE DEBIT (factures achat) — N'extraire QUE :
✅ Paiements a des SOCIETES ou ENTREPRISES (SARL, SA, SAS, Auto-entrepreneur)
✅ Modes acceptes : virement societe, cheque, effet de commerce (traite/LCN)
✅ La description doit correspondre a un achat de bien ou service professionnel

❌ IGNORER et NE PAS retourner :
- Virements a des personnes physiques (noms propres sans forme juridique)
- Commissions bancaires
- Frais de tenue de compte
- Taxes et impots (IR, IS, TVA DGI, TP, patente...)
- Retraits especes / DAB
- Frais de cheque, frais de virement
- Remboursements de pret / echeances credit
- Salaires et avances sur salaire
- Cotisations CNSS / AMO
- Paiements assurance
- Tout virement avec libelle personnel ou ambigu

COLONNE CREDIT (factures vente) — N'extraire QUE :
✅ Paiements recus de CLIENTS (entreprises ou particuliers) pour des ventes
✅ Encaissements de cheques clients
✅ Virements recus avec reference facture ou nom client identifiable
✅ Reglement d'effets de commerce a l'echeance

❌ IGNORER et NE PAS retourner :
- Virements recus de banques (credits, prets)
- Remises en especes
- Interets crediteurs
- Remboursements recus
- Operations inter-comptes

════════════════════════════════════
FORMAT DE REPONSE
════════════════════════════════════

Si le document contient UNE SEULE facture, retourne :
{
  "type_document": "facture_unique",
  "factures": [
    {
      "sens": "achat" | "vente",
      "date": "YYYY-MM-DD",
      "numero_facture": "numero ou null",
      "fournisseur_client": "nom societe ou client",
      "description": "designation du produit ou service",
      "montant_ttc": nombre,
      "taux_tva": 20 | 10 | 7 | 0,
      "montant_tva": nombre,
      "montant_ht": nombre,
      "mode_paiement": "virement" | "cheque" | "effet" | "especes",
      "numero_piece": "numero cheque ou effet ou null",
      "ice": "15 chiffres ou null"
    }
  ]
}

Si le document contient PLUSIEURS factures ou est un releve bancaire, retourne :
{
  "type_document": "releve_bancaire" | "factures_multiples",
  "periode": "YYYY-MM ou null",
  "factures": [
    {
      "sens": "achat" | "vente",
      "date": "YYYY-MM-DD",
      "numero_facture": "numero ou null",
      "fournisseur_client": "nom societe ou client",
      "description": "designation",
      "montant_ttc": nombre,
      "taux_tva": 20 | 10 | 7 | 0,
      "montant_tva": nombre,
      "montant_ht": nombre,
      "mode_paiement": "virement" | "cheque" | "effet" | "especes",
      "numero_piece": "numero ou null",
      "ice": "15 chiffres ou null",
      "ignoree": false
    }
  ],
  "operations_ignorees": [
    {
      "date": "YYYY-MM-DD",
      "libelle": "libelle original",
      "montant": nombre,
      "raison_exclusion": "commission bancaire | virement personnel | taxe | salaire | etc."
    }
  ]
}

REGLES DE CALCUL TVA :
- Si TVA non visible sur le document → supposer 20% par defaut
- montant_ht = montant_ttc / (1 + taux_tva/100)
- montant_tva = montant_ttc - montant_ht
- Arrondir a 2 decimales

Reponds UNIQUEMENT avec le JSON. Aucun texte avant ou apres.
Aucun markdown. Aucune explication.`;
const STRICT_TVA_AI_PROMPT = `Tu es un assistant comptable marocain expert en TVA.
Analyse ce document (releve bancaire ou facture) et extrais uniquement les operations comptables valides selon ces regles strictes.

====================================
REGLES DE FILTRAGE - LIS ATTENTIVEMENT
====================================

COLONNE DEBIT (factures achat) - N'extraire QUE :
- Paiements a des SOCIETES ou ENTREPRISES (SARL, SA, SAS, Auto-entrepreneur)
- Modes acceptes : virement societe, cheque, effet de commerce (traite/LCN)
- La description doit correspondre a un achat de bien ou service professionnel

IGNORER et NE PAS retourner :
- Virements a des personnes physiques (noms propres sans forme juridique)
- Commissions bancaires
- Frais de tenue de compte
- Taxes et impots (IR, IS, TVA DGI, TP, patente...)
- Retraits especes / DAB
- Frais de cheque, frais de virement
- Remboursements de pret / echeances credit
- Salaires et avances sur salaire
- Cotisations CNSS / AMO
- Paiements assurance
- Tout virement avec libelle personnel ou ambigu

COLONNE CREDIT (factures vente) - N'extraire QUE :
- Paiements recus de CLIENTS (entreprises ou particuliers) pour des ventes
- Encaissements de cheques clients
- Virements recus avec reference facture ou nom client identifiable
- Reglement d'effets de commerce a l'echeance

IGNORER et NE PAS retourner :
- Virements recus de banques (credits, prets)
- Remises en especes
- Interets crediteurs
- Remboursements recus
- Operations inter-comptes

==================
FORMAT DE REPONSE
==================

Si le document contient UNE SEULE facture, retourne :
{
  "type_document": "facture_unique",
  "factures": [
    {
      "sens": "achat" | "vente",
      "date": "YYYY-MM-DD",
      "numero_facture": "numero ou null",
      "fournisseur_client": "nom societe ou client",
      "description": "designation du produit ou service",
      "montant_ttc": nombre,
      "taux_tva": 20 | 10 | 7 | 0,
      "montant_tva": nombre,
      "montant_ht": nombre,
      "mode_paiement": "virement" | "cheque" | "effet" | "especes",
      "numero_piece": "numero cheque ou effet ou null",
      "ice": "15 chiffres ou null"
    }
  ]
}

Si le document contient PLUSIEURS factures ou est un releve bancaire, retourne :
{
  "type_document": "releve_bancaire" | "factures_multiples",
  "periode": "YYYY-MM ou null",
  "factures": [
    {
      "sens": "achat" | "vente",
      "date": "YYYY-MM-DD",
      "numero_facture": "numero ou null",
      "fournisseur_client": "nom societe ou client",
      "description": "designation",
      "montant_ttc": nombre,
      "taux_tva": 20 | 10 | 7 | 0,
      "montant_tva": nombre,
      "montant_ht": nombre,
      "mode_paiement": "virement" | "cheque" | "effet" | "especes",
      "numero_piece": "numero ou null",
      "ice": "15 chiffres ou null",
      "ignoree": false
    }
  ],
  "operations_ignorees": [
    {
      "date": "YYYY-MM-DD",
      "libelle": "libelle original",
      "montant": nombre,
      "raison_exclusion": "commission bancaire | virement personnel | taxe | salaire | etc."
    }
  ]
}

REGLES DE CALCUL TVA :
- Si TVA non visible sur le document, supposer 20% par defaut
- montant_ht = montant_ttc / (1 + taux_tva/100)
- montant_tva = montant_ttc - montant_ht
- Arrondir a 2 decimales

Reponds UNIQUEMENT avec le JSON. Aucun texte avant ou apres.
Aucun markdown. Aucune explication.`;
const TVA_EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    type_document: {
      type: 'string',
      enum: ['facture_unique', 'releve_bancaire', 'factures_multiples'],
    },
    periode: {
      anyOf: [
        { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
        { type: 'null' },
      ],
    },
    factures: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          sens: { type: 'string' },
          date: { type: 'string' },
          numero_facture: {
            anyOf: [{ type: 'string' }, { type: 'null' }],
          },
          fournisseur_client: { type: 'string' },
          description: { type: 'string' },
          montant_ttc: { type: 'number' },
          taux_tva: { type: 'number' },
          montant_tva: { type: 'number' },
          montant_ht: { type: 'number' },
          mode_paiement: { type: 'string' },
          numero_piece: {
            anyOf: [{ type: 'string' }, { type: 'null' }],
          },
          ice: {
            anyOf: [{ type: 'string' }, { type: 'null' }],
          },
          ignoree: { type: 'boolean' },
        },
        required: [
          'sens',
          'date',
          'numero_facture',
          'fournisseur_client',
          'description',
          'montant_ttc',
          'taux_tva',
          'montant_tva',
          'montant_ht',
          'mode_paiement',
          'numero_piece',
          'ice',
          'ignoree',
        ],
      },
    },
    operations_ignorees: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          date: { type: 'string' },
          libelle: { type: 'string' },
          montant: { type: 'number' },
          raison_exclusion: { type: 'string' },
        },
        required: ['date', 'libelle', 'montant', 'raison_exclusion'],
      },
    },
  },
  required: ['type_document', 'periode', 'factures', 'operations_ignorees'],
} as const;

const OPENAI_TVA_SYSTEM_PROMPT = `Tu es un expert comptable marocain.
Tu analyses des releves bancaires de societes marocaines.
Un releve bancaire a TOUJOURS deux types d'operations en meme temps :
des debits ET des credits. Tu dois retourner les deux.
Tu retournes UNIQUEMENT du JSON. Zero texte. Zero explication.`;

const STRICT_BANK_STATEMENT_TVA_AI_PROMPT = `Voici un releve bancaire marocain.

ETAPE 1 - COMPRENDRE LA STRUCTURE DU DOCUMENT
Un releve bancaire marocain contient toujours ces colonnes :
DATE | LIBELLE | DEBIT | CREDIT | SOLDE

DEBIT  = colonne de gauche = argent qui SORT  = ACHAT
CREDIT = colonne de droite = argent qui ENTRE = VENTE

Un meme releve contient DES ACHATS ET DES VENTES EN MEME TEMPS.
Tu dois retourner LES DEUX categories ensemble dans le JSON.
Ne retourne JAMAIS une seule categorie si les deux existent.

ETAPE 2 - REGLES DE FILTRAGE

DEBITS (achats) - Inclure UNIQUEMENT si :
- Le beneficiaire est une societe : SARL, SA, SARLAU, SNC, AUTO-ENTREPRENEUR
- Le libelle correspond a un achat professionnel
- Mode de paiement : CHQ (cheque), VIR (virement societe), EFF (effet)

DEBITS (achats) - EXCLURE et mettre dans operations_ignorees :
- RETRAIT, DAB, ESPECES -> raison : retrait especes
- COMMISSION, FRAIS, AGIOS, INTERET -> raison : frais bancaires
- TVA, IR, IS, TP, IMPOT, TAXE, DGI -> raison : impot ou taxe
- CNSS, AMO, CIMR -> raison : cotisations sociales
- SALAIRE, AVANCE, PAIE -> raison : salaire
- CREDIT, PRET, ECHEANCE, REMBOURSEMENT -> raison : credit bancaire
- ASSURANCE -> raison : assurance
- Virements vers un prenom + nom de personne physique -> raison : virement personnel
- Tout libelle ambigu ou personnel -> raison : operation non professionnelle

CREDITS (ventes) - Inclure UNIQUEMENT si :
- Remise cheque client
- Virement recu d'un client (societe ou particulier)
- Encaissement effet ou traite client
- Le libelle contient : REMISE CHQ, VIR RECU, ENCAISSEMENT, REGLEMENT CLIENT

CREDITS (ventes) - EXCLURE et mettre dans operations_ignorees :
- VIREMENT PROPRE, ENTRE COMPTES -> raison : virement interne
- CREDIT, DEBLOCAGE, PRET -> raison : credit bancaire recu
- INTERETS CREDITEURS -> raison : interets bancaires
- REMISE ESPECES -> raison : remise especes

ETAPE 3 - CALCUL TVA
Si TVA non visible sur le document :
taux_tva par defaut = 20
montant_ht  = montant_ttc / 1.20  (arrondi 2 decimales)
montant_tva = montant_ttc - montant_ht  (arrondi 2 decimales)

ETAPE 4 - FORMAT JSON DE REPONSE
{
  "type_document": "releve_bancaire",
  "periode": "YYYY-MM",
  "resume": {
    "total_achats": nombre,
    "total_ventes": nombre,
    "nb_achats": nombre,
    "nb_ventes": nombre,
    "nb_ignores": nombre
  },
  "factures": [
    {
      "sens": "achat",
      "date": "YYYY-MM-DD",
      "fournisseur_client": "nom exact du beneficiaire",
      "description": "libelle nettoye et lisible",
      "montant_ttc": 1200.00,
      "taux_tva": 20,
      "montant_tva": 200.00,
      "montant_ht": 1000.00,
      "mode_paiement": "cheque",
      "numero_piece": "CHQ2100244 ou null"
    },
    {
      "sens": "vente",
      "date": "YYYY-MM-DD",
      "fournisseur_client": "nom du client",
      "description": "libelle nettoye et lisible",
      "montant_ttc": 6000.00,
      "taux_tva": 20,
      "montant_tva": 1000.00,
      "montant_ht": 5000.00,
      "mode_paiement": "virement",
      "numero_piece": null
    }
  ],
  "operations_ignorees": [
    {
      "date": "YYYY-MM-DD",
      "libelle": "libelle original exact",
      "montant": 500.00,
      "sens": "debit",
      "raison_exclusion": "frais bancaires"
    }
  ]
}

REGLE FINALE ABSOLUE :
Si tu vois 10 debits valides et 5 credits valides dans le releve,
tu retournes 10 achats ET 5 ventes dans le tableau factures.
Tu ne retournes JAMAIS une seule categorie si les deux existent.
Aucun texte avant ou apres le JSON.`;

const TVA_BANK_STATEMENT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    type_document: {
      type: 'string',
      enum: ['facture_unique', 'releve_bancaire', 'factures_multiples'],
    },
    periode: {
      anyOf: [{ type: 'string', pattern: '^\\d{4}-\\d{2}$' }, { type: 'null' }],
    },
    factures: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          sens: { type: 'string', enum: ['achat', 'vente'] },
          date: { type: 'string' },
          fournisseur_client: { type: 'string' },
          description: { type: 'string' },
          montant_ttc: { type: 'number' },
          taux_tva: { type: 'number' },
          montant_tva: { type: 'number' },
          montant_ht: { type: 'number' },
          mode_paiement: { type: 'string', enum: ['virement', 'cheque', 'effet', 'especes'] },
          numero_piece: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          ice: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        },
        required: [
          'sens',
          'date',
          'fournisseur_client',
          'description',
          'montant_ttc',
          'taux_tva',
          'montant_tva',
          'montant_ht',
          'mode_paiement',
          'numero_piece',
          'ice',
        ],
      },
    },
    operations_ignorees: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          date: { type: 'string' },
          libelle: { type: 'string' },
          montant: { type: 'number' },
          sens: { type: 'string', enum: ['debit', 'credit'] },
          raison_exclusion: { type: 'string' },
        },
        required: ['date', 'libelle', 'montant', 'sens', 'raison_exclusion'],
      },
    },
  },
  required: ['type_document', 'periode', 'factures', 'operations_ignorees'],
} as const;

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

const sanitizeSecretValue = (value: string) => value.trim().replace(/^['"]+|['"]+$/g, '');
const parseN8nJsonResponse = async (response: Response) => {
  const rawBody = await response.text();

  if (!rawBody.trim()) {
    throw new Error(
      "Le webhook n8n a bien recu le PDF mais n'a retourne aucun JSON. Configurez le noeud Webhook n8n pour repondre a la fin du workflow avec un JSON final.",
    );
  }

  try {
    const payload = JSON.parse(rawBody);

    const looksLikeAnalysisPayload =
      ['factourati_tva_v1', 'factourati_tva_simple_v2'].includes(String(payload?.schema_name || '').trim()) ||
      Array.isArray(payload?.achats) ||
      Array.isArray(payload?.ventes) ||
      Array.isArray(payload?.toutes_operations) ||
      Array.isArray(payload?.autres);

    if (payload?.success === false || payload?.error || (!looksLikeAnalysisPayload && payload?.message)) {
      throw new Error(
        String(payload?.message || payload?.error || 'Analyse impossible. Veuillez reessayer ou verifier le fichier PDF.'),
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof Error && error.message !== 'Unexpected end of JSON input') {
      throw error;
    }

    throw new Error(
      "Le webhook n8n a repondu, mais pas avec un JSON valide. Le workflow doit renvoyer un objet JSON final compatible avec l'analyse TVA.",
    );
  }
};
const ensureVatAiPrompt = (prompt: string) =>
  prompt.includes('DATE | LIBELLE | DEBIT | CREDIT | SOLDE') &&
  prompt.includes('DEBIT  = colonne de gauche = argent qui SORT  = ACHAT') &&
  prompt.includes('CREDIT = colonne de droite = argent qui ENTRE = VENTE') &&
  prompt.includes('operations_ignorees')
    ? prompt
    : STRICT_BANK_STATEMENT_TVA_AI_PROMPT;
const normalizeVatAiModel = (model: string) => {
  const normalized = String(model || '').trim();
  return normalized || DEFAULT_TVA_AI_MODEL;
};
const roundToTwo = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const TVA_OPERATION_CLASSIFICATIONS: VatOperationClassification[] = ['achat_propose', 'vente_propose', 'ignore', 'a_verifier'];
const TVA_CONFIDENCE_LEVELS: VatConfidenceLevel[] = ['eleve', 'moyen', 'faible'];
const TVA_PAYMENT_MODES = ['virement', 'cheque', 'effet', 'paiement_en_ligne', 'carte', 'especes', 'autre'] as const;
const TVA_BANK_ANALYSIS_SYSTEM_PROMPT =
  "Tu es un expert-comptable marocain specialise dans l'analyse de releves bancaires pour la declaration TVA. Retourne uniquement du JSON strict.";
const TVA_BANK_ANALYSIS_BASE_PROMPT = `Tu analyses un releve bancaire marocain de societe pour la TVA.

MISSION ABSOLUE
- Lis le document ligne par ligne.
- Retourne toutes les lignes visibles sans en oublier aucune.
- Toutes les lignes doivent apparaitre dans toutes_operations.
- N oublie jamais la colonne CREDIT: un releve peut contenir achats ET ventes en meme temps.
- Si le releve contient des debits valides et des credits valides, retourne obligatoirement les deux.

LECTURE DES COLONNES
- DEBIT = argent qui sort = achat possible ou charge
- CREDIT = argent qui entre = vente possible ou encaissement client
- ANCIEN SOLDE, NOUVEAU SOLDE, SOLDE AU, REPORT et soldes similaires ne sont pas des factures: classification ignore

CLASSEMENT OBLIGATOIRE
- classification = achat_propose pour les debits professionnels lies a un fournisseur ou a une charge deductible: paiement facture, cheque, effet, telepaiement, chaabinet, telepeage, telecom, carburant, transport, maintenance, hebergement, logiciel, abonnement, loyer, honoraires, achat de marchandises ou de services
- classification = vente_propose pour les credits correspondant a un reglement client ou un encaissement: virement recu, vir recu, remise cheque, encaissement, versement client, paiement client, reglement recu, effet client
- classification = ignore pour les lignes hors TVA mais a laisser visibles: DGI, TVA, IS, IR, taxe professionnelle, CNSS, AMO, CIMR, salaires, commissions, frais bancaires, agios, interets, retraits especes, DAB, credits bancaires, prets, remboursements d echeances, virements internes, anciens soldes, nouveaux soldes
- classification = ignore aussi pour les virements personnels ou operations privees: cash plus, cashplus, wafacash, en faveur de prenom nom, personne physique, virement propre, apport personnel. Ces lignes doivent rester visibles pour le client mais ne doivent jamais etre ajoutees dans la TVA
- classification = a_verifier seulement si la ligne reste reellement ambigue apres lecture

DONNEES A REMPLIR
- fournisseur_client = nom du tiers le plus utile et le plus propre possible, pas tout le libelle brut
- description = resume court et lisible de l operation
- numero_piece = numero de cheque, effet, reference ou piece si visible
- mode_paiement_detecte = virement, cheque, effet, paiement_en_ligne, carte, especes ou autre
- taux_tva = 20 par defaut pour achat_propose et vente_propose si la TVA n est pas lisible
- taux_tva = null pour ignore ou a_verifier si la TVA n est pas exploitable

REGLE FINALE
- Ne supprime jamais une ligne
- Ne transforme jamais une operation personnelle, bancaire ou fiscale en TVA
- Ne perds jamais les credits quand ils existent dans le releve`;
const TVA_BANK_ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    type_document: {
      type: 'string',
      enum: ['facture_unique', 'releve_bancaire', 'factures_multiples'],
    },
    banque: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    societe_titulaire: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    periode: {
      type: 'object',
      additionalProperties: false,
      properties: {
        date_debut: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        date_fin: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        mois: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      },
      required: ['date_debut', 'date_fin', 'mois'],
    },
    toutes_operations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id_ligne: { type: 'string' },
          date: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          libelle_original: { type: 'string' },
          montant_debit: { type: 'number' },
          montant_credit: { type: 'number' },
          sens_bancaire: { type: 'string', enum: ['debit', 'credit', 'inconnu'] },
          mode_paiement_detecte: { type: 'string', enum: [...TVA_PAYMENT_MODES] },
          classification: { type: 'string', enum: [...TVA_OPERATION_CLASSIFICATIONS] },
          raison: { type: 'string' },
          niveau_confiance: { type: 'string', enum: [...TVA_CONFIDENCE_LEVELS] },
          fournisseur_client: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          description: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          numero_piece: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          taux_tva: { anyOf: [{ type: 'number' }, { type: 'null' }] },
        },
        required: [
          'id_ligne',
          'date',
          'libelle_original',
          'montant_debit',
          'montant_credit',
          'sens_bancaire',
          'mode_paiement_detecte',
          'classification',
          'raison',
          'niveau_confiance',
          'fournisseur_client',
          'description',
          'numero_piece',
          'taux_tva',
        ],
      },
    },
    alertes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { type: 'string' },
          message: { type: 'string' },
        },
        required: ['type', 'message'],
      },
    },
  },
  required: ['type_document', 'banque', 'societe_titulaire', 'periode', 'toutes_operations', 'alertes'],
} as const;

const TVA_AMBIGUOUS_RECHECK_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    operations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id_ligne: { type: 'string' },
          classification: { type: 'string', enum: [...TVA_OPERATION_CLASSIFICATIONS] },
          niveau_confiance: { type: 'string', enum: [...TVA_CONFIDENCE_LEVELS] },
          raison: { type: 'string' },
          fournisseur_client: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          description: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          numero_piece: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          mode_paiement_detecte: { type: 'string', enum: [...TVA_PAYMENT_MODES] },
          taux_tva: { anyOf: [{ type: 'number' }, { type: 'null' }] },
        },
        required: [
          'id_ligne',
          'classification',
          'niveau_confiance',
          'raison',
          'fournisseur_client',
          'description',
          'numero_piece',
          'mode_paiement_detecte',
          'taux_tva',
        ],
      },
    },
  },
  required: ['operations'],
} as const;

const flattenOpenAIText = (payload: any) => {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const parts: string[] = [];
  for (const output of payload?.output || []) {
    for (const content of output?.content || []) {
      if (typeof content?.text === 'string' && content.text.trim()) {
        parts.push(content.text.trim());
      }
    }
  }

  return parts.join('\n').trim();
};

const repairLooseJson = (rawText: string) =>
  String(rawText || '')
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .trim();

const parseLooseJson = (rawText: string) => {
  const cleaned = repairLooseJson(
    String(rawText || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim(),
  );
  const objectStart = cleaned.indexOf('{');
  const objectEnd = cleaned.lastIndexOf('}');
  const arrayStart = cleaned.indexOf('[');
  const arrayEnd = cleaned.lastIndexOf(']');
  const canUseObject = objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart;
  const canUseArray = arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart;
  const jsonStart = canUseObject && (!canUseArray || objectStart <= arrayStart) ? objectStart : arrayStart;
  const jsonEnd = canUseObject && (!canUseArray || objectEnd >= arrayEnd) ? objectEnd : arrayEnd;

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error("Le JSON d'extraction IA est introuvable.");
  }

  return JSON.parse(repairLooseJson(cleaned.slice(jsonStart, jsonEnd + 1)));
};

const parseOpenAIExtractionPayload = (payload: any) => {
  if (payload?.output_parsed && typeof payload.output_parsed === 'object') {
    return payload.output_parsed;
  }

  for (const output of payload?.output || []) {
    for (const content of output?.content || []) {
      if (content?.parsed && typeof content.parsed === 'object') {
        return content.parsed;
      }
    }
  }

  return parseLooseJson(flattenOpenAIText(payload));
};

const callOpenAIJsonSchema = async ({
  apiKey,
  model,
  instructions,
  input,
  schemaName,
  schema,
  maxOutputTokens = 9000,
  timeoutMs = 120000,
}: {
  apiKey: string;
  model: string;
  instructions: string;
  input: unknown[];
  schemaName: string;
  schema: Record<string, unknown>;
  maxOutputTokens?: number;
  timeoutMs?: number;
}) => {
  const controller = new AbortController();
  const timeoutHandle = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        instructions,
        input,
        text: {
          format: {
            type: 'json_schema',
            name: schemaName,
            strict: true,
            schema,
          },
        },
        temperature: 0,
        max_output_tokens: maxOutputTokens,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const rawError = await response.text();
      throw new Error(rawError || "OpenAI a retourne une erreur pendant l'analyse du PDF.");
    }

    const payload = await response.json();

    if (String(payload?.status || '').toLowerCase() === 'incomplete') {
      const incompleteReason = String(payload?.incomplete_details?.reason || '').trim();
      throw new Error(
        incompleteReason
          ? `Reponse OpenAI incomplete: ${incompleteReason}`
          : 'Reponse OpenAI incomplete.',
      );
    }

    return parseOpenAIExtractionPayload(payload);
  } catch (error) {
    if ((error as { name?: string })?.name === 'AbortError') {
      throw new Error("Le delai d'analyse IA a ete depasse.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutHandle);
  }
};

const recheckAmbiguousOperations = async ({
  apiKey,
  operations,
}: {
  apiKey: string;
  operations: VatBankOperation[];
}) => {
  if (!operations.length) return [];

  const payload = await callOpenAIJsonSchema({
    apiKey,
    model: 'gpt-5.4',
    instructions:
      "Tu reclasses uniquement des operations de releve bancaire marocain deja extraites. Retourne uniquement le JSON strict demande.",
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Reclasse seulement ces operations ambiguës.
Rappels obligatoires:
- debit = sortie d argent = achat possible
- credit = entree d argent = vente possible
- ancien solde, nouveau solde, commission, frais, taxe, salaire, credit, pret, remboursement, retrait, virement interne et virement personnel doivent rester en ignore
- un debit fournisseur, paiement facture, cheque, effet, telepaiement ou charge professionnelle doit basculer en achat_propose
- un credit client, virement recu, remise cheque, encaissement, versement client ou reglement recu doit basculer en vente_propose
- les virements personnels restent visibles mais hors TVA en ignore
- si le doute reste reel, garder a_verifier
Operations:
${JSON.stringify(operations)}`,
          },
        ],
      },
    ],
    schemaName: 'vat_ambiguous_recheck',
    schema: TVA_AMBIGUOUS_RECHECK_JSON_SCHEMA as unknown as Record<string, unknown>,
    maxOutputTokens: 3000,
    timeoutMs: 60000,
  });

  return Array.isArray(payload?.operations) ? payload.operations : [];
};

const buildPromptWithCustomInstructions = (basePrompt: string, customPrompt: string) => {
  const trimmed = String(customPrompt || '').trim();
  if (!trimmed) return basePrompt;

  const looksLikeLegacyDefault =
    trimmed.includes('DATE | LIBELLE | DEBIT | CREDIT | SOLDE') ||
    trimmed.includes('operations_ignorees') ||
    trimmed.includes('factures achat');

  if (looksLikeLegacyDefault) {
    return basePrompt;
  }

  return `${basePrompt}\nConsignes supplementaires:\n${trimmed.slice(0, 1200)}`;
};

const STRUCTURED_ANALYSIS_MAX_OUTPUT_TOKENS = [12000, 22000] as const;

const isRetryableStructuredAnalysisError = (error: unknown) => {
  const message = String((error as { message?: string })?.message || '').toLowerCase();

  return (
    message.includes('json') ||
    message.includes('incomplete') ||
    message.includes('max_output_tokens') ||
    message.includes('max output tokens') ||
    message.includes('unexpected end') ||
    message.includes("expected ','") ||
    message.includes("expected '") ||
    message.includes('introuvable')
  );
};

const analyzePdfWithStructuredOutputs = async ({
  apiKey,
  model,
  prompt,
  file,
}: {
  apiKey: string;
  model: string;
  prompt: string;
  file: File;
}) => {
  const base64File = await fileToBase64(file);
  let lastError: Error | null = null;

  for (const maxOutputTokens of STRUCTURED_ANALYSIS_MAX_OUTPUT_TOKENS) {
    try {
      return await callOpenAIJsonSchema({
        apiKey,
        model,
        instructions: TVA_BANK_ANALYSIS_SYSTEM_PROMPT,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: prompt,
              },
              {
                type: 'input_file',
                filename: file.name || 'releve-bancaire.pdf',
                file_data: `data:application/pdf;base64,${base64File}`,
              },
            ],
          },
        ],
        schemaName: 'vat_bank_statement_analysis',
        schema: TVA_BANK_ANALYSIS_JSON_SCHEMA as unknown as Record<string, unknown>,
        maxOutputTokens,
        timeoutMs: 120000,
      });
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error("L'analyse IA du releve bancaire a echoue.");

      const canRetry =
        maxOutputTokens !== STRUCTURED_ANALYSIS_MAX_OUTPUT_TOKENS[STRUCTURED_ANALYSIS_MAX_OUTPUT_TOKENS.length - 1] &&
        isRetryableStructuredAnalysisError(lastError);

      if (!canRetry) {
        if (isRetryableStructuredAnalysisError(lastError)) {
          throw new Error(
            "Le releve bancaire est trop volumineux ou la reponse IA a ete tronquee. Relancez l'analyse: Factourati conservera toujours les lignes deja detectees et vous pourrez completer le reste manuellement.",
          );
        }
        throw lastError;
      }
    }
  }

  throw lastError || new Error("L'analyse IA du releve bancaire a echoue.");
};

const normalizeConfidence = (value: unknown): VatConfidenceLevel => {
  const normalized = String(value || '').trim().toLowerCase();
  return TVA_CONFIDENCE_LEVELS.includes(normalized as VatConfidenceLevel)
    ? (normalized as VatConfidenceLevel)
    : 'faible';
};

const normalizeOperationClassification = (value: unknown): VatOperationClassification => {
  const normalized = String(value || '').trim().toLowerCase();
  return TVA_OPERATION_CLASSIFICATIONS.includes(normalized as VatOperationClassification)
    ? (normalized as VatOperationClassification)
    : 'a_verifier';
};

const normalizeBankDirection = (value: unknown, debit: number, credit: number): VatBankOperation['sens_bancaire'] => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'debit' || normalized === 'credit' || normalized === 'inconnu') {
    return normalized;
  }
  if (debit > 0 && credit <= 0) return 'debit';
  if (credit > 0 && debit <= 0) return 'credit';
  return 'inconnu';
};

const normalizeAmount = (value: unknown) => roundToTwo(Math.max(0, Number(value || 0)));
const normalizeText = (value: unknown) => String(value || '').replace(/\s+/g, ' ').trim();
const stripAccents = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
const toKeywordText = (value: unknown) => stripAccents(String(value || '').toLowerCase());

const OPENING_BALANCE_KEYWORDS = ['ancien solde', 'nouveau solde', 'solde au', 'report', 'solde precedent', 'solde initial'];
const TAX_AND_SOCIAL_KEYWORDS = ['dgi', 'tva', 'impot', 'is ', 'ir ', 'taxe', 'tp', 'cnss', 'amo', 'cimr'];
const BANK_FEE_KEYWORDS = ['commission', 'frais', 'agio', 'interet', 'tenue de compte', 'frais bancaires'];
const CASH_WITHDRAWAL_KEYWORDS = ['dab', 'retrait', 'especes', 'guichet', 'remise especes'];
const FINANCING_KEYWORDS = ['credit', 'pret', 'leasing', 'echeance', 'remboursement', 'deblocage', 'debloquage'];
const INTERNAL_TRANSFER_KEYWORDS = ['virement interne', 'entre comptes', 'inter comptes', 'compte a compte', 'virement propre', 'apport personnel'];
const PERSONAL_TRANSFER_KEYWORDS = ['cash plus', 'cashplus', 'wafacash', 'barid cash', 'moneygram', 'western union', 'ria', 'en faveur de', 'faveur de', 'digital ordinaire emis vers'];
const PROFESSIONAL_ENTITY_KEYWORDS = ['sarl', 'sarlau', 'sa', 'sas', 'snc', 'ste', 'societe', 'company', 'ltd', 'auto entrepreneur'];
const PURCHASE_HINT_KEYWORDS = [
  'paiement facture',
  'facture',
  'chaabinet',
  'autoroute',
  'autoroutes',
  'telepeage',
  'peage',
  'carburant',
  'station',
  'maintenance',
  'transport',
  'telecom',
  'orange',
  'inwi',
  'iam',
  'onee',
  'lydec',
  'radee',
  'hebergement',
  'abonnement',
  'logiciel',
  'fourniture',
  'materiel',
  'prest',
  'consult',
  'honoraire',
  'loyer',
  'achat',
];
const SALES_HINT_KEYWORDS = [
  'reglement client',
  'paiement client',
  'virement recu',
  'vir recu',
  'encaissement',
  'encaissement client',
  'remise chq',
  'remise cheque',
  'remise effet',
  'versement client',
  'reglement recu',
  'recu de',
  'facture vente',
];

const hasAnyKeyword = (value: unknown, keywords: string[]) => {
  const haystack = toKeywordText(value);
  return keywords.some((keyword) => haystack.includes(keyword));
};

const hasProfessionalEntityMarker = (value: unknown) => hasAnyKeyword(value, PROFESSIONAL_ENTITY_KEYWORDS);

const isLikelyPersonalTransfer = (label: unknown) =>
  hasAnyKeyword(label, PERSONAL_TRANSFER_KEYWORDS) && !hasProfessionalEntityMarker(label);

const inferClassificationFromHeuristics = (
  operation: Pick<VatBankOperation, 'sens_bancaire' | 'libelle_original' | 'mode_paiement_detecte'>,
) => {
  const label = operation.libelle_original;
  const direction = operation.sens_bancaire;
  const mode = operation.mode_paiement_detecte;

  if (hasAnyKeyword(label, OPENING_BALANCE_KEYWORDS)) {
    return {
      classification: 'ignore' as VatOperationClassification,
      niveau_confiance: 'eleve' as VatConfidenceLevel,
      raison: 'Ancien ou nouveau solde sans impact TVA.',
    };
  }

  if (hasAnyKeyword(label, BANK_FEE_KEYWORDS)) {
    return {
      classification: 'ignore' as VatOperationClassification,
      niveau_confiance: 'eleve' as VatConfidenceLevel,
      raison: 'Frais ou commission bancaire a exclure de la TVA.',
    };
  }

  if (hasAnyKeyword(label, TAX_AND_SOCIAL_KEYWORDS)) {
    return {
      classification: 'ignore' as VatOperationClassification,
      niveau_confiance: 'eleve' as VatConfidenceLevel,
      raison: 'Taxe ou cotisation sans impact TVA deductible.',
    };
  }

  if (hasAnyKeyword(label, CASH_WITHDRAWAL_KEYWORDS)) {
    return {
      classification: 'ignore' as VatOperationClassification,
      niveau_confiance: 'eleve' as VatConfidenceLevel,
      raison: 'Retrait ou espece a laisser visible hors TVA.',
    };
  }

  if (hasAnyKeyword(label, FINANCING_KEYWORDS)) {
    return {
      classification: 'ignore' as VatOperationClassification,
      niveau_confiance: 'eleve' as VatConfidenceLevel,
      raison: 'Credit, pret ou remboursement bancaire hors TVA.',
    };
  }

  if (hasAnyKeyword(label, INTERNAL_TRANSFER_KEYWORDS)) {
    return {
      classification: 'ignore' as VatOperationClassification,
      niveau_confiance: 'eleve' as VatConfidenceLevel,
      raison: 'Virement interne sans impact TVA.',
    };
  }

  if (direction === 'debit' && isLikelyPersonalTransfer(label)) {
    return {
      classification: 'ignore' as VatOperationClassification,
      niveau_confiance: 'eleve' as VatConfidenceLevel,
      raison: 'Virement personnel visible pour controle client mais hors TVA.',
    };
  }

  const purchaseSignal =
    direction === 'debit' &&
    (
      hasProfessionalEntityMarker(label) ||
      hasAnyKeyword(label, PURCHASE_HINT_KEYWORDS) ||
      ((mode === 'cheque' || mode === 'effet' || mode === 'paiement_en_ligne' || mode === 'carte') &&
        hasAnyKeyword(label, ['paiement', 'facture', 'reglement', 'chaabinet']))
    );

  if (purchaseSignal) {
    return {
      classification: 'achat_propose' as VatOperationClassification,
      niveau_confiance: hasProfessionalEntityMarker(label) ? ('eleve' as VatConfidenceLevel) : ('moyen' as VatConfidenceLevel),
      raison: 'Debit associe a un achat professionnel probable.',
    };
  }

  const salesSignal =
    direction === 'credit' &&
    (
      hasProfessionalEntityMarker(label) ||
      hasAnyKeyword(label, SALES_HINT_KEYWORDS) ||
      ((mode === 'virement' || mode === 'cheque' || mode === 'effet') &&
        hasAnyKeyword(label, ['recu', 'remise', 'encaissement', 'reglement', 'versement', 'client']))
    );

  if (salesSignal) {
    return {
      classification: 'vente_propose' as VatOperationClassification,
      niveau_confiance: hasProfessionalEntityMarker(label) ? ('eleve' as VatConfidenceLevel) : ('moyen' as VatConfidenceLevel),
      raison: 'Credit associe a un encaissement client probable.',
    };
  }

  if (direction === 'credit') {
    return {
      classification: 'a_verifier' as VatOperationClassification,
      niveau_confiance: 'faible' as VatConfidenceLevel,
      raison: 'Credit detecte: verifier s il s agit d un encaissement client.',
    };
  }

  return {
    classification: 'a_verifier' as VatOperationClassification,
    niveau_confiance: 'faible' as VatConfidenceLevel,
    raison: 'Operation ambigue a verifier manuellement.',
  };
};

const inferCounterpartFromLabel = (value: unknown) => {
  const label = normalizeText(value);
  return label ? label.slice(0, 140) : null;
};

const buildTvaApiUrl = (baseUrl: string, path: string, params?: URLSearchParams) => {
  const normalizedPath = path.replace(/^\/+/, '');
  const nextParams = new URLSearchParams(params);

  if (baseUrl === '/.netlify/functions/tva') {
    nextParams.set('route', normalizedPath);
    return `${baseUrl}?${nextParams.toString()}`;
  }

  const queryString = nextParams.toString();
  return `${baseUrl}/${normalizedPath}${queryString ? `?${queryString}` : ''}`;
};

const fileToBase64 = async (file: File) => {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = '';

  for (let index = 0; index < buffer.length; index += 0x8000) {
    binary += String.fromCharCode(...buffer.subarray(index, index + 0x8000));
  }

  return btoa(binary);
};

const bufferToHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const stripUndefinedDeep = <T,>(value: T): T => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => stripUndefinedDeep(entry))
      .filter((entry) => entry !== undefined) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, stripUndefinedDeep(entry)]),
    ) as T;
  }

  return value;
};

const computeFileHash = async (file: File) => {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return bufferToHex(digest);
};

const buildAnalysisCacheDocId = (userId: string, hash: string) => `${userId}__${hash}`;

const getExtractionCounts = (result: PurchaseVatExtractionResult) => ({
  achats: result.factures.filter((facture) => facture.sens === 'achat').length,
  ventes: result.factures.filter((facture) => facture.sens === 'vente').length,
  ignorees: result.operations_ignorees.length,
});

const normalizeIsoDate = (value: unknown, fallback = new Date().toISOString().split('T')[0]) => {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const dayMonthYear = raw.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (dayMonthYear) {
    const [, day, month, year] = dayMonthYear;
    return `${year}-${month}-${day}`;
  }

  const parsedDate = new Date(raw);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().split('T')[0];
  }

  return fallback;
};

const normalizePeriod = (value: unknown) => {
  const raw = String(value || '').trim();
  return /^\d{4}-\d{2}$/.test(raw) ? raw : null;
};

const normalizeVatRate = (value: unknown) => {
  const numeric = Number(value);
  return VALID_VAT_RATES.includes(numeric as (typeof VALID_VAT_RATES)[number])
    ? (numeric as 0 | 7 | 10 | 13 | 14 | 20)
    : 20;
};

const normalizePaymentMode = (value: unknown) => {
  const raw = String(value || '').trim().toLowerCase();
  if (
    raw.includes('cmi') ||
    raw.includes('stripe') ||
    raw.includes('paypal') ||
    raw.includes('online') ||
    raw.includes('en ligne') ||
    raw.includes('chaabinet')
  ) {
    return 'paiement_en_ligne';
  }
  if (raw.includes('cb') || raw.includes('carte') || raw.includes('tpe')) return 'carte';
  if (raw.includes('virement') || raw.startsWith('vir') || raw.includes('vrt')) return 'virement';
  if (raw.includes('effet') || raw.includes('traite') || raw.includes('lcn')) return 'effet';
  if (raw.includes('cheque') || raw.includes('chèque')) return 'cheque';
  if (raw.includes('espece') || raw.includes('espèce')) return 'especes';
  return raw ? 'autre' : 'virement';
};

const normalizeDirection = (value: unknown) => {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (
    raw.includes('vente') ||
    raw.includes('credit') ||
    raw.includes('encaisse') ||
    raw.includes('client') ||
    raw.includes('reglement recu')
  ) {
    return 'vente';
  }

  return 'achat';
};

const normalizeIce = (value: unknown) => {
  const digitsOnly = String(value || '').replace(/\D/g, '');
  return digitsOnly.length === 15 ? digitsOnly : null;
};

const buildOperationAmounts = (montantTtcValue: unknown, tauxTvaValue: unknown, montantHtValue: unknown, montantTvaValue: unknown) => {
  const montantTtc = Number(montantTtcValue);
  const tauxTva = normalizeVatRate(tauxTvaValue);
  const hasVisibleHt = Number.isFinite(Number(montantHtValue));
  const hasVisibleVat = Number.isFinite(Number(montantTvaValue));

  if (hasVisibleHt && hasVisibleVat) {
    return {
      montant_ttc: roundToTwo(montantTtc),
      taux_tva: tauxTva,
      montant_ht: roundToTwo(Number(montantHtValue)),
      montant_tva: roundToTwo(Number(montantTvaValue)),
    };
  }

  const calculated = calculateVatFromTTC(Number.isFinite(montantTtc) ? montantTtc : 0, tauxTva);
  return {
    montant_ttc: roundToTwo(Number.isFinite(montantTtc) ? montantTtc : 0),
    taux_tva: tauxTva,
    montant_ht: calculated.ht,
    montant_tva: calculated.vat,
  };
};

const normalizeAnalysisOperation = (operation: any, index: number): VatBankOperation | null => {
  const montant_debit = normalizeAmount(operation?.montant_debit);
  const montant_credit = normalizeAmount(operation?.montant_credit);
  const libelle_original = normalizeText(operation?.libelle_original || operation?.libelle || operation?.description);

  if (!libelle_original && montant_debit <= 0 && montant_credit <= 0) {
    return null;
  }

  const baseOperation: VatBankOperation = {
    id_ligne: normalizeText(operation?.id_ligne) || `ligne_${index + 1}`,
    date: normalizeText(operation?.date) ? normalizeIsoDate(operation?.date, normalizeText(operation?.date)) : null,
    libelle_original: libelle_original || `Operation ${index + 1}`,
    montant_debit,
    montant_credit,
    sens_bancaire: normalizeBankDirection(operation?.sens_bancaire, montant_debit, montant_credit),
    mode_paiement_detecte: normalizePaymentMode(
      operation?.mode_paiement_detecte || operation?.mode_paiement || libelle_original,
    ),
    classification: normalizeOperationClassification(operation?.classification),
    raison: normalizeText(operation?.raison),
    niveau_confiance: normalizeConfidence(operation?.niveau_confiance),
    fournisseur_client: normalizeText(operation?.fournisseur_client) || null,
    description: normalizeText(operation?.description) || null,
    numero_piece: normalizeText(operation?.numero_piece) || null,
    taux_tva: Number.isFinite(Number(operation?.taux_tva)) ? normalizeVatRate(operation?.taux_tva) : null,
  };

  const heuristic = inferClassificationFromHeuristics(baseOperation);
  if (!baseOperation.raison) {
    baseOperation.raison = heuristic.raison;
  }
  if (!baseOperation.fournisseur_client) {
    baseOperation.fournisseur_client = inferCounterpartFromLabel(baseOperation.libelle_original);
  }
  if (!baseOperation.description) {
    baseOperation.description = baseOperation.libelle_original;
  }

  if (baseOperation.classification === 'a_verifier' && heuristic.classification !== 'a_verifier') {
    baseOperation.classification = heuristic.classification;
    baseOperation.niveau_confiance = heuristic.niveau_confiance;
    baseOperation.raison = heuristic.raison;
  }

  if (
    baseOperation.classification === 'ignore' &&
    (heuristic.classification === 'achat_propose' || heuristic.classification === 'vente_propose')
  ) {
    baseOperation.classification = heuristic.classification;
    baseOperation.niveau_confiance = heuristic.niveau_confiance;
    baseOperation.raison = heuristic.raison;
  }

  if (baseOperation.sens_bancaire === 'debit' && baseOperation.classification === 'vente_propose') {
    baseOperation.classification = 'a_verifier';
    baseOperation.niveau_confiance = 'faible';
    baseOperation.raison = 'Debit detecte mais classification vente incoherente.';
  }

  if (baseOperation.sens_bancaire === 'credit' && baseOperation.classification === 'achat_propose') {
    baseOperation.classification = 'a_verifier';
    baseOperation.niveau_confiance = 'faible';
    baseOperation.raison = 'Credit detecte mais classification achat incoherente.';
  }

  if (baseOperation.sens_bancaire === 'inconnu') {
    baseOperation.classification = 'a_verifier';
    baseOperation.niveau_confiance = 'faible';
    baseOperation.raison = baseOperation.raison || 'Sens bancaire ambigu.';
  }

  if (baseOperation.montant_debit <= 0 && baseOperation.montant_credit <= 0) {
    baseOperation.classification = 'a_verifier';
    baseOperation.niveau_confiance = 'faible';
    baseOperation.raison = 'Montant debit et credit absents.';
  }

  if (baseOperation.montant_debit > 0 && baseOperation.montant_credit > 0) {
    baseOperation.classification = 'a_verifier';
    baseOperation.niveau_confiance = 'faible';
    baseOperation.raison = 'Debit et credit renseignes sur la meme ligne.';
  }

  return baseOperation;
};

const buildLegacyOperationsFromPayload = (payload: any) => {
  const factures = Array.isArray(payload?.factures) ? payload.factures : [];
  const ignored = Array.isArray(payload?.operations_ignorees) ? payload.operations_ignorees : [];

  return [
    ...factures.map((facture: any, index: number) => ({
      id_ligne: `legacy_facture_${index + 1}`,
      date: facture?.date || null,
      libelle_original: facture?.description || facture?.fournisseur_client || 'Operation extraite',
      montant_debit: facture?.sens === 'achat' ? Number(facture?.montant_ttc || 0) : 0,
      montant_credit: facture?.sens === 'vente' ? Number(facture?.montant_ttc || 0) : 0,
      sens_bancaire: facture?.sens === 'vente' ? 'credit' : 'debit',
      mode_paiement_detecte: facture?.mode_paiement || 'autre',
      classification: facture?.sens === 'vente' ? 'vente_propose' : 'achat_propose',
      raison: 'Operation proposee par l analyse IA.',
      niveau_confiance: 'moyen',
      fournisseur_client: facture?.fournisseur_client || null,
      description: facture?.description || null,
      numero_piece: facture?.numero_piece || null,
      taux_tva: facture?.taux_tva ?? 20,
    })),
    ...ignored.map((operation: any, index: number) => ({
      id_ligne: `legacy_ignore_${index + 1}`,
      date: operation?.date || null,
      libelle_original: operation?.libelle || 'Operation ignoree',
      montant_debit: String(operation?.sens || '').toLowerCase() === 'credit' ? 0 : Number(operation?.montant || 0),
      montant_credit: String(operation?.sens || '').toLowerCase() === 'credit' ? Number(operation?.montant || 0) : 0,
      sens_bancaire: String(operation?.sens || '').toLowerCase() === 'credit' ? 'credit' : 'debit',
      mode_paiement_detecte: 'autre',
      classification: 'ignore',
      raison: operation?.raison_exclusion || 'Operation exclue.',
      niveau_confiance: 'eleve',
      fournisseur_client: null,
      description: operation?.libelle || null,
      numero_piece: null,
      taux_tva: null,
    })),
  ];
};

const buildFactureFromOperation = (operation: VatBankOperation): VatExtractedOperation => {
  const classification = operation.classification === 'vente_propose' ? 'vente_propose' : 'achat_propose';
  const sens = classification === 'vente_propose' ? 'vente' : 'achat';
  const montantTtc = sens === 'vente' ? operation.montant_credit : operation.montant_debit;
  const tauxTva = normalizeVatRate(operation.taux_tva ?? 20);
  const amounts = calculateVatFromTTC(montantTtc, tauxTva);

  return {
    id: `extracted-${operation.id_ligne}`,
    id_ligne_source: operation.id_ligne,
    classification,
    sens,
    date: normalizeIsoDate(operation.date || undefined),
    libelle_original: operation.libelle_original,
    numero_facture: null,
    fournisseur_client: operation.fournisseur_client || inferCounterpartFromLabel(operation.libelle_original) || 'Tiers a verifier',
    description: operation.description || operation.libelle_original,
    montant_ttc: roundToTwo(montantTtc),
    taux_tva: tauxTva,
    montant_tva: amounts.vat,
    montant_ht: amounts.ht,
    mode_paiement: normalizePaymentMode(operation.mode_paiement_detecte),
    numero_piece: operation.numero_piece || null,
    ice: null,
    tva_modifiable: true,
    niveau_confiance: operation.niveau_confiance,
    raison_classement: operation.raison || 'Classement IA',
    ignoree: false,
  };
};

const buildIgnoredOperationFromAnalysisOperation = (operation: VatBankOperation): VatIgnoredOperation => ({
  id: `ignored-${operation.id_ligne}`,
  id_ligne_source: operation.id_ligne,
  date: normalizeIsoDate(operation.date || undefined),
  libelle: operation.libelle_original,
  montant: roundToTwo(operation.montant_debit > 0 ? operation.montant_debit : operation.montant_credit),
  sens: operation.sens_bancaire === 'credit' ? 'credit' : 'debit',
  raison_exclusion: operation.raison || 'Operation exclue',
});

const buildAnalysisAlerts = (operations: VatBankOperation[], rawAlerts: any[]): VatAnalysisAlert[] => {
  const alerts: VatAnalysisAlert[] = [];
  const seen = new Set<string>();

  for (const alert of Array.isArray(rawAlerts) ? rawAlerts : []) {
    const message = normalizeText(alert?.message);
    if (message) {
      alerts.push({
        type: normalizeText(alert?.type) || 'analyse',
        message,
      });
    }
  }

  for (const operation of operations) {
    const duplicateKey = `${operation.date || ''}|${operation.libelle_original}|${operation.montant_debit}|${operation.montant_credit}`;
    if (seen.has(duplicateKey)) {
      alerts.push({
        type: 'doublon_possible',
        message: `Doublon possible detecte pour la ligne "${operation.libelle_original}".`,
      });
    } else {
      seen.add(duplicateKey);
    }

    if (!operation.date) {
      alerts.push({
        type: 'date_absente',
        message: `Date absente pour la ligne "${operation.libelle_original}".`,
      });
    }

    if (operation.sens_bancaire === 'inconnu') {
      alerts.push({
        type: 'ligne_ambigue',
        message: `Sens bancaire ambigu pour la ligne "${operation.libelle_original}".`,
      });
    }
  }

  const hasCreditOperations = operations.some((operation) => operation.sens_bancaire === 'credit');
  const hasDebitOperations = operations.some((operation) => operation.sens_bancaire === 'debit');
  const hasSales = operations.some((operation) => operation.classification === 'vente_propose');
  const hasPurchases = operations.some((operation) => operation.classification === 'achat_propose');

  if (hasCreditOperations && !hasSales) {
    alerts.push({
      type: 'ventes_absentes',
      message: 'Des lignes au credit existent mais aucune vente n a ete proposee. Verifiez les credits classes en ignore ou a_verifier.',
    });
  }

  if (hasDebitOperations && !hasPurchases) {
    alerts.push({
      type: 'achats_absents',
      message: 'Des lignes au debit existent mais aucun achat n a ete propose. Verifiez les debits classes en ignore ou a_verifier.',
    });
  }

  return alerts;
};

const buildVatAnalysisSummary = (
  operations: VatBankOperation[],
  factures: VatExtractedOperation[],
): VatAnalysisSummaryDetail => {
  const achats = factures.filter((facture) => facture.classification === 'achat_propose');
  const ventes = factures.filter((facture) => facture.classification === 'vente_propose');

  return {
    nombre_operations_total: operations.length,
    nombre_achats_proposes: achats.length,
    nombre_ventes_proposees: ventes.length,
    nombre_operations_ignorees: operations.filter((operation) => operation.classification === 'ignore').length,
    nombre_operations_a_verifier: operations.filter((operation) => operation.classification === 'a_verifier').length,
    total_achats_ttc: roundToTwo(achats.reduce((sum, facture) => sum + Number(facture.montant_ttc || 0), 0)),
    total_ventes_ttc: roundToTwo(ventes.reduce((sum, facture) => sum + Number(facture.montant_ttc || 0), 0)),
    total_tva_deductible: roundToTwo(achats.reduce((sum, facture) => sum + Number(facture.montant_tva || 0), 0)),
    total_tva_collectee: roundToTwo(ventes.reduce((sum, facture) => sum + Number(facture.montant_tva || 0), 0)),
  };
};

const normalizeFactouratiSummary = (
  rawSummary: any,
  operations: VatBankOperation[],
  factures: VatExtractedOperation[],
): VatAnalysisSummaryDetail => {
  if (!rawSummary || typeof rawSummary !== 'object') {
    return buildVatAnalysisSummary(operations, factures);
  }

  const achats = factures.filter((facture) => facture.classification === 'achat_propose');
  const ventes = factures.filter((facture) => facture.classification === 'vente_propose');

  return {
    nombre_operations_total: Math.max(
      0,
      Number(
        rawSummary.nombre_operations_total ??
        rawSummary.total_operations ??
        rawSummary.nombre_operations_analysees ??
        operations.length,
      ) || 0,
    ),
    nombre_achats_proposes: Math.max(
      0,
      Number(rawSummary.nombre_achats_proposes ?? rawSummary.nb_achats ?? achats.length) || 0,
    ),
    nombre_ventes_proposees: Math.max(
      0,
      Number(rawSummary.nombre_ventes_proposees ?? rawSummary.nb_ventes ?? ventes.length) || 0,
    ),
    nombre_operations_ignorees: Math.max(
      0,
      Number(
        rawSummary.nombre_operations_ignorees ??
        rawSummary.nb_hors_tva ??
        operations.filter((operation) => operation.classification === 'ignore').length,
      ) || 0,
    ),
    nombre_operations_a_verifier: Math.max(
      0,
      Number(
        rawSummary.nombre_operations_a_verifier ??
        rawSummary.nb_a_verifier ??
        operations.filter((operation) => operation.classification === 'a_verifier').length,
      ) || 0,
    ),
    total_achats_ttc: roundToTwo(
      Number(rawSummary.total_achats_ttc ?? rawSummary.total_achats ?? achats.reduce((sum, facture) => sum + Number(facture.montant_ttc || 0), 0)) || 0,
    ),
    total_ventes_ttc: roundToTwo(
      Number(rawSummary.total_ventes_ttc ?? rawSummary.total_ventes ?? ventes.reduce((sum, facture) => sum + Number(facture.montant_ttc || 0), 0)) || 0,
    ),
    total_tva_deductible: roundToTwo(
      Number(rawSummary.total_tva_deductible ?? rawSummary.tva_deductible ?? achats.reduce((sum, facture) => sum + Number(facture.montant_tva || 0), 0)) || 0,
    ),
    total_tva_collectee: roundToTwo(
      Number(rawSummary.total_tva_collectee ?? rawSummary.tva_collectee ?? ventes.reduce((sum, facture) => sum + Number(facture.montant_tva || 0), 0)) || 0,
    ),
  };
};

const normalizeFactouratiExtractedOperation = (
  operation: any,
  index: number,
  sens: 'achat' | 'vente',
): VatExtractedOperation | null => {
  const counterpart = String(
    sens === 'achat'
      ? operation?.nom_fournisseur || operation?.fournisseur || operation?.fournisseur_client || operation?.nom || operation?.description
      : operation?.nom_client || operation?.client || operation?.fournisseur_client || operation?.nom || operation?.description,
  ).trim();
  const description = String(operation?.description || operation?.libelle_original || counterpart).trim();
  const montantTtcSource = sens === 'achat'
    ? operation?.montant_ttc ?? operation?.montant_debit ?? operation?.montant
    : operation?.montant_ttc ?? operation?.montant_credit ?? operation?.montant;
  const montantTtc = Number(montantTtcSource);

  if (!counterpart || !description || !Number.isFinite(montantTtc) || montantTtc <= 0) {
    return null;
  }

  const amounts = buildOperationAmounts(
    montantTtcSource,
    operation?.taux_tva,
    operation?.montant_ht,
    operation?.montant_tva,
  );

  return {
    id: `factourati-${sens}-${index}-${counterpart}-${amounts.montant_ttc}`.replace(/\s+/g, '-'),
    id_ligne_source: String(operation?.id_ligne || operation?.id || `${sens}_${index + 1}`).trim(),
    classification: sens === 'achat' ? 'achat_propose' : 'vente_propose',
    sens,
    date: normalizeIsoDate(operation?.date),
    libelle_original: String(operation?.description || operation?.libelle_original || counterpart).trim(),
    numero_facture: String(operation?.numero_facture || '').trim() || null,
    fournisseur_client: counterpart,
    description,
    montant_ttc: amounts.montant_ttc,
    taux_tva: amounts.taux_tva,
    montant_tva: amounts.montant_tva,
    montant_ht: amounts.montant_ht,
    mode_paiement: normalizePaymentMode(operation?.mode_paiement),
    numero_piece: String(operation?.numero_piece || '').trim() || null,
    ice: normalizeIce(operation?.ice),
    tva_modifiable: true,
    niveau_confiance: 'moyen',
    raison_classement: String(operation?.motif_filtre || operation?.classification_finale || 'Operation analysee via n8n').trim(),
    ignoree: false,
  };
};

const buildAnalysisOperationFromFactouratiExtracted = (
  operation: VatExtractedOperation,
  index: number,
): VatBankOperation => ({
  id_ligne: operation.id_ligne_source || `factourati_line_${index + 1}`,
  date: operation.date,
  libelle_original: operation.libelle_original || operation.description || operation.fournisseur_client,
  montant_debit: operation.sens === 'achat' ? roundToTwo(operation.montant_ttc) : 0,
  montant_credit: operation.sens === 'vente' ? roundToTwo(operation.montant_ttc) : 0,
  sens_bancaire: operation.sens === 'vente' ? 'credit' : 'debit',
  mode_paiement_detecte: operation.mode_paiement,
  classification: operation.classification,
  raison: operation.raison_classement,
  niveau_confiance: operation.niveau_confiance,
  fournisseur_client: operation.fournisseur_client,
  description: operation.description,
  numero_piece: operation.numero_piece,
  taux_tva: operation.taux_tva,
});

const normalizeFactouratiIgnoredOperation = (
  operation: any,
  index: number,
  bucket: 'virements_personnels' | 'hors_tva',
): VatIgnoredOperation | null => {
  const libelle = String(operation?.description || operation?.nom || operation?.libelle_original || '').trim();
  const montant = Number(operation?.montant ?? operation?.montant_debit ?? operation?.montant_credit);

  if (!libelle || !Number.isFinite(montant) || montant <= 0) {
    return null;
  }

  return {
    id: `factourati-${bucket}-${index}-${libelle}`.replace(/\s+/g, '-'),
    id_ligne_source: String(operation?.id_ligne || operation?.id || `${bucket}_${index + 1}`).trim(),
    date: normalizeIsoDate(operation?.date),
    libelle,
    mode_paiement: normalizePaymentMode(operation?.mode_paiement),
    montant: roundToTwo(montant),
    sens: Number(operation?.montant_credit || 0) > 0 ? 'credit' : 'debit',
    raison_exclusion: String(operation?.motif_filtre || operation?.classification_finale || bucket).trim(),
    bucket,
  };
};

const buildAnalysisOperationFromFactouratiIgnored = (
  operation: VatIgnoredOperation,
): VatBankOperation => ({
  id_ligne: operation.id_ligne_source || operation.id,
  date: operation.date,
  libelle_original: operation.libelle,
  montant_debit: operation.sens === 'credit' ? 0 : operation.montant,
  montant_credit: operation.sens === 'credit' ? operation.montant : 0,
  sens_bancaire: operation.sens === 'credit' ? 'credit' : 'debit',
  mode_paiement_detecte: operation.mode_paiement || 'autre',
  classification: 'ignore',
  raison: operation.raison_exclusion,
  niveau_confiance: 'eleve',
  fournisseur_client: null,
  description: operation.libelle,
  numero_piece: null,
  taux_tva: 0,
});

const normalizeFactouratiReviewOperation = (operation: any, index: number): VatBankOperation | null => {
  const debit = normalizeAmount(operation?.montant_debit ?? operation?.montant);
  const credit = normalizeAmount(operation?.montant_credit);
  const libelle = normalizeText(operation?.description || operation?.libelle_original || operation?.nom);

  if (!libelle && debit <= 0 && credit <= 0) {
    return null;
  }

  return {
    id_ligne: normalizeText(operation?.id_ligne) || `factourati_review_${index + 1}`,
    date: normalizeText(operation?.date) ? normalizeIsoDate(operation?.date, normalizeText(operation?.date)) : null,
    libelle_original: libelle || `Operation a verifier ${index + 1}`,
    montant_debit: debit,
    montant_credit: credit,
    sens_bancaire: normalizeBankDirection(operation?.sens_bancaire, debit, credit),
    mode_paiement_detecte: normalizePaymentMode(operation?.mode_paiement || operation?.mode_paiement_detecte),
    classification: 'a_verifier',
    raison: normalizeText(operation?.motif_filtre || operation?.raison || operation?.classification_finale) || 'Operation a verifier manuellement.',
    niveau_confiance: normalizeConfidence(operation?.niveau_confiance || 'faible'),
    fournisseur_client: normalizeText(operation?.fournisseur || operation?.client || operation?.nom || operation?.fournisseur_client) || null,
    description: normalizeText(operation?.description) || libelle || null,
    numero_piece: normalizeText(operation?.numero_piece) || null,
    taux_tva: Number.isFinite(Number(operation?.taux_tva)) ? normalizeVatRate(operation?.taux_tva) : null,
  };
};

const isFactouratiTvaV1Payload = (payload: any) =>
  ['factourati_tva_v1', 'factourati_tva_simple_v2'].includes(String(payload?.schema_name || '').trim()) ||
  Array.isArray(payload?.achats) ||
  Array.isArray(payload?.ventes) ||
  Array.isArray(payload?.virements_personnels) ||
  Array.isArray(payload?.hors_tva) ||
  Array.isArray(payload?.a_verifier) ||
  Array.isArray(payload?.autres);

const normalizeExtractedOperation = (operation: any, index: number): VatExtractedOperation | null => {
  const counterpart = String(operation?.fournisseur_client || operation?.fournisseur || operation?.client || '').trim();
  const description = String(operation?.description || operation?.libelle || '').trim();
  const montantTtc = Number(operation?.montant_ttc);

  if (!counterpart || !description || !Number.isFinite(montantTtc) || montantTtc <= 0) {
    return null;
  }

  const amounts = buildOperationAmounts(
    operation?.montant_ttc,
    operation?.taux_tva,
    operation?.montant_ht,
    operation?.montant_tva,
  );

  return {
    id: `extracted-${index}-${counterpart}-${amounts.montant_ttc}`.replace(/\s+/g, '-'),
    sens: normalizeDirection(operation?.sens),
    date: normalizeIsoDate(operation?.date),
    numero_facture: String(operation?.numero_facture || '').trim() || null,
    fournisseur_client: counterpart,
    description,
    montant_ttc: amounts.montant_ttc,
    taux_tva: amounts.taux_tva,
    montant_tva: amounts.montant_tva,
    montant_ht: amounts.montant_ht,
    mode_paiement: normalizePaymentMode(operation?.mode_paiement),
    numero_piece: String(operation?.numero_piece || '').trim() || null,
    ice: normalizeIce(operation?.ice),
    ignoree: false,
  };
};

const normalizeIgnoredOperation = (operation: any, index: number): VatIgnoredOperation | null => {
  const libelle = String(operation?.libelle || '').trim();
  const montant = Number(operation?.montant);

  if (!libelle || !Number.isFinite(montant)) {
    return null;
  }

  return {
    id: `ignored-${index}-${libelle}`.replace(/\s+/g, '-'),
    date: normalizeIsoDate(operation?.date),
    libelle,
    mode_paiement: normalizePaymentMode(operation?.mode_paiement),
    montant: roundToTwo(montant),
    sens:
      String(operation?.sens || '')
        .trim()
        .toLowerCase() === 'credit'
        ? 'credit'
        : 'debit',
    raison_exclusion: String(operation?.raison_exclusion || 'operation exclue').trim(),
  };
};

const normalizeExtractionDocumentType = (value: unknown, facturesCount: number): VatExtractionDocumentType => {
  const raw = String(value || '').trim();
  if (raw === 'releve_bancaire' || raw === 'factures_multiples' || raw === 'facture_unique') {
    return raw;
  }

  return facturesCount > 1 ? 'factures_multiples' : 'facture_unique';
};

const normalizeVatExtractionResult = (payload: any): PurchaseVatExtractionResult => {
  if (isFactouratiTvaV1Payload(payload)) {
    const achats = (Array.isArray(payload?.achats) ? payload.achats : [])
      .map((operation: any, index: number) => normalizeFactouratiExtractedOperation(operation, index, 'achat'))
      .filter((operation): operation is VatExtractedOperation => Boolean(operation));
    const ventes = (Array.isArray(payload?.ventes) ? payload.ventes : [])
      .map((operation: any, index: number) => normalizeFactouratiExtractedOperation(operation, index, 'vente'))
      .filter((operation): operation is VatExtractedOperation => Boolean(operation));
    const virementsPersonnels = (Array.isArray(payload?.virements_personnels) ? payload.virements_personnels : [])
      .map((operation: any, index: number) => normalizeFactouratiIgnoredOperation(operation, index, 'virements_personnels'))
      .filter((operation): operation is VatIgnoredOperation => Boolean(operation));
    const rawHorsTva = [
      ...(Array.isArray(payload?.hors_tva) ? payload.hors_tva : []),
      ...(Array.isArray(payload?.autres) ? payload.autres : []),
    ];
    const horsTva = rawHorsTva
      .map((operation: any, index: number) => normalizeFactouratiIgnoredOperation(operation, index, 'hors_tva'))
      .filter((operation): operation is VatIgnoredOperation => Boolean(operation));
    const aVerifier = (Array.isArray(payload?.a_verifier) ? payload.a_verifier : [])
      .map((operation: any, index: number) => normalizeFactouratiReviewOperation(operation, index))
      .filter((operation): operation is VatBankOperation => Boolean(operation));

    const toutesOperations = [
      ...achats.map((operation, index) => buildAnalysisOperationFromFactouratiExtracted(operation, index)),
      ...ventes.map((operation, index) => buildAnalysisOperationFromFactouratiExtracted(operation, index + achats.length)),
      ...virementsPersonnels.map((operation) => buildAnalysisOperationFromFactouratiIgnored(operation)),
      ...horsTva.map((operation) => buildAnalysisOperationFromFactouratiIgnored(operation)),
      ...aVerifier,
    ];
    const factures = [...achats, ...ventes];
    const operationsIgnorees = [...virementsPersonnels, ...horsTva];
    const periodeDetail =
      payload?.periode && typeof payload.periode === 'object'
        ? {
            date_debut: normalizeText(payload.periode?.date_debut) || null,
            date_fin: normalizeText(payload.periode?.date_fin) || null,
            mois: normalizeText(payload.periode?.mois) || null,
          }
        : {
            date_debut: null,
            date_fin: null,
            mois: normalizePeriod(payload?.periode) || null,
          };

    return {
      success: payload?.success !== false,
      schema_name: String(payload?.schema_name || 'factourati_tva_simple_v2').trim() || 'factourati_tva_simple_v2',
      type_document: normalizeExtractionDocumentType(payload?.type_document, factures.length),
      banque: normalizeText(payload?.banque) || null,
      societe_titulaire: normalizeText(payload?.societe_titulaire) || null,
      periode: normalizePeriod(periodeDetail.mois) || normalizePeriod(payload?.periode),
      periode_detail: periodeDetail,
      resume: normalizeFactouratiSummary(payload?.resume, toutesOperations, factures),
      factures,
      achats,
      ventes,
      virements_personnels: virementsPersonnels,
      hors_tva: horsTva,
      a_verifier: aVerifier,
      total_operations: Math.max(0, Number(payload?.total_operations || toutesOperations.length) || toutesOperations.length),
      toutes_operations: toutesOperations,
      operations_ignorees: operationsIgnorees,
      alertes: buildAnalysisAlerts(toutesOperations, payload?.alertes),
      cache_info:
        payload?.cache_info && typeof payload.cache_info === 'object'
          ? {
              cacheHit: Boolean(payload.cache_info.cacheHit),
              cacheEntryId: String(payload.cache_info.cacheEntryId || '').trim() || null,
              hash_fichier: String(payload.cache_info.hash_fichier || '').trim() || null,
              nom_fichier_original: String(payload.cache_info.nom_fichier_original || '').trim() || null,
              analyse_date: String(payload.cache_info.analyse_date || '').trim() || null,
              nb_factures_achat: Number(payload.cache_info.nb_factures_achat || achats.length),
              nb_factures_vente: Number(payload.cache_info.nb_factures_vente || ventes.length),
              nb_operations_ignorees: Number(payload.cache_info.nb_operations_ignorees || operationsIgnorees.length),
            }
          : null,
    };
  }

  const rawOperations = Array.isArray(payload?.toutes_operations) && payload.toutes_operations.length
    ? payload.toutes_operations
    : buildLegacyOperationsFromPayload(payload);
  const toutesOperations = rawOperations
    .map((operation: any, index: number) => normalizeAnalysisOperation(operation, index))
    .filter((operation): operation is VatBankOperation => Boolean(operation));
  const factures = toutesOperations
    .filter((operation) => operation.classification === 'achat_propose' || operation.classification === 'vente_propose')
    .map((operation) => buildFactureFromOperation(operation));
  const operationsIgnorees = toutesOperations
    .filter((operation) => operation.classification === 'ignore')
    .map((operation) => buildIgnoredOperationFromAnalysisOperation(operation));

  const periodeDetail =
    payload?.periode && typeof payload.periode === 'object'
      ? {
          date_debut: normalizeText(payload.periode?.date_debut) || null,
          date_fin: normalizeText(payload.periode?.date_fin) || null,
          mois: normalizeText(payload.periode?.mois) || null,
        }
      : {
          date_debut: null,
          date_fin: null,
          mois: normalizePeriod(payload?.periode) || null,
        };

  return {
    success: true,
    schema_name: String(payload?.schema_name || '').trim() || null,
    type_document: normalizeExtractionDocumentType(payload?.type_document, factures.length),
    banque: normalizeText(payload?.banque) || null,
    societe_titulaire: normalizeText(payload?.societe_titulaire) || null,
    periode: normalizePeriod(periodeDetail.mois) || normalizePeriod(payload?.periode),
    periode_detail: periodeDetail,
    resume: buildVatAnalysisSummary(toutesOperations, factures),
    factures,
    achats: factures.filter((operation) => operation.classification === 'achat_propose'),
    ventes: factures.filter((operation) => operation.classification === 'vente_propose'),
    virements_personnels: [],
    hors_tva: [],
    a_verifier: toutesOperations.filter((operation) => operation.classification === 'a_verifier'),
    total_operations: toutesOperations.length,
    toutes_operations: toutesOperations,
    operations_ignorees: operationsIgnorees,
    alertes: buildAnalysisAlerts(toutesOperations, payload?.alertes),
    cache_info:
      payload?.cache_info && typeof payload.cache_info === 'object'
        ? {
            cacheHit: Boolean(payload.cache_info.cacheHit),
            cacheEntryId: String(payload.cache_info.cacheEntryId || '').trim() || null,
            hash_fichier: String(payload.cache_info.hash_fichier || '').trim() || null,
            nom_fichier_original: String(payload.cache_info.nom_fichier_original || '').trim() || null,
            analyse_date: String(payload.cache_info.analyse_date || '').trim() || null,
            nb_factures_achat: Number(payload.cache_info.nb_factures_achat || 0),
            nb_factures_vente: Number(payload.cache_info.nb_factures_vente || 0),
            nb_operations_ignorees: Number(payload.cache_info.nb_operations_ignorees || 0),
          }
        : null,
  };
};

const getVatPdfPeriodLabel = (period: string) => {
  const [year, month] = String(period || '').split('-').map(Number);
  if (!year || !month) return period;

  return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
};

const triggerPdfDownload = (blob: Blob, period: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `recap-tva-${period}.pdf`;
  link.target = '_blank';
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
};

const getVatPdfInitials = (value: string) =>
  String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'FT';

const loadImageAsDataUrl = (url: string): Promise<string | null> =>
  new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }

    try {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.referrerPolicy = 'no-referrer';
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext('2d');
          if (!context) {
            resolve(null);
            return;
          }
          context.drawImage(image, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(null);
        }
      };
      image.onerror = () => resolve(null);
      image.src = url;
    } catch {
      resolve(null);
    }
  });

const decorateVatPdfPages = (document: any, companyName: string) => {
  const pageCount = document.getNumberOfPages();
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();

  for (let page = 1; page <= pageCount; page += 1) {
    document.setPage(page);
    document.setDrawColor(226, 232, 240);
    document.setLineWidth(0.35);
    document.line(12, pageHeight - 12, pageWidth - 12, pageHeight - 12);
    document.setFont('helvetica', 'normal');
    document.setFontSize(8.5);
    document.setTextColor(100, 116, 139);
    document.text(companyName || 'Factourati', 12, pageHeight - 7.2);
    document.text(`Page ${page} / ${pageCount}`, pageWidth - 12, pageHeight - 7.2, { align: 'right' });
  }
};

export function VatProvider({ children }: { children: React.ReactNode }) {
  const { user, firebaseUser } = useAuth();
  const { invoices } = useData();
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseVatInvoice[]>([]);
  const [manualSalesInvoices, setManualSalesInvoices] = useState<ManualSalesVatInvoice[]>([]);
  const [salesAdjustments, setSalesAdjustments] = useState<SalesVatAdjustment[]>([]);
  const [carryoverOverrides, setCarryoverOverrides] = useState<VatCarryoverOverride[]>([]);
  const [analysisCacheEntries, setAnalysisCacheEntries] = useState<VatAnalysisCacheEntry[]>([]);
  const [analysisCredits, setAnalysisCredits] = useState<VatAnalysisCreditsSummary>(() =>
    buildVatAnalysisCreditsSummary(),
  );
  const [isLoading, setIsLoading] = useState(false);

  const entrepriseId = user?.isAdmin ? user.id : user?.entrepriseId;
  const creditsOwnerId = entrepriseId;
  const currentPeriod = useMemo(() => getCurrentVatPeriod(), []);

  const ensureAnalysisCreditsDoc = async () => {
    if (!creditsOwnerId) return null;

    const creditsDocRef = doc(db, TVA_ANALYSIS_CREDITS_COLLECTION, creditsOwnerId);
    const snapshot = await getDoc(creditsDocRef);

    if (!snapshot.exists()) {
      const defaults = buildDefaultVatAnalysisCredits(creditsOwnerId, entrepriseId);
      await setDoc(creditsDocRef, defaults, { merge: true });
      return defaults;
    }

    return snapshot.data();
  };

  useEffect(() => {
    if (!user || !entrepriseId) {
      setPurchaseInvoices([]);
      setCarryoverOverrides([]);
      setAnalysisCacheEntries([]);
      setAnalysisCredits(buildVatAnalysisCreditsSummary());
      return;
    }

    setIsLoading(true);

    void ensureAnalysisCreditsDoc().catch((error) => {
      console.error('Erreur initialisation credits analyses TVA:', error);
    });

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
    const carryoverOverridesQuery = query(
      collection(db, TVA_CARRYOVER_OVERRIDES_COLLECTION),
      where('entrepriseId', '==', entrepriseId),
    );
    const analysisCacheQuery = query(
      collection(db, TVA_ANALYSIS_CACHE_COLLECTION),
      where('user_id', '==', user.id),
    );
    const creditsDocRef = doc(db, TVA_ANALYSIS_CREDITS_COLLECTION, creditsOwnerId);

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

    const unsubscribeAnalysisCache = onSnapshot(
      analysisCacheQuery,
      (snapshot) => {
        const cacheData = snapshot.docs
          .map((document) => ({ id: document.id, ...document.data() } as VatAnalysisCacheEntry))
          .sort((left, right) => {
            const leftKey = left.analyse_date || left.created_at || '';
            const rightKey = right.analyse_date || right.created_at || '';
            return rightKey.localeCompare(leftKey);
          });

        setAnalysisCacheEntries(cacheData);
        setIsLoading(false);
      },
      (error) => {
        console.error('Erreur chargement historique analyses TVA:', error);
        setIsLoading(false);
      },
    );

    const unsubscribeCarryoverOverrides = onSnapshot(
      carryoverOverridesQuery,
      (snapshot) => {
        const overridesData = snapshot.docs
          .map((document) => ({ id: document.id, ...document.data() } as VatCarryoverOverride))
          .sort((left, right) => left.period.localeCompare(right.period));

        setCarryoverOverrides(overridesData);
        setIsLoading(false);
      },
      (error) => {
        console.error('Erreur chargement credits reportes TVA:', error);
        setIsLoading(false);
      },
    );

    const unsubscribeCredits = onSnapshot(
      creditsDocRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setAnalysisCredits(buildVatAnalysisCreditsSummary());
          return;
        }

        setAnalysisCredits(buildVatAnalysisCreditsSummary(snapshot.data()));
      },
      (error) => {
        console.error('Erreur chargement credits analyses TVA:', error);
        setAnalysisCredits(buildVatAnalysisCreditsSummary());
      },
    );

    return () => {
      unsubscribePurchases();
      unsubscribeManualSales();
      unsubscribeAdjustments();
      unsubscribeCarryoverOverrides();
      unsubscribeAnalysisCache();
      unsubscribeCredits();
    };
  }, [creditsOwnerId, entrepriseId, user]);

  const getRequestHeaders = async (includeJson = true) => {
    const headers: Record<string, string> = {
      'x-factourati-entreprise-id': entrepriseId || '',
      'x-factourati-user-id': user?.id || '',
      'x-factourati-user-email': user?.email || '',
      'x-factourati-is-admin': String(Boolean(user?.isAdmin)),
      'x-factourati-company-name': String(user?.company?.name || ''),
      'x-factourati-company-logo': String(user?.company?.logo || ''),
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
        response = await fetch(buildTvaApiUrl(baseUrl, path), {
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

  const verifyAnalysisCredits = async (): Promise<VatAnalysisCreditsVerification> => {
    if (!creditsOwnerId) {
      return {
        autorise: false,
        credits_restants: 0,
        credits_gratuits_restants: 0,
        credits_payes_restants: 0,
      };
    }

    try {
      return await request<VatAnalysisCreditsVerification>(
        '/credits/verifier',
        { method: 'POST', body: JSON.stringify({}) },
      );
    } catch (error) {
      const ensuredData = await ensureAnalysisCreditsDoc();
      const summary = buildVatAnalysisCreditsSummary(ensuredData);

      return {
        autorise: summary.total_disponible > 0,
        credits_restants: summary.total_disponible,
        credits_gratuits_restants: summary.credits_gratuits_restants,
        credits_payes_restants: summary.credits_payes_restants,
      };
    }
  };

  const purchaseAnalysisCredits = async (
    type: 'pack_5' | 'pack_10' | 'pack_20',
    paymentData?: Record<string, unknown>,
  ): Promise<VatAnalysisCreditsSummary> => {
    const result = await request<{
      credits_gratuits_restants: number;
      credits_payes_restants: number;
      total_disponible: number;
      credits_gratuits_utilises: number;
      total_analyses_effectuees: number;
    }>('/credits/acheter', {
      method: 'POST',
      body: JSON.stringify({
        type,
        paiement_data: paymentData || {},
      }),
    });

    const nextSummary = buildVatAnalysisCreditsSummary(result);
    setAnalysisCredits(nextSummary);
    return nextSummary;
  };

  const consumeAnalysisCreditDirect = async () => {
    if (!creditsOwnerId) {
      throw new Error("Impossible de debiter les credits d'analyse.");
    }

    const creditsDocRef = doc(db, TVA_ANALYSIS_CREDITS_COLLECTION, creditsOwnerId);
    const snapshot = await getDoc(creditsDocRef);
    const base = snapshot.exists()
      ? snapshot.data()
      : buildDefaultVatAnalysisCredits(creditsOwnerId, entrepriseId);
    const summary = buildVatAnalysisCreditsSummary(base);

    if (summary.total_disponible <= 0) {
      throw new Error('ANALYSIS_CREDITS_REQUIRED');
    }

    const nextPaid = summary.credits_payes_restants > 0 ? summary.credits_payes_restants - 1 : summary.credits_payes_restants;
    const nextFreeUsed =
      summary.credits_payes_restants > 0
        ? summary.credits_gratuits_utilises
        : Math.min(TVA_FREE_ANALYSIS_LIMIT, summary.credits_gratuits_utilises + 1);
    const now = new Date().toISOString();

    await setDoc(
      creditsDocRef,
      {
        user_id: creditsOwnerId,
        entrepriseId,
        credits_gratuits_utilises: nextFreeUsed,
        credits_payes_restants: nextPaid,
        total_analyses_effectuees: summary.total_analyses_effectuees + 1,
        created_at: snapshot.exists() ? snapshot.data().created_at || now : now,
        updated_at: now,
      },
      { merge: true },
    );
  };

  const saveAnalysisCacheEntry = async (
    hash: string,
    fileName: string,
    result: PurchaseVatExtractionResult,
  ) => {
    if (!user || !entrepriseId) {
      throw new Error("Utilisateur introuvable pour sauvegarder l'analyse TVA.");
    }

    const { cache_info: _ignoredCacheInfo, ...resultWithoutCacheInfo } = result;
    const safeResult = stripUndefinedDeep(resultWithoutCacheInfo);
    const counts = getExtractionCounts(result);
    const now = new Date().toISOString();
    const docId = buildAnalysisCacheDocId(user.id, hash);
    const cacheDocRef = doc(db, TVA_ANALYSIS_CACHE_COLLECTION, docId);
    const existingSnapshot = await getDoc(cacheDocRef);
    const cachePayload: VatAnalysisCacheEntry = {
      id: docId,
      user_id: user.id,
      entrepriseId,
      hash_fichier: hash,
      nom_fichier_original: fileName,
      resultat_json: safeResult,
      nb_factures_achat: counts.achats,
      nb_factures_vente: counts.ventes,
      nb_operations_ignorees: counts.ignorees,
      analyse_date: now,
      created_at: existingSnapshot.exists()
        ? String(existingSnapshot.data().created_at || now)
        : now,
    };

    await setDoc(cacheDocRef, cachePayload, { merge: true });

      return {
        ...result,
        cache_info: {
        cacheHit: false,
        cacheEntryId: docId,
        hash_fichier: hash,
        nom_fichier_original: fileName,
        analyse_date: now,
        nb_factures_achat: counts.achats,
        nb_factures_vente: counts.ventes,
        nb_operations_ignorees: counts.ignorees,
      },
    } satisfies PurchaseVatExtractionResult;
  };

  const extractPurchaseInvoicePdfDirect = async (file: File): Promise<PurchaseVatExtractionResult> => {
    const verification = await verifyAnalysisCredits();
    if (!verification.autorise) {
      throw new Error('ANALYSIS_CREDITS_REQUIRED');
    }

    const settingsSnapshot = await getDoc(doc(db, TVA_AI_SETTINGS_COLLECTION, TVA_AI_SETTINGS_DOC));
    const settingsData = settingsSnapshot.exists() ? settingsSnapshot.data() : {};
    const apiKey = sanitizeSecretValue(String(settingsData?.apiKey || ''));
    const webhookUrl = String(settingsData?.n8nWebhookUrl || DEFAULT_TVA_N8N_WEBHOOK_URL).trim();
    const provider =
      String(settingsData?.provider || '').trim().toLowerCase() === 'n8n' ||
      (!String(settingsData?.provider || '').trim() && !apiKey && webhookUrl)
        ? 'n8n'
        : 'openai';
    const prompt = buildPromptWithCustomInstructions(
      TVA_BANK_ANALYSIS_BASE_PROMPT,
      String(settingsData?.prompt || '').trim(),
    );
    let parsed: any;

    if (provider === 'n8n') {
      const webhookSecret = sanitizeSecretValue(String(settingsData?.n8nWebhookSecret || ''));

      if (!webhookUrl) {
        throw new Error("L'URL du webhook n8n n'est pas configuree dans le dashboard admin.");
      }

      const formData = new FormData();
      formData.append('file0', file);
      formData.append('schema_name', 'factourati_tva_simple_v2');
      formData.append('provider', 'n8n_mistral_openai');
      formData.append('societe_titulaire', String(user?.company?.name || '').trim());
      formData.append('taux_tva_defaut', '20');
      formData.append('model', normalizeVatAiModel(String(settingsData?.model || '')));
      formData.append('prompt', prompt);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: webhookSecret
          ? {
              Accept: 'application/json',
              'x-factourati-n8n-secret': webhookSecret,
            }
          : {
              Accept: 'application/json',
            },
        body: formData,
      });

      if (!response.ok) {
        const rawError = await response.text();
        throw new Error(rawError || 'Le webhook n8n a retourne une erreur.');
      }

      parsed = await parseN8nJsonResponse(response);
    } else {
      if (!apiKey) {
        throw new Error("La cle OpenAI n'est pas configuree dans le dashboard admin.");
      }

      parsed = await analyzePdfWithStructuredOutputs({
        apiKey,
        model: normalizeVatAiModel(String(settingsData?.model || '')),
        prompt,
        file,
      });
    }

    let normalizedResult = normalizeVatExtractionResult(parsed);
    const ambiguousOperations = (normalizedResult.toutes_operations || []).filter(
      (operation) =>
        operation.classification === 'a_verifier' ||
        operation.niveau_confiance === 'faible',
    );

    if (provider === 'openai' && apiKey && ambiguousOperations.length) {
      try {
        const refinedOperations = await recheckAmbiguousOperations({
          apiKey,
          operations: ambiguousOperations,
        });

        if (refinedOperations.length) {
          const refinedById = new Map(
            refinedOperations.map((operation: any) => [String(operation.id_ligne || ''), operation]),
          );

          normalizedResult = normalizeVatExtractionResult({
            ...parsed,
            toutes_operations: (normalizedResult.toutes_operations || []).map((operation) => {
              const refinement = refinedById.get(operation.id_ligne);
              return refinement ? { ...operation, ...refinement } : operation;
            }),
            alertes: normalizedResult.alertes || [],
          });
        }
      } catch (fallbackError) {
        console.warn('Recheck cible des operations ambiguës impossible:', fallbackError);
      }
    }

    await consumeAnalysisCreditDirect();
    return normalizedResult;
  };
/*
    const extracted = {
      date: parsed.date || null,
      numero_facture: parsed.numero_facture || null,
      fournisseur: parsed.fournisseur || null,
      description: parsed.description || null,
      montant_ttc:
        typeof parsed.montant_ttc === 'number' && Number.isFinite(parsed.montant_ttc)
          ? parsed.montant_ttc
          : Number.isFinite(Number(parsed.montant_ttc))
            ? Number(parsed.montant_ttc)
            : null,
      taux_tva:
        typeof parsed.taux_tva === 'number' &&
        VALID_VAT_RATES.includes(parsed.taux_tva as (typeof VALID_VAT_RATES)[number])
          ? (parsed.taux_tva as 0 | 7 | 10 | 13 | 14 | 20)
          : VALID_VAT_RATES.includes(Number(parsed.taux_tva) as (typeof VALID_VAT_RATES)[number])
            ? (Number(parsed.taux_tva) as 0 | 7 | 10 | 13 | 14 | 20)
            : null,
      montant_tva:
        typeof parsed.montant_tva === 'number' && Number.isFinite(parsed.montant_tva)
          ? parsed.montant_tva
          : Number.isFinite(Number(parsed.montant_tva))
            ? Number(parsed.montant_tva)
            : null,
      montant_ht:
        typeof parsed.montant_ht === 'number' && Number.isFinite(parsed.montant_ht)
          ? parsed.montant_ht
          : Number.isFinite(Number(parsed.montant_ht))
            ? Number(parsed.montant_ht)
            : null,
      mode_paiement:
        typeof parsed.mode_paiement === 'string' && parsed.mode_paiement.trim()
          ? parsed.mode_paiement
              .toLowerCase()
              .replace(/ch[eè]que/g, 'cheque')
              .replace(/[éè]/g, 'e')
              .includes('effet')
            ? 'effet'
            : parsed.mode_paiement.toLowerCase().includes('cheque')
              ? 'cheque'
              : parsed.mode_paiement.toLowerCase().includes('espece')
                ? 'especes'
                : parsed.mode_paiement.toLowerCase().includes('virement')
                  ? 'virement'
                  : null
          : null,
      numero_piece: parsed.numero_piece || null,
      ice_fournisseur: parsed.ice_fournisseur || null,
    } satisfies PurchaseVatExtractionResult;

    const autoFilledFields = Object.entries(extracted)
      .filter(([, value]) => value !== null && String(value).trim() !== '')
      .map(([key]) => key);

    return {
      ...extracted,
      autoFilledFields,
      missingFields: ['date', 'fournisseur', 'description', 'montant_ttc', 'taux_tva', 'montant_tva', 'montant_ht', 'mode_paiement', 'ice_fournisseur'].filter(
        (field) => !autoFilledFields.includes(field),
      ),
    };
*/

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

  const deleteAnalysisCacheEntry = async (id: string) => {
    await deleteDoc(doc(db, TVA_ANALYSIS_CACHE_COLLECTION, id));
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

  const upsertCarryoverOverride = async (period: string, amount: number, note?: string | null) => {
    if (!user || !entrepriseId) {
      throw new Error('Entreprise introuvable.');
    }

    if (!/^\d{4}-\d{2}$/.test(String(period || ''))) {
      throw new Error('La periode du credit reporte est invalide.');
    }

    const normalizedAmount = Math.max(0, Number(amount || 0));
    if (!Number.isFinite(normalizedAmount)) {
      throw new Error('Le montant du credit reporte est invalide.');
    }

    const overrideId = `${entrepriseId}__${period}`;
    const overrideRef = doc(db, TVA_CARRYOVER_OVERRIDES_COLLECTION, overrideId);
    const existingSnapshot = await getDoc(overrideRef);
    const now = new Date().toISOString();

    await setDoc(
      overrideRef,
      {
        user_id: user.id,
        entrepriseId,
        period,
        amount: normalizedAmount,
        note: String(note || '').trim() || null,
        created_at: existingSnapshot.exists()
          ? String(existingSnapshot.data()?.created_at || now)
          : now,
        updated_at: now,
      },
      { merge: true },
    );
  };

  const deleteCarryoverOverride = async (period: string) => {
    if (!entrepriseId) {
      throw new Error('Entreprise introuvable.');
    }

    if (!/^\d{4}-\d{2}$/.test(String(period || ''))) {
      throw new Error('La periode du credit reporte est invalide.');
    }

    await deleteDoc(doc(db, TVA_CARRYOVER_OVERRIDES_COLLECTION, `${entrepriseId}__${period}`));
  };

  const extractPurchaseInvoicePdf = async (
    file: File,
    options?: { forceReanalyze?: boolean },
  ) => {
    if (!user || !entrepriseId) {
      throw new Error("Utilisateur introuvable pour l'analyse TVA.");
    }

    const hash = await computeFileHash(file);
    const cacheDocId = buildAnalysisCacheDocId(user.id, hash);
    const cacheDocRef = doc(db, TVA_ANALYSIS_CACHE_COLLECTION, cacheDocId);
    const forceReanalyze = Boolean(options?.forceReanalyze);
    const cachedSnapshot = await getDoc(cacheDocRef);

    if (cachedSnapshot.exists() && !forceReanalyze) {
      const cachedEntry = { id: cachedSnapshot.id, ...cachedSnapshot.data() } as VatAnalysisCacheEntry;
      return {
        ...cachedEntry.resultat_json,
        cache_info: {
          cacheHit: true,
          cacheEntryId: cachedEntry.id,
          hash_fichier: cachedEntry.hash_fichier,
          nom_fichier_original: cachedEntry.nom_fichier_original,
          analyse_date: cachedEntry.analyse_date,
          nb_factures_achat: cachedEntry.nb_factures_achat,
          nb_factures_vente: cachedEntry.nb_factures_vente,
          nb_operations_ignorees: cachedEntry.nb_operations_ignorees,
        },
      };
    }

    const verification = await verifyAnalysisCredits();
    if (!verification.autorise) {
      throw new Error('ANALYSIS_CREDITS_REQUIRED');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('force_reanalyze', forceReanalyze ? 'true' : 'false');

    try {
      const apiResult = await request<PurchaseVatExtractionResult>(
        '/extract-pdf',
        {
          method: 'POST',
          body: formData,
        },
        false,
      );

      if (apiResult.cache_info?.cacheHit) {
        return apiResult;
      }

      return await saveAnalysisCacheEntry(
        hash,
        file.name || 'document.pdf',
        {
          ...apiResult,
          cache_info: {
            ...apiResult.cache_info,
            cacheHit: Boolean(apiResult.cache_info?.cacheHit),
          },
        },
      );
    } catch (apiError) {
      if (apiError instanceof Error && apiError.message.includes('ANALYSIS_CREDITS_REQUIRED')) {
        throw apiError;
      }

      try {
        const directResult = await extractPurchaseInvoicePdfDirect(file);
        return await saveAnalysisCacheEntry(hash, file.name || 'document.pdf', directResult);
      } catch (fallbackError) {
        const primaryMessage =
          apiError instanceof Error ? apiError.message : "L'analyse IA via l'API TVA a echoue.";
        const fallbackMessage =
          fallbackError instanceof Error ? fallbackError.message : "Le fallback direct OpenAI a echoue.";

        throw new Error(
          /failed to fetch/i.test(primaryMessage)
            ? fallbackMessage
            : `${fallbackMessage} Detail API TVA: ${primaryMessage}`,
        );
      }
    }
  };

  const buildVatPdfBlobLocally = async (period: string) => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);

    const filteredPurchases = purchaseInvoices.filter((invoice) => isDateInPeriod(invoice.date, period));
    const filteredSales = salesInvoices.filter((invoice) => isDateInPeriod(invoice.date, period));
    const summary = buildVatSummary(purchaseInvoices, salesInvoices, period, carryoverOverrides);
    const document = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const companyName = String(user?.company?.name || '').trim() || 'Factourati';
    const companyLogoUrl = String(user?.company?.logo || '').trim();
    const companyLogoDataUrl = companyLogoUrl ? await loadImageAsDataUrl(companyLogoUrl) : null;
    const pageWidth = document.internal.pageSize.getWidth();
    let cursorY = 18;

    document.setDrawColor(226, 232, 240);
    document.setFillColor(248, 250, 252);
    document.roundedRect(12, 10, pageWidth - 24, 26, 5, 5, 'FD');

    if (companyLogoDataUrl) {
      document.addImage(companyLogoDataUrl, 'PNG', 16, 13, 18, 18, undefined, 'FAST');
    } else {
      document.setFillColor(15, 118, 110);
      document.roundedRect(16, 13, 18, 18, 4, 4, 'F');
      document.setFont('helvetica', 'bold');
      document.setFontSize(10);
      document.setTextColor(255, 255, 255);
      document.text(getVatPdfInitials(companyName), 25, 24.2, { align: 'center' });
    }

    document.setFont('helvetica', 'bold');
    document.setFontSize(18);
    document.setTextColor(15, 23, 42);
    document.text('Recapitulatif TVA', 39, cursorY);
    document.setFont('helvetica', 'normal');
    document.setFontSize(10.5);
    document.setTextColor(71, 85, 105);
    document.text(companyName, 39, cursorY + 6.2);
    document.text(`Periode: ${getVatPdfPeriodLabel(period)}`, pageWidth - 14, cursorY, { align: 'right' });
    document.text(`Genere le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 14, cursorY + 6.2, { align: 'right' });

    cursorY = 48;

    const summaryCards = [
      { title: 'TVA achats', value: formatMad(summary.deductibleVat), tone: [13, 148, 136] as [number, number, number] },
      { title: 'TVA ventes', value: formatMad(summary.collectedVat), tone: [37, 99, 235] as [number, number, number] },
      {
        title: summary.balance > 0 ? 'TVA a payer' : summary.balance < 0 ? 'Credit TVA' : 'Solde TVA',
        value: formatMad(Math.abs(summary.balance)),
        tone:
          summary.balance > 0
            ? ([5, 150, 105] as [number, number, number])
            : summary.balance < 0
              ? ([220, 38, 38] as [number, number, number])
              : ([71, 85, 105] as [number, number, number]),
      },
      { title: 'Factures', value: String(summary.totalInvoices), tone: [15, 23, 42] as [number, number, number] },
    ];
    const cardGap = 4;
    const cardWidth = (pageWidth - 24 - cardGap * 3) / 4;

    summaryCards.forEach((card, index) => {
      const cardX = 12 + index * (cardWidth + cardGap);
      document.setFillColor(255, 255, 255);
      document.setDrawColor(226, 232, 240);
      document.roundedRect(cardX, cursorY, cardWidth, 20, 4, 4, 'FD');
      document.setFont('helvetica', 'bold');
      document.setFontSize(9);
      document.setTextColor(100, 116, 139);
      document.text(card.title.toUpperCase(), cardX + 3.5, cursorY + 6);
      document.setFontSize(14);
      document.setTextColor(...card.tone);
      document.text(card.value, cardX + 3.5, cursorY + 14);
    });

    cursorY += 26;

    autoTable(document, {
      startY: cursorY,
      head: [['Indicateur', 'Montant', 'Details']],
      body: [
        ['TVA deductible', formatMad(summary.deductibleVat), `${summary.purchaseInvoicesCount} achat(s)`],
        ['TVA collectee', formatMad(summary.collectedVat), `${summary.salesInvoicesCount} vente(s)`],
        ['Solde du mois', formatMad(summary.balanceBeforeCarryover), 'Avant application du credit reporte'],
        ['Credit reporte', formatMad(summary.carryoverCredit), summary.carryoverCredit > 0 ? 'Credit du mois precedent applique' : 'Aucun credit reporte'],
        ['Solde TVA final', formatMad(summary.balance), `Declaration DGI avant le ${summary.deadlineLabel}`],
        ['Achats HT', formatMad(summary.purchaseTotalHT), `Achats TTC: ${formatMad(summary.purchaseTotalTTC)}`],
        ['Ventes HT', formatMad(summary.salesTotalHT), `Ventes TTC: ${formatMad(summary.salesTotalTTC)}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      styles: { fontSize: 9.2, cellPadding: 2.8, textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 52, fontStyle: 'bold' },
        1: { cellWidth: 42 },
        2: { cellWidth: 'auto' },
      },
    });

    const purchasesStartY = ((document as any).lastAutoTable?.finalY || cursorY) + 8;
    document.setFont('helvetica', 'bold');
    document.setFontSize(13);
    document.setTextColor(234, 88, 12);
    document.text('Tableau des achats', 12, purchasesStartY - 3);

    autoTable(document, {
      startY: purchasesStartY,
      head: [['Date', 'Facture', 'Tiers', 'Description', 'Paiement', 'Piece', 'Taux TVA', 'HT', 'TVA', 'TTC', 'ICE']],
      body: filteredPurchases.length
        ? filteredPurchases
            .slice()
            .sort((left, right) => right.date.localeCompare(left.date))
            .map((invoice) => [
              new Date(invoice.date).toLocaleDateString('fr-FR'),
              invoice.numero_facture || '-',
              invoice.fournisseur,
              invoice.description || '-',
              PAYMENT_MODE_OPTIONS.find((option) => option.value === invoice.mode_paiement)?.label || invoice.mode_paiement,
              invoice.numero_piece || '-',
              `${invoice.taux_tva}%`,
              formatMad(invoice.montant_ht),
              formatMad(invoice.montant_tva),
              formatMad(invoice.montant_ttc),
              invoice.ice_fournisseur || '-',
            ])
        : [['-', '-', '-', 'Aucun achat sur cette periode', '-', '-', '-', '-', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [234, 88, 12], textColor: [255, 255, 255] },
      styles: { fontSize: 8.7, cellPadding: 2.2, textColor: [51, 65, 85], overflow: 'linebreak' },
      alternateRowStyles: { fillColor: [255, 247, 237] },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 24 },
        2: { cellWidth: 40 },
        3: { cellWidth: 54 },
        4: { cellWidth: 26 },
        5: { cellWidth: 22 },
        6: { cellWidth: 16 },
        7: { cellWidth: 20 },
        8: { cellWidth: 20 },
        9: { cellWidth: 20 },
        10: { cellWidth: 26 },
      },
    });

    const salesStartY = ((document as any).lastAutoTable?.finalY || cursorY) + 10;
    document.setFont('helvetica', 'bold');
    document.setFontSize(13);
    document.setTextColor(37, 99, 235);
    document.text('Tableau des ventes', 12, salesStartY - 3);

    autoTable(document, {
      startY: salesStartY,
      head: [['Date', 'Facture', 'Tiers', 'Description', 'Paiement', 'Piece', 'Taux TVA', 'HT', 'TVA', 'TTC', 'ICE']],
      body: filteredSales.length
        ? filteredSales
            .slice()
            .sort((left, right) => right.date.localeCompare(left.date))
            .map((invoice) => [
              new Date(invoice.date).toLocaleDateString('fr-FR'),
              invoice.number || '-',
              invoice.clientName || invoice.client?.name || 'Client',
              invoice.description || invoice.items?.[0]?.description || 'Facture de vente',
              invoice.mode_paiement ? PAYMENT_MODE_OPTIONS.find((option) => option.value === invoice.mode_paiement)?.label || invoice.mode_paiement : '-',
              invoice.numero_piece || '-',
              `${invoice.subtotal > 0 && invoice.totalVat > 0 ? (Math.round(((invoice.totalVat / invoice.subtotal) * 100) * 100) / 100).toString().replace('.', ',') : '0'}%`,
              formatMad(invoice.subtotal),
              formatMad(invoice.totalVat),
              formatMad(invoice.totalTTC),
              '-',
            ])
        : [['-', '-', '-', 'Aucune vente sur cette periode', '-', '-', '-', '-', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
      styles: { fontSize: 8.7, cellPadding: 2.2, textColor: [51, 65, 85], overflow: 'linebreak' },
      alternateRowStyles: { fillColor: [239, 246, 255] },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 24 },
        2: { cellWidth: 40 },
        3: { cellWidth: 54 },
        4: { cellWidth: 26 },
        5: { cellWidth: 22 },
        6: { cellWidth: 16 },
        7: { cellWidth: 20 },
        8: { cellWidth: 20 },
        9: { cellWidth: 20 },
        10: { cellWidth: 26 },
      },
    });

    decorateVatPdfPages(document, companyName);

    return document.output('blob');
  };

  const exportVatPdf = async (period: string) => {
    let response: Response | null = null;
    let lastError: Error | null = null;

    for (const baseUrl of TVA_API_BASES) {
      let nextResponse: Response;
      try {
        nextResponse = await fetch(buildTvaApiUrl(baseUrl, '/export-pdf', new URLSearchParams({ periode: period })), {
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
      const fallbackBlob = await buildVatPdfBlobLocally(period);
      triggerPdfDownload(fallbackBlob, period);
      return;
    }

    if (!response.ok) {
      const fallbackBlob = await buildVatPdfBlobLocally(period);
      triggerPdfDownload(fallbackBlob, period);
      return;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/pdf')) {
      const fallbackBlob = await buildVatPdfBlobLocally(period);
      triggerPdfDownload(fallbackBlob, period);
      return;
    }

    triggerPdfDownload(await response.blob(), period);
  };

  const salesInvoices = useMemo(
    () => resolveSalesVatInvoices(invoices, manualSalesInvoices, salesAdjustments),
    [invoices, manualSalesInvoices, salesAdjustments],
  );

  const currentMonthSummary = useMemo(
    () => buildVatSummary(purchaseInvoices, salesInvoices, currentPeriod, carryoverOverrides),
    [carryoverOverrides, currentPeriod, purchaseInvoices, salesInvoices],
  );

  const value: VatContextType = {
    purchaseInvoices,
    salesInvoices,
    manualSalesInvoices,
    salesAdjustments,
    carryoverOverrides,
    analysisCacheEntries,
    analysisCredits,
    isLoading,
    currentPeriod,
    currentMonthSummary,
    hasVatDue: currentMonthSummary.balance > 0,
    dueAmount: Math.max(currentMonthSummary.balance, 0),
    createPurchaseInvoice,
    updatePurchaseInvoice,
    deletePurchaseInvoice,
    deleteAnalysisCacheEntry,
    createManualSalesInvoice,
    updateManualSalesInvoice,
    deleteManualSalesInvoice,
    excludeApplicationSalesInvoice,
    moveApplicationSalesInvoiceToDate,
    restoreApplicationSalesInvoice,
    upsertCarryoverOverride,
    deleteCarryoverOverride,
    extractPurchaseInvoicePdf,
    exportVatPdf,
    verifyAnalysisCredits,
    purchaseAnalysisCredits,
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

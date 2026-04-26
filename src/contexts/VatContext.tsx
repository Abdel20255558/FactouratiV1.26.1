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
  ManualSalesVatInvoice,
  ManualSalesVatInvoiceInput,
  PurchaseVatExtractionResult,
  PurchaseVatInvoice,
  PurchaseVatInvoiceInput,
  SalesVatAdjustment,
  SalesVatInvoiceLike,
  VatAnalysisCacheEntry,
  VatExtractedOperation,
  VatIgnoredOperation,
  VatExtractionDocumentType,
  VatSummary,
} from '../types/vat';
import {
  buildVatSummary,
  buildDefaultVatAnalysisCredits,
  buildVatAnalysisCreditsSummary,
  getVatDeadlineLabel,
  getCurrentVatPeriod,
  isDateInPeriod,
  resolveSalesVatInvoices,
  TVA_ANALYSIS_CACHE_COLLECTION,
  TVA_ANALYSIS_CREDITS_COLLECTION,
  TVA_ANALYSIS_PACKS,
  TVA_ANALYSIS_TRANSACTIONS_COLLECTION,
  TVA_AI_SETTINGS_COLLECTION,
  TVA_AI_SETTINGS_DOC,
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
const VALID_VAT_RATES = [20, 10, 7, 0] as const;
const DEFAULT_TVA_AI_MODEL = 'gpt-4o';
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
vatc      "taux_tva": 20 | 10 | 7 | 0,
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
const ensureVatAiPrompt = (prompt: string) =>
  prompt.includes('DATE | LIBELLE | DEBIT | CREDIT | SOLDE') &&
  prompt.includes('DEBIT  = colonne de gauche = argent qui SORT  = ACHAT') &&
  prompt.includes('CREDIT = colonne de droite = argent qui ENTRE = VENTE') &&
  prompt.includes('operations_ignorees')
    ? prompt
    : STRICT_BANK_STATEMENT_TVA_AI_PROMPT;
const normalizeVatAiModel = (model: string) => {
  const normalized = String(model || '').trim();
  return !normalized || normalized === 'gpt-4.1' ? DEFAULT_TVA_AI_MODEL : normalized;
};
const roundToTwo = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

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
  return VALID_VAT_RATES.includes(numeric as (typeof VALID_VAT_RATES)[number]) ? (numeric as 0 | 7 | 10 | 20) : 20;
};

const normalizePaymentMode = (value: unknown) => {
  const raw = String(value || '').trim().toLowerCase();
  if (raw.includes('effet') || raw.includes('traite') || raw.includes('lcn')) return 'effet';
  if (raw.includes('cheque') || raw.includes('chèque')) return 'cheque';
  if (raw.includes('espece') || raw.includes('espèce')) return 'especes';
  return 'virement';
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
  const rawFactures = Array.isArray(payload?.factures)
    ? payload.factures
    : payload && typeof payload === 'object' && ('date' in payload || 'fournisseur' in payload || 'fournisseur_client' in payload)
      ? [payload]
      : [];
  const factures = rawFactures
    .map((operation, index) => normalizeExtractedOperation(operation, index))
    .filter((operation): operation is VatExtractedOperation => Boolean(operation));
  const operationsIgnorees = Array.isArray(payload?.operations_ignorees)
    ? payload.operations_ignorees
        .map((operation: any, index: number) => normalizeIgnoredOperation(operation, index))
        .filter((operation): operation is VatIgnoredOperation => Boolean(operation))
    : [];

  return {
    type_document: normalizeExtractionDocumentType(payload?.type_document, factures.length),
    periode: normalizePeriod(payload?.periode),
    factures,
    operations_ignorees: operationsIgnorees,
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

export function VatProvider({ children }: { children: React.ReactNode }) {
  const { user, firebaseUser } = useAuth();
  const { invoices } = useData();
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseVatInvoice[]>([]);
  const [manualSalesInvoices, setManualSalesInvoices] = useState<ManualSalesVatInvoice[]>([]);
  const [salesAdjustments, setSalesAdjustments] = useState<SalesVatAdjustment[]>([]);
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

    if (!apiKey) {
      throw new Error("La cle OpenAI n'est pas configuree dans le dashboard admin.");
    }

    const requestBody = {
      model: normalizeVatAiModel(String(settingsData?.model || '')),
      instructions: OPENAI_TVA_SYSTEM_PROMPT,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: ensureVatAiPrompt(String(settingsData?.prompt || '').trim() || STRICT_BANK_STATEMENT_TVA_AI_PROMPT),
            },
            {
              type: 'input_file',
              filename: file.name || 'facture-achat.pdf',
              file_data: `data:application/pdf;base64,${await fileToBase64(file)}`,
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_object',
        },
      },
      temperature: 0,
      max_output_tokens: 4000,
    };

    let lastJsonError: Error | null = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const rawError = await response.text();
        throw new Error(rawError || "OpenAI a retourne une erreur pendant l'analyse du PDF.");
      }

      try {
        const parsed = parseOpenAIExtractionPayload(await response.json());
        const normalizedResult = normalizeVatExtractionResult(parsed);
        await consumeAnalysisCreditDirect();
        return normalizedResult;
      } catch (error) {
        lastJsonError = error instanceof Error ? error : new Error("Le JSON d'extraction IA est invalide.");
      }
    }

    throw lastJsonError || new Error("Impossible de lire ce PDF, veuillez saisir manuellement.");
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
        typeof parsed.taux_tva === 'number' && [20, 10, 7, 0].includes(parsed.taux_tva)
          ? parsed.taux_tva
          : [20, 10, 7, 0].includes(Number(parsed.taux_tva))
            ? Number(parsed.taux_tva)
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
          `${primaryMessage} Si la fonction Netlify n'est pas disponible, verifiez aussi la configuration OpenAI du dashboard admin. Detail: ${fallbackMessage}`,
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
    const summary = buildVatSummary(filteredPurchases, filteredSales, period);
    const document = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const recapRows = [
      ...filteredPurchases.map((invoice) => [
        new Date(invoice.date).toLocaleDateString('fr-FR'),
        'Achat',
        invoice.fournisseur,
        invoice.description,
        formatMad(invoice.montant_ht),
        formatMad(invoice.montant_tva),
        formatMad(invoice.montant_ttc),
      ]),
      ...filteredSales.map((invoice) => [
        new Date(invoice.date).toLocaleDateString('fr-FR'),
        'Vente',
        invoice.clientName || invoice.client?.name || 'Client',
        invoice.description || invoice.items?.[0]?.description || invoice.number || 'Facture de vente',
        formatMad(invoice.subtotal),
        formatMad(invoice.totalVat),
        formatMad(invoice.totalTTC),
      ]),
    ].sort((left, right) => String(right[0]).localeCompare(String(left[0])));

    document.setFont('helvetica', 'bold');
    document.setFontSize(18);
    document.text('Recapitulatif TVA - Factourati', 14, 18);
    document.setFont('helvetica', 'normal');
    document.setFontSize(11);
    document.text(`Periode: ${getVatPdfPeriodLabel(period)}`, 14, 26);
    document.text(`Declaration DGI avant le ${summary.deadlineLabel}`, 14, 32);
    document.setFont('helvetica', 'bold');
    document.setFontSize(13);
    document.text(
      summary.balance > 0
        ? `TVA a payer: ${formatMad(summary.balance)}`
        : `Credit TVA: ${formatMad(Math.abs(summary.balance))}`,
      14,
      42,
    );

    autoTable(document, {
      startY: 50,
      head: [['Indicateur', 'Montant']],
      body: [
        ['TVA sur achats (deductible)', formatMad(summary.deductibleVat)],
        ['TVA sur ventes (collectee)', formatMad(summary.collectedVat)],
        ['Solde TVA', formatMad(summary.balance)],
        ['Achats HT', formatMad(summary.purchaseTotalHT)],
        ['Ventes HT', formatMad(summary.salesTotalHT)],
        ['Nombre total de factures', String(summary.totalInvoices)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [13, 148, 136] },
      styles: { fontSize: 10 },
    });

    autoTable(document, {
      startY: ((document as any).lastAutoTable?.finalY || 72) + 8,
      head: [['Date', 'Type', 'Tiers', 'Description', 'HT', 'TVA', 'TTC']],
      body: recapRows.length ? recapRows : [['-', '-', '-', 'Aucune ecriture sur cette periode', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 9, cellPadding: 2.4 },
    });

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
    () => buildVatSummary(purchaseInvoices, salesInvoices, currentPeriod),
    [currentPeriod, purchaseInvoices, salesInvoices],
  );

  const value: VatContextType = {
    purchaseInvoices,
    salesInvoices,
    manualSalesInvoices,
    salesAdjustments,
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

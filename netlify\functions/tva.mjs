import { initializeApp, getApps } from 'firebase/app';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore/lite';
import { createHash } from 'node:crypto';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyDrNiFLm_jwAS6pRstetAOo3KOWkzmf8y0',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'facture-bc21d.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'facture-bc21d',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'facture-bc21d.firebasestorage.app',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '15503201564',
  appId: process.env.FIREBASE_APP_ID || '1:15503201564:web:8f61217b6e35dfbd2ad6d9',
};

const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const TVA_COLLECTION = 'factures_achat_tva';
const SALES_COLLECTION = 'invoices';
const SALES_MANUAL_COLLECTION = 'factures_vente_tva_manuelles';
const SALES_ADJUSTMENTS_COLLECTION = 'factures_vente_tva_ajustements';
const TVA_ANALYSIS_CACHE_COLLECTION = 'tva_analyses_cache';
const TVA_ANALYSIS_CREDITS_COLLECTION = 'tva_analyses_credits';
const TVA_ANALYSIS_TRANSACTIONS_COLLECTION = 'tva_analyses_transactions';
const TVA_AI_SETTINGS_COLLECTION = 'platformSettings';
const TVA_AI_SETTINGS_DOC = 'openaiPdfAnalysis';
const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };
const VALID_VAT_RATES = [20, 10, 7, 0];
const VALID_PAYMENT_MODES = ['virement', 'cheque', 'effet', 'especes'];
const TVA_FREE_ANALYSIS_LIMIT = 3;
const TVA_ANALYSIS_PACKS = {
  pack_5: { credits: 5, amount: 50 },
  pack_10: { credits: 10, amount: 89 },
  pack_20: { credits: 20, amount: 179 },
};
const DEFAULT_OPENAI_MODEL = 'gpt-4o';
const DEFAULT_OPENAI_PROMPT = `Tu es un assistant comptable marocain. Analyse cette facture et extrais en JSON uniquement ces champs :
{
  date: (format YYYY-MM-DD),
  numero_facture: (numero de facture si visible, sinon null),
  fournisseur: (nom du fournisseur),
  description: (designation du produit ou service),
  montant_ttc: (nombre),
  taux_tva: (20 | 10 | 7 | 0),
  montant_tva: (nombre),
  montant_ht: (nombre),
  mode_paiement: (virement | cheque | effet | especes | autre),
  numero_piece: (numero cheque ou effet si applicable, sinon null),
  ice_fournisseur: (ICE 15 chiffres si visible, sinon null)
}
Reponds uniquement avec le JSON, sans texte avant ou apres.`;
const STRICT_OPENAI_PROMPT = `Tu es un assistant comptable marocain expert en TVA.
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
          numero_facture: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          fournisseur_client: { type: 'string' },
          description: { type: 'string' },
          montant_ttc: { type: 'number' },
          taux_tva: { type: 'number' },
          montant_tva: { type: 'number' },
          montant_ht: { type: 'number' },
          mode_paiement: { type: 'string' },
          numero_piece: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          ice: { anyOf: [{ type: 'string' }, { type: 'null' }] },
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
};

const OPENAI_TVA_SYSTEM_PROMPT = `Tu es un expert comptable marocain.
Tu analyses des releves bancaires de societes marocaines.
Un releve bancaire a TOUJOURS deux types d'operations en meme temps :
des debits ET des credits. Tu dois retourner les deux.
Tu retournes UNIQUEMENT du JSON. Zero texte. Zero explication.`;

const STRICT_BANK_STATEMENT_OPENAI_PROMPT = `Voici un releve bancaire marocain.

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
};

const sanitizeSecretValue = (value) => String(value || '').trim().replace(/^['"]+|['"]+$/g, '');
const ensureVatAiPrompt = (prompt) =>
  String(prompt || '').includes('DATE | LIBELLE | DEBIT | CREDIT | SOLDE') &&
  String(prompt || '').includes('DEBIT  = colonne de gauche = argent qui SORT  = ACHAT') &&
  String(prompt || '').includes('CREDIT = colonne de droite = argent qui ENTRE = VENTE') &&
  String(prompt || '').includes('operations_ignorees')
    ? String(prompt || '')
    : STRICT_BANK_STATEMENT_OPENAI_PROMPT;
const normalizeVatAiModel = (model) => {
  const normalized = String(model || '').trim();
  return !normalized || normalized === 'gpt-4.1' ? DEFAULT_OPENAI_MODEL : normalized;
};

const roundToTwo = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const formatMad = (value) =>
  `${new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0)} MAD`;

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  });

const getEntrepriseId = (request) =>
  request.headers.get('x-factourati-entreprise-id') ||
  request.headers.get('x-factourati-company-id') ||
  '';

const getUserId = (request) => request.headers.get('x-factourati-user-id') || 'unknown';
const isAdminRequest = (request) => String(request.headers.get('x-factourati-is-admin') || '').toLowerCase() === 'true';
const getCreditsOwnerId = (request) => getEntrepriseId(request);

const buildDefaultVatAnalysisCredits = (userId, entrepriseId = userId) => {
  const now = new Date().toISOString();

  return {
    user_id: userId,
    entrepriseId,
    credits_gratuits_utilises: 0,
    credits_payes_restants: 0,
    total_analyses_effectuees: 0,
    created_at: now,
    updated_at: now,
  };
};

const buildVatAnalysisCreditsSummary = (credits = {}) => {
  const creditsGratuitsUtilises = Math.max(0, Number(credits.credits_gratuits_utilises || 0));
  const creditsPayesRestants = Math.max(0, Number(credits.credits_payes_restants || 0));
  const totalAnalysesEffectuees = Math.max(0, Number(credits.total_analyses_effectuees || 0));
  const creditsGratuitsRestants = Math.max(0, TVA_FREE_ANALYSIS_LIMIT - creditsGratuitsUtilises);

  return {
    credits_gratuits_restants: creditsGratuitsRestants,
    credits_payes_restants: creditsPayesRestants,
    total_disponible: creditsGratuitsRestants + creditsPayesRestants,
    credits_gratuits_utilises: creditsGratuitsUtilises,
    total_analyses_effectuees: totalAnalysesEffectuees,
  };
};

const getRoutePath = (requestUrl) => {
  const url = new URL(requestUrl);
  const explicitRoute = url.searchParams.get('route');
  if (explicitRoute) {
    return explicitRoute.replace(/^\/+/, '');
  }

  const pathname = url.pathname;
  if (pathname.startsWith('/api/tva/')) return pathname.slice('/api/tva/'.length);

  const functionMarker = '/.netlify/functions/tva/';
  if (pathname.includes(functionMarker)) {
    return pathname.split(functionMarker)[1] || '';
  }

  return pathname.endsWith('/.netlify/functions/tva') ? '' : pathname;
};

const getCurrentVatPeriod = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getPeriodRange = (period) => {
  const [yearPart, monthPart] = String(period || '').split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return { start: '', end: '' };
  }

  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
  return { start, end };
};

const isDateInPeriod = (date, period) => {
  const { start, end } = getPeriodRange(period);
  return Boolean(date && start && end && date >= start && date <= end);
};

const getVatDeadlineLabel = (period) => {
  const [yearPart, monthPart] = String(period || '').split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return 'le 20 du mois suivant';

  return new Date(year, month, 20).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const getPeriodLabel = (period) => {
  const [year, month] = String(period || '').split('-').map(Number);
  if (!year || !month) return period;

  return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
};

const normalizeVatRate = (value) => {
  const numeric = Number(value);
  return VALID_VAT_RATES.includes(numeric) ? numeric : 20;
};

const normalizePaymentMode = (value, fallback = 'virement') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (normalized.includes('virement')) return 'virement';
  if (normalized.includes('cheque') || normalized.includes('cheque')) return 'cheque';
  if (normalized.includes('effet') || normalized.includes('traite') || normalized.includes('lcn')) return 'effet';
  if (normalized.includes('espece') || normalized.includes('especes')) return 'especes';
  if (VALID_PAYMENT_MODES.includes(normalized)) return normalized;
  return fallback;
};

const calculateVatFromTTC = (ttc, rate) => {
  const safeTtc = Number.isFinite(Number(ttc)) ? Number(ttc) : 0;
  const safeRate = Number.isFinite(Number(rate)) ? Number(rate) : 0;

  if (safeRate <= 0) {
    return { ht: roundToTwo(safeTtc), vat: 0 };
  }

  const ht = safeTtc / (1 + safeRate / 100);
  const vat = safeTtc - ht;
  return { ht: roundToTwo(ht), vat: roundToTwo(vat) };
};

const normalizeIsoDate = (value, fallback = new Date().toISOString().split('T')[0]) => {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const dayMonthYear = raw.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
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

const normalizePeriod = (value) => {
  const raw = String(value || '').trim();
  return /^\d{4}-\d{2}$/.test(raw) ? raw : null;
};

const normalizeDirection = (value) => {
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

const normalizeIce = (value) => {
  const digitsOnly = String(value || '').replace(/\D/g, '');
  return digitsOnly.length === 15 ? digitsOnly : null;
};

const buildOperationAmounts = (montantTtcValue, tauxTvaValue, montantHtValue, montantTvaValue) => {
  const montantTtc = Number(montantTtcValue);
  const tauxTva = normalizeVatRate(tauxTvaValue);
  const hasVisibleHt = Number.isFinite(Number(montantHtValue));
  const hasVisibleVat = Number.isFinite(Number(montantTvaValue));

  if (hasVisibleHt && hasVisibleVat) {
    return {
      montant_ttc: roundToTwo(Number.isFinite(montantTtc) ? montantTtc : 0),
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

const normalizeExtractedOperation = (operation, index) => {
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

const normalizeIgnoredOperation = (operation, index) => {
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
    sens: String(operation?.sens || '').trim().toLowerCase() === 'credit' ? 'credit' : 'debit',
    raison_exclusion: String(operation?.raison_exclusion || 'operation exclue').trim(),
  };
};

const normalizeExtractionDocumentType = (value, facturesCount) => {
  const raw = String(value || '').trim();
  if (raw === 'releve_bancaire' || raw === 'factures_multiples' || raw === 'facture_unique') {
    return raw;
  }

  return facturesCount > 1 ? 'factures_multiples' : 'facture_unique';
};

const normalizeVatExtractionResult = (payload) => {
  const rawFactures = Array.isArray(payload?.factures)
    ? payload.factures
    : payload && typeof payload === 'object' && ('date' in payload || 'fournisseur' in payload || 'fournisseur_client' in payload)
      ? [payload]
      : [];
  const factures = rawFactures
    .map((operation, index) => normalizeExtractedOperation(operation, index))
    .filter(Boolean);
  const operationsIgnorees = Array.isArray(payload?.operations_ignorees)
    ? payload.operations_ignorees
        .map((operation, index) => normalizeIgnoredOperation(operation, index))
        .filter(Boolean)
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

const buildAnalysisCacheDocId = (userId, hash) => `${userId}__${hash}`;

const stripUndefinedDeep = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => stripUndefinedDeep(entry)).filter((entry) => entry !== undefined);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, stripUndefinedDeep(entry)]),
    );
  }

  return value;
};

const buildAnalysisCounts = (result) => ({
  achats: result.factures.filter((facture) => facture.sens === 'achat').length,
  ventes: result.factures.filter((facture) => facture.sens === 'vente').length,
  ignorees: result.operations_ignorees.length,
});

const loadCachedAnalysisEntry = async (userId, hash) => {
  const cacheDocRef = doc(db, TVA_ANALYSIS_CACHE_COLLECTION, buildAnalysisCacheDocId(userId, hash));
  const snapshot = await getDoc(cacheDocRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};

const saveCachedAnalysisEntry = async ({
  userId,
  entrepriseId,
  hash,
  fileName,
  result,
  existingEntry,
}) => {
  const { cache_info: _ignoredCacheInfo, ...resultWithoutCacheInfo } = result;
  const safeResult = stripUndefinedDeep(resultWithoutCacheInfo);
  const counts = buildAnalysisCounts(result);
  const now = new Date().toISOString();
  const docId = buildAnalysisCacheDocId(userId, hash);
  const cachePayload = {
    user_id: userId,
    entrepriseId,
    hash_fichier: hash,
    nom_fichier_original: fileName,
    resultat_json: safeResult,
    nb_factures_achat: counts.achats,
    nb_factures_vente: counts.ventes,
    nb_operations_ignorees: counts.ignorees,
    analyse_date: now,
    created_at: existingEntry?.created_at || now,
  };

  await setDoc(doc(db, TVA_ANALYSIS_CACHE_COLLECTION, docId), cachePayload, { merge: true });

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
  };
};

const ensureVatAnalysisCreditsDoc = async (ownerId, entrepriseId = ownerId) => {
  const creditsDocRef = doc(db, TVA_ANALYSIS_CREDITS_COLLECTION, ownerId);
  const snapshot = await getDoc(creditsDocRef);

  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() };
  }

  const defaults = buildDefaultVatAnalysisCredits(ownerId, entrepriseId);
  await setDoc(creditsDocRef, defaults, { merge: true });
  return { id: ownerId, ...defaults };
};

const verifyVatAnalysisCreditsAvailability = async (ownerId, entrepriseId = ownerId) => {
  const creditsDoc = await ensureVatAnalysisCreditsDoc(ownerId, entrepriseId);
  const summary = buildVatAnalysisCreditsSummary(creditsDoc);

  return {
    creditsDoc,
    summary,
    autorise: summary.total_disponible > 0,
  };
};

const consumeVatAnalysisCredit = async (ownerId, entrepriseId = ownerId) => {
  const creditsDocRef = doc(db, TVA_ANALYSIS_CREDITS_COLLECTION, ownerId);
  const snapshot = await getDoc(creditsDocRef);
  const base = snapshot.exists()
    ? { id: snapshot.id, ...snapshot.data() }
    : { id: ownerId, ...buildDefaultVatAnalysisCredits(ownerId, entrepriseId) };
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
      user_id: ownerId,
      entrepriseId,
      credits_gratuits_utilises: nextFreeUsed,
      credits_payes_restants: nextPaid,
      total_analyses_effectuees: summary.total_analyses_effectuees + 1,
      created_at: base.created_at || now,
      updated_at: now,
    },
    { merge: true },
  );

  return buildVatAnalysisCreditsSummary({
    credits_gratuits_utilises: nextFreeUsed,
    credits_payes_restants: nextPaid,
    total_analyses_effectuees: summary.total_analyses_effectuees + 1,
  });
};

const addVatAnalysisCredits = async ({
  ownerId,
  entrepriseId = ownerId,
  transactionType,
  creditsToAdd,
  amountPaid,
  rechargeParAdmin = false,
  adminId = null,
  note = '',
}) => {
  if (!Number.isFinite(Number(creditsToAdd)) || Number(creditsToAdd) <= 0) {
    throw new Error('Le nombre de credits a ajouter est invalide.');
  }

  const creditsDoc = await ensureVatAnalysisCreditsDoc(ownerId, entrepriseId);
  const nextPaid = Math.max(0, Number(creditsDoc.credits_payes_restants || 0)) + Number(creditsToAdd);
  const now = new Date().toISOString();

  await setDoc(
    doc(db, TVA_ANALYSIS_CREDITS_COLLECTION, ownerId),
    {
      user_id: ownerId,
      entrepriseId,
      credits_gratuits_utilises: Math.max(0, Number(creditsDoc.credits_gratuits_utilises || 0)),
      credits_payes_restants: nextPaid,
      total_analyses_effectuees: Math.max(0, Number(creditsDoc.total_analyses_effectuees || 0)),
      created_at: creditsDoc.created_at || now,
      updated_at: now,
    },
    { merge: true },
  );

  await addDoc(collection(db, TVA_ANALYSIS_TRANSACTIONS_COLLECTION), {
    user_id: ownerId,
    entrepriseId,
    type: transactionType,
    credits_ajoutes: Number(creditsToAdd),
    montant_paye: Number(amountPaid || 0),
    recharge_par_admin: Boolean(rechargeParAdmin),
    admin_id: adminId || null,
    note: String(note || '').trim() || null,
    created_at: now,
  });

  return buildVatAnalysisCreditsSummary({
    credits_gratuits_utilises: Math.max(0, Number(creditsDoc.credits_gratuits_utilises || 0)),
    credits_payes_restants: nextPaid,
    total_analyses_effectuees: Math.max(0, Number(creditsDoc.total_analyses_effectuees || 0)),
  });
};

const buildVatSummary = (purchaseInvoices, salesInvoices, period) => {
  const filteredPurchases = purchaseInvoices.filter((invoice) => isDateInPeriod(invoice.date, period));
  const filteredSales = salesInvoices.filter((invoice) => isDateInPeriod(invoice.date, period));
  const deductibleVat = roundToTwo(filteredPurchases.reduce((sum, invoice) => sum + Number(invoice.montant_tva || 0), 0));
  const collectedVat = roundToTwo(filteredSales.reduce((sum, invoice) => sum + Number(invoice.totalVat || 0), 0));
  const purchaseTotalHT = roundToTwo(filteredPurchases.reduce((sum, invoice) => sum + Number(invoice.montant_ht || 0), 0));
  const purchaseTotalTTC = roundToTwo(filteredPurchases.reduce((sum, invoice) => sum + Number(invoice.montant_ttc || 0), 0));
  const salesTotalHT = roundToTwo(filteredSales.reduce((sum, invoice) => sum + Number(invoice.subtotal || 0), 0));
  const salesTotalTTC = roundToTwo(filteredSales.reduce((sum, invoice) => sum + Number(invoice.totalTTC || 0), 0));
  const balance = roundToTwo(collectedVat - deductibleVat);

  return {
    periode: period,
    deductibleVat,
    collectedVat,
    balance,
    totalInvoices: filteredPurchases.length + filteredSales.length,
    purchaseInvoicesCount: filteredPurchases.length,
    salesInvoicesCount: filteredSales.length,
    purchaseTotalHT,
    purchaseTotalTTC,
    salesTotalHT,
    salesTotalTTC,
    deadlineLabel: getVatDeadlineLabel(period),
    status: balance > 0 ? 'due' : 'credit',
  };
};

const flattenOpenAIText = (payload) => {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const parts = [];
  for (const output of payload?.output || []) {
    for (const content of output?.content || []) {
      if (typeof content?.text === 'string' && content.text.trim()) {
        parts.push(content.text.trim());
      }
    }
  }

  return parts.join('\n').trim();
};

const repairLooseJson = (rawText) =>
  String(rawText || '')
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .trim();

const parseLooseJson = (rawText) => {
  const cleaned = repairLooseJson(String(rawText || '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim());
  const objectStart = cleaned.indexOf('{');
  const objectEnd = cleaned.lastIndexOf('}');
  const arrayStart = cleaned.indexOf('[');
  const arrayEnd = cleaned.lastIndexOf(']');
  const canUseObject = objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart;
  const canUseArray = arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart;
  const jsonStart = canUseObject && (!canUseArray || objectStart <= arrayStart) ? objectStart : arrayStart;
  const jsonEnd = canUseObject && (!canUseArray || objectEnd >= arrayEnd) ? objectEnd : arrayEnd;
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error('JSON introuvable dans la reponse OpenAI.');
  }

  return JSON.parse(repairLooseJson(cleaned.slice(jsonStart, jsonEnd + 1)));
};

const parseOpenAIExtractionPayload = (payload) => {
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

const getCollectionRows = async (collectionName, entrepriseId) => {
  const rowsQuery = query(collection(db, collectionName), where('entrepriseId', '==', entrepriseId));
  const snapshot = await getDocs(rowsQuery);
  return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
};

const mapManualSalesInvoiceToVatInvoice = (invoice) => ({
  id: `manual-${invoice.id}`,
  sourceInvoiceId: invoice.id,
  sourceType: 'manuelle',
  number: invoice.numero_facture || undefined,
  date: invoice.date,
  originalDate: invoice.date,
  subtotal: Number(invoice.montant_ht || 0),
  totalVat: Number(invoice.montant_tva || 0),
  totalTTC: Number(invoice.montant_ttc || 0),
  mode_paiement: invoice.mode_paiement || null,
  numero_piece: invoice.numero_piece || null,
  clientName: invoice.client_name || 'Client',
  description: invoice.description || 'Vente manuelle',
  client: { name: invoice.client_name || 'Client' },
  items: invoice.description ? [{ description: invoice.description }] : [],
  isAdjusted: false,
  adjustmentAction: null,
});

const resolveSalesVatInvoices = (applicationInvoices, manualInvoices, adjustments) => {
  const adjustmentMap = new Map(adjustments.map((adjustment) => [adjustment.sourceInvoiceId, adjustment]));

  const applicationRows = applicationInvoices
    .map((invoice) => {
      const adjustment = adjustmentMap.get(invoice.id);
      if (adjustment?.action === 'exclude') return null;

      const effectiveDate =
        adjustment?.action === 'move' && adjustment.targetDate ? adjustment.targetDate : invoice.date;

      return {
        ...invoice,
        sourceType: 'application',
        sourceInvoiceId: invoice.id,
        originalDate: invoice.date,
        date: effectiveDate,
        mode_paiement: invoice.mode_paiement || null,
        numero_piece: invoice.numero_piece || null,
        clientName: invoice.client?.name || invoice.clientName || 'Client',
        description: invoice.items?.[0]?.description || invoice.description || invoice.number || 'Facture de vente',
        isAdjusted: Boolean(adjustment),
        adjustmentAction: adjustment?.action || null,
      };
    })
    .filter(Boolean);

  const manualRows = manualInvoices.map(mapManualSalesInvoiceToVatInvoice);
  return [...applicationRows, ...manualRows].sort((left, right) => right.date.localeCompare(left.date));
};

const validatePurchasePayload = (payload) => {
  if (!payload?.date) return 'La date est obligatoire.';
  if (!payload?.description || !String(payload.description).trim()) return 'La description est obligatoire.';
  if (!payload?.fournisseur || !String(payload.fournisseur).trim()) return 'Le fournisseur est obligatoire.';

  const montantTtc = Number(payload.montant_ttc);
  if (!Number.isFinite(montantTtc) || montantTtc <= 0) {
    return 'Le montant TTC doit etre superieur a 0.';
  }

  const paymentMode = normalizePaymentMode(payload.mode_paiement);
  if ((paymentMode === 'cheque' || paymentMode === 'effet') && !String(payload.numero_piece || '').trim()) {
    return "Le numero de cheque ou d'effet est obligatoire.";
  }

  return null;
};

const sanitizePurchasePayload = (payload) => {
  const taux_tva = normalizeVatRate(payload.taux_tva);
  const montant_ttc = roundToTwo(payload.montant_ttc);
  const amounts = calculateVatFromTTC(montant_ttc, taux_tva);
  const mode_paiement = normalizePaymentMode(payload.mode_paiement);

  return {
    date: String(payload.date),
    numero_facture: String(payload.numero_facture || '').trim() || null,
    fournisseur: String(payload.fournisseur || '').trim(),
    ice_fournisseur: String(payload.ice_fournisseur || '').trim() || null,
    description: String(payload.description || '').trim(),
    montant_ttc,
    montant_ht: roundToTwo(payload.montant_ht ?? amounts.ht),
    taux_tva,
    montant_tva: roundToTwo(payload.montant_tva ?? amounts.vat),
    mode_paiement,
    numero_piece: mode_paiement === 'cheque' || mode_paiement === 'effet' ? String(payload.numero_piece || '').trim() || null : null,
    source: payload.source === 'pdf_ia' ? 'pdf_ia' : 'manuelle',
    aiExtractedFields: Array.isArray(payload.aiExtractedFields) ? payload.aiExtractedFields : [],
    aiMissingFields: Array.isArray(payload.aiMissingFields) ? payload.aiMissingFields : [],
  };
};

const getVatAiSettings = async () => {
  const settingsSnapshot = await getDoc(doc(db, TVA_AI_SETTINGS_COLLECTION, TVA_AI_SETTINGS_DOC));
  const settingsData = settingsSnapshot.exists() ? settingsSnapshot.data() : {};
  const apiKey = sanitizeSecretValue(settingsData.apiKey);

  if (!apiKey) {
    throw new Error("La cle OpenAI n'est pas configuree dans le dashboard admin.");
  }

  return {
    apiKey,
    model: String(settingsData.model || '').trim() || DEFAULT_OPENAI_MODEL,
    prompt: ensureVatAiPrompt(String(settingsData.prompt || '').trim() || STRICT_BANK_STATEMENT_OPENAI_PROMPT),
  };
};

const extractFromPdfWithOpenAI = async (file) => {
  const settings = await getVatAiSettings();
  const pdfBuffer = Buffer.from(await file.arrayBuffer());
  const requestBody = {
    model: normalizeVatAiModel(settings.model),
    instructions: OPENAI_TVA_SYSTEM_PROMPT,
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: settings.prompt },
          {
            type: 'input_file',
            filename: file.name || 'facture-achat.pdf',
            file_data: `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
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

  let lastJsonError = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorPayload = await response.text();
      throw new Error(errorPayload || 'OpenAI a retourne une erreur.');
    }

    try {
      const parsed = parseOpenAIExtractionPayload(await response.json());
      return normalizeVatExtractionResult(parsed);
    } catch (error) {
      lastJsonError = error instanceof Error ? error : new Error("Le JSON d'extraction IA est invalide.");
    }
  }

  throw lastJsonError || new Error('Impossible de lire ce PDF, veuillez saisir manuellement.');
};

const createSummaryPayload = async (entrepriseId, period) => {
  const [purchaseInvoices, applicationSalesInvoices, manualSalesInvoices, salesAdjustments] = await Promise.all([
    getCollectionRows(TVA_COLLECTION, entrepriseId),
    getCollectionRows(SALES_COLLECTION, entrepriseId),
    getCollectionRows(SALES_MANUAL_COLLECTION, entrepriseId),
    getCollectionRows(SALES_ADJUSTMENTS_COLLECTION, entrepriseId),
  ]);

  const normalizedPeriod = period || getCurrentVatPeriod();
  const salesInvoices = resolveSalesVatInvoices(applicationSalesInvoices, manualSalesInvoices, salesAdjustments);
  const summary = buildVatSummary(purchaseInvoices, salesInvoices, normalizedPeriod);

  return {
    period: normalizedPeriod,
    summary,
    purchaseInvoices: purchaseInvoices.filter((invoice) => isDateInPeriod(invoice.date, normalizedPeriod)),
    salesInvoices: salesInvoices.filter((invoice) => isDateInPeriod(invoice.date, normalizedPeriod)),
  };
};

const buildPdfBuffer = ({ period, summary, purchaseInvoices, salesInvoices }) => {
  const document = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const recapRows = [
    ...purchaseInvoices.map((invoice) => [new Date(invoice.date).toLocaleDateString('fr-FR'), 'Achat', invoice.fournisseur, invoice.description, formatMad(invoice.montant_ht), formatMad(invoice.montant_tva), formatMad(invoice.montant_ttc)]),
    ...salesInvoices.map((invoice) => [new Date(invoice.date).toLocaleDateString('fr-FR'), 'Vente', invoice.clientName || invoice.client?.name || 'Client', invoice.description || invoice.items?.[0]?.description || invoice.number || 'Facture de vente', formatMad(invoice.subtotal), formatMad(invoice.totalVat), formatMad(invoice.totalTTC)]),
  ].sort((left, right) => right[0].localeCompare(left[0]));

  document.setFont('helvetica', 'bold');
  document.setFontSize(18);
  document.text('Recapitulatif TVA - Factourati', 14, 18);
  document.setFont('helvetica', 'normal');
  document.setFontSize(11);
  document.text(`Periode: ${getPeriodLabel(period)}`, 14, 26);
  document.text(`Declaration DGI avant le ${summary.deadlineLabel}`, 14, 32);
  document.setFont('helvetica', 'bold');
  document.setFontSize(13);
  document.text(summary.balance > 0 ? `TVA a payer: ${formatMad(summary.balance)}` : `Credit TVA: ${formatMad(Math.abs(summary.balance))}`, 14, 42);

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
    startY: document.lastAutoTable.finalY + 8,
    head: [['Date', 'Type', 'Tiers', 'Description', 'HT', 'TVA', 'TTC']],
    body: recapRows.length ? recapRows : [['-', '-', '-', 'Aucune ecriture sur cette periode', '-', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] },
    styles: { fontSize: 9, cellPadding: 2.4 },
  });

  return Buffer.from(document.output('arraybuffer'));
};

const handleExtractPdf = async (request) => {
  try {
    const entrepriseId = getEntrepriseId(request);
    const userId = getUserId(request);
    const creditsOwnerId = getCreditsOwnerId(request);
    if (!entrepriseId) {
      return jsonResponse({ message: 'Entreprise introuvable.' }, 400);
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const forceReanalyze = String(formData.get('force_reanalyze') || '').trim().toLowerCase() === 'true';

    if (!file || typeof file.arrayBuffer !== 'function') {
      return jsonResponse({ message: 'Aucun fichier PDF valide recu.' }, 400);
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileHash = createHash('sha256').update(fileBuffer).digest('hex');
    const cachedEntry = await loadCachedAnalysisEntry(userId, fileHash);

    if (cachedEntry && !forceReanalyze) {
      return jsonResponse({
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
      });
    }

    const verification = await verifyVatAnalysisCreditsAvailability(creditsOwnerId, entrepriseId);
    if (!verification.autorise) {
      return jsonResponse(
        {
          message: 'ANALYSIS_CREDITS_REQUIRED',
          credits_gratuits_restants: verification.summary.credits_gratuits_restants,
          credits_payes_restants: verification.summary.credits_payes_restants,
          total_disponible: verification.summary.total_disponible,
        },
        402,
      );
    }

    const result = await extractFromPdfWithOpenAI({
      name: file.name || 'releve-bancaire.pdf',
      type: file.type || 'application/pdf',
      arrayBuffer: async () => fileBuffer,
    });
    await consumeVatAnalysisCredit(creditsOwnerId, entrepriseId);

    let responsePayload;
    try {
      responsePayload = await saveCachedAnalysisEntry({
        userId,
        entrepriseId,
        hash: fileHash,
        fileName: file.name || 'releve-bancaire.pdf',
        result,
        existingEntry: cachedEntry,
      });
    } catch (cacheError) {
      console.warn('Impossible de mettre en cache le releve analyse TVA:', cacheError);
      responsePayload = result;
    }

    return jsonResponse(responsePayload);
  } catch (error) {
    console.error('Erreur extraction PDF TVA:', error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Impossible de lire ce PDF, veuillez saisir manuellement.';
    const status = /openai|cle|configur/i.test(message) ? 500 : 422;
    return jsonResponse({ message }, status);
  }
};

const handleCreatePurchaseInvoice = async (request) => {
  const entrepriseId = getEntrepriseId(request);
  if (!entrepriseId) return jsonResponse({ message: 'Entreprise introuvable.' }, 400);

  const body = await request.json();
  const validationError = validatePurchasePayload(body);
  if (validationError) return jsonResponse({ message: validationError }, 400);

  const payload = sanitizePurchasePayload(body);
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, TVA_COLLECTION), {
    ...payload,
    user_id: getUserId(request),
    entrepriseId,
    created_at: now,
    updated_at: now,
  });

  return jsonResponse({ id: docRef.id, ...payload }, 201);
};

const handleUpdatePurchaseInvoice = async (request, invoiceId) => {
  const body = await request.json();
  const validationError = validatePurchasePayload(body);
  if (validationError) return jsonResponse({ message: validationError }, 400);

  const payload = sanitizePurchasePayload(body);
  await updateDoc(doc(db, TVA_COLLECTION, invoiceId), {
    ...payload,
    updated_at: new Date().toISOString(),
  });

  return jsonResponse({ id: invoiceId, ...payload });
};

const handleDeletePurchaseInvoice = async (invoiceId) => {
  await deleteDoc(doc(db, TVA_COLLECTION, invoiceId));
  return new Response(null, { status: 204 });
};

const handleSummary = async (request) => {
  const entrepriseId = getEntrepriseId(request);
  if (!entrepriseId) return jsonResponse({ message: 'Entreprise introuvable.' }, 400);

  const period = new URL(request.url).searchParams.get('periode') || getCurrentVatPeriod();
  return jsonResponse(await createSummaryPayload(entrepriseId, period));
};

const handleExportPdf = async (request) => {
  const entrepriseId = getEntrepriseId(request);
  if (!entrepriseId) return jsonResponse({ message: 'Entreprise introuvable.' }, 400);

  const period = new URL(request.url).searchParams.get('periode') || getCurrentVatPeriod();
  const payload = await createSummaryPayload(entrepriseId, period);
  const pdfBuffer = buildPdfBuffer(payload);

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="recap-tva-${period}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
};

const handleGetCredits = async (request) => {
  const entrepriseId = getCreditsOwnerId(request);
  if (!entrepriseId) return jsonResponse({ message: 'Entreprise introuvable.' }, 400);

  const verification = await verifyVatAnalysisCreditsAvailability(entrepriseId, entrepriseId);
  return jsonResponse(verification.summary);
};

const handleVerifyCredits = async (request) => {
  const entrepriseId = getCreditsOwnerId(request);
  if (!entrepriseId) return jsonResponse({ message: 'Entreprise introuvable.' }, 400);

  const verification = await verifyVatAnalysisCreditsAvailability(entrepriseId, entrepriseId);
  return jsonResponse({
    autorise: verification.autorise,
    credits_restants: verification.summary.total_disponible,
    credits_gratuits_restants: verification.summary.credits_gratuits_restants,
    credits_payes_restants: verification.summary.credits_payes_restants,
  });
};

const handleBuyCredits = async (request) => {
  const entrepriseId = getCreditsOwnerId(request);
  if (!entrepriseId) return jsonResponse({ message: 'Entreprise introuvable.' }, 400);

  const body = await request.json();
  const packType = String(body?.type || '').trim();
  const pack = TVA_ANALYSIS_PACKS[packType];

  if (!pack) {
    return jsonResponse({ message: "Le pack d'analyses IA est invalide." }, 400);
  }

  const summary = await addVatAnalysisCredits({
    ownerId: entrepriseId,
    entrepriseId,
    transactionType: packType,
    creditsToAdd: pack.credits,
    amountPaid: pack.amount,
    rechargeParAdmin: false,
    adminId: null,
    note: body?.paiement_data?.note || '',
  });

  return jsonResponse({
    ...summary,
    message: `${pack.credits} analyses ajoutees a votre compte !`,
  });
};

const handleAdminRechargeCredits = async (request, companyId) => {
  if (!isAdminRequest(request)) {
    return jsonResponse({ message: 'Acces admin requis.' }, 403);
  }

  if (!companyId) {
    return jsonResponse({ message: 'Client introuvable.' }, 400);
  }

  const body = await request.json();
  const credits = Number(body?.credits || 0);
  const type = String(body?.type || '').trim() || 'custom_admin';
  const note = String(body?.note || '').trim();

  const summary = await addVatAnalysisCredits({
    ownerId: companyId,
    entrepriseId: companyId,
    transactionType: type,
    creditsToAdd: credits,
    amountPaid: 0,
    rechargeParAdmin: true,
    adminId: getUserId(request),
    note,
  });

  return jsonResponse({
    message: `${credits} analyses ont ete ajoutees gratuitement.`,
    summary,
  });
};

export default async (request) => {
  try {
    const routePath = getRoutePath(request.url);
    const [resource, resourceId, resourceChild, resourceGrandChild] = routePath.split('/');

    if (request.method === 'POST' && routePath === 'extract-pdf') return await handleExtractPdf(request);
    if (request.method === 'GET' && routePath === 'summary') return await handleSummary(request);
    if (request.method === 'GET' && routePath === 'export-pdf') return await handleExportPdf(request);
    if (request.method === 'GET' && routePath === 'credits') return await handleGetCredits(request);
    if (request.method === 'POST' && routePath === 'credits/verifier') return await handleVerifyCredits(request);
    if (request.method === 'POST' && routePath === 'credits/acheter') return await handleBuyCredits(request);
    if (
      request.method === 'POST' &&
      resource === 'admin' &&
      resourceId === 'users' &&
      resourceGrandChild === 'tva-credits'
    ) {
      return await handleAdminRechargeCredits(request, resourceChild);
    }
    if (resource === 'facture-achat' && request.method === 'POST' && !resourceId) return await handleCreatePurchaseInvoice(request);
    if (resource === 'facture-achat' && request.method === 'PUT' && resourceId) return await handleUpdatePurchaseInvoice(request, resourceId);
    if (resource === 'facture-achat' && request.method === 'DELETE' && resourceId) return await handleDeletePurchaseInvoice(resourceId);

    return jsonResponse({ message: 'Route TVA introuvable.' }, 404);
  } catch (error) {
    console.error('Erreur API TVA:', error);
    return jsonResponse({ message: error instanceof Error ? error.message : 'Erreur interne TVA.' }, 500);
  }
};

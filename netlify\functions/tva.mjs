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
const TVA_CARRYOVER_OVERRIDES_COLLECTION = 'factures_tva_credits_reportes';
const TVA_ANALYSIS_CACHE_COLLECTION = 'tva_analyses_cache';
const TVA_ANALYSIS_CREDITS_COLLECTION = 'tva_analyses_credits';
const TVA_ANALYSIS_TRANSACTIONS_COLLECTION = 'tva_analyses_transactions';
const TVA_AI_SETTINGS_COLLECTION = 'platformSettings';
const TVA_AI_SETTINGS_DOC = 'openaiPdfAnalysis';
const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };
const VALID_VAT_RATES = [20, 14, 13, 10, 7, 0];
const VALID_PAYMENT_MODES = ['virement', 'cheque', 'effet', 'paiement_en_ligne', 'carte', 'especes', 'autre'];
const TVA_FREE_ANALYSIS_LIMIT = 3;
const TVA_ANALYSIS_PACKS = {
  pack_5: { credits: 5, amount: 50 },
  pack_10: { credits: 10, amount: 89 },
  pack_20: { credits: 20, amount: 179 },
};
const DEFAULT_OPENAI_MODEL = 'gpt-5.4';
const DEFAULT_TVA_N8N_WEBHOOK_URL = 'https://factourati2.app.n8n.cloud/webhook-test/factourati-tva-analyse';
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

const TVA_OPERATION_CLASSIFICATIONS = ['achat_propose', 'vente_propose', 'ignore', 'a_verifier'];
const TVA_CONFIDENCE_LEVELS = ['eleve', 'moyen', 'faible'];
const TVA_BANK_DIRECTION_VALUES = ['debit', 'credit', 'inconnu'];
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
    banque: {
      anyOf: [{ type: 'string' }, { type: 'null' }],
    },
    societe_titulaire: {
      anyOf: [{ type: 'string' }, { type: 'null' }],
    },
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
          sens_bancaire: { type: 'string', enum: TVA_BANK_DIRECTION_VALUES },
          mode_paiement_detecte: { type: 'string', enum: VALID_PAYMENT_MODES },
          classification: { type: 'string', enum: TVA_OPERATION_CLASSIFICATIONS },
          raison: { type: 'string' },
          niveau_confiance: { type: 'string', enum: TVA_CONFIDENCE_LEVELS },
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
};

const TVA_AMBIGUOUS_RECHECK_SYSTEM_PROMPT =
  "Tu reclasses uniquement des operations de releve bancaire marocain deja extraites. Retourne uniquement le JSON strict demande.";
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
          classification: { type: 'string', enum: TVA_OPERATION_CLASSIFICATIONS },
          niveau_confiance: { type: 'string', enum: TVA_CONFIDENCE_LEVELS },
          raison: { type: 'string' },
          fournisseur_client: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          description: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          numero_piece: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          mode_paiement_detecte: { type: 'string', enum: VALID_PAYMENT_MODES },
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
};

const sanitizeSecretValue = (value) => String(value || '').trim().replace(/^['"]+|['"]+$/g, '');
const parseN8nJsonResponse = async (response) => {
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
const ensureVatAiPrompt = (prompt) =>
  String(prompt || '').includes('DATE | LIBELLE | DEBIT | CREDIT | SOLDE') &&
  String(prompt || '').includes('DEBIT  = colonne de gauche = argent qui SORT  = ACHAT') &&
  String(prompt || '').includes('CREDIT = colonne de droite = argent qui ENTRE = VENTE') &&
  String(prompt || '').includes('operations_ignorees')
    ? String(prompt || '')
    : STRICT_BANK_STATEMENT_OPENAI_PROMPT;
const normalizeVatAiModel = (model) => {
  const normalized = String(model || '').trim();
  return normalized || DEFAULT_OPENAI_MODEL;
};

const STRUCTURED_ANALYSIS_MAX_OUTPUT_TOKENS = [12000, 22000];

const isRetryableStructuredAnalysisError = (error) => {
  const message = String(error?.message || '').toLowerCase();

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

const roundToTwo = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const formatMad = (value) =>
  `${new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(Number.isFinite(Number(value)) ? Number(value) : 0)
    .replace(/[\u202F\u00A0]/g, ' ')} MAD`;

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
const VAT_PERIOD_PATTERN = /^\d{4}-\d{2}$/;

const isValidVatPeriod = (period) => VAT_PERIOD_PATTERN.test(String(period || '').trim());

const getNextVatPeriod = (period) => {
  if (!isValidVatPeriod(period)) {
    return null;
  }

  const [yearPart, monthPart] = String(period).split('-').map(Number);
  const baseDate = new Date(yearPart, monthPart - 1, 1);
  baseDate.setMonth(baseDate.getMonth() + 1);
  return getCurrentVatPeriod(baseDate);
};

const getEarliestVatPeriod = (purchaseInvoices, salesInvoices, fallbackPeriod) => {
  const periods = [fallbackPeriod];

  purchaseInvoices.forEach((invoice) => {
    const candidate = String(invoice?.date || '').slice(0, 7);
    if (isValidVatPeriod(candidate)) {
      periods.push(candidate);
    }
  });

  salesInvoices.forEach((invoice) => {
    const candidate = String(invoice?.date || '').slice(0, 7);
    if (isValidVatPeriod(candidate)) {
      periods.push(candidate);
    }
  });

  return periods.sort()[0] || fallbackPeriod;
};

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

const buildEmptyVatSummary = (period) => ({
  periode: period,
  deductibleVat: 0,
  collectedVat: 0,
  balanceBeforeCarryover: 0,
  carryoverCredit: 0,
  balance: 0,
  totalInvoices: 0,
  purchaseInvoicesCount: 0,
  salesInvoicesCount: 0,
  purchaseTotalHT: 0,
  purchaseTotalTTC: 0,
  salesTotalHT: 0,
  salesTotalTTC: 0,
  deadlineLabel: getVatDeadlineLabel(period),
  status: 'settled',
});

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
  if (
    normalized.includes('cmi') ||
    normalized.includes('stripe') ||
    normalized.includes('paypal') ||
    normalized.includes('online') ||
    normalized.includes('en ligne') ||
    normalized.includes('chaabinet')
  ) {
    return 'paiement_en_ligne';
  }
  if (normalized.includes('cb') || normalized.includes('carte') || normalized.includes('tpe')) return 'carte';
  if (normalized.includes('virement') || normalized.startsWith('vir') || normalized.includes('vrt')) return 'virement';
  if (normalized.includes('cheque') || normalized.includes('chq')) return 'cheque';
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
    mode_paiement: normalizePaymentMode(operation?.mode_paiement),
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

const removeVatAnalysisCredits = async ({
  ownerId,
  entrepriseId = ownerId,
  creditsToRemove,
  adminId = null,
  note = '',
}) => {
  if (!Number.isFinite(Number(creditsToRemove)) || Number(creditsToRemove) <= 0) {
    throw new Error('Le nombre de credits a retirer est invalide.');
  }

  const creditsDoc = await ensureVatAnalysisCreditsDoc(ownerId, entrepriseId);
  const currentPaidCredits = Math.max(0, Number(creditsDoc.credits_payes_restants || 0));

  if (Number(creditsToRemove) > currentPaidCredits) {
    throw new Error(`Vous ne pouvez retirer que ${currentPaidCredits} credits payes restants.`);
  }

  const nextPaid = Math.max(0, currentPaidCredits - Number(creditsToRemove));
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
    type: 'retrait_admin',
    credits_ajoutes: -Number(creditsToRemove),
    montant_paye: 0,
    recharge_par_admin: true,
    admin_id: adminId || null,
    note: String(note || '').trim() || 'Retrait admin de credits IA',
    created_at: now,
  });

  return buildVatAnalysisCreditsSummary({
    credits_gratuits_utilises: Math.max(0, Number(creditsDoc.credits_gratuits_utilises || 0)),
    credits_payes_restants: nextPaid,
    total_analyses_effectuees: Math.max(0, Number(creditsDoc.total_analyses_effectuees || 0)),
  });
};

const buildVatSummary = (purchaseInvoices, salesInvoices, period, carryoverOverrides = []) => {
  const normalizedPeriod = isValidVatPeriod(period) ? period : getCurrentVatPeriod();
  const earliestPeriod = getEarliestVatPeriod(purchaseInvoices, salesInvoices, normalizedPeriod);
  const carryoverOverrideMap = new Map(
    carryoverOverrides
      .filter((override) => isValidVatPeriod(String(override?.period || '')))
      .map((override) => [
        override.period,
        roundToTwo(Math.max(0, Number(override?.amount || 0))),
      ]),
  );
  let cursorPeriod = earliestPeriod;
  let carryoverCredit = 0;
  let summary = buildEmptyVatSummary(normalizedPeriod);

  while (cursorPeriod && cursorPeriod <= normalizedPeriod) {
    const filteredPurchases = purchaseInvoices.filter((invoice) => isDateInPeriod(invoice.date, cursorPeriod));
    const filteredSales = salesInvoices.filter((invoice) => isDateInPeriod(invoice.date, cursorPeriod));
    const deductibleVat = roundToTwo(filteredPurchases.reduce((sum, invoice) => sum + Number(invoice.montant_tva || 0), 0));
    const collectedVat = roundToTwo(filteredSales.reduce((sum, invoice) => sum + Number(invoice.totalVat || 0), 0));
    const purchaseTotalHT = roundToTwo(filteredPurchases.reduce((sum, invoice) => sum + Number(invoice.montant_ht || 0), 0));
    const purchaseTotalTTC = roundToTwo(filteredPurchases.reduce((sum, invoice) => sum + Number(invoice.montant_ttc || 0), 0));
    const salesTotalHT = roundToTwo(filteredSales.reduce((sum, invoice) => sum + Number(invoice.subtotal || 0), 0));
    const salesTotalTTC = roundToTwo(filteredSales.reduce((sum, invoice) => sum + Number(invoice.totalTTC || 0), 0));
    const balanceBeforeCarryover = roundToTwo(collectedVat - deductibleVat);
    const appliedCarryoverCredit = carryoverOverrideMap.has(cursorPeriod)
      ? carryoverOverrideMap.get(cursorPeriod) || 0
      : carryoverCredit;
    const balance = roundToTwo(balanceBeforeCarryover - appliedCarryoverCredit);

    summary = {
      periode: cursorPeriod,
      deductibleVat,
      collectedVat,
      balanceBeforeCarryover,
      carryoverCredit: appliedCarryoverCredit,
      balance,
      totalInvoices: filteredPurchases.length + filteredSales.length,
      purchaseInvoicesCount: filteredPurchases.length,
      salesInvoicesCount: filteredSales.length,
      purchaseTotalHT,
      purchaseTotalTTC,
      salesTotalHT,
      salesTotalTTC,
      deadlineLabel: getVatDeadlineLabel(cursorPeriod),
      status: balance > 0 ? 'due' : balance < 0 ? 'credit' : 'settled',
    };

    carryoverCredit = balance < 0 ? roundToTwo(Math.abs(balance)) : 0;
    cursorPeriod = cursorPeriod === normalizedPeriod ? null : getNextVatPeriod(cursorPeriod);
  }

  return summary;
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

const buildPromptWithCustomInstructions = (basePrompt, customPrompt) => {
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

const normalizeConfidence = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'eleve' || normalized === 'moyen' || normalized === 'faible') {
    return normalized;
  }

  return 'faible';
};

const normalizeOperationClassification = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (TVA_OPERATION_CLASSIFICATIONS.includes(normalized)) {
    return normalized;
  }

  return 'a_verifier';
};

const normalizeBankDirection = (value, debit, credit) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'debit' || normalized === 'credit' || normalized === 'inconnu') {
    return normalized;
  }
  if (Number(debit) > 0 && Number(credit) <= 0) return 'debit';
  if (Number(credit) > 0 && Number(debit) <= 0) return 'credit';
  return 'inconnu';
};

const normalizeAmount = (value) => roundToTwo(Math.max(0, Number(value || 0)));
const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const stripAccents = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const toKeywordText = (value) => stripAccents(String(value || '').toLowerCase());

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

const hasAnyKeyword = (value, keywords) => {
  const haystack = toKeywordText(value);
  return keywords.some((keyword) => haystack.includes(keyword));
};

const hasProfessionalEntityMarker = (value) => hasAnyKeyword(value, PROFESSIONAL_ENTITY_KEYWORDS);

const isLikelyPersonalTransfer = (label) =>
  hasAnyKeyword(label, PERSONAL_TRANSFER_KEYWORDS) && !hasProfessionalEntityMarker(label);

const inferClassificationFromHeuristics = (operation) => {
  const direction = operation.sens_bancaire;
  const label = operation.libelle_original;
  const mode = operation.mode_paiement_detecte;

  if (hasAnyKeyword(label, OPENING_BALANCE_KEYWORDS)) {
    return {
      classification: 'ignore',
      niveau_confiance: 'eleve',
      raison: 'Ancien ou nouveau solde sans impact TVA.',
    };
  }

  if (hasAnyKeyword(label, BANK_FEE_KEYWORDS)) {
    return {
      classification: 'ignore',
      niveau_confiance: 'eleve',
      raison: 'Frais ou commission bancaire a exclure de la TVA.',
    };
  }

  if (hasAnyKeyword(label, TAX_AND_SOCIAL_KEYWORDS)) {
    return {
      classification: 'ignore',
      niveau_confiance: 'eleve',
      raison: 'Taxe ou cotisation sans impact TVA deductible.',
    };
  }

  if (hasAnyKeyword(label, CASH_WITHDRAWAL_KEYWORDS)) {
    return {
      classification: 'ignore',
      niveau_confiance: 'eleve',
      raison: 'Retrait ou espece a laisser visible hors TVA.',
    };
  }

  if (hasAnyKeyword(label, FINANCING_KEYWORDS)) {
    return {
      classification: 'ignore',
      niveau_confiance: 'eleve',
      raison: 'Credit, pret ou remboursement bancaire hors TVA.',
    };
  }

  if (hasAnyKeyword(label, INTERNAL_TRANSFER_KEYWORDS)) {
    return {
      classification: 'ignore',
      niveau_confiance: 'eleve',
      raison: 'Virement interne sans impact TVA.',
    };
  }

  if (direction === 'debit' && isLikelyPersonalTransfer(label)) {
    return {
      classification: 'ignore',
      niveau_confiance: 'eleve',
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
      classification: 'achat_propose',
      niveau_confiance: hasProfessionalEntityMarker(label) ? 'eleve' : 'moyen',
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
      classification: 'vente_propose',
      niveau_confiance: hasProfessionalEntityMarker(label) ? 'eleve' : 'moyen',
      raison: 'Credit associe a un encaissement client probable.',
    };
  }

  if (direction === 'credit') {
    return {
      classification: 'a_verifier',
      niveau_confiance: 'faible',
      raison: 'Credit detecte: verifier s il s agit d un encaissement client.',
    };
  }

  return {
    classification: 'a_verifier',
    niveau_confiance: 'faible',
    raison: 'Operation ambigue a verifier manuellement.',
  };
};

const inferCounterpartFromLabel = (value) => {
  const label = normalizeText(value);
  if (!label) return null;

  return label.slice(0, 140);
};

const normalizeAnalysisOperation = (operation, index) => {
  const debit = normalizeAmount(operation?.montant_debit);
  const credit = normalizeAmount(operation?.montant_credit);
  const label = normalizeText(operation?.libelle_original || operation?.libelle || operation?.description);
  if (!label && debit <= 0 && credit <= 0) {
    return null;
  }

  const normalized = {
    id_ligne: normalizeText(operation?.id_ligne) || `ligne_${index + 1}`,
    date: normalizeText(operation?.date) ? normalizeIsoDate(operation?.date, normalizeText(operation?.date)) : null,
    libelle_original: label || `Operation ${index + 1}`,
    montant_debit: debit,
    montant_credit: credit,
    sens_bancaire: normalizeBankDirection(operation?.sens_bancaire, debit, credit),
    mode_paiement_detecte: normalizePaymentMode(
      operation?.mode_paiement_detecte || operation?.mode_paiement || label,
      'autre',
    ),
    classification: normalizeOperationClassification(operation?.classification),
    raison: normalizeText(operation?.raison) || '',
    niveau_confiance: normalizeConfidence(operation?.niveau_confiance),
    fournisseur_client: normalizeText(operation?.fournisseur_client) || null,
    description: normalizeText(operation?.description) || null,
    numero_piece: normalizeText(operation?.numero_piece) || null,
    taux_tva: Number.isFinite(Number(operation?.taux_tva)) ? normalizeVatRate(Number(operation?.taux_tva)) : null,
  };

  const heuristic = inferClassificationFromHeuristics(normalized);

  if (!normalized.raison) {
    normalized.raison = heuristic.raison;
  }

  if (!normalized.fournisseur_client) {
    normalized.fournisseur_client = inferCounterpartFromLabel(normalized.libelle_original);
  }

  if (!normalized.description) {
    normalized.description = normalized.libelle_original;
  }

  if (normalized.classification === 'a_verifier' && heuristic.classification !== 'a_verifier') {
    normalized.classification = heuristic.classification;
    normalized.niveau_confiance = heuristic.niveau_confiance;
    normalized.raison = heuristic.raison;
  }

  if (
    normalized.classification === 'ignore' &&
    (heuristic.classification === 'achat_propose' || heuristic.classification === 'vente_propose')
  ) {
    normalized.classification = heuristic.classification;
    normalized.niveau_confiance = heuristic.niveau_confiance;
    normalized.raison = heuristic.raison;
  }

  if (normalized.sens_bancaire === 'debit' && normalized.classification === 'vente_propose') {
    normalized.classification = 'a_verifier';
    normalized.niveau_confiance = 'faible';
    normalized.raison = 'Debit detecte mais classification vente incoherente.';
  }

  if (normalized.sens_bancaire === 'credit' && normalized.classification === 'achat_propose') {
    normalized.classification = 'a_verifier';
    normalized.niveau_confiance = 'faible';
    normalized.raison = 'Credit detecte mais classification achat incoherente.';
  }

  if (normalized.sens_bancaire === 'inconnu') {
    normalized.classification = 'a_verifier';
    normalized.niveau_confiance = 'faible';
    normalized.raison = normalized.raison || 'Sens bancaire ambigu.';
  }

  if (normalized.montant_debit <= 0 && normalized.montant_credit <= 0) {
    normalized.classification = 'a_verifier';
    normalized.niveau_confiance = 'faible';
    normalized.raison = 'Montant debit et credit absents.';
  }

  if (normalized.montant_debit > 0 && normalized.montant_credit > 0) {
    normalized.classification = 'a_verifier';
    normalized.niveau_confiance = 'faible';
    normalized.raison = 'Debit et credit renseignes sur la meme ligne.';
  }

  if (normalized.classification === 'ignore') {
    normalized.niveau_confiance = normalized.niveau_confiance === 'faible' ? 'moyen' : normalized.niveau_confiance;
  }

  if (normalized.classification === 'a_verifier' && heuristic.classification !== 'ignore' && normalized.niveau_confiance !== 'faible') {
    normalized.niveau_confiance = 'faible';
  }

  return normalized;
};

const buildLegacyOperationsFromPayload = (payload) => {
  const factures = Array.isArray(payload?.factures) ? payload.factures : [];
  const ignored = Array.isArray(payload?.operations_ignorees) ? payload.operations_ignorees : [];

  return [
    ...factures.map((facture, index) => ({
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
    ...ignored.map((operation, index) => ({
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

const buildFactureFromOperation = (operation) => {
  const sens = operation.classification === 'vente_propose' ? 'vente' : 'achat';
  const montantTtc = sens === 'vente' ? operation.montant_credit : operation.montant_debit;
  const tauxTva = normalizeVatRate(operation.taux_tva ?? 20);
  const amounts = calculateVatFromTTC(montantTtc, tauxTva);

  return {
    id: `extracted-${operation.id_ligne}`,
    id_ligne_source: operation.id_ligne,
    classification: operation.classification,
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
    mode_paiement: normalizePaymentMode(operation.mode_paiement_detecte, 'autre'),
    numero_piece: operation.numero_piece || null,
    ice: null,
    tva_modifiable: true,
    niveau_confiance: normalizeConfidence(operation.niveau_confiance),
    raison_classement: normalizeText(operation.raison) || 'Classement IA',
    ignoree: false,
  };
};

const buildIgnoredOperationFromAnalysisOperation = (operation) => ({
  id: `ignored-${operation.id_ligne}`,
  id_ligne_source: operation.id_ligne,
  date: normalizeIsoDate(operation.date || undefined),
  libelle: operation.libelle_original,
  montant: roundToTwo(operation.montant_debit > 0 ? operation.montant_debit : operation.montant_credit),
  sens: operation.sens_bancaire === 'credit' ? 'credit' : 'debit',
  raison_exclusion: normalizeText(operation.raison) || 'Operation exclue',
});

const buildAnalysisAlerts = (operations, rawAlerts = []) => {
  const alerts = [];

  for (const alert of Array.isArray(rawAlerts) ? rawAlerts : []) {
    const message = normalizeText(alert?.message);
    if (message) {
      alerts.push({ type: normalizeText(alert?.type) || 'analyse', message });
    }
  }

  const seen = new Set();
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

    if (operation.sens_bancaire === 'inconnu') {
      alerts.push({
        type: 'ligne_ambigue',
        message: `Sens bancaire ambigu pour la ligne "${operation.libelle_original}".`,
      });
    }

    if (!operation.date) {
      alerts.push({
        type: 'date_absente',
        message: `Date absente pour la ligne "${operation.libelle_original}".`,
      });
    }

    if (operation.montant_debit <= 0 && operation.montant_credit <= 0) {
      alerts.push({
        type: 'montant_absent',
        message: `Montant absent pour la ligne "${operation.libelle_original}".`,
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

const buildVatAnalysisSummary = (operations, factures) => {
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

const normalizeFactouratiSummary = (rawSummary, operations, factures) => {
  if (!rawSummary || typeof rawSummary !== 'object') {
    return buildVatAnalysisSummary(operations, factures);
  }

  const achats = factures.filter((facture) => facture.classification === 'achat_propose');
  const ventes = factures.filter((facture) => facture.classification === 'vente_propose');

  return {
    nombre_operations_total: Math.max(0, Number(rawSummary.nombre_operations_total ?? rawSummary.total_operations ?? rawSummary.nombre_operations_analysees ?? operations.length) || 0),
    nombre_achats_proposes: Math.max(0, Number(rawSummary.nombre_achats_proposes ?? rawSummary.nb_achats ?? achats.length) || 0),
    nombre_ventes_proposees: Math.max(0, Number(rawSummary.nombre_ventes_proposees ?? rawSummary.nb_ventes ?? ventes.length) || 0),
    nombre_operations_ignorees: Math.max(0, Number(rawSummary.nombre_operations_ignorees ?? rawSummary.nb_hors_tva ?? operations.filter((operation) => operation.classification === 'ignore').length) || 0),
    nombre_operations_a_verifier: Math.max(0, Number(rawSummary.nombre_operations_a_verifier ?? rawSummary.nb_a_verifier ?? operations.filter((operation) => operation.classification === 'a_verifier').length) || 0),
    total_achats_ttc: roundToTwo(Number(rawSummary.total_achats_ttc ?? rawSummary.total_achats ?? achats.reduce((sum, facture) => sum + Number(facture.montant_ttc || 0), 0)) || 0),
    total_ventes_ttc: roundToTwo(Number(rawSummary.total_ventes_ttc ?? rawSummary.total_ventes ?? ventes.reduce((sum, facture) => sum + Number(facture.montant_ttc || 0), 0)) || 0),
    total_tva_deductible: roundToTwo(Number(rawSummary.total_tva_deductible ?? rawSummary.tva_deductible ?? achats.reduce((sum, facture) => sum + Number(facture.montant_tva || 0), 0)) || 0),
    total_tva_collectee: roundToTwo(Number(rawSummary.total_tva_collectee ?? rawSummary.tva_collectee ?? ventes.reduce((sum, facture) => sum + Number(facture.montant_tva || 0), 0)) || 0),
  };
};

const normalizeFactouratiExtractedOperation = (operation, index, sens) => {
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

const buildAnalysisOperationFromFactouratiExtracted = (operation, index) => ({
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

const normalizeFactouratiIgnoredOperation = (operation, index, bucket) => {
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

const buildAnalysisOperationFromFactouratiIgnored = (operation) => ({
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

const normalizeFactouratiReviewOperation = (operation, index) => {
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

const isFactouratiTvaV1Payload = (payload) =>
  ['factourati_tva_v1', 'factourati_tva_simple_v2'].includes(String(payload?.schema_name || '').trim()) ||
  Array.isArray(payload?.achats) ||
  Array.isArray(payload?.ventes) ||
  Array.isArray(payload?.virements_personnels) ||
  Array.isArray(payload?.hors_tva) ||
  Array.isArray(payload?.a_verifier) ||
  Array.isArray(payload?.autres);

const buildNormalizedAnalysisResult = (payload) => {
  if (isFactouratiTvaV1Payload(payload)) {
    const achats = (Array.isArray(payload?.achats) ? payload.achats : [])
      .map((operation, index) => normalizeFactouratiExtractedOperation(operation, index, 'achat'))
      .filter(Boolean);
    const ventes = (Array.isArray(payload?.ventes) ? payload.ventes : [])
      .map((operation, index) => normalizeFactouratiExtractedOperation(operation, index, 'vente'))
      .filter(Boolean);
    const virementsPersonnels = (Array.isArray(payload?.virements_personnels) ? payload.virements_personnels : [])
      .map((operation, index) => normalizeFactouratiIgnoredOperation(operation, index, 'virements_personnels'))
      .filter(Boolean);
    const rawHorsTva = [
      ...(Array.isArray(payload?.hors_tva) ? payload.hors_tva : []),
      ...(Array.isArray(payload?.autres) ? payload.autres : []),
    ];
    const horsTva = rawHorsTva
      .map((operation, index) => normalizeFactouratiIgnoredOperation(operation, index, 'hors_tva'))
      .filter(Boolean);
    const aVerifier = (Array.isArray(payload?.a_verifier) ? payload.a_verifier : [])
      .map((operation, index) => normalizeFactouratiReviewOperation(operation, index))
      .filter(Boolean);
    const operations = [
      ...achats.map((operation, index) => buildAnalysisOperationFromFactouratiExtracted(operation, index)),
      ...ventes.map((operation, index) => buildAnalysisOperationFromFactouratiExtracted(operation, index + achats.length)),
      ...virementsPersonnels.map((operation) => buildAnalysisOperationFromFactouratiIgnored(operation)),
      ...horsTva.map((operation) => buildAnalysisOperationFromFactouratiIgnored(operation)),
      ...aVerifier,
    ];
    const factures = [...achats, ...ventes];
    const operationsIgnorees = [...virementsPersonnels, ...horsTva];
    const periodeDetail = payload?.periode && typeof payload.periode === 'object'
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
      periode: normalizePeriod(periodeDetail.mois) || normalizePeriod(payload?.periode) || null,
      periode_detail: periodeDetail,
      resume: normalizeFactouratiSummary(payload?.resume, operations, factures),
      factures,
      achats,
      ventes,
      virements_personnels: virementsPersonnels,
      hors_tva: horsTva,
      a_verifier: aVerifier,
      total_operations: Math.max(0, Number(payload?.total_operations || operations.length) || operations.length),
      toutes_operations: operations,
      operations_ignorees: operationsIgnorees,
      alertes: buildAnalysisAlerts(operations, payload?.alertes),
      cache_info: null,
    };
  }

  const rawOperations = Array.isArray(payload?.toutes_operations) && payload.toutes_operations.length
    ? payload.toutes_operations
    : buildLegacyOperationsFromPayload(payload);

  const operations = rawOperations
    .map((operation, index) => normalizeAnalysisOperation(operation, index))
    .filter(Boolean);

  const factures = operations
    .filter((operation) => operation.classification === 'achat_propose' || operation.classification === 'vente_propose')
    .map((operation) => buildFactureFromOperation(operation));

  const operationsIgnorees = operations
    .filter((operation) => operation.classification === 'ignore')
    .map((operation) => buildIgnoredOperationFromAnalysisOperation(operation));

  const periodeDetail = payload?.periode && typeof payload.periode === 'object'
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
    periode: normalizePeriod(periodeDetail.mois) || normalizePeriod(payload?.periode) || null,
    periode_detail: periodeDetail,
    resume: buildVatAnalysisSummary(operations, factures),
    factures,
    achats: factures.filter((operation) => operation.classification === 'achat_propose'),
    ventes: factures.filter((operation) => operation.classification === 'vente_propose'),
    virements_personnels: [],
    hors_tva: [],
    a_verifier: operations.filter((operation) => operation.classification === 'a_verifier'),
    total_operations: operations.length,
    toutes_operations: operations,
    operations_ignorees: operationsIgnorees,
    alertes: buildAnalysisAlerts(operations, payload?.alertes),
    cache_info: null,
  };
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
}) => {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

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
      const errorPayload = await response.text();
      throw new Error(errorPayload || 'OpenAI a retourne une erreur.');
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
    if (error?.name === 'AbortError') {
      throw new Error("Le delai d'analyse IA a ete depasse.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
};

const analyzePdfWithStructuredOutputs = async ({ apiKey, model, prompt, file }) => {
  const pdfBuffer = Buffer.from(await file.arrayBuffer());
  let lastError = null;

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
              { type: 'input_text', text: prompt },
              {
                type: 'input_file',
                filename: file.name || 'releve-bancaire.pdf',
                file_data: `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
              },
            ],
          },
        ],
        schemaName: 'vat_bank_statement_analysis',
        schema: TVA_BANK_ANALYSIS_JSON_SCHEMA,
        maxOutputTokens,
        timeoutMs: 120000,
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("L'analyse IA du releve bancaire a echoue.");
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

const recheckAmbiguousOperations = async ({ apiKey, operations, model = 'gpt-5.4' }) => {
  if (!operations.length) return [];

  const payload = await callOpenAIJsonSchema({
    apiKey,
    model,
    instructions: TVA_AMBIGUOUS_RECHECK_SYSTEM_PROMPT,
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
    schema: TVA_AMBIGUOUS_RECHECK_JSON_SCHEMA,
    maxOutputTokens: 3000,
    timeoutMs: 60000,
  });

  return Array.isArray(payload?.operations) ? payload.operations : [];
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
  const n8nWebhookUrl = String(settingsData.n8nWebhookUrl || DEFAULT_TVA_N8N_WEBHOOK_URL).trim();
  const n8nWebhookSecret = sanitizeSecretValue(settingsData.n8nWebhookSecret || '');
  const provider =
    settingsData.provider === 'n8n' ||
    (!settingsData.provider && !apiKey && n8nWebhookUrl)
      ? 'n8n'
      : 'openai';

  if (provider === 'openai' && !apiKey) {
    throw new Error("La cle OpenAI n'est pas configuree dans le dashboard admin.");
  }

  if (provider === 'n8n' && !n8nWebhookUrl) {
    throw new Error("L'URL du webhook n8n n'est pas configuree dans le dashboard admin.");
  }

  return {
    provider,
    apiKey,
    model: normalizeVatAiModel(String(settingsData.model || '').trim() || DEFAULT_OPENAI_MODEL),
    prompt: buildPromptWithCustomInstructions(
      TVA_BANK_ANALYSIS_BASE_PROMPT,
      String(settingsData.prompt || '').trim(),
    ),
    n8nWebhookUrl,
    n8nWebhookSecret,
  };
};

const extractFromPdfWithOpenAI = async (file) => {
  const settings = await getVatAiSettings();
  const parsed = await analyzePdfWithStructuredOutputs({
    apiKey: settings.apiKey,
    model: settings.model,
    prompt: settings.prompt,
    file,
  });

  let result = buildNormalizedAnalysisResult(parsed);
  const ambiguousOperations = (result.toutes_operations || []).filter(
    (operation) =>
      operation.classification === 'a_verifier' ||
      operation.niveau_confiance === 'faible',
  );

  if (ambiguousOperations.length) {
    try {
      const refinedOperations = await recheckAmbiguousOperations({
        apiKey: settings.apiKey,
        model: settings.model === 'gpt-5.4' ? 'gpt-5.4' : 'gpt-5.4',
        operations: ambiguousOperations.map((operation) => ({
          id_ligne: operation.id_ligne,
          date: operation.date,
          libelle_original: operation.libelle_original,
          montant_debit: operation.montant_debit,
          montant_credit: operation.montant_credit,
          sens_bancaire: operation.sens_bancaire,
          classification: operation.classification,
          niveau_confiance: operation.niveau_confiance,
          raison: operation.raison,
          fournisseur_client: operation.fournisseur_client,
          description: operation.description,
          numero_piece: operation.numero_piece,
          mode_paiement_detecte: operation.mode_paiement_detecte,
          taux_tva: operation.taux_tva,
        })),
      });

      if (refinedOperations.length) {
        const refinedById = new Map(refinedOperations.map((operation) => [operation.id_ligne, operation]));
        result = buildNormalizedAnalysisResult({
          ...parsed,
          toutes_operations: (result.toutes_operations || []).map((operation) => {
            const refinement = refinedById.get(operation.id_ligne);
            return refinement ? { ...operation, ...refinement } : operation;
          }),
          alertes: result.alertes || [],
        });
      }
    } catch (fallbackError) {
      console.warn('Recheck cible des operations ambiguës impossible:', fallbackError);
    }
  }

  return result;
};

const extractFromPdfWithN8n = async (file, options = {}) => {
  const settings = await getVatAiSettings();
  const formData = new FormData();
  const fileBuffer = await file.arrayBuffer();
  const blob = new Blob([fileBuffer], { type: file.type || 'application/pdf' });

  formData.append('file0', blob, file.name || 'document.pdf');
  formData.append('schema_name', 'factourati_tva_simple_v2');
  formData.append('provider', 'n8n_mistral_openai');
  formData.append('societe_titulaire', String(options.companyName || '').trim());
  formData.append('taux_tva_defaut', '20');
  formData.append('model', settings.model || DEFAULT_OPENAI_MODEL);
  formData.append('prompt', settings.prompt || TVA_BANK_ANALYSIS_BASE_PROMPT);

  const response = await fetch(settings.n8nWebhookUrl, {
    method: 'POST',
    headers: settings.n8nWebhookSecret
      ? {
          Accept: 'application/json',
          'x-factourati-n8n-secret': settings.n8nWebhookSecret,
        }
      : {
          Accept: 'application/json',
        },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Le webhook n8n a retourne une erreur.");
  }

  return buildNormalizedAnalysisResult(await parseN8nJsonResponse(response));
};

const extractFromPdfWithConfiguredProvider = async (file, options = {}) => {
  const settings = await getVatAiSettings();
  return settings.provider === 'n8n'
    ? extractFromPdfWithN8n(file, options)
    : extractFromPdfWithOpenAI(file);
};

const createSummaryPayload = async (entrepriseId, period) => {
  const [purchaseInvoices, applicationSalesInvoices, manualSalesInvoices, salesAdjustments, carryoverOverrides] = await Promise.all([
    getCollectionRows(TVA_COLLECTION, entrepriseId),
    getCollectionRows(SALES_COLLECTION, entrepriseId),
    getCollectionRows(SALES_MANUAL_COLLECTION, entrepriseId),
    getCollectionRows(SALES_ADJUSTMENTS_COLLECTION, entrepriseId),
    getCollectionRows(TVA_CARRYOVER_OVERRIDES_COLLECTION, entrepriseId),
  ]);

  const normalizedPeriod = period || getCurrentVatPeriod();
  const salesInvoices = resolveSalesVatInvoices(applicationSalesInvoices, manualSalesInvoices, salesAdjustments);
  const summary = buildVatSummary(purchaseInvoices, salesInvoices, normalizedPeriod, carryoverOverrides);

  return {
    period: normalizedPeriod,
    summary,
    purchaseInvoices: purchaseInvoices.filter((invoice) => isDateInPeriod(invoice.date, normalizedPeriod)),
    salesInvoices: salesInvoices.filter((invoice) => isDateInPeriod(invoice.date, normalizedPeriod)),
  };
};

const getVatPdfInitials = (value) =>
  String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'FT';

const fetchImageAsDataUrl = async (url) => {
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
};

const decorateVatPdfPages = (document, companyName) => {
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

const buildPdfBuffer = async ({ period, summary, purchaseInvoices, salesInvoices, companyName, companyLogoUrl }) => {
  const document = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const resolvedCompanyName = String(companyName || '').trim() || 'Factourati';
  const logoDataUrl = await fetchImageAsDataUrl(companyLogoUrl);
  const pageWidth = document.internal.pageSize.getWidth();
  const paymentLabels = {
    virement: 'Virement',
    cheque: 'Cheque',
    effet: 'Effet',
    paiement_en_ligne: 'Paiement en ligne',
    carte: 'Carte',
    especes: 'Especes',
    autre: 'Autre',
  };
  let cursorY = 18;

  document.setDrawColor(226, 232, 240);
  document.setFillColor(248, 250, 252);
  document.roundedRect(12, 10, pageWidth - 24, 26, 5, 5, 'FD');

  if (logoDataUrl) {
    document.addImage(logoDataUrl, 'PNG', 16, 13, 18, 18, undefined, 'FAST');
  } else {
    document.setFillColor(15, 118, 110);
    document.roundedRect(16, 13, 18, 18, 4, 4, 'F');
    document.setFont('helvetica', 'bold');
    document.setFontSize(10);
    document.setTextColor(255, 255, 255);
    document.text(getVatPdfInitials(resolvedCompanyName), 25, 24.2, { align: 'center' });
  }

  document.setFont('helvetica', 'bold');
  document.setFontSize(18);
  document.setTextColor(15, 23, 42);
  document.text('Recapitulatif TVA', 39, cursorY);
  document.setFont('helvetica', 'normal');
  document.setFontSize(10.5);
  document.setTextColor(71, 85, 105);
  document.text(resolvedCompanyName, 39, cursorY + 6.2);
  document.text(`Periode: ${getPeriodLabel(period)}`, pageWidth - 14, cursorY, { align: 'right' });
  document.text(`Genere le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 14, cursorY + 6.2, { align: 'right' });

  cursorY = 48;

  const summaryCards = [
    { title: 'TVA achats', value: formatMad(summary.deductibleVat), tone: [13, 148, 136] },
    { title: 'TVA ventes', value: formatMad(summary.collectedVat), tone: [37, 99, 235] },
    {
      title: summary.balance > 0 ? 'TVA a payer' : summary.balance < 0 ? 'Credit TVA' : 'Solde TVA',
      value: formatMad(Math.abs(summary.balance)),
      tone: summary.balance > 0 ? [5, 150, 105] : summary.balance < 0 ? [220, 38, 38] : [71, 85, 105],
    },
    { title: 'Factures', value: String(summary.totalInvoices), tone: [15, 23, 42] },
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

  const purchasesStartY = document.lastAutoTable.finalY + 8;
  document.setFont('helvetica', 'bold');
  document.setFontSize(13);
  document.setTextColor(234, 88, 12);
  document.text('Tableau des achats', 12, purchasesStartY - 3);

    autoTable(document, {
      startY: purchasesStartY,
    head: [['Date', 'Facture', 'Tiers', 'Description', 'Paiement', 'Piece', 'Taux TVA', 'HT', 'TVA', 'TTC', 'ICE']],
    body: purchaseInvoices.length
      ? purchaseInvoices
          .slice()
          .sort((left, right) => right.date.localeCompare(left.date))
          .map((invoice) => [
            new Date(invoice.date).toLocaleDateString('fr-FR'),
            invoice.numero_facture || '-',
            invoice.fournisseur,
            invoice.description || '-',
            paymentLabels[invoice.mode_paiement] || invoice.mode_paiement || '-',
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

  const salesStartY = document.lastAutoTable.finalY + 10;
  document.setFont('helvetica', 'bold');
  document.setFontSize(13);
  document.setTextColor(37, 99, 235);
  document.text('Tableau des ventes', 12, salesStartY - 3);

  autoTable(document, {
    startY: salesStartY,
    head: [['Date', 'Facture', 'Tiers', 'Description', 'Paiement', 'Piece', 'Taux TVA', 'HT', 'TVA', 'TTC', 'ICE']],
    body: salesInvoices.length
      ? salesInvoices
          .slice()
          .sort((left, right) => right.date.localeCompare(left.date))
          .map((invoice) => [
            new Date(invoice.date).toLocaleDateString('fr-FR'),
            invoice.number || '-',
            invoice.clientName || invoice.client?.name || 'Client',
            invoice.description || invoice.items?.[0]?.description || 'Facture de vente',
            invoice.mode_paiement ? paymentLabels[invoice.mode_paiement] || invoice.mode_paiement : '-',
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

  decorateVatPdfPages(document, resolvedCompanyName);

  return Buffer.from(document.output('arraybuffer'));
};

const handleExtractPdf = async (request) => {
  try {
    const entrepriseId = getEntrepriseId(request);
    const userId = getUserId(request);
    const creditsOwnerId = getCreditsOwnerId(request);
    const companyName = String(request.headers.get('x-factourati-company-name') || '').trim();
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

    const result = await extractFromPdfWithConfiguredProvider({
      name: file.name || 'releve-bancaire.pdf',
      type: file.type || 'application/pdf',
      arrayBuffer: async () => fileBuffer,
    }, {
      companyName,
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
  const companyName = String(request.headers.get('x-factourati-company-name') || '').trim();
  const companyLogoUrl = String(request.headers.get('x-factourati-company-logo') || '').trim();
  const pdfBuffer = await buildPdfBuffer({ ...payload, companyName, companyLogoUrl });

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
  const pack = TVA_ANALYSIS_PACKS.find((item) => item.type === packType);

  if (!pack) {
    return jsonResponse({ message: "Le pack d'analyses IA est invalide." }, 400);
  }

  const summary = await addVatAnalysisCredits({
    ownerId: entrepriseId,
    entrepriseId,
    transactionType: packType,
    creditsToAdd: pack.credits,
    amountPaid: pack.price,
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
  const action = String(body?.action || 'add').trim().toLowerCase();
  const note = String(body?.note || '').trim();

  const summary =
    action === 'remove'
      ? await removeVatAnalysisCredits({
          ownerId: companyId,
          entrepriseId: companyId,
          creditsToRemove: credits,
          adminId: getUserId(request),
          note,
        })
      : await addVatAnalysisCredits({
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
    message:
      action === 'remove'
        ? `${credits} analyses ont ete retirees du compte.`
        : `${credits} analyses ont ete ajoutees gratuitement.`,
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

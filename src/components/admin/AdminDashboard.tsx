import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { addDoc, collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Building2, 
  Users, 
  Crown, 
  Calendar, 
  Edit, 
  LogOut,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  LogIn,
  Trash2,
  FileText,
  Search,
  Sparkles
} from 'lucide-react';
import EditCompanyModal from './EditCompanyModal';
import AdminVatCreditsRechargeModal from './AdminVatCreditsRechargeModal';
import ReferralSourceChart from './ReferralSourceChart';
import BlogManager from './BlogManager';
import HomepageScreenshotsManager from './HomepageScreenshotsManager';
import {
  fetchFreeInvoiceGeneratorLeads,
  fetchFreeInvoiceGeneratorStats,
  type FreeInvoiceGeneratorLead,
  type FreeInvoiceGeneratorStats,
} from '../../services/publicUsageService';
import {
  buildDefaultVatAnalysisCredits,
  buildVatAnalysisCreditsSummary,
  TVA_AI_SETTINGS_COLLECTION,
  TVA_AI_SETTINGS_DOC,
  TVA_ANALYSIS_CREDITS_COLLECTION,
  TVA_ANALYSIS_TRANSACTIONS_COLLECTION,
} from '../../utils/vat';

interface Company {
  id: string;
  name: string;
  subscription: 'free' | 'pro';
  expiryDate?: string;
  subscriptionDate?: string;
  lastClientAccessAt?: string;
  lastClientAccessByEmail?: string;
  ownerEmail: string;
  ice: string;
  createdAt: string;
  referralSource?: string;
  accountantName?: string;
  otherSource?: string;
}

interface SupportAccessLog {
  id: string;
  adminEmail: string;
  adminName?: string;
  companyId: string;
  companyName: string;
  companyOwnerEmail?: string;
  openedAt: string;
}

interface VatAiSettingsForm {
  provider?: 'openai' | 'n8n';
  apiKey: string;
  model: string;
  prompt: string;
  n8nWebhookUrl?: string;
  n8nWebhookSecret?: string;
  updatedAt?: string;
}

interface CompanyVatCreditsSummary {
  totalDisponible: number;
  creditsGratuitsRestants: number;
  creditsPayesRestants: number;
}

const ADMIN_TVA_CREDITS_API_BASES = ['/api/admin/users', '/.netlify/functions/tva/admin/users'];

const DEFAULT_TVA_AI_MODEL = 'gpt-5.4';
const DEFAULT_TVA_N8N_WEBHOOK_URL = 'https://factourati2.app.n8n.cloud/webhook-test/factourati-tva-analyse';
const TVA_AI_MODEL_OPTIONS = [
  { value: 'gpt-5.4', label: 'gpt-5.4' },
  { value: 'gpt-5.4-mini', label: 'gpt-5.4-mini' },
  { value: 'gpt-4o', label: 'gpt-4o' },
  { value: 'gpt-4.1', label: 'gpt-4.1' },
];
const normalizeVatAiModel = (value: string) => {
  const normalized = value.trim();
  return normalized || DEFAULT_TVA_AI_MODEL;
};
const DEFAULT_TVA_AI_PROMPT = `Tu es un assistant comptable marocain expert en TVA.
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

const sanitizeSecretValue = (value: string) => value.trim().replace(/^['"]+|['"]+$/g, '');

type AdminSectionId =
  | 'overview'
  | 'companies'
  | 'credits'
  | 'ai-settings'
  | 'leads'
  | 'blog'
  | 'captures'
  | 'support';

const ADMIN_SECTION_PREFIX = '/admin/dashboard/';

const ADMIN_SECTIONS: Array<{
  id: AdminSectionId;
  label: string;
  description: string;
  icon: typeof Building2;
}> = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    description: 'KPI, acquisition et raccourcis admin',
    icon: Building2,
  },
  {
    id: 'companies',
    label: 'Entreprises',
    description: 'Abonnements, statuts et accès support',
    icon: Users,
  },
  {
    id: 'credits',
    label: 'Credits TVA',
    description: 'Recharges IA et suivi des analyses',
    icon: Sparkles,
  },
  {
    id: 'ai-settings',
    label: 'IA TVA',
    description: 'Configuration OpenAI et n8n',
    icon: Shield,
  },
  {
    id: 'leads',
    label: 'Prospects',
    description: 'Leads issus du generateur gratuit',
    icon: FileText,
  },
  {
    id: 'blog',
    label: 'Blog',
    description: 'Articles SEO, contenu et optimisation',
    icon: FileText,
  },
  {
    id: 'captures',
    label: 'Captures',
    description: 'Visuels homepage et galerie produit',
    icon: Search,
  },
  {
    id: 'support',
    label: 'Support',
    description: 'Historique des accès administrateur',
    icon: LogIn,
  },
];

const getAdminSectionFromPath = (pathname: string): AdminSectionId => {
  const normalizedPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const slug = normalizedPath.startsWith(ADMIN_SECTION_PREFIX)
    ? normalizedPath.slice(ADMIN_SECTION_PREFIX.length)
    : '';
  if (slug === 'content') {
    return 'blog';
  }
  const matchedSection = ADMIN_SECTIONS.find((section) => section.id === slug);
  return matchedSection?.id || 'overview';
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, startSupportAccess, logout } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyVatCredits, setCompanyVatCredits] = useState<Record<string, CompanyVatCreditsSummary>>({});
  const [supportLogs, setSupportLogs] = useState<SupportAccessLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [rechargingCompany, setRechargingCompany] = useState<Company | null>(null);
  const [supportLoadingId, setSupportLoadingId] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [generatorLeads, setGeneratorLeads] = useState<FreeInvoiceGeneratorLead[]>([]);
  const [generatorStats, setGeneratorStats] = useState<FreeInvoiceGeneratorStats>({
    views: 0,
    uniqueVisitors: 0,
    prints: 0,
    leads: 0,
    proTemplatePrintAttempts: 0,
    lastViewedAt: '',
    lastPrintedAt: '',
    updatedAt: '',
  });
  const [vatAiSettings, setVatAiSettings] = useState<VatAiSettingsForm>({
    provider: 'n8n',
    apiKey: '',
    model: DEFAULT_TVA_AI_MODEL,
    prompt: STRICT_BANK_STATEMENT_TVA_AI_PROMPT,
    n8nWebhookUrl: DEFAULT_TVA_N8N_WEBHOOK_URL,
    n8nWebhookSecret: '',
  });
  const [isSavingVatAiSettings, setIsSavingVatAiSettings] = useState(false);
  const [vatAiSettingsMessage, setVatAiSettingsMessage] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [leadSearch, setLeadSearch] = useState('');

  const activeSectionId = getAdminSectionFromPath(location.pathname);
  const activeSection = ADMIN_SECTIONS.find((section) => section.id === activeSectionId) || ADMIN_SECTIONS[0];

  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '/admin/dashboard') {
      navigate(`${ADMIN_SECTION_PREFIX}overview`, { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    loadDashboardData();
  }, [navigate]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [
        companiesSnapshot,
        supportLogsSnapshot,
        freeInvoiceGeneratorStats,
        freeInvoiceGeneratorLeads,
        vatAiSettingsSnapshot,
        vatCreditsSnapshot,
      ] = await Promise.all([
        getDocs(collection(db, 'entreprises')),
        getDocs(collection(db, 'supportAccessLogs')),
        fetchFreeInvoiceGeneratorStats().catch((error) => {
          console.warn('Statistiques generateur gratuit indisponibles:', error);
          return null;
        }),
        fetchFreeInvoiceGeneratorLeads(12).catch((error) => {
          console.warn('Prospects generateur gratuit indisponibles:', error);
          return [];
        }),
        getDoc(doc(db, TVA_AI_SETTINGS_COLLECTION, TVA_AI_SETTINGS_DOC)).catch((error) => {
          console.warn('Configuration TVA IA indisponible:', error);
          return null;
        }),
        getDocs(collection(db, TVA_ANALYSIS_CREDITS_COLLECTION)).catch((error) => {
          console.warn('Credits analyses TVA indisponibles:', error);
          return null;
        }),
      ]);
      const companiesData = companiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Company));
      const supportLogsData = supportLogsSnapshot.docs
        .map(logDoc => ({
          id: logDoc.id,
          ...logDoc.data()
        } as SupportAccessLog))
        .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime())
        .slice(0, 12);
      
      setCompanies(companiesData.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
      setSupportLogs(supportLogsData);
      const vatCreditsMap = Object.fromEntries(
        (vatCreditsSnapshot?.docs || []).map((creditsDoc) => {
          const summary = buildVatAnalysisCreditsSummary(creditsDoc.data() as Record<string, unknown>);
          return [
            creditsDoc.id,
            {
              totalDisponible: summary.total_disponible,
              creditsGratuitsRestants: summary.credits_gratuits_restants,
              creditsPayesRestants: summary.credits_payes_restants,
            } satisfies CompanyVatCreditsSummary,
          ];
        }),
      );
      await Promise.all(
        companiesData
          .filter((company) => !vatCreditsMap[company.id])
          .map(async (company) => {
            const defaults = buildDefaultVatAnalysisCredits(company.id, company.id);
            await setDoc(doc(db, TVA_ANALYSIS_CREDITS_COLLECTION, company.id), defaults, { merge: true });
            vatCreditsMap[company.id] = {
              totalDisponible: 3,
              creditsGratuitsRestants: 3,
              creditsPayesRestants: 0,
            };
          }),
      );
      setCompanyVatCredits(vatCreditsMap);
      if (freeInvoiceGeneratorStats) {
        setGeneratorStats(freeInvoiceGeneratorStats);
      }
      setGeneratorLeads(freeInvoiceGeneratorLeads);
      if (vatAiSettingsSnapshot?.exists()) {
        const settingsData = vatAiSettingsSnapshot.data() as Partial<VatAiSettingsForm>;
        setVatAiSettings({
          provider:
            settingsData.provider === 'n8n' ||
            (!settingsData.provider && (settingsData.n8nWebhookUrl || DEFAULT_TVA_N8N_WEBHOOK_URL))
              ? 'n8n'
              : 'openai',
          apiKey: settingsData.apiKey || '',
          model: normalizeVatAiModel(settingsData.model || ''),
          prompt: settingsData.prompt || STRICT_BANK_STATEMENT_TVA_AI_PROMPT,
          n8nWebhookUrl: settingsData.n8nWebhookUrl || DEFAULT_TVA_N8N_WEBHOOK_URL,
          n8nWebhookSecret: settingsData.n8nWebhookSecret || '',
          updatedAt: settingsData.updatedAt,
        });
      } else {
        setVatAiSettings({
          provider: 'n8n',
          apiKey: '',
          model: DEFAULT_TVA_AI_MODEL,
          prompt: STRICT_BANK_STATEMENT_TVA_AI_PROMPT,
          n8nWebhookUrl: DEFAULT_TVA_N8N_WEBHOOK_URL,
          n8nWebhookSecret: '',
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des entreprises:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRechargeVatCredits = async ({
    companyId,
    credits,
    note,
    type,
    action,
  }: {
    companyId: string;
    credits: number;
    note: string;
    type: 'pack_5' | 'pack_10' | 'pack_20' | 'custom_admin';
    action: 'add' | 'remove';
  }) => {
    const requestPayload = JSON.stringify({ credits, note, type, action });
    let lastErrorMessage = action === 'remove'
      ? 'Impossible de retirer les credits IA.'
      : 'Impossible de recharger les analyses IA.';

    for (const apiBase of ADMIN_TVA_CREDITS_API_BASES) {
      try {
        const response = await fetch(`${apiBase}/${companyId}/tva-credits`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-factourati-is-admin': String(Boolean(user?.isAdmin)),
            'x-factourati-user-id': user?.id || 'facture-admin',
            'x-factourati-user-email': user?.email || '',
            'x-factourati-entreprise-id': companyId,
          },
          body: requestPayload,
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          lastErrorMessage = payload?.message || `Erreur API (${response.status})`;
          continue;
        }

        const summary = payload?.summary || payload || {};
        setCompanyVatCredits((prev) => ({
          ...prev,
          [companyId]: {
            totalDisponible: Number(summary.total_disponible || 0),
            creditsGratuitsRestants: Number(summary.credits_gratuits_restants || 0),
            creditsPayesRestants: Number(summary.credits_payes_restants || 0),
          },
        }));
        return;
      } catch (error) {
        lastErrorMessage = error instanceof Error ? error.message : 'Impossible de joindre le service TVA.';
      }
    }

    try {
      const creditsRef = doc(db, TVA_ANALYSIS_CREDITS_COLLECTION, companyId);
      const creditsSnapshot = await getDoc(creditsRef);
      const currentCredits = creditsSnapshot.exists()
        ? creditsSnapshot.data()
        : buildDefaultVatAnalysisCredits(companyId, companyId);
      const currentPaidCredits = Math.max(0, Number(currentCredits.credits_payes_restants || 0));
      if (action === 'remove' && Number(credits) > currentPaidCredits) {
        throw new Error(`Vous ne pouvez retirer que ${currentPaidCredits} credits payes restants.`);
      }
      const nextPaidCredits =
        action === 'remove'
          ? Math.max(0, currentPaidCredits - Number(credits))
          : currentPaidCredits + Number(credits);
      const now = new Date().toISOString();

      await setDoc(
        creditsRef,
        {
          user_id: companyId,
          entrepriseId: companyId,
          credits_gratuits_utilises: Math.max(0, Number(currentCredits.credits_gratuits_utilises || 0)),
          credits_payes_restants: nextPaidCredits,
          total_analyses_effectuees: Math.max(0, Number(currentCredits.total_analyses_effectuees || 0)),
          created_at: currentCredits.created_at || now,
          updated_at: now,
        },
        { merge: true },
      );

      await addDoc(collection(db, TVA_ANALYSIS_TRANSACTIONS_COLLECTION), {
        user_id: companyId,
        entrepriseId: companyId,
        type: action === 'remove' ? 'retrait_admin' : type,
        credits_ajoutes: action === 'remove' ? -Number(credits) : Number(credits),
        montant_paye: 0,
        recharge_par_admin: true,
        admin_id: user?.id || 'facture-admin',
        note: note.trim() || (action === 'remove' ? 'Retrait admin de credits IA' : null),
        created_at: now,
      });

      const summary = buildVatAnalysisCreditsSummary({
        credits_gratuits_utilises: Math.max(0, Number(currentCredits.credits_gratuits_utilises || 0)),
        credits_payes_restants: nextPaidCredits,
        total_analyses_effectuees: Math.max(0, Number(currentCredits.total_analyses_effectuees || 0)),
      });

      setCompanyVatCredits((prev) => ({
        ...prev,
        [companyId]: {
          totalDisponible: summary.total_disponible,
          creditsGratuitsRestants: summary.credits_gratuits_restants,
          creditsPayesRestants: summary.credits_payes_restants,
        },
      }));
    } catch (error) {
      throw new Error(
        error instanceof Error && error.message
          ? error.message
          : lastErrorMessage || 'Impossible de recharger les analyses IA.',
      );
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSupportAccess = async (company: Company) => {
    setSupportLoadingId(company.id);
    try {
      const ok = await startSupportAccess(company.id);
      if (ok) {
        navigate('/dashboard');
        return;
      }

      alert("Impossible d'ouvrir cet espace client.");
    } finally {
      setSupportLoadingId(null);
    }
  };

  const deleteDocsByField = async (collectionName: string, fieldName: string, value: string) => {
    const snapshot = await getDocs(query(collection(db, collectionName), where(fieldName, '==', value)));
    await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref)));
  };

  const deleteCompanyData = async (companyId: string) => {
    const entrepriseCollections = [
      'managedUsers',
      'clients',
      'products',
      'invoices',
      'quotes',
      'stockMovements',
      'stockAlerts',
      'employees',
      'overtimes',
      'leaves',
      'projects',
      'tasks',
      'projectComments',
      'projectFiles',
      'orders',
      'suppliers',
      'supplierProducts',
      'purchaseOrders',
      'supplierPayments',
      'factures_achat_tva',
      'factures_vente_tva_manuelles',
      'factures_vente_tva_ajustements'
    ];

    for (const collectionName of entrepriseCollections) {
      await deleteDocsByField(collectionName, 'entrepriseId', companyId);
    }

    await deleteDocsByField('supportAccessLogs', 'companyId', companyId);
    await deleteDoc(doc(db, 'entreprises', companyId));
  };

  const handleDeleteCompany = async (company: Company) => {
    const securityCode = window.prompt(
      `Pour supprimer definitivement ${company.name}, saisissez le code de securite.`
    );

    if (securityCode === null) {
      return;
    }

    if (securityCode.trim() !== '121118') {
      alert('Code de securite incorrect.');
      return;
    }

    const confirmed = window.confirm(
      `Cette action supprimera definitivement ${company.name} et toutes ses donnees dans Firestore. Voulez-vous continuer ?`
    );

    if (!confirmed) {
      return;
    }

    setDeleteLoadingId(company.id);
    try {
      await deleteCompanyData(company.id);
      await loadDashboardData();
      alert('Client supprime definitivement de la base de donnees.');
    } catch (error) {
      console.error('Erreur lors de la suppression du client:', error);
      alert("Impossible de supprimer ce client pour le moment.");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleVatAiSettingsChange = (field: keyof VatAiSettingsForm, value: string) => {
    setVatAiSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
    setVatAiSettingsMessage('');
  };

  const handleSaveVatAiSettings = async () => {
    const provider = vatAiSettings.provider === 'n8n' ? 'n8n' : 'openai';
    const trimmedApiKey = sanitizeSecretValue(vatAiSettings.apiKey);
    const trimmedModel = normalizeVatAiModel(vatAiSettings.model);
    const trimmedPrompt = vatAiSettings.prompt.trim() || STRICT_BANK_STATEMENT_TVA_AI_PROMPT;
    const trimmedWebhookUrl = String(vatAiSettings.n8nWebhookUrl || '').trim();
    const trimmedWebhookSecret = sanitizeSecretValue(vatAiSettings.n8nWebhookSecret || '');

    if (provider === 'openai' && !trimmedApiKey) {
      setVatAiSettingsMessage('La cle OpenAI est obligatoire pour analyser les PDF.');
      return;
    }

    if (provider === 'n8n' && !trimmedWebhookUrl) {
      setVatAiSettingsMessage('L URL du webhook n8n est obligatoire.');
      return;
    }

    try {
      setIsSavingVatAiSettings(true);
      setVatAiSettingsMessage('');

      const payload = {
        provider,
        apiKey: trimmedApiKey,
        model: trimmedModel,
        prompt: trimmedPrompt,
        n8nWebhookUrl: trimmedWebhookUrl,
        n8nWebhookSecret: trimmedWebhookSecret,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, TVA_AI_SETTINGS_COLLECTION, TVA_AI_SETTINGS_DOC), payload);
      setVatAiSettings(payload);
      setVatAiSettingsMessage('Configuration TVA IA enregistree avec succes.');
    } catch (error) {
      console.error('Erreur sauvegarde configuration TVA IA:', error);
      setVatAiSettingsMessage("Impossible d'enregistrer la configuration TVA IA.");
    } finally {
      setIsSavingVatAiSettings(false);
    }
  };

  const getStatusBadge = (company: Company) => {
    if (company.subscription === 'free') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <span className="mr-1">🆓</span>
          Gratuit
        </span>
      );
    }

    if (company.subscription === 'pro') {
      const isExpired = company.expiryDate && new Date(company.expiryDate) < new Date();
      
      if (isExpired) {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Expiré
          </span>
        );
      }

      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Crown className="w-3 h-3 mr-1" />
          Pro Actif
        </span>
      );
    }

    return null;
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
  };

  const handleSaveCompany = async (companyId: string, updates: { subscription: 'free' | 'pro'; expiryDate?: string }) => {
    try {
      const updateData: any = {
        subscription: updates.subscription,
        updatedAt: new Date().toISOString()
      };

      if (updates.subscription === 'pro' && updates.expiryDate) {
        updateData.expiryDate = updates.expiryDate;
        if (!companies.find(c => c.id === companyId)?.subscriptionDate) {
          updateData.subscriptionDate = new Date().toISOString();
        }
      } else if (updates.subscription === 'free') {
        updateData.expiryDate = new Date().toISOString();
      }

      await updateDoc(doc(db, 'entreprises', companyId), updateData);
      
      // Recharger les données
      await loadDashboardData();
      setEditingCompany(null);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const stats = {
    total: companies.length,
    free: companies.filter(c => c.subscription === 'free').length,
    pro: companies.filter(c => c.subscription === 'pro').length,
    expired: companies.filter(c =>
      c.subscription === 'pro' &&
      c.expiryDate &&
      new Date(c.expiryDate) < new Date()
    ).length
  };

  const openAdminSection = (sectionId: AdminSectionId) => {
    navigate(`${ADMIN_SECTION_PREFIX}${sectionId}`);
  };

  const normalizedCompanySearch = companySearch.trim().toLowerCase();
  const filteredCompanies = normalizedCompanySearch
    ? companies.filter((company) =>
        [
          company.name,
          company.ownerEmail,
          company.ice,
          company.referralSource,
          company.accountantName,
          company.otherSource,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedCompanySearch)),
      )
    : companies;

  const normalizedLeadSearch = leadSearch.trim().toLowerCase();
  const filteredGeneratorLeads = normalizedLeadSearch
    ? generatorLeads.filter((lead) =>
        [
          lead.companyName,
          lead.phone,
          lead.email,
          lead.message,
          lead.invoiceNumber,
          lead.templateName,
          lead.templateId,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedLeadSearch)),
      )
    : generatorLeads;

  const referralSourceData = () => {
    const sourceCounts: { [key: string]: number } = {};

    companies.forEach(company => {
      const source = company.referralSource || 'Non spécifié';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    return Object.entries(sourceCounts).map(([source, count]) => ({
      source,
      count
    }));
  };

  const getLeadSourceLabel = (sourceAction: FreeInvoiceGeneratorLead['sourceAction']) => {
    switch (sourceAction) {
      case 'after_print':
        return 'Apres impression';
      case 'pro_template':
        return 'Template Pro';
      case 'save_invoice':
      default:
        return 'Sauvegarde facture';
    }
  };

  const formatLeadDate = (dateIso: string) => {
    if (!dateIso) {
      return '-';
    }

    const date = new Date(dateIso);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return `${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl flex items-center justify-center">
                <img 
                  src="https://i.ibb.co/Y4YSN46f/20250913-2301-Logo-Am-lior-remix-01k52hfbh2fyg8m99kngk626qm-1.png" 
                  alt="Factourati Logo" 
                  className="w-6 h-6 object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Administration Factourati</h1>
                <p className="text-xs text-gray-500">Gestion des entreprises</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

                 

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Admin</p>
              <h2 className="mt-2 text-xl font-bold text-gray-900">Dashboard organise</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Chaque espace a maintenant sa propre sous-page pour travailler plus proprement.
              </p>
            </div>

            <nav className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="space-y-2">
                {ADMIN_SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const isActive = section.id === activeSectionId;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => openAdminSection(section.id)}
                      className={`flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition ${
                        isActive
                          ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-100'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`mt-0.5 rounded-xl p-2 ${isActive ? 'bg-white/15' : 'bg-gray-100 text-red-600'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-900'}`}>{section.label}</p>
                        <p className={`mt-1 text-xs leading-5 ${isActive ? 'text-red-50' : 'text-gray-500'}`}>{section.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </nav>
          </aside>

          <div className="min-w-0 space-y-8">
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Sous-page admin</p>
                  <h2 className="mt-2 text-2xl font-bold text-gray-900">{activeSection.label}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">{activeSection.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Entreprises</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Pro</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">{stats.pro}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Prospects</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">{generatorStats.leads.toLocaleString('fr-FR')}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Support</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">{supportLogs.length}</p>
                  </div>
                </div>
              </div>
            </section>

            {activeSectionId === 'overview' && (
              <>
        {/* Statistiques */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-600">Total Entreprises</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.free}</p>
                <p className="text-sm text-gray-600">Version Gratuite</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.pro}</p>
                <p className="text-sm text-gray-600">Version Pro</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.expired}</p>
                <p className="text-sm text-gray-600">Abonnements Expirés</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{generatorStats.uniqueVisitors.toLocaleString('fr-FR')}</p>
                <p className="text-sm text-gray-600">Generateur gratuit</p>
                <p className="mt-1 text-xs text-gray-500">
                  {generatorStats.leads.toLocaleString('fr-FR')} prospects / {generatorStats.prints.toLocaleString('fr-FR')} impressions
                </p>
              </div>
            </div>
          </div>
        </div>

              </>
            )}

            {activeSectionId === 'ai-settings' && (
        <div className="mb-8 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
          <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-5 text-white">
            <h3 className="text-lg font-semibold">Configuration IA pour analyse PDF TVA</h3>
            <p className="mt-1 text-sm text-emerald-50">
              Cette configuration est stockee dans Firestore et utilisee par le module TVA Intelligente pour l'analyse des PDF via OpenAI ou n8n.
            </p>
          </div>

          <div className="grid gap-5 px-6 py-6 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Moteur d analyse</label>
                <select
                  value={vatAiSettings.provider || 'openai'}
                  onChange={(event) => handleVatAiSettingsChange('provider', event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500"
                >
                  <option value="openai">OpenAI direct</option>
                  <option value="n8n">n8n webhook</option>
                </select>
              </div>

              {vatAiSettings.provider === 'n8n' ? (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">URL webhook n8n</label>
                    <input
                      type="url"
                      value={vatAiSettings.n8nWebhookUrl || ''}
                      onChange={(event) => handleVatAiSettingsChange('n8nWebhookUrl', event.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500"
                      placeholder="https://n8n.votre-domaine.com/webhook/factourati-tva"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Secret webhook n8n</label>
                    <input
                      type="password"
                      value={vatAiSettings.n8nWebhookSecret || ''}
                      onChange={(event) => handleVatAiSettingsChange('n8nWebhookSecret', event.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500"
                      placeholder="secret optionnel"
                    />
                  </div>
                </>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Cle OpenAI</label>
                <input
                  type="password"
                  value={vatAiSettings.apiKey}
                  onChange={(event) => handleVatAiSettingsChange('apiKey', event.target.value)}
                  disabled={vatAiSettings.provider === 'n8n'}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500"
                  placeholder="sk-..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Modele</label>
                <select
                  value={vatAiSettings.model}
                  onChange={(event) => handleVatAiSettingsChange('model', event.target.value)}
                  disabled={vatAiSettings.provider === 'n8n'}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500"
                >
                  {TVA_AI_MODEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  Modele par defaut recommande : {DEFAULT_TVA_AI_MODEL}
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-800">
                {vatAiSettings.provider === 'n8n'
                  ? "Le webhook n8n recevra le PDF, le prompt et les metadonnees, puis devra renvoyer un JSON compatible avec l analyse TVA."
                  : 'Utilisez ici un modele compatible analyse de documents PDF. La cle et le prompt seront relus par le backend TVA au moment de l extraction.'}
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Prompt analyse PDF</label>
                <textarea
                  rows={11}
                  value={vatAiSettings.prompt}
                  onChange={(event) => handleVatAiSettingsChange('prompt', event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500"
                />
              </div>

              {vatAiSettings.updatedAt ? (
                <p className="text-xs text-gray-500">
                  Derniere mise a jour : {new Date(vatAiSettings.updatedAt).toLocaleDateString('fr-FR')} a{' '}
                  {new Date(vatAiSettings.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              ) : null}

              {vatAiSettingsMessage ? (
                <div className={`rounded-xl px-4 py-3 text-sm ${
                  vatAiSettingsMessage.includes('succes')
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border border-red-200 bg-red-50 text-red-700'
                }`}>
                  {vatAiSettingsMessage}
                </div>
              ) : null}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveVatAiSettings}
                  disabled={isSavingVatAiSettings}
                  className="inline-flex items-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {isSavingVatAiSettings ? 'Enregistrement...' : 'Sauvegarder la configuration IA'}
                </button>
              </div>
            </div>
          </div>
        </div>

            )}

            {activeSectionId === 'overview' && (
              <>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ADMIN_SECTIONS.filter((section) => section.id !== 'overview').map((section) => {
            const Icon = section.icon;

            return (
              <button
                key={`shortcut-${section.id}`}
                type="button"
                onClick={() => openAdminSection(section.id)}
                className="rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-red-50 p-3 text-red-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{section.label}</p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">{section.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Diagramme des sources d'acquisition */}
        <div>
          <ReferralSourceChart data={referralSourceData()} />
        </div>
              </>
            )}

            {activeSectionId === 'leads' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Prospects du generateur gratuit</h3>
              <p className="text-sm text-gray-500 mt-1">
                Les personnes qui ont laisse leurs coordonnees depuis la page generateur.
              </p>
            </div>
            <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-teal-600" />
            </div>
          </div>

          <div className="border-b border-gray-100 px-6 py-4">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={leadSearch}
                onChange={(event) => setLeadSearch(event.target.value)}
                placeholder="Rechercher un prospect, telephone, email, template..."
                className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-teal-500"
              />
            </div>
          </div>

          {filteredGeneratorLeads.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-gray-500">
                {generatorLeads.length === 0
                  ? 'Aucun prospect generateur pour le moment'
                  : 'Aucun prospect ne correspond a cette recherche.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prospect
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Facture
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredGeneratorLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{lead.companyName || 'Entreprise non renseignee'}</div>
                        <div className="mt-1 text-xs text-gray-500">{lead.message || 'Aucun message'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{lead.phone || '-'}</div>
                        <div className="text-xs text-gray-500">{lead.email || '-'}</div>
                        <div className="mt-1 text-xs font-medium text-teal-700">Prefere : {lead.preferredContact}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-medium">{lead.invoiceNumber || '-'}</div>
                        <div className="text-xs text-gray-500">{lead.totalTTC.toLocaleString('fr-FR')} MAD</div>
                        <div className="text-xs text-gray-500">{lead.templateName || lead.templateId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                          {getLeadSourceLabel(lead.sourceAction)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatLeadDate(lead.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

            )}

            {activeSectionId === 'blog' && (
        <>
        <section id="seo-organization" className="mb-8 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white shadow-sm">
          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-indigo-100">
                <Search className="h-4 w-4" />
                SEO blog
              </div>
              <h3 className="mt-4 text-2xl font-black">Organisation SEO et contenu blog</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
                Centralisez la creation d articles, le score SEO, les remarques d optimisation et les priorites
                d indexation sans quitter le dashboard Factourati.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <a href="#blog-editor" className="rounded-2xl border border-white/15 bg-white/10 p-4 transition hover:-translate-y-0.5 hover:bg-white/15">
                <FileText className="h-5 w-5 text-indigo-200" />
                <p className="mt-3 font-bold">Creer ou modifier</p>
                <p className="mt-1 text-xs leading-5 text-indigo-100">Formulaire blog avec champs SEO complets.</p>
              </a>
              <a href="#blog-list" className="rounded-2xl border border-white/15 bg-white/10 p-4 transition hover:-translate-y-0.5 hover:bg-white/15">
                <CheckCircle className="h-5 w-5 text-emerald-200" />
                <p className="mt-3 font-bold">Optimisation SEO</p>
                <p className="mt-1 text-xs leading-5 text-indigo-100">Cliquez sur Editer un article pour ouvrir le panneau SEO complet.</p>
              </a>
              <a href="#blog-list" className="rounded-2xl border border-white/15 bg-white/10 p-4 transition hover:-translate-y-0.5 hover:bg-white/15">
                <Shield className="h-5 w-5 text-cyan-200" />
                <p className="mt-3 font-bold">Priorites SEO</p>
                <p className="mt-1 text-xs leading-5 text-indigo-100">Filtres score faible, noindex et champs manquants.</p>
              </a>
            </div>
          </div>
        </section>

        <BlogManager />
        </>
            )}

            {activeSectionId === 'captures' && (
        <>
        <section className="mb-8 overflow-hidden rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-950 via-slate-900 to-slate-950 text-white shadow-sm">
          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">
                <Search className="h-4 w-4" />
                Homepage
              </div>
              <h3 className="mt-4 text-2xl font-black">Captures et galerie produit</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-cyan-50/90">
                Gere les captures affichees sur la homepage, l ordre des visuels et la qualite de la galerie produit
                pour garder une presentation propre de Factourati.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-sm font-bold">Galerie hero</p>
                <p className="mt-2 text-xs leading-5 text-cyan-50/80">Organise les visuels principaux visibles sur la page d accueil.</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-sm font-bold">Ordre des slides</p>
                <p className="mt-2 text-xs leading-5 text-cyan-50/80">Priorise les ecrans les plus forts pour la conversion et la comprehension produit.</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-sm font-bold">Cohérence visuelle</p>
                <p className="mt-2 text-xs leading-5 text-cyan-50/80">Assure une meme qualite d image entre homepage, SEO et partage social.</p>
              </div>
            </div>
          </div>
        </section>

        <HomepageScreenshotsManager />
        </>
            )}

            {activeSectionId === 'support' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Historique des accès support</h3>
              <p className="text-sm text-gray-500 mt-1">Qui a ouvert quel compte client et quand</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
          </div>

          {supportLogs.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-gray-500">Aucun accès support enregistré pour le moment</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Compte client ouvert
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date et heure
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {supportLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{log.adminName || 'Administrateur'}</div>
                          <div className="text-xs text-gray-500">{log.adminEmail}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{log.companyName}</div>
                          <div className="text-xs text-gray-500">{log.companyOwnerEmail || log.companyId}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{new Date(log.openedAt).toLocaleDateString('fr-FR')}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(log.openedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

            )}

            {activeSectionId === 'credits' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recharges Analyses IA</h3>
            <p className="mt-1 text-sm text-gray-500">
              Suivez les credits TVA restants et rechargez gratuitement un client si besoin.
            </p>
          </div>

          <div className="border-b border-gray-100 px-6 py-4">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={companySearch}
                onChange={(event) => setCompanySearch(event.target.value)}
                placeholder="Rechercher une entreprise, email, ICE..."
                className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Analyses IA
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Detail
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredCompanies.map((company) => {
                  const credits = companyVatCredits[company.id];

                  return (
                    <tr key={`credits-${company.id}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{company.name}</div>
                        <div className="text-xs text-gray-500">ICE: {company.ice}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{company.ownerEmail}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {credits?.totalDisponible ?? 0} credits restants
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {credits?.creditsGratuitsRestants ?? 0} incluses • {credits?.creditsPayesRestants ?? 0} payees
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setRechargingCompany(company)}
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <Sparkles className="w-4 h-4" />
                          Recharger IA
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

            )}

            {activeSectionId === 'companies' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Liste des Entreprises</h3>
          </div>

          <div className="border-b border-gray-100 px-6 py-4">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={companySearch}
                onChange={(event) => setCompanySearch(event.target.value)}
                placeholder="Rechercher une entreprise, email, source ou ICE..."
                className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-red-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Raison Sociale
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email Propriétaire
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source d'Acquisition
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type d'Abonnement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date d'Expiration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dernier accès client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{company.name}</div>
                        <div className="text-xs text-gray-500">ICE: {company.ice}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {company.ownerEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{company.referralSource || 'Non spécifié'}</div>
                        {company.referralSource === 'Bureau Comptable' && company.accountantName && (
                          <div className="text-xs text-gray-500 mt-1">{company.accountantName}</div>
                        )}
                        {company.referralSource === 'Autre' && company.otherSource && (
                          <div className="text-xs text-gray-500 mt-1">{company.otherSource}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        company.subscription === 'pro' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {company.subscription === 'pro' ? (
                          <>
                            <Crown className="w-3 h-3 mr-1" />
                            Pro
                          </>
                        ) : (
                          <>
                            🆓 Gratuit
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {company.subscription === 'pro' && company.expiryDate ? (
                        <div>
                          <div>{new Date(company.expiryDate).toLocaleDateString('fr-FR')}</div>
                          <div className={`text-xs ${
                            new Date(company.expiryDate) < new Date() 
                              ? 'text-red-600 font-medium' 
                              : (() => {
                                  const daysRemaining = Math.ceil((new Date(company.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                  return daysRemaining <= 5 ? 'text-orange-600 font-medium animate-pulse' : 'text-green-600';
                                })()
                          }`}>
                            {(() => {
                              const expiry = new Date(company.expiryDate);
                              const now = new Date();
                              if (expiry < now) return 'Expiré';
                              const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                              if (daysRemaining <= 5) return `Expire dans ${daysRemaining}j`;
                              return 'Actif';
                            })()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(company)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {company.lastClientAccessAt ? (
                        <div>
                          <div>{new Date(company.lastClientAccessAt).toLocaleDateString('fr-FR')}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(company.lastClientAccessAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-xs text-blue-600 mt-1">
                            {company.lastClientAccessByEmail || company.ownerEmail}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Jamais connecté</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleEditCompany(company)}
                        className="inline-flex items-center space-x-1 text-red-600 hover:text-red-700 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Modifier</span>
                      </button>
                      <button
                        onClick={() => handleSupportAccess(company)}
                        disabled={supportLoadingId === company.id}
                        className="ml-4 inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>{supportLoadingId === company.id ? 'Ouverture...' : 'Acces support'}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteCompany(company)}
                        disabled={deleteLoadingId === company.id}
                        className="ml-4 inline-flex items-center space-x-1 text-red-700 hover:text-red-800 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>{deleteLoadingId === company.id ? 'Suppression...' : 'Supprimer'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredCompanies.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {companies.length === 0
                    ? 'Aucune entreprise enregistree'
                    : 'Aucune entreprise ne correspond a cette recherche.'}
                </p>
              </div>
            )}
          </div>
        </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de modification */}
      {editingCompany && (
        <EditCompanyModal
          company={editingCompany}
          onSave={handleSaveCompany}
          onClose={() => setEditingCompany(null)}
        />
      )}

      {rechargingCompany && (
        <AdminVatCreditsRechargeModal
          isOpen={!!rechargingCompany}
          onClose={() => setRechargingCompany(null)}
          companyName={rechargingCompany.name}
          currentCredits={companyVatCredits[rechargingCompany.id]?.totalDisponible ?? 0}
          onSubmit={({ credits, note, type, action }) =>
            handleRechargeVatCredits({
              companyId: rechargingCompany.id,
              credits,
              note,
              type,
              action,
            })
          }
        />
      )}
    </div>
  );
}

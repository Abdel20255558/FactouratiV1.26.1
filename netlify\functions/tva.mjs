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
  updateDoc,
  where,
} from 'firebase/firestore/lite';
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
const TVA_AI_SETTINGS_COLLECTION = 'platformSettings';
const TVA_AI_SETTINGS_DOC = 'openaiPdfAnalysis';
const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };
const VALID_VAT_RATES = [20, 10, 7, 0];
const VALID_PAYMENT_MODES = ['virement', 'cheque', 'effet', 'especes'];
const DEFAULT_OPENAI_MODEL = 'gpt-4.1';
const DEFAULT_OPENAI_PROMPT = `Tu es un assistant comptable marocain. Analyse cette facture et extrais en JSON uniquement ces champs :
{
  date: (format YYYY-MM-DD),
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

const getRoutePath = (requestUrl) => {
  const pathname = new URL(requestUrl).pathname;
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

const parseLooseJson = (rawText) => {
  const cleaned = String(rawText || '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error('JSON introuvable dans la reponse OpenAI.');
  }

  return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
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
  date: invoice.date,
  originalDate: invoice.date,
  subtotal: Number(invoice.montant_ht || 0),
  totalVat: Number(invoice.montant_tva || 0),
  totalTTC: Number(invoice.montant_ttc || 0),
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
  const apiKey = String(settingsData.apiKey || '').trim();

  if (!apiKey) {
    throw new Error("La cle OpenAI n'est pas configuree dans le dashboard admin.");
  }

  return {
    apiKey,
    model: String(settingsData.model || '').trim() || DEFAULT_OPENAI_MODEL,
    prompt: String(settingsData.prompt || '').trim() || DEFAULT_OPENAI_PROMPT,
  };
};

const extractFromPdfWithOpenAI = async (file) => {
  const settings = await getVatAiSettings();
  const pdfBuffer = Buffer.from(await file.arrayBuffer());

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: settings.model,
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
      max_output_tokens: 900,
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(errorPayload || 'OpenAI a retourne une erreur.');
  }

  const parsed = parseLooseJson(flattenOpenAIText(await response.json()));
  const extracted = {
    date: parsed.date || null,
    fournisseur: parsed.fournisseur || null,
    description: parsed.description || null,
    montant_ttc: Number.isFinite(Number(parsed.montant_ttc)) ? roundToTwo(parsed.montant_ttc) : null,
    taux_tva: VALID_VAT_RATES.includes(Number(parsed.taux_tva)) ? Number(parsed.taux_tva) : null,
    montant_tva: Number.isFinite(Number(parsed.montant_tva)) ? roundToTwo(parsed.montant_tva) : null,
    montant_ht: Number.isFinite(Number(parsed.montant_ht)) ? roundToTwo(parsed.montant_ht) : null,
    mode_paiement: parsed.mode_paiement ? normalizePaymentMode(parsed.mode_paiement, '') || null : null,
    numero_piece: parsed.numero_piece || null,
    ice_fournisseur: parsed.ice_fournisseur || null,
  };

  const autoFilledFields = Object.entries(extracted).filter(([, value]) => value !== null && String(value).trim() !== '').map(([key]) => key);
  const missingFields = ['date', 'fournisseur', 'description', 'montant_ttc', 'taux_tva', 'montant_tva', 'montant_ht', 'mode_paiement', 'ice_fournisseur']
    .filter((field) => !autoFilledFields.includes(field));

  return { ...extracted, autoFilledFields, missingFields };
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
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file.arrayBuffer !== 'function') {
      return jsonResponse({ message: 'Aucun fichier PDF valide recu.' }, 400);
    }

    return jsonResponse(await extractFromPdfWithOpenAI(file));
  } catch (error) {
    console.error('Erreur extraction PDF TVA:', error);
    return jsonResponse({ message: 'Impossible de lire ce PDF, veuillez saisir manuellement.' }, 422);
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

export default async (request) => {
  try {
    const routePath = getRoutePath(request.url);
    const [resource, resourceId] = routePath.split('/');

    if (request.method === 'POST' && routePath === 'extract-pdf') return await handleExtractPdf(request);
    if (request.method === 'GET' && routePath === 'summary') return await handleSummary(request);
    if (request.method === 'GET' && routePath === 'export-pdf') return await handleExportPdf(request);
    if (resource === 'facture-achat' && request.method === 'POST' && !resourceId) return await handleCreatePurchaseInvoice(request);
    if (resource === 'facture-achat' && request.method === 'PUT' && resourceId) return await handleUpdatePurchaseInvoice(request, resourceId);
    if (resource === 'facture-achat' && request.method === 'DELETE' && resourceId) return await handleDeletePurchaseInvoice(resourceId);

    return jsonResponse({ message: 'Route TVA introuvable.' }, 404);
  } catch (error) {
    console.error('Erreur API TVA:', error);
    return jsonResponse({ message: error instanceof Error ? error.message : 'Erreur interne TVA.' }, 500);
  }
};

import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileText, Lock, Plus, Printer, Trash2 } from 'lucide-react';
import SeoHead from '../seo/SeoHead';
import PublicSiteChrome from './PublicSiteChrome';
import TemplateRenderer from '../templates/TemplateRenderer';
import { Invoice, InvoiceItem } from '../../contexts/DataContext';
import { convertNumberToWords } from '../../utils/numberToWords';
import {
  DEFAULT_OG_IMAGE,
  SITE_URL,
  createBreadcrumbSchema,
  createLocalBusinessSchema,
  createOrganizationSchema,
  createWebPageSchema,
} from '../../data/publicSeoData';

type PublicCompanyForm = {
  name: string;
  activity: string;
  ice: string;
  if: string;
  rc: string;
  cnss: string;
  patente: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo: string;
};

type PublicClientForm = {
  name: string;
  address: string;
  ice: string;
};

const templateOptions = [
  { id: 'template1', name: 'Classic Free', label: 'Gratuit', isLocked: false },
  { id: 'template2', name: 'Noir Classique', label: 'Pro', isLocked: true },
  { id: 'template3', name: 'Moderne Vert', label: 'Pro', isLocked: true },
  { id: 'template4', name: 'Bleu Elegant', label: 'Pro', isLocked: true },
  { id: 'template5', name: 'Minimal Bleu', label: 'Pro', isLocked: true },
  { id: 'template6', name: 'Executive Bronze', label: 'Pro', isLocked: true },
  { id: 'template7', name: 'Atlas Emeraude', label: 'Pro', isLocked: true },
  { id: 'template8', name: 'Prestige Graphite', label: 'Pro', isLocked: true },
];

const numberInput = (value: string) => Number.parseFloat(value) || 0;

export default function FreeInvoiceGeneratorPage() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const [selectedTemplate, setSelectedTemplate] = useState('template1');
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [company, setCompany] = useState<PublicCompanyForm>({
    name: 'Votre Entreprise SARL',
    activity: 'Services et commerce',
    ice: '001122334455667',
    if: '12345678',
    rc: '12345',
    cnss: '1234567',
    patente: '12345678',
    address: 'Casablanca, Maroc',
    phone: '+212 600 000 000',
    email: 'contact@votreentreprise.ma',
    website: 'www.votreentreprise.ma',
    logo: '',
  });
  const [client, setClient] = useState<PublicClientForm>({
    name: 'Client Exemple',
    address: 'Rabat, Maroc',
    ice: '112255887766992',
  });
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [invoiceNumber, setInvoiceNumber] = useState(`FAC-${currentYear}-001`);
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 'item-1',
      description: 'Prestation de service',
      quantity: 1,
      unitPrice: 1200,
      vatRate: 20,
      unit: 'unite',
      total: 1200,
    },
  ]);

  const computedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        total: Number(item.quantity || 0) * Number(item.unitPrice || 0),
      })),
    [items],
  );

  const totals = useMemo(() => {
    const subtotal = computedItems.reduce((sum, item) => sum + item.total, 0);
    const totalVat = computedItems.reduce((sum, item) => sum + item.total * (Number(item.vatRate || 0) / 100), 0);
    return {
      subtotal,
      totalVat,
      totalTTC: subtotal + totalVat,
    };
  }, [computedItems]);

  const invoice = useMemo<Invoice>(
    () => ({
      id: 'public-preview',
      number: invoiceNumber || `FAC-${currentYear}-001`,
      clientId: 'public-client',
      client: {
        id: 'public-client',
        name: client.name || 'Client',
        address: client.address || '',
        ice: client.ice || '-',
        phone: '',
        email: '',
        createdAt: today,
        entrepriseId: 'public',
      },
      date: invoiceDate || today,
      dueDate: '',
      items: computedItems,
      subtotal: totals.subtotal,
      totalVat: totals.totalVat,
      totalTTC: totals.totalTTC,
      totalInWords: convertNumberToWords(totals.totalTTC),
      status: 'draft',
      createdAt: today,
      entrepriseId: 'public',
    }),
    [client.address, client.ice, client.name, computedItems, currentYear, invoiceDate, invoiceNumber, today, totals.subtotal, totals.totalTTC, totals.totalVat],
  );

  const schema = [
    createOrganizationSchema(),
    createLocalBusinessSchema(),
    createWebPageSchema({
      name: 'Generateur de facture gratuit au Maroc',
      path: '/generateur-facture',
      description: 'Creez gratuitement une facture professionnelle au Maroc avec le template gratuit Factourati.',
    }),
    createBreadcrumbSchema([
      { name: 'Accueil', url: SITE_URL },
      { name: 'Generateur de facture gratuit', url: `${SITE_URL}/generateur-facture` },
    ]),
  ];

  const selectedTemplateMeta = templateOptions.find((template) => template.id === selectedTemplate) || templateOptions[0];
  const isSelectedTemplateLocked = selectedTemplateMeta.isLocked;

  const updateCompany = (field: keyof PublicCompanyForm, value: string) => {
    setCompany((prev) => ({ ...prev, [field]: value }));
  };

  const updateClient = (field: keyof PublicClientForm, value: string) => {
    setClient((prev) => ({ ...prev, [field]: value }));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const parsedValue = field === 'quantity' || field === 'unitPrice' || field === 'vatRate' ? numberInput(value) : value;
        const next = { ...item, [field]: parsedValue } as InvoiceItem;
        return {
          ...next,
          total: Number(next.quantity || 0) * Number(next.unitPrice || 0),
        };
      }),
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: 'Nouveau service',
        quantity: 1,
        unitPrice: 0,
        vatRate: 20,
        unit: 'unite',
        total: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  };

  const renderPdfWithHeaderFooter = async () => {
    const root = document.getElementById('public-invoice-print') as HTMLElement | null;
    if (!root) throw new Error('Apercu facture introuvable');

    const [{ default: html2pdf }, { default: html2canvas }] = await Promise.all([
      import('html2pdf.js'),
      import('html2canvas'),
    ]);

    const captureElement = async (element: HTMLElement | null) => {
      if (!element) return { dataUrl: null as string | null, width: 0, height: 0 };
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: null });
      return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
    };

    const header = root.querySelector('.pdf-header') as HTMLElement | null;
    const footer = root.querySelector('.pdf-footer') as HTMLElement | null;
    const [headerImage, footerImage] = await Promise.all([captureElement(header), captureElement(footer)]);
    const pageWidthMM = 210;
    const headerMM = headerImage.dataUrl ? (headerImage.height / headerImage.width) * pageWidthMM : 0;
    const footerMM = footerImage.dataUrl ? (footerImage.height / footerImage.width) * pageWidthMM : 0;

    const options = {
      margin: [headerMM, 8, footerMM, 8],
      filename: `Facture_${invoice.number}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['.avoid-break'] },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        ignoreElements: (element: Element) => (element as HTMLElement).classList?.contains('pdf-exclude'),
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    root.classList.add('exporting');
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const contentElement = root.querySelector('.pdf-content') as HTMLElement | null;
      const rootRect = root.getBoundingClientRect();
      const contentRect = contentElement?.getBoundingClientRect();
      const exportMetrics = {
        rootWidth: rootRect.width || contentRect?.width || 1,
        contentHeight: contentRect?.height || rootRect.height || 0,
      };
      const worker: any = (html2pdf() as any).set(options).from(root).toPdf();
      const pdf: any = await worker.get('pdf');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const renderedHeaderHeight = headerImage.dataUrl ? (headerImage.height / headerImage.width) * pageWidth : 0;
      const renderedFooterHeight = footerImage.dataUrl ? (footerImage.height / footerImage.width) * pageWidth : 0;
      let pagesCount = pdf.internal.getNumberOfPages();
      const availableContentWidth = pageWidth - 16;
      const availableContentHeight = pageHeight - renderedHeaderHeight - renderedFooterHeight;
      const measuredContentHeight = (exportMetrics.contentHeight / exportMetrics.rootWidth) * availableContentWidth;

      if (pagesCount > 1 && measuredContentHeight <= availableContentHeight + 8 && typeof pdf.deletePage === 'function') {
        for (let page = pagesCount; page > 1; page -= 1) {
          pdf.deletePage(page);
        }
        pagesCount = pdf.internal.getNumberOfPages();
      }

      for (let page = 1; page <= pagesCount; page += 1) {
        pdf.setPage(page);
        if (headerImage.dataUrl) pdf.addImage(headerImage.dataUrl, 'PNG', 0, 0, pageWidth, renderedHeaderHeight);
        if (footerImage.dataUrl) pdf.addImage(footerImage.dataUrl, 'PNG', 0, pageHeight - renderedFooterHeight, pageWidth, renderedFooterHeight);
      }

      const blob: Blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const printWindow = window.open('', '_blank');

      if (!printWindow) {
        pdf.save(`Facture_${invoice.number}.pdf`);
        alert("Le navigateur a bloque l'impression. Le PDF a ete telecharge a la place.");
        return;
      }

      printWindow.document.write(`
        <html><head><title>Facture_${invoice.number}</title><meta charset="utf-8"/></head>
        <body style="margin:0">
          <iframe src="${url}" style="border:0;width:100%;height:100vh"
            onload="this.contentWindow && this.contentWindow.focus && this.contentWindow.print && this.contentWindow.print()"></iframe>
        </body></html>
      `);
      printWindow.document.close();
    } finally {
      root.classList.remove('exporting');
    }
  };

  const handlePrint = async () => {
    if (isSelectedTemplateLocked) {
      navigate('/login?mode=register');
      return;
    }

    setIsPreparingPrint(true);
    try {
      await renderPdfWithHeaderFooter();
    } catch (error) {
      console.error(error);
      alert("Erreur pendant la preparation du PDF.");
    } finally {
      setIsPreparingPrint(false);
    }
  };

  return (
    <PublicSiteChrome>
      <SeoHead
        title="Generateur de facture gratuit au Maroc | Factourati"
        description="Creez une facture professionnelle gratuitement avec le template gratuit Factourati. Pour sauvegarder vos factures et utiliser les templates Pro, creez un compte."
        canonicalPath="/generateur-facture"
        keywords="generateur facture gratuit maroc, modele facture maroc, facture professionnelle maroc, logiciel facturation maroc"
        image={DEFAULT_OG_IMAGE}
        type="website"
        schema={schema}
      />
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #public-invoice-print,
          #public-invoice-print * {
            visibility: visible !important;
          }
          #public-invoice-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            background: white !important;
          }
          .public-generator-no-print {
            display: none !important;
          }
        }
        #public-invoice-print.exporting {
          padding: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }
        #public-invoice-print.exporting .pdf-content {
          padding-top: 12px !important;
          padding-bottom: 12px !important;
        }
        #public-invoice-print.exporting .keep-together {
          break-inside: auto !important;
          page-break-inside: auto !important;
        }
      `}</style>

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 text-white">
        <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8 lg:py-20">
          <div>
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-teal-100">
              Template gratuit inclus
            </span>
            <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl">
              Creez une facture professionnelle en 2 minutes, sans compte.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
              Remplissez vos informations, utilisez le template gratuit Classic Free, puis imprimez votre facture. Les templates avances et la sauvegarde sont disponibles apres inscription ou connexion.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#generateur"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-400 px-6 py-3 font-bold text-slate-950 shadow-lg shadow-teal-950/30 transition hover:bg-teal-300"
              >
                Creer ma facture <ArrowRight className="h-5 w-5" />
              </a>
              <Link
                to="/login?mode=register"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 font-bold text-white transition hover:bg-white/20"
              >
                Debloquer les templates Pro
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur">
            <div className="grid gap-4">
              {[
                'Facture gratuite avec template Classic Free',
                'Aucune carte bancaire pour tester',
                'Compte requis pour sauvegarder et changer de template',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 text-sm font-semibold text-slate-100">
                  <CheckCircle2 className="h-5 w-5 text-teal-300" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="generateur" className="bg-slate-50 py-12">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="public-generator-no-print space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Informations facture</h2>
                  <p className="text-sm text-slate-500">Le numero et la date apparaissent dans l'apercu.</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                  Numero facture
                  <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-teal-500 focus:ring-2" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Date
                  <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-teal-500 focus:ring-2" />
                </label>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">Votre entreprise</h2>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  ['name', 'Nom entreprise'],
                  ['activity', 'Activite'],
                  ['ice', 'ICE'],
                  ['if', 'IF'],
                  ['rc', 'RC'],
                  ['cnss', 'CNSS'],
                  ['patente', 'Patente'],
                  ['phone', 'Telephone'],
                  ['email', 'Email'],
                  ['website', 'Site web'],
                  ['address', 'Adresse'],
                  ['logo', 'Logo URL optionnel'],
                ].map(([field, label]) => (
                  <label key={field} className="text-sm font-semibold text-slate-700">
                    {label}
                    <input
                      value={company[field as keyof PublicCompanyForm]}
                      onChange={(e) => updateCompany(field as keyof PublicCompanyForm, e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-teal-500 focus:ring-2"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">Client</h2>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  ['name', 'Nom client'],
                  ['address', 'Adresse client'],
                  ['ice', 'ICE client'],
                ].map(([field, label]) => (
                  <label key={field} className="text-sm font-semibold text-slate-700">
                    {label}
                    <input
                      value={client[field as keyof PublicClientForm]}
                      onChange={(e) => updateClient(field as keyof PublicClientForm, e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-teal-500 focus:ring-2"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-slate-950">Articles</h2>
                <button onClick={addItem} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800">
                  <Plus className="h-4 w-4" /> Ajouter
                </button>
              </div>
              <div className="mt-5 space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-bold text-slate-900">Ligne {index + 1}</p>
                      {items.length > 1 && (
                        <button onClick={() => removeItem(item.id)} className="rounded-lg p-2 text-red-600 transition hover:bg-red-50" aria-label="Supprimer la ligne">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                        Designation
                        <input value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-teal-500 focus:ring-2" />
                      </label>
                      <label className="text-sm font-semibold text-slate-700">
                        Quantite
                        <input type="number" min="0" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-teal-500 focus:ring-2" />
                      </label>
                      <label className="text-sm font-semibold text-slate-700">
                        Unite
                        <input value={item.unit || ''} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-teal-500 focus:ring-2" />
                      </label>
                      <label className="text-sm font-semibold text-slate-700">
                        Prix HT
                        <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-teal-500 focus:ring-2" />
                      </label>
                      <label className="text-sm font-semibold text-slate-700">
                        TVA %
                        <select value={item.vatRate} onChange={(e) => updateItem(item.id, 'vatRate', e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-teal-500 focus:ring-2">
                          <option value={0}>0%</option>
                          <option value={7}>7%</option>
                          <option value={10}>10%</option>
                          <option value={14}>14%</option>
                          <option value={20}>20%</option>
                        </select>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">Templates</h2>
              <p className="mt-2 text-sm text-slate-500">Vous pouvez voir l'apercu des templates Pro, mais l'impression demande un compte Factourati.</p>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {templateOptions.map((template) => {
                  const isSelected = selectedTemplate === template.id;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`group rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-slate-200 bg-slate-50 hover:border-teal-300 hover:bg-teal-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className={isSelected ? 'font-bold text-teal-950' : 'font-bold text-slate-900'}>{template.name}</p>
                        {template.isLocked ? (
                          <Lock className="h-4 w-4 text-slate-400 group-hover:text-teal-700" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-teal-700" />
                        )}
                      </div>
                      <p className={isSelected ? 'mt-2 text-xs font-semibold text-teal-700' : 'mt-2 text-xs font-semibold text-slate-500'}>
                        {template.isLocked ? `${template.label} - Apercu seulement` : `${template.label} - Impression disponible`}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="public-generator-no-print rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Apercu {selectedTemplateMeta.name}</h2>
                  <p className="text-sm text-slate-500">
                    {isSelectedTemplateLocked ? 'Apercu Pro disponible. Impression apres creation de compte.' : 'Template gratuit imprimable.'}
                  </p>
                </div>
                <button onClick={handlePrint} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-bold text-white transition hover:bg-teal-700">
                  <Printer className="h-5 w-5" /> {isPreparingPrint ? 'Preparation...' : isSelectedTemplateLocked ? 'Creer un compte' : 'Imprimer'}
                </button>
              </div>
              <div className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                Pour sauvegarder l'historique, envoyer les factures, gerer le stock et imprimer avec les templates Pro, connectez-vous ou creez un compte.
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link to="/login?mode=register" className="font-bold text-teal-700 hover:text-teal-800">
                    Creer un compte
                  </Link>
                  <Link to="/login" className="font-bold text-slate-700 hover:text-slate-950">
                    Se connecter
                  </Link>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-xl">
              <div id="public-invoice-print" className="bg-white p-5">
                <TemplateRenderer templateId={selectedTemplate} data={invoice} type="invoice" companyOverride={company} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicSiteChrome>
  );
}

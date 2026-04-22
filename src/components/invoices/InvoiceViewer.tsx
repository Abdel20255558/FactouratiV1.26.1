import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLicense } from '../../contexts/LicenseContext';
import { Invoice } from '../../contexts/DataContext';
import TemplateRenderer from '../templates/TemplateRenderer';
import TemplateCustomizationPanel, {
  createTemplateCustomizationState,
  type TemplateCustomizationState,
} from '../templates/TemplateCustomizationPanel';
import ProTemplateModal from '../license/ProTemplateModal';
import { useNavigate } from 'react-router-dom';
import { X, Crown, Download, Edit, Palette, Printer, Sparkles } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import { prepareImagesForPdf } from '../../utils/pdfImageUtils';
import { balanceInvoiceSignatureForPdf } from '../../utils/invoicePdfLayout';

interface InvoiceViewerProps {
  invoice: Invoice;
  onClose: () => void;
  onEdit: () => void;
  onDownload: () => void;
  onUpgrade?: () => void;
}

export default function InvoiceViewer({ invoice, onClose, onEdit, onUpgrade }: InvoiceViewerProps) {
  const { user, updateCompanySettings } = useAuth();
  const { licenseType } = useLicense();
  const navigate = useNavigate();

  const [selectedTemplate, setSelectedTemplate] = useState(user?.company?.defaultTemplate || 'template1');
  const [showProModal, setShowProModal] = useState(false);
  const [includeSignature, setIncludeSignature] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showProSignatureModal, setShowProSignatureModal] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [showStyleUpgradeNotice, setShowStyleUpgradeNotice] = useState(false);
  const [isSavingStyle, setIsSavingStyle] = useState(false);
  const [styleSaveSuccess, setStyleSaveSuccess] = useState(false);
  const styleUpgradeTimer = useRef<number | null>(null);
  const [templateCustomization, setTemplateCustomization] = useState<TemplateCustomizationState>(
    createTemplateCustomizationState(user?.company?.templateCustomization),
  );

  const previewCompany = user?.company
    ? { ...user.company, templateCustomization }
    : undefined;

  const templates = [
    { id: 'template1', name: 'Classique', isPro: false },
    { id: 'template2', name: 'Moderne Coloré', isPro: true },
    { id: 'template3', name: 'Minimaliste', isPro: true },
    { id: 'template4', name: 'Corporate', isPro: true },
    { id: 'template5', name: 'Premium Élégant', isPro: true },
    { id: 'template6', name: 'Executive Bronze Pro', isPro: true },
    { id: 'template7', name: 'Atlas Emeraude Pro', isPro: true },
    { id: 'template8', name: 'Prestige Graphite Pro', isPro: true }
  ];

  const getTemplateName = (templateId: string) => templates.find(t => t.id === templateId)?.name || 'Template';
  const isTemplateProOnly = (templateId: string) => templates.find(t => t.id === templateId)?.isPro || false;

  useEffect(() => () => {
    if (styleUpgradeTimer.current) {
      window.clearTimeout(styleUpgradeTimer.current);
    }
  }, []);

  // ---------- PDF helpers ----------
  const findHeaderFooter = () => {
    const root = document.getElementById('invoice-content') as HTMLElement | null;
    if (!root) throw new Error('Contenu introuvable');
    const header = root.querySelector('.pdf-header') as HTMLElement | null;
    const footer = root.querySelector('.pdf-footer') as HTMLElement | null;
    return { root, header, footer };
  };

  const captureHF = async (el: HTMLElement | null) => {
    if (!el) return { dataUrl: null as string | null, w: 0, h: 0 };
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: null,
    });
    return { dataUrl: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height };
  };

  const buildOptions = (filename: string, headerMM: number, footerMM: number): html2pdf.Options => ({
    margin: [headerMM, 8, footerMM, 8],
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    pagebreak: { mode: ['css', 'legacy'], avoid: ['.avoid-break', '.keep-together'] },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
      ignoreElements: (el: Element) => (el as HTMLElement).classList?.contains('pdf-exclude'),
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  });

  const renderPdfWithHF = async (action: 'download' | 'print') => {
    const { root, header, footer } = findHeaderFooter();
    const restoreImages = await prepareImagesForPdf(root);
    let restoreSignatureLayout: () => void = () => undefined;

    root.classList.add('exporting'); // pourquoi: on laisse la marge au moteur PDF
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      // capture header/footer pour les repeindre
      const [hImg, fImg] = await Promise.all([captureHF(header), captureHF(footer)]);
      const PAGE_W_MM = 210;
      const headerMM = hImg.dataUrl ? (hImg.h / hImg.w) * PAGE_W_MM : 0;
      const footerMM = fImg.dataUrl ? (fImg.h / fImg.w) * PAGE_W_MM : 0;

      restoreSignatureLayout = balanceInvoiceSignatureForPdf(root, { headerMM, footerMM });
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const options = buildOptions(`Facture_${invoice.number}.pdf`, headerMM, footerMM);

      // construit le pdf sans header/footer (exclus)
      const worker: any = (html2pdf() as any).set(options).from(root).toPdf();
      const pdf: any = await worker.get('pdf');

      // repeindre header/footer sur chaque page
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const hH = hImg.dataUrl ? (hImg.h / hImg.w) * pageW : 0;
      const fH = fImg.dataUrl ? (fImg.h / fImg.w) * pageW : 0;
      const total = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        pdf.setPage(i);
        if (hImg.dataUrl) pdf.addImage(hImg.dataUrl, 'PNG', 0, 0, pageW, hH);
        if (fImg.dataUrl) pdf.addImage(fImg.dataUrl, 'PNG', 0, pageH - fH, pageW, fH);
      }

      if (action === 'download') {
        pdf.save(`Facture_${invoice.number}.pdf`);
      } else {
        const blob: Blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        const win = window.open('', '_blank');
        if (!win) {
          alert("Autorisez les pop-ups pour l'impression.");
          return;
        }
        win.document.write(`
          <html><head><title>Facture_${invoice.number}</title><meta charset="utf-8"/></head>
          <body style="margin:0">
            <iframe src="${url}" style="border:0;width:100%;height:100vh"
              onload="this.contentWindow && this.contentWindow.focus && this.contentWindow.print && this.contentWindow.print()"></iframe>
          </body></html>
        `);
        win.document.close();
      }
    } finally {
      restoreSignatureLayout();
      root.classList.remove('exporting');
      restoreImages();
    }
  };

  const handlePrint = async () => {
    if (isTemplateProOnly(selectedTemplate) && licenseType !== 'pro') { setShowProModal(true); return; }
    try { await renderPdfWithHF('print'); } catch (e) { console.error(e); alert('Erreur impression'); }
  };

  const handleDownloadPDF = async () => {
    if (isTemplateProOnly(selectedTemplate) && licenseType !== 'pro') { setShowProModal(true); return; }
    try { await renderPdfWithHF('download'); } catch (e) { console.error(e); alert('Erreur PDF'); }
  };

  const handleSaveTemplateStyle = async () => {
    if (!user?.isAdmin) {
      alert('Seuls les administrateurs peuvent sauvegarder le style du document.');
      return;
    }

    setIsSavingStyle(true);
    setStyleSaveSuccess(false);
    try {
      await updateCompanySettings({ templateCustomization });
      setStyleSaveSuccess(true);
      window.setTimeout(() => setStyleSaveSuccess(false), 3500);
    } catch (error) {
      console.error('Erreur sauvegarde style document:', error);
      alert('Erreur lors de la sauvegarde du style.');
    } finally {
      setIsSavingStyle(false);
    }
  };

  const handleTemplateCustomizationChange = (nextValue: TemplateCustomizationState) => {
    setStyleSaveSuccess(false);
    setTemplateCustomization(nextValue);
  };

  const handleResetTemplateStyle = () => {
    setStyleSaveSuccess(false);
    setTemplateCustomization(createTemplateCustomizationState());
  };

  const handleStyleButtonClick = () => {
    if (licenseType !== 'pro') {
      setShowStylePanel(false);
      setShowStyleUpgradeNotice(true);

      if (styleUpgradeTimer.current) {
        window.clearTimeout(styleUpgradeTimer.current);
      }

      styleUpgradeTimer.current = window.setTimeout(() => {
        setShowStyleUpgradeNotice(false);
        if (onUpgrade) {
          onUpgrade();
        } else {
          setShowProModal(true);
        }
      }, 1200);
      return;
    }

    setShowStylePanel((prev) => !prev);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75">
      <style>{`
        .avoid-break { break-inside: avoid; page-break-inside: avoid; }
        .keep-together { break-inside: avoid; page-break-inside: avoid; }
        .invoice-signature-section {
          break-inside: avoid;
          page-break-inside: avoid;
          margin-top: 12px;
        }
        #invoice-content.exporting .pdf-content { padding-top:10px !important; padding-bottom:10px !important; }
        #invoice-content.exporting .invoice-top-section { padding-top:12px !important; padding-bottom:12px !important; }
        #invoice-content.exporting .invoice-table-section { padding-top:10px !important; padding-bottom:10px !important; }
        #invoice-content.exporting .invoice-totals-section { padding-top:10px !important; padding-bottom:8px !important; }
        #invoice-content.exporting .invoice-signature-section {
          margin-top: var(--invoice-signature-offset, 18px) !important;
          padding-top:0 !important;
          padding-bottom:10px !important;
        }
        @keyframes style-upgrade-pop {
          0% { opacity: 0; transform: translateY(-10px) scale(0.96); }
          55% { opacity: 1; transform: translateY(0) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .style-upgrade-pop { animation: style-upgrade-pop 420ms ease-out both; }
      `}</style>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className={`inline-block w-full ${showStylePanel ? 'max-w-7xl' : 'max-w-4xl'} my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl`}>
          {/* Header */}
          <div className="flex flex-col gap-4 p-6 border-b border-gray-200 lg:flex-row lg:items-center lg:justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Facture {invoice.number}</h3>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="template1">Classic Free</option>
                <option value="template2">Noir Classique Pro</option>
                <option value="template3">Minimaliste Pro</option>
                <option value="template4">Corporate Pro</option>
                <option value="template5">Premium Élégant Pro</option>
                <option value="template6">Executive Bronze Pro</option>
                <option value="template7">Atlas Emeraude Pro</option>
                <option value="template8">Prestige Graphite Pro</option>
              </select>

              <button
                onClick={handleStyleButtonClick}
                className={`inline-flex items-center space-x-2 px-3 py-2 text-white rounded-lg text-sm transition ${
                  licenseType === 'pro'
                    ? 'bg-slate-700 hover:bg-slate-800'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                }`}
              >
                <Palette className="w-4 h-4" /><span>Style</span>
              </button>

              <button onClick={handleDownloadPDF} className="inline-flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm">
                <Download className="w-4 h-4" /><span>PDF</span>
              </button>
              <button onClick={handlePrint} className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
                <Printer className="w-4 h-4" /><span>Imprimer</span>
              </button>

              <label className="inline-flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSignature}
                  onChange={(e) => {
                    if (e.target.checked) {
                      if (licenseType !== 'pro') { setShowProSignatureModal(true); setIncludeSignature(false); }
                      else if (!user?.company?.signature) { setShowSignatureModal(true); setIncludeSignature(false); }
                      else { setIncludeSignature(true); }
                    } else { setIncludeSignature(false); }
                  }}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm">Signature</span>
              </label>

              <button onClick={onEdit} className="inline-flex items-center space-x-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm">
                <Edit className="w-4 h-4" /><span>Modifier</span>
              </button>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {showStyleUpgradeNotice && (
            <div className="mx-6 mt-4 style-upgrade-pop overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 shadow-lg">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-md">
                    <Crown className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-purple-700">Option Pro</p>
                    <p className="text-sm font-semibold text-slate-800">
                      La personnalisation du style est reservee aux abonnes Pro.
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-purple-700 shadow-sm">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  Ouverture de l'abonnement...
                </div>
              </div>
            </div>
          )}

          {showStylePanel ? (
            <div className="grid grid-cols-1 gap-4 bg-slate-100 p-4 xl:grid-cols-[410px_minmax(0,1fr)]">
              <aside className="max-h-[78vh] overflow-y-auto rounded-3xl xl:sticky xl:top-4 xl:self-start">
                <TemplateCustomizationPanel
                  value={templateCustomization}
                  onChange={handleTemplateCustomizationChange}
                  onSave={handleSaveTemplateStyle}
                  onReset={handleResetTemplateStyle}
                  isSaving={isSavingStyle}
                  saveSuccess={styleSaveSuccess}
                  disabled={!user?.isAdmin}
                />
              </aside>

              <div className="min-w-0 overflow-auto rounded-3xl bg-white p-4 shadow-inner">
                <div id="invoice-content" style={{ backgroundColor: 'white', padding: '20px' }}>
                  <TemplateRenderer
                    templateId={selectedTemplate}
                    data={invoice}
                    type="invoice"
                    includeSignature={includeSignature}
                    companyOverride={previewCompany}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div id="invoice-content" style={{ backgroundColor: 'white', padding: '20px' }}>
              <TemplateRenderer
                templateId={selectedTemplate}
                data={invoice}
                type="invoice"
                includeSignature={includeSignature}
                companyOverride={previewCompany}
              />
            </div>
          )}

          {/* Modals Signature */}
          {showSignatureModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full text-center shadow-xl">
                <h2 className="text-xl font-bold mb-2">🖋️ Signature électronique manquante</h2>
                <p className="text-gray-600 mb-4">Ajoutez votre signature dans les paramètres.</p>
                <div className="flex justify-center space-x-3">
                  <button onClick={() => { setShowSignatureModal(false); navigate('/settings'); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Ajouter maintenant</button>
                  <button onClick={() => setShowSignatureModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">Plus tard</button>
                </div>
              </div>
            </div>
          )}
          {showProSignatureModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full text-center shadow-xl">
                <h2 className="text-xl font-bold mb-2">⚡ Fonctionnalité PRO</h2>
                <p className="text-gray-600 mb-6">L’ajout de signature est réservé aux utilisateurs avec une <b>Licence PRO</b>.</p>
                <button onClick={() => setShowProSignatureModal(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">OK</button>
              </div>
            </div>
          )}
          {showProModal && (
            <ProTemplateModal isOpen={showProModal} onClose={() => setShowProModal(false)} templateName={getTemplateName(selectedTemplate)} />
          )}
        </div>
      </div>
    </div>
  );
}



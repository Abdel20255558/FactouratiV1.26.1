import React from 'react';
import { Invoice, Quote } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import type { TemplateCompany } from './Template1Classic';
import {
  INVOICE_INFO_CARD_CLASS,
  INVOICE_PAGE_STYLE,
  INVOICE_SIGNATURE_BOX_CLASS,
  INVOICE_SIGNATURE_FRAME_CLASS,
  INVOICE_SIGNATURE_IMAGE_CLASS,
  INVOICE_SIGNATURE_SECTION_CLASS,
  INVOICE_TABLE_COLUMN_WIDTHS,
  INVOICE_TABLE_DESCRIPTION_CELL_CLASS,
  INVOICE_TABLE_HEAD_CELL_CLASS,
  INVOICE_TABLE_HEAD_CELL_LEFT_CLASS,
  INVOICE_TABLE_NUMERIC_CELL_CLASS,
  INVOICE_TABLE_SECTION_CLASS,
  INVOICE_TABLE_STYLE,
  INVOICE_TABLE_TOTAL_CELL_CLASS,
  INVOICE_TOP_GRID_CLASS,
  INVOICE_TOP_SECTION_CLASS,
  INVOICE_TOTALS_GRID_CLASS,
  INVOICE_TOTALS_SECTION_CLASS,
  getInvoiceFooterTextStyle,
  getInvoiceContentStyle,
  getInvoiceLogoStyle,
  getInvoiceSignatureBoxStyle,
  getInvoiceSignatureFrameStyle,
  getInvoiceSignatureImageStyle,
  getInvoiceSignatureSectionStyle,
  getInvoiceTableSectionStyle,
  resolveInvoiceTemplateCustomization,
  templateFontSizeStyle,
} from './invoiceTemplateLayout';

interface TemplateProps {
  data: Invoice | Quote;
  type: 'invoice' | 'quote';
  includeSignature?: boolean;
  companyOverride?: TemplateCompany;
}

export default function Template2Modern({ data, type, includeSignature = false, companyOverride }: TemplateProps) {
  const { user } = useAuth();
  const company = companyOverride || user?.company;
  const title = type === 'invoice' ? 'FACTURE' : 'DEVIS';
  const DEFAULT_HEADER_H = 130;
  const DEFAULT_FOOTER_H = 100;
  const customization = resolveInvoiceTemplateCustomization(company, {
    companyNameFontSize: 36,
    documentTitleFontSize: 24,
    clientNameFontSize: 14,
    clientInfoFontSize: 14,
    footerTextFontSize: 14,
    logoSize: 96,
    signatureSpacing: 12,
    signatureBoxWidth: 192,
    signatureBoxHeight: 64,
    signatureAlign: 'right',
    showSignatureBlock: true,
    tableColor: '#000000',
    textColor: '#000000',
    headerHeight: DEFAULT_HEADER_H,
    footerHeight: DEFAULT_FOOTER_H,
  });
  const HEADER_H = customization.headerHeight;
  const FOOTER_H = customization.footerHeight;

  // --- format helpers ---
  const normUnit = (u?: string) => (u || 'unité').toLowerCase().trim();
  const is3decUnit = (u?: string) => /^(t|tonne|tonnes|kg|kilogram(?:me|mes)?|l|litre|litres|liter|liters)$/.test(normUnit(u));
  const formatQty = (q: number, u?: string) =>
    q.toLocaleString('fr-FR', { minimumFractionDigits: is3decUnit(u) ? 3 : 0, maximumFractionDigits: is3decUnit(u) ? 3 : 0 });
  const formatAmount = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const vatGroups = data.items.reduce(
    (acc: Record<number, { amount: number; products: string[] }>, item) => {
      const vat = (item.unitPrice * item.quantity * item.vatRate) / 100;
      if (!acc[item.vatRate]) acc[item.vatRate] = { amount: 0, products: [] };
      acc[item.vatRate].amount += vat;
      acc[item.vatRate].products.push(item.description);
      return acc;
    }, {}
  );
  const vatRates = Object.keys(vatGroups).map(Number).sort((a,b)=>a-b);

  return (
    <div className="bg-white mx-auto relative" style={{ ...INVOICE_PAGE_STYLE, color: customization.textColor }}>
      {/* HEADER (exclu, répété) */}
      <div className="pdf-header pdf-exclude" style={{ position:'absolute', top:0, left:0, right:0, height: HEADER_H }}>
        <div className="p-8 border-b border-black bg-black text-white text-center h-full" style={{ background: customization.hasCustomTableColor ? customization.tableColor : '#000000', borderColor: customization.tableColor }}>
          <div className="flex items-center justify-between h-full">
            {company?.logo && (<img src={company.logo} alt="Logo" crossOrigin="anonymous" referrerPolicy="no-referrer" className="h-24 w-auto" style={getInvoiceLogoStyle(customization)} />)}
            <div className="flex-1 text-center">
              <h2 className="font-extrabold" style={templateFontSizeStyle(customization.companyNameFontSize)}>{company?.name || '-'}</h2>
              <h1 className="font-bold mt-2" style={templateFontSizeStyle(customization.documentTitleFontSize)}>{title}</h1>
            </div>
            <div className="w-10" />
          </div>
        </div>
      </div>

      {/* CONTENU */}
      <div className="pdf-content" style={getInvoiceContentStyle(HEADER_H, FOOTER_H)}>
        {/* CLIENT + DATES */}
        <div className={`${INVOICE_TOP_SECTION_CLASS} border-b border-black`} style={{ borderColor: customization.tableColor }}>
          <div className={INVOICE_TOP_GRID_CLASS}>
            <div className={`bg-gray-50 ${INVOICE_INFO_CARD_CLASS} rounded border border-black`} style={{ borderColor: customization.tableColor }}>
              <h3 className="font-bold text-black mb-3 border-b border-black pb-2 text-center" style={{ ...templateFontSizeStyle(customization.clientNameFontSize), color: customization.textColor, borderColor: customization.tableColor }}>
                CLIENT : {data.client.name} {data.client.address}
              </h3>
              <div className="text-black space-y-1 text-center" style={{ ...templateFontSizeStyle(customization.clientInfoFontSize), color: customization.textColor }}>
                <p><strong>ICE:</strong> {data.client.ice}</p>
              </div>
            </div>
            <div className={`bg-gray-50 ${INVOICE_INFO_CARD_CLASS} rounded border border-black`} style={{ borderColor: customization.tableColor }}>
              <h3 className="font-bold text-black mb-3 border-b border-black pb-2 text-center" style={{ ...templateFontSizeStyle(customization.clientNameFontSize), color: customization.textColor, borderColor: customization.tableColor }}>
                DATE : {new Date(data.date).toLocaleDateString('fr-FR')}
              </h3>
              <div className="text-black space-y-1 text-center" style={{ ...templateFontSizeStyle(customization.clientInfoFontSize), color: customization.textColor }}>
                <p><strong>{type === 'invoice' ? 'FACTURE' : 'DEVIS'} N° :</strong> {data.number}</p>
              </div>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className={`${INVOICE_TABLE_SECTION_CLASS} border-b border-black`} style={{ borderColor: customization.tableColor, ...getInvoiceTableSectionStyle(customization) }}>
          <div className="border border-black rounded overflow-visible" style={{ borderColor: customization.tableColor }}>
            <table className="w-full" style={INVOICE_TABLE_STYLE}>
              <colgroup>
                <col style={{ width: INVOICE_TABLE_COLUMN_WIDTHS.designation }} />
                <col style={{ width: INVOICE_TABLE_COLUMN_WIDTHS.quantity }} />
                <col style={{ width: INVOICE_TABLE_COLUMN_WIDTHS.unitPrice }} />
                <col style={{ width: INVOICE_TABLE_COLUMN_WIDTHS.total }} />
              </colgroup>
              <thead className="bg-black text-white" style={{ background: customization.tableColor }}>
                <tr>
                  <th className={`border-r border-white ${INVOICE_TABLE_HEAD_CELL_LEFT_CLASS}`}>DÉSIGNATION</th>
                  <th className={`border-r border-white ${INVOICE_TABLE_HEAD_CELL_CLASS}`}>QUANTITÉ</th>
                  <th className={`border-r border-white ${INVOICE_TABLE_HEAD_CELL_CLASS}`}>P.U. HT</th>
                  <th className={INVOICE_TABLE_HEAD_CELL_CLASS}>TOTAL HT</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, idx) => (
                  <tr key={idx} className="border-t border-black hover:bg-gray-50 avoid-break" style={{ borderColor: customization.tableColor }}>
                    <td className={`border-r border-black ${INVOICE_TABLE_DESCRIPTION_CELL_CLASS}`} style={{ borderColor: customization.tableColor }}>{item.description}</td>
                    <td className={`border-r border-black ${INVOICE_TABLE_NUMERIC_CELL_CLASS}`} style={{ borderColor: customization.tableColor }}>
                      {formatQty(item.quantity, item.unit)} ({item.unit || 'unité'})
                    </td>
                    <td className={`border-r border-black ${INVOICE_TABLE_NUMERIC_CELL_CLASS}`} style={{ borderColor: customization.tableColor }}>{formatAmount(item.unitPrice)} MAD</td>
                    <td className={INVOICE_TABLE_TOTAL_CELL_CLASS}>{formatAmount(item.total)} MAD</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== BLOC TOTAUX (seul) ===== */}
        <section className={INVOICE_TOTALS_SECTION_CLASS}>
          <div className={INVOICE_TOTALS_GRID_CLASS}>
            <div className="min-w-0 border border-black rounded p-3 bg-gray-50" style={{ borderColor: customization.tableColor }}>
              <div className="text-sm font-bold pt-3 text-center pb-4 border-b border-black" style={{ borderColor: customization.tableColor }}>
                <p>Arrêtée le présent {type === 'invoice' ? 'facture' : 'devis'} à la somme de :</p>
              </div>
              <div className="text-sm pt-3">
                <p className="text-black">• {data.totalInWords}</p>
              </div>
            </div>

            <div className="min-w-0 border border-black rounded p-4 bg-gray-50" style={{ borderColor: customization.tableColor }}>
              <div className="flex justify-between text-sm mb-2">
                <span>Total HT :</span><span className="font-medium">{formatAmount(data.subtotal)} MAD</span>
              </div>
              <div className="text-sm mb-2">
                {vatRates.map((rate) => {
                  const g = vatGroups[rate];
                  const showProducts = g.products.length === 1;
                  return (
                    <div key={rate} className="flex justify-between">
                      <span>TVA : {rate}% {showProducts && <span style={{ fontSize: 10, color: '#555' }}>({g.products[0]})</span>}</span>
                      <span className="font-medium">{formatAmount(g.amount)} MAD</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-black pt-3" style={{ borderColor: customization.tableColor }}>
                <span>TOTAL TTC :</span><span>{formatAmount(data.totalTTC)} MAD</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== BLOC SIGNATURE (séparé) ===== */}
        <section className={INVOICE_SIGNATURE_SECTION_CLASS} style={{ ...getInvoiceSignatureSectionStyle(customization), display: customization.showSignatureBlock ? undefined : 'none' }}>
          <div className={`bg-gray-50 border border-black ${INVOICE_SIGNATURE_BOX_CLASS}`} style={{ borderColor: customization.tableColor, ...getInvoiceSignatureBoxStyle(customization) }}>
            <div className="text-sm font-bold">Signature</div>
            <div className={`border-2 border-black relative ${INVOICE_SIGNATURE_FRAME_CLASS}`} style={{ borderColor: customization.tableColor, ...getInvoiceSignatureFrameStyle(customization) }}>
              {includeSignature && company?.signature ? (
                <img
                  src={company.signature}
                  alt="Signature"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  className={INVOICE_SIGNATURE_IMAGE_CLASS}
                  style={getInvoiceSignatureImageStyle(customization)}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} /* why: éviter image cassée */
                />
              ) : (<span className="text-gray-400 text-sm">&nbsp;</span>)}
            </div>
          </div>
        </section>
      </div>

      {/* FOOTER (exclu, répété) */}
      <div className="pdf-footer pdf-exclude" style={{ position:'absolute', bottom:0, left:0, right:0, height: FOOTER_H }}>
        <div className="bg-black text-white border-t-2 border-white p-6 text-sm text-center h-full" style={{ background: customization.hasCustomTableColor ? customization.tableColor : '#000000', ...getInvoiceFooterTextStyle(customization) }}>
          <p>
            <strong>{company?.name || '-'}</strong> | {company?.address || '-'} | <strong>Tél :</strong> {company?.phone || '-'} | <strong>ICE :</strong> {company?.ice || '-'} | <strong>IF:</strong> {company?.if || '-'} | <strong>RC:</strong> {company?.rc || '-'} | <strong>CNSS:</strong> {company?.cnss || '-'} | <strong>Patente :</strong> {company?.patente || '-'} | <strong>EMAIL :</strong> {company?.email || '-'} | <strong>SITE WEB :</strong> {company?.website || '-'}
          </p>
        </div>
      </div>
    </div>
  );
}

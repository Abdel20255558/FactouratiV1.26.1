import React from 'react';
import { Invoice, Quote } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
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
  getInvoiceSignatureBoxStyle,
  getInvoiceSignatureFrameStyle,
  getInvoiceSignatureImageStyle,
  getInvoiceSignatureSectionStyle,
  resolveInvoiceTemplateCustomization,
  templateFontSizeStyle,
  type InvoiceTemplateCustomization,
} from './invoiceTemplateLayout';

interface TemplateProps {
  data: Invoice | Quote;
  type: 'invoice' | 'quote';
  includeSignature?: boolean;
  companyOverride?: TemplateCompany;
}

export type TemplateCompany = Partial<{
  name: string;
  activity: string;
  ice: string;
  if: string;
  rc: string;
  cnss: string;
  address: string;
  phone: string;
  email: string;
  patente: string;
  website: string;
  logo: string;
  signature: string;
  templateCustomization: InvoiceTemplateCustomization;
}>;

export default function Template1Classic({ data, type, includeSignature = false, companyOverride }: TemplateProps) {
  const { user } = useAuth();
  const company = companyOverride || user?.company;
  const title = type === 'invoice' ? 'FACTURE' : 'DEVIS';
  const DEFAULT_HEADER_H = company?.logo ? 150 : 122;
  const DEFAULT_FOOTER_H = 100;
  const customization = resolveInvoiceTemplateCustomization(company, {
    companyNameFontSize: 24,
    documentTitleFontSize: 30,
    clientNameFontSize: 14,
    clientInfoFontSize: 14,
    footerTextFontSize: 14,
    signatureSpacing: 12,
    signatureBoxWidth: 192,
    signatureBoxHeight: 64,
    signatureAlign: 'right',
    tableColor: '#d1d5db',
    textColor: '#111827',
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
      {/* HEADER (exclu; répété) */}
      <div className="pdf-header pdf-exclude" style={{ position:'absolute', top:0, left:0, right:0, height: HEADER_H }}>
        <div className={`${INVOICE_TABLE_SECTION_CLASS} border-b border-gray-300`} style={{ borderColor: customization.tableColor }}>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              {company?.logo && (<img src={company.logo} alt="Logo" crossOrigin="anonymous" referrerPolicy="no-referrer" className="h-20 w-auto" />)}
              <div>
                <h2 className="font-bold text-gray-900" style={{ ...templateFontSizeStyle(customization.companyNameFontSize), color: customization.textColor }}>{company?.name || '-'}</h2>
                <p className="text-sm text-gray-600" style={{ color: customization.textColor }}>{company?.activity || '-'}</p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="font-bold text-gray-900" style={{ ...templateFontSizeStyle(customization.documentTitleFontSize), color: customization.textColor }}>{title}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENU */}
      <div className="pdf-content" style={getInvoiceContentStyle(HEADER_H, FOOTER_H)}>
        {/* CLIENT + DATES */}
        <div className={`${INVOICE_TOP_SECTION_CLASS} border-b border-gray-300`} style={{ borderColor: customization.tableColor }}>
          <div className={INVOICE_TOP_GRID_CLASS}>
            <div className={`bg-gray-50 ${INVOICE_INFO_CARD_CLASS} rounded border border-gray-200`} style={{ borderColor: customization.tableColor }}>
              <h3 className="font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2 text-center" style={{ ...templateFontSizeStyle(customization.clientNameFontSize), color: customization.textColor, borderColor: customization.tableColor }}>
                CLIENT : {data.client.name} {data.client.address}
              </h3>
              <div className="text-gray-700 space-y-1 text-center" style={{ ...templateFontSizeStyle(customization.clientInfoFontSize), color: customization.textColor }}>
                <p><strong>ICE:</strong> {data.client.ice}</p>
              </div>
            </div>
            <div className={`bg-gray-50 ${INVOICE_INFO_CARD_CLASS} rounded border border-gray-200`} style={{ borderColor: customization.tableColor }}>
              <h3 className="font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2 text-center" style={{ ...templateFontSizeStyle(customization.clientNameFontSize), color: customization.textColor, borderColor: customization.tableColor }}>
                DATES : {new Date(data.date).toLocaleDateString('fr-FR')}
              </h3>
              <div className="text-gray-700 text-center" style={{ ...templateFontSizeStyle(customization.clientInfoFontSize), color: customization.textColor }}>
                <p><strong>{title} N° :</strong> {data.number}</p>
              </div>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className={`${INVOICE_TABLE_SECTION_CLASS} border-b border-gray-300`} style={{ borderColor: customization.tableColor }}>
          <div className="border border-gray-300 rounded overflow-visible" style={{ borderColor: customization.tableColor }}>
            <table className="w-full border-collapse" style={INVOICE_TABLE_STYLE}>
              <colgroup>
                <col style={{ width: INVOICE_TABLE_COLUMN_WIDTHS.designation }} />
                <col style={{ width: INVOICE_TABLE_COLUMN_WIDTHS.quantity }} />
                <col style={{ width: INVOICE_TABLE_COLUMN_WIDTHS.unitPrice }} />
                <col style={{ width: INVOICE_TABLE_COLUMN_WIDTHS.total }} />
              </colgroup>
              <thead className="bg-gray-100" style={{ background: customization.tableColor, color: '#fff' }}>
                <tr>
                  <th className={`border-r border-gray-300 ${INVOICE_TABLE_HEAD_CELL_LEFT_CLASS}`}>DÉSIGNATION</th>
                  <th className={`border-r border-gray-300 ${INVOICE_TABLE_HEAD_CELL_CLASS}`}>QUANTITÉ</th>
                  <th className={`border-r border-gray-300 ${INVOICE_TABLE_HEAD_CELL_CLASS}`}>P.U. HT</th>
                  <th className={INVOICE_TABLE_HEAD_CELL_CLASS}>TOTAL HT</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index} className="border-t border-gray-200 avoid-break" style={{ borderColor: customization.tableColor }}>
                    <td className={`border-r border-gray-300 ${INVOICE_TABLE_DESCRIPTION_CELL_CLASS}`} style={{ borderColor: customization.tableColor }}>{item.description}</td>
                    <td className={`border-r border-gray-300 ${INVOICE_TABLE_NUMERIC_CELL_CLASS}`} style={{ borderColor: customization.tableColor }}>
                      {formatQty(item.quantity, item.unit)} ({item.unit || 'unité'})
                    </td>
                    <td className={`border-r border-gray-300 ${INVOICE_TABLE_NUMERIC_CELL_CLASS}`} style={{ borderColor: customization.tableColor }}>
                      {formatAmount(item.unitPrice)} MAD
                    </td>
                    <td className={INVOICE_TABLE_TOTAL_CELL_CLASS}>
                      {formatAmount(item.total)} MAD
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== BLOC TOTAUX (seul) ===== */}
        <section className={INVOICE_TOTALS_SECTION_CLASS}>
          <div className={INVOICE_TOTALS_GRID_CLASS}>
            {/* Montant en lettres */}
            <div className="min-w-0 bg-gray-50 border border-gray-200 rounded p-3" style={{ borderColor: customization.tableColor }}>
              <p className="text-sm font-bold border-b border-gray-300 pb-2 text-center" style={{ borderColor: customization.tableColor }}>
                Arrêtée le présent {type === 'invoice' ? 'facture' : 'devis'} à la somme de :
              </p>
              <p className="text-sm pt-2">• {data.totalInWords}</p>
            </div>

            {/* TVA / Totaux */}
            <div className="min-w-0 bg-gray-50 border border-gray-200 rounded p-4" style={{ borderColor: customization.tableColor }}>
              <div className="flex justify-between text-sm mb-2">
                <span>Total HT :</span>
                <span className="font-medium">{formatAmount(data.subtotal)} MAD</span>
              </div>
              <div className="text-sm mb-2">
                {vatRates.map((rate) => {
                  const g = vatGroups[rate];
                  const showProducts = g.products.length === 1;
                  return (
                    <div key={rate} className="flex justify-between">
                      <span>
                        TVA : {rate}%{' '}
                        {showProducts && <span style={{ fontSize: 10, color: '#555' }}>({g.products[0]})</span>}
                      </span>
                      <span className="font-medium">{formatAmount(g.amount)} MAD</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-gray-300 pt-3" style={{ borderColor: customization.tableColor }}>
                <span>TOTAL TTC :</span>
                <span>{formatAmount(data.totalTTC)} MAD</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== BLOC SIGNATURE (séparé) ===== */}
        <section className={INVOICE_SIGNATURE_SECTION_CLASS} style={getInvoiceSignatureSectionStyle(customization)}>
          <div className={`bg-gray-50 border border-gray-300 ${INVOICE_SIGNATURE_BOX_CLASS}`} style={{ borderColor: customization.tableColor, ...getInvoiceSignatureBoxStyle(customization) }}>
            <div className="text-sm font-bold">Signature</div>
            <div className={`border-2 border-gray-400 ${INVOICE_SIGNATURE_FRAME_CLASS}`} style={{ borderColor: customization.tableColor, ...getInvoiceSignatureFrameStyle(customization) }}>
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

      {/* FOOTER (exclu; répété) */}
      <div className="pdf-footer pdf-exclude" style={{ position:'absolute', bottom:0, left:0, right:0, height: FOOTER_H }}>
        <div className="bg-white text-black border-t border-gray-300 p-6 text-sm text-center h-full" style={{ color: customization.textColor, borderColor: customization.tableColor, ...getInvoiceFooterTextStyle(customization) }}>
          <p>
            <strong>{company?.name || '-'}</strong> | {company?.address || '-'} | <strong>Tél :</strong> {company?.phone || '-'} | <strong>ICE :</strong> {company?.ice || '-'} | <strong>IF:</strong> {company?.if || '-'} | <strong>RC:</strong> {company?.rc || '-'} | <strong>CNSS:</strong> {company?.cnss || '-'} | <strong>Patente :</strong> {company?.patente || '-'} | <strong>EMAIL :</strong> {company?.email || '-'} | <strong>SITE WEB :</strong> {company?.website || '-'}
          </p>
        </div>
      </div>
    </div>
  );
}

// src/components/templates/Template5Premium.tsx
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
  getInvoiceSignatureBoxStyle,
  getInvoiceSignatureFrameStyle,
  getInvoiceSignatureImageStyle,
  getInvoiceSignatureSectionStyle,
  resolveInvoiceTemplateCustomization,
  templateFontSizeStyle,
} from './invoiceTemplateLayout';

interface TemplateProps {
  data: Invoice | Quote;
  type: 'invoice' | 'quote';
  includeSignature?: boolean;
  companyOverride?: TemplateCompany;
}

export default function Template5Premium({ data, type, includeSignature = false, companyOverride }: TemplateProps) {
  const { user } = useAuth();
  const company = companyOverride || user?.company;
  const title = type === 'invoice' ? 'FACTURE' : 'DEVIS';
  const THEME = '#0a1f44';
  const ACCENT = '#c1121f';

  const DEFAULT_HEADER_H = 170;
  const DEFAULT_FOOTER_H = 120;
  const customization = resolveInvoiceTemplateCustomization(company, {
    companyNameFontSize: 30,
    documentTitleFontSize: 30,
    clientNameFontSize: 14,
    clientInfoFontSize: 14,
    footerTextFontSize: 14,
    signatureSpacing: 12,
    signatureBoxWidth: 192,
    signatureBoxHeight: 64,
    signatureAlign: 'right',
    tableColor: THEME,
    textColor: '#111827',
    headerHeight: DEFAULT_HEADER_H,
    footerHeight: DEFAULT_FOOTER_H,
  });
  const HEADER_H = customization.headerHeight;
  const FOOTER_H = customization.footerHeight;

  // ----- format helpers -----
  const normUnit = (u?: string) => (u || 'unité').toLowerCase().trim();
  const is3decUnit = (u?: string) =>
    /^(t|tonne|tonnes|kg|kilogram(?:me|mes)?|l|litre|litres|liter|liters)$/.test(normUnit(u));
  const formatQty = (q: number, u?: string) =>
    q.toLocaleString('fr-FR', {
      minimumFractionDigits: is3decUnit(u) ? 3 : 0,
      maximumFractionDigits: is3decUnit(u) ? 3 : 0,
    });
  const formatAmount = (n: number) =>
    n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const vatGroups = data.items.reduce(
    (acc: Record<number, { amount: number; products: string[] }>, item) => {
      const vat = (item.unitPrice * item.quantity * item.vatRate) / 100;
      if (!acc[item.vatRate]) acc[item.vatRate] = { amount: 0, products: [] };
      acc[item.vatRate].amount += vat;
      acc[item.vatRate].products.push(item.description);
      return acc;
    },
    {}
  );
  const vatRates = Object.keys(vatGroups).map(Number).sort((a, b) => a - b);

  return (
    <div className="bg-white mx-auto relative" style={{ ...INVOICE_PAGE_STYLE, color: customization.textColor }}>
      {/* ===== HEADER (exclu, repeint par page) ===== */}
      <div className="pdf-header pdf-exclude" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_H }}>
        <div className="relative" style={{ background: customization.tableColor, color: '#fff', height: '100%' }}>
          <div className="h-full flex items-center justify-between px-8">
            {company?.logo ? (
              <img src={company.logo} alt="Logo" crossOrigin="anonymous" referrerPolicy="no-referrer" className="mx-auto" style={{ height: 120, width: 120, objectFit: 'contain' }} />
            ) : (
              <div style={{ width: 160 }} />
            )}
            <div className="flex-1 text-center">
              <h1 className="font-extrabold" style={templateFontSizeStyle(customization.companyNameFontSize)}>{company?.name || '-'}</h1>
              <h2 className="font-bold mt-6 uppercase tracking-wide" style={templateFontSizeStyle(customization.documentTitleFontSize)}>{title}</h2>
            </div>
            <div className="w-5" />
          </div>
         
        </div>
      </div>

      {/* ===== CONTENU ===== */}
      <div className="pdf-content" style={getInvoiceContentStyle(HEADER_H, FOOTER_H)}>
        {/* CLIENT + DATES */}
        <div className={`${INVOICE_TOP_SECTION_CLASS} border-b border-black`} style={{ borderColor: customization.tableColor }}>
          <div className={INVOICE_TOP_GRID_CLASS}>
            <div className={`bg-gray-50 ${INVOICE_INFO_CARD_CLASS} rounded border border-black text-center`} style={{ borderColor: customization.tableColor }}>
              <h3 className="font-bold text-black mb-3 border-b border-black pb-2" style={{ color: customization.textColor, borderColor: customization.tableColor, ...templateFontSizeStyle(customization.clientNameFontSize) }}>
                CLIENT : {data.client.name} {data.client.address}
              </h3>
              <p className="text-black" style={{ color: customization.textColor, ...templateFontSizeStyle(customization.clientInfoFontSize) }}><strong>ICE:</strong> {data.client.ice}</p>
            </div>
            <div className={`bg-gray-50 ${INVOICE_INFO_CARD_CLASS} rounded border border-black text-center`} style={{ borderColor: customization.tableColor }}>
              <h3 className="font-bold text-black mb-3 border-b border-black pb-2" style={{ color: customization.textColor, borderColor: customization.tableColor, ...templateFontSizeStyle(customization.clientNameFontSize) }}>
                DATE : {new Date(data.date).toLocaleDateString('fr-FR')}
              </h3>
              <p className="text-black" style={{ color: customization.textColor, ...templateFontSizeStyle(customization.clientInfoFontSize) }}><strong>{title} N° :</strong> {data.number}</p>
            </div>
          </div>
        </div>

        {/* TABLE PRODUITS */}
        <div className={`${INVOICE_TABLE_SECTION_CLASS} border-b border-black`} style={{ borderColor: customization.tableColor }}>
          <table className="w-full rounded" style={{ ...INVOICE_TABLE_STYLE, border: `1px solid ${customization.tableColor}` }}>
            <colgroup>
              <col style={{ width: INVOICE_TABLE_COLUMN_WIDTHS.designation }} />
              <col style={{ width: INVOICE_TABLE_COLUMN_WIDTHS.quantity }} />
              <col style={{ width: INVOICE_TABLE_COLUMN_WIDTHS.unitPrice }} />
              <col style={{ width: INVOICE_TABLE_COLUMN_WIDTHS.total }} />
            </colgroup>
            <thead className="text-white text-sm" style={{ background: customization.tableColor }}>
              <tr>
                <th className={INVOICE_TABLE_HEAD_CELL_LEFT_CLASS}>Désignation</th>
                <th className={INVOICE_TABLE_HEAD_CELL_CLASS}>Quantité</th>
                <th className={INVOICE_TABLE_HEAD_CELL_CLASS}>P.U. HT</th>
                <th className={INVOICE_TABLE_HEAD_CELL_CLASS}>Total HT</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={index} className="avoid-break" style={{ borderTop: `1px solid ${customization.tableColor}` }}>
                  <td className={INVOICE_TABLE_DESCRIPTION_CELL_CLASS}>{item.description}</td>
                  <td className={INVOICE_TABLE_NUMERIC_CELL_CLASS}>
                    {formatQty(item.quantity, item.unit)} ({item.unit || 'unité'})
                  </td>
                  <td className={INVOICE_TABLE_NUMERIC_CELL_CLASS}>{formatAmount(item.unitPrice)} MAD</td>
                  <td className={INVOICE_TABLE_TOTAL_CELL_CLASS}>{formatAmount(item.total)} MAD</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ===== BLOC TOTAUX (seul) ===== */}
        <section className={INVOICE_TOTALS_SECTION_CLASS}>
          <div className={INVOICE_TOTALS_GRID_CLASS}>
            {/* Montant en lettres */}
            <div className="min-w-0 bg-gray-50 rounded border p-3" style={{ borderColor: customization.tableColor }}>
              <div className="text-sm font-bold text-center">
                Arrêtée le présent {type === 'invoice' ? 'facture' : 'devis'} à la somme de :
              </div>
              <div className="border-t my-2" style={{ borderColor: customization.tableColor }} />
              <p className="text-sm font-bold" style={{ color: THEME }}>• {data.totalInWords}</p>
            </div>

            {/* TVA / Totaux */}
            <div className="min-w-0 bg-gray-50 rounded border p-3" style={{ borderColor: customization.tableColor }}>
              <div className="flex justify-between mb-2 text-sm">
                <span>Total HT :</span>
                <span className="font-medium">{formatAmount(data.subtotal)} MAD</span>
              </div>
              <div className="text-sm mb-2">
                {vatRates.map((rate) => {
                  const g = vatGroups[rate];
                  const showProducts = g.products.length === 1; // pourquoi: montrer le nom uniquement si unique
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
              <div className="flex justify-between text-sm font-bold border-t pt-2" style={{ color: customization.hasCustomTextColor ? customization.textColor : THEME, borderColor: customization.tableColor }}>
                <span>TOTAL TTC :</span>
                <span>{formatAmount(data.totalTTC)} MAD</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SIGNATURE (séparée) ===== */}
        <section className={INVOICE_SIGNATURE_SECTION_CLASS} style={getInvoiceSignatureSectionStyle(customization)}>
          <div className={`bg-gray-50 border ${INVOICE_SIGNATURE_BOX_CLASS}`} style={{ borderColor: customization.tableColor, ...getInvoiceSignatureBoxStyle(customization) }}>
            <div className="text-sm font-bold">Signature</div>
            <div className={`border-2 relative ${INVOICE_SIGNATURE_FRAME_CLASS}`} style={{ borderColor: customization.tableColor, ...getInvoiceSignatureFrameStyle(customization) }}>
              {includeSignature && company?.signature ? (
                <img
                  src={company.signature}
                  alt="Signature"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  className={INVOICE_SIGNATURE_IMAGE_CLASS}
                  style={getInvoiceSignatureImageStyle(customization)}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} /* pourquoi: éviter image cassée */
                />
              ) : (
                <span className="text-gray-400 text-sm">&nbsp;</span>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ===== FOOTER (exclu; répété par page) ===== */}
      <div className="pdf-footer pdf-exclude" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: FOOTER_H }}>
        <div className="relative" style={{ background: customization.tableColor, color: '#fff', height: '100%' }}>
         
          <div className="pt-10 p-6 text-center text-sm relative z-10" style={getInvoiceFooterTextStyle(customization)}>
            <p>
              <strong>{company?.name || '-'}</strong> | {company?.address || '-'} | <strong>Tél :</strong> {company?.phone || '-'} |
              <strong> ICE :</strong> {company?.ice || '-'} | <strong>IF:</strong> {company?.if || '-'} | <strong>RC:</strong> {company?.rc || '-'} |
              <strong> CNSS:</strong> {company?.cnss || '-'} | <strong>Patente :</strong> {company?.patente || '-'} |
              <strong> EMAIL :</strong> {company?.email || '-'} | <strong>SITE WEB :</strong> {company?.website || '-'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

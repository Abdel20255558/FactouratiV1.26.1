import React from 'react';
import { Invoice, Quote } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import type { TemplateCompany } from './Template1Classic';
import {
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
  INVOICE_TABLE_STYLE,
  INVOICE_TABLE_TOTAL_CELL_CLASS,
  INVOICE_TOTALS_SECTION_CLASS,
  getInvoiceFooterTextStyle,
  getInvoiceContentStyle,
  getInvoiceLogoBoxStyle,
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

export default function Template6Executive({ data, type, includeSignature = false, companyOverride }: TemplateProps) {
  const { user } = useAuth();
  const company = companyOverride || user?.company;
  const title = type === 'invoice' ? 'FACTURE' : 'DEVIS';
  const PRIMARY = '#1f2937';
  const SECONDARY = '#475569';
  const ACCENT = '#b45309';
  const SURFACE = '#f8fafc';
  const DEFAULT_HEADER_H = 108;
  const DEFAULT_FOOTER_H = 92;
  const customization = resolveInvoiceTemplateCustomization(company, {
    companyNameFontSize: 24,
    documentTitleFontSize: 12,
    clientNameFontSize: 18,
    clientInfoFontSize: 14,
    footerTextFontSize: 10,
    logoSize: 64,
    signatureSpacing: 12,
    signatureBoxWidth: 192,
    signatureBoxHeight: 64,
    signatureAlign: 'right',
    showSignatureBlock: true,
    tableColor: ACCENT,
    textColor: PRIMARY,
    headerHeight: DEFAULT_HEADER_H,
    footerHeight: DEFAULT_FOOTER_H,
  });
  const HEADER_H = customization.headerHeight;
  const FOOTER_H = customization.footerHeight;

  const normUnit = (u?: string) => (u || 'unite').toLowerCase().trim();
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
    (acc: Record<number, number>, item) => {
      const vat = (item.unitPrice * item.quantity * item.vatRate) / 100;
      acc[item.vatRate] = (acc[item.vatRate] || 0) + vat;
      return acc;
    },
    {}
  );

  const vatRates = Object.keys(vatGroups).map(Number).sort((a, b) => a - b);

  return (
    <div
      className="relative mx-auto bg-white"
      style={{ ...INVOICE_PAGE_STYLE, color: customization.textColor }}
    >
      <div
        className="pdf-header pdf-exclude"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_H, overflow: 'hidden' }}
      >
        <div
          className="h-full rounded-t-2xl px-8"
          style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 100%)`, color: '#fff' }}
        >
          <div className="flex h-full items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {company?.logo ? (
                <div className="h-16 w-16 rounded-2xl bg-white/10 p-2" style={getInvoiceLogoBoxStyle(customization)}>
                  <img src={company.logo} alt="Logo" crossOrigin="anonymous" referrerPolicy="no-referrer" className="h-full w-full object-contain" />
                </div>
              ) : null}
              <div>
                <h1 className="font-extrabold tracking-wide" style={templateFontSizeStyle(customization.companyNameFontSize)}>{company?.name || '-'}</h1>
                <p className="mt-1 text-sm text-white/80">{company?.activity || '-'}</p>
              </div>
            </div>

            <div className="min-w-[170px] rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-right">
              <p className="font-semibold tracking-[0.25em] text-white/70" style={templateFontSizeStyle(customization.documentTitleFontSize)}>{title}</p>
              <p className="mt-2 text-xl font-extrabold">{data.number}</p>
              <p className="mt-1 text-sm text-white/80">{new Date(data.date).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pdf-content rounded-2xl border border-slate-200" style={getInvoiceContentStyle(HEADER_H, FOOTER_H, 8)}>
        <div className="grid grid-cols-2 gap-4 px-6 py-4 avoid-break">
          <div className="rounded-2xl border p-4" style={{ borderColor: '#e2e8f0', background: SURFACE }}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: customization.tableColor }}>
              Client
            </p>
            <h3 className="mt-3 font-bold" style={templateFontSizeStyle(customization.clientNameFontSize)}>{data.client.name}</h3>
            <p className="mt-2 text-slate-600" style={{ color: customization.textColor, ...templateFontSizeStyle(customization.clientInfoFontSize) }}>{data.client.address || '-'}</p>
            <p className="mt-2" style={templateFontSizeStyle(customization.clientInfoFontSize)}><strong>ICE:</strong> {data.client.ice || '-'}</p>
          </div>

          <div className="rounded-2xl border p-4" style={{ borderColor: '#e2e8f0', background: SURFACE }}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: customization.tableColor }}>
              Informations
            </p>
            <div className="mt-3 space-y-2" style={templateFontSizeStyle(customization.clientInfoFontSize)}>
              <p><strong>Date:</strong> {new Date(data.date).toLocaleDateString('fr-FR')}</p>
              <p><strong>Document:</strong> {title}</p>
              <p><strong>Reference:</strong> {data.number}</p>
            </div>
          </div>
        </div>

        <div className="invoice-table-section px-5 pb-4" style={getInvoiceTableSectionStyle(customization)}>
          <div className="overflow-hidden rounded-2xl border" style={{ borderColor: customization.tableColor }}>
            <table className="w-full" style={INVOICE_TABLE_STYLE}>
              <colgroup>
                <col style={{ width: INVOICE_TABLE_COLUMN_WIDTHS.designation }} />
                <col style={{ width: INVOICE_TABLE_COLUMN_WIDTHS.quantity }} />
                <col style={{ width: INVOICE_TABLE_COLUMN_WIDTHS.unitPrice }} />
                <col style={{ width: INVOICE_TABLE_COLUMN_WIDTHS.total }} />
              </colgroup>
              <thead style={{ background: customization.tableColor, color: '#fff' }}>
                <tr className="text-left text-sm">
                  <th className={INVOICE_TABLE_HEAD_CELL_LEFT_CLASS}>Designation</th>
                  <th className={INVOICE_TABLE_HEAD_CELL_CLASS}>Quantite</th>
                  <th className={INVOICE_TABLE_HEAD_CELL_CLASS}>P.U. HT</th>
                  <th className={INVOICE_TABLE_HEAD_CELL_CLASS}>Total HT</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index} className="avoid-break border-t border-slate-200 text-sm">
                    <td className={INVOICE_TABLE_DESCRIPTION_CELL_CLASS}>{item.description}</td>
                    <td className={INVOICE_TABLE_NUMERIC_CELL_CLASS}>
                      {formatQty(item.quantity, item.unit)} ({item.unit || 'unite'})
                    </td>
                    <td className={INVOICE_TABLE_NUMERIC_CELL_CLASS}>{formatAmount(item.unitPrice)} MAD</td>
                    <td className={INVOICE_TABLE_TOTAL_CELL_CLASS}>{formatAmount(item.total)} MAD</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <section className={INVOICE_TOTALS_SECTION_CLASS}>
          <div className="grid grid-cols-[1.16fr_0.84fr] gap-3">
            <div className="rounded-2xl border p-4" style={{ borderColor: '#e2e8f0', background: SURFACE }}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: customization.tableColor }}>
                Arretee a la somme de
              </p>
              <p className="mt-3 text-sm font-bold leading-6">{data.totalInWords}</p>
            </div>

            <div className="rounded-2xl border p-4" style={{ borderColor: '#e2e8f0', background: SURFACE }}>
              <div className="flex items-center justify-between text-sm">
                <span>Total HT</span>
                <span className="font-semibold">{formatAmount(data.subtotal)} MAD</span>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                {vatRates.map((rate) => (
                  <div key={rate} className="flex items-center justify-between">
                    <span>TVA {rate}%</span>
                    <span className="font-semibold">{formatAmount(vatGroups[rate])} MAD</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-white" style={{ background: customization.tableColor }}>
                <span className="whitespace-nowrap font-semibold">TOTAL TTC</span>
                <span className="whitespace-nowrap text-base font-extrabold">{formatAmount(data.totalTTC)} MAD</span>
              </div>
            </div>
          </div>
        </section>

        <section className={INVOICE_SIGNATURE_SECTION_CLASS} style={{ ...getInvoiceSignatureSectionStyle(customization), display: customization.showSignatureBlock ? undefined : 'none' }}>
          <div className={`${INVOICE_SIGNATURE_BOX_CLASS} rounded-2xl border`} style={{ borderColor: customization.tableColor, background: SURFACE, ...getInvoiceSignatureBoxStyle(customization) }}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: customization.tableColor }}>
              Signature
            </p>
            <div className={`${INVOICE_SIGNATURE_FRAME_CLASS} rounded-xl border-dashed border-slate-300 bg-white`} style={{ borderColor: customization.tableColor, ...getInvoiceSignatureFrameStyle(customization) }}>
              {includeSignature && company?.signature ? (
                <img
                  src={company.signature}
                  alt="Signature"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  className={INVOICE_SIGNATURE_IMAGE_CLASS}
                  style={getInvoiceSignatureImageStyle(customization)}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <span className="text-sm text-slate-400">&nbsp;</span>
              )}
            </div>
          </div>
        </section>
      </div>

      <div
        className="pdf-footer pdf-exclude"
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: FOOTER_H }}
      >
        <div className="h-full border-t border-slate-200 bg-white px-8 py-4">
          <div className="text-[10px] leading-5 text-slate-600" style={getInvoiceFooterTextStyle(customization)}>
            <p>
              <strong>{company?.name || '-'}</strong> | Activite: {company?.activity || '-'} | Adresse: {company?.address || '-'} |
              {' '}ICE: {company?.ice || '-'} | IF: {company?.if || '-'} | RC: {company?.rc || '-'} | CNSS: {company?.cnss || '-'} |
              {' '}Patente: {company?.patente || '-'} | Tel: {company?.phone || '-'} | Email: {company?.email || '-'}
              {company?.website ? ` | Site web: ${company.website}` : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

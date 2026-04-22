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

export default function Template7Atlas({ data, type, includeSignature = false, companyOverride }: TemplateProps) {
  const { user } = useAuth();
  const company = companyOverride || user?.company;
  const title = type === 'invoice' ? 'FACTURE' : 'DEVIS';
  const INK = '#0f172a';
  const PRIMARY = '#065f46';
  const ACCENT = '#0f766e';
  const SURFACE = '#f8fafc';
  const SOFT = '#ecfdf5';
  const BORDER = '#dbe4ea';
  const DEFAULT_HEADER_H = 136;
  const DEFAULT_FOOTER_H = 94;
  const customization = resolveInvoiceTemplateCustomization(company, {
    companyNameFontSize: 33,
    documentTitleFontSize: 11,
    clientNameFontSize: 16,
    clientInfoFontSize: 14,
    footerTextFontSize: 10,
    logoSize: 80,
    signatureSpacing: 12,
    signatureBoxWidth: 192,
    signatureBoxHeight: 64,
    signatureAlign: 'right',
    showSignatureBlock: true,
    tableColor: PRIMARY,
    textColor: INK,
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
          className="h-full rounded-t-2xl px-8 py-2"
          style={{ background: `linear-gradient(135deg, ${INK} 0%, ${PRIMARY} 100%)`, color: '#fff' }}
        >
          <div className="flex h-full items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {company?.logo ? (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 p-2 shadow-sm" style={getInvoiceLogoBoxStyle(customization)}>
                  <img src={company.logo} alt="Logo" crossOrigin="anonymous" referrerPolicy="no-referrer" className="h-full w-full object-contain" />
                </div>
              ) : null}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">Entreprise</p>
                <h1 className="mt-1 font-extrabold leading-none" style={templateFontSizeStyle(customization.companyNameFontSize)}>{company?.name || '-'}</h1>
                <p className="mt-2 text-[15px] text-white/80">{company?.activity || 'Gestion et facturation professionnelle'}</p>
              </div>
            </div>

            <div className="min-w-[210px] rounded-3xl border border-white/15 bg-white/10 px-6 py-5 text-right shadow-sm">
              <p className="font-semibold uppercase tracking-[0.35em] text-white/70" style={templateFontSizeStyle(customization.documentTitleFontSize)}>{title}</p>
              <p className="mt-2 text-[21px] font-extrabold leading-none">{data.number}</p>
              <p className="mt-2 text-sm text-white/80">{new Date(data.date).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
        </div>
      </div>

      <div
        className="pdf-content rounded-2xl border bg-white"
        style={{ borderColor: BORDER, ...getInvoiceContentStyle(HEADER_H, FOOTER_H, 8) }}
      >
        <div className="grid grid-cols-2 gap-4 px-6 py-4 avoid-break">
          <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: SURFACE }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: customization.tableColor }}>
              Client
            </p>
            <h3 className="mt-3 font-bold" style={templateFontSizeStyle(customization.clientNameFontSize, 1.35)}>
              {data.client.name}
              {data.client.address ? ` - ${data.client.address}` : ''}
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-1" style={templateFontSizeStyle(customization.clientInfoFontSize)}>
              <p><strong>ICE:</strong> {data.client.ice || '-'}</p>
            </div>
          </div>

          <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: SOFT }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: customization.tableColor }}>
              Informations
            </p>
            <div className="mt-3 space-y-2" style={templateFontSizeStyle(customization.clientInfoFontSize)}>
              <p><strong>Date:</strong> {new Date(data.date).toLocaleDateString('fr-FR')}</p>
              <p><strong>Document:</strong> {title}</p>
              <p><strong>Reference:</strong> {data.number}</p>
              {type === 'quote' && 'validUntil' in data && data.validUntil ? (
                <p><strong>Validite:</strong> {new Date(data.validUntil).toLocaleDateString('fr-FR')}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="invoice-table-section px-5 pb-4" style={getInvoiceTableSectionStyle(customization)}>
          <div className="overflow-hidden rounded-3xl border" style={{ borderColor: BORDER }}>
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
                  <tr
                    key={index}
                    className="avoid-break border-t text-sm"
                    style={{ borderColor: BORDER, background: index % 2 === 0 ? '#ffffff' : SURFACE }}
                  >
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
          <div className="grid grid-cols-[1.12fr_0.88fr] gap-3">
            <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: SURFACE }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: customization.tableColor }}>
                Arretee a la somme de
              </p>
              <p className="mt-3 text-sm font-bold leading-6">{data.totalInWords}</p>
            </div>

            <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: SOFT }}>
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
              <div
                className="mt-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-white"
                style={{ background: `linear-gradient(135deg, ${customization.tableColor} 0%, ${ACCENT} 100%)` }}
              >
                <span className="whitespace-nowrap font-semibold tracking-wide">TOTAL TTC</span>
                <span className="whitespace-nowrap text-base font-extrabold">{formatAmount(data.totalTTC)} MAD</span>
              </div>
            </div>
          </div>
        </section>

        <section className={INVOICE_SIGNATURE_SECTION_CLASS} style={{ ...getInvoiceSignatureSectionStyle(customization), display: customization.showSignatureBlock ? undefined : 'none' }}>
          <div className={`${INVOICE_SIGNATURE_BOX_CLASS} rounded-3xl border`} style={{ borderColor: BORDER, background: SURFACE, ...getInvoiceSignatureBoxStyle(customization) }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: customization.tableColor }}>
              Signature
            </p>
            <div className={`${INVOICE_SIGNATURE_FRAME_CLASS} rounded-2xl border-dashed bg-white`} style={{ borderColor: BORDER, ...getInvoiceSignatureFrameStyle(customization) }}>
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
        <div className="h-full border-t bg-white px-8 py-4" style={{ borderColor: BORDER }}>
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

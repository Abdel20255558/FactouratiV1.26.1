import React from 'react';
import { Invoice, Quote } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import type { TemplateCompany } from './Template1Classic';

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
  const HEADER_H = 108;
  const FOOTER_H = 92;

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
      style={{ fontFamily: 'Arial, sans-serif', width: '100%', maxWidth: 750, color: PRIMARY }}
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
                <div className="h-16 w-16 rounded-2xl bg-white/10 p-2">
                  <img src={company.logo} alt="Logo" className="h-full w-full object-contain" />
                </div>
              ) : null}
              <div>
                <h1 className="text-2xl font-extrabold tracking-wide">{company?.name || '-'}</h1>
                <p className="mt-1 text-sm text-white/80">{company?.activity || '-'}</p>
              </div>
            </div>

            <div className="min-w-[170px] rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-right">
              <p className="text-xs font-semibold tracking-[0.25em] text-white/70">{title}</p>
              <p className="mt-2 text-xl font-extrabold">{data.number}</p>
              <p className="mt-1 text-sm text-white/80">{new Date(data.date).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pdf-content rounded-2xl border border-slate-200" style={{ paddingTop: HEADER_H + 8, paddingBottom: FOOTER_H + 8 }}>
        <div className="grid grid-cols-2 gap-6 px-8 py-5 avoid-break">
          <div className="rounded-2xl border p-5" style={{ borderColor: '#e2e8f0', background: SURFACE }}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
              Client
            </p>
            <h3 className="mt-3 text-lg font-bold">{data.client.name}</h3>
            <p className="mt-2 text-sm text-slate-600">{data.client.address || '-'}</p>
            <p className="mt-2 text-sm"><strong>ICE:</strong> {data.client.ice || '-'}</p>
          </div>

          <div className="rounded-2xl border p-5" style={{ borderColor: '#e2e8f0', background: SURFACE }}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
              Informations
            </p>
            <div className="mt-3 space-y-2 text-sm">
              <p><strong>Date:</strong> {new Date(data.date).toLocaleDateString('fr-FR')}</p>
              <p><strong>Document:</strong> {title}</p>
              <p><strong>Reference:</strong> {data.number}</p>
            </div>
          </div>
        </div>

        <div className="px-8 pb-6">
          <div className="overflow-hidden rounded-2xl border" style={{ borderColor: '#cbd5e1' }}>
            <table className="w-full">
              <thead style={{ background: '#e2e8f0' }}>
                <tr className="text-left text-sm">
                  <th className="px-4 py-3 font-semibold">Designation</th>
                  <th className="px-4 py-3 text-center font-semibold">Quantite</th>
                  <th className="px-4 py-3 text-center font-semibold">P.U. HT</th>
                  <th className="px-4 py-3 text-center font-semibold">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index} className="avoid-break border-t border-slate-200 text-sm">
                    <td className="px-4 py-3">{item.description}</td>
                    <td className="px-4 py-3 text-center">
                      {formatQty(item.quantity, item.unit)} ({item.unit || 'unite'})
                    </td>
                    <td className="px-4 py-3 text-center">{formatAmount(item.unitPrice)} MAD</td>
                    <td className="px-4 py-3 text-center font-semibold">{formatAmount(item.total)} MAD</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <section className="keep-together px-8 pb-6">
          <div className="grid grid-cols-[1.2fr_0.8fr] gap-4">
            <div className="rounded-2xl border p-5" style={{ borderColor: '#e2e8f0', background: SURFACE }}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
                Arretee a la somme de
              </p>
              <p className="mt-3 text-sm font-bold leading-6">{data.totalInWords}</p>
            </div>

            <div className="rounded-2xl border p-5" style={{ borderColor: '#e2e8f0', background: SURFACE }}>
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
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-white" style={{ background: ACCENT }}>
                <span className="whitespace-nowrap font-semibold">TOTAL TTC</span>
                <span className="whitespace-nowrap text-base font-extrabold">{formatAmount(data.totalTTC)} MAD</span>
              </div>
            </div>
          </div>
        </section>

        <section className="px-8 pb-6 avoid-break">
          <div className="ml-auto w-52 rounded-2xl border p-4 text-center" style={{ borderColor: '#e2e8f0', background: SURFACE }}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
              Signature
            </p>
            <div className="mt-3 flex h-20 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white">
              {includeSignature && company?.signature ? (
                <img
                  src={company.signature}
                  alt="Signature"
                  className="max-h-16 max-w-full object-contain"
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
          <div className="text-[10px] leading-5 text-slate-600">
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

import React from 'react';
import { Invoice, Quote } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

interface TemplateProps {
  data: Invoice | Quote;
  type: 'invoice' | 'quote';
  includeSignature?: boolean;
}

export default function Template7Atlas({ data, type, includeSignature = false }: TemplateProps) {
  const { user } = useAuth();
  const title = type === 'invoice' ? 'FACTURE' : 'DEVIS';
  const INK = '#0f172a';
  const PRIMARY = '#065f46';
  const ACCENT = '#0f766e';
  const SURFACE = '#f8fafc';
  const SOFT = '#ecfdf5';
  const BORDER = '#dbe4ea';
  const HEADER_H = 116;
  const FOOTER_H = 94;

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
      style={{ fontFamily: 'Arial, sans-serif', width: '100%', maxWidth: 750, color: INK }}
    >
      <div
        className="pdf-header pdf-exclude"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_H, overflow: 'hidden' }}
      >
        <div
          className="h-full rounded-t-2xl px-8"
          style={{ background: `linear-gradient(135deg, ${INK} 0%, ${PRIMARY} 100%)`, color: '#fff' }}
        >
          <div className="flex h-full items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {user?.company.logo ? (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 p-2 shadow-sm">
                  <img src={user.company.logo} alt="Logo" className="h-full w-full object-contain" />
                </div>
              ) : null}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">Entreprise</p>
                <h1 className="mt-1 text-[28px] font-extrabold leading-none">{user?.company.name}</h1>
                <p className="mt-2 text-sm text-white/80">{user?.company.activity || 'Gestion et facturation professionnelle'}</p>
              </div>
            </div>

            <div className="min-w-[190px] rounded-3xl border border-white/15 bg-white/10 px-5 py-4 text-right shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/70">{title}</p>
              <p className="mt-2 text-[18px] font-extrabold leading-none">{data.number}</p>
              <p className="mt-2 text-sm text-white/80">{new Date(data.date).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
        </div>
      </div>

      <div
        className="pdf-content rounded-2xl border bg-white"
        style={{ borderColor: BORDER, paddingTop: HEADER_H + 8, paddingBottom: FOOTER_H + 8 }}
      >
        <div className="grid grid-cols-2 gap-5 px-8 py-5 avoid-break">
          <div className="rounded-3xl border p-5" style={{ borderColor: BORDER, background: SURFACE }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: ACCENT }}>
              Client
            </p>
            <h3 className="mt-3 text-xl font-bold">
              {data.client.name}
              {data.client.address ? ` - ${data.client.address}` : ''}
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-1 text-sm">
              <p><strong>ICE:</strong> {data.client.ice || '-'}</p>
            </div>
          </div>

          <div className="rounded-3xl border p-5" style={{ borderColor: BORDER, background: SOFT }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: ACCENT }}>
              Informations
            </p>
            <div className="mt-3 space-y-2 text-sm">
              <p><strong>Date:</strong> {new Date(data.date).toLocaleDateString('fr-FR')}</p>
              <p><strong>Document:</strong> {title}</p>
              <p><strong>Reference:</strong> {data.number}</p>
              {type === 'quote' && 'validUntil' in data && data.validUntil ? (
                <p><strong>Validite:</strong> {new Date(data.validUntil).toLocaleDateString('fr-FR')}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="px-8 pb-6">
          <div className="overflow-hidden rounded-3xl border" style={{ borderColor: BORDER }}>
            <table className="w-full">
              <thead style={{ background: INK, color: '#fff' }}>
                <tr className="text-left text-sm">
                  <th className="px-4 py-3 font-semibold">Designation</th>
                  <th className="px-4 py-3 text-center font-semibold">Quantite</th>
                  <th className="px-4 py-3 text-center font-semibold">P.U. HT</th>
                  <th className="px-4 py-3 text-center font-semibold">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr
                    key={index}
                    className="avoid-break border-t text-sm"
                    style={{ borderColor: BORDER, background: index % 2 === 0 ? '#ffffff' : SURFACE }}
                  >
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
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border p-5" style={{ borderColor: BORDER, background: SURFACE }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: ACCENT }}>
                Arretee a la somme de
              </p>
              <p className="mt-3 text-sm font-bold leading-6">{data.totalInWords}</p>
            </div>

            <div className="rounded-3xl border p-5" style={{ borderColor: BORDER, background: SOFT }}>
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
                style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${ACCENT} 100%)` }}
              >
                <span className="whitespace-nowrap font-semibold tracking-wide">TOTAL TTC</span>
                <span className="whitespace-nowrap text-base font-extrabold">{formatAmount(data.totalTTC)} MAD</span>
              </div>
            </div>
          </div>
        </section>

        <section className="px-8 pb-6 avoid-break">
          <div className="ml-auto w-52 rounded-3xl border p-4 text-center" style={{ borderColor: BORDER, background: SURFACE }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: ACCENT }}>
              Signature
            </p>
            <div className="mt-3 flex h-20 items-center justify-center rounded-2xl border border-dashed bg-white" style={{ borderColor: BORDER }}>
              {includeSignature && user?.company?.signature ? (
                <img
                  src={user.company.signature}
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
        <div className="h-full border-t bg-white px-8 py-4" style={{ borderColor: BORDER }}>
          <div className="text-[10px] leading-5 text-slate-600">
            <p>
              <strong>{user?.company.name}</strong> | Activite: {user?.company.activity || '-'} | Adresse: {user?.company.address || '-'} |
              {' '}ICE: {user?.company.ice} | IF: {user?.company.if} | RC: {user?.company.rc} | CNSS: {user?.company.cnss} |
              {' '}Patente: {user?.company.patente} | Tel: {user?.company.phone} | Email: {user?.company.email}
              {user?.company.website ? ` | Site web: ${user.company.website}` : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

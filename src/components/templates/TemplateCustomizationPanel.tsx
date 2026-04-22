import React from 'react';
import {
  DEFAULT_TEMPLATE_CUSTOMIZATION,
  type InvoiceTemplateCustomization,
} from './invoiceTemplateLayout';

export type TemplateCustomizationState = Required<InvoiceTemplateCustomization>;

type NumericCustomizationField =
  | 'companyNameFontSize'
  | 'documentTitleFontSize'
  | 'clientNameFontSize'
  | 'clientInfoFontSize'
  | 'footerTextFontSize'
  | 'logoSize'
  | 'tableTopSpacing'
  | 'tableBottomSpacing'
  | 'signatureSpacing'
  | 'signatureBoxWidth'
  | 'signatureBoxHeight'
  | 'headerHeight'
  | 'footerHeight';

type ColorCustomizationField = 'tableColor' | 'textColor';
type AlignmentCustomizationField = 'signatureAlign';
type BooleanCustomizationField = 'showSignatureBlock';

interface TemplateCustomizationPanelProps {
  value: TemplateCustomizationState;
  onChange: (value: TemplateCustomizationState) => void;
  onSave: () => void;
  onReset: () => void;
  isSaving?: boolean;
  saveSuccess?: boolean;
  disabled?: boolean;
}

type NumericFieldConfig = { field: NumericCustomizationField; label: string; placeholder: string; helper?: string };

const typographyFields: NumericFieldConfig[] = [
  { field: 'companyNameFontSize', label: 'Taille nom entreprise', placeholder: 'Ex: 28' },
  { field: 'documentTitleFontSize', label: 'Taille titre FACTURE/DEVIS', placeholder: 'Ex: 26' },
  { field: 'logoSize', label: 'Taille logo', placeholder: 'Ex: 90' },
  { field: 'clientNameFontSize', label: 'Taille nom client', placeholder: 'Ex: 14' },
  { field: 'clientInfoFontSize', label: 'Taille adresse / infos', placeholder: 'Ex: 13' },
  { field: 'footerTextFontSize', label: 'Taille texte footer', placeholder: 'Ex: 10' },
];

const layoutFields: NumericFieldConfig[] = [
  { field: 'headerHeight', label: 'Hauteur de la tete', placeholder: 'Ex: 140' },
  { field: 'footerHeight', label: 'Hauteur du footer', placeholder: 'Ex: 95' },
  { field: 'tableTopSpacing', label: 'Espace avant tableau', placeholder: 'Ex: 12', helper: 'Distance entre les infos client/date et le tableau.' },
  { field: 'tableBottomSpacing', label: 'Espace apres tableau', placeholder: 'Ex: 12', helper: 'Distance entre le tableau et les totaux.' },
];

const signatureFields: NumericFieldConfig[] = [
  { field: 'signatureSpacing', label: 'Distance signature', placeholder: 'Ex: 22', helper: 'Distance entre les totaux et la signature.' },
  { field: 'signatureBoxWidth', label: 'Largeur bloc signature', placeholder: 'Ex: 210' },
  { field: 'signatureBoxHeight', label: 'Hauteur bloc signature', placeholder: 'Ex: 78' },
];

export function createTemplateCustomizationState(
  value?: InvoiceTemplateCustomization,
): TemplateCustomizationState {
  return {
    ...DEFAULT_TEMPLATE_CUSTOMIZATION,
    ...(value || {}),
  };
}

export default function TemplateCustomizationPanel({
  value,
  onChange,
  onSave,
  onReset,
  isSaving = false,
  saveSuccess = false,
  disabled = false,
}: TemplateCustomizationPanelProps) {
  const updateNumber = (field: NumericCustomizationField, nextValue: string) => {
    onChange({
      ...value,
      [field]: nextValue === '' ? 0 : Math.max(0, Number(nextValue) || 0),
    });
  };

  const updateColor = (field: ColorCustomizationField, nextValue: string) => {
    onChange({
      ...value,
      [field]: nextValue,
    });
  };

  const updateAlignment = (field: AlignmentCustomizationField, nextValue: TemplateCustomizationState[AlignmentCustomizationField]) => {
    onChange({
      ...value,
      [field]: nextValue,
    });
  };

  const updateBoolean = (field: BooleanCustomizationField, nextValue: boolean) => {
    onChange({
      ...value,
      [field]: nextValue,
    });
  };

  const renderNumberField = ({ field, label, placeholder, helper }: NumericFieldConfig) => (
    <label key={field} className="block text-xs font-semibold text-slate-700">
      {label} (px)
      <input
        type="number"
        min="0"
        value={value[field] || ''}
        onChange={(event) => updateNumber(field, event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
      />
      {helper ? <span className="mt-1 block text-[11px] font-medium leading-4 text-slate-500">{helper}</span> : null}
    </label>
  );

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm">
      <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">Personnalisation PDF</p>
          <h4 className="mt-1 text-lg font-black text-slate-950">Style du document</h4>
          <p className="mt-1 text-xs text-slate-500">
            Les changements s'affichent tout de suite sur l'apercu. Laissez vide ou 0 pour garder le style automatique.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={disabled || isSaving}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white disabled:opacity-50"
          >
            Reinitialiser
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={disabled || isSaving}
            className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
          >
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder ce style'}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 shadow-sm animate-pulse">
          Votre style est personnalise et sauvegarde avec succes.
        </div>
      )}

      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h5 className="text-sm font-black text-slate-950">Typographie</h5>
          <p className="mt-1 text-xs text-slate-500">Controlez les tailles des textes principaux du document.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {typographyFields.map(renderNumberField)}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h5 className="text-sm font-black text-slate-950">Couleurs</h5>
          <p className="mt-1 text-xs text-slate-500">Personnalisez la couleur du tableau et la couleur generale de l'ecriture.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700">
              Couleur du tableau
              <div className="mt-1 flex gap-2">
                <input
                  type="color"
                  value={value.tableColor || '#0f172a'}
                  onChange={(event) => updateColor('tableColor', event.target.value)}
                  disabled={disabled}
                  className="h-10 w-12 rounded border border-slate-300 bg-white p-1 disabled:opacity-60"
                />
                <input
                  type="text"
                  value={value.tableColor}
                  onChange={(event) => updateColor('tableColor', event.target.value)}
                  disabled={disabled}
                  placeholder="Auto ou #0f172a"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
                />
              </div>
            </label>

            <label className="text-xs font-semibold text-slate-700">
              Couleur de l'ecriture
              <div className="mt-1 flex gap-2">
                <input
                  type="color"
                  value={value.textColor || '#111827'}
                  onChange={(event) => updateColor('textColor', event.target.value)}
                  disabled={disabled}
                  className="h-10 w-12 rounded border border-slate-300 bg-white p-1 disabled:opacity-60"
                />
                <input
                  type="text"
                  value={value.textColor}
                  onChange={(event) => updateColor('textColor', event.target.value)}
                  disabled={disabled}
                  placeholder="Auto ou #111827"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
                />
              </div>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h5 className="text-sm font-black text-slate-950">Espacements et page</h5>
          <p className="mt-1 text-xs text-slate-500">Ajustez la respiration entre les blocs, surtout autour du tableau.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {layoutFields.map(renderNumberField)}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h5 className="text-sm font-black text-slate-950">Signature</h5>
          <p className="mt-1 text-xs text-slate-500">Placez et dimensionnez le bloc signature sans casser la mise en page PDF.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {signatureFields.map(renderNumberField)}
            <label className="text-xs font-semibold text-slate-700">
              Afficher le bloc signature
              <select
                value={value.showSignatureBlock ? 'yes' : 'no'}
                onChange={(event) => updateBoolean('showSignatureBlock', event.target.value === 'yes')}
                disabled={disabled}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
              >
                <option value="yes">Oui, afficher</option>
                <option value="no">Non, retirer</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Position du bloc signature
              <select
                value={value.signatureAlign}
                onChange={(event) => updateAlignment('signatureAlign', event.target.value as TemplateCustomizationState['signatureAlign'])}
                disabled={disabled}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
              >
                <option value="right">A droite</option>
                <option value="left">A gauche</option>
              </select>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}

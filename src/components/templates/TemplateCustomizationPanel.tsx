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
  | 'signatureSpacing'
  | 'signatureBoxWidth'
  | 'signatureBoxHeight'
  | 'headerHeight'
  | 'footerHeight';

type ColorCustomizationField = 'tableColor' | 'textColor';
type AlignmentCustomizationField = 'signatureAlign';

interface TemplateCustomizationPanelProps {
  value: TemplateCustomizationState;
  onChange: (value: TemplateCustomizationState) => void;
  onSave: () => void;
  onReset: () => void;
  isSaving?: boolean;
  disabled?: boolean;
}

const numericFields: Array<{ field: NumericCustomizationField; label: string; placeholder: string }> = [
  { field: 'companyNameFontSize', label: 'Taille nom entreprise', placeholder: 'Ex: 28' },
  { field: 'documentTitleFontSize', label: 'Taille titre FACTURE/DEVIS', placeholder: 'Ex: 26' },
  { field: 'clientNameFontSize', label: 'Taille nom client', placeholder: 'Ex: 14' },
  { field: 'clientInfoFontSize', label: 'Taille adresse / infos', placeholder: 'Ex: 13' },
  { field: 'footerTextFontSize', label: 'Taille texte footer', placeholder: 'Ex: 10' },
  { field: 'headerHeight', label: 'Hauteur de la tete', placeholder: 'Ex: 140' },
  { field: 'footerHeight', label: 'Hauteur du footer', placeholder: 'Ex: 95' },
  { field: 'signatureSpacing', label: 'Distance signature', placeholder: 'Ex: 22' },
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

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="font-semibold text-slate-950">Style du document</h4>
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {numericFields.map(({ field, label, placeholder }) => (
          <label key={field} className="text-xs font-semibold text-slate-700">
            {label} (px)
            <input
              type="number"
              min="0"
              value={value[field] || ''}
              onChange={(event) => updateNumber(field, event.target.value)}
              disabled={disabled}
              placeholder={placeholder}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
            />
          </label>
        ))}

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
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
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
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
            />
          </div>
        </label>

        <label className="text-xs font-semibold text-slate-700">
          Position du bloc signature
          <select
            value={value.signatureAlign}
            onChange={(event) => updateAlignment('signatureAlign', event.target.value as TemplateCustomizationState['signatureAlign'])}
            disabled={disabled}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
          >
            <option value="right">A droite</option>
            <option value="left">A gauche</option>
          </select>
        </label>
      </div>
    </div>
  );
}

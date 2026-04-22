import type { CSSProperties } from 'react';

export type InvoiceTemplateCustomization = Partial<{
  companyNameFontSize: number;
  documentTitleFontSize: number;
  clientNameFontSize: number;
  clientInfoFontSize: number;
  footerTextFontSize: number;
  signatureSpacing: number;
  signatureBoxWidth: number;
  signatureBoxHeight: number;
  signatureAlign: 'left' | 'right';
  tableColor: string;
  textColor: string;
  headerHeight: number;
  footerHeight: number;
}>;

export type ResolvedInvoiceTemplateCustomization = {
  companyNameFontSize: number;
  documentTitleFontSize: number;
  clientNameFontSize: number;
  clientInfoFontSize: number;
  footerTextFontSize: number;
  signatureSpacing: number;
  signatureBoxWidth: number;
  signatureBoxHeight: number;
  signatureAlign: 'left' | 'right';
  tableColor: string;
  textColor: string;
  headerHeight: number;
  footerHeight: number;
  hasCustomTableColor: boolean;
  hasCustomTextColor: boolean;
};

export const DEFAULT_TEMPLATE_CUSTOMIZATION: Required<InvoiceTemplateCustomization> = {
  companyNameFontSize: 0,
  documentTitleFontSize: 0,
  clientNameFontSize: 0,
  clientInfoFontSize: 0,
  footerTextFontSize: 0,
  signatureSpacing: 0,
  signatureBoxWidth: 0,
  signatureBoxHeight: 0,
  signatureAlign: 'right',
  tableColor: '',
  textColor: '',
  headerHeight: 0,
  footerHeight: 0,
};

export const INVOICE_PAGE_STYLE: CSSProperties = {
  fontFamily: 'Arial, sans-serif',
  width: '100%',
  maxWidth: 790,
};

export const INVOICE_TABLE_COLUMN_WIDTHS = {
  designation: '46%',
  quantity: '14%',
  unitPrice: '20%',
  total: '20%',
} as const;

export const INVOICE_TABLE_STYLE: CSSProperties = {
  width: '100%',
  tableLayout: 'fixed',
  borderCollapse: 'collapse',
};

export const INVOICE_TOP_SECTION_CLASS = 'invoice-top-section px-6 py-4';
export const INVOICE_TOP_GRID_CLASS = 'grid grid-cols-2 gap-4';
export const INVOICE_INFO_CARD_CLASS = 'p-4';
export const INVOICE_TABLE_SECTION_CLASS = 'invoice-table-section px-5 py-4';
export const INVOICE_TABLE_HEAD_CELL_CLASS = 'px-2.5 py-2 text-center text-[12px] font-bold leading-tight';
export const INVOICE_TABLE_HEAD_CELL_LEFT_CLASS = 'px-2.5 py-2 text-left text-[12px] font-bold leading-tight';
export const INVOICE_TABLE_DESCRIPTION_CELL_CLASS = 'px-2.5 py-2 text-left text-[12px] leading-5 break-words whitespace-normal align-top';
export const INVOICE_TABLE_NUMERIC_CELL_CLASS = 'px-2 py-2 text-center text-[12px] leading-5 whitespace-nowrap align-top';
export const INVOICE_TABLE_TOTAL_CELL_CLASS = `${INVOICE_TABLE_NUMERIC_CELL_CLASS} font-semibold`;
export const INVOICE_TOTALS_SECTION_CLASS = 'invoice-totals-section keep-together px-6 py-4';
export const INVOICE_TOTALS_GRID_CLASS = 'grid grid-cols-[1.08fr_0.92fr] gap-3';
export const INVOICE_SIGNATURE_SECTION_CLASS = 'invoice-signature-section keep-together px-6 pt-0 pb-4 mt-3';
export const INVOICE_SIGNATURE_BOX_CLASS = 'ml-auto w-48 rounded p-3 text-center';
export const INVOICE_SIGNATURE_FRAME_CLASS = 'mt-2 flex h-16 items-center justify-center rounded border';
export const INVOICE_SIGNATURE_IMAGE_CLASS = 'max-h-14 max-w-full object-contain';

export function getInvoiceContentStyle(headerHeight: number, footerHeight: number, reserve = 10): CSSProperties {
  return {
    paddingTop: headerHeight + reserve,
    paddingBottom: footerHeight + reserve,
  };
}

const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function normalizeColor(value: unknown, fallback: string) {
  if (typeof value !== 'string') {
    return { color: fallback, isCustom: false };
  }

  const trimmed = value.trim();
  if (!HEX_COLOR_PATTERN.test(trimmed)) {
    return { color: fallback, isCustom: false };
  }

  return { color: trimmed, isCustom: true };
}

export function resolveInvoiceTemplateCustomization(
  company: { templateCustomization?: InvoiceTemplateCustomization } | null | undefined,
  defaults: {
    companyNameFontSize: number;
    documentTitleFontSize: number;
    clientNameFontSize: number;
    clientInfoFontSize: number;
    footerTextFontSize?: number;
    signatureSpacing?: number;
    signatureBoxWidth?: number;
    signatureBoxHeight?: number;
    signatureAlign?: 'left' | 'right';
    tableColor: string;
    textColor: string;
    headerHeight: number;
    footerHeight: number;
  },
): ResolvedInvoiceTemplateCustomization {
  const customization = company?.templateCustomization || {};
  const tableColor = normalizeColor(customization.tableColor, defaults.tableColor);
  const textColor = normalizeColor(customization.textColor, defaults.textColor);

  return {
    companyNameFontSize: clampNumber(customization.companyNameFontSize, 14, 48, defaults.companyNameFontSize),
    documentTitleFontSize: clampNumber(customization.documentTitleFontSize, 14, 44, defaults.documentTitleFontSize),
    clientNameFontSize: clampNumber(customization.clientNameFontSize, 10, 28, defaults.clientNameFontSize),
    clientInfoFontSize: clampNumber(customization.clientInfoFontSize, 9, 22, defaults.clientInfoFontSize),
    footerTextFontSize: clampNumber(customization.footerTextFontSize, 8, 18, defaults.footerTextFontSize ?? 10),
    signatureSpacing: clampNumber(customization.signatureSpacing, 0, 80, defaults.signatureSpacing ?? 12),
    signatureBoxWidth: clampNumber(customization.signatureBoxWidth, 140, 340, defaults.signatureBoxWidth ?? 192),
    signatureBoxHeight: clampNumber(customization.signatureBoxHeight, 48, 150, defaults.signatureBoxHeight ?? 64),
    signatureAlign: customization.signatureAlign === 'left' || customization.signatureAlign === 'right'
      ? customization.signatureAlign
      : defaults.signatureAlign ?? 'right',
    tableColor: tableColor.color,
    textColor: textColor.color,
    headerHeight: clampNumber(customization.headerHeight, 80, 240, defaults.headerHeight),
    footerHeight: clampNumber(customization.footerHeight, 60, 180, defaults.footerHeight),
    hasCustomTableColor: tableColor.isCustom,
    hasCustomTextColor: textColor.isCustom,
  };
}

export function templateFontSizeStyle(fontSize: number, lineHeight: number = 1.2): CSSProperties {
  return {
    fontSize,
    lineHeight,
  };
}

export function getInvoiceFooterTextStyle(customization: ResolvedInvoiceTemplateCustomization): CSSProperties {
  return {
    fontSize: customization.footerTextFontSize,
    lineHeight: 1.45,
  };
}

export function getInvoiceSignatureSectionStyle(customization: ResolvedInvoiceTemplateCustomization): CSSProperties {
  return {
    marginTop: customization.signatureSpacing,
  };
}

export function getInvoiceSignatureBoxStyle(customization: ResolvedInvoiceTemplateCustomization): CSSProperties {
  return {
    width: customization.signatureBoxWidth,
    marginLeft: customization.signatureAlign === 'right' ? 'auto' : 0,
    marginRight: customization.signatureAlign === 'left' ? 'auto' : 0,
  };
}

export function getInvoiceSignatureFrameStyle(customization: ResolvedInvoiceTemplateCustomization): CSSProperties {
  return {
    height: customization.signatureBoxHeight,
  };
}

export function getInvoiceSignatureImageStyle(customization: ResolvedInvoiceTemplateCustomization): CSSProperties {
  return {
    maxHeight: Math.max(32, customization.signatureBoxHeight - 12),
  };
}

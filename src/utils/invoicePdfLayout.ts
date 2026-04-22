type BalanceSignatureOptions = {
  headerMM: number;
  footerMM: number;
  pageWidthMM?: number;
  pageHeightMM?: number;
  horizontalMarginMM?: number;
};

const COMPACT_SIGNATURE_OFFSET_PX = 6;
const DEFAULT_SIGNATURE_OFFSET_PX = 18;
const SPACIOUS_SIGNATURE_OFFSET_PX = 24;

function parsePixelValue(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPageContentHeightPx(root: HTMLElement, options: Required<BalanceSignatureOptions>) {
  const rootWidth = root.getBoundingClientRect().width || 1;
  const availablePageWidthMM = options.pageWidthMM - options.horizontalMarginMM;
  const availablePageHeightMM = options.pageHeightMM - options.headerMM - options.footerMM;

  return Math.max(1, (availablePageHeightMM / availablePageWidthMM) * rootWidth);
}

function getPageCount(height: number, pageHeight: number) {
  return Math.max(1, Math.ceil(height / pageHeight));
}

export function balanceInvoiceSignatureForPdf(root: HTMLElement, options: BalanceSignatureOptions) {
  const previousOffset = root.style.getPropertyValue('--invoice-signature-offset');
  const signatureSection = root.querySelector('.invoice-signature-section') as HTMLElement | null;
  const content = root.querySelector('.pdf-content') as HTMLElement | null;

  if (!signatureSection || !content) {
    return () => undefined;
  }

  const explicitOffset = parsePixelValue(getComputedStyle(signatureSection).getPropertyValue('--invoice-signature-offset'));

  if (explicitOffset > 0) {
    root.style.setProperty('--invoice-signature-offset', `${explicitOffset}px`);

    return () => {
      if (previousOffset) {
        root.style.setProperty('--invoice-signature-offset', previousOffset);
        return;
      }

      root.style.removeProperty('--invoice-signature-offset');
    };
  }

  const normalizedOptions: Required<BalanceSignatureOptions> = {
    pageWidthMM: options.pageWidthMM ?? 210,
    pageHeightMM: options.pageHeightMM ?? 297,
    horizontalMarginMM: options.horizontalMarginMM ?? 16,
    headerMM: options.headerMM,
    footerMM: options.footerMM,
  };

  root.style.setProperty('--invoice-signature-offset', `${DEFAULT_SIGNATURE_OFFSET_PX}px`);

  const pageHeightPx = getPageContentHeightPx(root, normalizedOptions);
  const contentHeight = content.getBoundingClientRect().height;
  const defaultPageCount = getPageCount(contentHeight, pageHeightPx);
  const compactHeight = contentHeight - DEFAULT_SIGNATURE_OFFSET_PX + COMPACT_SIGNATURE_OFFSET_PX;
  const compactPageCount = getPageCount(compactHeight, pageHeightPx);

  let nextOffset = DEFAULT_SIGNATURE_OFFSET_PX;

  if (compactPageCount < defaultPageCount) {
    nextOffset = COMPACT_SIGNATURE_OFFSET_PX;
  } else {
    const lastPageUsedHeight = contentHeight % pageHeightPx || pageHeightPx;
    const lastPageRemainingHeight = pageHeightPx - lastPageUsedHeight;
    const spaciousHeight = contentHeight - DEFAULT_SIGNATURE_OFFSET_PX + SPACIOUS_SIGNATURE_OFFSET_PX;
    const spaciousPageCount = getPageCount(spaciousHeight, pageHeightPx);

    if (spaciousPageCount === defaultPageCount && lastPageRemainingHeight > 96) {
      nextOffset = SPACIOUS_SIGNATURE_OFFSET_PX;
    } else if (lastPageRemainingHeight < 28) {
      nextOffset = COMPACT_SIGNATURE_OFFSET_PX;
    }
  }

  root.style.setProperty('--invoice-signature-offset', `${nextOffset}px`);

  return () => {
    if (previousOffset) {
      root.style.setProperty('--invoice-signature-offset', previousOffset);
      return;
    }

    root.style.removeProperty('--invoice-signature-offset');
  };
}

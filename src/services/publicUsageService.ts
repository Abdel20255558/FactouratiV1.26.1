import { doc, getDoc, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const PUBLIC_USAGE_COLLECTION = 'publicUsageStats';
const FREE_INVOICE_GENERATOR_DOC = 'freeInvoiceGenerator';
const VISITOR_ID_STORAGE_KEY = 'factourati:free-generator:visitor-id';
const UNIQUE_VISIT_STORAGE_KEY = 'factourati:free-generator:unique-counted';

export type FreeInvoiceGeneratorStats = {
  views: number;
  uniqueVisitors: number;
  prints: number;
  proTemplatePrintAttempts: number;
  lastViewedAt: string;
  lastPrintedAt: string;
  updatedAt: string;
};

const defaultFreeInvoiceGeneratorStats: FreeInvoiceGeneratorStats = {
  views: 0,
  uniqueVisitors: 0,
  prints: 0,
  proTemplatePrintAttempts: 0,
  lastViewedAt: '',
  lastPrintedAt: '',
  updatedAt: '',
};

function getStatsRef() {
  return doc(db, PUBLIC_USAGE_COLLECTION, FREE_INVOICE_GENERATOR_DOC);
}

function getStoredValue(key: string) {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    return window.localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function setStoredValue(key: string, value: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Tracking should never block the public generator.
  }
}

function createVisitorId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getVisitorId() {
  const existingVisitorId = getStoredValue(VISITOR_ID_STORAGE_KEY);

  if (existingVisitorId) {
    return existingVisitorId;
  }

  const visitorId = createVisitorId();
  setStoredValue(VISITOR_ID_STORAGE_KEY, visitorId);
  return visitorId;
}

function toNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toIsoDate(value: unknown) {
  if (!value) {
    return '';
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? value : parsedDate.toISOString();
  }

  if (typeof value === 'object') {
    const timestamp = value as {
      seconds?: number;
      _seconds?: number;
      nanoseconds?: number;
      _nanoseconds?: number;
      toDate?: () => Date;
    };

    if (typeof timestamp.toDate === 'function') {
      const parsedDate = timestamp.toDate();
      return Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString();
    }

    const seconds = typeof timestamp.seconds === 'number' ? timestamp.seconds : timestamp._seconds;
    const nanoseconds = typeof timestamp.nanoseconds === 'number' ? timestamp.nanoseconds : timestamp._nanoseconds || 0;

    if (typeof seconds === 'number') {
      const parsedDate = new Date(seconds * 1000 + Math.floor(nanoseconds / 1000000));
      return Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString();
    }
  }

  return '';
}

export async function recordFreeInvoiceGeneratorView() {
  getVisitorId();
  const uniqueAlreadyCounted = Boolean(getStoredValue(UNIQUE_VISIT_STORAGE_KEY));

  await setDoc(
    getStatsRef(),
    {
      views: increment(1),
      ...(uniqueAlreadyCounted ? {} : { uniqueVisitors: increment(1) }),
      lastViewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  if (!uniqueAlreadyCounted) {
    setStoredValue(UNIQUE_VISIT_STORAGE_KEY, 'true');
  }
}

export async function recordFreeInvoiceGeneratorPrint() {
  await setDoc(
    getStatsRef(),
    {
      prints: increment(1),
      lastPrintedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function recordFreeInvoiceGeneratorProTemplateAttempt() {
  await setDoc(
    getStatsRef(),
    {
      proTemplatePrintAttempts: increment(1),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function fetchFreeInvoiceGeneratorStats(): Promise<FreeInvoiceGeneratorStats> {
  const snapshot = await getDoc(getStatsRef());

  if (!snapshot.exists()) {
    return defaultFreeInvoiceGeneratorStats;
  }

  const data = snapshot.data();

  return {
    views: toNumber(data.views),
    uniqueVisitors: toNumber(data.uniqueVisitors),
    prints: toNumber(data.prints),
    proTemplatePrintAttempts: toNumber(data.proTemplatePrintAttempts),
    lastViewedAt: toIsoDate(data.lastViewedAt),
    lastPrintedAt: toIsoDate(data.lastPrintedAt),
    updatedAt: toIsoDate(data.updatedAt),
  };
}

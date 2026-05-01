import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../config/firebase';

export const HOMEPAGE_SCREENSHOTS_COLLECTION = 'homepageScreenshots';

export interface HomepageScreenshot {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  imageStoragePath?: string;
}

export interface HomepageScreenshotInput {
  title: string;
  description: string;
  imageUrl: string;
  order: number;
  isActive: boolean;
}

function ensureString(value: unknown, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalizedValue = value.trim();
  const invalidValues = new Set(['undefined', 'null', '[object object]']);
  return invalidValues.has(normalizedValue.toLowerCase()) ? fallback : normalizedValue;
}

function normalizeDateIso(value: unknown) {
  if (!value) {
    return '';
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString();
  }

  if (typeof value === 'object') {
    const record = value as {
      seconds?: number;
      _seconds?: number;
      nanoseconds?: number;
      _nanoseconds?: number;
      toDate?: () => Date;
    };

    if (typeof record.toDate === 'function') {
      const parsedDate = record.toDate();
      return Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString();
    }

    const seconds = typeof record.seconds === 'number' ? record.seconds : record._seconds;
    const nanoseconds = typeof record.nanoseconds === 'number' ? record.nanoseconds : record._nanoseconds || 0;

    if (typeof seconds === 'number') {
      const parsedDate = new Date(seconds * 1000 + Math.floor(nanoseconds / 1000000));
      return Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString();
    }
  }

  return '';
}

function normalizeHomepageScreenshot(id: string, data: DocumentData): HomepageScreenshot | null {
  const imageUrl = ensureString(data.imageUrl);
  const title = ensureString(data.title);

  if (!imageUrl || !title) {
    return null;
  }

  return {
    id,
    title,
    description: ensureString(data.description),
    imageUrl,
    order: Number.isFinite(Number(data.order)) ? Number(data.order) : 0,
    isActive: data.isActive !== false,
    createdAt: normalizeDateIso(data.createdAt),
    updatedAt: normalizeDateIso(data.updatedAt),
    imageStoragePath: ensureString(data.imageStoragePath),
  };
}

export async function fetchHomepageScreenshots(options?: { activeOnly?: boolean }) {
  const snapshot = await getDocs(collection(db, HOMEPAGE_SCREENSHOTS_COLLECTION));

  return snapshot.docs
    .map((docSnapshot) => normalizeHomepageScreenshot(docSnapshot.id, docSnapshot.data()))
    .filter((entry): entry is HomepageScreenshot => Boolean(entry))
    .filter((entry) => !options?.activeOnly || entry.isActive)
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }

      return left.title.localeCompare(right.title);
    });
}

export async function uploadHomepageScreenshotImage(file: File) {
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '-');
  const storagePath = `homepage-screenshots/${Date.now()}-${cleanFileName}`;
  const imageRef = ref(storage, storagePath);
  await uploadBytes(imageRef, file);
  const imageUrl = await getDownloadURL(imageRef);

  return {
    imageUrl,
    storagePath,
  };
}

export async function createHomepageScreenshot(
  input: HomepageScreenshotInput,
  options?: { imageStoragePath?: string },
) {
  const nowIso = new Date().toISOString();

  return addDoc(collection(db, HOMEPAGE_SCREENSHOTS_COLLECTION), {
    ...input,
    imageStoragePath: options?.imageStoragePath || '',
    createdAt: nowIso,
    updatedAt: nowIso,
  });
}

export async function updateHomepageScreenshot(
  id: string,
  input: HomepageScreenshotInput,
  options?: { imageStoragePath?: string },
) {
  await updateDoc(doc(db, HOMEPAGE_SCREENSHOTS_COLLECTION, id), {
    ...input,
    ...(options?.imageStoragePath !== undefined ? { imageStoragePath: options.imageStoragePath } : {}),
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteHomepageScreenshot(id: string, imageStoragePath?: string) {
  if (imageStoragePath) {
    try {
      await deleteObject(ref(storage, imageStoragePath));
    } catch (error) {
      console.warn('Suppression de l image homepage impossible:', error);
    }
  }

  await deleteDoc(doc(db, HOMEPAGE_SCREENSHOTS_COLLECTION, id));
}

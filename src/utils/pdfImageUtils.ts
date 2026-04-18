type PreparedImageSnapshot = {
  image: HTMLImageElement;
  src: string | null;
  crossOrigin: string | null;
  referrerPolicy: string | null;
  loading: string | null;
  decoding: string | null;
};

const DEFAULT_IMAGE_TIMEOUT_MS = 6000;

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Image illisible'));
    reader.readAsDataURL(blob);
  });
}

async function fetchImageAsDataUrl(src: string) {
  const response = await fetch(src, { mode: 'cors', cache: 'force-cache' });

  if (!response.ok) {
    throw new Error(`Image non accessible (${response.status})`);
  }

  return blobToDataUrl(await response.blob());
}

function waitForImage(image: HTMLImageElement, timeoutMs: number) {
  if (image.complete && image.naturalWidth > 0) {
    return image.decode?.().catch(() => undefined) || Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const timeout = window.setTimeout(done, timeoutMs);

    function done() {
      window.clearTimeout(timeout);
      image.removeEventListener('load', done);
      image.removeEventListener('error', done);
      resolve();
    }

    image.addEventListener('load', done, { once: true });
    image.addEventListener('error', done, { once: true });
  }).then(() => image.decode?.().catch(() => undefined));
}

async function reloadImageWithCors(image: HTMLImageElement, src: string, timeoutMs: number) {
  image.crossOrigin = 'anonymous';
  image.referrerPolicy = 'no-referrer';
  image.loading = 'eager';
  image.decoding = 'sync';

  image.removeAttribute('src');
  image.src = src;
  await waitForImage(image, timeoutMs);
}

export async function prepareImagesForPdf(root: HTMLElement, timeoutMs = DEFAULT_IMAGE_TIMEOUT_MS) {
  const images = Array.from(root.querySelectorAll('img')) as HTMLImageElement[];
  const snapshots: PreparedImageSnapshot[] = images.map((image) => ({
    image,
    src: image.getAttribute('src'),
    crossOrigin: image.getAttribute('crossorigin'),
    referrerPolicy: image.getAttribute('referrerpolicy'),
    loading: image.getAttribute('loading'),
    decoding: image.getAttribute('decoding'),
  }));

  await Promise.all(
    images.map(async (image) => {
      const src = image.currentSrc || image.src || image.getAttribute('src') || '';

      if (!src) {
        return;
      }

      image.crossOrigin = 'anonymous';
      image.referrerPolicy = 'no-referrer';
      image.loading = 'eager';
      image.decoding = 'sync';

      if (isHttpUrl(src)) {
        try {
          image.src = await fetchImageAsDataUrl(src);
        } catch {
          await reloadImageWithCors(image, src, timeoutMs);
          return;
        }
      }

      await waitForImage(image, timeoutMs);
    }),
  );

  return () => {
    snapshots.forEach(({ image, src, crossOrigin, referrerPolicy, loading, decoding }) => {
      if (src === null) {
        image.removeAttribute('src');
      } else {
        image.setAttribute('src', src);
      }

      if (crossOrigin === null) image.removeAttribute('crossorigin');
      else image.setAttribute('crossorigin', crossOrigin);

      if (referrerPolicy === null) image.removeAttribute('referrerpolicy');
      else image.setAttribute('referrerpolicy', referrerPolicy);

      if (loading === null) image.removeAttribute('loading');
      else image.setAttribute('loading', loading);

      if (decoding === null) image.removeAttribute('decoding');
      else image.setAttribute('decoding', decoding);
    });
  };
}

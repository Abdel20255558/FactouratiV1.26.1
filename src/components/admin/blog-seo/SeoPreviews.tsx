import { SITE_URL } from '../../../data/publicSeoData';

type SeoPreviewData = {
  title: string;
  description: string;
  slug: string;
  image?: string;
};

function getPreviewUrl(slug: string) {
  return `${SITE_URL}/blog/${slug || 'slug-article'}`;
}

export function GooglePreview({ title, description, slug }: SeoPreviewData) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Apercu Google</p>
      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        <p className="truncate text-sm text-emerald-700 dark:text-emerald-300">{getPreviewUrl(slug)}</p>
        <p className="mt-1 line-clamp-2 text-xl font-medium text-blue-700 dark:text-blue-300">
          {title || 'Titre SEO de votre article'}
        </p>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {description || 'Votre meta description apparaitra ici dans les resultats Google.'}
        </p>
      </div>
    </div>
  );
}

export function SocialPreviews({ title, description, slug, image }: SeoPreviewData) {
  const previewImage = image || '/2.png';

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex h-40 items-center justify-center bg-slate-100 dark:bg-slate-800">
          {previewImage ? (
            <img src={previewImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm text-slate-400">Image Open Graph</span>
          )}
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Facebook / LinkedIn</p>
          <p className="mt-2 line-clamp-2 font-bold text-slate-950 dark:text-slate-100">{title || 'Titre social'}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {description || 'Description sociale de l article.'}
          </p>
          <p className="mt-2 truncate text-xs text-slate-400">{getPreviewUrl(slug)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Twitter / X</p>
        </div>
        <div className="mx-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex h-36 items-center justify-center bg-slate-100 dark:bg-slate-800">
            {previewImage ? (
              <img src={previewImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm text-slate-400">Image Twitter</span>
            )}
          </div>
          <div className="p-4">
            <p className="line-clamp-2 font-bold text-slate-950 dark:text-slate-100">{title || 'Titre Twitter'}</p>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {description || 'Description Twitter de l article.'}
            </p>
            <p className="mt-2 truncate text-xs text-slate-400">factourati.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}

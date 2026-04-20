import { Search } from 'lucide-react';
import type { BlogRobotsFollow, BlogRobotsIndex, BlogSchemaType, BlogSeoCheck } from '../../../types/blog';
import { blogRobotsFollowOptions, blogRobotsIndexOptions, blogSchemaTypeOptions } from '../../../utils/blogSeo';
import SeoChecklist from './SeoChecklist';
import SeoScoreBadge from './SeoScoreBadge';
import { GooglePreview, SocialPreviews } from './SeoPreviews';

export type BlogSeoPanelValue = {
  focusKeyword: string;
  seoTitle: string;
  metaDescription: string;
  slug: string;
  canonicalUrl: string;
  robotsIndex: BlogRobotsIndex;
  robotsFollow: BlogRobotsFollow;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  schemaType: BlogSchemaType;
};

type BlogSeoPanelProps = {
  value: BlogSeoPanelValue;
  score: number;
  checks: BlogSeoCheck[];
  wordCount: number;
  onChange: <K extends keyof BlogSeoPanelValue>(field: K, value: BlogSeoPanelValue[K]) => void;
  onCheckClick?: (check: BlogSeoCheck) => void;
};

const inputClassName =
  'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500';
const labelClassName = 'mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200';

export default function BlogSeoPanel({ value, score, checks, wordCount, onChange, onCheckClick }: BlogSeoPanelProps) {
  const googleTitle = value.seoTitle;
  const googleDescription = value.metaDescription;
  const ogTitle = value.ogTitle || value.seoTitle;
  const ogDescription = value.ogDescription || value.metaDescription;
  const twitterTitle = value.twitterTitle || ogTitle;
  const twitterDescription = value.twitterDescription || ogDescription;
  const socialImage = value.twitterImage || value.ogImage;

  return (
    <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 shadow-sm dark:border-indigo-900/50 dark:bg-indigo-950/20">
      <div className="flex flex-col gap-4 border-b border-indigo-100 pb-5 dark:border-indigo-900/50 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-indigo-700 dark:text-indigo-300" />
            <h4 className="text-lg font-bold text-gray-950 dark:text-slate-100">Optimisation SEO de l'article</h4>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            Score live calcule depuis le titre, le slug, les sections, les images et les liens de l article.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SeoScoreBadge score={score} size="lg" />
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {wordCount} mots
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClassName}>Focus keyword</label>
              <input
                id="blog-seo-focus-keyword"
                value={value.focusKeyword}
                onChange={(event) => onChange('focusKeyword', event.target.value)}
                className={inputClassName}
                placeholder="Ex: logiciel facturation maroc"
              />
            </div>
            <div>
              <label className={labelClassName}>Slug SEO</label>
              <input
                id="blog-seo-slug"
                value={value.slug}
                onChange={(event) => onChange('slug', event.target.value)}
                className={inputClassName}
                placeholder="logiciel-facturation-maroc"
              />
            </div>
          </div>

          <div>
            <label className={labelClassName}>SEO title</label>
            <input
              id="blog-seo-title"
              value={value.seoTitle}
              onChange={(event) => onChange('seoTitle', event.target.value)}
              className={inputClassName}
              placeholder="Titre SEO visible dans Google"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{value.seoTitle.length} caracteres, ideal 35-60.</p>
          </div>

          <div>
            <label className={labelClassName}>Meta description</label>
            <textarea
              id="blog-seo-meta-description"
              value={value.metaDescription}
              onChange={(event) => onChange('metaDescription', event.target.value)}
              rows={4}
              className={inputClassName}
              placeholder="Description SEO visible dans Google"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              {value.metaDescription.length} caracteres, ideal 120-160.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className={labelClassName}>Canonical URL</label>
              <input
                id="blog-seo-canonical"
                type="url"
                value={value.canonicalUrl}
                onChange={(event) => onChange('canonicalUrl', event.target.value)}
                className={inputClassName}
                placeholder="https://factourati.com/blog/..."
              />
            </div>
            <div>
              <label className={labelClassName}>Robots index</label>
              <select
                value={value.robotsIndex}
                onChange={(event) => onChange('robotsIndex', event.target.value as BlogRobotsIndex)}
                className={inputClassName}
              >
                {blogRobotsIndexOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClassName}>Robots follow</label>
              <select
                value={value.robotsFollow}
                onChange={(event) => onChange('robotsFollow', event.target.value as BlogRobotsFollow)}
                className={inputClassName}
              >
                {blogRobotsFollowOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h5 className="text-sm font-bold text-slate-950 dark:text-slate-100">Open Graph</h5>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <input
                value={value.ogTitle}
                onChange={(event) => onChange('ogTitle', event.target.value)}
                className={inputClassName}
                placeholder="OG title"
              />
              <input
                value={value.ogImage}
                onChange={(event) => onChange('ogImage', event.target.value)}
                className={inputClassName}
                placeholder="OG image URL"
              />
            </div>
            <textarea
              value={value.ogDescription}
              onChange={(event) => onChange('ogDescription', event.target.value)}
              rows={3}
              className={`${inputClassName} mt-4`}
              placeholder="OG description"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h5 className="text-sm font-bold text-slate-950 dark:text-slate-100">Twitter / X</h5>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <input
                value={value.twitterTitle}
                onChange={(event) => onChange('twitterTitle', event.target.value)}
                className={inputClassName}
                placeholder="Twitter title"
              />
              <input
                value={value.twitterImage}
                onChange={(event) => onChange('twitterImage', event.target.value)}
                className={inputClassName}
                placeholder="Twitter image URL"
              />
            </div>
            <textarea
              value={value.twitterDescription}
              onChange={(event) => onChange('twitterDescription', event.target.value)}
              rows={3}
              className={`${inputClassName} mt-4`}
              placeholder="Twitter description"
            />
          </div>

          <div>
            <label className={labelClassName}>Schema type</label>
            <select
              value={value.schemaType}
              onChange={(event) => onChange('schemaType', event.target.value as BlogSchemaType)}
              className={inputClassName}
            >
              {blogSchemaTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-5">
          <GooglePreview title={googleTitle} description={googleDescription} slug={value.slug} />
          <SocialPreviews
            title={ogTitle}
            description={ogDescription}
            slug={value.slug}
            image={socialImage}
          />
          <SeoChecklist checks={checks} onCheckClick={onCheckClick} />
        </div>
      </div>
    </section>
  );
}

import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { blogCategoryDefinitions, getBlogCategoryBySlug } from '../../data/blogTaxonomy';
import { useBlogArticles } from '../../hooks/useBlogArticles';
import {
  blogSlugExists,
  createBlogSlug,
  createFirestoreBlogPost,
  deleteFirestoreBlogPost,
  setFirestoreBlogPostPublished,
  uploadBlogImage,
} from '../../services/blogService';

type SectionFormState = {
  heading: string;
  paragraphsText: string;
  bulletsText: string;
  imageUrl: string;
  imageAlt: string;
};

type BlogFormState = {
  title: string;
  slug: string;
  seoTitle: string;
  description: string;
  excerpt: string;
  categorySlug: string;
  heroLabel: string;
  imageUrl: string;
  imageAlt: string;
  keywordsText: string;
  intro: string;
  summaryPointsText: string;
  sections: SectionFormState[];
  isPublished: boolean;
};

const createEmptySection = (): SectionFormState => ({
  heading: '',
  paragraphsText: '',
  bulletsText: '',
  imageUrl: '',
  imageAlt: '',
});

const createInitialFormState = (): BlogFormState => ({
  title: '',
  slug: '',
  seoTitle: '',
  description: '',
  excerpt: '',
  categorySlug: 'facturation',
  heroLabel: '',
  imageUrl: '',
  imageAlt: '',
  keywordsText: '',
  intro: '',
  summaryPointsText: '',
  sections: [createEmptySection()],
  isPublished: true,
});

function splitTextarea(value: string, separator: RegExp = /\n+/) {
  return value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function BlogManager() {
  const { user } = useAuth();
  const { firestoreArticles, isLoading, error, refetch } = useBlogArticles({
    includeUnpublished: true,
    includeHiddenStatic: true,
  });

  const [form, setForm] = useState<BlogFormState>(createInitialFormState);
  const [slugTouched, setSlugTouched] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const stats = useMemo(() => {
    return {
      total: firestoreArticles.length,
      published: firestoreArticles.filter((article) => article.isPublished).length,
      drafts: firestoreArticles.filter((article) => !article.isPublished).length,
    };
  }, [firestoreArticles]);

  const handleFieldChange = <K extends keyof BlogFormState>(field: K, value: BlogFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTitleChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: slugTouched ? prev.slug : createBlogSlug(value),
      seoTitle: prev.seoTitle ? prev.seoTitle : value ? `${value} | Blog Factourati` : '',
    }));
  };

  const handleSectionChange = (index: number, field: keyof SectionFormState, value: string) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, [field]: value } : section,
      ),
    }));
  };

  const addSection = () => {
    setForm((prev) => ({
      ...prev,
      sections: [...prev.sections, createEmptySection()],
    }));
  };

  const removeSection = (index: number) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.length === 1 ? prev.sections : prev.sections.filter((_, sectionIndex) => sectionIndex !== index),
    }));
  };

  const resetForm = () => {
    setForm(createInitialFormState());
    setSelectedImageFile(null);
    setSlugTouched(false);
  };

  const handleCreatePost = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    const slug = form.slug.trim() || createBlogSlug(form.title);
    const category = getBlogCategoryBySlug(form.categorySlug);
    const summaryPoints = splitTextarea(form.summaryPointsText);
    const keywords = form.keywordsText
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
    const sections = form.sections
      .map((section) => ({
        heading: section.heading.trim(),
        paragraphs: splitTextarea(section.paragraphsText),
        bullets: splitTextarea(section.bulletsText),
        image: section.imageUrl.trim(),
        imageAlt: section.imageAlt.trim(),
      }))
      .filter((section) => section.heading && section.paragraphs.length > 0)
      .map((section) => ({
        ...section,
        bullets: section.bullets.length > 0 ? section.bullets : undefined,
        image: section.image || undefined,
        imageAlt: section.imageAlt || undefined,
      }));

    if (
      !form.title.trim() ||
      !slug ||
      !form.seoTitle.trim() ||
      !form.description.trim() ||
      !form.excerpt.trim() ||
      !category ||
      !form.heroLabel.trim() ||
      !form.imageAlt.trim() ||
      !form.intro.trim()
    ) {
      setFeedback({ type: 'error', message: 'Veuillez remplir tous les champs obligatoires du blog.' });
      return;
    }

    if (!selectedImageFile && !form.imageUrl.trim()) {
      setFeedback({ type: 'error', message: 'Ajoutez une image via upload ou URL pour publier le blog.' });
      return;
    }

    if (keywords.length < 3) {
      setFeedback({ type: 'error', message: 'Ajoutez au moins 3 keywords pour un article SEO propre.' });
      return;
    }

    if (summaryPoints.length < 2) {
      setFeedback({ type: 'error', message: 'Ajoutez au moins 2 points de resume.' });
      return;
    }

    if (sections.length === 0) {
      setFeedback({ type: 'error', message: 'Ajoutez au moins une section avec un titre et des paragraphes.' });
      return;
    }

    setIsSaving(true);

    try {
      const slugAlreadyExists = await blogSlugExists(slug);
      if (slugAlreadyExists) {
        setFeedback({ type: 'error', message: 'Ce slug existe deja. Modifiez le titre ou le slug de l article.' });
        return;
      }

      let image = form.imageUrl.trim();
      let imageStoragePath = '';

      if (selectedImageFile) {
        const uploadResult = await uploadBlogImage(selectedImageFile);
        image = uploadResult.imageUrl;
        imageStoragePath = uploadResult.storagePath;
      }

      await createFirestoreBlogPost(
        {
          slug,
          title: form.title.trim(),
          seoTitle: form.seoTitle.trim(),
          description: form.description.trim(),
          excerpt: form.excerpt.trim(),
          category: category.label,
          categorySlug: category.slug,
          heroLabel: form.heroLabel.trim(),
          image,
          imageAlt: form.imageAlt.trim(),
          keywords,
          intro: form.intro.trim(),
          summaryPoints,
          sections,
          isPublished: form.isPublished,
        },
        {
          createdByEmail: user?.email,
          imageStoragePath,
        },
      );

      setFeedback({
        type: 'success',
        message: form.isPublished
          ? 'Article blog cree et publie avec succes.'
          : 'Article blog cree en brouillon avec succes.',
      });
      resetForm();
      await refetch();
    } catch (createError) {
      console.error('Erreur lors de la creation du blog:', createError);
      setFeedback({ type: 'error', message: 'Impossible de creer cet article pour le moment.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublication = async (articleId: string, isPublished: boolean) => {
    setActionLoadingId(articleId);
    setFeedback(null);

    try {
      await setFirestoreBlogPostPublished(articleId, !isPublished);
      await refetch();
      setFeedback({
        type: 'success',
        message: !isPublished ? 'Article publie avec succes.' : 'Article passe en brouillon.',
      });
    } catch (toggleError) {
      console.error('Erreur publication blog:', toggleError);
      setFeedback({ type: 'error', message: 'Impossible de modifier le statut de publication.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeletePost = async (articleId: string, articleTitle: string, imageStoragePath?: string) => {
    const confirmed = window.confirm(`Supprimer definitivement l'article "${articleTitle}" ?`);

    if (!confirmed) {
      return;
    }

    setActionLoadingId(articleId);
    setFeedback(null);

    try {
      await deleteFirestoreBlogPost(articleId, imageStoragePath);
      await refetch();
      setFeedback({ type: 'success', message: 'Article supprime avec succes.' });
    } catch (deleteError) {
      console.error('Erreur suppression blog:', deleteError);
      setFeedback({ type: 'error', message: 'Impossible de supprimer cet article.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="mb-8 space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Gestion du blog</h3>
            <p className="mt-1 text-sm text-gray-500">
              Creez de nouveaux articles avec image, keywords SEO, resume et sections, puis publiez-les directement depuis l admin.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-gray-50 px-4 py-3">
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs uppercase tracking-wide text-gray-500">Articles admin</p>
            </div>
            <div className="rounded-lg bg-emerald-50 px-4 py-3">
              <p className="text-xl font-bold text-emerald-700">{stats.published}</p>
              <p className="text-xs uppercase tracking-wide text-emerald-600">Publies</p>
            </div>
            <div className="rounded-lg bg-amber-50 px-4 py-3">
              <p className="text-xl font-bold text-amber-700">{stats.drafts}</p>
              <p className="text-xs uppercase tracking-wide text-amber-600">Brouillons</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleCreatePost} className="space-y-6 px-6 py-6">
          {feedback && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                feedback.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {feedback.message}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">Titre *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ex: Comment organiser votre stock sans perdre du temps"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Slug *</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  handleFieldChange('slug', createBlogSlug(e.target.value));
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="mon-article-blog"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Categorie *</label>
              <select
                value={form.categorySlug}
                onChange={(e) => handleFieldChange('categorySlug', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {blogCategoryDefinitions.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">SEO title *</label>
              <input
                type="text"
                value={form.seoTitle}
                onChange={(e) => handleFieldChange('seoTitle', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ex: Gestion de stock au Maroc pour PME | Blog Factourati"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Hero label *</label>
              <input
                type="text"
                value={form.heroLabel}
                onChange={(e) => handleFieldChange('heroLabel', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ex: Maitriser le stock"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Meta description *</label>
              <textarea
                value={form.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Description SEO de l article..."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Excerpt *</label>
              <textarea
                value={form.excerpt}
                onChange={(e) => handleFieldChange('excerpt', e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Resume court pour les cartes blog..."
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Image URL</label>
              <input
                type="url"
                value={form.imageUrl}
                onChange={(e) => handleFieldChange('imageUrl', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Upload image</label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm text-gray-600 transition hover:border-indigo-300 hover:text-indigo-700">
                <ImagePlus className="h-4 w-4" />
                <span>{selectedImageFile ? selectedImageFile.name : 'Choisir une image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setSelectedImageFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Alt image *</label>
              <input
                type="text"
                value={form.imageAlt}
                onChange={(e) => handleFieldChange('imageAlt', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Description courte de l image"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Keywords SEO *</label>
              <textarea
                value={form.keywordsText}
                onChange={(e) => handleFieldChange('keywordsText', e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="mot cle 1, mot cle 2, mot cle 3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Points resume *</label>
              <textarea
                value={form.summaryPointsText}
                onChange={(e) => handleFieldChange('summaryPointsText', e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={'Un point par ligne\nAutre point important\nTroisieme point'}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Introduction / resume long *</label>
            <textarea
              value={form.intro}
              onChange={(e) => handleFieldChange('intro', e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Introduction de l article visible dans le bloc En resume..."
            />
          </div>

          <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">Sections de l article</h4>
                <p className="mt-1 text-sm text-gray-500">Chaque section garde la meme structure que les articles existants.</p>
              </div>
              <button
                type="button"
                onClick={addSection}
                className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50"
              >
                <Plus className="h-4 w-4" />
                Ajouter une section
              </button>
            </div>

            {form.sections.map((section, index) => (
              <div key={index} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">Section {index + 1}</p>
                  {form.sections.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSection(index)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-red-600 transition hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Retirer
                    </button>
                  )}
                </div>

                <div className="grid gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Titre de section *</label>
                    <input
                      type="text"
                      value={section.heading}
                      onChange={(e) => handleSectionChange(index, 'heading', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ex: Pourquoi structurer votre stock"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Paragraphes *</label>
                      <textarea
                        value={section.paragraphsText}
                        onChange={(e) => handleSectionChange(index, 'paragraphsText', e.target.value)}
                        rows={6}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={'Un paragraphe par ligne vide\n\nDeuxieme paragraphe'}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Bullets</label>
                      <textarea
                        value={section.bulletsText}
                        onChange={(e) => handleSectionChange(index, 'bulletsText', e.target.value)}
                        rows={6}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={'Une puce par ligne\nAutre benefice\nAutre conseil'}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Image section (URL)</label>
                      <input
                        type="url"
                        value={section.imageUrl}
                        onChange={(e) => handleSectionChange(index, 'imageUrl', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="https://..."
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Alt image section</label>
                      <input
                        type="text"
                        value={section.imageAlt}
                        onChange={(e) => handleSectionChange(index, 'imageAlt', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Description courte de l image de section"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Publication</p>
              <p className="text-sm text-gray-500">
                Activez la publication immediate ou creez un brouillon a publier plus tard.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleFieldChange('isPublished', false)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  !form.isPublished
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Brouillon
              </button>
              <button
                type="button"
                onClick={() => handleFieldChange('isPublished', true)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  form.isPublished
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Publier
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-gray-500">
              URL finale: <span className="font-medium text-gray-700">/blog/{form.slug || 'slug-article'}</span>
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Reinitialiser
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 font-semibold text-white transition hover:from-indigo-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSaving ? 'Creation...' : 'Creer l article'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h4 className="text-base font-semibold text-gray-900">Articles blog crees depuis l admin</h4>
            <p className="mt-1 text-sm text-gray-500">Vous pouvez publier, masquer ou supprimer un article Firestore.</p>
          </div>

          <button
            type="button"
            onClick={refetch}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center px-6 py-12 text-gray-500">
            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
            Chargement des articles admin...
          </div>
        ) : error ? (
          <div className="px-6 py-10 text-center text-sm text-red-600">{error}</div>
        ) : firestoreArticles.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">Aucun article admin pour le moment.</p>
          </div>
        ) : (
          <div className="grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-3">
            {firestoreArticles.map((article) => (
              <article key={article.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <img src={article.image} alt={article.imageAlt} className="h-44 w-full object-cover" />

                <div className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">{article.category}</p>
                      <h5 className="mt-2 text-lg font-semibold leading-7 text-gray-900">{article.title}</h5>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        article.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {article.isPublished ? 'Publie' : 'Brouillon'}
                    </span>
                  </div>

                  <p className="text-sm leading-6 text-gray-600">{article.excerpt}</p>

                  <div className="text-xs text-gray-500">
                    <div>Slug: {article.slug}</div>
                    <div>Date: {article.publishedAt}</div>
                    <div>Lecture: {article.readingTime}</div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {article.keywords.slice(0, 3).map((keyword) => (
                      <span key={keyword} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                        {keyword}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleTogglePublication(article.id, article.isPublished)}
                      disabled={actionLoadingId === article.id}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        article.isPublished
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {actionLoadingId === article.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : article.isPublished ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      {article.isPublished ? 'Mettre en brouillon' : 'Publier'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePost(article.id, article.title, article.imageStoragePath)}
                      disabled={actionLoadingId === article.id}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      Supprimer
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

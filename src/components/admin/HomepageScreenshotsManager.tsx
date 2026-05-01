import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Loader2, Save, Trash2, Upload } from 'lucide-react';
import {
  createHomepageScreenshot,
  deleteHomepageScreenshot,
  fetchHomepageScreenshots,
  type HomepageScreenshot,
  updateHomepageScreenshot,
  uploadHomepageScreenshotImage,
} from '../../services/homepageScreenshotService';
import { fallbackHomepageScreenshots } from '../../data/homepageScreenshots';

interface ScreenshotFormState {
  title: string;
  description: string;
  imageUrl: string;
  order: string;
  isActive: boolean;
}

const INITIAL_FORM: ScreenshotFormState = {
  title: '',
  description: '',
  imageUrl: '',
  order: '1',
  isActive: true,
};

export default function HomepageScreenshotsManager() {
  const [screenshots, setScreenshots] = useState<HomepageScreenshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editingItem, setEditingItem] = useState<HomepageScreenshot | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState<ScreenshotFormState>(INITIAL_FORM);

  const previewUrl = useMemo(() => {
    if (selectedFile) {
      return URL.createObjectURL(selectedFile);
    }

    return form.imageUrl.trim();
  }, [form.imageUrl, selectedFile]);

  useEffect(() => {
    void loadScreenshots();
  }, []);

  useEffect(() => {
    return () => {
      if (selectedFile) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl, selectedFile]);

  const loadScreenshots = async () => {
    setIsLoading(true);
    try {
      const nextScreenshots = await fetchHomepageScreenshots();
      setScreenshots(nextScreenshots);
    } catch (error) {
      console.error('Erreur chargement images home:', error);
      setMessage("Impossible de charger les images de la page d'accueil.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingItem(null);
    setSelectedFile(null);
  };

  const handleEdit = (item: HomepageScreenshot) => {
    setEditingItem(item);
    setSelectedFile(null);
    setForm({
      title: item.title,
      description: item.description,
      imageUrl: item.imageUrl,
      order: String(item.order),
      isActive: item.isActive,
    });
    setMessage('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    if (!form.title.trim()) {
      setMessage('Le titre est obligatoire.');
      return;
    }

    if (!selectedFile && !form.imageUrl.trim()) {
      setMessage("Ajoutez une image via upload ou collez une URL d'image.");
      return;
    }

    setIsSaving(true);

    try {
      let imageUrl = form.imageUrl.trim();
      let imageStoragePath = editingItem?.imageStoragePath;

      if (selectedFile) {
        const uploadResult = await uploadHomepageScreenshotImage(selectedFile);
        imageUrl = uploadResult.imageUrl;
        imageStoragePath = uploadResult.storagePath;
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        imageUrl,
        order: Number(form.order) || 0,
        isActive: form.isActive,
      };

      if (editingItem) {
        await updateHomepageScreenshot(editingItem.id, payload, {
          imageStoragePath,
        });
        setMessage('Image de la page d accueil mise a jour avec succes.');
      } else {
        await createHomepageScreenshot(payload, {
          imageStoragePath,
        });
        setMessage('Image de la page d accueil ajoutee avec succes.');
      }

      resetForm();
      await loadScreenshots();
    } catch (error) {
      console.error('Erreur sauvegarde image home:', error);
      setMessage("Impossible d'enregistrer l'image de la page d'accueil.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: HomepageScreenshot) => {
    const confirmed = window.confirm(`Supprimer l'image "${item.title}" ?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteHomepageScreenshot(item.id, item.imageStoragePath);
      setMessage('Image supprimee avec succes.');
      if (editingItem?.id === item.id) {
        resetForm();
      }
      await loadScreenshots();
    } catch (error) {
      console.error('Erreur suppression image home:', error);
      setMessage("Impossible de supprimer l'image.");
    }
  };

  const handleImportFallbackScreenshots = async () => {
    setIsSaving(true);
    setMessage('');

    try {
      for (const item of fallbackHomepageScreenshots) {
        await createHomepageScreenshot({
          title: item.title,
          description: item.description,
          imageUrl: item.imageUrl,
          order: item.order,
          isActive: item.isActive,
        });
      }

      setMessage('Images par defaut importees avec succes.');
      await loadScreenshots();
    } catch (error) {
      console.error('Erreur import images par defaut:', error);
      setMessage("Impossible d'importer les images par defaut.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickReorder = async (item: HomepageScreenshot, direction: 'up' | 'down') => {
    const currentIndex = screenshots.findIndex((entry) => entry.id === item.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= screenshots.length) {
      return;
    }

    const targetItem = screenshots[targetIndex];

    try {
      await Promise.all([
        updateHomepageScreenshot(
          item.id,
          {
            title: item.title,
            description: item.description,
            imageUrl: item.imageUrl,
            order: targetItem.order,
            isActive: item.isActive,
          },
          { imageStoragePath: item.imageStoragePath },
        ),
        updateHomepageScreenshot(
          targetItem.id,
          {
            title: targetItem.title,
            description: targetItem.description,
            imageUrl: targetItem.imageUrl,
            order: item.order,
            isActive: targetItem.isActive,
          },
          { imageStoragePath: targetItem.imageStoragePath },
        ),
      ]);

      await loadScreenshots();
    } catch (error) {
      console.error('Erreur reorganisation images home:', error);
      setMessage("Impossible de reorganiser l'ordre des images.");
    }
  };

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-cyan-100 bg-white shadow-sm">
      <div className="border-b border-cyan-100 bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-700 px-6 py-5 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-100">Images page d accueil</p>
            <h3 className="mt-2 text-2xl font-black">Screenshots de l application</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-50">
              Ajoutez, modifiez, ordonnez et activez les visuels affiches sur la home Factourati.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold">
            <ImagePlus className="h-4 w-4" />
            {screenshots.length} image{screenshots.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-6 py-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Titre</label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-cyan-500"
              placeholder="Tableau de bord Factourati"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-cyan-500"
              placeholder="Expliquez ce que montre l image."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">URL image</label>
            <input
              type="url"
              value={form.imageUrl}
              onChange={(event) => {
                setSelectedFile(null);
                setForm((current) => ({ ...current, imageUrl: event.target.value }));
              }}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-cyan-500"
              placeholder="https://..."
            />
            <p className="mt-2 text-xs text-gray-500">Vous pouvez aussi uploader une image depuis votre ordinateur.</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Upload image</label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-cyan-300 bg-cyan-50 px-4 py-4 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100">
              <Upload className="h-4 w-4" />
              {selectedFile ? selectedFile.name : 'Choisir une image'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Ordre</label>
              <input
                type="number"
                min="0"
                value={form.order}
                onChange={(event) => setForm((current) => ({ ...current, order: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-cyan-500"
              />
            </div>

            <div className="flex items-end">
              <label className="inline-flex items-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                Active sur la home
              </label>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="aspect-[16/10] bg-gray-100">
              {previewUrl ? (
                <img src={previewUrl} alt={form.title || 'Apercu'} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">Apercu image</div>
              )}
            </div>
          </div>

          {message ? (
            <div className={`rounded-xl px-4 py-3 text-sm ${
              message.includes('succes')
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border border-red-200 bg-red-50 text-red-700'
            }`}>
              {message}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingItem ? 'Mettre a jour' : 'Ajouter'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Reinitialiser
            </button>
          </div>
        </form>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Chargement des images...
            </div>
          ) : screenshots.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 text-center text-gray-500">
              <p>Aucune image enregistree pour la page d accueil.</p>
              <p className="mt-2 max-w-md text-sm text-gray-400">
                La home utilise actuellement des images fallback locales. Vous pouvez les importer ici pour ensuite les modifier, les supprimer ou changer leur ordre.
              </p>
              <button
                type="button"
                onClick={handleImportFallbackScreenshots}
                disabled={isSaving}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                Importer les images par defaut
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {screenshots.map((item) => (
                <article key={item.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="aspect-[16/10] bg-gray-100">
                    <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-base font-bold text-gray-900">{item.title}</h4>
                        <p className="mt-1 text-sm text-gray-600">{item.description || 'Sans description'}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                        item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {item.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Ordre #{item.order}</span>
                      <span>
                        Mise a jour {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('fr-FR') : '-'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickReorder(item, 'up')}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                        Monter
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickReorder(item, 'down')}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                        Descendre
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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
    </section>
  );
}

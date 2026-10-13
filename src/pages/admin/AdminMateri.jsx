import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Archive, ArrowDownUp, BookOpen, CalendarDays, Check,
  CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  CircleAlert, Clock3, ClipboardList, Eye, FileEdit, FileText, Filter,
  Image as ImageIcon, Loader2, Plus, RefreshCw, Search,
  Send, Settings2, Sparkles, Star, X
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZE = 10;

const EMPTY_FORM = {
  title: '',
  slug: '',
  description: '',
  excerpt: '',
  content: '',
  coverImage: '',
  order: 0,
  status: 'DRAFT',
  quizRequired: true,
  isFeatured: false,
  readTimeMinutes: '',
  seoTitle: '',
  seoDescription: ''
};

const STATUS_CONFIG = {
  DRAFT: {
    label: 'Draft',
    color: 'border-slate-200 bg-slate-50 text-slate-600',
    dot: 'bg-slate-400'
  },
  REVIEW: {
    label: 'Review',
    color: 'border-amber-200 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500'
  },
  PUBLISHED: {
    label: 'Published',
    color: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500'
  },
  ARCHIVED: {
    label: 'Archived',
    color: 'border-gray-200 bg-gray-100 text-gray-500',
    dot: 'bg-gray-400'
  }
};

const STATS_CONFIG = [
  {
    key: 'total',
    label: 'Total Materi',
    icon: BookOpen,
    color: 'bg-[#F8EDEF] text-[#7A1025]'
  },
  {
    key: 'draft',
    label: 'Draft',
    icon: FileEdit,
    color: 'bg-slate-100 text-slate-600'
  },
  {
    key: 'review',
    label: 'Menunggu Review',
    icon: Clock3,
    color: 'bg-amber-50 text-amber-600'
  },
  {
    key: 'published',
    label: 'Dipublikasikan',
    icon: CheckCircle2,
    color: 'bg-emerald-50 text-emerald-600'
  }
];

function slugify(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeMaterialForm(material) {
  return {
    ...EMPTY_FORM,
    ...(material ?? {}),
    title: String(material?.title ?? ''),
    slug: String(material?.slug ?? ''),
    description: String(material?.description ?? ''),
    excerpt: String(material?.excerpt ?? ''),
    content: typeof material?.content === 'string'
      ? material.content
      : material?.content == null
        ? ''
        : JSON.stringify(material.content, null, 2),
    coverImage: String(material?.coverImage ?? ''),
    order: Number.isFinite(Number(material?.order))
      ? Number(material.order)
      : 0,
    status: material?.status ?? 'DRAFT',
    quizRequired: material?.quizRequired ?? true,
    isFeatured: material?.isFeatured ?? false,
    readTimeMinutes: material?.readTimeMinutes == null
      ? ''
      : String(material.readTimeMinutes),
    seoTitle: String(material?.seoTitle ?? ''),
    seoDescription: String(material?.seoDescription ?? '')
  };
}

function formatDate(value) {
  if (!value) return 'Belum diperbarui';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function getResponseData(response) {
  return response?.data?.material ?? response?.data ?? response;
}

function getServerValidationErrors(error) {
  const errors =
    error?.errors ??
    error?.data?.errors ??
    error?.response?.data?.errors;

  if (!Array.isArray(errors)) return {};

  return errors.reduce((result, item) => {
    const field = item.field ??
      (Array.isArray(item.path) ? item.path.join('.') : '');

    if (field) {
      result[field] = item.message || 'Field tidak valid.';
    }

    return result;
  }, {});
}

function validateMaterialForm(form, status) {
  const errors = {};

  const title = form.title.trim();
  const slug = form.slug.trim().toLowerCase();
  const description = form.description.trim();
  const excerpt = form.excerpt.trim();
  const content = form.content.trim();
  const coverImage = form.coverImage.trim();
  const seoTitle = form.seoTitle.trim();
  const seoDescription = form.seoDescription.trim();

  const order = form.order === '' ? 0 : Number(form.order);

  const readTimeMinutes = form.readTimeMinutes === ''
    ? undefined
    : Number(form.readTimeMinutes);

  if (title.length < 3) {
    errors.title = 'Judul minimal 3 karakter.';
  } else if (title.length > 200) {
    errors.title = 'Judul maksimal 200 karakter.';
  }

  if (slug.length < 3) {
    errors.slug = 'Slug minimal 3 karakter.';
  } else if (slug.length > 220) {
    errors.slug = 'Slug maksimal 220 karakter.';
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.slug = 'Gunakan huruf kecil, angka, dan tanda hubung.';
  }

  if (!content) {
    errors.content = 'Konten tidak boleh kosong.';
  }

  if (description.length > 500) {
    errors.description = 'Deskripsi maksimal 500 karakter.';
  }

  if (excerpt.length > 500) {
    errors.excerpt = 'Excerpt maksimal 500 karakter.';
  }

  if (!Number.isInteger(order) || order < 0 || order > 9999) {
    errors.order = 'Urutan harus berupa bilangan bulat 0–9999.';
  }

  if (coverImage) {
    try {
      const url = new URL(coverImage);

      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.coverImage = 'URL harus menggunakan HTTP atau HTTPS.';
      }
    } catch {
      errors.coverImage = 'URL cover tidak valid.';
    }
  }

  if (
    readTimeMinutes !== undefined &&
    (!Number.isInteger(readTimeMinutes) ||
      readTimeMinutes < 1 ||
      readTimeMinutes > 999)
  ) {
    errors.readTimeMinutes = 'Waktu baca harus berupa bilangan bulat 1–999.';
  }

  if (!['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
    errors.status = 'Status materi tidak valid.';
  }

  if (seoTitle.length > 200) {
    errors.seoTitle = 'SEO title maksimal 200 karakter.';
  }

  if (seoDescription.length > 500) {
    errors.seoDescription = 'SEO description maksimal 500 karakter.';
  }

  return errors;
}

function buildMaterialPayload(form, status) {
  const readTimeMinutes = form.readTimeMinutes === ''
    ? undefined
    : Number(form.readTimeMinutes);

  return {
    title: form.title.trim(),
    slug: form.slug.trim().toLowerCase(),
    description: form.description.trim(),
    excerpt: form.excerpt.trim(),
    content: form.content.trim(),
    coverImage: form.coverImage.trim(),
    order: form.order === '' ? 0 : Number(form.order),
    status,
    quizRequired: Boolean(form.quizRequired),
    isFeatured: Boolean(form.isFeatured),
    ...(readTimeMinutes !== undefined ? { readTimeMinutes } : {}),
    seoTitle: form.seoTitle.trim(),
    seoDescription: form.seoDescription.trim()
  };
}

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;

  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${config.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function StatCard({ item, value, loading }) {
  const Icon = item.icon;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 transition hover:border-[#7A1025]/20 hover:shadow-[0_8px_30px_rgba(122,16,37,0.05)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.color}`}>
          <Icon size={19} />
        </div>
        <Sparkles size={14} className="text-slate-300" />
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="h-8 w-14 animate-pulse rounded-lg bg-slate-100" />
        ) : (
          <p className="font-display text-2xl font-bold tracking-tight text-slate-900">
            {Number(value ?? 0).toLocaleString('id-ID')}
          </p>
        )}

        <p className="mt-1.5 text-xs font-medium text-slate-500">
          {item.label}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  description,
  error,
  required = false,
  children
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={htmlFor}
        className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-700"
      >
        {label}
        {required && <span className="text-rose-500">*</span>}
      </label>

      {children}

      {description && !error && (
        <p className="mt-1.5 text-[11px] leading-5 text-slate-400">
          {description}
        </p>
      )}

      {error && (
        <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-5 text-rose-600">
          <CircleAlert size={13} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function TextInput({
  id,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  maxLength,
  min,
  max,
  disabled = false
}) {
  return (
    <input
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      maxLength={maxLength}
      min={min}
      max={max}
      disabled={disabled}
      className={`mt-2 h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#B86E7E] focus:ring-4 focus:ring-[#7A1025]/5 disabled:cursor-not-allowed disabled:bg-slate-50 ${error ? 'border-rose-300' : 'border-slate-200'
        }`}
    />
  );
}

function TextArea({
  id,
  name,
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength,
  error,
  className = ''
}) {
  return (
    <textarea
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      rows={rows}
      maxLength={maxLength}
      placeholder={placeholder}
      className={`mt-2 w-full resize-y rounded-xl border bg-white px-3.5 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#B86E7E] focus:ring-4 focus:ring-[#7A1025]/5 ${error ? 'border-rose-300' : 'border-slate-200'
        } ${className}`}
    />
  );
}

function ErrorBanner({ message, onClose }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-700"
    >
      <CircleAlert size={18} className="mt-0.5 shrink-0" />

      <div className="min-w-0 flex-1">
        <p className="font-semibold">Terjadi kesalahan</p>
        <p className="mt-1 break-words text-xs leading-5">{message}</p>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup pesan kesalahan"
          className="shrink-0 rounded-lg p-1 text-rose-400 transition hover:bg-rose-100 hover:text-rose-700"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

function EmptyState({ search, status, onCreate, onReset }) {
  return (
    <div className="flex flex-col items-center px-5 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F8EDEF] text-[#7A1025]">
        <FileText size={25} />
      </div>

      <h3 className="mt-4 font-display text-base font-bold text-slate-900">
        {search || status ? 'Materi tidak ditemukan' : 'Belum ada materi'}
      </h3>

      <p className="mt-2 max-w-sm text-xs leading-6 text-slate-500">
        {search || status
          ? 'Coba ubah kata kunci atau filter status untuk menemukan materi.'
          : 'Mulai bangun perpustakaan pembelajaran Nusa Bot dengan membuat materi pertama.'}
      </p>

      {search || status ? (
        <button
          type="button"
          onClick={onReset}
          className="mt-5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Reset filter
        </button>
      ) : (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#7A1025] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#64101f]"
        >
          <Plus size={15} />
          Buat Materi
        </button>
      )}
    </div>
  );
}

function MaterialEditor({ material, onClose, onSaved }) {
  const [form, setForm] = useState(() => normalizeMaterialForm(material));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const editing = Boolean(material?.id);

  useEffect(() => {
    setForm(normalizeMaterialForm(material));
    setError('');
    setFieldErrors({});
  }, [material]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) onClose();
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, saving]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));

    setFieldErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const handleTitleChange = (event) => {
    const title = event.target.value;

    setForm((current) => ({
      ...current,
      title,
      ...(!editing ? { slug: slugify(title) } : {})
    }));

    setFieldErrors((current) => {
      const next = { ...current };
      delete next.title;

      if (!editing) delete next.slug;

      return next;
    });
  };

  const handleSave = async (requestedStatus = form.status) => {
    if (saving) return;

    setError('');

    const errors = validateMaterialForm(form, requestedStatus);
    setFieldErrors(errors);

    if (Object.keys(errors).length) {
      setError('Periksa field yang ditandai sebelum menyimpan materi.');
      return;
    }

    const payload = buildMaterialPayload(form, requestedStatus);

    setSaving(true);

    try {
      const response = editing
        ? await apiFetch(`/admin/materials/${material.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        })
        : await apiFetch('/admin/materials', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

      if (response?.success === false) {
        throw new Error(response.message || 'Gagal menyimpan materi.');
      }

      const savedMaterial = getResponseData(response);

      if (!savedMaterial?.id && !savedMaterial?.slug) {
        throw new Error('Server tidak mengembalikan data materi yang valid.');
      }

      await onSaved(savedMaterial);
    } catch (saveError) {
      const serverErrors = getServerValidationErrors(saveError);

      if (Object.keys(serverErrors).length) {
        setFieldErrors(serverErrors);
      }

      const serverMessage =
        saveError?.response?.data?.message ??
        saveError?.data?.message ??
        saveError?.message ??
        'Gagal menyimpan materi.';

      setError(serverMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusAction = async (nextStatus) => {
    if (!material?.id || saving) {
      setError('Simpan materi terlebih dahulu sebelum mengubah status.');
      return;
    }

    const actionMessages = {
      PUBLISHED: 'Materi berhasil dipublikasikan.',
      DRAFT: 'Materi berhasil dikembalikan ke draft.',
      ARCHIVED: 'Materi berhasil diarsipkan.'
    };

    setSaving(true);
    setError('');
    setFieldErrors({});

    try {
      const response = await apiFetch(
        `/admin/materials/${material.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus })
        }
      );

      const savedMaterial = getResponseData(response);

      await onSaved({
        ...material,
        ...(savedMaterial && typeof savedMaterial === 'object'
          ? savedMaterial
          : {}),
        status: nextStatus
      });
    } catch (error) {
      const serverErrors = getServerValidationErrors(error);

      if (Object.keys(serverErrors).length) {
        setFieldErrors(serverErrors);
      }

      setError(
        error?.message ||
        `Gagal mengubah status materi menjadi ${nextStatus}.`
      );
    } finally {
      setSaving(false);
    }
  };

  const coverIsValid = (() => {
    if (!form.coverImage.trim()) return false;

    try {
      const url = new URL(form.coverImage.trim());
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  })();

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-5">
      <button
        type="button"
        aria-label="Tutup editor"
        disabled={saving}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[3px]"
      />

      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="material-editor-title"
        initial={{ opacity: 0, y: 20, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.99 }}
        transition={{ duration: 0.2 }}
        className="relative flex max-h-[96svh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[26px] border border-white/80 bg-[#FBFAFA] shadow-2xl sm:max-h-[92svh] sm:rounded-[26px]"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F8EDEF] text-[#7A1025]">
              {editing ? <FileEdit size={20} /> : <Plus size={21} />}
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#9B5265]">
                Content Management
              </p>
              <h2
                id="material-editor-title"
                className="mt-1 truncate font-display text-lg font-bold text-slate-900"
              >
                {editing ? 'Edit Materi' : 'Buat Materi Baru'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Tutup editor"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40"
          >
            <X size={17} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
          <div className="mx-auto max-w-4xl space-y-6">
            <ErrorBanner message={error} onClose={() => setError('')} />

            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Informasi utama
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Identitas, ringkasan, dan konten materi.
                  </p>
                </div>

                <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                  Wajib *
                </span>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Judul materi"
                  htmlFor="material-title"
                  required
                  error={fieldErrors.title}
                >
                  <TextInput
                    id="material-title"
                    name="title"
                    value={form.title}
                    onChange={handleTitleChange}
                    placeholder="Contoh: Pengertian Haid"
                    maxLength={200}
                    error={fieldErrors.title}
                  />
                </Field>

                <Field
                  label="Slug URL"
                  htmlFor="material-slug"
                  required
                  description="Identifier URL, gunakan huruf kecil dan tanda hubung."
                  error={fieldErrors.slug}
                >
                  <TextInput
                    id="material-slug"
                    name="slug"
                    value={form.slug}
                    onChange={handleChange}
                    placeholder="pengertian-haid"
                    maxLength={220}
                    error={fieldErrors.slug}
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field
                    label="Deskripsi"
                    htmlFor="material-description"
                    description={`${form.description.length}/500 karakter`}
                    error={fieldErrors.description}
                  >
                    <TextArea
                      id="material-description"
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      placeholder="Jelaskan materi ini secara singkat..."
                      rows={3}
                      maxLength={500}
                      error={fieldErrors.description}
                    />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <Field
                    label="Excerpt / Ringkasan kartu"
                    htmlFor="material-excerpt"
                    description={`${form.excerpt.length}/500 karakter. Ringkasan untuk daftar materi.`}
                    error={fieldErrors.excerpt}
                  >
                    <TextArea
                      id="material-excerpt"
                      name="excerpt"
                      value={form.excerpt}
                      onChange={handleChange}
                      placeholder="Ringkasan yang akan membantu pengguna memahami isi materi..."
                      rows={2}
                      maxLength={500}
                      error={fieldErrors.excerpt}
                    />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <Field
                    label="Konten pembelajaran"
                    htmlFor="material-content"
                    required
                    description={`${form.content.length.toLocaleString('id-ID')} karakter. Gunakan teks biasa atau Markdown sesuai dukungan halaman materi.`}
                    error={fieldErrors.content}
                  >
                    <TextArea
                      id="material-content"
                      name="content"
                      value={form.content}
                      onChange={handleChange}
                      placeholder={'# Pengertian Haid\n\nTuliskan materi pembelajaran di sini...\n\n## Pembahasan\n\nJelaskan isi materi secara terstruktur.'}
                      rows={14}
                      error={fieldErrors.content}
                      className="font-mono text-[13px] leading-7"
                    />
                  </Field>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Settings2 size={17} />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Publikasi dan pengaturan
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Atur alur editorial dan pengalaman belajar pengguna.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Status materi"
                  htmlFor="material-status"
                  error={fieldErrors.status}
                >
                  <div className="relative">
                    <select
                      id="material-status"
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className="mt-2 h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-sm text-slate-700 outline-none transition focus:border-[#B86E7E] focus:ring-4 focus:ring-[#7A1025]/5"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="REVIEW">Review</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>

                    <ChevronDown
                      size={15}
                      className="pointer-events-none absolute right-3.5 top-[26px] text-slate-400"
                    />
                  </div>
                </Field>

                <Field
                  label="Urutan materi"
                  htmlFor="material-order"
                  description="Urutan tampil pada daftar materi."
                  error={fieldErrors.order}
                >
                  <TextInput
                    id="material-order"
                    name="order"
                    type="number"
                    min="0"
                    max="9999"
                    value={form.order}
                    onChange={handleChange}
                    error={fieldErrors.order}
                  />
                </Field>

                <Field
                  label="Estimasi waktu baca (menit)"
                  htmlFor="material-read-time"
                  description="Opsional, untuk menampilkan estimasi baca."
                  error={fieldErrors.readTimeMinutes}
                >
                  <TextInput
                    id="material-read-time"
                    name="readTimeMinutes"
                    type="number"
                    min="1"
                    max="999"
                    value={form.readTimeMinutes}
                    onChange={handleChange}
                    placeholder="Contoh: 8"
                    error={fieldErrors.readTimeMinutes}
                  />
                </Field>

                <Field
                  label="Cover image URL"
                  htmlFor="material-cover-image"
                  description="URL gambar harus menggunakan HTTP atau HTTPS."
                  error={fieldErrors.coverImage}
                >
                  <TextInput
                    id="material-cover-image"
                    name="coverImage"
                    type="url"
                    value={form.coverImage}
                    onChange={handleChange}
                    placeholder="https://example.com/cover.jpg"
                    error={fieldErrors.coverImage}
                  />
                </Field>

                {coverIsValid && (
                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <img
                        src={form.coverImage}
                        alt="Preview cover materi"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                        className="h-16 w-24 rounded-lg border border-slate-200 bg-white object-cover"
                      />

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700">
                          Preview cover
                        </p>
                        <p className="mt-1 truncate text-[11px] text-slate-400">
                          {form.coverImage}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3 sm:col-span-2">
                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-[#7A1025]/20 hover:bg-[#FFFBFC]">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F8EDEF] text-[#7A1025]">
                        <BookOpen size={17} />
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-800">
                          Kuis wajib
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-500">
                          Pengguna perlu menyelesaikan kuis terkait materi.
                        </p>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      name="quizRequired"
                      checked={form.quizRequired}
                      onChange={handleChange}
                      className="h-4 w-4 shrink-0 accent-[#7A1025]"
                    />
                  </label>

                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-[#7A1025]/20 hover:bg-[#FFFBFC]">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <Star size={17} />
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-800">
                          Materi unggulan
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-500">
                          Tandai materi agar dapat diprioritaskan pada tampilan yang mendukung fitur unggulan.
                        </p>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      name="isFeatured"
                      checked={form.isFeatured}
                      onChange={handleChange}
                      className="h-4 w-4 shrink-0 accent-[#7A1025]"
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Search size={17} />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    SEO dan metadata
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Metadata opsional untuk kebutuhan judul dan deskripsi halaman.
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <Field
                  label="SEO title"
                  htmlFor="material-seo-title"
                  description={`${form.seoTitle.length}/200 karakter`}
                  error={fieldErrors.seoTitle}
                >
                  <TextInput
                    id="material-seo-title"
                    name="seoTitle"
                    value={form.seoTitle}
                    onChange={handleChange}
                    maxLength={200}
                    placeholder="Judul halaman untuk mesin pencari"
                    error={fieldErrors.seoTitle}
                  />
                </Field>

                <Field
                  label="SEO description"
                  htmlFor="material-seo-description"
                  description={`${form.seoDescription.length}/500 karakter`}
                  error={fieldErrors.seoDescription}
                >
                  <TextArea
                    id="material-seo-description"
                    name="seoDescription"
                    value={form.seoDescription}
                    onChange={handleChange}
                    maxLength={500}
                    rows={3}
                    placeholder="Deskripsi singkat halaman untuk mesin pencari"
                    error={fieldErrors.seoDescription}
                  />
                </Field>
              </div>
            </section>
          </div>
        </div>

        <footer className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p className="hidden text-[11px] text-slate-400 sm:block">
            Perubahan akan disimpan ke database.
          </p>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
            >
              Tutup
            </button>

            {material?.status === 'REVIEW' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleStatusAction('DRAFT')}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <FileEdit size={14} />
                  )}
                  Kembalikan ke Draft
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusAction('PUBLISHED')}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  {saving ? 'Memproses...' : 'Setujui & Publikasikan'}
                </button>
              </>
            ) : material?.status === 'PUBLISHED' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleStatusAction('DRAFT')}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 px-4 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
                >
                  <Archive size={14} />
                  Tarik Publikasi
                </button>

                <button
                  type="button"
                  onClick={() => handleSave('PUBLISHED')}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#7A1025] px-4 text-xs font-semibold text-white transition hover:bg-[#64101f] disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  Simpan Perubahan
                </button>
              </>
            ) : material?.status === 'ARCHIVED' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleStatusAction('DRAFT')}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#7A1025] px-4 text-xs font-semibold text-white transition hover:bg-[#64101f] disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  Pulihkan ke Draft
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSave('DRAFT')}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <FileEdit size={14} />
                  )}
                  Simpan Draft
                </button>

                <button
                  type="button"
                  onClick={() => handleSave('REVIEW')}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#7A1025] px-4 text-xs font-semibold text-white transition hover:bg-[#64101f] disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  Kirim Review
                </button>
              </>
            )}
          </div>
        </footer>
      </motion.section>
    </div>
  );
}


export default function AdminMateri() {
  const [stats, setStats] = useState({});
  const [materials, setMaterials] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0
  });

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadStats = useCallback(async () => {
    setStatsLoading(true);

    try {
      const response = await apiFetch('/admin/materials/stats');
      setStats(response?.data ?? {});
    } catch (loadError) {
      console.error('Material stats:', loadError);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadMaterials = useCallback(async (page = 1, signal) => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE)
      });

      if (search) params.set('search', search);
      if (status) params.set('status', status);

      const response = await apiFetch(
        `/admin/materials?${params.toString()}`,
        { signal }
      );

      const data = response?.data ?? {};

      setMaterials(Array.isArray(data.items) ? data.items : []);
      setPagination({
        page: Number(data.pagination?.page ?? page),
        limit: Number(data.pagination?.limit ?? PAGE_SIZE),
        total: Number(data.pagination?.total ?? 0),
        totalPages: Number(data.pagination?.totalPages ?? 0)
      });
    } catch (loadError) {
      if (loadError?.name === 'AbortError' || signal?.aborted) return;

      setError(loadError?.message || 'Gagal memuat daftar materi.');
      setMaterials([]);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const controller = new AbortController();

    const timeout = window.setTimeout(() => {
      loadMaterials(1, controller.signal);
    }, 200);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [loadMaterials]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (!notice) return undefined;

    const timeout = window.setTimeout(() => setNotice(''), 3500);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  const statsItems = useMemo(() => (
    STATS_CONFIG.map((item) => {
      let value = stats[item.key];

      if (item.key === 'total') {
        value = stats.total ?? stats.totalMaterials ?? stats.all ?? value;
      }

      return { ...item, value: value ?? 0 };
    })
  ), [stats]);

  const visibleRange = useMemo(() => {
    if (!pagination.total) return '0 materi';

    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(start + materials.length - 1, pagination.total);

    return `${start}–${end} dari ${pagination.total} materi`;
  }, [materials.length, pagination.limit, pagination.page, pagination.total]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatus('');
  };

  const handleCreate = () => {
    setSelectedMaterial(null);
    setError('');
    setEditorOpen(true);
  };

  const handleEdit = async (id) => {
    setError('');

    try {
      const response = await apiFetch(`/admin/materials/${id}`);
      const material = getResponseData(response);

      if (!material?.id) {
        throw new Error('Data materi tidak valid.');
      }

      setSelectedMaterial(material);
      setEditorOpen(true);
    } catch (loadError) {
      setError(loadError?.message || 'Gagal membuka materi.');
    }
  };

  const handleArchive = async (material) => {
    const confirmed = window.confirm(
      `Arsipkan materi "${material.title}"?\n\nMateri tidak akan dihapus permanen.`
    );

    if (!confirmed) return;

    setError('');
    setNotice('');

    try {
      await apiFetch(`/admin/materials/${material.id}`, {
        method: 'DELETE'
      });

      setNotice('Materi berhasil diarsipkan.');

      await Promise.all([
        loadMaterials(pagination.page),
        loadStats()
      ]);
    } catch (archiveError) {
      setError(archiveError?.message || 'Gagal mengarsipkan materi.');
    }
  };

  const handleSaved = async (savedMaterial) => {
    setEditorOpen(false);
    setSelectedMaterial(null);

    setNotice(
      savedMaterial?.status === 'REVIEW'
        ? 'Materi berhasil disimpan dan dikirim untuk review.'
        : 'Materi berhasil disimpan.'
    );

    await Promise.all([
      loadMaterials(pagination.page),
      loadStats()
    ]);
  };

  const handleRefresh = async () => {
    setNotice('');
    await Promise.all([
      loadMaterials(pagination.page),
      loadStats()
    ]);
  };

  const navigate = useNavigate();

  const handleManageQuiz = (material) => {
    navigate(`/admin/kuis?materialId=${encodeURIComponent(material.id)}`);
  };


  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900">
      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium text-slate-400">Content</span>
              <ChevronRight size={13} className="text-slate-300" />
              <span className="font-semibold text-[#7A1025]">Materi</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F8EDEF] text-[#7A1025]">
                <BookOpen size={23} />
              </div>

              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Kelola Materi
                </h1>

                <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                  Kelola konten pembelajaran, status editorial, dan metadata materi.
                </p>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || statsLoading}
              aria-label="Segarkan data"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={loading || statsLoading ? 'animate-spin' : ''}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleCreate}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#7A1025] px-4 text-xs font-semibold text-white shadow-[0_5px_18px_rgba(122,16,37,0.16)] transition hover:-translate-y-0.5 hover:bg-[#64101f]"
            >
              <Plus size={16} />
              Materi Baru
            </button>
          </div>
        </section>

        <ErrorBanner
          message={error}
          onClose={() => setError('')}
        />

        <AnimatePresence>
          {notice && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700"
            >
              <CheckCircle2 size={16} />
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice('')}
                className="ml-auto rounded p-1 hover:bg-emerald-100"
                aria-label="Tutup notifikasi"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="mb-7 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {statsItems.map((item) => (
            <StatCard
              key={item.key}
              item={item}
              value={item.value}
              loading={statsLoading}
            />
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_5px_30px_rgba(15,23,42,0.025)]">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Semua Materi
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Cari, filter, edit, atau arsipkan materi pembelajaran.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <form
                  onSubmit={handleSearchSubmit}
                  className="flex min-w-0 gap-2 sm:w-[330px]"
                >
                  <div className="relative min-w-0 flex-1">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="search"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Cari judul atau slug..."
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#B86E7E] focus:ring-4 focus:ring-[#7A1025]/5"
                    />
                  </div>

                  <button
                    type="submit"
                    className="h-10 rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Cari
                  </button>
                </form>

                <div className="relative">
                  <Filter
                    size={14}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    aria-label="Filter status materi"
                    className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-xs font-medium text-slate-600 outline-none transition focus:border-[#B86E7E] focus:ring-4 focus:ring-[#7A1025]/5 sm:w-[165px]"
                  >
                    <option value="">Semua status</option>
                    <option value="DRAFT">Draft</option>
                    <option value="REVIEW">Review</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>

                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>

                {(search || status || searchInput) && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-[#7A1025]"
                  >
                    <X size={14} />
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Materi
                  </th>

                  <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Status
                  </th>

                  <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Terakhir diperbarui
                  </th>

                  <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Pengaturan
                  </th>

                  <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={5} className="px-5 py-5">
                        <div className="flex animate-pulse items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-slate-100" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 w-1/3 rounded bg-slate-100" />
                            <div className="h-2.5 w-1/5 rounded bg-slate-50" />
                          </div>
                          <div className="h-6 w-20 rounded-full bg-slate-100" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : materials.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        search={search}
                        status={status}
                        onCreate={handleCreate}
                        onReset={handleResetFilters}
                      />
                    </td>
                  </tr>
                ) : (
                  materials.map((material) => (
                    <motion.tr
                      key={material.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="group transition hover:bg-[#FFFBFC]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-[#F8EDEF] text-[#7A1025]">
                            {material.coverImage ? (
                              <img
                                src={material.coverImage}
                                alt=""
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.style.display = 'none';
                                }}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <FileText size={19} />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(material.id)}
                                className="max-w-[370px] truncate text-left text-sm font-semibold text-slate-800 transition hover:text-[#7A1025]"
                              >
                                {material.title}
                              </button>

                              {material.isFeatured && (
                                <Star
                                  size={13}
                                  fill="currentColor"
                                  className="shrink-0 text-amber-500"
                                />
                              )}
                            </div>

                            <p className="mt-1 max-w-[400px] truncate text-[11px] text-slate-400">
                              /{material.slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge status={material.status} />
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <CalendarDays size={14} className="shrink-0 text-slate-400" />
                          {formatDate(material.updatedAt)}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="space-y-1.5">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${material.quizRequired ? 'text-[#7A1025]' : 'text-slate-400'}`}>
                            <BookOpen size={13} />
                            {material.quizRequired ? 'Kuis wajib' : 'Kuis opsional'}
                          </span>

                          {material.readTimeMinutes && (
                            <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              <Clock3 size={12} />
                              {material.readTimeMinutes} menit baca
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEdit(material.id)}
                            aria-label={`Edit ${material.title}`}
                            title="Edit materi"
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-white hover:text-[#7A1025]"
                          >
                            <FileEdit size={16} />
                          </button>

                          {material.status !== 'ARCHIVED' && (
                            <button
                              type="button"
                              onClick={() => handleArchive(material)}
                              aria-label={`Arsipkan ${material.title}`}
                              title="Arsipkan materi"
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-slate-400 transition hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Archive size={16} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleManageQuiz(material)}
                            aria-label={`Kelola kuis untuk ${material.title}`}
                            title="Kelola kuis materi"
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-[#F8EDEF] hover:text-[#7A1025]"
                          >
                            <ClipboardList size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <footer className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs text-slate-500">
              {loading ? 'Memuat daftar materi...' : visibleRange}
            </p>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <p className="text-[11px] text-slate-400">
                Halaman {pagination.page} dari {Math.max(1, pagination.totalPages)}
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={loading || pagination.page <= 1}
                  onClick={() => loadMaterials(pagination.page - 1)}
                  aria-label="Halaman sebelumnya"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>

                <button
                  type="button"
                  disabled={loading || pagination.page >= pagination.totalPages}
                  onClick={() => loadMaterials(pagination.page + 1)}
                  aria-label="Halaman berikutnya"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </footer>
        </section>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <p className="text-[11px] text-slate-400">
            Nusa Bot CMS <span className="mx-1">·</span> Content Management
          </p>

          <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <CheckCircle2 size={13} className="text-emerald-500" />
            Pengelolaan konten
          </p>
        </div>
      </main>

      <AnimatePresence>
        {editorOpen && (
          <MaterialEditor
            material={selectedMaterial}
            onClose={() => {
              setEditorOpen(false);
              setSelectedMaterial(null);
            }}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


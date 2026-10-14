import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Edit3,
  ExternalLink,
  Film,
  Plus,
  Search,
  Star,
  Trash2,
  X
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

const EMPTY_FORM = {
  title: '',
  description: '',
  url: '',
  status: 'DRAFT',
  isFeatured: false,
  order: 0
};

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Semua' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' }
];

const ease = [0.22, 1, 0.36, 1];
const PAGE_SIZE = 50;

function getYouTubeId(value) {
  if (!value || typeof value !== 'string') return null;

  try {
    const parsed = new URL(value.trim());
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    let videoId = null;

    if (hostname === 'youtu.be') {
      videoId = parsed.pathname.split('/').filter(Boolean)[0];
    } else if (
      hostname === 'youtube.com' ||
      hostname.endsWith('.youtube.com')
    ) {
      if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v');
      } else {
        const segments = parsed.pathname.split('/').filter(Boolean);

        if (
          ['shorts', 'embed', 'live', 'v'].includes(segments[0])
        ) {
          videoId = segments[1];
        }
      }
    }

    return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)
      ? videoId
      : null;
  } catch {
    return null;
  }
}

function getThumbnail(video) {
  if (video?.thumbnailUrl) return video.thumbnailUrl;

  const externalId = video?.externalId || getYouTubeId(video?.url);

  return externalId
    ? `https://img.youtube.com/vi/${externalId}/hqdefault.jpg`
    : null;
}

function formatDuration(seconds) {
  const total = Number(seconds);

  if (!Number.isFinite(total) || total <= 0) return 'YouTube';

  const minutes = Math.floor(total / 60);
  const secondsLeft = Math.floor(total % 60);

  return `${minutes}:${String(secondsLeft).padStart(2, '0')}`;
}

function statusClass(status) {
  const classes = {
    DRAFT: 'bg-slate-100 text-slate-500',
    REVIEW: 'bg-amber-50 text-amber-700',
    PUBLISHED: 'bg-emerald-50 text-emerald-700',
    ARCHIVED: 'bg-red-50 text-red-600'
  };

  return classes[status] || classes.DRAFT;
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

function EmptyState({ search, onAdd }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F6E5E8] text-[#7A1025]">
        <Film className="h-6 w-6" />
      </div>

      <p className="mt-4 text-sm font-bold text-slate-700">
        {search ? 'Video tidak ditemukan' : 'Belum ada video'}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {search
          ? 'Coba gunakan kata kunci lain.'
          : 'Tambahkan video YouTube pertama kamu.'}
      </p>

      {!search && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#7A1025] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#650D1F]"
        >
          <Plus className="h-4 w-4" />
          Tambah Video
        </button>
      )}
    </div>
  );
}

function VideoCard({
  video,
  index,
  actionId,
  onEdit,
  onStatusChange,
  onArchive
}) {
  const thumbnail = getThumbnail(video);
  const busy = actionId === video.id;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease, delay: index * 0.03 }}
      className="group overflow-hidden rounded-2xl border border-slate-100 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-video overflow-hidden bg-slate-100">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={video.title || 'Video pembelajaran'}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            onError={event => {
              event.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[#F6E5E8] text-[#7A1025]">
            <Film className="h-8 w-8" />
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass(video.status)}`}
          >
            {video.status || 'DRAFT'}
          </span>

          {video.isFeatured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#D4A017] px-2.5 py-1 text-[10px] font-semibold text-white">
              <Star className="h-3 w-3" fill="currentColor" />
              Featured
            </span>
          )}
        </div>

        <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-semibold text-white">
          {formatDuration(video.durationSeconds)}
        </span>
      </div>

      <div className="p-4">
        <h3 className="line-clamp-2 text-sm font-bold leading-5 text-[#0F172A]">
          {video.title || 'Tanpa judul'}
        </h3>

        {video.description && (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
            {video.description}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-[#7A1025] transition hover:text-[#650D1F]"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">YouTube</span>
          </a>

          <div className="flex items-center gap-1">
            {video.status !== 'PUBLISHED' &&
              video.status !== 'ARCHIVED' && (
                <button
                  type="button"
                  onClick={() => onStatusChange(video, 'PUBLISHED')}
                  disabled={Boolean(actionId)}
                  className="rounded-xl px-2.5 py-2 text-[10px] font-semibold text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? '...' : 'Publish'}
                </button>
              )}

            {video.status === 'PUBLISHED' && (
              <button
                type="button"
                onClick={() => onStatusChange(video, 'DRAFT')}
                disabled={Boolean(actionId)}
                className="rounded-xl px-2.5 py-2 text-[10px] font-semibold text-amber-600 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? '...' : 'Draft'}
              </button>
            )}

            <button
              type="button"
              onClick={() => onEdit(video)}
              disabled={Boolean(actionId)}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-[#F6E5E8] hover:text-[#7A1025] disabled:opacity-40"
              title="Edit video"
              aria-label={`Edit video ${video.title}`}
            >
              <Edit3 className="h-4 w-4" />
            </button>

            {video.status !== 'ARCHIVED' && (
              <button
                type="button"
                onClick={() => onArchive(video)}
                disabled={Boolean(actionId)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                title="Arsipkan video"
                aria-label={`Arsipkan video ${video.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function AdminVideo() {
  const [videos, setVideos] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);

  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadVideos = useCallback(
    async (targetPage = 1) => {
      try {
        setLoading(true);
        setError('');

        const params = new URLSearchParams({
          page: String(targetPage),
          limit: String(PAGE_SIZE)
        });

        const keyword = searchInput.trim();

        if (keyword) params.set('search', keyword);
        if (status !== 'ALL') params.set('status', status);

        const result = await apiFetch(
          `/admin/videos?${params.toString()}`
        );

        const data = result?.data ?? result;
        const items = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.videos)
            ? data.videos
            : [];

        const paginationData = data?.pagination ?? result?.pagination ?? {};

        setVideos(items);
        setPagination({
          page: Number(paginationData.page) || targetPage,
          limit: Number(paginationData.limit) || PAGE_SIZE,
          total: Number(paginationData.total ?? items.length),
          totalPages: Math.max(
            1,
            Number(paginationData.totalPages) || 1
          )
        });
      } catch (err) {
        console.error('AdminVideo load:', err);
        setError(
          getErrorMessage(err, 'Gagal memuat daftar video.')
        );
      } finally {
        setLoading(false);
      }
    },
    [searchInput, status]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => loadVideos(1), 300);
    return () => window.clearTimeout(timer);
  }, [loadVideos]);

  const stats = useMemo(
    () => ({
      total: pagination.total,
      published: videos.filter(video => video.status === 'PUBLISHED').length,
      draft: videos.filter(video => video.status === 'DRAFT').length,
      featured: videos.filter(video => Boolean(video.isFeatured)).length
    }),
    [videos, pagination.total]
  );

  const thumbnailPreview = useMemo(() => {
    const videoId = getYouTubeId(form.url);

    return videoId
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : null;
  }, [form.url]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, order: pagination.total });
    setError('');
    setSuccess('');
    setModalOpen(true);
  }

  function openEdit(video) {
    setEditingId(video.id);
    setForm({
      title: video.title || '',
      description: video.description || '',
      url: video.url || '',
      status: video.status || 'DRAFT',
      isFeatured: Boolean(video.isFeatured),
      order: Number(video.order) || 0
    });
    setError('');
    setSuccess('');
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setError('');
    setSuccess('');
  }

  function updateField(name, value) {
    setForm(current => ({ ...current, [name]: value }));
    setError('');
    setSuccess('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const title = String(form.title || '').trim();
    const url = String(form.url || '').trim();
    const description = String(form.description ?? '').trim();
    const youtubeId = getYouTubeId(url);

    if (!title) {
      setError('Judul video wajib diisi.');
      return;
    }

    if (!url) {
      setError('URL YouTube wajib diisi.');
      return;
    }

    if (!youtubeId) {
      setError('Masukkan URL YouTube yang valid.');
      return;
    }

    // PENTING: description harus selalu berupa string, bukan null.
    const basePayload = {
      title,
      description,
      url,
      status: form.status,
      isFeatured: Boolean(form.isFeatured),
      order: Math.max(0, Number(form.order) || 0)
    };

    const payload = editingId
      ? basePayload
      : {
          ...basePayload,
          slug: slugify(title) || `video-${Date.now()}`
        };

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (editingId) {
        await apiFetch(`/admin/videos/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        setSuccess('Video berhasil diperbarui.');
      } else {
        await apiFetch('/admin/videos', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setSuccess('Video berhasil ditambahkan.');
      }

      await loadVideos(editingId ? pagination.page : 1);

      window.setTimeout(() => {
        setModalOpen(false);
        setEditingId(null);
        setForm({ ...EMPTY_FORM });
        setSuccess('');
      }, 700);
    } catch (err) {
      console.error('AdminVideo save:', err);
      setError(
        getErrorMessage(
          err,
          editingId
            ? 'Gagal memperbarui video.'
            : 'Gagal menambahkan video.'
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(video, nextStatus) {
    if (!video?.id || actionId) return;

    const label = nextStatus === 'PUBLISHED'
      ? 'publikasikan'
      : 'kembalikan ke draft';

    if (!window.confirm(
      `${label.charAt(0).toUpperCase() + label.slice(1)} video "${video.title}"?`
    )) {
      return;
    }

    try {
      setActionId(video.id);
      setError('');
      setSuccess('');

      await apiFetch(`/admin/videos/${video.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });

      setSuccess(
        nextStatus === 'PUBLISHED'
          ? 'Video berhasil dipublikasikan.'
          : 'Video berhasil dikembalikan ke draft.'
      );

      await loadVideos(pagination.page);

      window.setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('AdminVideo status:', err);
      setError(
        getErrorMessage(err, 'Gagal mengubah status video.')
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleArchive(video) {
    if (!video?.id || actionId) return;

    if (!window.confirm(`Arsipkan video "${video.title}"?`)) return;

    try {
      setActionId(video.id);
      setError('');
      setSuccess('');

      await apiFetch(`/admin/videos/${video.id}`, {
        method: 'DELETE'
      });

      setSuccess('Video berhasil diarsipkan.');

      const nextPage =
        videos.length === 1 && pagination.page > 1
          ? pagination.page - 1
          : pagination.page;

      await loadVideos(nextPage);

      window.setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('AdminVideo archive:', err);
      setError(
        getErrorMessage(err, 'Gagal mengarsipkan video.')
      );
    } finally {
      setActionId(null);
    }
  }

  function goToPage(nextPage) {
    if (
      nextPage < 1 ||
      nextPage > pagination.totalPages ||
      loading
    ) {
      return;
    }

    loadVideos(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="me-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Film className="h-4 w-4 text-[#D4A017]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9B5265]">
              Video CMS
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">
            Video Pembelajaran
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Kelola video YouTube yang ditampilkan di Nusa Bot.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7A1025] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#650D1F]"
        >
          <Plus className="h-4 w-4" />
          Tambah Video
        </button>
      </section>

      {success && !modalOpen && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <Check className="h-4 w-4" />
          {success}
        </div>
      )}

      {error && !modalOpen && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Video', value: stats.total, color: 'text-[#0F172A]' },
          { label: 'Published', value: stats.published, color: 'text-emerald-600' },
          { label: 'Draft', value: stats.draft, color: 'text-slate-700' },
          { label: 'Featured', value: stats.featured, color: 'text-[#D4A017]' }
        ].map(item => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
          >
            <p className="text-xs text-slate-400">{item.label}</p>
            <p className={`mt-2 text-2xl font-bold ${item.color}`}>
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              placeholder="Cari video..."
              aria-label="Cari video"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-[#9B5265] focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatus(option.value)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  status === option.value
                    ? 'bg-[#7A1025] text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-[#F6E5E8] hover:text-[#7A1025]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(item => (
                <div
                  key={item}
                  className="overflow-hidden rounded-2xl border border-slate-100"
                >
                  <div className="aspect-video animate-pulse bg-slate-100" />

                  <div className="space-y-2 p-4">
                    <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-3/5 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-2/5 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : videos.length === 0 ? (
            <EmptyState
              search={searchInput.trim()}
              onAdd={openCreate}
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {videos.map((video, index) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    index={index}
                    actionId={actionId}
                    onEdit={openEdit}
                    onStatusChange={handleStatusChange}
                    onArchive={handleArchive}
                  />
                ))}
              </div>

              {pagination.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-400">
                    Halaman {pagination.page} dari {pagination.totalPages}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => goToPage(pagination.page - 1)}
                      disabled={loading || pagination.page <= 1}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Sebelumnya
                    </button>

                    <button
                      type="button"
                      onClick={() => goToPage(pagination.page + 1)}
                      disabled={
                        loading ||
                        pagination.page >= pagination.totalPages
                      }
                      className="rounded-xl bg-[#7A1025] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#650D1F] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm"
            onMouseDown={event => {
              if (event.target === event.currentTarget) closeModal();
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.25, ease }}
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white shadow-[0_30px_100px_rgba(40,10,20,0.25)]"
              onMouseDown={event => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9B5265]">
                    Video CMS
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-[#0F172A]">
                    {editingId ? 'Edit Video' : 'Tambah Video'}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  aria-label="Tutup formulir"
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 p-5">
                {error && (
                  <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
                    <Check className="h-4 w-4" />
                    {success}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="video-title"
                    className="mb-2 block text-xs font-semibold text-slate-600"
                  >
                    Judul Video <span className="text-red-500">*</span>
                  </label>

                  <input
                    id="video-title"
                    value={form.title}
                    onChange={event => updateField('title', event.target.value)}
                    placeholder="Contoh: Pengertian Haid dalam Fikih"
                    required
                    maxLength={200}
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#9B5265] focus:ring-4 focus:ring-[#F6E5E8]"
                  />

                  {!editingId && form.title && (
                    <p className="mt-2 text-[10px] text-slate-400">
                      Slug:{' '}
                      <span className="font-medium text-slate-500">
                        {slugify(form.title) || 'video'}
                      </span>
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="video-url"
                    className="mb-2 block text-xs font-semibold text-slate-600"
                  >
                    URL YouTube <span className="text-red-500">*</span>
                  </label>

                  <input
                    id="video-url"
                    type="url"
                    value={form.url}
                    onChange={event => updateField('url', event.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#9B5265] focus:ring-4 focus:ring-[#F6E5E8]"
                  />

                  {thumbnailPreview && (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                      <img
                        src={thumbnailPreview}
                        alt="Preview video YouTube"
                        className="aspect-video w-full object-cover"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="video-description"
                    className="mb-2 block text-xs font-semibold text-slate-600"
                  >
                    Deskripsi
                  </label>

                  <textarea
                    id="video-description"
                    value={form.description}
                    onChange={event =>
                      updateField('description', event.target.value)
                    }
                    rows={4}
                    maxLength={5000}
                    placeholder="Penjelasan singkat mengenai video..."
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#9B5265] focus:ring-4 focus:ring-[#F6E5E8]"
                  />
                  <p className="mt-1 text-right text-[10px] text-slate-400">
                    {form.description.length}/5000 karakter
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="video-status"
                      className="mb-2 block text-xs font-semibold text-slate-600"
                    >
                      Status
                    </label>

                    <select
                      id="video-status"
                      value={form.status}
                      onChange={event =>
                        updateField('status', event.target.value)
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#9B5265]"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="REVIEW">Review</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="video-order"
                      className="mb-2 block text-xs font-semibold text-slate-600"
                    >
                      Urutan
                    </label>

                    <input
                      id="video-order"
                      type="number"
                      min="0"
                      step="1"
                      value={form.order}
                      onChange={event =>
                        updateField('order', event.target.value)
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-[#9B5265]"
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-100 bg-[#FBF8F6] p-4">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={event =>
                      updateField('isFeatured', event.target.checked)
                    }
                    className="h-4 w-4 accent-[#7A1025]"
                  />

                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">
                      Jadikan Featured
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Video akan diprioritaskan di halaman pembelajaran.
                    </p>
                  </div>
                </label>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 disabled:opacity-40"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7A1025] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#650D1F] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving
                      ? 'Menyimpan...'
                      : editingId
                        ? 'Simpan Perubahan'
                        : 'Tambah Video'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
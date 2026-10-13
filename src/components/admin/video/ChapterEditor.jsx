import { useEffect, useState } from 'react';
import {
  Clock3,
  Edit3,
  GripVertical,
  Plus,
  Save,
  Trash2,
  X
} from 'lucide-react';

import { authFetch } from '../../../lib/api';

function formatTime(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(value / 60);
  const remaining = Math.floor(value % 60);

  return `${minutes}:${String(remaining).padStart(2, '0')}`;
}

function parseTime(value) {
  if (!value) return 0;

  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  const parts = value.split(':').map(Number);

  if (parts.some(Number.isNaN)) return 0;

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return 0;
}

const emptyForm = {
  title: '',
  description: '',
  startTime: '00:00',
  endTime: '',
  order: 0
};

export default function ChapterEditor({ videoId, durationSeconds = 0 }) {
  const [chapters, setChapters] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadChapters() {
    try {
      setLoading(true);
      setError('');

      const result = await authFetch(`/admin/videos/${videoId}/chapters`);

      setChapters(result.chapters || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat chapter.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (videoId) loadChapters();
  }, [videoId]);

  function resetForm() {
    setForm({
      ...emptyForm,
      order: chapters.length
    });

    setEditingId(null);
  }

  function handleEdit(chapter) {
    setEditingId(chapter.id);

    setForm({
      title: chapter.title,
      description: chapter.description || '',
      startTime: formatTime(chapter.startSeconds),
      endTime: chapter.endSeconds ? formatTime(chapter.endSeconds) : '',
      order: chapter.order
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');

      const startSeconds = parseTime(form.startTime);
      const endSeconds = form.endTime ? parseTime(form.endTime) : null;

      if (!form.title.trim()) {
        throw new Error('Judul chapter wajib diisi.');
      }

      if (endSeconds !== null && endSeconds <= startSeconds) {
        throw new Error('Waktu selesai harus lebih besar dari waktu mulai.');
      }

      if (durationSeconds && startSeconds >= durationSeconds) {
        throw new Error('Waktu mulai berada di luar durasi video.');
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        startSeconds,
        endSeconds,
        order: Number(form.order) || 0
      };

      if (editingId) {
        await authFetch(`/admin/videos/${videoId}/chapters/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await authFetch(`/admin/videos/${videoId}/chapters`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      await loadChapters();
      resetForm();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan chapter.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(chapterId) {
    const confirmed = window.confirm(
      'Hapus chapter ini? Tindakan ini tidak dapat dibatalkan.'
    );

    if (!confirmed) return;

    try {
      setError('');

      await authFetch(`/admin/videos/${videoId}/chapters/${chapterId}`, {
        method: 'DELETE'
      });

      await loadChapters();

      if (editingId === chapterId) {
        resetForm();
      }
    } catch (err) {
      setError(err.message || 'Gagal menghapus chapter.');
    }
  }

  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_18px_60px_rgba(60,10,20,0.06)] sm:p-6">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F6E5E8] text-[#7A1025]">
              <Clock3 className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-bold text-[#0F172A]">
                Chapter Video
              </h2>

              <p className="text-xs text-slate-500">
                Atur struktur pembelajaran berdasarkan timeline video.
              </p>
            </div>
          </div>
        </div>

        {!editingId && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              document.getElementById('chapter-form')?.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
              });
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#7A1025] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#641020]"
          >
            <Plus className="h-4 w-4" />
            Tambah Chapter
          </button>
        )}
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">

        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-[#0F172A]">
              Timeline
            </p>

            <span className="text-xs text-slate-400">
              {chapters.length} chapter
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
              Memuat chapter...
            </div>
          ) : chapters.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              <Clock3 className="mx-auto h-7 w-7 text-slate-300" />

              <p className="mt-3 text-sm font-semibold text-slate-600">
                Belum ada chapter
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Tambahkan chapter pertama untuk membagi video menjadi beberapa bagian.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...chapters]
                .sort((a, b) => a.order - b.order)
                .map((chapter, index) => (
                  <div
                    key={chapter.id}
                    className={`group flex items-center gap-3 rounded-2xl border p-3 transition ${
                      editingId === chapter.id
                        ? 'border-[#D9A5B1] bg-[#FDF6F7]'
                        : 'border-slate-100 bg-slate-50/60 hover:bg-white'
                    }`}
                  >
                    <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-bold text-[#7A1025] shadow-sm">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#0F172A]">
                        {chapter.title}
                      </p>

                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                        <span>{formatTime(chapter.startSeconds)}</span>

                        {chapter.endSeconds && (
                          <>
                            <span>•</span>
                            <span>{formatTime(chapter.endSeconds)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => handleEdit(chapter)}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-[#F6E5E8] hover:text-[#7A1025]"
                        title="Edit chapter"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(chapter.id)}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                        title="Hapus chapter"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <form
          id="chapter-form"
          onSubmit={handleSubmit}
          className="rounded-2xl bg-[#FBF8F6] p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[#0F172A]">
                {editingId ? 'Edit Chapter' : 'Chapter Baru'}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Tentukan posisi chapter pada video.
              </p>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-5 space-y-4">

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Judul
              </span>

              <input
                value={form.title}
                onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))}
                placeholder="Contoh: Pengertian Haid"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[#9B5265] focus:ring-2 focus:ring-[#F6E5E8]"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Deskripsi
              </span>

              <textarea
                value={form.description}
                onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))}
                rows={3}
                placeholder="Penjelasan singkat chapter..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[#9B5265] focus:ring-2 focus:ring-[#F6E5E8]"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Mulai
                </span>

                <input
                  value={form.startTime}
                  onChange={event => setForm(prev => ({ ...prev, startTime: event.target.value }))}
                  placeholder="00:00"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#9B5265] focus:ring-2 focus:ring-[#F6E5E8]"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Selesai
                </span>

                <input
                  value={form.endTime}
                  onChange={event => setForm(prev => ({ ...prev, endTime: event.target.value }))}
                  placeholder="05:00"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#9B5265] focus:ring-2 focus:ring-[#F6E5E8]"
                />
              </label>

            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Urutan
              </span>

              <input
                type="number"
                min="0"
                value={form.order}
                onChange={event => setForm(prev => ({ ...prev, order: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#9B5265] focus:ring-2 focus:ring-[#F6E5E8]"
              />
            </label>

            <div className="flex gap-2 pt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-600"
                >
                  Batal
                </button>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#7A1025] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#641020] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Chapter'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
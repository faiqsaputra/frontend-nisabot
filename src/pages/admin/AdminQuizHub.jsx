import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Archive, ArrowRight, BookOpen, Check, CheckCircle2,
  ChevronDown, Clock3, Eye, FileQuestion, Layers3,
  LoaderCircle, LockKeyhole, Pencil, Plus, RefreshCw,
  Search, Send, Trash2, X
} from 'lucide-react';
import { quizApi } from '../../lib/quiz.api.js';

const initialQuizForm = {
  materialId: '',
  title: '',
  description: '',
  passingScore: 80,
  xpPerCorrect: 100,
  order: 0,
  maxAttempts: '',
  timeLimitSeconds: '',
  showExplanation: true,
  shuffleQuestions: false
};

const STATUS_CONFIG = {
  DRAFT: {
    label: 'Draft',
    className: 'bg-amber-50 text-amber-700 ring-amber-200'
  },
  PUBLISHED: {
    label: 'Published',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  },
  ARCHIVED: {
    label: 'Archived',
    className: 'bg-slate-100 text-slate-600 ring-slate-200'
  }
};

function unwrapObject(payload) {
  let value = payload;

  for (let index = 0; index < 4; index += 1) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      value.data !== undefined &&
      !value.id &&
      !value.items &&
      !value.quizzes &&
      !value.materials
    ) {
      value = value.data;
    } else {
      break;
    }
  }

  return value;
}

function unwrapList(payload) {
  let value = payload;

  for (let index = 0; index < 4; index += 1) {
    if (Array.isArray(value)) return value;

    for (const key of ['items', 'quizzes', 'materials', 'results']) {
      if (Array.isArray(value?.[key])) return value[key];
    }

    if (Array.isArray(value?.data)) return value.data;

    if (value?.data && typeof value.data === 'object') {
      value = value.data;
      continue;
    }

    break;
  }

  return [];
}

function getQuizId(quiz) {
  return (
    quiz?.id ??
    quiz?.quizId ??
    quiz?.quiz?.id ??
    quiz?.data?.id ??
    quiz?.data?.quiz?.id ??
    null
  );
}

function normalizeStatus(status) {
  return String(status || 'DRAFT').toUpperCase();
}

function getCount(stats, keys, fallback = 0) {
  for (const key of keys) {
    const value = Number(stats?.[key]);

    if (stats?.[key] !== undefined && Number.isFinite(value)) {
      return value;
    }
  }

  return fallback;
}

function formatDate(value) {
  if (!value) return 'Belum tersedia';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Belum tersedia';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function getQuestionCount(quiz) {
  return Number(
    quiz?._count?.questions ??
    quiz?.questionCount ??
    quiz?.questions?.length ??
    0
  );
}

function getErrorMessage(error) {
  if (error?.status === 401) {
    return 'Sesi login tidak valid. Silakan login kembali menggunakan akun Supabase yang memiliki akses admin.';
  }

  if (error?.status === 403) {
    return 'Akses ditolak. Akun ini tidak memiliki izin administrator.';
  }

  return (
    error?.data?.message ??
    error?.message ??
    'Terjadi kesalahan saat menghubungi server.'
  );
}

function StatusBadge({ status }) {
  const normalized = normalizeStatus(status);
  const config = STATUS_CONFIG[normalized] ?? STATUS_CONFIG.DRAFT;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${config.className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}

function StatCard({ title, value, description, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[#EEE4E3] bg-white p-5 shadow-sm shadow-[#4D1720]/5 transition hover:border-[#D8B7BE]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900">
            {Number(value ?? 0).toLocaleString('id-ID')}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">{description}</p>
        </div>

        <div className="rounded-xl bg-[#F8E9EC] p-3 text-[#7A1025]">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function IconButton({
  title,
  onClick,
  children,
  disabled = false,
  className = ''
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-[#EAE0DF] bg-white px-3 text-xs font-medium text-slate-600 transition hover:border-[#D8B7BE] hover:bg-[#FBF2F3] hover:text-[#7A1025] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function QuizFormModal({
  open,
  quiz,
  quizzes,
  materials,
  linkedMaterialId,
  materialError,
  saving,
  onClose,
  onSubmit,
  onRetryMaterials
}) {
  const [form, setForm] = useState(initialQuizForm);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!open) return;

    if (quiz) {
      setForm({
        ...initialQuizForm,
        materialId: quiz.materialId || '',
        title: quiz.title || '',
        description: quiz.description || '',
        passingScore: Number(quiz.passingScore ?? 80),
        xpPerCorrect: Number(quiz.xpPerCorrect ?? 100),
        order: Number(quiz.order ?? 0),
        maxAttempts: quiz.maxAttempts == null ? '' : String(quiz.maxAttempts),
        timeLimitSeconds: quiz.timeLimitSeconds == null
          ? ''
          : String(quiz.timeLimitSeconds),
        showExplanation: quiz.showExplanation ?? true,
        shuffleQuestions: quiz.shuffleQuestions ?? false
      });
    } else {
      setForm({
        ...initialQuizForm,
        materialId: linkedMaterialId || materials[0]?.id || ''
      });
    }

    setFormError('');
  }, [open, quiz, linkedMaterialId]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) onClose();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, saving, onClose]);

  if (!open) return null;

  const usedMaterialIds = new Set(
    quizzes
      .filter((item) => !quiz || String(getQuizId(item)) !== String(getQuizId(quiz)))
      .map((item) => String(item.materialId))
      .filter(Boolean)
  );

  function change(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));

    setFormError('');
  }

  async function submit(event) {
    event.preventDefault();
    setFormError('');

    if (!quiz && !form.materialId) {
      setFormError('Pilih materi terlebih dahulu.');
      return;
    }

    if (form.title.trim().length < 3) {
      setFormError('Judul kuis minimal 3 karakter.');
      return;
    }

    const passingScore = Number(form.passingScore);
    const xpPerCorrect = Number(form.xpPerCorrect);
    const order = Number(form.order);

    if (!Number.isInteger(passingScore) || passingScore < 0 || passingScore > 100) {
      setFormError('Nilai kelulusan harus berupa bilangan bulat 0–100.');
      return;
    }

    if (!Number.isInteger(xpPerCorrect) || xpPerCorrect < 0) {
      setFormError('XP harus berupa bilangan bulat minimal 0.');
      return;
    }

    if (!Number.isInteger(order) || order < 0) {
      setFormError('Urutan harus berupa bilangan bulat minimal 0.');
      return;
    }

    const optionalPositiveInteger = (value) => {
      if (value === '') return null;

      const number = Number(value);

      return Number.isInteger(number) && number > 0 ? number : NaN;
    };

    const maxAttempts = optionalPositiveInteger(form.maxAttempts);
    const timeLimitSeconds = optionalPositiveInteger(form.timeLimitSeconds);

    if (Number.isNaN(maxAttempts)) {
      setFormError('Maksimal percobaan harus berupa bilangan bulat positif.');
      return;
    }

    if (Number.isNaN(timeLimitSeconds)) {
      setFormError('Batas waktu harus berupa bilangan bulat positif.');
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      passingScore,
      xpPerCorrect,
      order,
      maxAttempts,
      timeLimitSeconds,
      showExplanation: Boolean(form.showExplanation),
      shuffleQuestions: Boolean(form.shuffleQuestions)
    };

    // Hubungkan materi hanya ketika membuat kuis.
    // Pada edit, relasi materialId tetap dipertahankan backend.
    if (!quiz) {
      payload.materialId = form.materialId;
    }

    try {
      await onSubmit(payload);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-form-title"
        initial={{ opacity: 0, y: 16, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="my-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-white/60 bg-[#FFFCFB] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#F0E5E4] px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9B5265]">
              Quiz Management
            </p>

            <h2 id="quiz-form-title" className="mt-2 text-xl font-bold text-slate-900">
              {quiz ? 'Edit pengaturan kuis' : 'Buat Quiz Mission'}
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              {quiz
                ? 'Perbarui pengaturan kuis yang sudah ada.'
                : 'Hubungkan kuis dengan materi sebelum menambahkan pertanyaan.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Tutup dialog"
            className="rounded-xl p-2 text-slate-500 transition hover:bg-[#F8E9EC] hover:text-[#7A1025] disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </header>

        <form onSubmit={submit} className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
          {!quiz && (
            <div>
              <label htmlFor="quizMaterialId" className="mb-2 block text-sm font-semibold text-slate-700">
                Materi terkait <span className="text-rose-600">*</span>
              </label>

              <div className="relative">
                <BookOpen
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <select
                  id="quizMaterialId"
                  value={form.materialId}
                  onChange={(event) => change('materialId', event.target.value)}
                  className="w-full appearance-none rounded-xl border border-[#E7DAD9] bg-white py-3 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-[#9B5265] focus:ring-4 focus:ring-[#9B5265]/10"
                  required
                >
                  <option value="">Pilih materi</option>

                  {materials.map((material) => {
                    const used = usedMaterialIds.has(String(material.id));

                    return (
                      <option
                        key={material.id}
                        value={material.id}
                        disabled={used}
                      >
                        {material.title || material.name || material.slug || material.id}
                        {used ? ' — sudah memiliki kuis' : ''}
                      </option>
                    );
                  })}
                </select>

                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>

              {linkedMaterialId && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-[#7A1025]">
                  <CheckCircle2 size={13} />
                  Materi dipilih dari halaman Manajemen Materi.
                </p>
              )}

              {materialError && (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <p className="text-xs leading-5 text-rose-700">
                    {materialError}
                  </p>

                  <button
                    type="button"
                    onClick={onRetryMaterials}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900"
                  >
                    <RefreshCw size={13} />
                    Muat ulang materi
                  </button>
                </div>
              )}

              {!materialError && materials.length === 0 && (
                <p className="mt-2 text-xs leading-5 text-amber-700">
                  Belum ada materi yang dapat dipilih. Pastikan sesi login valid dan materi tersedia.
                </p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="quizTitle" className="mb-2 block text-sm font-semibold text-slate-700">
              Judul kuis <span className="text-rose-600">*</span>
            </label>

            <input
              id="quizTitle"
              value={form.title}
              onChange={(event) => change('title', event.target.value)}
              maxLength={200}
              minLength={3}
              placeholder="Contoh: Evaluasi Materi Haid"
              className="w-full rounded-xl border border-[#E7DAD9] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#9B5265] focus:ring-4 focus:ring-[#9B5265]/10"
              required
            />
          </div>

          <div>
            <label htmlFor="quizDescription" className="mb-2 block text-sm font-semibold text-slate-700">
              Deskripsi
            </label>

            <textarea
              id="quizDescription"
              value={form.description}
              onChange={(event) => change('description', event.target.value)}
              rows={3}
              maxLength={5000}
              placeholder="Jelaskan tujuan dan cakupan kuis."
              className="w-full resize-y rounded-xl border border-[#E7DAD9] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#9B5265] focus:ring-4 focus:ring-[#9B5265]/10"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="passingScore" className="mb-2 block text-sm font-semibold text-slate-700">
                Nilai lulus (%)
              </label>

              <input
                id="passingScore"
                type="number"
                min="0"
                max="100"
                step="1"
                value={form.passingScore}
                onChange={(event) => change('passingScore', event.target.value)}
                className="w-full rounded-xl border border-[#E7DAD9] bg-white px-3 py-3 text-sm outline-none focus:border-[#9B5265] focus:ring-4 focus:ring-[#9B5265]/10"
                required
              />
            </div>

            <div>
              <label htmlFor="xpPerCorrect" className="mb-2 block text-sm font-semibold text-slate-700">
                XP per jawaban
              </label>

              <input
                id="xpPerCorrect"
                type="number"
                min="0"
                step="1"
                value={form.xpPerCorrect}
                onChange={(event) => change('xpPerCorrect', event.target.value)}
                className="w-full rounded-xl border border-[#E7DAD9] bg-white px-3 py-3 text-sm outline-none focus:border-[#9B5265] focus:ring-4 focus:ring-[#9B5265]/10"
                required
              />
            </div>

            <div>
              <label htmlFor="quizOrder" className="mb-2 block text-sm font-semibold text-slate-700">
                Urutan
              </label>

              <input
                id="quizOrder"
                type="number"
                min="0"
                step="1"
                value={form.order}
                onChange={(event) => change('order', event.target.value)}
                className="w-full rounded-xl border border-[#E7DAD9] bg-white px-3 py-3 text-sm outline-none focus:border-[#9B5265] focus:ring-4 focus:ring-[#9B5265]/10"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="maxAttempts" className="mb-2 block text-sm font-semibold text-slate-700">
                Maksimal percobaan
              </label>

              <input
                id="maxAttempts"
                type="number"
                min="1"
                step="1"
                value={form.maxAttempts}
                onChange={(event) => change('maxAttempts', event.target.value)}
                placeholder="Tidak dibatasi"
                className="w-full rounded-xl border border-[#E7DAD9] bg-white px-4 py-3 text-sm outline-none focus:border-[#9B5265] focus:ring-4 focus:ring-[#9B5265]/10"
              />
            </div>

            <div>
              <label htmlFor="timeLimitSeconds" className="mb-2 block text-sm font-semibold text-slate-700">
                Batas waktu (detik)
              </label>

              <input
                id="timeLimitSeconds"
                type="number"
                min="1"
                step="1"
                value={form.timeLimitSeconds}
                onChange={(event) => change('timeLimitSeconds', event.target.value)}
                placeholder="Tanpa batas waktu"
                className="w-full rounded-xl border border-[#E7DAD9] bg-white px-4 py-3 text-sm outline-none focus:border-[#9B5265] focus:ring-4 focus:ring-[#9B5265]/10"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#F0E5E4] bg-white p-4">
              <input
                type="checkbox"
                checked={form.showExplanation}
                onChange={(event) => change('showExplanation', event.target.checked)}
                className="mt-1 accent-[#7A1025]"
              />

              <span>
                <span className="block text-sm font-semibold text-slate-800">
                  Tampilkan pembahasan
                </span>

                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Peserta dapat melihat penjelasan jawaban.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#F0E5E4] bg-white p-4">
              <input
                type="checkbox"
                checked={form.shuffleQuestions}
                onChange={(event) => change('shuffleQuestions', event.target.checked)}
                className="mt-1 accent-[#7A1025]"
              />

              <span>
                <span className="block text-sm font-semibold text-slate-800">
                  Acak pertanyaan
                </span>

                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Urutan pertanyaan diacak ketika kuis dikerjakan.
                </span>
              </span>
            </label>
          </div>

          {formError && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
              {formError}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-[#F0E5E4] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-[#E7DAD9] bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={saving || (!quiz && materials.length === 0)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7A1025] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5E0C1D] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <LoaderCircle size={16} className="animate-spin" />}
              {saving ? 'Menyimpan...' : quiz ? 'Simpan perubahan' : 'Buat kuis'}
            </button>
          </div>
        </form>
      </motion.section>
    </div>
  );
}

export default function AdminQuizHub() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const linkedMaterialId = searchParams.get('materialId') || '';

  const [quizzes, setQuizzes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [stats, setStats] = useState(null);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [materialsError, setMaterialsError] = useState('');

  const [refreshKey, setRefreshKey] = useState(0);
  const [materialsRefreshKey, setMaterialsRefreshKey] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadDashboard = useCallback(async (signal) => {
    setLoading(true);
    setError('');

    try {
      const [listResult, statsResult] = await Promise.allSettled([
        quizApi.list({
          page: 1,
          limit: 100,
          search: query.trim(),
          ...(statusFilter ? { status: statusFilter } : {}),
          sortBy: 'updatedAt',
          sortOrder: 'desc'
        }, { signal }),
        quizApi.stats({ signal })
      ]);

      if (signal?.aborted) return;

      if (listResult.status === 'fulfilled') {
        setQuizzes(unwrapList(listResult.value));
      } else {
        setError(getErrorMessage(listResult.reason));
        setQuizzes([]);
      }

      if (statsResult.status === 'fulfilled') {
        setStats(unwrapObject(statsResult.value));
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [query, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => loadDashboard(controller.signal),
      200
    );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadDashboard, refreshKey]);

  useEffect(() => {
    const controller = new AbortController();

    setMaterialsLoading(true);
    setMaterialsError('');

    quizApi.materials({ signal: controller.signal })
      .then((payload) => {
        if (controller.signal.aborted) return;

        setMaterials(unwrapList(payload));
      })
      .catch((materialError) => {
        if (controller.signal.aborted) return;

        setMaterialsError(getErrorMessage(materialError));
        setMaterials([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setMaterialsLoading(false);
        }
      });

    return () => controller.abort();
  }, [materialsRefreshKey]);

  useEffect(() => {
    if (!notice) return undefined;

    const timer = window.setTimeout(() => setNotice(''), 3500);

    return () => window.clearTimeout(timer);
  }, [notice]);

  const fallbackCounts = useMemo(() => ({
    total: quizzes.length,
    draft: quizzes.filter(
      (quiz) => normalizeStatus(quiz.status) === 'DRAFT'
    ).length,
    published: quizzes.filter(
      (quiz) => normalizeStatus(quiz.status) === 'PUBLISHED'
    ).length,
    archived: quizzes.filter(
      (quiz) => normalizeStatus(quiz.status) === 'ARCHIVED'
    ).length
  }), [quizzes]);

  const totalQuizzes = getCount(
    stats,
    ['total', 'totalQuizzes', 'quizCount', 'all'],
    fallbackCounts.total
  );

  const draftCount = getCount(
    stats,
    ['draft', 'drafts', 'draftCount'],
    fallbackCounts.draft
  );

  const publishedCount = getCount(
    stats,
    ['published', 'publishedCount'],
    fallbackCounts.published
  );

  const archivedCount = getCount(
    stats,
    ['archived', 'archivedCount'],
    fallbackCounts.archived
  );

  const linkedMaterial = materials.find(
    (material) => String(material.id) === String(linkedMaterialId)
  );

  function notify(message) {
    setNotice(message);
    setError('');
  }

  function handleCreateQuiz() {
    if (linkedMaterialId) {
      const existingQuiz = quizzes.find(
        (quiz) => String(quiz.materialId) === String(linkedMaterialId)
      );

      if (existingQuiz) {
        const id = getQuizId(existingQuiz);

        setNotice(
          `Materi ini sudah memiliki kuis "${existingQuiz.title}". Membuka kuis yang sudah ada.`
        );

        if (id) navigate(`/admin/quizzes/${id}/studio`);

        return;
      }
    }

    setEditingQuiz(null);
    setModalOpen(true);
  }

  function openEditModal(quiz) {
    setEditingQuiz(quiz);
    setModalOpen(true);
  }

  async function handleSave(payload) {
    setSaving(true);
    setError('');

    try {
      if (editingQuiz) {
        await quizApi.update(getQuizId(editingQuiz), payload);

        setModalOpen(false);
        setEditingQuiz(null);
        notify('Pengaturan kuis berhasil diperbarui.');
        setRefreshKey((value) => value + 1);

        return;
      }

      // Payload create sudah berisi materialId dari form.
      const created = await quizApi.create(payload);

      setModalOpen(false);
      setEditingQuiz(null);
      notify('Kuis berhasil dibuat dan dihubungkan dengan materi.');

      const createdId = getQuizId(created);

      if (createdId) {
        navigate(`/admin/quizzes/${createdId}/studio`);
      } else {
        setRefreshKey((value) => value + 1);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(quiz) {
    const id = getQuizId(quiz);

    if (!id) {
      setError('ID kuis tidak ditemukan.');
      return;
    }

    if (!window.confirm(
      `Publikasikan kuis "${quiz.title}"? Pastikan semua pertanyaan sudah siap.`
    )) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      await quizApi.validatePublish(id);
      await quizApi.publish(id);

      notify('Kuis berhasil dipublikasikan.');
      setRefreshKey((value) => value + 1);
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setSaving(false);
    }
  }

  async function handleUnpublish(quiz) {
    if (!window.confirm(`Batalkan publikasi kuis "${quiz.title}"?`)) return;

    try {
      setSaving(true);
      setError('');

      await quizApi.unpublish(getQuizId(quiz));

      notify('Publikasi kuis berhasil dibatalkan.');
      setRefreshKey((value) => value + 1);
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(quiz) {
    if (!window.confirm(`Arsipkan kuis "${quiz.title}"?`)) return;

    try {
      setSaving(true);
      setError('');

      await quizApi.archive(getQuizId(quiz));

      notify('Kuis berhasil diarsipkan.');
      setRefreshKey((value) => value + 1);
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(quiz) {
    if (!window.confirm(
      `Hapus kuis "${quiz.title}" secara permanen? Tindakan ini tidak dapat dibatalkan.`
    )) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      await quizApi.remove(getQuizId(quiz));

      notify('Kuis berhasil dihapus.');
      setRefreshKey((value) => value + 1);
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setSaving(false);
    }
  }

  const retryMaterials = () => {
    setMaterialsRefreshKey((value) => value + 1);
  };

  return (
    <main className="min-h-screen bg-[#FBF8F6] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#EAD7DA] bg-[#F8E9EC] px-3 py-1.5 text-xs font-semibold text-[#7A1025]">
              <Layers3 size={14} />
              Admin Workspace
            </div>

            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Quiz Hub
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Kelola Quiz Mission, hubungkan kuis dengan materi, dan atur publikasinya dari satu tempat.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E5D7D5] bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-[#FFF4F4] disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleCreateQuiz}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7A1025] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#7A1025]/15 transition hover:bg-[#5E0C1D]"
            >
              <Plus size={18} />
              Buat kuis
            </button>
          </div>
        </header>

        {linkedMaterialId && (
          <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#EAD7DA] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-[#F8E9EC] p-2.5 text-[#7A1025]">
                <BookOpen size={19} />
              </div>

              <div>
                <p className="text-xs font-bold text-slate-800">
                  Konteks materi terhubung
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {linkedMaterial?.title || `Material ID: ${linkedMaterialId}`}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Form kuis akan menggunakan materi ini sebagai nilai awal.
                </p>
              </div>
            </div>

            {linkedMaterial && (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 size={14} />
                Materi terdeteksi
              </span>
            )}
          </section>
        )}

        {(error || notice) && (
          <div
            role={error ? 'alert' : 'status'}
            className={`mb-6 flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 text-sm ${
              error
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            <div className="flex min-w-0 items-start gap-2">
              {error
                ? <X size={16} className="mt-0.5 shrink-0" />
                : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}

              <p className="break-words">{error || notice}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setError('');
                setNotice('');
              }}
              aria-label="Tutup notifikasi"
              className="shrink-0 rounded-lg p-1 opacity-70 hover:opacity-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6">
            <button
              type="button"
              onClick={() => navigate('/login', {
                state: { from: '/admin/kuis' }
              })}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <LockKeyhole size={14} />
              Login kembali
            </button>
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total kuis"
            value={totalQuizzes}
            description="Seluruh kuis dalam CMS"
            icon={Layers3}
          />

          <StatCard
            title="Published"
            value={publishedCount}
            description="Kuis yang sudah dipublikasikan"
            icon={CheckCircle2}
          />

          <StatCard
            title="Draft"
            value={draftCount}
            description="Kuis yang masih dikerjakan"
            icon={FileQuestion}
          />

          <StatCard
            title="Archived"
            value={archivedCount}
            description="Kuis yang diarsipkan"
            icon={Archive}
          />
        </section>

        <section className="overflow-hidden rounded-3xl border border-[#EEE4E3] bg-white shadow-sm shadow-[#4D1720]/5">
          <div className="flex flex-col gap-4 border-b border-[#F0E7E6] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Daftar kuis
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Cari kuis, periksa materi terkait, dan kelola statusnya.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 sm:w-72">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari judul kuis..."
                  aria-label="Cari kuis"
                  className="w-full rounded-xl border border-[#E7DAD9] bg-[#FFFCFB] py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#9B5265] focus:ring-4 focus:ring-[#9B5265]/10"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter status kuis"
                className="rounded-xl border border-[#E7DAD9] bg-[#FFFCFB] px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#9B5265] focus:ring-4 focus:ring-[#9B5265]/10"
              >
                <option value="">Semua status</option>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          {materialsError && (
            <div className="border-b border-rose-100 bg-rose-50 px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-rose-800">
                    Gagal memuat daftar materi
                  </p>
                  <p className="mt-1 text-xs leading-5 text-rose-700">
                    {materialsError}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={retryMaterials}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                >
                  <RefreshCw size={14} />
                  Coba lagi
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="bg-[#FFFCFB] text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Kuis</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Pertanyaan</th>
                  <th className="px-6 py-4">Nilai lulus</th>
                  <th className="px-6 py-4">Terakhir diubah</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F2EAE9]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="inline-flex items-center gap-3 text-sm text-slate-500">
                        <LoaderCircle size={20} className="animate-spin text-[#7A1025]" />
                        Memuat data kuis...
                      </div>
                    </td>
                  </tr>
                ) : quizzes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="rounded-2xl bg-[#F8E9EC] p-4 text-[#7A1025]">
                          <BookOpen size={26} />
                        </div>

                        <h3 className="mt-4 font-semibold text-slate-800">
                          Kuis belum ditemukan
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          Coba ubah pencarian atau buat kuis baru untuk mulai menyusun evaluasi.
                        </p>

                        {!query && !statusFilter && (
                          <button
                            type="button"
                            onClick={handleCreateQuiz}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#7A1025] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5E0C1D]"
                          >
                            <Plus size={16} />
                            Buat kuis pertama
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  quizzes.map((quiz) => {
                    const id = getQuizId(quiz);
                    const status = normalizeStatus(quiz.status);
                    const questionCount = getQuestionCount(quiz);

                    const relatedMaterial = materials.find(
                      (material) => String(material.id) === String(quiz.materialId)
                    );

                    return (
                      <motion.tr
                        key={id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="align-top transition hover:bg-[#FFFCFB]"
                      >
                        <td className="px-6 py-5">
                          <div className="flex max-w-sm items-start gap-3">
                            <div className="mt-0.5 rounded-xl border border-[#F0DDE1] bg-[#F8E9EC] p-2.5 text-[#7A1025]">
                              <FileQuestion size={19} />
                            </div>

                            <div className="min-w-0">
                              <p className="break-words font-semibold text-slate-900">
                                {quiz.title || 'Tanpa judul'}
                              </p>

                              <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                                {quiz.description || 'Belum ada deskripsi.'}
                              </p>

                              <p className="mt-2 text-xs text-slate-400">
                                Materi: {
                                  quiz.material?.title ||
                                  relatedMaterial?.title ||
                                  quiz.materialTitle ||
                                  'Materi terkait'
                                }
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <StatusBadge status={status} />
                        </td>

                        <td className="px-6 py-5">
                          <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                            <FileQuestion size={16} className="text-slate-400" />
                            {questionCount} soal
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <CheckCircle2 size={16} className="text-[#9B5265]" />
                            {Number(quiz.passingScore ?? 80)}%
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                            <Clock3 size={15} />
                            {formatDate(quiz.updatedAt || quiz.createdAt)}
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex flex-wrap justify-end gap-2">
                            <IconButton
                              title="Buka Quiz Studio"
                              onClick={() => navigate(`/admin/quizzes/${id}/studio`)}
                            >
                              <Pencil size={15} />
                              Studio
                            </IconButton>

                            <IconButton
                              title="Lihat preview kuis"
                              onClick={() => navigate(`/admin/quizzes/${id}/studio?mode=preview`)}
                            >
                              <Eye size={15} />
                            </IconButton>

                            <IconButton
                              title="Edit pengaturan kuis"
                              onClick={() => openEditModal(quiz)}
                            >
                              <Pencil size={15} />
                            </IconButton>

                            {status === 'DRAFT' && (
                              <IconButton
                                title="Publikasikan kuis"
                                onClick={() => handlePublish(quiz)}
                                disabled={saving}
                              >
                                <Send size={15} />
                              </IconButton>
                            )}

                            {status === 'PUBLISHED' && (
                              <IconButton
                                title="Batalkan publikasi"
                                onClick={() => handleUnpublish(quiz)}
                                disabled={saving}
                              >
                                <X size={15} />
                              </IconButton>
                            )}

                            {status !== 'PUBLISHED' && status !== 'ARCHIVED' && (
                              <IconButton
                                title="Arsipkan kuis"
                                onClick={() => handleArchive(quiz)}
                                disabled={saving}
                              >
                                <Archive size={15} />
                              </IconButton>
                            )}

                            <IconButton
                              title="Hapus kuis"
                              onClick={() => handleDelete(quiz)}
                              disabled={saving}
                              className="hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                            >
                              <Trash2 size={15} />
                            </IconButton>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <footer className="flex flex-col gap-2 border-t border-[#F0E7E6] bg-[#FFFCFB] px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>
              Menampilkan {loading ? '...' : quizzes.length} kuis pada hasil pencarian ini.
            </span>

            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600" />
              Data dimuat dari API backend
            </span>
          </footer>
        </section>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <QuizFormModal
            key={editingQuiz ? getQuizId(editingQuiz) : 'new-quiz'}
            open={modalOpen}
            quiz={editingQuiz}
            quizzes={quizzes}
            materials={materials}
            linkedMaterialId={linkedMaterialId}
            materialError={materialsError}
            saving={saving}
            onClose={() => {
              if (!saving) {
                setModalOpen(false);
                setEditingQuiz(null);
              }
            }}
            onSubmit={handleSave}
            onRetryMaterials={retryMaterials}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
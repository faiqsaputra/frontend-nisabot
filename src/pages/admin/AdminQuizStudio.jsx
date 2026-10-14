import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, BookOpen,
  Check, CheckCircle2, Clock3, Eye, FileQuestion, Lightbulb,
  LoaderCircle, Plus, Save, Send, Sparkles, Trash2, X
} from 'lucide-react';
import { apiFetch } from '../../lib/api.js';

const API_ROOT = '/admin/quizzes';

const QUESTION_TYPES = [
  { value: 'CHOICE', label: 'Pilihan ganda', description: 'Pilih satu jawaban paling tepat.' },
  { value: 'TRUE_FALSE', label: 'Benar atau salah', description: 'Evaluasi pemahaman terhadap suatu pernyataan.' },
  { value: 'ORDERING', label: 'Mengurutkan', description: 'Susun langkah atau konsep sesuai urutan.' },
  { value: 'MATCHING', label: 'Mencocokkan', description: 'Hubungkan dua kelompok informasi.' },
  { value: 'CASE', label: 'Studi kasus', description: 'Terapkan konsep pada suatu situasi.' }
];

const TOPICS = [
  { value: 'konsep_dasar', label: 'Konsep dasar fikih haid' },
  { value: 'haid', label: 'Pengertian haid' },
  { value: 'nifas', label: 'Pengertian nifas' },
  { value: 'istihadhah', label: 'Pengertian istihadhah' },
  { value: 'thaharah', label: 'Bersuci dan kesucian' },
  { value: 'ibadah', label: 'Ketentuan ibadah' },
  { value: 'analisis_kasus', label: 'Analisis kasus' }
];

const DIFFICULTIES = [
  { value: 'EASY', label: 'Dasar', color: 'bg-emerald-50 text-emerald-700' },
  { value: 'MEDIUM', label: 'Menengah', color: 'bg-amber-50 text-amber-700' },
  { value: 'HARD', label: 'Lanjut', color: 'bg-rose-50 text-rose-700' }
];

const DEFAULT_ADAPTIVE = {
  topic: 'konsep_dasar',
  difficulty: 'EASY',
  objective: '',
  hint: '',
  remediation: '',
  nextIfCorrect: 'increase_difficulty',
  nextIfIncorrect: 'review_material'
};

function createOptions() {
  return [
    { label: '', value: 'A', isCorrect: true, order: 0 },
    { label: '', value: 'B', isCorrect: false, order: 1 },
    { label: '', value: 'C', isCorrect: false, order: 2 },
    { label: '', value: 'D', isCorrect: false, order: 3 }
  ];
}

function createForm() {
  return {
    type: 'CHOICE',
    title: '',
    question: '',
    stimulus: '',
    explanation: '',
    points: '10',
    ...DEFAULT_ADAPTIVE,
    options: createOptions(),
    itemsText: '',
    pairs: [{ left: '', right: '' }, { left: '', right: '' }]
  };
}

function unwrap(response) {
  return response?.data !== undefined ? response.data : response;
}

function getQuizId(quiz) {
  return quiz?.id ?? quiz?.quizId ?? null;
}

function getDifficulty(value) {
  return DIFFICULTIES.find(item => item.value === value) || DIFFICULTIES[0];
}

function getErrorMessage(error, fallback) {
  if (error?.data?.errors?.fieldErrors) {
    const messages = Object.values(error.data.errors.fieldErrors).flat();
    if (messages.length) return messages.join(' ');
  }

  return error?.message || fallback;
}

function parseQuestion(question) {
  const form = createForm();
  const content = question?.content && typeof question.content === 'object'
    ? question.content
    : {};
  const adaptive = content.adaptive && typeof content.adaptive === 'object'
    ? content.adaptive
    : {};
  const options = Array.isArray(question?.options) ? question.options : [];

  return {
    ...form,
    type: question?.type || 'CHOICE',
    title: question?.title || '',
    question: question?.question || '',
    stimulus: content.stimulus || '',
    explanation: question?.explanation || '',
    points: String(question?.points ?? 10),
    topic: adaptive.topic || 'konsep_dasar',
    difficulty: adaptive.difficulty || 'EASY',
    objective: adaptive.objective || '',
    hint: adaptive.hint || '',
    remediation: adaptive.remediation || '',
    nextIfCorrect: adaptive.nextIfCorrect || 'increase_difficulty',
    nextIfIncorrect: adaptive.nextIfIncorrect || 'review_material',
    options: options.length
      ? options.map((option, index) => ({
          label: option.label || '',
          value: option.value || String.fromCharCode(65 + index),
          isCorrect: Boolean(option.isCorrect),
          order: option.order ?? index
        }))
      : form.options,
    itemsText: Array.isArray(content.items) ? content.items.join('\n') : '',
    pairs: Array.isArray(content.pairs) && content.pairs.length
      ? content.pairs.map(pair => ({
          left: pair.left || '',
          right: pair.right || ''
        }))
      : form.pairs
  };
}

function Field({ label, hint, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-xs font-semibold text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11px] leading-5 text-slate-400">{hint}</span>}
    </label>
  );
}

const inputClass = 'w-full rounded-xl border border-[#EAE0DF] bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#9B5265] focus:ring-4 focus:ring-[#9B5265]/10 disabled:cursor-not-allowed disabled:bg-slate-50';
const selectClass = `${inputClass} cursor-pointer`;
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';

function StatusBadge({ status }) {
  const normalized = String(status || 'DRAFT').toUpperCase();
  const config = {
    DRAFT: 'bg-amber-50 text-amber-700',
    REVIEW: 'bg-sky-50 text-sky-700',
    PUBLISHED: 'bg-emerald-50 text-emerald-700',
    ARCHIVED: 'bg-slate-100 text-slate-500'
  };

  return (
    <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-bold ${config[normalized] || config.DRAFT}`}>
      {normalized === 'PUBLISHED' ? 'Terpublikasi' : normalized === 'DRAFT' ? 'Draft' : normalized}
    </span>
  );
}

function DifficultyBadge({ difficulty }) {
  const item = getDifficulty(difficulty);

  return (
    <span className={`inline-flex rounded-lg px-2 py-1 text-[10px] font-bold ${item.color}`}>
      {item.label}
    </span>
  );
}

export default function AdminQuizStudio() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const previewMode = searchParams.get('mode') === 'preview';

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [form, setForm] = useState(createForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const root = `${API_ROOT}/${encodeURIComponent(quizId || '')}`;
  const isPublished = String(quiz?.status || '').toUpperCase() === 'PUBLISHED';
  const editingQuestion = Boolean(selectedQuestionId);

  const loadQuiz = useCallback(async (signal) => {
    if (!quizId) {
      setError('ID kuis tidak ditemukan pada alamat halaman.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = unwrap(await apiFetch(root, { signal }));
      const loadedQuiz = result?.quiz || result?.item || result;

      let loadedQuestions = loadedQuiz?.questions;

      if (!Array.isArray(loadedQuestions)) {
        const questionResult = unwrap(await apiFetch(`${root}/questions`, { signal }));
        loadedQuestions = Array.isArray(questionResult)
          ? questionResult
          : questionResult?.items || questionResult?.questions || [];
      }

      if (signal?.aborted) return;

      setQuiz(loadedQuiz);
      setQuestions([...loadedQuestions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    } catch (loadError) {
      if (!signal?.aborted) {
        setError(getErrorMessage(loadError, 'Gagal memuat kuis. Periksa koneksi API dan izin administrator.'));
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [quizId, root]);

  useEffect(() => {
    const controller = new AbortController();
    loadQuiz(controller.signal);

    return () => controller.abort();
  }, [loadQuiz]);

  const selectedQuestion = useMemo(
    () => questions.find(question => question.id === selectedQuestionId) || null,
    [questions, selectedQuestionId]
  );

  const difficultyCounts = useMemo(() => {
    return questions.reduce((counts, question) => {
      const content = question.content && typeof question.content === 'object' ? question.content : {};
      const level = content.adaptive?.difficulty || 'EASY';
      counts[level] = (counts[level] || 0) + 1;
      return counts;
    }, { EASY: 0, MEDIUM: 0, HARD: 0 });
  }, [questions]);

  const topicCount = useMemo(() => {
    const topics = new Set(
      questions.map(question => question.content?.adaptive?.topic).filter(Boolean)
    );

    return topics.size;
  }, [questions]);

  const publishChecklist = useMemo(() => {
    const issues = [];

    if (questions.length < 5) {
      issues.push('Disarankan minimal 5 soal untuk mengukur pemahaman secara lebih baik.');
    }

    if (!difficultyCounts.EASY) issues.push('Tambahkan setidaknya satu soal tingkat Dasar.');
    if (!difficultyCounts.MEDIUM) issues.push('Tambahkan soal tingkat Menengah.');
    if (!difficultyCounts.HARD) issues.push('Tambahkan soal tingkat Lanjut.');

    questions.forEach((question, index) => {
      const type = question.type;
      const options = question.options || [];
      const correct = options.filter(option => option.isCorrect);

      if (!question.question?.trim()) {
        issues.push(`Soal ${index + 1}: teks pertanyaan belum diisi.`);
      }

      if (!question.answer || typeof question.answer !== 'object') {
        issues.push(`Soal ${index + 1}: format jawaban belum valid.`);
      }

      if (['CHOICE', 'TRUE_FALSE', 'CASE'].includes(type)) {
        if (options.length < 2) issues.push(`Soal ${index + 1}: tambahkan minimal dua opsi.`);
        if (correct.length !== 1) issues.push(`Soal ${index + 1}: tandai tepat satu jawaban benar.`);
      }

      if (!question.explanation?.trim()) {
        issues.push(`Soal ${index + 1}: pembahasan jawaban belum tersedia.`);
      }

      if (!question.content?.adaptive?.topic || !question.content?.adaptive?.objective) {
        issues.push(`Soal ${index + 1}: lengkapi topik dan tujuan pembelajaran adaptif.`);
      }
    });

    return issues;
  }, [questions, difficultyCounts]);

  function notify(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  }

  function updateForm(field, value) {
    setForm(current => ({ ...current, [field]: value }));
  }

  function startNewQuestion() {
    if (isPublished) {
      setError('Batalkan publikasi kuis terlebih dahulu sebelum mengubah pertanyaan.');
      return;
    }

    setSelectedQuestionId(null);
    setForm(createForm());
    setError('');
    setNotice('');
    setSearchParams({});
  }

  function editQuestion(question) {
    if (isPublished) {
      setError('Kuis sedang terpublikasi. Batalkan publikasi sebelum mengedit soal.');
      return;
    }

    setSelectedQuestionId(question.id);
    setForm(parseQuestion(question));
    setError('');
    setNotice('');
    setSearchParams({});
  }

  function changeQuestionType(type) {
    setForm(current => {
      let options = current.options;

      if (type === 'TRUE_FALSE') {
        options = [
          { label: 'Benar', value: 'true', isCorrect: true, order: 0 },
          { label: 'Salah', value: 'false', isCorrect: false, order: 1 }
        ];
      } else if (current.type === 'TRUE_FALSE') {
        options = createOptions();
      }

      return { ...current, type, options };
    });
  }

  function updateOption(index, field, value) {
    setForm(current => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, [field]: value } : option
      )
    }));
  }

  function markCorrect(index) {
    setForm(current => ({
      ...current,
      options: current.options.map((option, optionIndex) => ({
        ...option,
        isCorrect: optionIndex === index
      }))
    }));
  }

  function addOption() {
    setForm(current => {
      const nextIndex = current.options.length;
      const value = `OPSI_${nextIndex + 1}`;

      return {
        ...current,
        options: [
          ...current.options,
          { label: '', value, isCorrect: false, order: nextIndex }
        ]
      };
    });
  }

  function removeOption(index) {
    setForm(current => {
      const nextOptions = current.options
        .filter((_, optionIndex) => optionIndex !== index)
        .map((option, order) => ({ ...option, order }));

      if (nextOptions.length && !nextOptions.some(option => option.isCorrect)) {
        nextOptions[0].isCorrect = true;
      }

      return { ...current, options: nextOptions };
    });
  }

  function updatePair(index, field, value) {
    setForm(current => ({
      ...current,
      pairs: current.pairs.map((pair, pairIndex) =>
        pairIndex === index ? { ...pair, [field]: value } : pair
      )
    }));
  }

  function addPair() {
    setForm(current => ({
      ...current,
      pairs: [...current.pairs, { left: '', right: '' }]
    }));
  }

  function removePair(index) {
    setForm(current => ({
      ...current,
      pairs: current.pairs.filter((_, pairIndex) => pairIndex !== index)
    }));
  }

  function buildPayload() {
    const points = Number(form.points);

    if (form.question.trim().length < 5) {
      throw new Error('Pertanyaan minimal 5 karakter.');
    }

    if (!Number.isInteger(points) || points < 0) {
      throw new Error('Poin soal harus berupa bilangan bulat nonnegatif.');
    }

    const adaptive = {
      topic: form.topic,
      difficulty: form.difficulty,
      objective: form.objective.trim(),
      hint: form.hint.trim(),
      remediation: form.remediation.trim(),
      nextIfCorrect: form.nextIfCorrect,
      nextIfIncorrect: form.nextIfIncorrect
    };

    const content = {
      stimulus: form.stimulus.trim(),
      adaptive
    };

    let options = [];
    let answer = {};

    if (['CHOICE', 'TRUE_FALSE', 'CASE'].includes(form.type)) {
      options = form.options.map((option, order) => ({
        label: String(option.label || '').trim(),
        value: String(option.value || '').trim(),
        isCorrect: Boolean(option.isCorrect),
        order
      }));

      if (options.length < 2) {
        throw new Error('Tambahkan minimal dua pilihan jawaban.');
      }

      if (options.some(option => !option.label || !option.value)) {
        throw new Error('Semua opsi harus memiliki label dan value.');
      }

      if (new Set(options.map(option => option.value)).size !== options.length) {
        throw new Error('Value opsi harus unik. Ubah value yang duplikat.');
      }

      const correctOptions = options.filter(option => option.isCorrect);

      if (correctOptions.length !== 1) {
        throw new Error('Tandai tepat satu pilihan sebagai jawaban benar.');
      }

      answer = { value: correctOptions[0].value };
    }

    if (form.type === 'TRUE_FALSE') {
      content.stimulus = content.stimulus || '';
    }

    if (form.type === 'CASE' && !content.stimulus) {
      throw new Error('Isi stimulus atau narasi kasus sebelum menyimpan soal studi kasus.');
    }

    if (form.type === 'ORDERING') {
      const items = form.itemsText.split('\n').map(item => item.trim()).filter(Boolean);

      if (items.length < 2) {
        throw new Error('Masukkan minimal dua item urutan, satu item per baris.');
      }

      content.items = items;
      answer = { order: items.map((_, index) => index) };
    }

    if (form.type === 'MATCHING') {
      const pairs = form.pairs.map(pair => ({
        left: pair.left.trim(),
        right: pair.right.trim()
      }));

      if (pairs.length < 2 || pairs.some(pair => !pair.left || !pair.right)) {
        throw new Error('Isi minimal dua pasangan. Setiap pasangan harus memiliki kedua sisi.');
      }

      content.pairs = pairs;
      answer = {
        pairs: pairs.map((_, index) => ({ left: index, right: index }))
      };
    }

    return {
      type: form.type,
      title: form.title.trim() || null,
      question: form.question.trim(),
      content,
      answer,
      explanation: form.explanation.trim(),
      points,
      order: editingQuestion
        ? (selectedQuestion?.order ?? questions.findIndex(item => item.id === selectedQuestionId))
        : questions.length,
      options
    };
  }

  async function saveQuestion(event) {
    event.preventDefault();

    if (isPublished) {
      setError('Batalkan publikasi kuis sebelum mengedit soal.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const payload = buildPayload();

      if (editingQuestion) {
        await apiFetch(`${root}/questions/${encodeURIComponent(selectedQuestionId)}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });

        notify('Pertanyaan berhasil diperbarui.');
      } else {
        await apiFetch(`${root}/questions`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        notify('Pertanyaan berhasil ditambahkan.');
      }

      setSelectedQuestionId(null);
      setForm(createForm());
      await loadQuiz();
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Gagal menyimpan pertanyaan.'));
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuestion(question) {
    if (isPublished) {
      setError('Batalkan publikasi kuis sebelum menghapus soal.');
      return;
    }

    if (!window.confirm(`Hapus pertanyaan "${question.title || question.question}"?`)) return;

    setSaving(true);
    setError('');

    try {
      await apiFetch(`${root}/questions/${encodeURIComponent(question.id)}`, {
        method: 'DELETE'
      });

      if (selectedQuestionId === question.id) {
        setSelectedQuestionId(null);
        setForm(createForm());
      }

      notify('Pertanyaan berhasil dihapus.');
      await loadQuiz();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Gagal menghapus pertanyaan.'));
    } finally {
      setSaving(false);
    }
  }

  async function moveQuestion(index, offset) {
    if (isPublished) return;

    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const reordered = [...questions];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    setSaving(true);
    setError('');

    try {
      await apiFetch(`${root}/questions/reorder`, {
        method: 'POST',
        body: JSON.stringify({ questionIds: reordered.map(question => question.id) })
      });

      setQuestions(reordered.map((question, order) => ({ ...question, order })));
      notify('Urutan pertanyaan diperbarui.');
      await loadQuiz();
    } catch (orderError) {
      setError(getErrorMessage(orderError, 'Gagal mengubah urutan pertanyaan.'));
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish() {
    setPublishing(true);
    setError('');

    try {
      if (isPublished) {
        if (!window.confirm('Batalkan publikasi kuis ini? Pengguna tidak akan dapat mengaksesnya saat kuis berstatus draft.')) {
          return;
        }

        await apiFetch(`${root}/unpublish`, {
          method: 'POST',
          body: JSON.stringify({})
        });

        notify('Publikasi kuis dibatalkan.');
        await loadQuiz();
        return;
      }

      if (publishChecklist.length) {
        setError(`Periksa kelengkapan kuis terlebih dahulu: ${publishChecklist.slice(0, 3).join(' ')}`);
        return;
      }

      const validation = unwrap(await apiFetch(`${root}/validate-publish`, {
        method: 'POST',
        body: JSON.stringify({})
      }));

      if (validation?.valid === false || validation?.isValid === false) {
        const problems = validation.errors || validation.issues || [];
        setError(Array.isArray(problems) ? problems.map(item => typeof item === 'string' ? item : item.message).join(' ') : 'Kuis belum lolos validasi publikasi.');
        return;
      }

      if (!window.confirm('Publikasikan kuis ini agar tersedia untuk pengguna?')) return;

      await apiFetch(`${root}/publish`, {
        method: 'POST',
        body: JSON.stringify({})
      });

      notify('Kuis berhasil dipublikasikan.');
      await loadQuiz();
    } catch (publishError) {
      setError(getErrorMessage(publishError, 'Gagal memperbarui status publikasi kuis.'));
    } finally {
      setPublishing(false);
    }
  }

  function setViewMode(mode) {
    const params = new URLSearchParams(searchParams);

    if (mode === 'preview') params.set('mode', 'preview');
    else params.delete('mode');

    setSearchParams(params);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBF8F6]">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <LoaderCircle className="animate-spin text-[#7A1025]" size={20} />
          Memuat Quiz Studio...
        </div>
      </div>
    );
  }

  if (error && !quiz) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBF8F6] p-5">
        <div className="w-full max-w-md rounded-3xl border border-[#EAE0DF] bg-white p-7 text-center shadow-sm">
          <AlertTriangle className="mx-auto text-[#7A1025]" size={34} />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Kuis tidak dapat dimuat</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{error}</p>
          <button onClick={() => navigate('/admin/quizzes')} className={`${buttonClass} mt-5 bg-[#7A1025] text-white`}>
            <ArrowLeft size={15} /> Kembali ke daftar kuis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF8F6] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-[#EAE0DF] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/quizzes')}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#EAE0DF] text-slate-500 transition hover:bg-[#FBF2F3] hover:text-[#7A1025]"
              title="Kembali ke daftar kuis"
            >
              <ArrowLeft size={17} />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9B5265]">Nusa Bot · Learning Design</p>
              <h1 className="truncate text-sm font-bold text-slate-900 sm:text-base">{quiz?.title || 'Quiz Studio'}</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={quiz?.status} />
            <button type="button" onClick={() => setViewMode(previewMode ? 'edit' : 'preview')} className={`${buttonClass} border border-[#EAE0DF] bg-white text-slate-600 hover:bg-slate-50`}>
              <Eye size={15} /> {previewMode ? 'Kembali ke editor' : 'Pratinjau'}
            </button>
            <button type="button" onClick={togglePublish} disabled={publishing || saving} className={`${buttonClass} bg-[#7A1025] text-white shadow-sm shadow-[#7A1025]/15 hover:bg-[#650D1F]`}>
              {publishing ? <LoaderCircle className="animate-spin" size={15} /> : isPublished ? <X size={15} /> : <Send size={15} />}
              {isPublished ? 'Batalkan publikasi' : 'Publikasikan'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#7A1025] via-[#8F2943] to-[#9B5265] p-6 text-white shadow-[0_14px_38px_rgba(122,16,37,0.13)] sm:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/85">
                <Sparkles size={13} /> Adaptive Learning Workspace
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Rancang pengalaman belajar yang adaptif.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">
                Susun soal berdasarkan kompetensi dan kesulitan. Tambahkan petunjuk serta tindak lanjut agar hasil kuis dapat membantu siswa belajar secara bertahap.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: 'Pertanyaan', value: questions.length, icon: FileQuestion },
                { label: 'Topik', value: topicCount, icon: BookOpen },
                { label: 'Poin', value: questions.reduce((sum, question) => sum + Number(question.points || 0), 0), icon: Activity }
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="min-w-[84px] rounded-2xl border border-white/15 bg-white/10 p-3 sm:min-w-[105px] sm:p-4">
                  <Icon size={17} className="text-white/70" />
                  <p className="mt-3 text-xl font-bold">{value}</p>
                  <p className="mt-0.5 text-[10px] text-white/65">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {notice && (
          <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 size={17} /> {notice}
          </div>
        )}

        {error && (
          <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
            <AlertTriangle className="mt-0.5 shrink-0" size={17} />
            <span className="min-w-0 flex-1">{error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Tutup pesan" className="shrink-0 text-rose-500 hover:text-rose-800">
              <X size={15} />
            </button>
          </div>
        )}

        {previewMode ? (
          <section className="rounded-3xl border border-[#EAE0DF] bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9B5265]">Learner Preview</p>
                <h2 className="mt-2 text-xl font-bold">{quiz?.title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">{quiz?.description || 'Pratinjau pertanyaan yang akan dipelajari siswa.'}</p>
              </div>
              <span className="rounded-xl bg-[#F6E5E8] px-3 py-2 text-xs font-semibold text-[#7A1025]">{questions.length} pertanyaan</span>
            </div>

            {questions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#EAE0DF] p-10 text-center text-sm text-slate-500">Tambahkan soal untuk melihat pratinjau.</div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {questions.map((question, index) => (
                  <article key={question.id} className="rounded-2xl border border-[#EAE0DF] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B5265]">Pertanyaan {index + 1}</span>
                      <DifficultyBadge difficulty={question.content?.adaptive?.difficulty} />
                    </div>
                    {question.content?.stimulus && <p className="mt-3 rounded-xl bg-[#FBF8F6] p-3 text-xs leading-5 text-slate-600">{question.content.stimulus}</p>}
                    <h3 className="mt-3 text-sm font-semibold leading-6 text-slate-900">{question.question}</h3>
                    {['CHOICE', 'TRUE_FALSE', 'CASE'].includes(question.type) && (
                      <div className="mt-4 space-y-2">
                        {(question.options || []).map(option => (
                          <div key={option.value} className={`rounded-xl border px-3 py-2.5 text-xs leading-5 ${option.isCorrect ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900' : 'border-slate-100 text-slate-600'}`}>
                            <div className="flex items-start justify-between gap-3">
                              <span>{option.label}</span>
                              {option.isCorrect && <CheckCircle2 className="shrink-0 text-emerald-700" size={14} />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {question.type === 'ORDERING' && (
                      <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs text-slate-600">
                        {(question.content?.items || []).map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}
                      </ol>
                    )}
                    {question.type === 'MATCHING' && (
                      <div className="mt-4 space-y-2">
                        {(question.content?.pairs || []).map((pair, pairIndex) => (
                          <div key={`${pair.left}-${pairIndex}`} className="flex items-center gap-3 rounded-xl bg-[#FBF8F6] p-3 text-xs">
                            <span className="flex-1">{pair.left}</span><span className="text-[#9B5265]">↔</span><span className="flex-1">{pair.right}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {question.explanation && (
                      <div className="mt-4 rounded-xl bg-[#F6E5E8]/60 p-3 text-xs leading-5 text-slate-600">
                        <span className="font-bold text-[#7A1025]">Pembahasan: </span>{question.explanation}
                      </div>
                    )}
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400">
                      <span>{TOPICS.find(topic => topic.value === question.content?.adaptive?.topic)?.label || 'Topik belum diatur'}</span>
                      <span>{question.points} poin</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : (
          <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[285px_minmax(0,1fr)_270px]">
            <aside className="min-w-0 rounded-3xl border border-[#EAE0DF] bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Daftar pertanyaan</h3>
                  <p className="mt-1 text-[11px] text-slate-400">Urutkan sesuai alur belajar.</p>
                </div>
                <span className="rounded-lg bg-[#F6E5E8] px-2 py-1 text-[10px] font-bold text-[#7A1025]">{questions.length}</span>
              </div>

              <button
                type="button"
                onClick={startNewQuestion}
                disabled={isPublished || saving}
                className={`${buttonClass} mt-5 w-full bg-[#7A1025] text-white hover:bg-[#650D1F]`}
              >
                <Plus size={15} /> Tambah pertanyaan
              </button>

              <div className="mt-4 space-y-2">
                {questions.map((question, index) => (
                  <div key={question.id} className={`rounded-2xl border p-3 transition ${selectedQuestionId === question.id ? 'border-[#9B5265] bg-[#FBF2F3] ring-2 ring-[#9B5265]/10' : 'border-[#F0E8E6] bg-white hover:border-[#E0C2C9]'}`}>
                    <button type="button" onClick={() => editQuestion(question)} disabled={isPublished} className="w-full text-left disabled:cursor-not-allowed">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B5265]">Soal {index + 1}</span>
                        <DifficultyBadge difficulty={question.content?.adaptive?.difficulty} />
                      </div>
                      <p className="mt-2 line-clamp-3 text-xs font-semibold leading-5 text-slate-800">{question.question || 'Pertanyaan belum diisi'}</p>
                      <p className="mt-2 text-[10px] text-slate-400">{TOPICS.find(topic => topic.value === question.content?.adaptive?.topic)?.label || 'Topik belum diatur'}</p>
                    </button>
                    <div className="mt-3 flex items-center justify-between border-t border-[#F0E8E6] pt-2">
                      <span className="text-[10px] text-slate-400">{question.points || 0} poin</span>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => moveQuestion(index, -1)} disabled={index === 0 || saving || isPublished} title="Naikkan urutan" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-[#7A1025] disabled:opacity-30"><ArrowUp size={13} /></button>
                        <button type="button" onClick={() => moveQuestion(index, 1)} disabled={index === questions.length - 1 || saving || isPublished} title="Turunkan urutan" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-[#7A1025] disabled:opacity-30"><ArrowDown size={13} /></button>
                        <button type="button" onClick={() => deleteQuestion(question)} disabled={saving || isPublished} title="Hapus pertanyaan" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                ))}

                {!questions.length && (
                  <div className="rounded-2xl border border-dashed border-[#EAE0DF] px-4 py-8 text-center">
                    <FileQuestion className="mx-auto text-slate-300" size={25} />
                    <p className="mt-3 text-xs font-semibold text-slate-600">Belum ada pertanyaan</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-400">Klik tombol tambah untuk memulai.</p>
                  </div>
                )}
              </div>

              {isPublished && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">Kuis sudah terpublikasi. Batalkan publikasi terlebih dahulu untuk mengubah pertanyaan.</p>}
            </aside>

            <section className="min-w-0 rounded-3xl border border-[#EAE0DF] bg-white shadow-sm">
              <div className="border-b border-[#F0E8E6] px-5 py-5 sm:px-7">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9B5265]">Question Editor</p>
                <h3 className="mt-2 text-lg font-bold">{editingQuestion ? 'Edit pertanyaan' : 'Buat pertanyaan baru'}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-400">Isi soal dan tetapkan kompetensi yang ingin dicapai siswa.</p>
              </div>

              <form onSubmit={saveQuestion} className="space-y-6 p-5 sm:p-7">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Tipe pertanyaan">
                    <select className={selectClass} value={form.type} disabled={isPublished} onChange={event => changeQuestionType(event.target.value)}>
                      {QUESTION_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                    </select>
                  </Field>

                  <Field label="Poin pertanyaan">
                    <input className={inputClass} type="number" min="0" step="1" value={form.points} disabled={isPublished} onChange={event => updateForm('points', event.target.value)} />
                  </Field>
                </div>

                <Field label="Judul soal (opsional)" hint="Judul internal untuk membantu admin mengenali pertanyaan.">
                  <input className={inputClass} value={form.title} disabled={isPublished} onChange={event => updateForm('title', event.target.value)} placeholder="Contoh: Membedakan haid dan nifas" />
                </Field>

                {['CASE', 'ORDERING', 'MATCHING'].includes(form.type) && (
                  <Field label={form.type === 'CASE' ? 'Stimulus atau narasi kasus' : 'Konteks pembelajaran'} hint="Berikan konteks secukupnya agar siswa memahami situasi yang sedang dinilai.">
                    <textarea className={`${inputClass} min-h-[105px] resize-y`} value={form.stimulus} disabled={isPublished} onChange={event => updateForm('stimulus', event.target.value)} placeholder="Tuliskan konteks atau situasi pembelajaran..." />
                  </Field>
                )}

                <Field label="Teks pertanyaan">
                  <textarea className={`${inputClass} min-h-[125px] resize-y`} value={form.question} disabled={isPublished} required onChange={event => updateForm('question', event.target.value)} placeholder="Tuliskan pertanyaan dengan bahasa yang jelas dan tidak ambigu..." />
                </Field>

                {['CHOICE', 'TRUE_FALSE', 'CASE'].includes(form.type) && (
                  <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Pilihan jawaban</h4>
                        <p className="mt-1 text-[11px] text-slate-400">Klik lingkaran di samping opsi untuk menandai jawaban benar.</p>
                      </div>
                      {form.type !== 'TRUE_FALSE' && (
                        <button type="button" onClick={addOption} disabled={isPublished || form.options.length >= 8} className="inline-flex items-center gap-1.5 rounded-lg border border-[#EAE0DF] px-3 py-2 text-[11px] font-semibold text-[#7A1025] hover:bg-[#FBF2F3] disabled:opacity-40">
                          <Plus size={13} /> Tambah opsi
                        </button>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {form.options.map((option, index) => (
                        <div key={`${option.value}-${index}`} className={`flex min-w-0 items-start gap-3 rounded-2xl border p-3 ${option.isCorrect ? 'border-emerald-200 bg-emerald-50/50' : 'border-[#EAE0DF] bg-white'}`}>
                          <button
                            type="button"
                            onClick={() => markCorrect(index)}
                            disabled={isPublished}
                            title="Tandai sebagai jawaban benar"
                            className={`mt-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${option.isCorrect ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'} disabled:opacity-60`}
                          >
                            {option.isCorrect && <Check size={12} />}
                          </button>

                          <div className="min-w-0 flex-1">
                            <p className="mb-1.5 text-[10px] font-semibold text-slate-400">Opsi {index + 1}</p>
                            <input
                              className={inputClass}
                              value={option.label}
                              disabled={isPublished}
                              required
                              onChange={event => updateOption(index, 'label', event.target.value)}
                              placeholder={`Teks pilihan jawaban ${index + 1}`}
                            />
                            <p className="mt-1.5 text-[10px] text-slate-400">Kode jawaban: {option.value}</p>
                          </div>

                          {form.type !== 'TRUE_FALSE' && (
                            <button type="button" onClick={() => removeOption(index)} disabled={isPublished || form.options.length <= 2} title="Hapus opsi" className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {form.type === 'ORDERING' && (
                  <Field label="Daftar item" hint="Masukkan satu item per baris dalam urutan yang benar.">
                    <textarea className={`${inputClass} min-h-[150px] resize-y font-mono text-xs`} value={form.itemsText} disabled={isPublished} onChange={event => updateForm('itemsText', event.target.value)} placeholder={'Kenali konsep dasar\nPelajari ketentuan\nAnalisis kasus'} />
                  </Field>
                )}

                {form.type === 'MATCHING' && (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800">Pasangan yang benar</h4>
                      <button type="button" onClick={addPair} disabled={isPublished || form.pairs.length >= 10} className="inline-flex items-center gap-1 rounded-lg border border-[#EAE0DF] px-3 py-2 text-[11px] font-semibold text-[#7A1025] hover:bg-[#FBF2F3] disabled:opacity-40">
                        <Plus size={13} /> Tambah pasangan
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      {form.pairs.map((pair, index) => (
                        <div key={index} className="grid min-w-0 grid-cols-[1fr_1fr_auto] items-center gap-2">
                          <input className={inputClass} value={pair.left} disabled={isPublished} onChange={event => updatePair(index, 'left', event.target.value)} placeholder="Konsep" />
                          <input className={inputClass} value={pair.right} disabled={isPublished} onChange={event => updatePair(index, 'right', event.target.value)} placeholder="Pasangan" />
                          <button type="button" onClick={() => removePair(index)} disabled={isPublished || form.pairs.length <= 2} title="Hapus pasangan" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30"><Trash2 size={13} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-[#EAE0DF] bg-[#FBF8F6] p-4 sm:p-5">
                  <div className="flex items-center gap-2">
                    <Lightbulb size={17} className="text-[#9B5265]" />
                    <h4 className="text-sm font-bold">Pembahasan dan dukungan belajar</h4>
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">Pembahasan menjelaskan alasan jawaban benar, bukan hanya mengulang kunci jawaban.</p>
                  <textarea className={`${inputClass} mt-4 min-h-[100px] resize-y bg-white`} value={form.explanation} disabled={isPublished} onChange={event => updateForm('explanation', event.target.value)} placeholder="Jelaskan konsep fikih yang diuji dan mengapa jawaban tersebut tepat..." />
                </div>

                <div className="rounded-2xl border border-[#E6CBD1] bg-[#FEFBFC] p-4 sm:p-5">
                  <div className="flex items-center gap-2">
                    <Activity size={17} className="text-[#7A1025]" />
                    <div>
                      <h4 className="text-sm font-bold">Aturan pembelajaran adaptif</h4>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500">Tandai kompetensi dan tindak lanjut yang sesuai dengan hasil siswa.</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Topik kompetensi">
                      <select className={selectClass} value={form.topic} disabled={isPublished} onChange={event => updateForm('topic', event.target.value)}>
                        {TOPICS.map(topic => <option key={topic.value} value={topic.value}>{topic.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Tingkat kesulitan">
                      <select className={selectClass} value={form.difficulty} disabled={isPublished} onChange={event => updateForm('difficulty', event.target.value)}>
                        {DIFFICULTIES.map(level => <option key={level.value} value={level.value}>{level.label}</option>)}
                      </select>
                    </Field>
                  </div>

                  <div className="mt-4">
                    <Field label="Tujuan pembelajaran" hint="Gunakan tujuan yang dapat diamati, misalnya membedakan konsep haid, nifas, dan istihadhah.">
                      <textarea className={`${inputClass} min-h-[80px] resize-y`} value={form.objective} disabled={isPublished} onChange={event => updateForm('objective', event.target.value)} placeholder="Setelah menjawab, siswa mampu..." />
                    </Field>
                  </div>

                  <div className="mt-4">
                    <Field label="Petunjuk saat siswa mengalami kesulitan">
                      <textarea className={`${inputClass} min-h-[75px] resize-y`} value={form.hint} disabled={isPublished} onChange={event => updateForm('hint', event.target.value)} placeholder="Berikan petunjuk konseptual tanpa langsung membocorkan jawaban." />
                    </Field>
                  </div>

                  <div className="mt-4">
                    <Field label="Rekomendasi tindak lanjut" hint="Contoh: baca kembali subbab perbedaan haid dan istihadhah.">
                      <textarea className={`${inputClass} min-h-[75px] resize-y`} value={form.remediation} disabled={isPublished} onChange={event => updateForm('remediation', event.target.value)} placeholder="Materi atau aktivitas yang perlu diulang..." />
                    </Field>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Jika jawaban benar">
                      <select className={selectClass} value={form.nextIfCorrect} disabled={isPublished} onChange={event => updateForm('nextIfCorrect', event.target.value)}>
                        <option value="increase_difficulty">Naikkan kesulitan</option>
                        <option value="same_difficulty">Lanjut pada tingkat yang sama</option>
                      </select>
                    </Field>
                    <Field label="Jika jawaban salah">
                      <select className={selectClass} value={form.nextIfIncorrect} disabled={isPublished} onChange={event => updateForm('nextIfIncorrect', event.target.value)}>
                        <option value="review_material">Ulangi materi terkait</option>
                        <option value="decrease_difficulty">Turunkan tingkat kesulitan</option>
                      </select>
                    </Field>
                  </div>

                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-white p-3 text-[11px] leading-5 text-slate-500">
                    <Sparkles className="mt-0.5 shrink-0 text-[#9B5265]" size={14} />
                    Pengaturan ini disimpan dalam metadata soal. Mesin kuis di sisi siswa harus membaca metadata tersebut agar alur adaptif berjalan saat pengerjaan.
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" onClick={startNewQuestion} disabled={isPublished || saving} className={`${buttonClass} border border-[#EAE0DF] bg-white text-slate-600 hover:bg-slate-50`}>
                    <Plus size={14} /> Soal baru
                  </button>
                  <button type="submit" disabled={isPublished || saving} className={`${buttonClass} bg-[#7A1025] px-5 text-white shadow-sm hover:bg-[#650D1F]`}>
                    {saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
                    {saving ? 'Menyimpan...' : editingQuestion ? 'Simpan perubahan' : 'Simpan pertanyaan'}
                  </button>
                </div>
              </form>
            </section>

            <aside className="min-w-0 space-y-5">
              <section className="rounded-3xl border border-[#EAE0DF] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Activity size={17} className="text-[#7A1025]" />
                  <h3 className="text-sm font-bold">Peta kesulitan</h3>
                </div>
                <p className="mt-1 text-[11px] leading-5 text-slate-400">Distribusi soal yang sudah disimpan.</p>

                <div className="mt-5 space-y-4">
                  {DIFFICULTIES.map(level => {
                    const count = difficultyCounts[level.value] || 0;
                    const width = questions.length ? Math.round((count / questions.length) * 100) : 0;

                    return (
                      <div key={level.value}>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <DifficultyBadge difficulty={level.value} />
                          <span className="text-xs font-bold text-slate-700">{count} soal</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-[#9B5265] transition-all" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-3xl border border-[#EAE0DF] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={17} className="text-[#7A1025]" />
                  <h3 className="text-sm font-bold">Kesiapan publikasi</h3>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${publishChecklist.length ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {publishChecklist.length ? <AlertTriangle size={19} /> : <CheckCircle2 size={19} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{publishChecklist.length ? 'Perlu ditinjau' : 'Siap diperiksa'}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{publishChecklist.length} catatan pemeriksaan</p>
                  </div>
                </div>

                {publishChecklist.length > 0 ? (
                  <ul className="mt-4 space-y-2.5">
                    {publishChecklist.slice(0, 5).map((item, index) => (
                      <li key={`${item}-${index}`} className="flex items-start gap-2 text-[11px] leading-5 text-slate-500">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                        {item}
                      </li>
                    ))}
                    {publishChecklist.length > 5 && <li className="text-[10px] font-semibold text-[#9B5265]">+{publishChecklist.length - 5} catatan lainnya</li>}
                  </ul>
                ) : (
                  <p className="mt-4 text-xs leading-5 text-slate-500">Pemeriksaan dasar editor lolos. Backend tetap akan melakukan validasi sebelum publikasi.</p>
                )}
              </section>

              <section className="rounded-3xl border border-[#E6CBD1] bg-[#FEFBFC] p-5">
                <div className="flex items-center gap-2">
                  <Lightbulb size={17} className="text-[#7A1025]" />
                  <h3 className="text-sm font-bold">Rekomendasi desain</h3>
                </div>
                <p className="mt-3 text-xs leading-6 text-slate-600">
                  Untuk materi Pengenalan Fikih Haid, susun soal dari pemahaman istilah, pembedaan kategori darah, ketentuan ibadah, lalu analisis kasus.
                </p>
                <div className="mt-3 space-y-2 text-[11px] leading-5 text-slate-500">
                  <p><strong className="text-emerald-700">Dasar:</strong> mengenali istilah dan definisi.</p>
                  <p><strong className="text-amber-700">Menengah:</strong> membedakan konsep dan ketentuannya.</p>
                  <p><strong className="text-rose-700">Lanjut:</strong> menerapkan konsep pada situasi kasus.</p>
                </div>
              </section>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
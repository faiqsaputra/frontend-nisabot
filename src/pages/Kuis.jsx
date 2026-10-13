import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft, BookOpen, Check, CircleHelp, Clock3, LoaderCircle,
  LockKeyhole, Play, RefreshCw, Sparkles, Trophy, X
} from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import QuizChallenge from '../components/QuizChallange';
import { quizApi } from '../lib/quiz.api.js';

const GAME_TYPES = new Set(['ordering', 'matching', 'case_analysis']);

const SECRET_KEYS = new Set([
  'answer',
  'answers',
  'correct',
  'iscorrect',
  'correctanswer',
  'correctanswers',
  'correctvalues',
  'correctorder',
  'expectedorder',
  'correctoptionid',
  'correctoptionids',
  'correctindex',
  'correctoptionindex',
  'mapping',
  'solution',
  'expectedmatches',
  'correctmatches',
  'explanation'
]);

function normalizeType(value = 'choice') {
  const type = String(value).trim().toLowerCase().replace(/[\s-]+/g, '_');

  if ([
    'choice', 'multiple_choice', 'single_choice', 'multiplechoice',
    'mcq', 'pilihan_ganda'
  ].includes(type)) return 'choice';

  if ([
    'true_false', 'truefalse', 'boolean', 'benar_salah'
  ].includes(type)) return 'true_false';

  if ([
    'ordering', 'order', 'sequence', 'sequencing', 'susun_urutan'
  ].includes(type)) return 'ordering';

  if ([
    'matching', 'match', 'pairing', 'pasangkan'
  ].includes(type)) return 'matching';

  if ([
    'case', 'case_analysis', 'case_study', 'analisis_kasus'
  ].includes(type)) return 'case_analysis';

  return type;
}

function normalizeKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function stripSecrets(value) {
  if (Array.isArray(value)) return value.map(stripSecrets);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SECRET_KEYS.has(normalizeKey(key)))
      .map(([key, item]) => [key, stripSecrets(item)])
  );
}

function parseContent(value) {
  if (!value) return {};

  if (typeof value === 'object') return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return { text: value };
    }
  }

  return {};
}

function unwrapResponse(response) {
  let value = response;

  for (let index = 0; index < 3; index += 1) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      value.data !== undefined &&
      !value.id &&
      !value.questions &&
      !value.items &&
      !value.quizzes &&
      !value.attempt
    ) {
      value = value.data;
    } else {
      break;
    }
  }

  return value;
}

function extractCollection(response) {
  const body = unwrapResponse(response);

  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.quizzes)) return body.quizzes;
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body?.data)) return body.data;

  return [];
}

function extractEntity(response, key) {
  const body = unwrapResponse(response);

  if (body?.[key]) return body[key];
  if (body?.data?.[key]) return body.data[key];

  return body;
}

function normalizeOption(option, index) {
  if (typeof option === 'string' || typeof option === 'number') {
    return {
      value: index,
      label: String(option),
      order: index
    };
  }

  return {
    id: option?.id,
    value: option?.value ?? option?.id ?? index,
    label: String(
      option?.label ??
      option?.text ??
      option?.title ??
      option?.value ??
      `Pilihan ${index + 1}`
    ),
    order: Number(option?.order ?? index)
  };
}

function normalizeQuestion(rawQuestion) {
  const content = stripSecrets(parseContent(rawQuestion?.content));
  const rawOptions = Array.isArray(rawQuestion?.options) && rawQuestion.options.length
    ? rawQuestion.options
    : Array.isArray(content?.options)
      ? content.options
      : [];

  return {
    id: String(rawQuestion?.id ?? rawQuestion?.questionId ?? ''),
    title: rawQuestion?.title ?? '',
    question: String(
      rawQuestion?.question ??
      rawQuestion?.prompt ??
      rawQuestion?.title ??
      ''
    ),
    type: normalizeType(rawQuestion?.type),
    content,
    options: rawOptions.map(normalizeOption),
    points: Number(rawQuestion?.points ?? 1),
    order: Number(rawQuestion?.order ?? 0)
  };
}

function normalizeQuiz(rawQuiz) {
  const source = rawQuiz?.quiz ?? rawQuiz ?? {};
  const questions = Array.isArray(source.questions)
    ? source.questions
        .map(normalizeQuestion)
        .sort((first, second) => first.order - second.order)
    : [];

  return {
    id: String(source.id ?? source.quizId ?? ''),
    materialId: source.materialId ?? source.material?.id ?? null,
    title: source.title ?? 'Quiz Mission',
    description: source.description ?? source.subtitle ?? '',
    passingScore: Number(source.passingScore ?? 80),
    xpPerCorrect: Number(source.xpPerCorrect ?? 100),
    timeLimitSeconds: Number(source.timeLimitSeconds ?? 0),
    maxAttempts: source.maxAttempts ?? null,
    material: source.material ?? null,
    questionCount: Number(
      source.questionCount ??
      source._count?.questions ??
      questions.length
    ),
    questions
  };
}

function getErrorMessage(error, fallback) {
  if (typeof error === 'string') return error;

  return (
    error?.response?.data?.message ??
    error?.data?.message ??
    error?.message ??
    fallback
  );
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return 'Tanpa batas waktu';

  const minutes = Math.ceil(seconds / 60);
  return `${minutes} menit`;
}

function getQuestionCount(quiz) {
  return quiz?.questions?.length || quiz?.questionCount || 0;
}

function getResultPercentage(result, fallbackPercentage = 0) {
  const value = result?.percentage ?? result?.result?.percentage;

  if (value !== undefined && value !== null && Number.isFinite(Number(value))) {
    return Math.max(0, Math.min(100, Math.round(Number(value))));
  }

  return fallbackPercentage;
}

function PrimaryButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  icon: Icon,
  className = ''
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#7A1025] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#64101f] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <LoaderCircle size={17} className="animate-spin" />
      ) : Icon ? (
        <Icon size={17} />
      ) : null}
      {children}
    </button>
  );
}

function ErrorMessage({ children, onRetry }) {
  if (!children) return null;

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700 sm:flex-row sm:items-center sm:justify-between"
    >
      <p>{children}</p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 items-center justify-center gap-2 font-semibold text-rose-700 hover:text-rose-900"
        >
          <RefreshCw size={15} />
          Coba lagi
        </button>
      )}
    </div>
  );
}

function LoadingPanel({ label = 'Memuat data tantangan...' }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-[28px] border border-[#7A1025]/10 bg-white p-8 text-center shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F6E5E8] text-[#7A1025]">
        <LoaderCircle size={27} className="animate-spin" />
      </div>

      <div>
        <p className="font-semibold text-slate-800">{label}</p>
        <p className="mt-1 text-sm text-slate-400">
          Menghubungkan dengan server Nusa Bot.
        </p>
      </div>
    </div>
  );
}

export default function Kuis() {
  const navigate = useNavigate();
  const { quizId: routeQuizId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const reduceMotion = useReducedMotion();

  const selectedQuizId = routeQuizId || searchParams.get('quizId');

  const [quizList, setQuizList] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [completion, setCompletion] = useState(null);

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [started, setStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const [pageError, setPageError] = useState('');
  const [actionError, setActionError] = useState('');

  const questions = quiz?.questions ?? [];
  const currentQuestion = questions[currentIndex] ?? null;
  const currentResult = currentQuestion
    ? answers[String(currentQuestion.id)]
    : null;

  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  const correctCount = useMemo(
    () => Object.values(answers).filter((result) => result?.correct === true).length,
    [answers]
  );

  const localPercentage = totalQuestions
    ? Math.round((correctCount / totalQuestions) * 100)
    : 0;

  const percentage = isFinished
    ? getResultPercentage(completion, localPercentage)
    : localPercentage;

  const passed = isFinished
    ? Boolean(completion?.passed ?? completion?.result?.passed ?? percentage >= (quiz?.passingScore ?? 80))
    : percentage >= (quiz?.passingScore ?? 80);

  const finalCorrectCount = Number(
    completion?.correctCount ??
    completion?.correctAnswers ??
    completion?.result?.correctCount ??
    correctCount
  );

  const totalXp = Number(
    completion?.xpEarned ??
    completion?.xp ??
    completion?.result?.xpEarned ??
    finalCorrectCount * (quiz?.xpPerCorrect ?? 100)
  );

  const progressPercentage = totalQuestions
    ? (answeredCount / totalQuestions) * 100
    : 0;

  const loadQuizList = useCallback(async () => {
    setLoading(true);
    setPageError('');

    try {
      const response = await quizApi.publicList({ page: 1, limit: 100 });
      const records = extractCollection(response).map(normalizeQuiz);

      setQuizList(records);
    } catch (error) {
      setPageError(
        getErrorMessage(error, 'Daftar kuis gagal dimuat dari server.')
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadQuizDetail = useCallback(async (id) => {
    setLoading(true);
    setPageError('');
    setActionError('');
    setQuiz(null);
    setAttempt(null);
    setStarted(false);
    setIsFinished(false);
    setCompletion(null);
    setCurrentIndex(0);
    setAnswers({});

    try {
      const response = await quizApi.publicGet(id);
      const rawQuiz = extractEntity(response, 'quiz');
      const normalized = normalizeQuiz(rawQuiz);

      if (!normalized.id) {
        throw new Error('Data kuis dari server tidak memiliki ID yang valid.');
      }

      setQuiz(normalized);
    } catch (error) {
      setPageError(
        getErrorMessage(error, 'Detail kuis gagal dimuat dari server.')
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedQuizId) {
      loadQuizDetail(selectedQuizId);
      return;
    }

    setQuiz(null);
    setAttempt(null);
    setStarted(false);
    setIsFinished(false);
    setCompletion(null);
    setCurrentIndex(0);
    setAnswers({});

    loadQuizList();
  }, [selectedQuizId, loadQuizDetail, loadQuizList]);

  const handleChooseQuiz = useCallback((id) => {
    setSearchParams({ quizId: String(id) });
  }, [setSearchParams]);

  const handleBackToList = useCallback(() => {
    if (routeQuizId) {
      navigate('/kuis');
      return;
    }

    setSearchParams({});
  }, [navigate, routeQuizId, setSearchParams]);

  const handleBackToMaterial = useCallback(() => {
    navigate('/materi');
  }, [navigate]);

  const handleStartQuiz = useCallback(async () => {
    if (!quiz?.id || starting || !questions.length) return;

    setStarting(true);
    setActionError('');

    try {
      const response = await quizApi.startAttempt(quiz.id, {});
      const newAttempt = extractEntity(response, 'attempt');

      if (!newAttempt?.id) {
        throw new Error('Server tidak mengembalikan ID percobaan kuis.');
      }

      setAttempt(newAttempt);
      setAnswers({});
      setCompletion(null);
      setCurrentIndex(0);
      setIsFinished(false);
      setStarted(true);
    } catch (error) {
      setActionError(
        getErrorMessage(
          error,
          'Percobaan kuis gagal dimulai. Periksa koneksi dan status login akunmu.'
        )
      );
    } finally {
      setStarting(false);
    }
  }, [quiz, questions.length, starting]);

  const validateQuestionAnswer = useCallback(async (payload) => {
    if (!attempt?.id) {
      throw new Error('Percobaan kuis belum dimulai. Mulai kuis terlebih dahulu.');
    }

    const response = await quizApi.submitAnswer(attempt.id, {
      questionId: payload.questionId,
      type: payload.type,
      answer: payload.answer,
      durationMs: payload.durationMs
    });

    const body = unwrapResponse(response);
    const result = body?.result ?? body?.answerResult ?? body;

    const correct = result?.correct ?? result?.isCorrect;

    if (typeof correct !== 'boolean') {
      throw new Error('Server belum mengembalikan hasil penilaian yang valid.');
    }

    return {
      ...result,
      questionId: result?.questionId ?? payload.questionId,
      type: result?.type ?? payload.type,
      answer: result?.answer ?? payload.answer,
      correct,
      isCorrect: correct,
      points: Number(
        result?.points ??
        result?.pointsAwarded ??
        result?.earnedPoints ??
        0
      ),
      explanation: result?.explanation ?? ''
    };
  }, [attempt?.id]);

  const handleValidatedAnswer = useCallback((result) => {
    if (!result || !currentQuestion) return;

    const questionId = String(result.questionId ?? currentQuestion.id);
    const correct = result.correct ?? result.isCorrect;

    if (typeof correct !== 'boolean') return;

    setAnswers((previous) => {
      if (previous[questionId]) return previous;

      return {
        ...previous,
        [questionId]: {
          ...result,
          questionId,
          correct,
          value: result.answer ?? null,
          explanation: result.explanation ?? ''
        }
      };
    });

    setActionError('');
  }, [currentQuestion]);

  const handleNext = useCallback(async () => {
    if (!currentResult || finishing) return;

    setActionError('');

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((previous) => previous + 1);
      return;
    }

    if (!attempt?.id) {
      setActionError('ID percobaan kuis tidak ditemukan.');
      return;
    }

    setFinishing(true);

    try {
      const response = await quizApi.completeAttempt(attempt.id, {});
      const completed = extractEntity(response, 'attempt');

      setCompletion(completed);
      setIsFinished(true);
    } catch (error) {
      setActionError(
        getErrorMessage(
          error,
          'Hasil kuis gagal diselesaikan. Silakan coba lagi.'
        )
      );
    } finally {
      setFinishing(false);
    }
  }, [currentResult, finishing, currentIndex, totalQuestions, attempt?.id]);

  const handleRetry = useCallback(() => {
    setStarted(false);
    setIsFinished(false);
    setCompletion(null);
    setAttempt(null);
    setAnswers({});
    setCurrentIndex(0);
    setActionError('');
  }, []);

  const handleReload = useCallback(() => {
    if (selectedQuizId) {
      loadQuizDetail(selectedQuizId);
    } else {
      loadQuizList();
    }
  }, [selectedQuizId, loadQuizDetail, loadQuizList]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF8F6] text-slate-900">
        <Navbar />
        <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <LoadingPanel />
        </main>
      </div>
    );
  }

  if (isFinished) {
    const serverMessage = completion?.message ?? completion?.result?.message;

    return (
      <div className="min-h-screen bg-[#FBF8F6] text-slate-900">
        <Navbar />

        <main className="mx-auto flex min-h-[calc(100svh-68px)] w-full max-w-5xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full overflow-hidden rounded-[32px] border border-[#7A1025]/10 bg-white shadow-[0_24px_80px_rgba(122,16,37,0.10)]"
          >
            <div className="relative overflow-hidden px-6 py-12 text-center sm:px-10 sm:py-16">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#F6E5E8,transparent_48%)]" />

              <motion.div
                initial={reduceMotion ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                className={`relative mx-auto flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg ${passed ? 'bg-[#7A1025]' : 'bg-slate-500'}`}
              >
                {passed ? <Trophy size={34} /> : <Sparkles size={34} />}
              </motion.div>

              <div className="relative mt-7">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7A1025]">
                  Tantangan Selesai
                </p>

                <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  {passed ? 'Materi berikutnya terbuka!' : 'Belum mencapai nilai minimum'}
                </h1>

                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
                  {serverMessage ||
                    (passed
                      ? 'Kamu berhasil menyelesaikan tantangan ini. Perjalanan belajarmu dapat dilanjutkan ke materi berikutnya.'
                      : `Nilaimu ${percentage}%. Nilai minimum untuk membuka materi berikutnya adalah ${quiz?.passingScore ?? 80}%.`)}
                </p>
              </div>

              <div className="relative mx-auto mt-8 grid max-w-md grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#FBF8F6] p-5">
                  <p className="text-xs font-medium text-slate-500">Skor</p>
                  <p className="mt-1 font-display text-3xl font-bold text-[#7A1025]">
                    {percentage}%
                  </p>
                </div>

                <div className="rounded-2xl bg-[#FBF8F6] p-5">
                  <p className="text-xs font-medium text-slate-500">Jawaban Benar</p>
                  <p className="mt-1 font-display text-3xl font-bold text-[#7A1025]">
                    {finalCorrectCount}
                    <span className="font-sans text-base font-medium text-slate-400">
                      {' '}/ {totalQuestions}
                    </span>
                  </p>
                </div>
              </div>

              <div className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-[#F6E5E8] px-4 py-2 text-sm font-semibold text-[#7A1025]">
                <Sparkles size={15} />
                +{totalXp} XP
              </div>

              <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                {passed ? (
                  <PrimaryButton
                    onClick={handleBackToMaterial}
                    icon={ArrowLeft}
                    className="[&>svg]:rotate-180"
                  >
                    Lanjut ke Materi
                  </PrimaryButton>
                ) : (
                  <PrimaryButton onClick={handleRetry} icon={RefreshCw}>
                    Coba Lagi
                  </PrimaryButton>
                )}

                <button
                  type="button"
                  onClick={handleBackToList}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Lihat Kuis Lain
                </button>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  if (started && quiz && currentQuestion) {
    const currentIsGame = GAME_TYPES.has(normalizeType(currentQuestion.type));

    return (
      <div className="min-h-screen bg-[#FBF8F6] text-slate-900">
        <Navbar />

        <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pb-14 lg:pt-8">
          <button
            type="button"
            onClick={handleBackToList}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#7A1025]"
          >
            <ArrowLeft size={17} />
            Keluar dari tantangan
          </button>

          <section className="mb-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#F6E5E8] px-3 py-1.5 text-xs font-semibold text-[#7A1025]">
                  <Sparkles size={13} />
                  Tantangan {String(currentIndex + 1).padStart(2, '0')}
                </div>

                <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  {quiz.title}
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                  {quiz.description || 'Buktikan pemahamanmu melalui tantangan interaktif.'}
                </p>
              </div>

              <div className="flex items-center gap-3 self-start lg:self-auto">
                <div className="rounded-2xl border border-[#7A1025]/10 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Progress
                  </p>
                  <p className="mt-1 font-display text-lg font-bold text-[#7A1025]">
                    {answeredCount}
                    <span className="font-sans text-sm font-medium text-slate-400">
                      {' '}/ {totalQuestions}
                    </span>
                  </p>
                </div>

                <div className="rounded-2xl border border-[#7A1025]/10 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    XP
                  </p>
                  <p className="mt-1 font-display text-lg font-bold text-[#7A1025]">
                    +{correctCount * quiz.xpPerCorrect}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 h-2 overflow-hidden rounded-full bg-white shadow-inner">
              <motion.div
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.3 }}
                className="h-full rounded-full bg-[#7A1025]"
              />
            </div>
          </section>

          <ErrorMessage>{actionError}</ErrorMessage>

          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <section className="min-w-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion.id}
                  initial={reduceMotion ? false : { opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, x: -18 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-[30px] border border-[#7A1025]/10 bg-white p-5 shadow-[0_18px_60px_rgba(122,16,37,0.07)] sm:p-7 lg:p-8"
                >
                  <div className="mb-7 flex items-start justify-between gap-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Pertanyaan {currentIndex + 1}
                      </p>

                      <h2 className="mt-2 font-display text-xl font-bold leading-tight sm:text-2xl">
                        {currentQuestion.question}
                      </h2>
                    </div>

                    <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F6E5E8] font-display text-lg font-bold text-[#7A1025] sm:flex">
                      {String(currentIndex + 1).padStart(2, '0')}
                    </div>
                  </div>

                  <QuizChallenge
                    key={currentQuestion.id}
                    question={currentQuestion}
                    validateAnswer={validateQuestionAnswer}
                    onAnswer={handleValidatedAnswer}
                    answerResult={currentResult}
                    showFeedback={Boolean(currentResult)}
                    disabled={Boolean(currentResult) || finishing}
                  />

                  {currentResult && (
                    <motion.div
                      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 space-y-4"
                    >
                      <div
                        className={`rounded-2xl border p-4 ${
                          currentResult.correct
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-rose-200 bg-rose-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${
                              currentResult.correct ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          >
                            {currentResult.correct ? <Check size={16} /> : <X size={16} />}
                          </div>

                          <div>
                            <p
                              className={`font-semibold ${
                                currentResult.correct ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {currentResult.correct ? 'Jawaban tepat!' : 'Belum tepat'}
                            </p>

                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {currentResult.explanation ||
                                'Jawaban telah diperiksa dan dicatat oleh server.'}
                            </p>

                            {currentResult.points !== undefined && (
                              <p className="mt-2 text-xs font-semibold text-slate-500">
                                Poin diperoleh: {Number(currentResult.points) || 0}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs leading-5 text-slate-400">
                          Hasil penilaian diterima dari server.
                        </p>

                        <PrimaryButton
                          onClick={handleNext}
                          loading={finishing}
                          icon={finishing ? undefined : ArrowLeft}
                          className={!finishing ? '[&>svg]:rotate-180' : ''}
                        >
                          {finishing
                            ? 'Menyelesaikan kuis...'
                            : currentIndex === totalQuestions - 1
                              ? 'Lihat Hasil'
                              : 'Tantangan Berikutnya'}
                        </PrimaryButton>
                      </div>
                    </motion.div>
                  )}

                  {!currentResult && !actionError && (
                    <div className="mt-6 flex items-center gap-2 text-xs leading-5 text-slate-400">
                      <LockKeyhole size={14} className="text-[#7A1025]" />
                      Jawaban akan dinilai server setelah dikirim.
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </section>

            <aside className="h-fit space-y-4 lg:sticky lg:top-24">
              <div className="rounded-[28px] border border-[#7A1025]/10 bg-white p-5 shadow-[0_18px_50px_rgba(122,16,37,0.06)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Perjalananmu
                    </p>
                    <h3 className="mt-1 font-display text-lg font-bold">
                      Tantangan
                    </h3>
                  </div>

                  <Sparkles size={20} className="text-[#7A1025]" />
                </div>

                <div className="mt-5 grid grid-cols-5 gap-2">
                  {questions.map((question, index) => {
                    const result = answers[String(question.id)];
                    const answered = Boolean(result);
                    const active = index === currentIndex;

                    return (
                      <button
                        key={question.id}
                        type="button"
                        disabled
                        aria-label={`Tantangan ${index + 1}${answered ? ', selesai' : ''}`}
                        className={`flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition ${
                          active
                            ? 'bg-[#7A1025] text-white shadow-md'
                            : answered
                              ? result.correct
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-rose-50 text-rose-500'
                              : 'bg-slate-50 text-slate-400'
                        }`}
                      >
                        {answered ? (
                          result.correct ? <Check size={15} /> : <X size={15} />
                        ) : (
                          index + 1
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Selesai</span>
                    <span className="font-semibold text-slate-600">
                      {answeredCount} / {totalQuestions}
                    </span>
                  </div>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 0.3 }}
                      className="h-full rounded-full bg-[#7A1025]"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] bg-[#7A1025] p-5 text-white shadow-[0_18px_50px_rgba(122,16,37,0.15)]">
                <div className="flex items-center gap-2">
                  <LockKeyhole size={18} />
                  <p className="font-semibold">Materi Berikutnya</p>
                </div>

                <p className="mt-3 text-sm leading-6 text-white/75">
                  Selesaikan seluruh tantangan dengan nilai minimal {quiz.passingScore}% untuk membuka materi berikutnya.
                </p>

                <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
                  <span className="text-xs text-white/65">Nilai sementara</span>
                  <span className="font-display text-sm font-bold">
                    {answeredCount ? `${percentage}%` : 'Belum ada'}
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    );
  }

  if (quiz) {
    const questionCount = getQuestionCount(quiz);

    return (
      <div className="min-h-screen bg-[#FBF8F6] text-slate-900">
        <Navbar />

        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={handleBackToList}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#7A1025]"
          >
            <ArrowLeft size={17} />
            Daftar Kuis
          </button>

          <section className="relative overflow-hidden rounded-[32px] bg-[#7A1025] px-6 py-8 text-white shadow-[0_24px_70px_rgba(122,16,37,0.16)] sm:px-10 sm:py-12">
            <div className="absolute -right-12 -top-16 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-[#D4A017]/20 blur-3xl" />

            <div className="relative max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">
                <Sparkles size={14} />
                Quiz Mission
              </div>

              <h1 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-5xl">
                {quiz.title}
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
                {quiz.description || 'Uji pemahamanmu melalui tantangan interaktif dan dapatkan XP dari setiap jawaban yang benar.'}
              </p>

              <div className="mt-7 flex flex-wrap gap-3 text-xs font-medium sm:text-sm">
                <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3">
                  <CircleHelp size={16} />
                  {questionCount} pertanyaan
                </span>

                <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3">
                  <Trophy size={16} />
                  Nilai minimum {quiz.passingScore}%
                </span>

                <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3">
                  <Clock3 size={16} />
                  {formatDuration(quiz.timeLimitSeconds)}
                </span>
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
            <section className="rounded-[28px] border border-[#7A1025]/10 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F6E5E8] text-[#7A1025]">
                  <BookOpen size={22} />
                </div>

                <div>
                  <h2 className="font-display text-xl font-bold">
                    Sebelum memulai
                  </h2>

                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    Bacalah pertanyaan dengan cermat. Beberapa tantangan menggunakan permainan interaktif untuk menyusun urutan, memasangkan konsep, atau menganalisis kasus.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {[
                  'Jawaban dikirim untuk diperiksa oleh server.',
                  'Hasil dan poin mengikuti penilaian backend.',
                  'Selesaikan semua pertanyaan untuk melihat hasil akhir.'
                ].map((item, index) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl bg-[#FBF8F6] p-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-[#7A1025] shadow-sm">
                      {index + 1}
                    </span>
                    <p className="text-sm leading-6 text-slate-600">{item}</p>
                  </div>
                ))}
              </div>

              <ErrorMessage>{actionError}</ErrorMessage>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <PrimaryButton
                  onClick={handleStartQuiz}
                  loading={starting}
                  disabled={!questionCount}
                  icon={Play}
                  className="sm:min-w-52"
                >
                  {starting ? 'Menyiapkan kuis...' : 'Mulai Challenge'}
                </PrimaryButton>

                <button
                  type="button"
                  onClick={handleBackToList}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Pilih Kuis Lain
                </button>
              </div>

              {!questionCount && (
                <p className="mt-4 text-sm text-rose-600">
                  Kuis ini belum memiliki pertanyaan yang dapat dimainkan.
                </p>
              )}
            </section>

            <aside className="h-fit rounded-[28px] border border-[#7A1025]/10 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Misi Belajar
              </p>

              <h3 className="mt-2 font-display text-xl font-bold">
                Selesaikan tantangan
              </h3>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500">Total soal</span>
                  <span className="text-sm font-semibold text-slate-800">{questionCount}</span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500">Nilai minimum</span>
                  <span className="text-sm font-semibold text-[#7A1025]">{quiz.passingScore}%</span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500">XP per jawaban benar</span>
                  <span className="text-sm font-semibold text-slate-800">{quiz.xpPerCorrect} XP</span>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF8F6] text-slate-900">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[32px] border border-[#7A1025]/10 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-10">
          <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-[#F6E5E8] blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#F6E5E8] px-3 py-1.5 text-xs font-semibold text-[#7A1025]">
              <Sparkles size={14} />
              Nusa Bot Learning
            </div>

            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  Pilih Quiz Mission
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                  Pilih tantangan belajar yang tersedia dan uji pemahamanmu melalui soal interaktif.
                </p>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-[#7A1025]/10 bg-[#FBF8F6] px-4 py-3 text-sm font-semibold text-[#7A1025]">
                <BookOpen size={17} />
                {quizList.length} kuis tersedia
              </div>
            </div>
          </div>
        </section>

        {pageError && (
          <div className="mt-6">
            <ErrorMessage onRetry={handleReload}>{pageError}</ErrorMessage>
          </div>
        )}

        {!pageError && quizList.length === 0 && (
          <div className="mt-6 flex min-h-[260px] flex-col items-center justify-center rounded-[28px] border border-dashed border-[#7A1025]/20 bg-white px-6 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F6E5E8] text-[#7A1025]">
              <BookOpen size={25} />
            </div>

            <h2 className="mt-4 font-display text-xl font-bold">
              Belum ada kuis tersedia
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Kuis yang telah dipublikasikan admin akan muncul di halaman ini.
            </p>

            <button
              type="button"
              onClick={handleBackToMaterial}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft size={16} />
              Kembali ke Materi
            </button>
          </div>
        )}

        {quizList.length > 0 && (
          <section className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {quizList.map((item, index) => {
              const questionCount = getQuestionCount(item);

              return (
                <motion.article
                  key={item.id || index}
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.04, 0.2) }}
                  className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-[#7A1025]/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(122,16,37,0.08)]"
                >
                  <div className="relative flex h-36 items-center justify-center overflow-hidden bg-[#F6E5E8]">
                    <div className="absolute -right-5 -top-7 h-32 w-32 rounded-full bg-white/70 blur-2xl" />
                    <div className="absolute -bottom-10 -left-5 h-32 w-32 rounded-full bg-[#7A1025]/10 blur-2xl" />

                    <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] bg-white text-[#7A1025] shadow-sm transition group-hover:scale-105">
                      <Sparkles size={28} />
                    </div>

                    <span className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#7A1025]">
                      Quiz Mission
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <h2 className="font-display text-xl font-bold leading-snug text-slate-900">
                      {item.title}
                    </h2>

                    <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-slate-500">
                      {item.description || 'Tantangan interaktif untuk menguji pemahamanmu terhadap materi.'}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#FBF8F6] px-3 py-2 text-xs font-medium text-slate-500">
                        <CircleHelp size={14} />
                        {questionCount || '—'} soal
                      </span>

                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#FBF8F6] px-3 py-2 text-xs font-medium text-slate-500">
                        <Trophy size={14} />
                        Min. {item.passingScore}%
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleChooseQuiz(item.id)}
                      disabled={!item.id}
                      className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#7A1025] px-4 text-sm font-semibold text-white transition hover:bg-[#64101f] disabled:opacity-50"
                    >
                      Lihat Tantangan
                      <ArrowLeft size={16} className="rotate-180" />
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
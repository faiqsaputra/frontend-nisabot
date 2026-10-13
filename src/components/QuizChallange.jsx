import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCircle2, CircleHelp, Lightbulb, LoaderCircle, Sparkles, X } from 'lucide-react';
import Phaser from 'phaser';
import QuizGame from '../game/QuizGame';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const GAME_TYPES = new Set(['ordering', 'matching', 'case', 'case_analysis']);

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
  'explanation'
]);

const OPTION_STYLES = {
  default: 'border-slate-200 bg-white hover:border-[#7A1025]/25 hover:bg-[#FBF8F6]',
  selected: 'border-[#7A1025] bg-[#F6E5E8] shadow-[0_8px_24px_rgba(122,16,37,0.08)]',
  correct: 'border-emerald-300 bg-emerald-50',
  wrong: 'border-rose-300 bg-rose-50'
};

const BADGE_STYLES = {
  default: 'bg-slate-100 text-slate-500 group-hover:bg-[#F6E5E8] group-hover:text-[#7A1025]',
  selected: 'bg-[#7A1025] text-white',
  correct: 'bg-emerald-500 text-white',
  wrong: 'bg-rose-500 text-white'
};

function normalizeType(value = 'choice') {
  const type = String(value).trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (['choice', 'multiple_choice', 'single_choice', 'multiplechoice', 'mcq', 'pilihan_ganda'].includes(type)) return 'choice';
  if (['true_false', 'boolean', 'benar_salah', 'truefalse'].includes(type)) return 'true_false';
  if (['ordering', 'order', 'sequence', 'sequencing', 'susun_urutan'].includes(type)) return 'ordering';
  if (['matching', 'match', 'pairing', 'pasangkan'].includes(type)) return 'matching';
  if (['case', 'case_analysis', 'case_study', 'analisis_kasus'].includes(type)) return 'case_analysis';

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

function getOptionLabel(option, index) {
  if (typeof option === 'string' || typeof option === 'number') return String(option);

  return String(
    option?.label ??
    option?.text ??
    option?.title ??
    option?.value ??
    `Pilihan ${index + 1}`
  );
}

function getOptionValue(option, index) {
  if (typeof option === 'object' && option !== null) {
    return option.value ?? option.id ?? index;
  }

  return index;
}

function getServerResult(response, payload, durationMs) {
  const body = response?.data ?? response ?? {};
  const nested = body.result && typeof body.result === 'object' ? body.result : {};
  const rawCorrect = body.correct ?? body.isCorrect ?? nested.correct;

  if (typeof rawCorrect !== 'boolean') {
    throw new Error('Respons penilaian API belum menyertakan hasil benar atau salah.');
  }

  return {
    ...body,
    ...nested,
    questionId: payload.questionId,
    type: payload.type,
    answer: payload.answer,
    correct: rawCorrect,
    isCorrect: rawCorrect,
    points: Number(body.points ?? body.pointsAwarded ?? body.earnedPoints ?? nested.points ?? 0),
    explanation: body.explanation ?? nested.explanation ?? '',
    durationMs
  };
}

function getOptionState({ selected, correct, showFeedback }) {
  if (showFeedback && correct) return 'correct';
  if (showFeedback && selected && !correct) return 'wrong';
  if (selected) return 'selected';
  return 'default';
}

function isSameValue(first, second) {
  if (first === second) return true;
  if (first == null || second == null) return false;

  return String(first) === String(second);
}

export default function QuizChallenge({
  question,
  selectedAnswer = null,
  onAnswer,
  showFeedback = false,
  validateAnswer,
  answerResult = null,
  disabled = false
}) {
  const gameContainerRef = useRef(null);
  const gameRef = useRef(null);
  const questionStartedAtRef = useRef(Date.now());

  const onAnswerRef = useRef(onAnswer);
  const validateAnswerRef = useRef(validateAnswer);

  const [submittedIndex, setSubmittedIndex] = useState(null);
  const [localResult, setLocalResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const type = normalizeType(question?.type);
  const isGameChallenge = GAME_TYPES.has(type);
  const serverGraded = typeof validateAnswer === 'function';

  useEffect(() => {
    onAnswerRef.current = onAnswer;
    validateAnswerRef.current = validateAnswer;
  }, [onAnswer, validateAnswer]);

  useEffect(() => {
    questionStartedAtRef.current = Date.now();
    setSubmittedIndex(null);
    setLocalResult(null);
    setSubmitting(false);
    setSubmitError('');
  }, [question?.id]);

  const result = answerResult ?? localResult;
  const feedbackVisible = Boolean(showFeedback || result);
  const resultCorrect = result?.correct ?? result?.isCorrect ?? result?.result?.correct;

  const standardOptions = useMemo(() => {
    if (type === 'true_false') {
      return [
        { value: true, label: 'Benar', description: 'Pernyataan sesuai dengan materi.' },
        { value: false, label: 'Salah', description: 'Pernyataan tidak sesuai dengan materi.' }
      ];
    }

    const options = Array.isArray(question?.options) ? question.options : [];

    return options.map((option, index) => ({
      value: getOptionValue(option, index),
      label: getOptionLabel(option, index),
      raw: option
    }));
  }, [question?.options, type]);

  const selectedIndex = submittedIndex !== null
    ? submittedIndex
    : standardOptions.findIndex((option, index) => {
        if (selectedAnswer === null || selectedAnswer === undefined) return false;
        return isSameValue(selectedAnswer, index) || isSameValue(selectedAnswer, option.value);
      });

  useEffect(() => {
    if (!isGameChallenge || !gameContainerRef.current || !question) return undefined;

    const container = gameContainerRef.current;
    let disposed = false;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: container,
      width: 960,
      height: 560,
      backgroundColor: '#FBF8F6',
      transparent: true,
      render: { antialias: true, roundPixels: true },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 960,
        height: 560
      },
      scene: []
    });

    gameRef.current = game;

    game.events.once(Phaser.Core.Events.READY, () => {
      if (disposed) return;

      game.scene.add('QuizGame', QuizGame, false);

      const gameQuestion = serverGraded ? stripSecrets(question) : question;

      game.scene.start('QuizGame', {
        question: gameQuestion,
        serverGraded,
        onAnswer: (answerResult) => onAnswerRef.current?.(answerResult),
        validateAnswer: serverGraded
          ? (payload) => {
              const validator = validateAnswerRef.current;

              if (typeof validator !== 'function') {
                throw new Error('Fungsi validasi jawaban belum tersedia.');
              }

              return validator(payload);
            }
          : undefined
      });
    });

    return () => {
      disposed = true;

      if (gameRef.current === game) gameRef.current = null;

      game.destroy(true);

      if (container) container.innerHTML = '';
    };
  }, [isGameChallenge, question?.id, serverGraded]);

  if (!question) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-[26px] border border-slate-200 bg-white">
        <p className="text-sm text-slate-400">Data challenge belum tersedia.</p>
      </div>
    );
  }

  if (isGameChallenge) {
    return (
      <div className="relative w-full overflow-hidden rounded-[28px] border border-[#7A1025]/10 bg-[#FBF8F6]">
        <div
          ref={gameContainerRef}
          className="h-[360px] w-full sm:h-[460px] lg:h-[560px]"
        />

        <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7A1025] shadow-sm backdrop-blur sm:left-5 sm:top-5 sm:text-xs">
          <Sparkles size={13} />
          Interactive Challenge
        </div>
      </div>
    );
  }

  const isCase = type === 'case_analysis';

  async function handleOptionSelect(option, index) {
    if (disabled || submitting || feedbackVisible) return;

    setSubmittedIndex(index);
    setSubmitError('');

    if (!serverGraded) {
      onAnswer?.(type === 'true_false' ? option.value : index);
      return;
    }

    setSubmitting(true);

    const durationMs = Math.max(0, Date.now() - questionStartedAtRef.current);
    const answerPayload = {
      selectedIndex: index,
      selectedValue: option.value,
      selectedLabel: option.label
    };

    const payload = {
      questionId: question.id,
      type,
      answer: answerPayload,
      durationMs
    };

    try {
      const response = await validateAnswerRef.current(payload);
      const gradedResult = getServerResult(response, payload, durationMs);

      setLocalResult(gradedResult);
      onAnswerRef.current?.(gradedResult);
    } catch (error) {
      setSubmittedIndex(null);
      setSubmitError(error?.message || 'Jawaban gagal dikirim. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {isCase && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[26px] bg-[#7A1025] p-5 text-white sm:p-6"
        >
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />

          <div className="relative flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <Lightbulb size={21} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                  Case Challenge
                </p>
                <Sparkles size={13} className="text-white/70" />
              </div>

              <p className="mt-2 text-sm leading-6 text-white/85">
                Perhatikan situasi berikut, lalu pilih jawaban paling tepat berdasarkan materi yang sudah kamu pelajari.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {!isCase && (
        <div className="flex items-center justify-between rounded-2xl bg-[#FBF8F6] px-4 py-3">
          <div className="flex items-center gap-2">
            <CircleHelp size={16} className="text-[#7A1025]" />
            <p className="text-xs font-medium text-slate-500 sm:text-sm">
              {type === 'true_false' ? 'Tentukan benar atau salah' : 'Pilih satu jawaban'}
            </p>
          </div>

          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
            Challenge
          </span>
        </div>
      )}

      {type === 'true_false' && (
        <div className="flex items-center gap-2 rounded-2xl bg-[#FBF8F6] px-4 py-3">
          <Sparkles size={16} className="shrink-0 text-[#7A1025]" />
          <p className="text-xs leading-5 text-slate-500 sm:text-sm">
            Pilih Benar apabila pernyataan sesuai dengan materi, atau Salah apabila tidak sesuai.
          </p>
        </div>
      )}

      <div className="grid gap-3">
        {standardOptions.map((option, index) => {
          const selected = selectedIndex === index;

          const serverCorrectIndex = result?.correctIndex ?? result?.correctOptionIndex;
          const serverCorrectValue = result?.correctOptionValue ?? result?.correctValue ?? result?.correctOptionId;

          const correctFromServer = serverGraded && feedbackVisible && (
            (Number.isInteger(serverCorrectIndex) && serverCorrectIndex === index) ||
            (serverCorrectValue !== undefined && isSameValue(serverCorrectValue, option.value)) ||
            (selected && resultCorrect === true)
          );

          const correctFromLegacy = !serverGraded && feedbackVisible && (
            type === 'true_false'
              ? isSameValue(option.value, question.answer)
              : isSameValue(index, question.answer)
          );

          const correct = Boolean(correctFromServer || correctFromLegacy);
          const state = getOptionState({
            selected,
            correct,
            showFeedback: feedbackVisible
          });

          const wrongFromServer = serverGraded && feedbackVisible && selected && resultCorrect === false;

          return (
            <motion.button
              key={`${question.id}-${index}`}
              type="button"
              disabled={disabled || submitting || feedbackVisible}
              onClick={() => handleOptionSelect(option, index)}
              whileHover={!disabled && !submitting && !feedbackVisible ? { x: 4 } : undefined}
              whileTap={!disabled && !submitting && !feedbackVisible ? { scale: 0.99 } : undefined}
              className={`group relative flex min-h-[76px] w-full items-center gap-4 overflow-hidden rounded-[24px] border p-4 text-left transition sm:p-5 ${OPTION_STYLES[wrongFromServer ? 'wrong' : state]} disabled:cursor-default`}
            >
              <motion.span
                animate={selected && !feedbackVisible ? { scale: [1, 1.08, 1] } : undefined}
                transition={{ duration: 0.3 }}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-semibold transition sm:h-12 sm:w-12 ${BADGE_STYLES[wrongFromServer ? 'wrong' : state]}`}
              >
                {feedbackVisible && correct ? (
                  <Check size={18} />
                ) : wrongFromServer ? (
                  <X size={18} />
                ) : type === 'true_false' ? (
                  option.value ? '✓' : '×'
                ) : (
                  OPTION_LETTERS[index] ?? index + 1
                )}
              </motion.span>

              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold leading-6 sm:text-[15px] ${state === 'correct' ? 'text-emerald-700' : state === 'wrong' || wrongFromServer ? 'text-rose-700' : 'text-slate-700'}`}>
                  {option.label}
                </span>

                {option.description && (
                  <span className="mt-1 block text-xs leading-5 text-slate-400 sm:text-sm">
                    {option.description}
                  </span>
                )}
              </span>

              <AnimatePresence mode="wait">
                {submitting && selected && (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="shrink-0 text-[#7A1025]"
                  >
                    <LoaderCircle size={20} className="animate-spin" />
                  </motion.span>
                )}

                {selected && !feedbackVisible && !submitting && (
                  <motion.span
                    key="selected"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7A1025] text-white"
                  >
                    <Check size={14} />
                  </motion.span>
                )}

                {feedbackVisible && correct && (
                  <motion.span
                    key="correct"
                    initial={{ scale: 0, rotate: -20, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    className="shrink-0 text-emerald-500"
                  >
                    <CheckCircle2 size={20} />
                  </motion.span>
                )}

                {wrongFromServer && (
                  <motion.span
                    key="wrong"
                    initial={{ scale: 0, rotate: 20, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    className="shrink-0 text-rose-500"
                  >
                    <X size={20} />
                  </motion.span>
                )}
              </AnimatePresence>

              {selected && !feedbackVisible && (
                <motion.div
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  className="absolute inset-x-0 bottom-0 h-1 origin-left bg-[#7A1025]"
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {submitError && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
          {submitError}
        </div>
      )}

      {submitting && (
        <p className="flex items-center gap-2 text-xs text-slate-400">
          <LoaderCircle size={14} className="animate-spin text-[#7A1025]" />
          Mengirim jawaban dan memeriksa hasil...
        </p>
      )}

      {feedbackVisible && result?.explanation && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[#7A1025]/10 bg-[#FBF8F6] p-4 sm:p-5"
        >
          <p className="flex items-center gap-2 text-sm font-bold text-[#7A1025]">
            <Lightbulb size={17} />
            Pembahasan
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {result.explanation}
          </p>
        </motion.div>
      )}

      {!feedbackVisible && !submitError && !submitting && (
        <p className="flex items-center gap-2 text-xs leading-5 text-slate-400">
          <Check size={14} className="text-[#7A1025]" />
          {serverGraded
            ? 'Jawaban akan diperiksa oleh server setelah dipilih.'
            : 'Pilih jawaban untuk melanjutkan challenge.'}
        </p>
      )}
    </div>
  );
}
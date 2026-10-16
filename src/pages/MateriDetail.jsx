import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ListTree,
  MessageCircle,
  Send,
  Sparkles,
  Trophy
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import Navbar from '../components/Navbar';
import { publicFetch } from '../lib/api';
import { quizApi } from '../lib/quiz.api.js';

const COLORS = {
  primary: '#7A1025',
  secondary: '#9B5265',
  accent: '#D4A017',
  background: '#FCF8F8',
  soft: '#FFF8F9',
  text: '#24191E',
  muted: '#817378',
  border: '#E9DDDF'
};

function getReadingTime(content, fallback) {
  const savedTime = Number(fallback);

  if (Number.isFinite(savedTime) && savedTime > 0) {
    return Math.ceil(savedTime);
  }

  const words = String(content || '').trim().split(/\s+/).filter(Boolean).length;

  return Math.max(1, Math.ceil(words / 200));
}

function parseContent(content) {
  const lines = String(content || '').replace(/\r/g, '').split('\n');
  const blocks = [];
  let paragraph = [];
  let list = [];
  let listType = null;

  const pushParagraph = () => {
    if (!paragraph.length) return;

    const value = paragraph.join(' ').trim();

    if (value) {
      blocks.push({ type: 'paragraph', content: value });
    }

    paragraph = [];
  };

  const pushList = () => {
    if (!list.length) return;

    blocks.push({ type: listType || 'list', items: [...list] });

    list = [];
    listType = null;
  };

  const getListType = (value) => {
    if (/^[-*]\s+/.test(value)) return 'list';
    if (/^\d+[.)]\s+/.test(value)) return 'orderedList';
    return null;
  };

  lines.forEach((line) => {
    const value = line.trim();

    if (!value) {
      pushParagraph();
      pushList();
      return;
    }

    const heading = value.match(/^(#{1,3})\s+(.+)$/);

    if (heading) {
      pushParagraph();
      pushList();
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        content: heading[2].trim()
      });
      return;
    }

    const currentListType = getListType(value);

    if (currentListType) {
      pushParagraph();

      if (listType && listType !== currentListType) {
        pushList();
      }

      listType = currentListType;

      const item = currentListType === 'orderedList'
        ? value.replace(/^\d+[.)]\s+/, '').trim()
        : value.replace(/^[-*]\s+/, '').trim();

      list.push(item);
      return;
    }

    pushList();
    paragraph.push(value);
  });

  pushParagraph();
  pushList();

  return blocks;
}

function renderInlineText(text) {
  const parts = String(text || '').split(/(\*\*.+?\*\*|__. +?__)/g);

  return parts.map((part, index) => {
    const isBold =
      (part.startsWith('**') && part.endsWith('**')) ||
      (part.startsWith('__') && part.endsWith('__'));

    if (isBold) {
      return (
        <strong key={index} className="font-semibold text-[#2B2025]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

function getQuestionStorageKey(slug) {
  return `nusa-material-questions-${slug}`;
}

function getErrorMessage(error, fallback) {
  return error?.data?.message || error?.message || fallback;
}

function normalizeMaterial(response) {
  return response?.data?.data ?? response?.data ?? response?.material ?? response ?? null;
}

function normalizeQuiz(response) {
  return response?.data?.quiz ?? response?.quiz ?? response?.data ?? response ?? null;
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Tanggal tidak tersedia';
  }

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function LoadingView() {
  return (
    <div className="min-h-screen bg-[#FCF8F8]">
      <Navbar />

      <main className="flex min-h-[70vh] items-center justify-center px-5">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#EBDCE0] border-t-[#7A1025]" />

          <p className="mt-4 text-sm font-medium text-[#514349]">
            Memuat materi pembelajaran...
          </p>

          <p className="mt-1 text-xs text-[#9A8B91]">
            Menyiapkan konten untukmu
          </p>
        </div>
      </main>
    </div>
  );
}

function ErrorView({ message }) {
  return (
    <div className="min-h-screen bg-[#FCF8F8]">
      <Navbar />

      <main className="mx-auto flex min-h-[75vh] max-w-3xl items-center px-5 py-16">
        <div className="w-full rounded-[28px] border border-[#EADDE0] bg-white p-8 text-center shadow-[0_18px_55px_rgba(70,30,40,0.05)] sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F8E9ED] text-[#7A1025]">
            <BookOpenCheck size={23} />
          </div>

          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-[#23181D]">
            Materi tidak ditemukan
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#817378]">
            {message || 'Materi yang kamu cari belum tersedia atau tidak dapat dimuat.'}
          </p>

          <Link
            to="/materi"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#7A1025] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#650D1F]"
          >
            <ArrowLeft size={15} />
            Kembali ke materi
          </Link>
        </div>
      </main>
    </div>
  );
}

function TableOfContents({ headings, activeSection, onSelect }) {
  if (!headings.length) return null;

  return (
    <section className="rounded-[22px] border border-[#E8DCDD] bg-white p-5 shadow-[0_14px_45px_rgba(71,31,42,0.025)]">
      <div className="flex items-center gap-2">
        <ListTree size={15} className="text-[#7A1025]" />

        <h2 className="text-[10px] font-bold uppercase tracking-[0.19em] text-[#9D8189]">
          Daftar isi
        </h2>
      </div>

      <div className="mt-4 space-y-1">
        {headings.map((section) => {
          const active = activeSection === section.id;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelect(section.id)}
              className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                active
                  ? 'bg-[#FBF0F2] text-[#7A1025]'
                  : 'text-[#766970] hover:bg-[#FCF8F8] hover:text-[#35292E]'
              }`}
            >
              <span className="flex items-start gap-3">
                <span className={`mt-0.5 text-[10px] font-bold ${active ? 'text-[#7A1025]' : 'text-[#B5A3A8]'}`}>
                  {String(section.number).padStart(2, '0')}
                </span>

                <span className="text-xs leading-5">
                  {section.label}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function QuizCard({ quiz, compact = false }) {
  if (!quiz?.id || quiz.status !== 'PUBLISHED') {
    return null;
  }

  const questionCount = Number(quiz.questionCount ?? quiz._count?.questions ?? 0);
  const passingScore = Number(quiz.passingScore ?? 80);
  const xpPerCorrect = Number(quiz.xpPerCorrect ?? 100);

  return (
    <div
      className={`relative overflow-hidden ${
        compact
          ? 'rounded-[22px] bg-[#7A1025] p-5 text-white'
          : 'rounded-[24px] border border-[#E8D5DA] bg-[#FFF8F9] p-6 sm:p-7'
      }`}
    >
      <div className={`absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl ${compact ? 'bg-white/10' : 'bg-[#F0CDD5]'}`} />

      <div className="relative">
        <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] ${compact ? 'text-white/70' : 'text-[#9B7580]'}`}>
          <Sparkles size={14} />
          Uji pemahaman
        </div>

        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h3 className={`text-xl font-semibold tracking-tight ${compact ? 'text-white' : 'text-[#291C21]'}`}>
              {quiz.title || 'Kuis pemahaman'}
            </h3>

            {quiz.description && (
              <p className={`mt-2 max-w-2xl text-sm leading-6 ${compact ? 'text-white/75' : 'text-[#796C72]'}`}>
                {quiz.description}
              </p>
            )}

            <div className={`mt-4 flex flex-wrap gap-2 text-xs ${compact ? 'text-white/75' : 'text-[#77666D]'}`}>
              <span className={`rounded-lg px-3 py-2 ${compact ? 'bg-white/10' : 'bg-white'}`}>
                {questionCount} soal
              </span>

              <span className={`rounded-lg px-3 py-2 ${compact ? 'bg-white/10' : 'bg-white'}`}>
                Min. {passingScore}%
              </span>

              <span className={`rounded-lg px-3 py-2 ${compact ? 'bg-white/10' : 'bg-white'}`}>
                +{xpPerCorrect} XP
              </span>
            </div>
          </div>

          <Link
            to={`/kuis/${encodeURIComponent(quiz.id)}`}
            className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${
              compact
                ? 'bg-white text-[#7A1025] hover:bg-[#FFF0F3]'
                : 'bg-[#7A1025] text-white hover:bg-[#650D1F]'
            }`}
          >
            Mulai kuis
            <ChevronRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MateriDetail() {
  const { slug } = useParams();

  const [material, setMaterial] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quizError, setQuizError] = useState('');

  const [progress, setProgress] = useState(0);
  const [activeSection, setActiveSection] = useState(null);

  const [question, setQuestion] = useState('');
  const [questions, setQuestions] = useState([]);
  const [questionError, setQuestionError] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadMaterial() {
      setLoading(true);
      setError('');
      setQuizError('');
      setMaterial(null);
      setQuiz(null);
      setProgress(0);
      setActiveSection(null);

      if (!slug) {
        setError('Alamat materi tidak valid.');
        setLoading(false);
        return;
      }

      try {
        const response = await publicFetch(`/materials/${encodeURIComponent(slug)}`);
        const result = normalizeMaterial(response);

        if (!active) return;

        if (!result || typeof result !== 'object' || !result.id) {
          throw new Error('Materi tidak ditemukan atau belum tersedia.');
        }

        setMaterial(result);

        /*
         * Quiz sekarang diambil dari endpoint publik quiz.
         * Kita cocokkan berdasarkan materialId agar MateriDetail
         * tidak bergantung pada relasi material.quiz.
         */
        try {
          const quizResponse = await quizApi.publicList({ page: 1, limit: 100 });
          const quizRecords = quizResponse?.data?.items ?? quizResponse?.items ?? [];

          const relatedQuiz = Array.isArray(quizRecords)
            ? quizRecords.find((item) => String(item.materialId) === String(result.id))
            : null;

          if (active) {
            setQuiz(relatedQuiz || null);
          }
        } catch (quizLoadError) {
          console.error('Gagal memuat quiz materi:', quizLoadError);

          if (active) {
            setQuiz(null);
            setQuizError('Kuis untuk materi ini belum dapat dimuat.');
          }
        }
      } catch (err) {
        console.error('Gagal memuat detail materi:', err);

        if (active) {
          setError(getErrorMessage(err, 'Gagal memuat materi.'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadMaterial();

    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug) {
      setQuestions([]);
      return;
    }

    try {
      const saved = localStorage.getItem(getQuestionStorageKey(slug));

      if (!saved) {
        setQuestions([]);
        return;
      }

      const parsed = JSON.parse(saved);

      setQuestions(
        Array.isArray(parsed)
          ? parsed.filter((item) => item && typeof item.id === 'string' && typeof item.question === 'string')
          : []
      );
    } catch (err) {
      console.error('Gagal membaca pertanyaan tersimpan:', err);
      setQuestions([]);
    }
  }, [slug]);

  const contentBlocks = useMemo(
    () => parseContent(material?.content),
    [material?.content]
  );

  const headings = useMemo(
    () => contentBlocks
      .map((block, index) => ({ ...block, originalIndex: index }))
      .filter((block) => block.type === 'heading')
      .map((block, index) => ({
        id: `section-${block.originalIndex}`,
        label: block.content,
        number: index + 1
      })),
    [contentBlocks]
  );

  const category =
    material?.categories?.[0]?.category?.name ||
    material?.categories?.[0]?.name ||
    material?.category?.name ||
    'Pembelajaran';

  const readingTime = getReadingTime(material?.content, material?.readTimeMinutes);
  const hasQuiz = Boolean(quiz?.id && quiz?.status === 'PUBLISHED');

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;

      ticking = true;

      window.requestAnimationFrame(() => {
        const documentHeight = document.documentElement.scrollHeight;
        const pageHeight = documentHeight - window.innerHeight;

        const currentProgress = pageHeight > 0
          ? (window.scrollY / pageHeight) * 100
          : 0;

        setProgress(Math.min(100, Math.max(0, currentProgress)));

        if (headings.length) {
          let current = headings[0].id;

          headings.forEach((section) => {
            const element = document.getElementById(section.id);

            if (element && element.getBoundingClientRect().top <= 170) {
              current = section.id;
            }
          });

          setActiveSection(current);
        } else {
          setActiveSection(null);
        }

        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [headings, material]);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);

    if (!element) return;

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  const submitQuestion = async (event) => {
    event.preventDefault();

    const cleanQuestion = question.trim();

    if (!cleanQuestion) {
      setQuestionError('Tulis pertanyaanmu terlebih dahulu.');
      return;
    }

    if (cleanQuestion.length < 10) {
      setQuestionError('Pertanyaan minimal 10 karakter agar lebih mudah dipahami.');
      return;
    }

    if (cleanQuestion.length > 500) {
      setQuestionError('Pertanyaan maksimal 500 karakter.');
      return;
    }

    if (!slug) {
      setQuestionError('Materi tidak valid.');
      return;
    }

    setQuestionError('');
    setSubmittingQuestion(true);

    try {
      const newQuestion = {
        id: typeof crypto?.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        question: cleanQuestion,
        createdAt: new Date().toISOString()
      };

      const nextQuestions = [newQuestion, ...questions];

      localStorage.setItem(
        getQuestionStorageKey(slug),
        JSON.stringify(nextQuestions)
      );

      setQuestions(nextQuestions);
      setQuestion('');
    } catch (err) {
      console.error('Gagal menyimpan pertanyaan:', err);
      setQuestionError('Pertanyaan belum berhasil disimpan. Periksa penyimpanan browser.');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  if (loading) {
    return <LoadingView />;
  }

  if (error || !material) {
    return <ErrorView message={error || 'Materi yang kamu cari belum tersedia.'} />;
  }

  return (
    <div className="min-h-screen bg-[#FCF8F8] text-[#24191E]">
      <Navbar />

      <div className="fixed inset-x-0 top-0 z-[70] h-[2px] bg-[#EFE5E6]">
        <motion.div
          className="h-full bg-[#7A1025]"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.15 }}
        />
      </div>

      <main className="mx-auto max-w-7xl px-5 pb-24 pt-24 sm:px-7 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <Link
            to="/materi"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#8A7A80] transition hover:text-[#7A1025]"
          >
            <ArrowLeft size={15} />
            Kembali ke materi
          </Link>

          <motion.header
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mt-8"
          >
            <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_240px]">
              <div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#9B7E87]">
                  <span>{category}</span>

                  <span className="h-1 w-1 rounded-full bg-[#D4A017]" />

                  <span className="inline-flex items-center gap-1.5 normal-case tracking-normal text-[#928388]">
                    <Clock3 size={13} />
                    {readingTime} menit membaca
                  </span>
                </div>

                <h1 className="mt-5 max-w-4xl text-[2.7rem] font-semibold leading-[1.03] tracking-[-0.055em] text-[#261A1F] sm:text-5xl lg:text-[4rem]">
                  {material.title}
                </h1>

                {(material.excerpt || material.description) && (
                  <p className="mt-5 max-w-3xl text-base leading-8 text-[#786A71] sm:text-[17px]">
                    {material.excerpt || material.description}
                  </p>
                )}
              </div>

              <div className="border-l border-[#E7DADC] pl-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A2868D]">
                  Progres membaca
                </p>

                <div className="mt-3 flex items-end gap-2">
                  <span className="text-3xl font-semibold tracking-[-0.05em] text-[#7A1025]">
                    {Math.round(progress)}%
                  </span>

                  <span className="pb-1 text-xs text-[#918286]">
                    selesai
                  </span>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#EEE5E5]">
                  <motion.div
                    className="h-full rounded-full bg-[#7A1025]"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.15 }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 h-px bg-[#E9DDDF]" />
          </motion.header>

          <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
            <article className="min-w-0">
              {material.coverImage && (
                <motion.figure
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.55 }}
                  className="overflow-hidden rounded-[24px] bg-[#F2E7E8]"
                >
                  <img
                    src={material.coverImage}
                    alt={material.title || 'Sampul materi'}
                    loading="eager"
                    className="block aspect-[16/8.5] w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                </motion.figure>
              )}

              <div className="mt-10 rounded-[24px] border border-[#E9DFE0] bg-white shadow-[0_16px_50px_rgba(71,31,42,0.035)]">
                <div className="px-6 py-8 sm:px-9 sm:py-10 lg:px-11 lg:py-12">
                  <div className="mb-10 border-b border-[#EEE5E4] pb-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A1848C]">
                      Materi pembelajaran
                    </p>

                    <p className="mt-2 text-sm leading-6 text-[#817378]">
                      Baca perlahan dan pahami konteksnya. Kamu tidak perlu terburu-buru menyelesaikannya.
                    </p>
                  </div>

                  {contentBlocks.length > 0 ? (
                    <div>
                      {contentBlocks.map((block, index) => {
                        if (block.type === 'heading') {
                          const sectionId = `section-${index}`;

                          return (
                            <section key={sectionId} id={sectionId} className="scroll-mt-28">
                              <h2 className={`max-w-3xl text-[1.65rem] font-semibold leading-tight tracking-[-0.035em] text-[#2A1E23] sm:text-[1.9rem] ${index === 0 ? 'mt-0' : 'mt-14 border-t border-[#EEE6E4] pt-12'}`}>
                                {block.content}
                              </h2>
                            </section>
                          );
                        }

                        if (block.type === 'list' || block.type === 'orderedList') {
                          const ListElement = block.type === 'orderedList' ? 'ol' : 'ul';

                          return (
                            <ListElement
                              key={`list-${index}`}
                              className={`my-7 max-w-3xl space-y-3 pl-6 text-[15px] leading-8 text-[#574A50] sm:text-[16px] ${block.type === 'orderedList' ? 'list-decimal' : 'list-disc'}`}
                            >
                              {block.items.map((item, itemIndex) => (
                                <li key={itemIndex} className="pl-2 marker:text-[#C58B98]">
                                  {renderInlineText(item)}
                                </li>
                              ))}
                            </ListElement>
                          );
                        }

                        return (
                          <p
                            key={`paragraph-${index}`}
                            className={`max-w-[760px] text-[15px] leading-8 text-[#574A50] sm:text-[16px] sm:leading-[1.95] ${index > 0 ? 'mt-6' : ''}`}
                          >
                            {renderInlineText(block.content)}
                          </p>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#E2D5D8] bg-[#FFFCFC] px-6 py-10 text-center">
                      <BookOpenCheck size={22} className="mx-auto text-[#B9949D]" />

                      <p className="mt-3 text-sm font-semibold text-[#514349]">
                        Konten materi belum tersedia
                      </p>

                      <p className="mt-1 text-xs leading-6 text-[#97898E]">
                        Silakan kembali lagi setelah materi diperbarui.
                      </p>
                    </div>
                  )}

                  {quizError && (
                    <div className="mt-10 rounded-2xl border border-[#E8D5DA] bg-[#FFF8F9] px-4 py-3 text-xs leading-5 text-[#8B6871]">
                      {quizError}
                    </div>
                  )}

                  {hasQuiz && (
                    <div className="mt-14 border-t border-[#EEE5E4] pt-10">
                      <QuizCard quiz={quiz} />
                    </div>
                  )}
                </div>
              </div>

              <section className="mt-10">
                <div className="mb-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A1848C]">
                    Tanya dan diskusi
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[#291C21] sm:text-3xl">
                    Masih ada yang ingin kamu pahami?
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-7 text-[#7F7177]">
                    Tulis pertanyaanmu berdasarkan materi ini. Pertanyaan disimpan di perangkat ini, bukan dikirim ke server atau ditampilkan kepada pengguna lain.
                  </p>
                </div>

                <form
                  onSubmit={submitQuestion}
                  className="rounded-[24px] border border-[#E8DCDD] bg-white p-5 shadow-[0_16px_50px_rgba(71,31,42,0.035)] sm:p-6"
                >
                  <label htmlFor="material-question" className="text-sm font-semibold text-[#30242A]">
                    Apa yang masih membingungkan?
                  </label>

                  <textarea
                    id="material-question"
                    value={question}
                    onChange={(event) => {
                      setQuestion(event.target.value);
                      setQuestionError('');
                    }}
                    rows={5}
                    minLength={10}
                    maxLength={500}
                    placeholder="Contoh: Saya masih bingung membedakan dua kondisi yang dijelaskan pada materi ini..."
                    className="mt-3 w-full resize-none rounded-[18px] border border-[#E6DCDD] bg-[#FFFCFC] px-4 py-4 text-sm leading-7 text-[#3A2E33] outline-none transition placeholder:text-[#B2A5A9] focus:border-[#B98794] focus:ring-4 focus:ring-[#F7E8EB]"
                  />

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div aria-live="polite">
                      {questionError ? (
                        <p className="text-xs font-medium text-[#A33E55]">
                          {questionError}
                        </p>
                      ) : (
                        <p className="text-xs text-[#9A8B91]">
                          {question.length}/500 karakter
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submittingQuestion}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7A1025] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#650D1F] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Send size={14} />
                      {submittingQuestion ? 'Menyimpan...' : 'Simpan pertanyaan'}
                    </button>
                  </div>
                </form>

                <div className="mt-6 space-y-4">
                  {questions.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-[#E2D5D8] bg-[#FFFDFD] px-6 py-10 text-center">
                      <MessageCircle size={20} className="mx-auto text-[#B9949D]" />

                      <p className="mt-3 text-sm font-medium text-[#514349]">
                        Belum ada pertanyaan.
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#97898E]">
                        Catat pertanyaan yang ingin kamu pelajari lebih lanjut.
                      </p>
                    </div>
                  ) : (
                    questions.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-[22px] border border-[#E8DCDD] bg-white p-5 shadow-[0_12px_35px_rgba(71,31,42,0.025)] sm:p-6"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A1848C]">
                              Pertanyaan pribadi
                            </p>

                            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#483B41]">
                              {item.question}
                            </p>
                          </div>

                          <MessageCircle size={16} className="mt-1 shrink-0 text-[#C4939D]" />
                        </div>

                        <div className="mt-4 flex items-center gap-2 border-t border-[#F0E7E7] pt-3">
                          <CheckCircle2 size={13} className="text-[#9B5265]" />

                          <p className="text-[10px] text-[#9B8D92]">
                            Disimpan di perangkat ini · {formatDate(item.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </article>

            <aside className="lg:sticky lg:top-24">
              <div className="space-y-5">
                <TableOfContents
                  headings={headings}
                  activeSection={activeSection}
                  onSelect={scrollToSection}
                />

                <section className="rounded-[22px] border border-[#E8DCDD] bg-white p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-[#9D8189]">
                    Informasi materi
                  </p>

                  <div className="mt-5 space-y-4">
                    <div>
                      <p className="text-xs text-[#998A8F]">Kategori</p>
                      <p className="mt-1 text-sm font-semibold text-[#34272D]">
                        {category}
                      </p>
                    </div>

                    <div className="border-t border-[#EEE5E4] pt-4">
                      <p className="text-xs text-[#998A8F]">Waktu baca</p>
                      <p className="mt-1 text-sm font-semibold text-[#34272D]">
                        Sekitar {readingTime} menit
                      </p>
                    </div>

                    <div className="border-t border-[#EEE5E4] pt-4">
                      <p className="text-xs text-[#998A8F]">Pertanyaan pribadi</p>
                      <p className="mt-1 text-sm font-semibold text-[#34272D]">
                        {questions.length}
                      </p>
                    </div>
                  </div>
                </section>

                {hasQuiz && (
                  <QuizCard quiz={quiz} compact />
                )}

                <Link
                  to="/materi"
                  className="flex items-center justify-center gap-2 rounded-[18px] border border-[#E8DCDD] bg-white px-4 py-3 text-sm font-semibold text-[#68565E] transition hover:border-[#D8BCC3] hover:text-[#7A1025]"
                >
                  <ArrowLeft size={14} />
                  Jelajahi materi lain
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Command,
  ExternalLink,
  Play,
  Search,
  Sparkles,
  X
} from 'lucide-react';

import Navbar from '../components/Navbar';
import { publicFetch } from '../lib/api';

const HERO_IMAGE = '/assets/img/video.png';
const VIDEO_PAGE_SIZE = 50;

const FILTERS = [
  'Semua',
  'Dasar',
  'Ibadah',
  'Haid',
  'Nifas',
  'Istihadhah'
];

const GROUP_CONFIG = [
  {
    id: 'awal',
    title: 'Learning Awal',
    subtitle: 'Bangun pemahaman dari dasar',
    description:
      'Mulai dengan konsep dasar haid, nifas, istihadhah, serta cara memahaminya dalam fikih.'
  },
  {
    id: 'lanjutan',
    title: 'Learning Lanjutan',
    subtitle: 'Perdalam persoalan yang lebih spesifik',
    description:
      'Lanjutkan ke topik ibadah dan situasi sehari-hari yang berkaitan dengan wanita haid.'
  }
];

const ease = [0.22, 1, 0.36, 1];

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease }
  }
};

const leftReveal = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease }
  }
};

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05
    }
  }
};

const getVideoId = video => video?.externalId || video?.youtubeId || null;

const getThumbnail = video => {
  if (video?.thumbnailUrl) return video.thumbnailUrl;

  const youtubeId = getVideoId(video);

  return youtubeId
    ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
    : '';
};

const getWatchUrl = video => {
  if (video?.url) return video.url;

  const youtubeId = getVideoId(video);

  return youtubeId
    ? `https://www.youtube.com/watch?v=${youtubeId}`
    : '#';
};

const getEmbedUrl = video => {
  const youtubeId = getVideoId(video);

  if (!youtubeId) return null;

  return `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&playsinline=1`;
};

const normalizeName = value => String(value || '').trim();

const getVideoLabels = video => {
  const categories = (video?.categories || [])
    .map(item => item?.category?.name || item?.name)
    .filter(Boolean);

  const tags = (video?.tags || [])
    .map(item => item?.tag?.name || item?.name)
    .filter(Boolean);

  return [...new Set([...categories, ...tags])];
};

const matchesFilter = (video, filter) => {
  if (filter === 'Semua') return true;

  const target = filter.toLowerCase();

  return getVideoLabels(video).some(
    label => normalizeName(label).toLowerCase() === target
  );
};

const matchesSearch = (video, query) => {
  const keyword = query.trim().toLowerCase();

  if (!keyword) return true;

  const searchableText = [
    video?.title,
    video?.description,
    video?.slug,
    ...getVideoLabels(video)
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return searchableText.includes(keyword);
};

const formatDuration = seconds => {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;

  const totalMinutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}j ${String(minutes).padStart(2, '0')}m`;
  }

  return `${totalMinutes}:${String(remainingSeconds).padStart(2, '0')}`;
};

const getPrimaryLabel = video => getVideoLabels(video)[0] || 'Kajian';

const getSourceLabel = video => {
  if (video?.author?.name) return video.author.name;
  if (video?.author?.email) return video.author.email;

  return 'Nusa Bot';
};

const sortVideos = videos =>
  [...videos].sort((a, b) => {
    if (Boolean(a?.isFeatured) !== Boolean(b?.isFeatured)) {
      return a?.isFeatured ? -1 : 1;
    }

    return (a?.order ?? 0) - (b?.order ?? 0);
  });

const buildGroups = videos => {
  const sortedVideos = sortVideos(videos);

  if (!sortedVideos.length) return [];

  const featuredVideos = sortedVideos.filter(video => video?.isFeatured);
  const regularVideos = sortedVideos.filter(video => !video?.isFeatured);

  if (featuredVideos.length && regularVideos.length) {
    return [
      {
        ...GROUP_CONFIG[0],
        videos: featuredVideos
      },
      {
        ...GROUP_CONFIG[1],
        videos: regularVideos
      }
    ];
  }

  const splitIndex = Math.max(1, Math.ceil(sortedVideos.length / 2));

  return [
    {
      ...GROUP_CONFIG[0],
      videos: sortedVideos.slice(0, splitIndex)
    },
    {
      ...GROUP_CONFIG[1],
      videos: sortedVideos.slice(splitIndex)
    }
  ].filter(group => group.videos.length);
};

function SectionBadge({ children, icon: Icon = Sparkles }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#E7D1D5] bg-white/75 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#7A1025] shadow-sm backdrop-blur-md sm:text-[10px]">
      <Icon size={12} />
      {children}
    </span>
  );
}

function VideoCard({ video, selected, onSelect, reduceMotion }) {
  const duration = formatDuration(video?.durationSeconds);

  return (
    <motion.button
      type="button"
      variants={reveal}
      onClick={() => onSelect(video)}
      whileHover={reduceMotion ? undefined : { y: -6 }}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      className="group w-[82vw] shrink-0 snap-center text-left sm:w-[58vw] md:w-auto"
    >
      <div
        className={`relative aspect-[1.68] overflow-hidden rounded-[18px] border bg-gray-100 transition-all duration-300 ${
          selected
            ? 'border-[#CBA9B0] shadow-[0_16px_35px_rgba(122,16,37,0.13)]'
            : 'border-white shadow-sm group-hover:border-[#E5D3D7] group-hover:shadow-lg'
        }`}
      >
        {getThumbnail(video) ? (
          <img
            src={getThumbnail(video)}
            alt={video?.title || 'Video pembelajaran'}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[#F7E7EA] text-[#7A1025]">
            <Play size={28} />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />

        <motion.div
          animate={
            selected && !reduceMotion
              ? { scale: [1, 1.07, 1] }
              : undefined
          }
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#7A1025] shadow-[0_8px_25px_rgba(0,0,0,0.2)] transition duration-300 group-hover:bg-[#7A1025] group-hover:text-white"
        >
          <Play size={15} fill="currentColor" />
        </motion.div>

        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-1 text-[8px] font-semibold text-white backdrop-blur-md">
          <Clock3 size={10} />
          {duration || 'YouTube'}
        </div>

        <div className="absolute right-2 top-2 max-w-[45%] truncate rounded-full bg-white/85 px-2 py-1 text-[8px] font-semibold text-[#7A1025] backdrop-blur-md">
          {getPrimaryLabel(video)}
        </div>

        {selected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute bottom-2 right-2 rounded-full bg-[#7A1025] px-2 py-1 text-[8px] font-semibold text-white"
          >
            Dipilih
          </motion.div>
        )}
      </div>

      <div className="mt-2.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 font-display text-sm font-bold leading-tight text-[#171115] transition-colors duration-300 group-hover:text-[#7A1025] sm:text-[15px]">
            {video?.title || 'Tanpa judul'}
          </h3>

          {video?.description && (
            <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-gray-500 sm:text-xs">
              {video.description}
            </p>
          )}

          <p className="mt-1.5 text-[9px] font-medium text-[#A15A69]">
            {getSourceLabel(video)}
          </p>
        </div>

        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
            selected
              ? 'bg-[#7A1025] text-white'
              : 'bg-[#F7E7EA] text-[#7A1025] group-hover:bg-[#7A1025] group-hover:text-white'
          }`}
        >
          <ArrowRight size={12} />
        </span>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <span
          className={`h-1 rounded-full transition-all duration-300 ${
            selected ? 'w-8 bg-[#7A1025]' : 'w-4 bg-[#E6D3D7]'
          }`}
        />
        <span className="h-1 w-1 rounded-full bg-[#E6D3D7]" />
        <span className="h-1 w-1 rounded-full bg-[#E6D3D7]" />
      </div>
    </motion.button>
  );
}

function VideoGroup({
  group,
  selectedVideo,
  onSelect,
  onMove,
  carouselRef,
  index,
  reduceMotion
}) {
  const total = group.videos.length;
  const canPrevious = index > 0;
  const canNext = index < total - 1;

  return (
    <section>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={reveal}
        className="mb-5 flex items-end justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7A1025] text-white shadow-sm">
              <Play size={11} fill="currentColor" />
            </span>

            <div>
              <h2 className="font-display text-lg font-bold text-[#171115] sm:text-xl">
                {group.title}
              </h2>

              <p className="text-[10px] text-gray-500 sm:text-xs">
                {group.subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelect(group.videos[0])}
            className="hidden text-[10px] font-semibold text-[#7A1025] sm:block sm:text-xs"
          >
            Lihat Awal
          </button>

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onMove(-1)}
              disabled={!canPrevious}
              aria-label={`Video sebelumnya di ${group.title}`}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E5D7DA] bg-white text-[#7A1025] transition hover:bg-[#F8E9EC] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronLeft size={14} />
            </button>

            <button
              type="button"
              onClick={() => onMove(1)}
              disabled={!canNext}
              aria-label={`Video berikutnya di ${group.title}`}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E5D7DA] bg-white text-[#7A1025] transition hover:bg-[#F8E9EC] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div
        ref={carouselRef}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.08 }}
        variants={stagger}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 scrollbar-none md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-4"
      >
        {group.videos.map(video => (
          <VideoCard
            key={video.id}
            video={video}
            selected={selectedVideo?.id === video.id}
            onSelect={onSelect}
            reduceMotion={reduceMotion}
          />
        ))}
      </motion.div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map(item => (
        <div key={item} className="animate-pulse">
          <div className="aspect-[1.68] rounded-[18px] bg-[#EDE3E0]" />
          <div className="mt-3 h-4 w-4/5 rounded bg-[#EDE3E0]" />
          <div className="mt-2 h-3 w-full rounded bg-[#EDE3E0]" />
          <div className="mt-2 h-3 w-2/5 rounded bg-[#EDE3E0]" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="mt-9 rounded-[22px] border border-[#E8D8DB] bg-white px-6 py-10 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F7E7EA] text-[#7A1025]">
        <X size={20} />
      </div>

      <h3 className="mt-4 font-display text-lg font-bold text-[#171115]">
        Video belum dapat dimuat
      </h3>

      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-gray-500">
        {message || 'Terjadi kesalahan saat mengambil data video dari server.'}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-xl bg-[#7A1025] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#650D1F]"
      >
        Coba Lagi
      </button>
    </div>
  );
}

function EmptyState({ searchQuery, filter }) {
  return (
    <div className="mt-9 rounded-[22px] border border-[#E8D8DB] bg-white px-6 py-12 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F7E7EA] text-[#7A1025]">
        <Search size={19} />
      </div>

      <h3 className="mt-4 font-display text-lg font-bold text-[#171115]">
        Video tidak ditemukan
      </h3>

      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-gray-500">
        {searchQuery
          ? `Tidak ada video yang cocok dengan pencarian "${searchQuery}".`
          : `Belum ada video yang tersedia untuk filter "${filter}".`}
      </p>
    </div>
  );
}

function SelectedVideo({ video, reduceMotion, onOpenPlayer }) {
  if (!video) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.section
        id="selected-video"
        key={video.id}
        initial={{ opacity: 0, y: 15, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.99 }}
        transition={{ duration: 0.35, ease }}
        className="relative mt-9 scroll-mt-24 overflow-hidden rounded-[24px] border border-[#E7D8DB] bg-white shadow-[0_18px_45px_rgba(65,25,35,0.07)]"
      >
        <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-[#7A1025]/5 blur-3xl" />

        <div className="relative grid md:grid-cols-[0.95fr_1.05fr]">
          <div className="relative aspect-video overflow-hidden md:aspect-auto">
            {getThumbnail(video) ? (
              <img
                src={getThumbnail(video)}
                alt={video.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[250px] items-center justify-center bg-[#F7E7EA] text-[#7A1025]">
                <Play size={32} />
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-r from-black/5 to-black/45" />

            <motion.div
              animate={
                reduceMotion
                  ? undefined
                  : { scale: [1, 1.05, 1] }
              }
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 blur-xl"
            />

            <button
              type="button"
              onClick={onOpenPlayer}
              aria-label={`Putar ${video.title}`}
              className="group absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#7A1025] shadow-[0_12px_35px_rgba(0,0,0,0.2)] transition duration-300 hover:scale-110 hover:bg-[#7A1025] hover:text-white"
            >
              <Play size={19} fill="currentColor" />
            </button>
          </div>

          <div className="flex items-center p-5 sm:p-7 lg:p-8">
            <div className="max-w-lg">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#F7E7EA] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.13em] text-[#7A1025]">
                  Selected Lesson
                </span>

                <span className="rounded-full bg-[#F8F3F1] px-2 py-1 text-[9px] font-medium text-gray-500">
                  {getPrimaryLabel(video)}
                </span>
              </div>

              <h2 className="mt-3 font-display text-2xl font-bold leading-tight text-[#171115] sm:text-3xl">
                {video.title}
              </h2>

              <p className="mt-2.5 text-xs leading-5 text-gray-500 sm:text-sm sm:leading-6">
                {video.description || 'Video pembelajaran pilihan Nusa Bot.'}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-gray-400">
                <span className="flex items-center gap-2">
                  <BookOpen size={12} />
                  {getSourceLabel(video)}
                </span>

                {formatDuration(video.durationSeconds) && (
                  <span className="flex items-center gap-2">
                    <Clock3 size={12} />
                    {formatDuration(video.durationSeconds)}
                  </span>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={onOpenPlayer}
                  className="group flex items-center gap-2 rounded-xl bg-[#7A1025] px-4 py-2.5 text-xs font-semibold text-white transition duration-300 hover:-translate-y-1 hover:bg-[#650D1F]"
                >
                  <Play size={14} fill="currentColor" />
                  Mulai Menonton
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </button>

                <a
                  href={getWatchUrl(video)}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-2 rounded-xl border border-[#E6D9DB] bg-[#FBF7F6] px-4 py-2.5 text-[10px] font-semibold text-[#7A1025] transition duration-300 hover:-translate-y-1 hover:bg-white"
                >
                  Buka YouTube
                  <ExternalLink
                    size={13}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    </AnimatePresence>
  );
}

function PlayerModal({ video, onClose }) {
  const embedUrl = getEmbedUrl(video);

  useEffect(() => {
    if (!video) return undefined;

    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [video, onClose]);

  useEffect(() => {
    if (!video) return undefined;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [video]);

  if (!video || !embedUrl) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        onMouseDown={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.94 }}
          transition={{ duration: 0.3, ease }}
          className="relative w-full max-w-4xl overflow-hidden rounded-[24px] bg-black shadow-2xl"
          onMouseDown={event => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup video"
            className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition duration-200 hover:bg-white hover:text-[#7A1025]"
          >
            <X size={17} />
          </button>

          <div className="aspect-video w-full">
            <iframe
              src={embedUrl}
              title={video.title}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>

          <div className="flex items-center justify-between gap-3 bg-white px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold text-[#171115]">
                {video.title}
              </p>

              <p className="text-[9px] text-gray-500">
                {getSourceLabel(video)}
              </p>
            </div>

            <a
              href={getWatchUrl(video)}
              target="_blank"
              rel="noreferrer"
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#7A1025] px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-[#650D1F]"
            >
              YouTube
              <ExternalLink size={12} />
            </a>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function VideoSearchPalette({
  open,
  query,
  results,
  activeIndex,
  inputRef,
  onQueryChange,
  onSelect,
  onClose
}) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[180] bg-black/30 p-4 backdrop-blur-sm"
        onMouseDown={onClose}
        role="presentation"
      >
        <div
          className="mx-auto mt-[10vh] w-full max-w-2xl"
          onMouseDown={event => event.stopPropagation()}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.22, ease }}
            className="overflow-hidden rounded-[22px] border border-[#E7D8DB] bg-white shadow-[0_30px_80px_rgba(60,20,30,0.18)]"
            role="dialog"
            aria-modal="true"
            aria-label="Pencarian video"
          >
            <div className="border-b border-gray-100 p-3">
              <div className="flex items-center gap-3 rounded-xl border border-[#E5D7DA] bg-[#FAF7F6] px-3">
                <Search size={16} className="shrink-0 text-gray-400" />

                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={event => onQueryChange(event.target.value)}
                  placeholder="Cari video, topik, atau pembahasan..."
                  className="h-12 min-w-0 flex-1 bg-transparent text-sm text-[#171115] outline-none placeholder:text-gray-400"
                  autoComplete="off"
                />

                <kbd className="hidden rounded-md border border-gray-200 bg-white px-2 py-1 text-[9px] font-semibold text-gray-400 sm:inline-flex">
                  ESC
                </kbd>
              </div>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-2">
              {results.length ? (
                <div className="space-y-1">
                  {results.map((video, index) => {
                    const labels = getVideoLabels(video);
                    const isActive = index === activeIndex;

                    return (
                      <button
                        key={video.id}
                        type="button"
                        onClick={() => onSelect(video)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                          isActive
                            ? 'bg-[#F7E7EA]'
                            : 'hover:bg-[#FAF7F6]'
                        }`}
                      >
                        <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-[#F2E9E7]">
                          {getThumbnail(video) ? (
                            <img
                              src={getThumbnail(video)}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[#7A1025]">
                              <Play size={16} />
                            </div>
                          )}

                          <div className="absolute inset-0 bg-black/10" />

                          <span className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#7A1025] shadow-sm">
                            <Play size={9} fill="currentColor" />
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-xs font-semibold text-[#171115]">
                            {video.title}
                          </p>

                          <p className="mt-1 line-clamp-1 text-[10px] text-gray-500">
                            {video.description ||
                              'Video pembelajaran Nusa Bot'}
                          </p>

                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {labels.slice(0, 2).map(label => (
                              <span
                                key={`${video.id}-${label}`}
                                className="rounded-full bg-[#F8F1F2] px-1.5 py-0.5 text-[8px] font-medium text-[#7A1025]"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        </div>

                        <ArrowRight
                          size={14}
                          className={`shrink-0 ${
                            isActive
                              ? 'text-[#7A1025]'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-6 py-10 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#F7E7EA] text-[#7A1025]">
                    <Search size={18} />
                  </div>

                  <p className="mt-3 text-sm font-semibold text-[#171115]">
                    Video tidak ditemukan
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Coba gunakan kata kunci lain.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 bg-[#FCFAF8] px-4 py-2.5">
              <div className="flex items-center gap-3 text-[9px] text-gray-400">
                <span>
                  <kbd className="mr-1 rounded border border-gray-200 bg-white px-1.5 py-0.5 font-semibold">
                    ↑
                  </kbd>
                  <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 font-semibold">
                    ↓
                  </kbd>{' '}
                  navigasi
                </span>

                <span>
                  <kbd className="mr-1 rounded border border-gray-200 bg-white px-1.5 py-0.5 font-semibold">
                    ↵
                  </kbd>{' '}
                  pilih
                </span>
              </div>

              <span className="hidden text-[9px] font-medium text-gray-400 sm:block">
                Nusa Bot Search
              </span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Video() {
  const reduceMotion = useReducedMotion();

  const [videos, setVideos] = useState([]);
  const [activeFilter, setActiveFilter] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchIndex, setSearchIndex] = useState(0);

  const searchInputRef = useRef(null);
  const carouselRefs = useRef({});

  const availableFilters = useMemo(() => {
    const labels = videos.flatMap(getVideoLabels);

    return [
      'Semua',
      ...FILTERS.filter(filter => filter !== 'Semua').filter(filter =>
        labels.some(
          label =>
            normalizeName(label).toLowerCase() === filter.toLowerCase()
        )
      )
    ];
  }, [videos]);

  const filteredVideos = useMemo(
    () =>
      videos.filter(
        video =>
          matchesFilter(video, activeFilter) &&
          matchesSearch(video, searchQuery)
      ),
    [videos, activeFilter, searchQuery]
  );

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return videos.slice(0, 8);
    }

    return videos
      .filter(video => matchesSearch(video, searchQuery))
      .slice(0, 8);
  }, [videos, searchQuery]);

  const groups = useMemo(
    () => buildGroups(filteredVideos),
    [filteredVideos]
  );

  const totalVideos = videos.length;

  const totalTopics = useMemo(() => {
    const labels = videos.flatMap(getVideoLabels);

    return new Set(
      labels.map(label => normalizeName(label).toLowerCase())
    ).size;
  }, [videos]);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await publicFetch(
        `/videos?page=1&limit=${VIDEO_PAGE_SIZE}`
      );

      const items =
        response?.data ||
        response?.videos ||
        response?.items ||
        [];

      const normalizedVideos = Array.isArray(items)
        ? items.filter(video => video?.id)
        : [];

      setVideos(normalizedVideos);

      setSelectedVideo(current => {
        if (!current) {
          return normalizedVideos[0] || null;
        }

        const freshVideo = normalizedVideos.find(
          video => video.id === current.id
        );

        return freshVideo || normalizedVideos[0] || null;
      });
    } catch (requestError) {
      console.error('Load public videos:', requestError);

      setVideos([]);
      setSelectedVideo(null);
      setError(
        requestError?.message ||
          'Gagal memuat video dari server.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFilterChange = useCallback(filter => {
    setActiveFilter(filter);
    setCarouselIndex({});

    window.setTimeout(() => {
      document
        .getElementById('library')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
    }, 50);
  }, []);

  const handleSelectVideo = useCallback(video => {
    if (!video) return;

    setSelectedVideo(video);

    window.setTimeout(() => {
      document
        .getElementById('selected-video')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
    }, 20);
  }, []);

  const handleOpenPlayer = useCallback(() => {
    if (selectedVideo) {
      setPlayerOpen(true);
    }
  }, [selectedVideo]);

  const handleClosePlayer = useCallback(() => {
    setPlayerOpen(false);
  }, []);

  const openSearch = useCallback(() => {
    setSearchIndex(0);
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  const moveCarousel = useCallback(
    (groupId, direction, total) => {
      const currentIndex = carouselIndex[groupId] || 0;

      const nextIndex = Math.min(
        Math.max(currentIndex + direction, 0),
        total - 1
      );

      setCarouselIndex(current => ({
        ...current,
        [groupId]: nextIndex
      }));

      const container = carouselRefs.current[groupId];

      if (!container) return;

      const card = container.children[nextIndex];

      card?.scrollIntoView({
        behavior: 'smooth',
        inline: 'start',
        block: 'nearest'
      });
    },
    [carouselIndex]
  );

  const registerCarouselRef = useCallback((groupId, node) => {
    carouselRefs.current[groupId] = node;
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  useEffect(() => {
    const handleKeyDown = event => {
      const isSearchShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'k';

      if (isSearchShortcut) {
        event.preventDefault();
        setSearchIndex(0);
        setSearchOpen(true);
        return;
      }

      if (!searchOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        setSearchOpen(false);
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();

        setSearchIndex(current =>
          Math.min(
            current + 1,
            Math.max(searchResults.length - 1, 0)
          )
        );

        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();

        setSearchIndex(current =>
          Math.max(current - 1, 0)
        );

        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();

        const video = searchResults[searchIndex];

        if (!video) return;

        handleSelectVideo(video);
        setSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    searchOpen,
    searchResults,
    searchIndex,
    handleSelectVideo
  ]);

  useEffect(() => {
    if (!searchOpen) return undefined;

    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 40);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchOpen]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FBF8F6] text-[#171115] selection:bg-[#7A1025] selection:text-white">
      <Navbar />

      <main>
        <section className="relative isolate min-h-[calc(100svh-68px)] overflow-hidden pt-[68px]">
          <img
            src={HERO_IMAGE}
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
          />

          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#FBF8F6] via-[#FBF8F6]/90 to-[#FBF8F6]/35 md:from-[#FBF8F6] md:via-[#FBF8F6]/82 md:to-transparent" />

          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#FBF8F6] via-transparent to-transparent" />

          <motion.div
            animate={
              reduceMotion
                ? undefined
                : {
                    x: [0, 10, 0],
                    y: [0, -8, 0],
                    scale: [1, 1.05, 1]
                  }
            }
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className="absolute right-[8%] top-[16%] h-32 w-32 rounded-full bg-white/30 blur-3xl"
          />

          <motion.div
            animate={
              reduceMotion
                ? undefined
                : {
                    x: [0, -8, 0],
                    y: [0, 8, 0]
                  }
            }
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className="absolute bottom-[20%] right-[35%] h-20 w-20 rounded-full bg-[#7A1025]/10 blur-3xl"
          />

          <div className="relative mx-auto flex min-h-[calc(100svh-68px)] max-w-7xl items-center px-4 py-10 sm:px-6 md:px-8">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="relative z-10 max-w-[610px]"
            >
              <motion.div
                variants={reveal}
                className="mb-5 flex items-center gap-2 text-[10px] font-semibold text-gray-500 sm:text-xs"
              >
                <span>Home</span>
                <span className="text-[#7A1025]/40">/</span>
                <span className="text-[#7A1025]">
                  Video Pembelajaran
                </span>
              </motion.div>

              <motion.div variants={reveal}>
                <SectionBadge>
                  Interactive Learning Library
                </SectionBadge>
              </motion.div>

              <motion.h1
                variants={reveal}
                className="mt-4 font-display text-4xl font-bold leading-[0.95] tracking-tight text-[#151113] sm:text-5xl lg:text-[60px]"
              >
                Pembelajaran
                <br />
                <span className="text-[#7A1025]">
                  Nusa Bot.
                </span>
              </motion.h1>

              <motion.p
                variants={reveal}
                className="mt-5 max-w-[540px] text-sm leading-6 text-gray-600 sm:text-[15px]"
              >
                Temukan video tentang haid, menstruasi, nifas,
                dan istihadhah dari berbagai kajian fikih. Pilih
                topik, tonton, lalu lanjutkan ke pembahasan berikutnya.
              </motion.p>

              <motion.div
                variants={reveal}
                className="mt-6 flex flex-wrap gap-2.5"
              >
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById('library')
                      ?.scrollIntoView({
                        behavior: 'smooth'
                      })
                  }
                  className="group flex items-center gap-2 rounded-2xl bg-[#7A1025] px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-[#7A1025]/15 transition duration-300 hover:-translate-y-1 hover:bg-[#650D1F] hover:shadow-xl sm:text-sm"
                >
                  <Play size={15} fill="currentColor" />
                  Jelajahi Video
                  <ArrowRight
                    size={15}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </button>

                <button
                  type="button"
                  onClick={() => handleFilterChange('Haid')}
                  disabled={!availableFilters.includes('Haid')}
                  className="flex items-center gap-2 rounded-2xl border border-white/80 bg-white/70 px-4 py-2.5 text-xs font-medium text-gray-600 shadow-sm backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                >
                  <BookOpen size={14} />
                  Fokus Haid
                </button>
              </motion.div>

              <motion.div
                variants={reveal}
                className="mt-7 grid max-w-[420px] grid-cols-2 gap-3 sm:grid-cols-3"
              >
                <div className="rounded-2xl border border-white/80 bg-white/65 px-4 py-3 shadow-sm backdrop-blur-md">
                  <p className="font-display text-2xl font-bold text-[#7A1025]">
                    {totalVideos}
                  </p>

                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-gray-500">
                    Video
                  </p>
                </div>

                <div className="rounded-2xl border border-white/80 bg-white/65 px-4 py-3 shadow-sm backdrop-blur-md">
                  <p className="font-display text-2xl font-bold text-[#7A1025]">
                    {String(totalTopics).padStart(2, '0')}
                  </p>

                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-gray-500">
                    Topik
                  </p>
                </div>

                <div className="col-span-2 rounded-2xl border border-white/80 bg-white/65 px-4 py-3 shadow-sm backdrop-blur-md sm:col-span-1">
                  <p className="font-display text-2xl font-bold text-[#7A1025]">
                    02
                  </p>

                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-gray-500">
                    Learning Path
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section
          id="library"
          className="scroll-mt-20 border-b border-[#EEE2DE] bg-[#FCF9F7]"
        >
          <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 md:px-8 md:py-12">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={leftReveal}
              className="max-w-2xl"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="h-0.5 w-7 rounded-full bg-[#7A1025]" />

                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#7A1025]">
                  Video Library
                </span>
              </div>

              <h2 className="font-display text-3xl font-bold leading-[1.02] tracking-tight sm:text-4xl">
                Belajar lewat kajian yang relevan.
              </h2>

              <p className="mt-3 max-w-xl text-xs leading-6 text-gray-500 sm:text-sm">
                Materi disusun berdasarkan topik agar kamu dapat
                memilih pembahasan sesuai kebutuhan.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              variants={reveal}
              className="mt-6 flex flex-col gap-3 md:flex-row md:items-center"
            >
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {availableFilters.map(filter => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => handleFilterChange(filter)}
                    className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-semibold transition-all duration-300 sm:text-xs ${
                      activeFilter === filter
                        ? 'bg-[#7A1025] text-white shadow-lg shadow-[#7A1025]/15'
                        : 'border border-[#E5D7DA] bg-white text-gray-500 hover:border-[#D0B0B7] hover:text-[#7A1025]'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={openSearch}
                className="group flex h-9 w-full items-center gap-2 rounded-lg border border-[#E5D7DA] bg-white px-3 text-left shadow-sm transition hover:border-[#D0B0B7] hover:bg-[#FCFAF8] md:ml-auto md:w-[240px]"
              >
                <Search
                  size={14}
                  className="shrink-0 text-gray-400 transition-colors group-hover:text-[#7A1025]"
                />

                <span className="flex-1 text-[10px] text-gray-400 sm:text-xs">
                  Cari video...
                </span>

                <kbd className="hidden items-center gap-0.5 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[8px] font-semibold text-gray-400 sm:inline-flex">
                  <Command size={9} />
                  K
                </kbd>
              </button>
            </motion.div>

            {loading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState
                message={error}
                onRetry={loadVideos}
              />
            ) : !filteredVideos.length ? (
              <EmptyState
                searchQuery={searchQuery}
                filter={activeFilter}
              />
            ) : (
              <>
                <div className="mt-9 space-y-10">
                  {groups.map(group => (
                    <VideoGroup
                      key={group.id}
                      group={group}
                      selectedVideo={selectedVideo}
                      onSelect={handleSelectVideo}
                      index={carouselIndex[group.id] || 0}
                      onMove={direction =>
                        moveCarousel(
                          group.id,
                          direction,
                          group.videos.length
                        )
                      }
                      carouselRef={node =>
                        registerCarouselRef(group.id, node)
                      }
                      reduceMotion={reduceMotion}
                    />
                  ))}
                </div>

                <SelectedVideo
                  video={selectedVideo}
                  reduceMotion={reduceMotion}
                  onOpenPlayer={handleOpenPlayer}
                />
              </>
            )}
          </div>
        </section>

        <section className="relative overflow-hidden border-t border-[#EEE2DE] bg-[#F7F2EF]">
          <motion.div
            animate={
              reduceMotion
                ? undefined
                : {
                    x: [0, 12, 0],
                    y: [0, -7, 0]
                  }
            }
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className="absolute -left-16 top-0 h-40 w-40 rounded-full bg-[#7A1025]/5 blur-3xl"
          />

          <motion.div
            animate={
              reduceMotion
                ? undefined
                : {
                    x: [0, -10, 0],
                    y: [0, 8, 0]
                  }
            }
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className="absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-[#7A1025]/5 blur-3xl"
          />

          <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:px-8 md:py-12">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={reveal}
              className="mx-auto max-w-2xl text-center"
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#7A1025] shadow-sm">
                <Sparkles size={11} />
                Learn Differently
              </span>

              <h2 className="mt-3 font-display text-2xl font-bold leading-tight sm:text-3xl">
                Tonton, pahami, lanjutkan.
              </h2>

              <p className="mt-2.5 text-xs leading-5 text-gray-500 sm:text-sm sm:leading-6">
                Pilih pembahasan yang paling sesuai dengan kebutuhanmu
                dan lanjutkan belajar melalui sumber video yang tersedia.
              </p>

              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById('library')
                    ?.scrollIntoView({
                      behavior: 'smooth'
                    })
                }
                className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-[#7A1025] px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-[#7A1025]/15 transition duration-300 hover:-translate-y-1 hover:bg-[#650D1F]"
              >
                Kembali ke Video
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:-translate-y-0.5"
                />
              </button>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 text-[10px] text-gray-500 sm:px-6 sm:text-xs md:flex-row md:items-center md:justify-between md:px-8">
          <span>© 2026 Nusa Bot. Sahabat Belajar Ibadah.</span>
          <span>Literasi Fiqih • Video Pembelajaran</span>
        </div>
      </footer>

      <AnimatePresence>
        {playerOpen && (
          <PlayerModal
            video={selectedVideo}
            onClose={handleClosePlayer}
          />
        )}
      </AnimatePresence>

      <VideoSearchPalette
        open={searchOpen}
        query={searchQuery}
        results={searchResults}
        activeIndex={searchIndex}
        inputRef={searchInputRef}
        onQueryChange={value => {
          setSearchQuery(value);
          setSearchIndex(0);
        }}
        onSelect={video => {
          handleSelectVideo(video);
          setSearchOpen(false);
        }}
        onClose={closeSearch}
      />
    </div>
  );
}
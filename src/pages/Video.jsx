import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, BookOpen, Check, ChevronRight, CircleAlert, Clock3,
  ExternalLink, Film, LoaderCircle, Play, RefreshCw, Search,
  SlidersHorizontal, Sparkles, Video as VideoIcon, X
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { publicFetch } from '../lib/api';

const VIDEO_ENDPOINT = '/videos?page=1&limit=50';

const BASE_FILTERS = ['Dasar', 'Ibadah', 'Haid', 'Nifas', 'Istihadhah'];

const CATEGORY_ALIASES = {
  Dasar: ['dasar', 'pengenalan', 'konsep', 'awal'],
  Ibadah: ['ibadah', 'salat', 'sholat', 'puasa', 'thaharah', 'bersuci'],
  Haid: ['haid', 'menstruasi'],
  Nifas: ['nifas', 'melahirkan'],
  Istihadhah: ['istihadhah', 'istihadah']
};

const EASE = [0.22, 1, 0.36, 1];

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function extractVideos(response) {
  const candidates = [
    response?.data?.items,
    response?.data?.data?.items,
    response?.data?.videos,
    response?.data?.results,
    response?.items,
    response?.videos,
    response?.results,
    response?.data,
    response
  ];

  return candidates.find(Array.isArray) || [];
}

function getYouTubeId(video) {
  const externalId = String(video?.externalId || video?.youtubeId || '').trim();

  if (/^[A-Za-z0-9_-]{11}$/.test(externalId)) {
    return externalId;
  }

  const source = video?.url || externalId;

  if (!source) return null;

  try {
    const url = new URL(
      /^https?:\/\//i.test(source) ? source : `https://${source}`
    );

    const host = url.hostname.toLowerCase();
    let id = null;

    if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
      id = url.pathname.split('/').filter(Boolean)[0];
    } else if (host.includes('youtube.com')) {
      id = url.searchParams.get('v');

      if (!id) {
        id = url.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)?.[1];
      }
    }

    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function getThumbnail(video) {
  if (video?.thumbnailUrl) return video.thumbnailUrl;

  const id = getYouTubeId(video);

  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

function getWatchUrl(video) {
  const id = getYouTubeId(video);

  if (id) return `https://www.youtube.com/watch?v=${id}`;

  return video?.url || '#';
}

function getEmbedUrl(video) {
  const id = getYouTubeId(video);

  return id
    ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`
    : null;
}

function getVideoLabels(video) {
  const categories = (Array.isArray(video?.categories) ? video.categories : [])
    .map(item => item?.category?.name || item?.name || item?.categoryName)
    .filter(Boolean);

  const tags = (Array.isArray(video?.tags) ? video.tags : [])
    .map(item => item?.tag?.name || item?.name)
    .filter(Boolean);

  return [...new Set([...categories, ...tags].map(String))];
}

function getPrimaryLabel(video) {
  return getVideoLabels(video)[0] || 'Video pembelajaran';
}

function getDuration(seconds) {
  const value = Number(seconds);

  if (!Number.isFinite(value) || value <= 0) return null;

  const total = Math.floor(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function matchesCategory(video, filter) {
  if (filter === 'Semua') return true;

  const labels = getVideoLabels(video);
  const searchableText = normalizeText([
    video?.title,
    video?.description,
    video?.slug,
    ...labels
  ].filter(Boolean).join(' '));

  const aliases = CATEGORY_ALIASES[filter];

  if (aliases) {
    return aliases.some(alias => searchableText.includes(normalizeText(alias)));
  }

  return labels.some(label => normalizeText(label) === normalizeText(filter));
}

function matchesSearch(video, search) {
  const query = normalizeText(search);

  if (!query) return true;

  const searchableText = normalizeText([
    video?.title,
    video?.description,
    video?.slug,
    ...getVideoLabels(video)
  ].filter(Boolean).join(' '));

  return searchableText.includes(query);
}

function getErrorMessage(error) {
  if (error?.status === 404) {
    return 'Endpoint video tidak ditemukan. Periksa rute API publik /videos di backend.';
  }

  if (error?.status === 401 || error?.status === 403) {
    return 'Server menolak permintaan video. Periksa konfigurasi akses endpoint publik.';
  }

  return error?.message || 'Terjadi kesalahan saat mengambil video dari server.';
}

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.19em] text-[#9B5265]">
            {eyebrow}
          </p>
        )}

        <h2 className="font-display text-xl font-bold tracking-tight text-[#21171A] sm:text-2xl">
          {title}
        </h2>

        {description && (
          <p className="mt-1.5 max-w-xl text-xs leading-5 text-slate-500 sm:text-sm">
            {description}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}

function VideoCard({ video, index, onPlay, reduceMotion }) {
  const thumbnail = getThumbnail(video);
  const duration = getDuration(video?.durationSeconds);

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.035, 0.2), ease: EASE }}
      className="group min-w-0"
    >
      <button
        type="button"
        onClick={() => onPlay(video)}
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#9B5265]/20"
        aria-label={`Putar video ${video?.title || ''}`}
      >
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-[#6B1830] to-[#BD7E8C] shadow-sm transition duration-300 group-hover:shadow-lg">
          {thumbnail && (
            <img
              src={thumbnail}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
              onError={event => {
                event.currentTarget.style.display = 'none';
              }}
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />

          <span className="absolute left-3 top-3 max-w-[75%] truncate rounded-full bg-black/35 px-2.5 py-1 text-[9px] font-semibold text-white backdrop-blur-md">
            {getPrimaryLabel(video)}
          </span>

          {duration && (
            <span className="absolute bottom-3 right-3 rounded-md bg-black/75 px-1.5 py-1 text-[10px] font-semibold text-white">
              {duration}
            </span>
          )}

          <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#7A1025] shadow-lg transition duration-300 group-hover:scale-110 group-hover:bg-[#7A1025] group-hover:text-white">
            <Play size={17} fill="currentColor" />
          </span>
        </div>
      </button>

      <div className="mt-3 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F6E5E8] text-[#7A1025]">
          <BookOpen size={16} />
        </div>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onPlay(video)}
            className="line-clamp-2 w-full text-left text-sm font-bold leading-5 text-[#21171A] transition hover:text-[#7A1025] focus-visible:outline-none"
          >
            {video?.title || 'Video pembelajaran'}
          </button>

          {video?.description && (
            <p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-slate-500">
              {video.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400">
            {video?.isFeatured && (
              <span className="inline-flex items-center gap-1 font-semibold text-[#9B5265]">
                <Sparkles size={11} />
                Pilihan
              </span>
            )}

            <span>Video pembelajaran</span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function VideoSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-video rounded-2xl bg-[#EDE2E0]" />

      <div className="mt-3 flex gap-3">
        <div className="h-9 w-9 rounded-xl bg-[#EDE2E0]" />

        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 w-4/5 rounded bg-[#EDE2E0]" />
          <div className="h-3 w-2/3 rounded bg-[#EDE2E0]" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ search, filter, onReset }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#E5D6D8] bg-white px-5 py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F6E5E8] text-[#7A1025]">
        <Search size={23} />
      </div>

      <h3 className="mt-5 text-base font-bold text-[#21171A]">
        {search ? 'Video tidak ditemukan' : 'Belum ada video di kategori ini'}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-slate-500">
        {search
          ? `Tidak ada video yang cocok dengan pencarian "${search}".`
          : `Belum ada video yang sesuai dengan filter "${filter}".`}
      </p>

      {(search || filter !== 'Semua') && (
        <button
          type="button"
          onClick={onReset}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#7A1025] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#650D1F]"
        >
          Hapus filter
        </button>
      )}
    </div>
  );
}

function VideoPlayer({ video, onClose }) {
  const embedUrl = getEmbedUrl(video);
  const watchUrl = getWatchUrl(video);

  useEffect(() => {
    if (!video) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = event => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [video, onClose]);

  if (!video) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={video.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
        onMouseDown={onClose}
        role="presentation"
      >
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="w-full max-w-5xl overflow-hidden rounded-2xl bg-[#171115] shadow-2xl sm:rounded-3xl"
          onMouseDown={event => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={`Pemutar video ${video.title}`}
        >
          <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{video.title}</p>
              <p className="mt-1 text-[10px] text-white/50">Nusa Bot · Video Pembelajaran</p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pemutar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
            >
              <X size={17} />
            </button>
          </div>

          <div className="relative aspect-video bg-black">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={video.title}
                className="absolute inset-0 h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center text-white">
                <Film size={35} className="text-white/50" />
                <p className="mt-4 text-sm font-semibold">Video tidak dapat diputar di dalam aplikasi</p>
                <p className="mt-2 text-xs text-white/50">Buka tautan sumber untuk menonton video.</p>

                <a
                  href={watchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-[#7A1025]"
                >
                  Buka sumber video <ExternalLink size={14} />
                </a>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#D6AAB5]">
                {getPrimaryLabel(video)}
              </p>

              {video.description && (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/65">
                  {video.description}
                </p>
              )}
            </div>

            <a
              href={watchUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              YouTube <ExternalLink size={13} />
            </a>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function FeaturedVideo({ video, onPlay }) {
  const thumbnail = getThumbnail(video);

  return (
    <section className="relative isolate overflow-hidden rounded-[26px] bg-[#281018] text-white shadow-[0_20px_55px_rgba(70,20,35,0.15)]">
      {thumbnail && (
        <img
          src={thumbnail}
          alt=""
          className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-35"
          onError={event => {
            event.currentTarget.style.display = 'none';
          }}
        />
      )}

      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#281018] via-[#401522]/95 to-[#401522]/45" />

      <div className="absolute -right-24 -top-32 -z-10 h-80 w-80 rounded-full bg-[#9B5265]/30 blur-3xl" />

      <div className="grid items-center gap-7 p-5 sm:p-8 md:grid-cols-[1fr_0.85fr] md:gap-10 md:p-10">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white/90 backdrop-blur-md">
            <Sparkles size={12} />
            Video pilihan
          </span>

          <h2 className="mt-5 font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
            {video?.title || 'Belajar fikih dengan lebih mudah'}
          </h2>

          <p className="mt-3 line-clamp-3 max-w-lg text-xs leading-6 text-white/70 sm:text-sm">
            {video?.description || 'Jelajahi koleksi video pembelajaran Nusa Bot untuk memahami fikih haid, nifas, istihadhah, dan ketentuan ibadah.'}
          </p>

          {video && (
            <div className="mt-5 flex flex-wrap items-center gap-3 text-[10px] text-white/60">
              <span className="inline-flex items-center gap-1.5">
                <BookOpen size={13} />
                {getPrimaryLabel(video)}
              </span>

              {getDuration(video.durationSeconds) && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 size={13} />
                  {getDuration(video.durationSeconds)}
                </span>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => video && onPlay(video)}
              disabled={!video}
              className="inline-flex items-center gap-2.5 rounded-xl bg-white px-5 py-3 text-xs font-bold text-[#7A1025] transition hover:-translate-y-0.5 hover:bg-[#F6E5E8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play size={15} fill="currentColor" />
              Putar video
            </button>

            {video && (
              <a
                href={getWatchUrl(video)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                Buka YouTube <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => video && onPlay(video)}
          disabled={!video}
          aria-label={`Putar video ${video?.title || 'pilihan'}`}
          className="group relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl disabled:cursor-default"
        >
          {thumbnail && (
            <img
              src={thumbnail}
              alt=""
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              onError={event => {
                event.currentTarget.style.display = 'none';
              }}
            />
          )}

          <div className="absolute inset-0 bg-black/15 transition group-hover:bg-black/5" />

          <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#7A1025] shadow-xl transition duration-300 group-hover:scale-110">
            <Play size={20} fill="currentColor" />
          </span>

          {!thumbnail && (
            <span className="absolute inset-0 flex items-center justify-center text-white/70">
              <VideoIcon size={35} />
            </span>
          )}
        </button>
      </div>
    </section>
  );
}

export default function Video() {
  const reduceMotion = useReducedMotion();

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('Semua');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);

  const loadVideos = useCallback(async signal => {
    setLoading(true);
    setError('');

    try {
      const response = await publicFetch(VIDEO_ENDPOINT, { signal });

      if (signal?.aborted) return;

      const items = extractVideos(response);

      const normalizedVideos = items
        .filter(video => video && video.id)
        .map(video => ({
          ...video,
          title: video.title || 'Video pembelajaran',
          description: video.description || '',
          thumbnailUrl: video.thumbnailUrl || null,
          isFeatured: Boolean(video.isFeatured),
          order: Number(video.order) || 0
        }))
        .sort((a, b) => {
          if (a.isFeatured !== b.isFeatured) {
            return a.isFeatured ? -1 : 1;
          }

          return a.order - b.order;
        });

      setVideos(normalizedVideos);
    } catch (requestError) {
      if (signal?.aborted) return;

      console.error('Nusa Bot public videos:', requestError);
      setVideos([]);
      setError(getErrorMessage(requestError));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadVideos(controller.signal);

    return () => controller.abort();
  }, [loadVideos]);

  const filters = useMemo(() => {
    const dynamicFilters = videos
      .flatMap(getVideoLabels)
      .filter(Boolean);

    const uniqueFilters = new Map();

    [...BASE_FILTERS, ...dynamicFilters].forEach(label => {
      const key = normalizeText(label);

      if (
        key &&
        !uniqueFilters.has(key) &&
        !BASE_FILTERS.some(base => normalizeText(base) === key && uniqueFilters.has(key))
      ) {
        uniqueFilters.set(key, String(label).trim());
      }
    });

    return ['Semua', ...uniqueFilters.values()];
  }, [videos]);

  const filteredVideos = useMemo(
    () => videos.filter(video => matchesCategory(video, activeFilter) && matchesSearch(video, search)),
    [videos, activeFilter, search]
  );

  const featuredVideo = useMemo(() => {
    if (selectedVideo && filteredVideos.some(video => video.id === selectedVideo.id)) {
      return selectedVideo;
    }

    return filteredVideos.find(video => video.isFeatured) || filteredVideos[0] || null;
  }, [filteredVideos, selectedVideo]);

  useEffect(() => {
    if (!filteredVideos.length) {
      setSelectedVideo(null);
      return;
    }

    setSelectedVideo(current => {
      if (current && filteredVideos.some(video => video.id === current.id)) {
        return current;
      }

      return filteredVideos.find(video => video.isFeatured) || filteredVideos[0];
    });
  }, [filteredVideos]);

  const visibleVideos = useMemo(
    () => featuredVideo
      ? filteredVideos.filter(video => video.id !== featuredVideo.id)
      : filteredVideos,
    [filteredVideos, featuredVideo]
  );

  const topicCount = useMemo(
    () => new Set(videos.flatMap(getVideoLabels).map(normalizeText).filter(Boolean)).size,
    [videos]
  );

  const playVideo = useCallback(video => {
    if (!video) return;

    setSelectedVideo(video);

    if (!getEmbedUrl(video)) {
      const watchUrl = getWatchUrl(video);

      if (watchUrl !== '#') {
        window.open(watchUrl, '_blank', 'noopener,noreferrer');
      }

      return;
    }

    setPlayingVideo(video);
  }, []);

  const closePlayer = useCallback(() => setPlayingVideo(null), []);

  function resetFilters() {
    setSearch('');
    setActiveFilter('Semua');
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FBF8F6] text-[#21171A] selection:bg-[#7A1025] selection:text-white">
      <Navbar />

      <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-7 sm:px-6 sm:pt-10 lg:px-10">
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end"
        >
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#E8D6D9] bg-white px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.17em] text-[#7A1025] shadow-sm">
              <Film size={12} />
              Nusa Bot · Video Library
            </div>

            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-[#21171A] sm:text-4xl lg:text-5xl">
              Belajar lewat video,
              <span className="block text-[#9B5265]">pahami lebih dalam.</span>
            </h1>

            <p className="mt-3 max-w-2xl text-xs leading-6 text-slate-500 sm:text-sm">
              Jelajahi video pembelajaran tentang fikih haid, nifas, istihadhah,
              serta ketentuan ibadah dengan alur belajar yang lebih mudah.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-2">
                <VideoIcon size={15} className="text-[#9B5265]" />
                <strong className="text-[#21171A]">{loading ? '...' : videos.length}</strong>
                video tersedia
              </span>

              <span className="h-1 w-1 rounded-full bg-[#D7BBC1]" />

              <span className="inline-flex items-center gap-2">
                <BookOpen size={15} className="text-[#9B5265]" />
                <strong className="text-[#21171A]">{loading ? '...' : topicCount}</strong>
                topik
              </span>
            </div>
          </div>

          <form
            onSubmit={event => event.preventDefault()}
            role="search"
            className="flex w-full items-center gap-2 rounded-2xl border border-[#E7D9D9] bg-white p-2 shadow-sm transition focus-within:border-[#B98391] focus-within:ring-4 focus-within:ring-[#9B5265]/10 lg:max-w-md"
          >
            <Search size={17} className="ml-2 shrink-0 text-slate-400" />

            <input
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Cari video atau topik..."
              aria-label="Cari video"
              className="h-10 min-w-0 flex-1 bg-transparent text-xs text-[#21171A] outline-none placeholder:text-slate-400 sm:text-sm"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Hapus pencarian"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-[#F6E5E8] hover:text-[#7A1025]"
              >
                <X size={15} />
              </button>
            )}

            <button
              type="submit"
              className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[#7A1025] px-4 text-xs font-semibold text-white transition hover:bg-[#650D1F]"
            >
              Cari <ArrowRight size={13} />
            </button>
          </form>
        </motion.section>

        {error && (
          <section className="mb-7 flex flex-col justify-between gap-4 rounded-2xl border border-rose-200 bg-white p-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <CircleAlert size={19} />
              </div>

              <div>
                <h2 className="text-sm font-bold text-[#21171A]">Video belum dapat dimuat</h2>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">{error}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadVideos()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#7A1025] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#650D1F]"
            >
              <RefreshCw size={14} />
              Coba lagi
            </button>
          </section>
        )}

        <section className="mb-10">
          {loading ? (
            <div className="grid gap-6 overflow-hidden rounded-[26px] bg-[#351420] p-6 sm:p-9 md:grid-cols-2">
              <div className="animate-pulse space-y-4">
                <div className="h-6 w-28 rounded-full bg-white/10" />
                <div className="h-8 w-4/5 rounded-lg bg-white/10" />
                <div className="h-4 w-full rounded bg-white/10" />
                <div className="h-4 w-2/3 rounded bg-white/10" />
                <div className="h-10 w-36 rounded-xl bg-white/10" />
              </div>
              <div className="aspect-video animate-pulse rounded-2xl bg-white/10" />
            </div>
          ) : (
            <FeaturedVideo video={featuredVideo} onPlay={playVideo} />
          )}
        </section>

        <section id="library" className="scroll-mt-24">
          <SectionHeading
            eyebrow="Jelajahi koleksi"
            title="Temukan video untukmu"
            description="Pilih topik yang ingin dipelajari atau cari video berdasarkan judul dan pembahasannya."
            action={
              <div className="inline-flex items-center gap-2 text-[10px] font-medium text-slate-400">
                <SlidersHorizontal size={14} />
                Filter topik
              </div>
            }
          />

          <div className="mb-7 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {filters.map(filter => {
              const isActive = activeFilter === filter;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-[11px] font-semibold transition ${
                    isActive
                      ? 'border-[#7A1025] bg-[#7A1025] text-white shadow-sm'
                      : 'border-[#E7D9D9] bg-white text-slate-600 hover:border-[#CBA9B0] hover:bg-[#FBF0F2] hover:text-[#7A1025]'
                  }`}
                >
                  {isActive && <Check size={12} />}
                  {filter}
                </button>
              );
            })}
          </div>

          {!error && loading ? (
            <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, index) => (
                <VideoSkeleton key={index} />
              ))}
            </div>
          ) : !filteredVideos.length ? (
            <EmptyState
              search={search}
              filter={activeFilter}
              onReset={resetFilters}
            />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Menampilkan <strong className="text-[#21171A]">{filteredVideos.length}</strong> video
                </p>

                {(search || activeFilter !== 'Semua') && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#7A1025] hover:underline"
                  >
                    Reset filter <X size={12} />
                  </button>
                )}
              </div>

              {featuredVideo && (
                <div className="mb-10">
                  <SectionHeading
                    eyebrow="Mulai menonton"
                    title="Pilihan untukmu"
                    description="Video pilihan berdasarkan koleksi yang tersedia."
                  />

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    <VideoCard
                      video={featuredVideo}
                      index={0}
                      onPlay={playVideo}
                      reduceMotion={reduceMotion}
                    />
                  </div>
                </div>
              )}

              {visibleVideos.length > 0 && (
                <div>
                  <SectionHeading
                    eyebrow="Koleksi video"
                    title="Jelajahi semua video"
                    description="Pilih video untuk langsung membuka pemutar."
                  />

                  <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {visibleVideos.map((video, index) => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        index={index}
                        onPlay={playVideo}
                        reduceMotion={reduceMotion}
                      />
                    ))}
                  </div>
                </div>
              )}

              {visibleVideos.length === 0 && filteredVideos.length === 1 && (
                <p className="mt-4 rounded-xl bg-white px-4 py-3 text-xs text-slate-500">
                  Semua video yang cocok dengan filter sudah ditampilkan di bagian pilihan untukmu.
                </p>
              )}
            </>
          )}
        </section>

        <footer className="mt-16 border-t border-[#E8DCDC] pt-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-xs font-bold text-[#7A1025]">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F6E5E8]">
                <BookOpen size={15} />
              </span>
              Nusa Bot
            </div>

            <p className="text-[10px] leading-5 text-slate-400">
              Video pembelajaran untuk mendukung pemahaman fikih perempuan.
            </p>
          </div>
        </footer>
      </main>

      <AnimatePresence>
        {playingVideo && (
          <VideoPlayer
            video={playingVideo}
            onClose={closePlayer}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
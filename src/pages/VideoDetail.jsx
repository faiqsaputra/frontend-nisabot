import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Film,
  Info,
  Lightbulb,
  Loader2,
  MessageCircle,
  Play,
  Sparkles
} from 'lucide-react';

import YouTubePlayer from '../components/video/YouTubePlayer';
import { publicFetch } from '../lib/api';

function formatDuration(seconds = 0) {
  const value = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(value / 60);
  const remainingSeconds = Math.floor(value % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

export default function VideoDetail() {
  const { slug } = useParams();

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentTime, setCurrentTime] = useState(0);
  const [activeInteraction, setActiveInteraction] = useState(null);

  const playerRef = useRef(null);
  const triggeredInteractions = useRef(new Set());

  useEffect(() => {
    async function loadVideo() {
      try {
        setLoading(true);
        setError('');

        const result = await publicFetch(`/videos/${slug}`);

        setVideo(result.video);
      } catch (err) {
        setError(err.message || 'Gagal memuat video.');
      } finally {
        setLoading(false);
      }
    }

    loadVideo();
  }, [slug]);

  const activeChapter = useMemo(() => {
    if (!video?.chapters?.length) return null;

    return [...video.chapters]
      .sort((a, b) => a.startSeconds - b.startSeconds)
      .reverse()
      .find(chapter => currentTime >= chapter.startSeconds);
  }, [video, currentTime]);

  useEffect(() => {
    if (!video?.interactions?.length) return;

    const interaction = video.interactions
      .filter(item => item.active)
      .sort((a, b) => a.timestampSeconds - b.timestampSeconds)
      .find(item => {
        const difference = currentTime - item.timestampSeconds;

        return difference >= 0 && difference <= 1.5;
      });

    if (!interaction) return;

    if (triggeredInteractions.current.has(interaction.id)) return;

    triggeredInteractions.current.add(interaction.id);

    setActiveInteraction(interaction);

    if (interaction.action === 'PAUSE') {
      playerRef.current?.pauseVideo();
    }
  }, [currentTime, video]);

  function handlePlayerReady(player) {
    playerRef.current = player;
  }

  function handleSeek(seconds) {
    playerRef.current?.seekTo(seconds, true);
    playerRef.current?.playVideo();
  }

  function handleContinue() {
    setActiveInteraction(null);
    playerRef.current?.playVideo();
  }

  function handleCloseInteraction() {
    setActiveInteraction(null);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBF8F6]">
        <div className="flex items-center gap-3 text-[#7A1025]">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="font-medium">Memuat video...</span>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBF8F6] px-5">
        <div className="max-w-md text-center">
          <Film className="mx-auto h-10 w-10 text-[#7A1025]" />
          <h1 className="mt-5 text-2xl font-bold text-[#0F172A]">
            Video tidak ditemukan
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {error || 'Video yang kamu cari belum tersedia.'}
          </p>

          <Link
            to="/video"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#7A1025] px-5 py-3 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke video
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF8F6]">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">

        <Link
          to="/video"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#7A1025]"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke video
        </Link>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">

          <section className="min-w-0">

            <YouTubePlayer
              video={video}
              onReady={handlePlayerReady}
              onTimeUpdate={setCurrentTime}
            />

            <div className="mt-6">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F6E5E8] px-3 py-1.5 font-semibold text-[#7A1025]">
                  <Play className="h-3.5 w-3.5" />
                  Video Pembelajaran
                </span>

                {video.durationSeconds && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="h-4 w-4" />
                    {formatDuration(video.durationSeconds)}
                  </span>
                )}
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#0F172A] sm:text-4xl">
                {video.title}
              </h1>

              {video.description && (
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                  {video.description}
                </p>
              )}
            </div>

            {video.resources?.length > 0 && (
              <section className="mt-10">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F6E5E8] text-[#7A1025]">
                    <BookOpen className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-bold text-[#0F172A]">
                      Sumber Belajar
                    </h2>
                    <p className="text-xs text-slate-500">
                      Materi pendukung untuk memperdalam pembahasan
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {video.resources.map(resource => (
                    <a
                      key={resource.id}
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-[#0F172A]">
                            {resource.title}
                          </p>

                          {resource.description && (
                            <p className="mt-1 text-sm leading-6 text-slate-500">
                              {resource.description}
                            </p>
                          )}
                        </div>

                        <ExternalLink className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-[#7A1025]" />
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </section>

          <aside className="lg:sticky lg:top-6 lg:self-start">

            <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_16px_50px_rgba(60,10,20,0.06)]">

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F6E5E8] text-[#7A1025]">
                  <BookOpen className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-bold text-[#0F172A]">
                    Isi Video
                  </h2>

                  <p className="text-xs text-slate-500">
                    {video.chapters?.length || 0} bagian
                  </p>
                </div>
              </div>

              {activeChapter && (
                <div className="mt-5 rounded-2xl bg-[#7A1025] p-4 text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
                    Sedang dipelajari
                  </p>

                  <p className="mt-2 font-semibold">
                    {activeChapter.title}
                  </p>

                  <p className="mt-1 text-xs text-white/70">
                    {formatDuration(currentTime)}
                  </p>
                </div>
              )}

              <div className="mt-5 space-y-2">
                {video.chapters?.length > 0 ? (
                  video.chapters
                    .sort((a, b) => a.startSeconds - b.startSeconds)
                    .map((chapter, index) => {
                      const active = activeChapter?.id === chapter.id;

                      return (
                        <button
                          key={chapter.id}
                          type="button"
                          onClick={() => handleSeek(chapter.startSeconds)}
                          className={`group flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${
                            active
                              ? 'bg-[#F6E5E8] text-[#7A1025]'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                            active
                              ? 'bg-[#7A1025] text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {index + 1}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">
                              {chapter.title}
                            </span>

                            <span className="mt-0.5 block text-xs text-slate-400">
                              {formatDuration(chapter.startSeconds)}
                            </span>
                          </span>

                          <ArrowRight className="h-4 w-4 shrink-0 opacity-40 transition group-hover:translate-x-0.5" />
                        </button>
                      );
                    })
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-5 text-center">
                    <Info className="mx-auto h-5 w-5 text-slate-400" />
                    <p className="mt-2 text-sm text-slate-500">
                      Chapter belum tersedia.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {activeInteraction && (
        <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:bottom-5 sm:left-auto sm:right-5 sm:w-[420px]">
          <div className="rounded-[28px] border border-white/50 bg-white p-5 shadow-[0_24px_80px_rgba(60,10,20,0.20)]">

            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F6E5E8] text-[#7A1025]">
                {activeInteraction.type === 'REFLECTION' ? (
                  <MessageCircle className="h-5 w-5" />
                ) : activeInteraction.type === 'CASE' ? (
                  <Lightbulb className="h-5 w-5" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#9B5265]">
                  {activeInteraction.type}
                </p>

                <h3 className="mt-1 font-bold text-[#0F172A]">
                  {activeInteraction.title}
                </h3>

                {activeInteraction.description && (
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {activeInteraction.description}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={handleContinue}
                className="flex-1 rounded-2xl bg-[#7A1025] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#641020]"
              >
                Lanjutkan
              </button>

              <button
                type="button"
                onClick={handleCloseInteraction}
                className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
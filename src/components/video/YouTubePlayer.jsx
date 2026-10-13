import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { loadYouTubeIframeApi } from "../../lib/youtube.js";

export default function YouTubePlayer({ video, onReady, onTimeUpdate, onStateChange }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function initializePlayer() {
      try {
        setLoading(true);
        setError('');

        const YT = await loadYouTubeIframeApi();

        if (!mounted || !containerRef.current) return;

        playerRef.current = new YT.Player(containerRef.current, {
          videoId: video.externalId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            origin: window.location.origin
          },
          events: {
            onReady: event => {
              if (!mounted) return;

              setLoading(false);

              onReady?.(event.target);

              intervalRef.current = window.setInterval(() => {
                if (!playerRef.current) return;

                const currentTime = playerRef.current.getCurrentTime();

                onTimeUpdate?.(currentTime);
              }, 250);
            },
            onStateChange: event => {
              onStateChange?.(event.data, event.target);
            },
            onError: () => {
              if (!mounted) return;

              setLoading(false);
              setError('Video tidak dapat diputar atau embedding dinonaktifkan.');
            }
          }
        });
      } catch (err) {
        if (!mounted) return;

        setLoading(false);
        setError(err.message || 'Gagal memuat video.');
      }
    }

    initializePlayer();

    return () => {
      mounted = false;

      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }

      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [video.externalId]);

  if (error) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-[28px] bg-[#170F11] p-8 text-center text-white">
        <div>
          <p className="text-sm font-medium text-white/70">Video tidak tersedia</p>
          <p className="mt-2 text-lg font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-[28px] bg-black shadow-[0_24px_70px_rgba(60,10,20,0.16)]">
      <div ref={containerRef} className="h-full w-full" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#170F11]">
          <div className="flex items-center gap-3 text-white/80">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Memuat video...</span>
          </div>
        </div>
      )}
    </div>
  );
}
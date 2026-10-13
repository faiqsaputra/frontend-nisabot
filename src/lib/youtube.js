let youtubeApiPromise = null;

export function loadYouTubeIframeApi() {
  if (typeof window === 'undefined') {
    return Promise.reject(
      new Error('YouTube IFrame API hanya dapat dimuat di browser.')
    );
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise = new Promise((resolve, reject) => {
    const scriptUrl = 'https://www.youtube.com/iframe_api';

    let script = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );

    const previousCallback = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      try {
        previousCallback?.();
      } finally {
        resolve(window.YT);
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;

      document.head.appendChild(script);
    }

    script.addEventListener(
      'error',
      () => {
        youtubeApiPromise = null;

        reject(new Error('Gagal memuat YouTube IFrame API.'));
      },
      { once: true }
    );
  }).catch((error) => {
    youtubeApiPromise = null;
    throw error;
  });

  return youtubeApiPromise;
}
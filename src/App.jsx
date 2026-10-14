import { useEffect, useState } from 'react';
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation
} from 'react-router-dom';

import Home from './pages/Home';
import Materi from './pages/Materi';
import MateriDetail from './pages/MateriDetail';
import Video from './pages/Video';
import VideoDetail from './pages/VideoDetail';
import Kalender from './pages/Kalender';
import Login from './pages/Login';
import Kuis from './pages/Kuis';
import Chatbot from './pages/Chatbot';

import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminMateri from './pages/admin/AdminMateri';
import AdminVideo from './pages/admin/AdminVideo';
import AdminQuizHub from './pages/admin/AdminQuizHub';
import AdminQuizStudio from './pages/admin/AdminQuizStudio.jsx';

import { supabase } from './lib/supabase';

const API_URL = (
  import.meta.env.VITE_API_URL ||
  'https://nusa-bot-backend.vercel.app/api'
).replace(/\/+$/, '');

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF8F6]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7A1025]/20 border-t-[#7A1025]" />
    </div>
  );
}

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    return { session: null, user: null };
  }

  const session = data.session;

  const response = await fetch(`${API_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      Accept: 'application/json'
    }
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    return { session, user: null };
  }

  const user =
    result?.user ??
    result?.data?.user ??
    result?.data?.profile ??
    result?.data ??
    null;

  return { session, user };
}

function normalizeRole(role) {
  return String(role ?? '').trim().toUpperCase();
}

function ProtectedRoute() {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (mounted) {
          setSession(data.session ?? null);
        }
      } catch (error) {
        console.error('Session check:', error);

        if (mounted) {
          setSession(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;

      setSession(nextSession ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${location.pathname}${location.search}`
        }}
      />
    );
  }

  return <Outlet />;
}

function AdminRoute() {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    let refreshTimer;

    async function checkAdmin() {
      try {
        const { session, user } = await getCurrentUser();

        if (!mounted) return;

        setIsAdmin(
          Boolean(session && normalizeRole(user?.role) === 'ADMIN')
        );
      } catch (error) {
        console.error('Admin route check:', error);

        if (mounted) {
          setIsAdmin(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void checkAdmin();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted || event === 'INITIAL_SESSION') return;

      if (!nextSession) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Jalankan pemeriksaan setelah callback perubahan auth selesai.
      clearTimeout(refreshTimer);

      refreshTimer = setTimeout(() => {
        if (mounted) {
          setLoading(true);
          void checkAdmin();
        }
      }, 0);
    });

    return () => {
      mounted = false;
      clearTimeout(refreshTimer);
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAdmin) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname
        }}
      />
    );
  }

  return <Outlet />;
}

function UserHomeRoute() {
  const [loading, setLoading] = useState(true);
  const [destination, setDestination] = useState('home');

  useEffect(() => {
    let mounted = true;

    async function resolveHome() {
      try {
        const { session, user } = await getCurrentUser();

        if (!mounted) return;

        setDestination(
          session && normalizeRole(user?.role) === 'ADMIN'
            ? 'admin'
            : 'home'
        );
      } catch (error) {
        console.error('Home route check:', error);

        if (mounted) {
          setDestination('home');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void resolveHome();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  if (destination === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <Home />;
}

function AdminPlaceholder({ title }) {
  return (
    <div className="rounded-3xl bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">
        {title}
      </h1>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FBF8F6] px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7A1025]">
        404 — Halaman tidak ditemukan
      </p>

      <h1 className="mt-3 font-display text-3xl font-bold text-slate-900">
        Halaman tidak tersedia
      </h1>

      <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
        Halaman yang kamu cari tidak tersedia atau alamatnya sudah berubah.
      </p>

      <button
        type="button"
        onClick={() => window.location.assign('/')}
        className="mt-6 rounded-2xl bg-[#7A1025] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#64101f]"
      >
        Kembali ke Beranda
      </button>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Halaman publik */}
      <Route path="/" element={<UserHomeRoute />} />
      <Route path="/login" element={<Login />} />

      {/* Area pengguna */}
      <Route element={<ProtectedRoute />}>
        <Route path="/materi" element={<Materi />} />
        <Route path="/materi/:slug" element={<MateriDetail />} />

        <Route path="/video" element={<Video />} />
        <Route path="/video/:slug" element={<VideoDetail />} />

        <Route path="/kalender" element={<Kalender />} />

        <Route path="/kuis" element={<Kuis />} />
        <Route path="/kuis/:quizId" element={<Kuis />} />

        <Route path="/chatbot" element={<Chatbot />} />
      </Route>

      {/* Area administrator */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />

          <Route path="materi" element={<AdminMateri />} />
          <Route path="video" element={<AdminVideo />} />
          <Route path="kuis" element={<AdminQuizHub />} />
          <Route path="/admin/quizzes/:quizId/studio" element={<AdminQuizStudio />}/>

          <Route
            path="pengguna"
            element={<AdminPlaceholder title="Manajemen Pengguna" />}
          />

          <Route
            path="knowledge-base"
            element={<AdminPlaceholder title="Knowledge Base" />}
          />

          <Route
            path="aktivitas"
            element={<AdminPlaceholder title="Aktivitas" />}
          />

          <Route
            path="pengaturan"
            element={<AdminPlaceholder title="Pengaturan" />}
          />
        </Route>
      </Route>

      {/* Halaman tidak ditemukan */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
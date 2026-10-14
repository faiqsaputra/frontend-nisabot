import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { supabase } from '../lib/supabase';

const ease = [0.22, 1, 0.36, 1];
const logo = '/assets/logo/logo.png';

const API_URL = (
  import.meta.env.VITE_API_URL ||
  'https://nusa-bot-backend.vercel.app/api'
).replace(/\/+$/, '');

function getAppUrl() {
  return (
    import.meta.env.VITE_SITE_URL ||
    window.location.origin
  ).replace(/\/+$/, '');
}

function getDestination(role, requestedPath = '/') {
  const normalizedRole = String(role ?? '').trim().toUpperCase();

  if (normalizedRole === 'ADMIN') {
    return '/admin';
  }

  const path =
    typeof requestedPath === 'string' &&
    requestedPath.startsWith('/') &&
    !requestedPath.startsWith('//')
      ? requestedPath
      : '/';

  if (path.startsWith('/admin')) {
    return '/';
  }

  return path;
}

function getProfileUser(profile) {
  return (
    profile?.user ??
    profile?.data?.user ??
    profile?.data?.profile ??
    profile?.data ??
    null
  );
}

function getErrorMessage(error, fallback) {
  return error instanceof Error && error.message
    ? error.message
    : fallback;
}

async function getApiProfile(accessToken) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      },
      signal: controller.signal
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        result?.message ||
        result?.error ||
        'Gagal memverifikasi profil pengguna.'
      );
    }

    return result;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function resolveUserDestination(accessToken, requestedPath = '/') {
  const profile = await getApiProfile(accessToken);
  const user = getProfileUser(profile);
  const role = user?.role || 'USER';

  return {
    profile,
    user,
    role,
    destination: getDestination(role, requestedPath)
  };
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({
    type: '',
    message: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const requestedFrom = location.state?.from;

  const requestedPath =
    typeof requestedFrom === 'string'
      ? requestedFrom
      : requestedFrom?.pathname || '/';

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!mounted || !data.session) {
          return;
        }

        const { destination } = await resolveUserDestination(
          data.session.access_token,
          requestedPath
        );

        if (!mounted) {
          return;
        }

        navigate(destination, { replace: true });
      } catch (error) {
        console.error('Session restore error:', error);

        if (mounted) {
          setNotification({
            type: 'error',
            message:
              error.name === 'AbortError'
                ? 'Server terlalu lama merespons. Coba lagi.'
                : error.message ||
                  'Sesi ditemukan, tetapi profil pengguna gagal diverifikasi.'
          });
        }
      }
    }

    void restoreSession();

    return () => {
      mounted = false;
    };
  }, [requestedPath, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value
    }));

    setNotification({
      type: '',
      message: ''
    });
  };

  const handleModeChange = (loginMode) => {
    setIsLogin(loginMode);

    setNotification({
      type: '',
      message: ''
    });

    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    });

    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const password = formData.password;

    setNotification({
      type: '',
      message: ''
    });

    if (!email || !password || (!isLogin && !name)) {
      setNotification({
        type: 'error',
        message: 'Lengkapi semua field yang diperlukan.'
      });

      return;
    }

    if (!isLogin && password.length < 8) {
      setNotification({
        type: 'error',
        message: 'Password minimal 8 karakter.'
      });

      return;
    }

    if (!isLogin && password !== formData.confirmPassword) {
      setNotification({
        type: 'error',
        message: 'Konfirmasi password tidak sama.'
      });

      return;
    }

    setLoading(true);

    try {
      if (!isLogin) {
        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            name,
            email,
            password
          })
        });

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            result?.message ||
            result?.error ||
            'Gagal membuat akun.'
          );
        }

        setNotification({
          type: 'success',
          message: result?.message || 'Akun berhasil dibuat.'
        });

        setFormData((current) => ({
          ...current,
          password: '',
          confirmPassword: ''
        }));

        if (result?.session?.access_token) {
          const { destination } = await resolveUserDestination(
            result.session.access_token,
            requestedPath
          );

          window.setTimeout(() => {
            navigate(destination, { replace: true });
          }, 500);
        } else {
          setIsLogin(true);
          setNotification({
            type: 'success',
            message:
              result?.message ||
              'Registrasi berhasil. Silakan login menggunakan akunmu.'
          });
        }

        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      const accessToken = data.session?.access_token;

      if (!accessToken) {
        throw new Error('Session login tidak tersedia.');
      }

      const { role, destination } = await resolveUserDestination(
        accessToken,
        requestedPath
      );

      setNotification({
        type: 'success',
        message:
          role === 'ADMIN'
            ? 'Login berhasil. Mengarahkan ke dashboard admin...'
            : 'Login berhasil. Selamat datang kembali.'
      });

      window.setTimeout(() => {
        navigate(destination, { replace: true });
      }, 400);
    } catch (error) {
      console.error('Authentication error:', error);

      setNotification({
        type: 'error',
        message:
          error.name === 'AbortError'
            ? 'Server terlalu lama merespons. Coba lagi.'
            : getErrorMessage(
                error,
                'Terjadi kesalahan saat autentikasi.'
              )
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = formData.email.trim().toLowerCase();

    if (!email) {
      setNotification({
        type: 'error',
        message: 'Masukkan email terlebih dahulu.'
      });

      return;
    }

    setLoading(true);

    setNotification({
      type: '',
      message: ''
    });

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getAppUrl()}/reset-password`
      });

      if (error) {
        throw error;
      }

      setNotification({
        type: 'success',
        message:
          'Instruksi reset password telah dikirim ke email kamu.'
      });
    } catch (error) {
      console.error('Password reset error:', error);

      setNotification({
        type: 'error',
        message: getErrorMessage(
          error,
          'Gagal mengirim instruksi reset password.'
        )
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);

    setNotification({
      type: '',
      message: ''
    });

    try {
      const redirectTo = `${getAppUrl()}/login`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo
        }
      });

      if (error) {
        throw error;
      }

      // Supabase akan mengarahkan browser ke halaman Google.
      // Jangan menonaktifkan loading di sini jika tidak terjadi error.
    } catch (error) {
      console.error('Google authentication error:', error);

      setNotification({
        type: 'error',
        message: getErrorMessage(error, 'Google login gagal.')
      });

      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-hidden bg-[#FDF8F9] font-sans">
      <main className="relative flex min-h-screen w-full flex-col lg:flex-row">
        <section className="relative flex min-h-[310px] w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#F2D7DC] via-[#FBECEF] to-[#FFF7F8] px-6 py-10 sm:px-8 lg:min-h-screen lg:w-[45%] lg:items-start lg:px-12">
          <motion.div
            animate={{
              y: [0, -20, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className="absolute left-[10%] top-[8%] h-64 w-64 rounded-full bg-[#D9A9B4]/30 blur-3xl"
          />

          <motion.div
            animate={{
              y: [0, 30, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1
            }}
            className="absolute bottom-[10%] right-[8%] h-72 w-72 rounded-full bg-[#E7BCC5]/30 blur-3xl"
          />

          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear'
            }}
            className="absolute right-[18%] top-[18%] h-20 w-20 rounded-full border border-white/50"
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="relative z-10 w-full max-w-md"
          >
            <div className="mb-6 inline-flex items-center justify-center rounded-2xl bg-white/45 p-3 shadow-sm backdrop-blur-md">
              <img
                src={logo}
                alt="NISQA Logo"
                className="h-10 w-10 object-contain"
              />
            </div>

            <h1 className="font-display text-4xl font-bold leading-[0.96] tracking-tight text-[#631021] sm:text-5xl">
              Learn smarter,
              <br />
              <span className="text-[#7A1025]">
                understand better.
              </span>
            </h1>

            <p className="mt-5 max-w-sm text-sm leading-6 text-[#7B4A54] sm:text-base">
              Akses ruang belajar NISQA untuk membaca materi,
              mengikuti video pembelajaran, mencoba kuis, dan memahami
              siklus dengan pendekatan yang lebih interaktif.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {['Materi', 'Video', 'Kuis', 'Smart Cycle'].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/70 bg-white/45 px-3 py-1.5 text-[9px] font-semibold text-[#7A1025] backdrop-blur-md"
                >
                  {item}
                </span>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="relative z-10 -mt-8 flex min-h-[calc(100vh-280px)] w-full items-center justify-center rounded-t-[32px] bg-white px-5 py-8 shadow-[0_-15px_40px_rgba(80,20,30,0.04)] sm:px-8 lg:mt-0 lg:min-h-screen lg:w-[55%] lg:rounded-none lg:px-12 lg:py-16 lg:shadow-[-20px_0_40px_rgba(0,0,0,0.02)]">
          <svg
            className="absolute right-[99.5%] top-0 hidden h-full w-[100px] text-white lg:block"
            viewBox="0 0 100 1000"
            preserveAspectRatio="none"
            fill="currentColor"
          >
            <path d="M 100,0 C 20,150 120,300 30,500 C -60,700 80,850 100,1000 Z" />
          </svg>

          <div className="w-full max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease }}
              className="mb-7 text-center lg:text-left"
            >
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#7A1025]">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </span>

              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-gray-800 sm:text-4xl">
                {isLogin ? 'Welcome back' : 'Create an account'}
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                {isLogin
                  ? 'Masuk untuk melanjutkan perjalanan belajar NISQA.'
                  : 'Buat akun dan mulai perjalanan belajar bersama NISQA.'}
              </p>
            </motion.div>

            <div className="relative mb-7 flex rounded-full bg-[#F9EEF0] p-1">
              <motion.div
                animate={{ x: isLogin ? 0 : '100%' }}
                transition={{ duration: 0.28, ease }}
                className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-sm"
              />

              <button
                type="button"
                onClick={() => handleModeChange(true)}
                className={`relative z-10 flex-1 py-2.5 text-sm font-medium transition-colors ${
                  isLogin
                    ? 'text-[#7A1025]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Log in
              </button>

              <button
                type="button"
                onClick={() => handleModeChange(false)}
                className={`relative z-10 flex-1 py-2.5 text-sm font-medium transition-colors ${
                  !isLogin
                    ? 'text-[#7A1025]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sign up
              </button>
            </div>

            <AnimatePresence mode="popLayout">
              <motion.form
                key={isLogin ? 'login' : 'register'}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.3, ease }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="relative overflow-hidden"
                  >
                    <User
                      size={17}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Full Name"
                      autoComplete="name"
                      required={!isLogin}
                      className="h-12 w-full rounded-full border border-gray-100 bg-gray-50 pl-12 pr-4 text-sm text-gray-700 outline-none transition-all focus:border-[#D8AAB4] focus:bg-white focus:ring-4 focus:ring-[#F4E1E5]"
                    />
                  </motion.div>
                )}

                <div className="relative">
                  <Mail
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email Address"
                    autoComplete="email"
                    required
                    className="h-12 w-full rounded-full border border-gray-100 bg-gray-50 pl-12 pr-4 text-sm text-gray-700 outline-none transition-all focus:border-[#D8AAB4] focus:bg-white focus:ring-4 focus:ring-[#F4E1E5]"
                  />
                </div>

                <div className="relative">
                  <Lock
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password"
                    autoComplete={
                      isLogin ? 'current-password' : 'new-password'
                    }
                    minLength={isLogin ? undefined : 8}
                    required
                    className="h-12 w-full rounded-full border border-gray-100 bg-gray-50 pl-12 pr-12 text-sm text-gray-700 outline-none transition-all focus:border-[#D8AAB4] focus:bg-white focus:ring-4 focus:ring-[#F4E1E5]"
                  />

                  <button
                    type="button"
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-[#7A1025]"
                  >
                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>

                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="relative overflow-hidden"
                  >
                    <Lock
                      size={17}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm Password"
                      autoComplete="new-password"
                      minLength={8}
                      required={!isLogin}
                      className="h-12 w-full rounded-full border border-gray-100 bg-gray-50 pl-12 pr-12 text-sm text-gray-700 outline-none transition-all focus:border-[#D8AAB4] focus:bg-white focus:ring-4 focus:ring-[#F4E1E5]"
                    />

                    <button
                      type="button"
                      aria-label={
                        showConfirmPassword
                          ? 'Hide confirm password'
                          : 'Show confirm password'
                      }
                      onClick={() =>
                        setShowConfirmPassword((value) => !value)
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-[#7A1025]"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </motion.div>
                )}

                {isLogin && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={loading}
                      className="text-xs font-medium text-[#7A1025] transition-colors hover:text-[#5F0C1D] disabled:opacity-50"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <AnimatePresence>
                  {notification.message && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.97 }}
                      role="status"
                      aria-live="polite"
                      className={`rounded-2xl border p-3 text-center text-xs leading-5 ${
                        notification.type === 'error'
                          ? 'border-red-100 bg-red-50 text-red-600'
                          : 'border-emerald-100 bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {notification.message}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#7A1025] text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(122,16,37,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#650D1F] hover:shadow-[0_14px_28px_-8px_rgba(122,16,37,0.5)] disabled:cursor-wait disabled:opacity-70"
                >
                  {loading ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      <span>
                        {isLogin ? 'Log In' : 'Create Account'}
                      </span>

                      <ArrowRight
                        size={16}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </>
                  )}
                </button>
              </motion.form>
            </AnimatePresence>

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-gray-200" />

              <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-gray-400">
                Or continue with
              </span>

              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-600 transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>

              Continue with Google
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-5 flex w-full items-center justify-center text-xs font-medium text-gray-400 transition-colors hover:text-[#7A1025]"
            >
              Continue as guest
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}